import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from "../api.js";
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const HotelMap = ({ hotels }) => {
    if (!hotels || hotels.length === 0) return null;

    // Center the map on the first hotel in the list
    const defaultCenter = {
        lat: Number(hotels[0].lat),
        lng: Number(hotels[0].long)
    };

    return (
        <div style={{ height: '250px', width: '100%', marginTop: '15px', marginBottom: '15px', borderRadius: '8px', overflow: 'hidden' }}>
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                <Map defaultZoom={12} defaultCenter={defaultCenter}>
                    {hotels.map((hotel, index) => {
                        // Skip if the API didn't return coordinates for some reason
                        if (!hotel.lat || !hotel.long) return null;

                        return (
                            <Marker
                                key={index}
                                position={{ lat: Number(hotel.lat), lng: Number(hotel.long) }}
                                // This adds the number (1, 2, 3...) to the red pin!
                                label={{ text: (index + 1).toString(), color: 'white', fontWeight: 'bold' }}
                                title={hotel.name}
                            />
                        );
                    })}
                </Map>
            </APIProvider>
        </div>
    );
};

const CompareTrips = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initialTrips = location.state?.trips || [];

    const [detailedTrips, setDetailedTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHotels, setSelectedHotels] = useState({});

    useEffect(() => {
        const fetchAllDetails = async () => {
            const promises = initialTrips.map(trip =>
                api.post('/tripDetails', {
                    location: trip.destination,
                    transportCost: trip.transport_cost,
                    transportType: trip.transport_type,
                    depart: trip.depart_date,
                    ret: trip.return_date,
                    budget: trip.budget,
                })
                    .then(res => ({ ...trip, ...res.data, status: 'success' }))
                    .catch(err => ({ ...trip, status: 'error' }))
            );

            const results = await Promise.all(promises);
            setDetailedTrips(results);
            setLoading(false);
        };

        if (initialTrips.length > 0) {
            fetchAllDetails();
        }
    }, []);

    const handleHotelSelect = (tripIndex, hotelIndex) => {
        setSelectedHotels(prev => ({
            ...prev,
            [tripIndex]: hotelIndex
        }));
    };

    const calculateTotal = (trip, hotelIndex) => {
        const hotel = trip.hotel_options[hotelIndex];
        if (!hotel || !hotel.price) return "N/A";

        // calculate nights
        const start = new Date(trip.depart_date);
        const end = new Date(trip.return_date);
        const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24))) || 1;

        // turn everything into numbers
        const hotelCost = Number(String(hotel.price).replace(/[^0-9.-]+/g, ""));
        const transportCost = Number(String(trip.transport_cost).replace(/[^0-9.-]+/g, ""));

        const total = transportCost + (hotelCost * nights);
        return total.toFixed(2);
    };

    if (loading) return <h2>Calculating Hotel Costs for {initialTrips.length} trips...</h2>;

    return (
        <div className="compare-page-container">
            <button onClick={() => navigate(-1)} className="compare-button" style={{ marginBottom: '20px' }}>← Back to Search</button>
            <h1>Trip Comparison</h1>

            <div className="comparison-grid">
                {detailedTrips.map((trip, tripIndex) => (
                    <div key={tripIndex} className="summary-card">
                        <h2 className="destination-title">{trip.destination}</h2>
                        <span>{trip.transport_type}</span>

                        <div className="cost-section">
                            <p>Transport: <strong>${trip.transport_cost}</strong></p>

                            {trip.hotel_options && trip.hotel_options.length > 0 ? (
                                trip.hotel_options.map((hotel, hotelIndex) => {
                                    const isSelected = selectedHotels[tripIndex] === hotelIndex;

                                    return (
                                        <div
                                            key={hotelIndex}
                                            className={`hotel-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleHotelSelect(tripIndex, hotelIndex)}
                                        >
                                            <h4 className="hotel-name">{hotel.name}</h4>

                                            <div className="hotel-details">
                                                <span className="hotel-price">
                                                    {hotel.price ? `${hotel.price}` : 'Price N/A'} / night
                                                </span>

                                                {hotel.rating && (
                                                    <span>⭐ {hotel.rating.toFixed(1)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="error-text">No hotels found within remaining budget.</p>
                            )}

                            {trip.hotel_options && trip.hotel_options.length > 0 && (
                                <HotelMap hotels={trip.hotel_options} />
                            )}

                            {selectedHotels[tripIndex] !== undefined && (
                                <div className="total-trip-price">
                                    Total Trip Cost: ${calculateTotal(trip, selectedHotels[tripIndex])}
                                </div>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompareTrips;