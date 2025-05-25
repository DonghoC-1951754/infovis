import React, { useRef, useEffect, useState } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";
import LineGraphManufacturer from "../components/LineGraphManufacturer.js";
import PieChartManufacturerAccidentContribution from "../components/PieChartManufacturerAccidentContribution.js";
import BarChartTotalNumberAccidentsPerManufacturer from "../components/BarChartTotalNumberAccidentsPerManufacturer.js";

const Manufacturers = () => {
  const [allData, setAllData] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState(
    new Set(["Boeing", "Airbus"]) // Default selected manufacturers
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/manufacturers")
      .then((response) => response.json())
      .then((data) => {
        setManufacturers(data); 
      })
      .catch((error) => {
        console.error("Error fetching manufacturers:", error);
      });
  }, []);

  useEffect(() => {
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

    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select("#my_dataviz")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const keys = Array.from(selectedManufacturers);

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet2);
    const stackedData = d3.stack().keys(keys)(allData);

    // Add X axis
    const x = d3
      .scaleLinear()
      .domain(
        d3.extent(allData, function (d) {
          return d.year;
        })
      )
      .range([0, width]);

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(5));

    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 40)
      .text("Time (year)");

    // Add Y axis label
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", -20)
      .text("Amount of accidents")
      .attr("text-anchor", "start");

    // Add Y axis
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y).ticks(5));

    const areaChart = svg.append("g").attr("clip-path", "url(#clip)");

    const area = d3
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
  }, [allData, selectedManufacturers]);

  return (
    <div className="h-screen flex">
      <SidePanel />
      <div className="h-full w-full flex-col">
        <div className="h-1/2 w-full flex">
          <div className="bg-white shadow p-4 w-full h-full flex">
            <div className="w-4/5 h-full">
              <LineGraphManufacturer
                id={1}
                title="Total Aviation Accidents Comparison (Yearly)"
                data={allData}
                selectedManufacturers={selectedManufacturers}
              />
            </div>

            <div className="w-1/5 h-full border-l pl-4 ml-2">
              <div className="sticky top-0 bg-white z-10 pb-2">
                <h3 className="text-lg font-semibold mb-3">Manufacturers</h3>
                <div className="flex justify-between mb-3">
                  <button
                    onClick={() =>
                      setSelectedManufacturers(new Set(manufacturers))
                    }
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedManufacturers(new Set())}
                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded"
                  >
                    Clear All
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search manufacturers..."
                    className="w-full border rounded py-1 px-2 text-sm mb-3"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-auto max-h-[calc(100%-120px)]">
                {manufacturers
                  .filter((m) =>
                    m.toLowerCase().includes(searchTerm?.toLowerCase() || "")
                  )
                  .map((manufacturer) => (
                    <div
                      key={manufacturer}
                      className="flex items-center mb-2 hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        id={`check-${manufacturer}`}
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-blue-600 cursor-pointer"
                        checked={selectedManufacturers.has(manufacturer)}
                        onChange={() => toggleManufacturer(manufacturer)}
                      />
                      <label
                        htmlFor={`check-${manufacturer}`}
                        className="cursor-pointer text-sm flex-1 truncate"
                        title={manufacturer}
                      >
                        {manufacturer}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="h-1/2 w-full flex">
          <div className="bg-white shadow p-6 w-1/2 h-full flex">
            <PieChartManufacturerAccidentContribution />
          </div>
          <div className="bg-white shadow p-6 w-1/2 h-full flex">
            <BarChartTotalNumberAccidentsPerManufacturer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Manufacturers;
