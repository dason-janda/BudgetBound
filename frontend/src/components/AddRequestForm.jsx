import React, { useState } from 'react';
import LocationAutocomplete from './LocationAutocomplete';

const AddRequestForm = ({ addRequest }) => {
    const [formData, setFormData] = useState({
        location: '',
        budget: '',
        depart: '',
        ret: ''
    });

    // Updates inputs with name being the field name and the value being the value in that field and the setFormData makes sure that 
    //previous data isnt cleared out when you update one part of the form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        // make sure form is filled out
        if (formData.location && formData.budget && formData.depart && formData.ret) {

            // convert strings to correct values
            const payload = {
                location: formData.location,
                budget: parseInt(formData.budget),
                depart: formData.depart,
                ret: formData.ret
            };

            addRequest(payload);

            // reset form after submitted
            setFormData({ location: '', budget: '', depart: '', ret: '' });
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
            <h3>Request a New Trip</h3>

            <LocationAutocomplete
                location={formData.location}
                setLocation={(newLocation) => {
                    handleChange({
                        target: {
                            name: 'location',
                            value: newLocation
                        }
                    });
                }}
            />

            <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Budget (e.g. 1000)"
                required
            />

            <input
                type="date"
                name="depart"
                value={formData.depart}
                onChange={handleChange}
                required
            />

            <input
                type="date"
                name="ret"
                value={formData.ret}
                onChange={handleChange}
                required
            />

            <button className="submit" type="submit">Add Request</button>
        </form>
    );
};

export default AddRequestForm;