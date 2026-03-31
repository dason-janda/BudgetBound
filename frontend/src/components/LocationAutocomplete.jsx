import React, { useEffect, useRef } from 'react';

const LocationAutocomplete = ({ location, setLocation }) => {
    const containerRef = useRef(null);
    const autocompleteRef = useRef(null);
    const setLocationRef = useRef(setLocation);

    useEffect(() => {
        setLocationRef.current = setLocation;
    }, [setLocation]);

    useEffect(() => {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.error("Google Maps API not loaded");
            return;
        }

        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        const placeAutocomplete = new window.google.maps.places.PlaceAutocompleteElement({
            includedPrimaryTypes: ['locality', 'administrative_area_level_3']
        });

        autocompleteRef.current = placeAutocomplete;

        if (containerRef.current) {
            containerRef.current.appendChild(placeAutocomplete);
        }

        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
            if (!placePrediction) {
                setLocationRef.current('');
                return;
            }

            const place = placePrediction.toPlace();

            await place.fetchFields({
                fields: ['displayName', 'formattedAddress', 'addressComponents']
            });

            let city = '';
            let state = '';

            if (place.addressComponents) {
                for (const component of place.addressComponents) {
                    const types = component.types;

                    if (types.includes('locality')) {
                        city = component.longText;
                    }

                    if (types.includes('administrative_area_level_1')) {
                        state = component.shortText;
                    }
                }
            }

            if (city && state) {
                setLocationRef.current(`${city}, ${state}`);
            } else if (place.formattedAddress) {
                setLocationRef.current(place.formattedAddress);
            } else if (place.displayName) {
                setLocationRef.current(place.displayName);
            }
        });

        return () => {
            if (containerRef.current && autocompleteRef.current) {
                // Safely remove the element on unmount
                if (containerRef.current.contains(autocompleteRef.current)) {
                    containerRef.current.removeChild(autocompleteRef.current);
                }
            }
        };
    }, []);

    return (
        <>
            <style>
                {`
                    gmp-place-autocomplete {
                        width: 100%;
                    }
                    /* 'part(input)' targets the actual text box inside Google's web component */
                    gmp-place-autocomplete::part(input) {
                        padding: 10px;
                        border-radius: 4px;
                        border: 1px solid #ccc;
                        width: 100%;
                        box-sizing: border-box;
                        font-family: inherit;
                        font-size: 14px;
                        background-color: #ffffff; /* Overrides the dark box */
                        color: #000000;            /* Overrides white text */
                    }
                    gmp-place-autocomplete::part(input):focus {
                        outline: none;
                        border-color: #007bff; /* Optional: adds a nice blue border on click */
                    }
                `}
            </style>

            <div ref={containerRef} style={{ width: '100%' }}></div>
        </>
    );
};

export default LocationAutocomplete;