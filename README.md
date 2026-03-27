# BudgetBound

BudgetBound is a full-stack travel comparison application designed to help users discover budget trip destinations. By taking a user's starting location, budget, and dates, the app finds possible flights or drives and lets users compare their options, look at hotel options in their budget, and displaying a final trip budget breakdown.

> **Try it out at:** [https://budget-bound.vercel.app](https://budget-bound.vercel.app)

---

## Features

* **Multimodal Travel Comparison:** Instantly finds flight prices and driving costs to various destinations based on user input.
* **Smart Airport Fallbacks:** Features a dynamic error-handling UI that detects failed flight lookups and suggests the nearest alternative airports using geodesic distance calculations.
* **Interactive Map Integration:** Utilizes the Google Maps JavaScript API to automatically plot and number selected hotel locations on an interactive map.
* **Persistent User Sessions:** Uses session storage caching, allowing users to navigate between search results and comparison pages without losing their data or triggering redundant API calls.

---

## Tech Stack

### Frontend
* React.js with React Router for navigation
* SessionStorage API for lightweight state persistence
* CSS3 for responsive, modern card grids and UI elements
* Hosted on Vercel

### Backend
* Python and FastAPI for a high-performance, asynchronous REST API
* Uvicorn and Gunicorn for production server management
* Geopy for location and coordinate calculations
* Hosted on Railway

### External APIs
* Google Maps APIs: Distance Matrix API, Geocoding API, Maps JavaScript API
* SerpAPI: For real time flight and hotels information
* Geonames API: FInd driving desinations within a certain radius of the starting location
