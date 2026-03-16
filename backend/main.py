import uvicorn
import flightLookup
import locationLookup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime   

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

    print("Could not find any valid flights after 3 attempts.")

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


app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://budget-bound.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#temp_db = []

@app.get(path="/flights")
def get_flights():
    #print(flightResults)
    return flightResults

@app.get(path="/drives")
def get_drives():
    #print(driveResults)
    return driveResults

@app.post(path="/requests", response_model=Request)
def add_request(req: Request):
    #temp_db.append(req)
    # when we get information from the user we can call my search apis
    driveSearch(req.location)
    flightSearch(req.location, req.budget, req.depart, req.ret)
    return req

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
    

if __name__ == "__main__":
    #flightSearch("St. George", 2000, 20260202, 20260209)
    #driveSearch("Salem Oregon")
    #locationLookup.calculateDriveTime("St. George", "Las Vegas")
    uvicorn.run(app, host="0.0.0.0", port=8000)