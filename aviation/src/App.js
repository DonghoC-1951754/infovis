import "./App.css";
import React, { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Countries from "./pages/Countries";
import Manufacturers from "./pages/Manufacturers";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/countries" element={<Countries />} />
        <Route path="/manufacturers" element={<Manufacturers />} />
      </Routes>
    </Router>
  );
}

export default App;
