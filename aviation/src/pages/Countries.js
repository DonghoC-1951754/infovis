import React, { useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";

const Countries = () => {
  useEffect(() => {
    const width = 960;
    const height = 600;

    const svg = d3.select("#map"); // Select an svg element with id "map"

    const projection = d3
      .geoMercator()
      .scale(100)
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    d3.json("/assets/world-geojson.json").then((worldData) => {
      const countryColors = {
        "United States": "#FF0000", // Red for the United States
        Canada: "#0000FF", // Blue for Canada
        Brazil: "#00FF00", // Green for Brazil
      };

      svg
        .selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#ccc")
        .attr("stroke", "#fff")
        .attr("fill", (d) => {
          const countryName = d.properties.name;
          return countryColors[countryName] || "#ccc"; // Default color if not found
        })
        .attr("stroke", "#fff");
    });
  }, []); // Empty dependency array ensures this effect runs once after the component mounts

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
