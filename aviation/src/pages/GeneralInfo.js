import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { TrendingUp, MapPin, Calendar, Users, AlertTriangle, Plane, Loader2, Menu, Clock, BarChart3, Shield, Activity } from "lucide-react";
import SidePanel from "../components/Sidepanel";

const TimelineChart = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(width, 300),
        height: Math.max(height, 200),
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0 || dimensions.height === 0) return;

    const yearlyAccidents = d3.rollup(data, v => v.length, d => d.Year);
    
    const yearData = Array.from(yearlyAccidents, ([year, count]) => ({ year, count }))
      .filter(d => d.year && !isNaN(d.year))
      .sort((a, b) => a.year - b.year);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    d3.selectAll(".tooltip").remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain(d3.extent(yearData, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.count)])
      .nice()
      .range([height, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
      .selectAll(".timeline-tooltip")
      .data([0])
      .join("div")
      .attr("class", "timeline-tooltip")
      .style("position", "fixed")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(yearData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    g.selectAll(".dot")
      .data(yearData)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.count))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#1d4ed8").attr("r", 6);
        tooltip.style("visibility", "visible")
          .html(`<strong>Year:</strong> ${d.year}<br/><strong>Accidents:</strong> ${d.count}`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.clientY - 10) + "px")
          .style("left", (event.clientX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#3b82f6").attr("r", 4);
        tooltip.style("visibility", "hidden");
      });

    // Create custom x-axis with ticks every year but labels every 3 years
    const [minYear, maxYear] = d3.extent(yearData, d => d.year);
    const xAxis = d3.axisBottom(x)
      .tickValues(d3.range(minYear, maxYear + 1, 1)) // Tick every year
      .tickFormat((d, i) => {
        // Show label only every 3 years starting from first year
        return (d - minYear) % 3 === 0 ? d3.format("d")(d) : "";
      })
      .tickSize(6); // Default tick size

    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    // Make ticks longer for labeled years (every 3rd year)
    xAxisGroup.selectAll(".tick")
      .each(function(d) {
        const tick = d3.select(this);
        const shouldHaveLabel = (d - minYear) % 3 === 0;
        if (shouldHaveLabel) {
          tick.select("line").attr("y2", 10); // Longer tick for labeled years
          tick.select("text").attr("dy", "1.5em"); // Move label down for longer ticks
        } else {
          tick.select("line").attr("y2", 4);  // Shorter tick for unlabeled years
        }
      });

    g.append("g")
      .call(d3.axisLeft(y));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Number of Accidents");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .text("Year");

    return () => {
      d3.selectAll(".timeline-tooltip").remove();
    };

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

const TimeOfDayChart = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(width, 300),
        height: Math.max(height, 200),
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0 || dimensions.height === 0) return;

    // Process time data
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    data.forEach(accident => {
      const timeStr = accident.Time;
      if (timeStr && timeStr !== '?' && !isNaN(timeStr)) {
        const timeNum = parseInt(timeStr);
        if (timeNum >= 0 && timeNum <= 2359) {
          const hour = Math.floor(timeNum / 100);
          if (hour >= 0 && hour < 24) {
            hourCounts[hour]++;
          }
        }
      }
    });

    const hourData = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    d3.selectAll(".time-tooltip").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(hourData.map(d => d.hour))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(hourData, d => d.count)])
      .nice()
      .range([height, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
      .selectAll(".time-tooltip")
      .data([0])
      .join("div")
      .attr("class", "time-tooltip")
      .style("position", "fixed")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    g.selectAll(".bar")
      .data(hourData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.hour))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count))
      .attr("fill", "#6366f1")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#4338ca");
        const timeRange = `${d.hour.toString().padStart(2, '0')}:00 - ${(d.hour + 1).toString().padStart(2, '0')}:00`;
        tooltip.style("visibility", "visible")
          .html(`<strong>Time:</strong> ${timeRange}<br/><strong>Accidents:</strong> ${d.count}`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.clientY - 10) + "px")
          .style("left", (event.clientX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#6366f1");
        tooltip.style("visibility", "hidden");
      });

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => d.toString().padStart(2, '0') + ':00'));

    g.append("g")
      .call(d3.axisLeft(y));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Number of Accidents");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .text("Hour of Day");

    return () => {
      d3.selectAll(".time-tooltip").remove();
    };

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

const AccidentSeverityChart = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(width, 300),
        height: Math.max(height, 200),
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0 || dimensions.height === 0) return;

    // Process severity data
    const severityBuckets = {
      '0': 0,        // No fatalities
      '1-10': 0,     // 1-10 fatalities
      '11-50': 0,    // 11-50 fatalities
      '51-100': 0,   // 51-100 fatalities
      '101-200': 0,  // 101-200 fatalities
      '200+': 0      // 200+ fatalities
    };

    data.forEach(accident => {
      const fatalities = parseInt(accident.Fatalities?.split('(')[0]?.trim() || '0') || 0;
      if (fatalities === 0) {
        severityBuckets['0']++;
      } else if (fatalities <= 10) {
        severityBuckets['1-10']++;
      } else if (fatalities <= 50) {
        severityBuckets['11-50']++;
      } else if (fatalities <= 100) {
        severityBuckets['51-100']++;
      } else if (fatalities <= 200) {
        severityBuckets['101-200']++;
      } else {
        severityBuckets['200+']++;
      }
    });

    const severityData = Object.entries(severityBuckets).map(([range, count]) => ({
      range,
      count
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    d3.selectAll(".severity-tooltip").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(severityData.map(d => d.range))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(severityData, d => d.count)])
      .nice()
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(severityData.map(d => d.range))
      .range(['#10b981', '#f6d13b', '#f59e0b', '#f97316', '#ef4444', '#991b1b']);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
      .selectAll(".severity-tooltip")
      .data([0])
      .join("div")
      .attr("class", "severity-tooltip")
      .style("position", "fixed")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    g.selectAll(".bar")
      .data(severityData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.range))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count))
      .attr("fill", d => colorScale(d.range))
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.8);
        tooltip.style("visibility", "visible")
          .html(`<strong>Fatalities:</strong> ${d.range}<br/><strong>Accidents:</strong> ${d.count}`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.clientY - 10) + "px")
          .style("left", (event.clientX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Number of Accidents");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .text("Fatality Range");

    return () => {
      d3.selectAll(".severity-tooltip").remove();
    };

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

const SurvivalRateGauge = ({ data }) => {
  const svgRef = useRef();
  const [survivalStats, setSurvivalStats] = useState(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    let totalAboard = 0;
    let totalFatalities = 0;
    let accidentsWithData = 0;

    data.forEach(accident => {
      const aboard = parseInt(accident.Aboard?.split('(')[0]?.trim() || '0') || 0;
      const fatalities = parseInt(accident.Fatalities?.split('(')[0]?.trim() || '0') || 0;
      
      if (aboard > 0) {
        totalAboard += aboard;
        totalFatalities += fatalities;
        accidentsWithData++;
      }
    });

    const overallSurvivalRate = totalAboard > 0 ? ((totalAboard - totalFatalities) / totalAboard) * 100 : 0;
    const totalSurvivors = totalAboard - totalFatalities;

    setSurvivalStats({
      survivalRate: overallSurvivalRate,
      totalAboard,
      totalFatalities,
      totalSurvivors,
      accidentsWithData
    });

  }, [data]);

  useEffect(() => {
    if (!survivalStats) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    const arc = d3.arc()
      .innerRadius(radius - 30)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2 + 10})`);

    // Background arc
    g.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", "#e5e7eb")
      .attr("d", arc);

    // Survival rate arc
    const survivalAngle = (survivalStats.survivalRate / 100) * Math.PI - Math.PI / 2;
    
    g.append("path")
      .datum({ endAngle: survivalAngle })
      .style("fill", survivalStats.survivalRate > 50 ? "#10b981" : "#ef4444")
      .attr("d", arc);

    // Center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .text(`${survivalStats.survivalRate.toFixed(1)}%`);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text("Survival Rate");

  }, [survivalStats]);

  if (!survivalStats) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-center">
      <svg ref={svgRef} width="300" height="200" className="mx-auto" />
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-gray-900">{survivalStats.totalSurvivors.toLocaleString()}</div>
          <div className="text-gray-600">Total Survivors</div>
        </div>
        <div>
          <div className="font-semibold text-gray-900">{survivalStats.totalAboard.toLocaleString()}</div>
          <div className="text-gray-600">Total Aboard</div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ icon: Icon, title, value, subtitle, color = "blue", loading = false }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          {loading ? (
            <div className="flex items-center mt-1">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="ml-2 text-lg">Loading...</span>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
            </>
          )}
        </div>
        <Icon className="w-8 h-8 opacity-60" />
      </div>
    </div>
  );
};

const TopListCard = ({ title, items, icon: Icon, color = "gray", loading = false }) => {
  const colorClasses = {
    gray: "border-gray-200 bg-gray-50",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50"
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-1">
              <span className="text-sm truncate flex-1 mr-2">{item.label}</span>
              <span className="font-semibold text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GeneralInfo = () => {
  const [accidentData, setAccidentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async () => {
    try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://localhost:5000/accident-data');
        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAccidentData(data);

    } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process data for statistics
  const processedStats = React.useMemo(() => {
    if (accidentData.length === 0) return null;

    const totalAccidents = accidentData.length;
    const totalFatalities = accidentData.reduce((sum, accident) => {
      const fatalities = parseInt(accident.Fatalities?.split('(')[0]?.trim() || '0') || 0;
      return sum + fatalities;
    }, 0);

    const yearCounts = {};
    accidentData.forEach(accident => {
      const year = accident.Year;
      if (year && !isNaN(year)) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    const peakYear = Object.entries(yearCounts)
      .reduce((max, [year, count]) => 
        count > max.count ? { year: parseInt(year), count } : max
      , { year: 0, count: 0 });

    const years = accidentData
      .map(d => d.Year)
      .filter(year => year && !isNaN(year))
      .map(year => parseInt(year));
    
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Top countries by accidents
    const countryCounts = {};
    accidentData.forEach(accident => {
      const country = accident['Operator Country'];
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });
    const topCountries = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => ({ label: country, value: count }));

    // Top aircraft types by accidents
    const aircraftCounts = {};
    accidentData.forEach(accident => {
      const aircraft = accident['AC Type'];
      if (aircraft) {
        aircraftCounts[aircraft] = (aircraftCounts[aircraft] || 0) + 1;
      }
    });
    const topAircraft = Object.entries(aircraftCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([aircraft, count]) => ({ label: aircraft, value: count }));

    // Top operators by accidents
    const operatorCounts = {};
    accidentData.forEach(accident => {
      const operator = accident.Operator;
      if (operator) {
        operatorCounts[operator] = (operatorCounts[operator] || 0) + 1;
      }
    });
    const topOperators = Object.entries(operatorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([operator, count]) => ({ label: operator, value: count }));

    return {
      totalAccidents,
      totalFatalities,
      peakYear,
      minYear,
      maxYear,
      topCountries,
      topAircraft,
      topOperators
    };
  }, [accidentData]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SidePanel />
      <div className="flex-1 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aviation Safety Dashboard</h1>
          <p className="text-gray-600">Comprehensive analysis of aviation accident data and safety metrics</p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={AlertTriangle}
            title="Total Accidents"
            value={loading ? "" : processedStats?.totalAccidents?.toLocaleString()}
            subtitle={processedStats && `${processedStats.minYear} - ${processedStats.maxYear}`}
            color="red"
            loading={loading}
          />
          <StatsCard
            icon={Users}
            title="Total Fatalities"
            value={loading ? "" : processedStats?.totalFatalities?.toLocaleString()}
            subtitle="All recorded incidents"
            color="orange"
            loading={loading}
          />
          <StatsCard
            icon={Calendar}
            title="Peak Year"
            value={loading ? "" : processedStats?.peakYear?.year}
            subtitle={processedStats && `${processedStats.peakYear.count} accidents`}
            color="purple"
            loading={loading}
          />
          <StatsCard
            icon={Shield}
            title="Data Range"
            value={loading ? "" : processedStats && `${processedStats.maxYear - processedStats.minYear + 1} years`}
            subtitle={processedStats && `${processedStats.minYear} - ${processedStats.maxYear}`}
            color="blue"
            loading={loading}
          />
        </div>

        {/* Charts Grid */}
        {/* Timeline Chart - Full Width */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Accidents Over Time</h3>
          </div>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <TimelineChart data={accidentData} />
            )}
          </div>
        </div>

        {/* Time of Day Chart - Full Width */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg">Accidents by Time of Day</h3>
          </div>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <TimeOfDayChart data={accidentData} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Severity Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-lg">Accident Severity Distribution</h3>
            </div>
            <div className="h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
              ) : (
                <AccidentSeverityChart data={accidentData} />
              )}
            </div>
          </div>

          {/* Survival Rate Gauge */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-lg">Overall Survival Rate</h3>
            </div>
            <div className="h-80 flex items-center justify-center">
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : (
                <SurvivalRateGauge data={accidentData} />
              )}
            </div>
          </div>
        </div>

        {/* Top Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopListCard
            title="Top Countries by Accidents"
            items={processedStats?.topCountries || []}
            icon={MapPin}
            color="blue"
            loading={loading}
          />
          <TopListCard
            title="Top Aircraft Types"
            items={processedStats?.topAircraft || []}
            icon={Plane}
            color="green"
            loading={loading}
          />
          <TopListCard
            title="Top Operators"
            items={processedStats?.topOperators || []}
            icon={Users}
            color="gray"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralInfo;