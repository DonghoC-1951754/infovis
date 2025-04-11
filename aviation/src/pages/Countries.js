import React, { useState, useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";

const Countries = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const getColor = (count) => {
    return count
      ? d3
          .scaleLinear()
          .domain([0, Math.max(...data.map((item) => item.Count))])
          .range(["#f2f0f7", "#2e4a7f"])(count) // From light to dark blue
      : "#f2f0f7"; // Default color if no count
  };

  useEffect(() => {
    // Replace with the actual URL to your Flask server
    const url =
      "http://127.0.0.1:5000/operator-country?start_date=2020-01-01&end_date=2025-04-10";

    // Fetch data from the Flask API
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        setData(data); // Store the JSON data in state
      }) // Store the JSON data in state
      .catch((error) => setError(error.message)); // Handle errors
  }, []); // The empty array ensures the effect runs only once after the initial render

  useEffect(() => {
    if (!data) return;

    const width = 960;
    const height = 600;
    const svg = d3.select("#map");

    const projection = d3
      .geoMercator()
      .scale(100)
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    console.log(data);

    d3.json("/assets/world-geojson.json").then((worldData) => {
      svg
        .selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#ccc")
        .attr("stroke", "#FFFFFF")
        .attr("fill", (d) => {
          const countryName = d.properties.name;
          const country = data.find(
            (item) => item["Operator Country"] === countryName
          );
          const count = country ? country.Count : 0;
          return getColor(count); // Apply color based on the count
        })
        .attr("stroke-width", 0.5);
    });
  }, [data]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <SidePanel />
      <div class="p-0 sm:ml-64">
        <svg id="map" viewBox="0 0 960 600"></svg>
      </div>
    </div>
  );
};

export default Countries;
