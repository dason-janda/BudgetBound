import uvicorn
import flightLookup
import locationLookup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime   
from google import genai
from google.genai import types
import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

client = genai.Client()

flightResults = []
driveResults = []

def flightSearch(destination: str, max_price: int, depart: int, ret: int):
    print(f"Looking for flights from {destination} under ${max_price}")
    print(f"Depart: {depart} Return: {ret}")

    for attempt in range(5):
        airportCode = locationLookup.getNearestAirport(destination)
        try:
            results = flightLookup.lookupRequest(airportCode, max_price, depart, ret)
            if not results or len(results) == 0:
                print(f"No flights found for {airportCode}. Deleting and retrying")
                locationLookup.removeBadAirport(airportCode)
                continue 
            
            flightResults.clear()
            flightResults.extend(results)
            print(f"Found {len(results)} flights from {airportCode}")
            return 

        except Exception as e:
            print(f"Error with airport {airportCode}: {e}")
            locationLookup.removeBadAirport(airportCode)

    print("Could not find any valid flights after 5 attempts.")

def tryFlightSearch(destination: str, max_price: int, depart: int, ret: int):
    print(f"Looking for flights from {destination} under ${max_price}")
    print(f"Depart: {depart} Return: {ret}")

    airportCode = locationLookup.getNearestAirport(destination)
    try:
        results = flightLookup.lookupRequest(airportCode, max_price, depart, ret)
        if not results or len(results) == 0: 
            alternativesList = locationLookup.getListNearbyAirports(destination)
            flightResults.clear()
            return {"status": "needs_alternative", "alternatives": alternativesList}
        flightResults.clear()
        flightResults.extend(results)
        print(f"Found {len(results)} flights from {airportCode}")
        return {"status": "success"}

    except Exception as e:
        print(f"Error with airport {airportCode}: {e}")
        alternativesList = locationLookup.getListNearbyAirports(destination)
        flightResults.clear()
        return {"status": "needs_alternative", "alternatives": alternativesList}

def driveSearch(destination: str):
    print(f"Looking for drives from {destination}")
    results = locationLookup.getDrivingDestinations(destination)
    driveResults.clear()
    driveResults.extend(results)

def hotelSearch(destination: str, max_price: int, depart: int, ret: int):
    print(f"looking for hotels in {destination}")
    results = flightLookup.hotelSearch(destination, max_price, depart, ret)
    return results


class Request(BaseModel):
    location: str
    budget: int
    depart: str
    ret: str

class detailsRequest(BaseModel):
    location: str
    transportCost: int
    transportType: str
    depart: str
    ret: str
    budget: int

class FilterRequest(BaseModel):
    userPrompt: str
    destinations: list[str]

app = FastAPI()

origins = [
    "http://localhost:5173" ,
    "https://budget-bound.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get(path="/flights")
def get_flights():
    #print(flightResults)
    return flightResults

@app.get(path="/drives")
def get_drives():
    #print(driveResults)
    return driveResults

@app.post(path="/requests")
def add_request(req: Request):
    # trying to request my apis
    driveSearch(req.location)

    # Trying the flight search and if it fails returning a list of alternatives
    flight_status = tryFlightSearch(req.location, req.budget, req.depart, req.ret)
    if flight_status and flight_status.get("status") == "needs_alternative":
        return {
            "status": "needs_alternative", 
            "alternatives": flight_status["alternatives"]
        }
    return {"status": "success"}

@app.post(path='/tripDetails')
def add_request(req: detailsRequest):
    #Calculate the trip duration
    if not req.depart:
        return {"error": "Missing departure date"}
    dateFormat = "%Y-%m-%d"
    startDate = datetime.strptime(req.depart, dateFormat).date()
    endDate = datetime.strptime(req.ret, dateFormat).date()
    duration = endDate - startDate
    duration = duration.days

    remainingBudget = req.budget - req.transportCost
    maxNightly = int(remainingBudget / duration)

    hotels = hotelSearch(req.location, maxNightly, req.depart, req.ret)   

    print(hotels)

    return {
        "destination": req.location,
        "transport_cost": req.transportCost,
        "transport_type": req.transportType,
        "remaining_budget": remainingBudget,
        "hotel_options": hotels,
        "duration": duration
    }

@app.post(path="/alt-flights")
def get_alternative_flights(req: Request):
    # Here, req.location is the exact 3-letter IATA code (e.g., "LAS")
    print(f"Looking for alternative flights specifically from {req.location}")
    
    try:
        # Pass the IATA code directly into your lookup function
        results = flightLookup.lookupRequest(req.location, req.budget, req.depart, req.ret)
        
        flightResults.clear() # Clear out old results
        
        if results and len(results) > 0:
            flightResults.extend(results)
            print(f"Found {len(results)} flights from alternative airport {req.location}")
            return {"status": "success"}
        else:
            return {"status": "failed", "message": "No flights found from this airport."}

    except Exception as e:
        print(f"Error with alternative airport {req.location}: {e}")
        return {"status": "error"}
    
@app.get(path="/nearby-airports/{location}")
def get_manual_alternatives(location: str):
    print(f"Manually fetching alternative airports for {location}")
    try:
        alternativesList = locationLookup.getListNearbyAirports(location)
        return {"status": "success", "alternatives": alternativesList}
    except Exception as e:
        print(f"Error fetching manual alternatives: {e}")
        return {"status": "error"}
    
@app.post("/api/filter-destinations")
async def filter_destinations(request: FilterRequest):
    try:
        prompt = f"""
        You are a helpful travel assistant. 
        The user is looking for desinations that fit the criteria: "{request.userPrompt}"
        
        Here is the list of available destinations to choose from: 
        {', '.join(request.destinations)}

        Analyze the destinations and select ONLY the ones that clearly match the user's request. 
        
        You must return a JSON object with this exact structure:
        {{
            "matched_cities": ["City 1", "City 2"...],
            "explanation": "A 2-sentence explanation of why these specific cities match the user's request."
        }}
        """

        # 🚨 Call the model using the new syntax and config structure
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse the json string from Gemini into a dictionary
        return json.loads(response.text)

    except Exception as e:
        print(f"Error calling Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to process AI request")
    

if __name__ == "__main__":
    #flightSearch("St. George", 2000, 20260202, 20260209)
    #driveSearch("Salem Oregon")
    #locationLookup.calculateDriveTime("St. George", "Las Vegas")
    uvicorn.run(app, host="0.0.0.0", port=8000)