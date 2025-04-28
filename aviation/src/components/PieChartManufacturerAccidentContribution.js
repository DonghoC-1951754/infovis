import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

export default function PieChartManufacturerAccidentContribution() {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [colorScale, setColorScale] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const svgRef = useRef();
  const chartContainerRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "http://localhost:5000/number_of_accidents_per_manufacturer_per_year"
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const jsonData = await response.json();
        setData(jsonData);
        if (jsonData.length > 0) {
          setSelectedYear(2024);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getManufacturersData = () => {
    if (!selectedYear || data.length === 0)
      return { chartData: [], top5: [], totalAccidents: 0 };
    const yearData = data.find((item) => item.year === selectedYear);
    if (!yearData) return { chartData: [], top5: [], totalAccidents: 0 };
    const manufacturerData = Object.entries(yearData)
      .filter(([key, value]) => key !== "year" && value > 0)
      .map(([manufacturer, count]) => ({ manufacturer, count }))
      .sort((a, b) => b.count - a.count);
    const totalAccidents = manufacturerData.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const top5 = manufacturerData.slice(0, 5);
    const othersCount =
      totalAccidents - top5.reduce((sum, item) => sum + item.count, 0);
    const chartData = [...top5];
    if (othersCount > 0) {
      chartData.push({
        manufacturer: "Others",
        count: othersCount,
      });
    }
    chartData.forEach((item) => {
      item.percentage = (item.count / totalAccidents) * 100;
    });
    return { chartData, top5, totalAccidents };
  };

  const getYears = () => {
    return data.map((item) => item.year);
  };

  useEffect(() => {
    if (loading || error || !selectedYear) return;

    const { chartData } = getManufacturersData();
    if (!chartData || chartData.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = 400;
    const height = 400;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const colors = [...d3.schemeCategory10.slice(0, 5), "#808080"];
    const color = d3
      .scaleOrdinal()
      .domain(chartData.map((d) => d.manufacturer))
      .range(colors);

    setColorScale({
      domain: chartData.map((d) => d.manufacturer),
      range: colors,
    });

    const pie = d3
      .pie()
      .value((d) => d.count)
      .sort(null);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const path = svg
      .selectAll("path")
      .data(pie(chartData))
      .enter()
      .append("path")
      .attr("fill", (d) => color(d.data.manufacturer))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)
      .each(function (d) {
        this._current = { startAngle: 0, endAngle: 0 };
      })
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr(
            "d",
            d3
              .arc()
              .innerRadius(0)
              .outerRadius(radius * 1.05)
          );
        const containerRect = chartContainerRef.current.getBoundingClientRect();
        const xPosition = event.clientX - containerRect.left;
        const yPosition = event.clientY - containerRect.top;
        setHoverInfo({
          manufacturer: d.data.manufacturer,
          percentage: d.data.percentage,
          count: d.data.count,
          x: xPosition,
          y: yPosition,
        });
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("d", d3.arc().innerRadius(0).outerRadius(radius));
        setHoverInfo(null);
      })
      .on("click", (event, d) => {
        const listItems = document.querySelectorAll(".manufacturer-list-item");
        listItems.forEach((item) => {
          if (item.dataset.manufacturer === d.data.manufacturer) {
            item.classList.add("bg-blue-100");
            setTimeout(() => {
              item.classList.remove("bg-blue-100");
            }, 1500);
          }
        });
      });

    // Animate
    path
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return function (t) {
          return arc(interpolate(t));
        };
      });

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", -height / 2 + 20)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Manufacturer Accident Distribution (${selectedYear})`);
  }, [selectedYear, loading, error, data]);

  if (loading) return <div className="text-center py-8">Loading data...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  if (data.length === 0)
    return <div className="text-center py-8">No data available</div>;

  const { chartData, totalAccidents } = getManufacturersData();

  const getColor = (manufacturer) => {
    if (!colorScale) return "#cccccc";
    const index = colorScale.domain.indexOf(manufacturer);
    if (index === -1) return "#cccccc";
    return colorScale.range[index];
  };

  return (
    <div className="flex flex-col items-center h-full p-4 w-full max-w-4xl">
      <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="w-full pr-2 h-full overflow-auto md:w-48 mb-4 md:mb-0">
          <label className="block text-sm font-medium mb-2">Select Year:</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedYear || ""}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {getYears().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Total Accidents Display */}
          <div className="mt-6">
            <h3 className="font-medium mb-2">Total Accidents:</h3>
            <div className="text-lg font-bold">{totalAccidents}</div>
          </div>

          {/* Manufacturers List */}
          <div className="mt-6">
            <ul className="space-y-2">
              {chartData &&
                chartData.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-1 transition-colors duration-300 manufacturer-list-item rounded"
                    data-manufacturer={item.manufacturer}
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 mr-2 rounded-sm"
                        style={{ backgroundColor: getColor(item.manufacturer) }}
                      ></div>
                      <span>{item.manufacturer}</span>
                    </div>
                    <span className="font-medium">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Chart */}
        <div className="relative" ref={chartContainerRef}>
          <svg ref={svgRef} className="w-full h-full"></svg>

          {/* Hover Tooltip */}
          {hoverInfo && (
            <div
              className="absolute bg-white p-2 rounded shadow-md border border-gray-300 z-10 text-sm"
              style={{
                left: `${hoverInfo.x}px`,
                top: `${hoverInfo.y - 70}px`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
              }}
            >
              <div className="font-bold">{hoverInfo.manufacturer}</div>
              <div>Accidents: {hoverInfo.count}</div>
              <div>Share: {hoverInfo.percentage.toFixed(1)}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
