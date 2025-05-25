import React, { useState, useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import EngineBarChart from "../components/EngineBarChart";
import WeightBarChart from "../components/WeightBarChart";
import WingspanHistogram from "../components/WingspanHistogram";

const PlaneStats = () => {
  const [engineData, setEngineData] = useState(null);
  const [weightData, setWeightData] = useState(null);
  const [wingspanData, setWingspanData] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState(null); // "engine", "weight", "wingspan"

  useEffect(() => {
    fetch("http://localhost:5000/get_accident_rate_engine_amount")
      .then((res) => res.json())
      .then((data) => setEngineData(data))
      .catch((err) => console.error("Error fetching engine data:", err));

    fetch("http://localhost:5000/get_accident_rate_weight_amount")
      .then((res) => res.json())
      .then((data) => setWeightData(data))
      .catch((err) => console.error("Error fetching weight data:", err));

    fetch("http://localhost:5000/get_accident_rate_wingspan_bin")
      .then((res) => res.json())
      .then((data) => setWingspanData(data))
      .catch((err) => console.error("Error fetching wingspan data:", err));
  }, []);

  const handleEngineClick = () => {
    if (engineData) {
      setChartType("engine");
      setShowChart(true);
    } else {
      alert("Engine data not loaded yet.");
    }
  };

  const handleWeightClick = () => {
    if (weightData) {
      setChartType("weight");
      setShowChart(true);
    } else {
      alert("Weight data not loaded yet.");
    }
  };

  const handleWingspanClick = () => {
    if (wingspanData) {
      setChartType("wingspan");
      setShowChart(true);
    } else {
      alert("Wingspan data not loaded yet.");
    }
  };

  return (
    <div className="h-screen flex">
      <SidePanel />
      <div className="h-screen w-full flex flex-col p-6 bg-gray-50">
        <div className="flex flex-col flex-1 bg-white rounded-lg shadow-md p-6">
          <div className="h-20 flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Aircraft Specifications in Aviation Accident Data
            </h2>
          </div>

          <div className="flex-1 bg-gray-100 rounded-md overflow-auto flex flex-row items-center justify-center gap-6 p-4">
            <div className="flex-shrink-0 w-1/3 max-w-[33.3333%] relative">
              <img
                src="../assets/plane.jpg"
                alt="Plane"
                className="object-contain w-full h-auto rounded-md shadow"
              />
              <div className="absolute top-[38%] left-[64%] group">
                <button
                  onClick={handleEngineClick}
                  className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  aria-label="Engine part clickable area"
                  title="Click to see engine stats"
                />
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Engine
                </div>
              </div>
              <div className="absolute top-[44%] left-[49%] group">
                <button
                  onClick={handleWeightClick}
                  className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  aria-label="Weight part clickable area"
                  title="Click to see weight stats"
                />
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Weight
                </div>
              </div>
              <div className="absolute top-[56%] left-[11%] group">
                <button
                  onClick={handleWingspanClick}
                  className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  aria-label="Wingspan part clickable area"
                  title="Click to see wingspan stats"
                />
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Wingspan
                </div>
              </div>
            </div>

            {/* Right: Chart display */}
            <div className="flex-grow h-full w-2/3 min-w-0">
              {showChart ? (
                chartType === "engine" && engineData ? (
                  <EngineBarChart data={engineData} />
                ) : chartType === "weight" && weightData ? (
                  <WeightBarChart data={weightData} />
                ) : chartType === "wingspan" && wingspanData ? (
                  <WingspanHistogram data={wingspanData} />
                ) : (
                  <div className="text-center flex items-center justify-center h-full">
                    <p className="text-gray-600 text-lg">Loading chart...</p>
                  </div>
                )
              ) : (
                <div className="text-center flex items-center justify-center h-full">
                  <p className="text-gray-600 text-lg">
                    Click on the blue buttons on the plane to view statistics
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaneStats;
