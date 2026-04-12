import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../api.js";
import AddRequestForm from './AddRequestForm';

const Requests = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const hasFired = useRef(false);

    const [flights, setFlights] = useState(() => {
        const saved = sessionStorage.getItem('budgetBound_flights');
        return saved ? JSON.parse(saved) : [];
    });

    const [drives, setDrives] = useState(() => {
        const saved = sessionStorage.getItem('budgetBound_drives');
        return saved ? JSON.parse(saved) : [];
    });

    const [searchParams, setSearchParams] = useState(() => {
        const saved = sessionStorage.getItem('budgetBound_params');
        return saved ? JSON.parse(saved) : { location: '', depart: '', ret: '', budget: 0 };
    });

    const [selectedTrips, setSelectedTrips] = useState([]);
    const [alternatives, setAlternatives] = useState([]);
    // isManual is set to false that means the flight lookup failed and we need to display failed text
    const [isManualAlt, setIsManualAlt] = useState(false);
    const [loading, setLoading] = useState(false);
    //Usestates for ai prompt
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiExplanation, setAiExplanation] = useState("");
    const [aiIsLoading, setAiIsLoading] = useState(false);
    // this usestate will hold the list of matched destinations
    const [matchedCities, setMatchedCities] = useState([]);

    const fetchRequests = async () => {
        setLoading(true);
        api.get('/drives').then(response => {
            setDrives(response.data);
            // Save drives list to browser memory
            sessionStorage.setItem('budgetBound_drives', JSON.stringify(response.data));
        });

        api.get('/flights').then(response => {
            setFlights(response.data);
            // Save flights list to browser memory
            sessionStorage.setItem('budgetBound_flights', JSON.stringify(response.data));
        });

        setLoading(false);
    };

    const addRequest = async (newRequestData) => {
        setLoading(true);
        const newParams = {
            location: newRequestData.location,
            depart: newRequestData.depart,
            ret: newRequestData.ret,
            budget: newRequestData.budget
        };

        setSearchParams(newParams);
        sessionStorage.setItem('budgetBound_params', JSON.stringify(newParams));

        try {
            const response = await api.post('/requests', newRequestData);

            if (response.data.status === 'needs_alternative') {
                // Show box of alternatives
                setIsManualAlt(false);
                setAlternatives(response.data.alternatives);
                // Get successful drives still if flights fail
                api.get('/drives').then(res => {
                    setDrives(res.data);
                    sessionStorage.setItem('budgetBound_drives', JSON.stringify(res.data));
                });
                setLoading(false);
            } else {
                setAlternatives([]);
                fetchRequests();
            }
        } catch (error) {
            console.error("Error adding request", error);
            setLoading(false);
        }
    };

    const fetchAlternativeFlights = async (airportCode) => {
        setLoading(true);
        const altRequestData = {
            location: airportCode,
            depart: searchParams.depart,
            ret: searchParams.ret,
            budget: searchParams.budget
        };

        try {
            // Hit our brand new backend route
            const response = await api.post('/alt-flights', altRequestData);

            if (response.data.status === 'success') {
                // Hide the yellow alternatives box
                setAlternatives([]);

                //get only the new flights
                api.get('/flights').then(res => {
                    setFlights(res.data);
                    sessionStorage.setItem('budgetBound_flights', JSON.stringify(res.data));
                });
            } else {
                alert("Sorry, we couldn't find flights from that airport either. Try another!");
            }
        } catch (error) {
            console.error("Error fetching alternative flights", error);
        } finally {
            setLoading(false)
        }
    };

    const handleManualAltSearch = async () => {
        setLoading(true);
        if (!searchParams.location) return;

        try {
            const response = await api.get(`/nearby-airports/${searchParams.location}`);
            if (response.data.status === 'success') {
                setIsManualAlt(true);
                setAlternatives(response.data.alternatives);
            }
        } catch (error) {
            console.error("Error manually fetching alternatives", error);
        } finally {
            setLoading(false)
        }
    };

    const formatDuration = (minutes) => {
        if (!minutes) return "N/A";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const toggleSelection = (trip, type) => {
        const tripId = `${type}-${trip.city_name}`;
        const isSelected = selectedTrips.some(t => t.id === tripId);
        if (isSelected) {
            setSelectedTrips(selectedTrips.filter(t => t.id !== tripId));
        } else {
            const newTrip = {
                id: tripId,
                destination: trip.city_name,
                country: trip.country || "USA",
                transport_type: type,
                transport_cost: type === 'flight' ? (trip.price || trip.flight_price) : 0,
                depart_date: searchParams.depart,
                return_date: searchParams.ret,
                budget: searchParams.budget,
                flight_link: type === 'flight' ? trip.flight_link : null,
            };
            setSelectedTrips([...selectedTrips, newTrip]);
        }
    };

    const goToComparison = () => {
        navigate('/compare', { state: { trips: selectedTrips } });
    }

    const handleAiFilter = async () => {
        if (!aiPrompt) return;
        setAiIsLoading(true);
        setAiExplanation("");

        try {
            // Gather all unique city names from BOTH flights and drives
            const flightCities = flights.map(f => f.city_name || f.segments?.[0]?.arrival_city).filter(Boolean);
            const driveCities = drives.map(d => d.city_name).filter(Boolean);
            const allDestinations = [...new Set([...flightCities, ...driveCities])];

            // Call your backend
            const response = await api.post('/api/filter-destinations', {
                userPrompt: aiPrompt,
                destinations: allDestinations
            });

            // Set the matched cities to trigger the UI filter
            setMatchedCities(response.data.matched_cities);
            setAiExplanation(response.data.explanation);

        } catch (error) {
            console.error("Error filtering with AI:", error);
            setAiExplanation("Sorry, I had trouble analyzing these destinations.");
        } finally {
            setAiIsLoading(false);
        }
    };

    useEffect(() => {
        // Did we just arrive from the Home page with new search data?
        if (location.state?.triggerNewSearch) {
            hasFired.current = true;
            const newRequestData = location.state.triggerNewSearch;

            // Clear out React state immediately just to be safe
            setFlights([]);
            setDrives([]);
            setAlternatives([]);

            // Fire the actual POST request to your backend!
            addRequest(newRequestData);

            // Wipe the router state clean. 
            // This prevents the search from re-firing if the user hits the "Refresh" button on their browser.
            navigate('/results', { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    return (
        <>
            <div className="hero-section">
                <div className="hero-overlay">
                    <h1 style={{ marginTop: 0, textAlign: 'center' }}>Welcome to BudgetBound!</h1>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <AddRequestForm addRequest={addRequest} />
                    </div>
                    <div className="compare-container" style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            className="compare-button"
                            onClick={goToComparison}
                            disabled={selectedTrips.length === 0}
                        >
                            {selectedTrips.length > 0
                                ? `Compare ${selectedTrips.length} Trips ➔`
                                : 'Select trips to compare'}
                        </button>
                    </div>

                    {/* Only show this if we actually have flights to display AND we are not loading */}
                    {!loading && flights.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
                                <span style={{ color: '#fff' }}>
                                    Displaying results from: <strong>{flights[0].origin}</strong>
                                </span>

                                <button
                                    onClick={handleManualAltSearch}
                                    style={{ padding: '6px 12px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
                                >
                                    Change Airport
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading Screen */}
            {loading && (
                <div style={{ textAlign: 'center', margin: '60px 0' }}>
                    <h3 style={{ color: '#007bff' }}>Searching for trips</h3>
                    <p style={{ color: '#6c757d' }}>Hang tight, we're scouring the web</p>
                </div>
            )}

            {/* UI to display alternative airports (Hidden while loading) */}
            {!loading && alternatives.length > 0 && (
                <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', margin: '20px auto', maxWidth: '600px', textAlign: 'center', border: '1px solid #ffeeba' }}>
                    {isManualAlt ? (
                        <>
                            <h3 style={{ color: '#856404', marginTop: 0 }}>Change Airport</h3>
                            <p style={{ color: '#856404', marginBottom: '15px' }}>Select a nearby airport to see different flight options.</p>
                        </>
                    ) : (
                        <>
                            <h3 style={{ color: '#856404', marginTop: 0 }}>No flights found from your chosen city.</h3>
                            <p style={{ color: '#856404', marginBottom: '15px' }}>Would you like to search from one of these nearby airports instead?</p>
                        </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {alternatives.map((alt, index) => (
                            <button
                                key={index}
                                onClick={() => { fetchAlternativeFlights(alt.iata); }}
                                style={{ padding: '10px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#ffffff', fontWeight: 'bold' }}
                            >
                                {alt.iata} - {alt.name}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setAlternatives([])}
                        style={{ marginTop: '15px', background: 'none', border: 'none', color: '#6c757d', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Main Results Container (Hidden while loading) */}
            {/* Main Results Container (Hidden while loading) */}
            {!loading && (flights.length > 0 || drives.length > 0) && (
                <div className="requests-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>

                    {/* AI Feature UI */}
                    <div className="ai-filter-section" style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0, color: '#333' }}>Filter destinations with AI</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="e.g., Places with great rock climbing"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button
                                onClick={handleAiFilter}
                                disabled={aiIsLoading}
                                style={{ padding: '0 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                {aiIsLoading ? 'Thinking...' : 'Filter Results'}
                            </button>
                            {matchedCities.length > 0 && (
                                <button
                                    onClick={() => { setMatchedCities([]); setAiExplanation(""); }}
                                    style={{ padding: '0 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>

                        {/* Display Gemini's reasoning */}
                        {aiExplanation && (
                            <p style={{ marginTop: '15px', marginBottom: 0, fontStyle: 'italic', color: '#0056b3', backgroundColor: '#e2eef9', padding: '10px', borderRadius: '4px' }}>
                                <strong>AI Explanation:</strong> {aiExplanation}
                            </p>
                        )}
                    </div>

                    <div className="main-layout">
                        {/* DRIVE RESULTS */}
                        <div className="layout-column">
                            <h3 className="column-header">Drives</h3>

                            {Array.isArray(drives) && drives.length > 0 ? (
                                <div className="card-grid">
                                    {drives
                                        // Filter cities by one that the AI has matched
                                        .filter(drive => matchedCities.length === 0 || matchedCities.includes(drive.city_name))
                                        .map((drive, index) => {
                                            const isSelected = selectedTrips.some(t => t.id === `drive-${drive.city_name}`);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`trip-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => toggleSelection(drive, 'drive')}
                                                >
                                                    <div className="card-row">
                                                        <h3 style={{ margin: 0 }}>{drive.city_name}</h3>
                                                        <input type="checkbox" checked={isSelected} readOnly />
                                                    </div>

                                                    <div className="card-row">
                                                        <span className="drive-time">{drive.drive_time_hours}</span>
                                                        <span className="airline">{drive.distance_km}</span>
                                                    </div>
                                                    <div className="details">
                                                        <p style={{ margin: '5px 0' }}><strong>State:</strong> {drive.state}</p>
                                                        <p style={{ margin: '5px 0' }}><strong>Country:</strong> {drive.country}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <p style={{ padding: '20px', color: 'gray', textAlign: 'center' }}>
                                    No drives available.
                                </p>
                            )}
                        </div>

                        {/* FLIGHT RESULTS */}
                        <div className="layout-column">
                            <h3 className="column-header">Flights</h3>

                            {Array.isArray(flights) && flights.length > 0 ? (
                                <div className="card-grid">
                                    {flights
                                        // Filter by cities the AI matched
                                        .filter(flight => {
                                            if (matchedCities.length === 0) return true; // Show all if no filter
                                            const cityName = flight.city_name || flight.segments?.[0]?.arrival_city;
                                            return matchedCities.includes(cityName);
                                        })
                                        .map((flight, index) => {
                                            if (!flight.price && !flight.flight_price) return null;
                                            const price = flight.price || flight.flight_price;
                                            const airline = flight.airline || (flight.segments && flight.segments[0]?.airline) || "N/A";
                                            const cityName = flight.city_name || flight.segments?.[0]?.arrival_city;
                                            const isSelected = selectedTrips.some(t => t.id === `flight-${cityName}`);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`trip-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => toggleSelection(flight, 'flight')}
                                                >
                                                    <div className="card-row">
                                                        <h3 style={{ margin: 0 }}>{cityName}</h3>
                                                        <input type="checkbox" checked={isSelected} readOnly />
                                                    </div>

                                                    <div className="card-row">
                                                        <span className="price">${price}</span>
                                                        <span className="airline">{airline}</span>
                                                    </div>

                                                    <div className="details">
                                                        <p style={{ margin: '5px 0' }}><strong>Duration:</strong> {formatDuration(flight.duration_minutes)}</p>
                                                        <p style={{ margin: '5px 0' }}><strong>Stops:</strong> {flight.stops === 0 ? "Non-stop" : flight.stops}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <p style={{ padding: '20px', color: 'gray', textAlign: 'center' }}>
                                    No flights available.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};


export default Requests;