import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BarChartTotalNumberAccidentsPerManufacturer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startYear, setStartYear] = useState(1920);
  const [endYear, setEndYear] = useState(2025);
  const [maxYear, setMaxYear] = useState(2025);
  const [topManufacturersCount, setTopManufacturersCount] = useState(10);
  const [aggregatedData, setAggregatedData] = useState([]);
  const chartRef = useRef(null);
  const tooltipRef = useRef(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "http://127.0.0.1:5000/number_of_accidents_per_manufacturer_per_year"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const jsonData = await response.json();

        // Find the max year in the dataset
        const maxYearInData = Math.max(...jsonData.map((item) => item.year));
        setMaxYear(maxYearInData);
        setEndYear(maxYearInData);

        setData(jsonData);
      } catch (err) {
        setError(err.message);
        // Generate mock data if there's an error
        generateMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate mock data for development/testing
  const generateMockData = () => {
    const mockData = [];
    // Generate mock data from 1920 to 2025
    for (let year = 1920; year <= 2025; year++) {
      const yearData = { year };
      [
        "Boeing",
        "Airbus",
        "Cessna",
        "Bombardier",
        "Embraer",
        "Piper Aircraft",
        "Beechcraft",
        "Bell",
        "Antonov",
        "Lockheed Corporation",
      ].forEach((manufacturer) => {
        // Random number of crashes between 0 and 10
        yearData[manufacturer] = Math.floor(Math.random() * 11);
      });
      mockData.push(yearData);
    }

    // Set max year from mock data
    setMaxYear(2025);
    setEndYear(2025);
    setData(mockData);
  };

  // Process data when inputs change
  useEffect(() => {
    if (data.length === 0) return;

    // Filter data by year range
    const filteredData = data.filter(
      (item) => item.year >= startYear && item.year <= endYear
    );

    // Aggregate crashes by manufacturer
    const manufacturerTotals = {};

    filteredData.forEach((yearData) => {
      Object.entries(yearData).forEach(([key, value]) => {
        // Skip the year field and only count numerical values
        if (key !== "year" && !isNaN(value)) {
          manufacturerTotals[key] = (manufacturerTotals[key] || 0) + value;
        }
      });
    });

    // Convert to array and sort
    let result = Object.entries(manufacturerTotals)
      .map(([manufacturer, crashes]) => ({ manufacturer, crashes }))
      .sort((a, b) => b.crashes - a.crashes);

    // Get top N manufacturers
    result = result.slice(0, topManufacturersCount);

    setAggregatedData(result);
  }, [data, startYear, endYear, topManufacturersCount]);

  // Create tooltip ref on component mount
  useEffect(() => {
    // Create tooltip div inside the component rather than appending to body
    tooltipRef.current = d3
      .select(chartRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("text-align", "center")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("background", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, []);

  // Draw the chart
  useEffect(() => {
    if (aggregatedData.length === 0 || !chartRef.current) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll("svg").remove();

    // Get container dimensions to make chart responsive
    const containerWidth = chartRef.current.clientWidth || 400;

    // Set dimensions - make them responsive to container
    const margin = { top: 20, right: 20, bottom: 70, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    // Create SVG with responsive dimensions
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3
      .scaleBand()
      .domain(aggregatedData.map((d) => d.manufacturer))
      .range([0, width])
      .padding(0.2);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Y axis
    const maxCrashes = d3.max(aggregatedData, (d) => d.crashes);
    const y = d3
      .scaleLinear()
      .domain([0, maxCrashes || 1]) // Fallback if maxCrashes is undefined
      .range([height, 0]);

    svg
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(maxCrashes, 10)) // Set reasonable max tick count
          .tickFormat(d3.format(".0f")) // Format as integer
      )
      .selectAll("text")
      .style("font-size", "10px");

    // Bars with animations and interactivity
    svg
      .selectAll("bars")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.manufacturer))
      .attr("width", x.bandwidth())
      .attr("y", height) // Start from bottom for animation
      .attr("height", 0) // Start with height 0 for animation
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.8)
      .on("mouseover", function (event, d) {
        // Highlight bar
        d3.select(this).attr("opacity", 1).attr("fill", "#2563eb");

        // Calculate position relative to chart container
        const chartRect = chartRef.current.getBoundingClientRect();
        const eventX = event.clientX - chartRect.left;
        const eventY = event.clientY - chartRect.top;

        // Show tooltip
        tooltipRef.current
          .style("opacity", 0.9)
          .html(`<strong>${d.manufacturer}</strong><br>${d.crashes} crashes`)
          .style("left", `${eventX + 10}px`)
          .style("top", `${eventY - 28}px`);
      })
      .on("mouseout", function () {
        // Restore bar
        d3.select(this).attr("opacity", 0.8).attr("fill", "#3b82f6");

        // Hide tooltip
        tooltipRef.current.style("opacity", 0);
      })
      // Animate bars growing from bottom
      .transition()
      .duration(800)
      .delay((d, i) => i * 50) // Stagger the animations
      .attr("y", (d) => y(d.crashes))
      .attr("height", (d) => height - y(d.crashes))
      .ease(d3.easeElastic.amplitude(0.5).period(0.7)); // Bouncy animation

    // Simple title with fade-in animation
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("opacity", 0)
      .text(`Aircraft Crashes (${startYear}-${endYear})`)
      .transition()
      .duration(1000)
      .style("opacity", 1);
  }, [aggregatedData, startYear, endYear]);

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">
        Top Manufacturers by Aviation Accidents (Selected Years)
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded mb-2 text-sm">
          Error: {error}. Using mock data.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1">Start Year</label>
          <input
            type="number"
            min="1920"
            max={endYear}
            value={startYear}
            onChange={(e) =>
              setStartYear(Math.min(parseInt(e.target.value), endYear))
            }
            className="w-full p-1 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">End Year</label>
          <input
            type="number"
            min={startYear}
            max={maxYear}
            value={endYear}
            onChange={(e) =>
              setEndYear(Math.max(parseInt(e.target.value), startYear))
            }
            className="w-full p-1 border rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Top Manufacturers
          </label>
          <select
            value={topManufacturersCount}
            onChange={(e) => setTopManufacturersCount(parseInt(e.target.value))}
            className="w-full p-1 border rounded text-sm"
          >
            {[5, 10, 15, 20, 25, 30].map((value) => (
              <option key={value} value={value}>
                Top {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-grow flex justify-center items-center">
          <p className="text-gray-600">Loading data...</p>
        </div>
      ) : (
        <div className="flex-grow overflow-hidden relative">
          <div ref={chartRef} className="w-full h-full"></div>

          {aggregatedData.length === 0 && (
            <p className="text-center py-4 text-gray-500 text-sm">
              No data available for the selected range
            </p>
          )}
        </div>
      )}
    </div>
  );
}
