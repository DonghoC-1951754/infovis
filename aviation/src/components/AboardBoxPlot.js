import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

const SingleBoxPlot = ({ data, category, dimensions, title }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !dimensions.width || !dimensions.height) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    d3.selectAll(`.tooltip-${category}`).remove();

    const margin = { top: 60, right: 30, bottom: 60, left: 50 };
    const width = dimensions.width;
    const height = dimensions.height;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(title);

    const weightClasses = ["Small", "Medium", "Large", "Heavy"];
    const transformedData = [];

    weightClasses.forEach((weightClass) => {
      const values = data[weightClass] || [];
      if (Array.isArray(values) && values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = d3.quantile(sorted, 0.25);
        const median = d3.quantile(sorted, 0.5);
        const q3 = d3.quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
        const max = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
        const outliers = sorted.filter((v) => v < min || v > max);

        transformedData.push({
          weightClass,
          values: sorted,
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

    const x = d3
      .scaleBand()
      .domain(weightClasses)
      .range([margin.left, margin.left + chartWidth])
      .padding(0.1);

    const allValues = transformedData.flatMap((d) => d.values);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues)])
      .nice()
      .range([margin.top + chartHeight, margin.top]);

    const color = category === "crew" ? "#3b82f6" : "#22c55e";

    const t = d3.transition().duration(700).ease(d3.easeCubicOut);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", `tooltip tooltip-${category}`)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("color", "#111")
      .style("display", "none")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
      .style("z-index", "1000");

    transformedData.forEach((d) => {
      const xPos = x(d.weightClass);
      const boxWidth = x.bandwidth() * 0.8;
      const boxX = xPos + (x.bandwidth() - boxWidth) / 2;

      svg
        .append("line")
        .attr("x1", xPos + x.bandwidth() / 2)
        .attr("x2", xPos + x.bandwidth() / 2)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", color)
        .transition(t)
        .attr("y1", y(d.min))
        .attr("y2", y(d.max));

      ["min", "max"].forEach((bound) => {
        svg
          .append("line")
          .attr("x1", boxX + boxWidth * 0.25)
          .attr("x2", boxX + boxWidth * 0.75)
          .attr("y1", y(d.median))
          .attr("y2", y(d.median))
          .attr("stroke", color)
          .transition(t)
          .attr("y1", y(d[bound]))
          .attr("y2", y(d[bound]));
      });

      svg
        .append("rect")
        .attr("x", boxX)
        .attr("y", y(d.median))
        .attr("width", boxWidth)
        .attr("height", 0)
        .attr("fill", color)
        .attr("fill-opacity", 0.3)
        .attr("stroke", color)
        .transition(t)
        .attr("y", y(d.q3))
        .attr("height", y(d.q1) - y(d.q3));

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

      d.outliers.forEach((o) => {
        svg
          .append("circle")
          .attr("cx", xPos + x.bandwidth() / 2)
          .attr("cy", y(d.median))
          .attr("r", 0)
          .attr("fill", color)
          .attr("stroke", "white")
          .transition(t)
          .attr("cy", y(o))
          .attr("r", 3);
      });

      svg
        .append("rect")
        .attr("x", xPos)
        .attr("y", margin.top)
        .attr("width", x.bandwidth())
        .attr("height", chartHeight)
        .attr("fill", "transparent")
        .on("mouseover", (event) => {
          tooltip.style("display", "block").html(
            `<strong>${d.weightClass}</strong><br/>
             Min: ${d.min.toFixed(2)}<br/>
             Q1: ${d.q1.toFixed(2)}<br/>
             Median: ${d.median.toFixed(2)}<br/>
             Q3: ${d.q3.toFixed(2)}<br/>
             Max: ${d.max.toFixed(2)}<br/>
             Count: ${d.count}`
          );
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        });
    });

    svg
      .append("g")
      .attr("transform", `translate(0,${margin.top + chartHeight})`)
      .call(d3.axisBottom(x));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  }, [data, dimensions, category, title]);

  return (
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    />
  );
};

const AboardBoxPlot = ({ data }) => {
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const adjustedHeight = Math.max(height - 100, 400);
      setDimensions({
        width: Math.max(width / 2 - 20, 300),
        height: adjustedHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  const demoData = {
    crew: {
      Small: [10, 12, 15, 8, 14, 11, 13, 9, 16, 12],
      Medium: [18, 22, 25, 20, 24, 19, 23, 21, 26, 22],
      Large: [35, 40, 45, 38, 42, 37, 44, 41, 46, 39],
      Heavy: [55, 60, 65, 58, 62, 57, 64, 61, 66, 59],
    },
    passengers: {
      Small: [150, 180, 200, 160, 190, 170, 185, 175, 210, 165],
      Medium: [300, 350, 400, 320, 380, 340, 370, 360, 420, 330],
      Large: [800, 900, 1000, 850, 950, 820, 980, 870, 1020, 890],
      Heavy: [1500, 1800, 2000, 1600, 1900, 1700, 1850, 1750, 2100, 1650],
    },
  };

  return (
    <div className="relative w-full h-full" style={{ minHeight: "580px" }}>
      <div
        className="absolute top-0 left-1/2 text-center text-lg font-semibold text-gray-800 w-full px-4"
        style={{
          transform: "translateX(-50%)",
          marginTop: "10px",
          lineHeight: "1.3",
        }}
      >
        Distribution of Passengers and Crews Aboard
        <br />
        by Aircraft Weight Class
      </div>
      <div
        ref={containerRef}
        className="w-full h-full flex flex-row justify-center items-start gap-4"
        style={{ paddingTop: "60px", paddingBottom: "40px" }}
      >
        <SingleBoxPlot
          data={data?.crew || demoData.crew}
          category="crew"
          dimensions={dimensions}
          title="Crew Aboard"
        />
        <SingleBoxPlot
          data={data?.passengers || demoData.passengers}
          category="passengers"
          dimensions={dimensions}
          title="Passengers Aboard"
        />
      </div>

      <div
        className="absolute text-sm text-gray-700"
        style={{
          bottom: "14px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        Aircraft Weight Class
      </div>

      <div
        className="absolute text-sm text-gray-700"
        style={{
          top: "50%",
          left: "10px",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
        }}
      >
        Amount of People
      </div>
    </div>
  );
};

export default AboardBoxPlot;
