import "./App.css";
import React, { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/GeneralInfo";
import AccidentClassifications from "./pages/AccidentClassifications";
import Countries from "./pages/Countries";
import Manufacturers from "./pages/Manufacturers";
import PlaneStats from "./pages/PlaneStats";
import About from "./pages/About";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/countries" element={<Countries />} />
        <Route path="/manufacturers" element={<Manufacturers />} />
        <Route path="/planestats" element={<PlaneStats />} />
        <Route path="/accidents" element={<AccidentClassifications />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
