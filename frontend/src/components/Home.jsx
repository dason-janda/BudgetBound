import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddRequestForm from './AddRequestForm';

const Home = () => {
    const navigate = useNavigate();

    // When the user searches from the Home page, we intercept it here
    const handleInitialSearch = (newRequestData) => {
        // Remove old results so our new search triggers
        sessionStorage.removeItem('budgetBound_flights');
        sessionStorage.removeItem('budgetBound_drives');

        // redirect and pass the new search data
        navigate('/results', {
            state: { triggerNewSearch: newRequestData }
        });
    };

    return (
        <div className="home-container">
            {/* --- HERO SECTION (Styled exactly like Requests.jsx) --- */}
            <div className="hero-section">
                <div className="hero-overlay">
                    <h1 style={{ marginTop: 0, textAlign: 'center', fontSize: '3rem', marginBottom: '10px' }}>
                        Travel Further. Spend Less.
                    </h1>
                    <p style={{ textAlign: 'center', color: '#fff', fontSize: '1.2rem', marginBottom: '30px' }}>
                        Enter your destination and budget. We'll crunch the numbers on flights, drive times, and hotels.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {/* Pass our redirect function into the form */}
                        <AddRequestForm addRequest={handleInitialSearch} />
                    </div>
                </div>
            </div>

            {/* --- HOW IT WORKS SECTION --- */}
            <section style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', color: '#333' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>How BudgetBound Works</h2>

                <div style={{ display: 'flex', gap: '30px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    {/* Step 1 */}
                    <div style={{ flex: '1', minWidth: '250px', textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <h3 style={{ color: '#007bff' }}>1. Set Your Limits</h3>
                        <p>Tell us where you want to go, when, and exactly how much you are willing to spend. We automatically format your destination to ensure accuracy.</p>
                    </div>

                    {/* Step 2 */}
                    <div style={{ flex: '1', minWidth: '250px', textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <h3 style={{ color: '#007bff' }}>2. Fly vs. Drive</h3>
                        <p>Our algorithm automatically calculates the drive time and pulls live flight prices. We'll tell you if it's cheaper to hit the road or take to the skies.</p>
                    </div>

                    {/* Step 3 */}
                    <div style={{ flex: '1', minWidth: '250px', textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <h3 style={{ color: '#007bff' }}>3. Perfect Placements</h3>
                        <p>We find the best hotels that fit your remaining budget and plot them on an interactive map so you know exactly where you are staying.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;    