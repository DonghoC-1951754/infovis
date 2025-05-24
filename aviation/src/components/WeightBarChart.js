import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

const WeightBarChart = ({ data }) => {
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
      typeof data !== "object" ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    const transformedData = Object.entries(data).map(
      ([weightClass, count]) => ({
        weightClass,
        count,
      })
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    d3.selectAll(".tooltip").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 60, right: 30, bottom: 60, left: 120 };

    const chartWidth = Math.max(width - margin.left - margin.right, 100);
    const chartHeight = Math.max(height - margin.top - margin.bottom, 100);

    // Scales
    const y = d3
      .scaleBand()
      .domain(transformedData.map((d) => d.weightClass))
      .range([margin.top, margin.top + chartHeight])
      .padding(0.1);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(transformedData, (d) => d.count)])
      .nice()
      .range([margin.left, margin.left + chartWidth]);

    // Axes
    const yAxis = (g) =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0));

    const xAxis = (g) =>
      g
        .attr("transform", `translate(0,${margin.top + chartHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .call((g) => g.select(".domain").remove());

    // Tooltip
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
      .style("z-index", "1000")
      .style("max-width", "200px")
      .style("white-space", "nowrap");

    const total = d3.sum(transformedData, (d) => d.count);

    // Bars with animation
    svg
      .append("g")
      .selectAll("rect")
      .data(transformedData)
      .join("rect")
      .attr("y", (d) => y(d.weightClass))
      .attr("x", margin.left)
      .attr("height", y.bandwidth())
      .attr("width", 0) // start width 0 for animation
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#1d4ed8");

        const percentage = ((d.count / total) * 100).toFixed(1);

        tooltip.style("visibility", "visible").html(`
            <div><strong>Weight Class:</strong> ${d.weightClass}</div>
            <div><strong>Amount:</strong> ${d.count}</div>
            <div><strong>Percentage:</strong> ${percentage}%</div>
          `);
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
      .transition() // animate to final width
      .duration(800)
      .attr("width", (d) => x(d.count) - margin.left)
      .delay((_, i) => i * 100);

    svg.append("g").call(yAxis);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        `translate(${margin.left / 2}, ${
          margin.top + chartHeight / 2
        }) rotate(-90)`
      )
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text("Weight Class");

    svg.append("g").call(xAxis);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", margin.left + chartWidth / 2)
      .attr("y", height - 20)
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
      .text("Accident Rate by Weight Class");
  }, [data, dimensions]);

  const totalAccidents =
    data && typeof data === "object"
      ? Object.values(data).reduce((sum, v) => sum + v, 0)
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

export default WeightBarChart;
