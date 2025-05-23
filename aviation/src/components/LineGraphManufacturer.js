import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const LineGraphManufacturer = ({ id, title, selectedManufacturers }) => {
  const d3Container = useRef(null);
  const legendContainer = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Shared fixed color palette
  const sharedColors = [
    ...d3.schemeCategory10,
    ...d3.schemeSet2,
    ...d3.schemeSet3,
  ];

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "http://localhost:5000/number_of_accidents_per_manufacturer_per_year"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const fetchedData = await response.json();
        setData(fetchedData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (
      loading ||
      error ||
      data.length === 0 ||
      !selectedManufacturers ||
      selectedManufacturers.size === 0
    )
      return;

    d3.select(d3Container.current).selectAll("*").remove();
    d3.select(legendContainer.current).selectAll("*").remove();

    const margin = { top: 25, right: 20, bottom: 60, left: 50 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(d3Container.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Extract all manufacturers from data keys except "year"
    const allManufacturers = Object.keys(data[0] || {}).filter(
      (key) => key !== "year"
    );

    // Create color scale with full domain of all manufacturers and fixed range
    const color = d3
      .scaleOrdinal()
      .domain(allManufacturers)
      .range(sharedColors.slice(0, allManufacturers.length));

    // Filter keys to only selected manufacturers
    const keys = Array.from(selectedManufacturers);

    // Prepare filtered data for selected manufacturers
    const filteredData = data.map((d) => {
      const newData = { year: d.year };
      keys.forEach((key) => {
        newData[key] = d[key] || 0;
      });
      return newData;
    });

    // X scale - year
    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year))
      .range([0, width]);

    // Y scale - max accidents value
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => d3.max(keys, (key) => d[key]))])
      .nice()
      .range([height, 0]);

    // Axis ticks for years every 5 years
    const years = d3.range(
      Math.ceil(d3.min(data, (d) => d.year) / 5) * 5,
      Math.floor(d3.max(data, (d) => d.year) / 5) * 5 + 5,
      5
    );

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d")));

    svg.append("g").call(d3.axisLeft(y).ticks(5));

    // Axis labels
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 40)
      .text("Year");

    svg
      .append("text")
      .attr("text-anchor", "start")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-size", "16px")
      .text("Number of accidents");

    // Line generator
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    const linesGroup = svg.append("g");

    keys.forEach((key) => {
      const path = linesGroup
        .append("path")
        .data([filteredData.map((d) => ({ year: d.year, value: d[key] }))])
        .attr("class", key)
        .style("fill", "none")
        .style("stroke", color(key))
        .style("stroke-width", 2)
        .attr("d", line);

      const pathLength = path.node().getTotalLength();

      path
        .style("stroke-dasharray", pathLength)
        .style("stroke-dashoffset", pathLength)
        .transition()
        .duration(700)
        .ease(d3.easeLinear)
        .style("stroke-dashoffset", 0);
    });

    // Focus group for mouseover circles
    const focusGroup = svg.append("g").style("display", "none");

    const focusCircles = keys.map((key) =>
      focusGroup
        .append("circle")
        .attr("r", 4)
        .style("fill", color(key))
        .style("stroke", "white")
        .style("stroke-width", 1)
    );

    // Tooltip group
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .style("display", "none")
      .style("pointer-events", "none");

    tooltip
      .append("rect")
      .attr("width", 140)
      .attr("height", keys.length * 20 + 10)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("rx", 5)
      .attr("ry", 5);

    const tooltipText = tooltip
      .selectAll(".tooltip-text")
      .data(keys)
      .enter()
      .append("text")
      .attr("x", 10)
      .attr("y", (d, i) => 20 * (i + 1))
      .style("font-size", "12px")
      .style("fill", (d) => color(d));

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focusGroup.style("display", null);
        tooltip.style("display", null);
      })
      .on("mouseout", () => {
        focusGroup.style("display", "none");
        tooltip.style("display", "none");
      })
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const year = Math.round(x.invert(mx));
        const closestData = filteredData.find((d) => d.year === year);
        if (!closestData) return;

        keys.forEach((key, i) => {
          focusCircles[i].attr("cx", x(year)).attr("cy", y(closestData[key]));
        });

        tooltipText.text((d) => `${d}: ${closestData[d]}`);

        const textWidths = tooltipText
          .nodes()
          .map((node) => node.getBBox().width);
        const maxWidth = Math.max(...textWidths);

        tooltip.select("rect").attr("width", maxWidth + 20);

        tooltip.attr(
          "transform",
          `translate(${x(year) + 15},${
            y(d3.max(keys.map((k) => closestData[k]))) - 30
          })`
        );
      });

    // Render HTML legend
    const legend = d3.select(legendContainer.current);

    keys.forEach((key) => {
      const item = legend.append("div").attr("class", "flex items-center mb-2");

      item
        .append("div")
        .style("background-color", color(key))
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("margin-right", "8px");

      item
        .append("div")
        .style("font-size", "12px")
        .style("color", "#333")
        .text(key);
    });
  }, [data, selectedManufacturers, loading, error]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Loading accident data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        No accident data available
      </div>
    );
  }

  if (!selectedManufacturers || selectedManufacturers.size === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Please select at least one manufacturer
      </div>
    );
  }

  return (
    <div className="p-3 flex-col h-full">
      <h2 className="text-lg font-semibold mb-1 text-center">{title}</h2>
      <div className="flex w-full h-full">
        <div className="flex-1">
          <div
            ref={d3Container}
            className="w-full h-full flex items-center"
          ></div>
        </div>
        <div
          ref={legendContainer}
          className="w-48 overflow-y-auto h-full ml-4 rounded p-2"
        ></div>
      </div>
    </div>
  );
};

export default LineGraphManufacturer;
