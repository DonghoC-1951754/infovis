import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

const AboardBoxPlot = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const adjustedHeight = Math.max(height - 40, 400);
      setDimensions({
        width: Math.max(width, 600),
        height: adjustedHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => updateDimensions());

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    const handleResize = () => setTimeout(updateDimensions, 100);

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

    const transformedData = [];

    Object.entries(data).forEach(([category, weightClasses]) => {
      Object.entries(weightClasses).forEach(([weightClass, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          const sortedValues = [...values].sort((a, b) => a - b);
          const q1 = d3.quantile(sortedValues, 0.25);
          const median = d3.quantile(sortedValues, 0.5);
          const q3 = d3.quantile(sortedValues, 0.75);
          const iqr = q3 - q1;
          const min = Math.max(d3.min(sortedValues), q1 - 1.5 * iqr);
          const max = Math.min(d3.max(sortedValues), q3 + 1.5 * iqr);
          const outliers = sortedValues.filter((d) => d < min || d > max);

          transformedData.push({
            category,
            weightClass,
            values: sortedValues,
            q1,
            median,
            q3,
            min,
            max,
            outliers,
            count: values.length,
          });
        }
      });
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    d3.selectAll(".tooltip").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 60, right: 30, bottom: 80, left: 60 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const categories = ["crew", "passengers"];
    const weightClasses = ["Small", "Medium", "Large", "Heavy"];
    const xLabels = [];
    categories.forEach((category) => {
      weightClasses.forEach((weightClass) => {
        xLabels.push(`${category}-${weightClass}`);
      });
    });

    const x = d3
      .scaleBand()
      .domain(xLabels)
      .range([margin.left, margin.left + chartWidth])
      .padding(0.1);

    const allValues = transformedData.flatMap((d) => d.values);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues)])
      .nice()
      .range([margin.top + chartHeight, margin.top]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(categories)
      .range(["#3b82f6", "#22c55e"]);

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

    const t = d3.transition().duration(700).ease(d3.easeCubicOut);

    transformedData.forEach((d) => {
      const xPos = x(`${d.category}-${d.weightClass}`);
      const boxWidth = x.bandwidth() * 0.8;
      const boxX = xPos + (x.bandwidth() - boxWidth) / 2;
      const color = colorScale(d.category);

      // Larger transparent hover area
      svg
        .append("rect")
        .attr("x", xPos)
        .attr("y", margin.top)
        .attr("width", x.bandwidth())
        .attr("height", chartHeight)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function () {
          tooltip.style("visibility", "visible").html(`
            <div><strong>${d.category.toLowerCase()} - ${d.weightClass.toLowerCase()}</strong></div>
            <div><strong>Count:</strong> ${d.count}</div>
            <div><strong>Min:</strong> ${d.min}</div>
            <div><strong>Q1:</strong> ${d.q1}</div>
            <div><strong>Median:</strong> ${d.median}</div>
            <div><strong>Q3:</strong> ${d.q3}</div>
            <div><strong>Max:</strong> ${d.max}</div>
            <div><strong>Outliers:</strong> ${d.outliers.length}</div>
          `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("top", event.clientY - 10 + "px")
            .style("left", event.clientX + 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
        });

      // Larger transparent hover area
      svg
        .append("rect")
        .attr("x", xPos)
        .attr("y", margin.top)
        .attr("width", x.bandwidth())
        .attr("height", chartHeight)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function () {
          tooltip.style("visibility", "visible").html(`
            <div><strong>${d.category.toLowerCase()} - ${d.weightClass.toLowerCase()}</strong></div>
            <div><strong>Count:</strong> ${d.count}</div>
            <div><strong>Min:</strong> ${d.min}</div>
            <div><strong>Q1:</strong> ${d.q1}</div>
            <div><strong>Median:</strong> ${d.median}</div>
            <div><strong>Q3:</strong> ${d.q3}</div>
            <div><strong>Max:</strong> ${d.max}</div>
            <div><strong>Outliers:</strong> ${d.outliers.length}</div>
          `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("top", event.clientY - 10 + "px")
            .style("left", event.clientX + 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
        });

      // Main whisker line (vertical)
      svg
        .append("line")
        .attr("x1", xPos + x.bandwidth() / 2)
        .attr("x2", xPos + x.bandwidth() / 2)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .transition(t)
        .attr("y1", y(d.min))
        .attr("y2", y(d.max));

      // Min whisker cap
      svg
        .append("line")
        .attr("x1", boxX + boxWidth * 0.25)
        .attr("x2", boxX + boxWidth * 0.75)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .transition(t)
        .attr("y1", y(d.min))
        .attr("y2", y(d.min));

      // Max whisker cap
      svg
        .append("line")
        .attr("x1", boxX + boxWidth * 0.25)
        .attr("x2", boxX + boxWidth * 0.75)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .transition(t)
        .attr("y1", y(d.max))
        .attr("y2", y(d.max));

      // Box (Q1 to Q3)
      svg
        .append("rect")
        .attr("x", boxX)
        .attr("y", y(d.median))
        .attr("width", boxWidth)
        .attr("height", 0)
        .attr("fill", color)
        .attr("fill-opacity", 0.3)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .transition(t)
        .attr("y", y(d.q3))
        .attr("height", y(d.q1) - y(d.q3));

      // Median line
      svg
        .append("line")
        .attr("x1", boxX)
        .attr("x2", boxX + boxWidth)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0)
        .transition(t)
        .attr("stroke-opacity", 1);

      // Outliers
      d.outliers.forEach((outlier) => {
        svg
          .append("circle")
          .attr("cx", xPos + x.bandwidth() / 2)
          .attr("cy", y(d.median))
          .attr("r", 0)
          .attr("fill", color)
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .transition(t)
          .attr("cy", y(outlier))
          .attr("r", 3);
      });
    });

    svg
      .append("g")
      .attr("transform", `translate(0,${margin.top + chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle")
      .text((d) => {
        const [category, weightClass] = d.split("-");
        return weightClass;
      });

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
      .text("Aircraft Weight Class");

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        `translate(${margin.left / 2}, ${height / 2}) rotate(-90)`
      )
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .text("Number of People");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "#1f2937")
      .text(
        "Distribution of Crew and Passengers Aboard by Aircraft Weight Class"
      );

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 150}, ${margin.top / 2})`);

    categories.forEach((category, i) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendItem
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(category))
        .attr("fill-opacity", 0.3)
        .attr("stroke", colorScale(category));

      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "12px")
        .text(category.charAt(0).toUpperCase() + category.slice(1));
    });
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ maxHeight: "100%", maxWidth: "100%" }}
      />
    </div>
  );
};

export default AboardBoxPlot;
