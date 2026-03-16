import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import requests
import googlemaps
from datetime import datetime
import os
import random

maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')

df = pd.read_csv('airports.csv')
df_major = df[df['iata'].str.match(r'^[A-Z]{3}$', na=False)].copy()

def getDrivingDestinations(startLocation: str):
    geolocator = Nominatim(user_agent="BudgetBound_SeniorProject_DriveLookup")

    location = geolocator.geocode(startLocation)
    if not location:
        return []
    
    startLat = location.latitude
    startLon = location.longitude

    radiusKm = 300

    username = "dasj31" 
    url = "http://api.geonames.org/findNearbyPlaceNameJSON"

    params = {
        "lat": startLat,
        "lng": startLon,
        "radius": radiusKm,
        "cities": "cities15000",
        "maxRows": 200,
        "username": username
    }

    response = requests.get(url, params=params).json()

    candidates = []

    if "geonames" in response:
        for city in response["geonames"]:

            # get distance from start city 
            city_coords = (city['lat'], city['lng'])
            start_coords = (startLat, startLon)
            dist = geodesic(start_coords, city_coords).kilometers
            # dont show cities that are too close and check that they are within the radius
            if 100 < dist <= radiusKm:
                candidates.append(city)


        if len(candidates) > 20:
            candidates = random.sample(candidates, 20)
    
        drivingDestinations = []

        endLocationsList = [f"{city['name']}, {city['adminName1']}" for city in candidates]

        driveTime = calculateDriveTime(startLocation, endLocationsList)

        for index, city in enumerate(candidates):
            drivingDestinations.append({
                "city_name": city["name"],
                "country": city["countryName"],
                "state": city["adminName1"],
                "distance_km": driveTime[index][0],
                "drive_time_hours": driveTime[index][1],
                "transport_mode": "car"
            })

    return drivingDestinations

def getNearestAirport(cityName):
    geolocator = Nominatim(user_agent="AirportLookup")
    
    location = geolocator.geocode(cityName)
    
    if not location:
        print(f"Could not find city: {cityName}")
        return None
    
    userCoords = (location.latitude, location.longitude)
    
    def calculate_distance(row):
        airportCoords = (row['latitude'], row['longitude'])
        return geodesic(userCoords, airportCoords).miles

    df_major['distance'] = df_major.apply(calculate_distance, axis=1)
    nearestAirport = df_major.loc[df_major['distance'].idxmin()]
    print(f"Nearest airport to {cityName} is {nearestAirport['name']} ({nearestAirport['iata']}) - {nearestAirport['distance']:.1f} miles away")

    return nearestAirport['iata']

def removeBadAirport(iata):
    
    global df_major

    df_major = df_major[df_major['iata'] != iata]

    try:
        full_df = pd.read_csv('airports.csv')
        full_df = full_df[full_df['iata'] != iata]
        full_df.to_csv('airports.csv', index=False)
        print("airports.csv updated.")
    except Exception as e:
        print(f"Failed to update CSV: {e}")

def calculateDriveTime(startCity, endCities):
    if not endCities:
        return []

    gmaps = googlemaps.Client(key=maps_api_key)

    distance_result = gmaps.distance_matrix(
        origins=[startCity],
        destinations=endCities,
        mode="driving",
    )

    results = []
    
    # We only have one starting destination so we only need the first row
    elements = distance_result["rows"][0]["elements"]
    
    for element in elements:
        if element["status"] == "OK":
            distance = element["distance"]["text"]
            duration = element["duration"]["text"]
            results.append([distance, duration])
        else:
            results.append(["N/A", "N/A"])
            
    return results