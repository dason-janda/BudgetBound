import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Requests from './components/Requests';
import TripComparison from './components/TripComparison';
import Home from './components/Home';


const App = () => {
    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/results" element={<Requests />} />
                <Route path="/compare" element={<TripComparison />} />
            </Routes>
        </div >
    );
};

export default App;