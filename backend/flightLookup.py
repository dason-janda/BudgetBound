import os
import json
import requests
import locationLookup

api_key = os.getenv('SERPAPI_API_KEY')

def lookupRequest(airportCode: str, max_price: int, depart: str, ret: str):

    params = {
        "api_key": api_key,
        "engine": "google_travel_explore", 
        "departure_id": airportCode, 
        "max_price": max_price,
        "outbound_date": depart,
        "return_date": ret,
    }
    
    search = requests.get("https://serpapi.com/search", params=params)
    response = search.json()

    flight_results = []
    print(response)

    if "destinations" in response:
            for item in response["destinations"]:
                destination = {
                    "city_name": item.get("name"),
                    "country": item.get("country"),
                    "price": item.get("flight_price"),
                    # Can give desination image i might use in the future
                    #"image": item.get("thumbnail"),
                    "airline": item.get("airline"),
                    "duration_minutes": item.get("flight_duration"),
                    "stops": item.get("number_of_stops") 
                }
                flight_results.append(destination)
                    
    return flight_results

def hotelSearch(destination: str, max_price: int, depart: int, ret: int):
    print(f"Searching hotels in {destination} under ${max_price}/night...")

    #formatted_depart = f"{depart_str[:4]}-{depart_str[4:6]}-{depart_str[6:8]}"
    #formatted_ret = f"{ret_str[:4]}-{ret_str[4:6]}-{ret_str[6:8]}"
    
    params = {
        "api_key": api_key,
        "engine": "google_hotels",
        "q": f"hotels in {destination}",
        "check_in_date": depart,
        "check_out_date": ret,
        "currency": "USD",
        "max_price": max_price,
        #"sort_by": 8, # Can change sorting order or leave it out completely
                      # 3 - Lowest price | 8 - Highest rating | 13 - Most reviewed
    }

    try:
        search = requests.get("https://serpapi.com/search", params=params)
        results = search.json()

        print(results)
        
        hotels = []

        if "properties" in results:
            for prop in results["properties"][:5]: # limit amount of hotels displayed
                hotels.append({
                    "name": prop.get("name"),
                    "price": prop.get("rate_per_night", {}).get("lowest"),
                    "rating": prop.get("overall_rating"),
                    #Also have the option for images with hotels but will look at implementing that after my mvp
                    #"image": prop.get("images", [{}])[0].get("thumbnail"),
                    "link": prop.get("link"),
                    "lat" : prop.get("gps_coordinates").get("latitude"), 
                    "long" : prop.get("gps_coordinates").get("longitude"),
                })
        return hotels

    except Exception as e:
        print(f"Hotel search failed: {e}")
        return []


