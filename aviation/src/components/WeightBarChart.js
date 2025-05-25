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
      ([weightClass, count]) => ({ weightClass, count })
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    d3.selectAll(".tooltip").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 60, right: 30, bottom: 60, left: 60 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3
      .scaleBand()
      .domain(transformedData.map((d) => d.weightClass))
      .range([margin.left, margin.left + chartWidth])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(transformedData, (d) => d.count)])
      .nice()
      .range([margin.top + chartHeight, margin.top]);

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

    const total = d3.sum(transformedData, (d) => d.count);

    svg
      .append("g")
      .selectAll("rect")
      .data(transformedData)
      .join("rect")
      .attr("x", (d) => x(d.weightClass))
      .attr("y", y(0)) // start from bottom
      .attr("width", x.bandwidth())
      .attr("height", 0) // start with height 0
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
      .transition()
      .duration(800)
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => y(0) - y(d.count))
      .delay((_, i) => i * 100);

    svg
      .append("g")
      .attr("transform", `translate(0,${margin.top + chartHeight})`)
      .call(d3.axisBottom(x));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text("Weight Class");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        `translate(${margin.left / 2}, ${height / 2}) rotate(-90)`
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
