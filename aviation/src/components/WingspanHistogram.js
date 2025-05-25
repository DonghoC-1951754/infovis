import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

const WingspanHistogram = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const adjustedHeight = Math.max(height - 40, 200);
      setDimensions({
        width: Math.max(width, 300),
        height: adjustedHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleResize = () => {
      setTimeout(updateDimensions, 100);
    };

    window.addEventListener("resize", handleResize);

    d3.selectAll(".tooltip").remove();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      d3.selectAll(".tooltip").remove();
    };
  }, [updateDimensions]);

  useEffect(() => {
    if (
      !data ||
      !Array.isArray(data) ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    // data is expected to be array of { bin_start, bin_end, accident_count }
    const transformedData = data.map((d) => ({
      binLabel: `${d.bin_start}-${d.bin_end}`,
      binStart: d.bin_start,
      binEnd: d.bin_end,
      count: d.accident_count,
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    d3.selectAll(".tooltip").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 60, right: 30, bottom: 70, left: 60 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // For x scale, use linear scale from min bin_start to max bin_end
    const x = d3
      .scaleLinear()
      .domain([
        d3.min(transformedData, (d) => d.binStart),
        d3.max(transformedData, (d) => d.binEnd),
      ])
      .range([margin.left, margin.left + chartWidth]);

    // Y scale
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(transformedData, (d) => d.count)])
      .nice()
      .range([margin.top + chartHeight, margin.top]);

    // Tooltip setup
    const tooltip = d3
      .select("body")
      .selectAll(".tooltip")
      .data([0])
      .join("div")
      .attr("class", "tooltip")
      .style("position", "fixed")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Draw bars as histogram style
    svg
      .append("g")
      .selectAll("rect")
      .data(transformedData)
      .join("rect")
      .attr("x", (d) => x(d.binStart))
      .attr("width", (d) => x(d.binEnd) - x(d.binStart) - 1) // -1 for small gap between bars
      .attr("y", y(0)) // start at bottom
      .attr("height", 0)
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#1d4ed8");

        const total = d3.sum(transformedData, (t) => t.count);
        const percentage = ((d.count / total) * 100).toFixed(1);

        tooltip
          .style("visibility", "visible")
          .html(
            `<div><strong>Bin:</strong> ${d.binLabel}</div>` +
              `<div><strong>Amount:</strong> ${d.count}</div>` +
              `<div><strong>Percentage:</strong> ${percentage}%</div>`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.clientY - 10 + "px")
          .style("left", event.clientX + 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", "#3b82f6");
        tooltip.style("visibility", "hidden");
      })
      .transition()
      .duration(800)
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => y(0) - y(d.count))
      .delay((_, i) => i * 100);

    // X axis with ticks (whiskers)
    const xAxis = d3
      .axisBottom(x)
      .tickValues(
        transformedData
          .map((d) => d.binStart)
          .concat(transformedData[transformedData.length - 1].binEnd)
      )
      .tickFormat(d3.format("d"));

    svg
      .append("g")
      .attr("transform", `translate(0,${margin.top + chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("y", 15)
      .attr("font-size", 11)
      .attr("text-anchor", "middle");

    // Y axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    // Axis labels
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 20)
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text("Wingspan Bin");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        `translate(${margin.left / 2},${height / 2}) rotate(-90)`
      )
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text("Amount of Accidents");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "#1f2937")
      .text("Accident Rate by Wingspan Bins");
  }, [data, dimensions]);

  // Calculate total accidents
  const totalAccidents = data
    ? data.reduce((sum, d) => sum + d.accident_count, 0)
    : 0;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex-grow min-h-0">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
          style={{ maxHeight: "100%", maxWidth: "100%" }}
        />
      </div>
      <div className="flex-shrink-0 pt-2">
        <p className="text-sm text-gray-500 text-center">
          Total amount of identified incidents: {totalAccidents}
        </p>
      </div>
    </div>
  );
};

export default WingspanHistogram;
