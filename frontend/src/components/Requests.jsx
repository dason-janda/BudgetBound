import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../api.js";
import AddRequestForm from './AddRequestForm';

const Requests = () => {
    const navigate = useNavigate();

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
        return saved ? JSON.parse(saved) : { depart: '', ret: '', budget: 0 };
    });

    const [selectedTrips, setSelectedTrips] = useState([]);

    const fetchRequests = async () => {
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
    };

    const addRequest = async (newRequestData) => {
        //capture dates and budget for hotel lookup and final price calculations later
        const newParams = {
            depart: newRequestData.depart,
            ret: newRequestData.ret,
            budget: newRequestData.budget
        };

        setSearchParams(newParams);
        sessionStorage.setItem('budgetBound_params', JSON.stringify(newParams));

        try {
            await api.post('/requests', newRequestData);
            fetchRequests();
        } catch (error) {
            console.error("Error adding request", error);
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
                budget: searchParams.budget
            };
            setSelectedTrips([...selectedTrips, newTrip]);
        }
    };

    const goToComparison = () => {
        navigate('/compare', { state: { trips: selectedTrips } });
    }

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
                </div>
            </div>

            <div className="requests-container">
                <div className="main-layout">
                    {/* drive results */}
                    <div className="layout-column">
                        <h3 className="column-header">Drives</h3>

                        {/* Display no drives message if nothing in array */}
                        {Array.isArray(drives) && drives.length > 0 ? (
                            <div className="card-grid">
                                {drives.map((drive, index) => {
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
                                No drives available. Waiting for search...
                            </p>
                        )}
                    </div>

                    {/* flight results */}
                    <div className="layout-column">
                        <h3 className="column-header">Flights</h3>

                        {/* Display no flight message if nothing in array */}
                        {Array.isArray(flights) && flights.length > 0 ? (
                            <div className="card-grid">
                                {flights.map((flight, index) => {
                                    if (!flight.price && !flight.flight_price) return null;
                                    const price = flight.price || flight.flight_price;
                                    const airline = flight.airline || (flight.segments && flight.segments[0]?.airline) || "N/A";
                                    const isSelected = selectedTrips.some(t => t.id === `flight-${flight.city_name}`);

                                    return (
                                        <div
                                            key={index}
                                            className={`trip-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleSelection(flight, 'flight')}
                                        >
                                            <div className="card-row">
                                                <h3 style={{ margin: 0 }}>{flight.city_name || flight.segments?.[0]?.arrival_city}</h3>
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
                                No flights available. Waiting for search...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


export default Requests;