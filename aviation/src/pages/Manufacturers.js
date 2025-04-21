import React, { useRef, useEffect, useState } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";

const Manufacturers = () => {
  const [allData, setAllData] = useState([]);

  useEffect(() => {
    // Fetch data from Flask endpoint
    fetch("http://localhost:5000/number_of_accidents_per_manufacturer")
      .then((response) => response.json())
      .then((data) => {
        setAllData(data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  useEffect(() => {
    if (allData.length === 0) return;
    d3.select("#my_dataviz").selectAll("*").remove();

    var margin = { top: 10, right: 30, bottom: 60, left: 60 },
      width = 460 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    var svg = d3
      .select("#my_dataviz")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const selectedManufacturers = ["Boeing", "Airbus"];
    // var keys = Object.keys(allData[0]).slice(1);
    var keys = selectedManufacturers;

    var color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet2);
    var stackedData = d3.stack().keys(keys)(allData);

    // Add X axis
    var x = d3
      .scaleLinear()
      .domain(
        d3.extent(allData, function (d) {
          return d.year;
        })
      )
      .range([0, width]);

    var xAxis = svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(5));

    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 40)
      .text("Time (year)");

    // Add Y axis label:
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", -20)
      .text("Amount of accidents")
      .attr("text-anchor", "start");

    // Add Y axis
    var y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y).ticks(5));

    var areaChart = svg.append("g").attr("clip-path", "url(#clip)");

    var area = d3
      .area()
      .x(function (d) {
        return x(d.data.year);
      })
      .y0(function (d) {
        return y(d[0]);
      })
      .y1(function (d) {
        return y(d[1]);
      });

    areaChart
      .selectAll("mylayers")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", function (d) {
        return "myArea " + d.key;
      })
      .style("fill", function (d) {
        return color(d.key);
      })
      .attr("d", area);
  }, [allData]);

  return (
    <div className="h-screen flex">
      <SidePanel />
      <div className="relative w-full h-full border" id="my_dataviz"></div>
    </div>
  );
};

export default Manufacturers;
