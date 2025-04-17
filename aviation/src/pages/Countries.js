import React, { useState, useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import CountriesFilter from "../components/CountriesFilter";
import * as d3 from "d3";

const Countries = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleFilter = (url) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) => setError(error.message));
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
    const url = `http://127.0.0.1:5000/operator-country?start_date=2024-01-01&end_date=2025-04-01`;
    handleFilter(url);
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
          const country = data.find(
            (item) => item["Operator Country"] === countryName
          );
          const count = country ? country.Count : 0;
          return getColor(count);
        })
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 0.5);
    });

    // Zoom functionality
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8]) // Min and max zoom scale
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
  }, [data]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="h-screen flex">
      <SidePanel />

      <div className="flex-1 bg-white p-4 overflow-auto">
        <svg
          id="map"
          viewBox="0 0 960 600"
          className="w-full h-full border"
        ></svg>
      </div>

      <CountriesFilter onDateChange={handleFilter} />
    </div>
  );
};

export default Countries;
