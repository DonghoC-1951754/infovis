import React, { useRef, useEffect, useState } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";
import GraphCard from "../components/GraphCard.js";
import LineGraphManufacturer from "../components/LineGraphManufacturer.js";
// import {
//   graphOne,
//   graphTwo,
//   graphThree,
//   graphFour,
//   graphFive,
//   graphSix,
// } from "../components/Graphs.js";

const Manufacturers = () => {
  const [allData, setAllData] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState(new Set());

  useEffect(() => {
    fetch("http://127.0.0.1:5000/manufacturers")
      .then((response) => response.json())
      .then((data) => {
        setManufacturers(data); // assuming it returns an array of manufacturer names
      })
      .catch((error) => {
        console.error("Error fetching manufacturers:", error);
      });
  }, []);

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

  const toggleManufacturer = (manufacturer) => {
    setSelectedManufacturers((prev) => {
      const updated = new Set(prev);
      if (updated.has(manufacturer)) {
        updated.delete(manufacturer);
      } else {
        updated.add(manufacturer);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (allData.length === 0) return;
    d3.select("#my_dataviz").selectAll("*").remove();

    var margin = { top: 50, right: 30, bottom: 60, left: 60 },
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
      <div className="h-1/2 w-full flex">
        <div className="bg-white shadow p-4 w-full h-full flex">
          {/* Line Graph (4/5) */}
          <div className="w-4/5 h-full">
            <LineGraphManufacturer
              id={1}
              title="Number of accidents per manufacturer"
              data={allData}
              selectedManufacturers={selectedManufacturers}
            />
          </div>

          {/* Filter (1/5) */}
          <div className="w-1/5 h-full overflow-auto flex flex-col">
            {manufacturers.map((manufacturer) => (
              <div key={manufacturer} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedManufacturers.has(manufacturer)}
                  onChange={() => toggleManufacturer(manufacturer)}
                />
                <label>{manufacturer}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Manufacturers;
