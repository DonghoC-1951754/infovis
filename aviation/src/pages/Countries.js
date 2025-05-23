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
    return count
      ? d3
          .scaleLinear()
          .domain([0, Math.max(...data.map((item) => item.Count))])
          .range(["#f1a1a1", "#8b0000"])(count)
      : "#f2f0f7";
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
        .attr("stroke", (d) => {
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
          return isSelected ? "#ff6b35" : "#FFFFFF";
        })
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
          return isSelected ? 3 : 0.5;
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
            d3.select(this).attr("stroke-width", 2).attr("stroke", "#333");
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
            .attr("stroke", isSelected ? "#ff6b35" : "#FFFFFF")
            .attr("stroke-width", isSelected ? 3 : 0.5);
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

    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#f2f0f7"); // Light color

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8b0000"); // Dark red

    svgLegend
      .append("rect")
      .attr("x", margin.left)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const minVal = d3.min(data, (d) => d.Count);
    const maxVal = d3.max(data, (d) => d.Count);

    const xScale = d3
      .scaleLinear()
      .domain([minVal, maxVal])
      .range([0, legendWidth]);

    const tickValues = d3
      .range(0, 6)
      .map((i) => Math.round(minVal + (i * (maxVal - minVal)) / 5));

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
