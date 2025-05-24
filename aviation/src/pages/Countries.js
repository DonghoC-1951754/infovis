import React, { useState, useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import CountriesFilter from "../components/CountriesFilter";
import * as d3 from "d3";

const Countries = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleFilter = (data) => {
    setData(data);
  };

  const handleCountrySelect = (countryName) => {
    setSelectedCountry(countryName);
  };

  const getColor = (count) => {
    if (!count) return "#f2f0f7";
    
    const maxCount = Math.max(...data.map((item) => item.Count));
    const logScale = d3.scaleLog()
      .domain([1, maxCount])
      .range(["#f1a1a1", "#8b0000"]);
    
    return logScale(count);
  };

  useEffect(() => {
    const url = `http://127.0.0.1:5000/operator-country?start_date=2024-01-01&end_date=2025-04-17`;
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) => setError(error.message));
  }, []);

  useEffect(() => {
    if (!data) return;

    const width = 960;
    const height = 600;
    const svg = d3.select("#map");

    svg.selectAll("*").remove();

    const g = svg.append("g");

    const projection = d3
      .geoMercator()
      .scale(130)
      .center([0, 40])
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    d3.json("/assets/world-geojson.json").then((worldData) => {
      g.selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", (d) => {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const count = country ? country.Count : 0;
          return getColor(count);
        })
        .attr("stroke", "#565758") // All borders are black by default
        .attr("stroke-width", (d) => {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const isSelected =
            country && selectedCountry === country["Operator Country"];
          return isSelected ? 3 : 0.2;
        })
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          if (country) {
            const newSelection =
              selectedCountry === country["Operator Country"]
                ? null
                : country["Operator Country"];
            setSelectedCountry(newSelection);
          }
        })
        .on("mouseover", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          if (country) {
            d3.select(this)
              .attr("stroke", "#139be8") // Blue hover color
              .attr("stroke-width", 1.5); // Thicker on hover
          }
        })
        .on("mouseout", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const isSelected =
            country && selectedCountry === country["Operator Country"];

          d3.select(this)
            .attr("stroke", "#565758")
            .attr("stroke-width", isSelected ? 3 : 0.2); // Reset to original
        });
    });

    // Zoom functionality
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8]) // Min and max zoom scale
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Replace your legend creation section with this:

    // Clean old legend
    d3.select("#legend").selectAll("*").remove();

    const legendWidth = 300;
    const legendHeight = 10;
    const margin = { top: 0, right: 20, bottom: 20, left: 20 };

    const svgLegend = d3
      .select("#legend")
      .append("svg")
      .attr("width", legendWidth + margin.left + margin.right)
      .attr("height", legendHeight + margin.bottom);

    const defs = svgLegend.append("defs");

    const minVal = Math.max(1, d3.min(data, (d) => d.Count));
    const maxVal = d3.max(data, (d) => d.Count);

    // Create logarithmic scale for color positioning
    const logScale = d3.scaleLog()
      .domain([minVal, maxVal])
      .range([0, 1]); // 0 to 1 for gradient percentages

    // Create gradient with logarithmically distributed color stops
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    // Create multiple color stops distributed logarithmically
    const numStops = 20; // More stops = smoother gradient
    for (let i = 0; i <= numStops; i++) {
      const logValue = minVal * Math.pow(maxVal / minVal, i / numStops);
      const position = logScale(logValue) * 100; // Convert to percentage
      
      // Use the same color scale as your map
      const mapLogScale = d3.scaleLog()
        .domain([minVal, maxVal])
        .range(["#f2f0f7", "#8b0000"]);
      
      const color = mapLogScale(logValue);
      
      gradient.append("stop")
        .attr("offset", `${position}%`)
        .attr("stop-color", color);
    }

    svgLegend
      .append("rect")
      .attr("x", margin.left)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    // Now create logarithmic scale for tick positioning
    const xScale = d3
      .scaleLog()
      .domain([minVal, maxVal])
      .range([0, legendWidth]);

    // Create clean logarithmic tick values
    function generateLogTicks(min, max) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logStep = (logMax - logMin) / 4; // 5 ticks total
      
      const ticks = [];
      for (let i = 0; i <= 4; i++) {
        const logValue = logMin + (i * logStep);
        let tickValue = Math.pow(10, logValue);
        
        // Round to nice numbers
        if (tickValue < 10) {
          tickValue = Math.round(tickValue);
        } else if (tickValue < 100) {
          tickValue = Math.round(tickValue / 5) * 5;
        } else if (tickValue < 1000) {
          tickValue = Math.round(tickValue / 10) * 10;
        } else {
          tickValue = Math.round(tickValue / 100) * 100;
        }
        
        ticks.push(tickValue);
      }
      
      // Ensure we include actual min and max
      ticks[0] = min;
      ticks[ticks.length - 1] = max;
      
      return [...new Set(ticks)].sort((a, b) => a - b);
    }

    const tickValues = generateLogTicks(minVal, maxVal);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d3.format("~s"));

    svgLegend
      .append("g")
      .attr("transform", `translate(${margin.left}, ${legendHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px");
  }, [data, selectedCountry]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="h-screen flex">
      <SidePanel />

      <div className="relative w-full h-full border">
        <svg id="map" viewBox="0 0 960 600" className="w-full h-full"></svg>

        <div
          id="legend"
          className="absolute bottom-2 right-2 bg-white/80 p-2 rounded shadow"
        ></div>
      </div>

      <CountriesFilter
        onDateChange={handleFilter}
        selectedCountry={selectedCountry}
        onCountrySelect={handleCountrySelect}
      />
    </div>
  );
};

export default Countries;
