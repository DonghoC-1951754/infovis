import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CountryClusterDistribution = ({ clusterData }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [countryData, setCountryData] = useState({});
  const [otherCategoriesData, setOtherCategoriesData] = useState({});
  const pieChartRef = useRef(null);

  useEffect(() => {
    if (clusterData && clusterData.points) {
      // Extract unique countries and their data, excluding "Unknown"
      const countryMap = {};
      const clusterToInterpretationMap = {};
      
      clusterData.points.forEach(point => {
        const country = point.operator_country || 'Unknown';
        // Skip "Unknown" countries
        if (country === 'Unknown') return;
        
        if (!countryMap[country]) {
          countryMap[country] = {};
        }
        
        const clusterId = point.kmeans_cluster;
        const interpretation = point.kmeans_interpretation || 'Unknown';
        
        // Store mapping from cluster ID to interpretation
        clusterToInterpretationMap[clusterId] = interpretation;
        
        // Use cluster ID as key to maintain color consistency
        countryMap[country][clusterId] = (countryMap[country][clusterId] || 0) + 1;
      });

      // Sort countries by total accidents (descending)
      const sortedCountries = Object.keys(countryMap)
        .map(country => ({
          country,
          total: Object.values(countryMap[country]).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(item => item.country);

      setCountries(sortedCountries);
      setCountryData(countryMap);
      
      // Set default to country with most accidents
      if (sortedCountries.length > 0 && !selectedCountry) {
        setSelectedCountry(sortedCountries[0]);
      }
    }
  }, [clusterData]);

  useEffect(() => {
    if (selectedCountry && countryData[selectedCountry]) {
      renderPieChart();
    }
  }, [selectedCountry, countryData]);

  // Get color scale that matches the home.js legend
  const getClusterColor = () => {
    if (!clusterData || !clusterData.points) return d3.scaleOrdinal(d3.schemeCategory10);
    
    const allPoints = clusterData.points;
    const clusterIds = [...new Set(allPoints.map(d => d.kmeans_cluster))];
    return d3.scaleOrdinal()
      .domain(clusterIds)
      .range(d3.schemeCategory10);
  };

  const getClusterInterpretation = (clusterId) => {
    if (!clusterData || !clusterData.points) return 'Unknown';
    
    const point = clusterData.points.find(p => p.kmeans_cluster === clusterId);
    return point ? (point.kmeans_interpretation || 'Unknown') : 'Unknown';
  };

  const processDataForPieChart = (data) => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    const entries = Object.entries(data).map(([clusterId, count]) => ({
      clusterId: parseInt(clusterId),
      category: getClusterInterpretation(parseInt(clusterId)),
      count,
      percentage: (count / total) * 100
    }));

    // Separate categories above and below 1.5% threshold
    const mainCategories = entries.filter(entry => entry.percentage >= 1.5);
    const smallCategories = entries.filter(entry => entry.percentage < 1.5);

    let processedData = [...mainCategories];
    let otherData = {};

    if (smallCategories.length > 0) {
      const otherCount = smallCategories.reduce((sum, entry) => sum + entry.count, 0);
      const otherPercentage = (otherCount / total) * 100;
      
      processedData.push({
        clusterId: 'other',
        category: 'Other',
        count: otherCount,
        percentage: otherPercentage,
        isOther: true
      });

      // Store the breakdown of "Other" categories
      otherData = smallCategories.reduce((acc, entry) => {
        acc[entry.category] = { count: entry.count, clusterId: entry.clusterId };
        return acc;
      }, {});
    }

    return { processedData, otherData };
  };

  const renderPieChart = () => {
    if (!pieChartRef.current || !countryData[selectedCountry]) return;

    // Clear existing chart
    d3.select(pieChartRef.current).selectAll("*").remove();

    const data = countryData[selectedCountry];
    const { processedData, otherData } = processDataForPieChart(data);
    
    // Store other categories data for tooltips and legend
    setOtherCategoriesData(otherData);

    // Chart dimensions
    const width = 500;
    const height = 400;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    // Create SVG
    const svg = d3.select(pieChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Use the same color scale as home.js
    const color = getClusterColor();

    // Pie generator
    const pie = d3.pie()
      .value(d => d.count)
      .sort(null);

    // Arc generator
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Create tooltip
    let tooltip = d3.select("body").select(".pie-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "pie-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", "1000")
        .style("max-width", "250px");
    }

    // Create pie slices
    const slices = g.selectAll(".slice")
      .data(pie(processedData))
      .enter()
      .append("g")
      .attr("class", "slice");

    slices.append("path")
      .attr("d", arc)
      .attr("fill", d => {
        if (d.data.isOther) {
          return "#cccccc"; // Gray color for "Other"
        }
        // Use cluster ID to get the correct color from home.js color scale
        return color(d.data.clusterId);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", function() {
            const centroid = arc.centroid(d);
            return `translate(${centroid[0] * 0.1}, ${centroid[1] * 0.1})`;
          });

        let tooltipContent;
        if (d.data.isOther) {
          const total = Object.values(data).reduce((sum, count) => sum + count, 0);
          const otherBreakdown = Object.entries(otherData)
            .map(([cat, info]) => {
              const percentage = ((info.count / total) * 100).toFixed(1);
              return `${cat}: ${info.count} (${percentage}%)`;
            })
            .join('<br>');
          tooltipContent = `<strong>Other Categories</strong><br>
                          Total Count: ${d.data.count} (${d.data.percentage.toFixed(1)}%)<br>
                          <br><strong>Breakdown:</strong><br>
                          ${otherBreakdown}`;
        } else {
          tooltipContent = `<strong>${d.data.category}</strong><br>
                           Count: ${d.data.count} (${d.data.percentage.toFixed(1)}%)`;
        }

        tooltip
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", "translate(0,0)");

        tooltip.style("opacity", 0);
      });

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Accident Types Distribution - ${selectedCountry}`);

    // Add total count
    const totalAccidents = Object.values(data).reduce((sum, count) => sum + count, 0);
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text(`Total Accidents: ${totalAccidents}`);
  };

  if (!clusterData || !clusterData.points) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No data available for country distribution
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Accident Distribution by Country</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="country-select" className="text-sm font-medium text-gray-700">
            Select Country:
          </label>
          <select
            id="country-select"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="border border-gray-300 text-sm rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {countries.map(country => (
              <option key={country} value={country}>
                {country} ({Object.values(countryData[country] || {}).reduce((sum, count) => sum + count, 0)} accidents)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-center">
        <div ref={pieChartRef} className="w-full max-w-md"></div>
      </div>

      {/* Legend */}
      {selectedCountry && countryData[selectedCountry] && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Distribution Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(() => {
              const { processedData } = processDataForPieChart(countryData[selectedCountry]);
              const color = getClusterColor();
              
              return processedData
                .sort((a, b) => b.count - a.count)
                .map((item) => {
                  const displayColor = item.isOther ? "#cccccc" : color(item.clusterId);
                  
                  return (
                    <div key={item.clusterId} className="flex items-center space-x-2 text-sm">
                      <div 
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: displayColor }}
                      ></div>
                      <span className="truncate" title={item.category}>
                        {item.category}: {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  );
                });
            })()}
          </div>
          
          {/* Show breakdown of "Other" categories */}
          {Object.keys(otherCategoriesData).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-0.5">"Other" Categories Breakdown:</h4>
              <p className="text-xs text-gray-500 mb-2 italic">Consists of  all categories contributing less than 1.5% each.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                {(() => {
                  const color = getClusterColor();
                  return Object.entries(otherCategoriesData)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .map(([category, info]) => {
                      const total = Object.values(countryData[selectedCountry]).reduce((sum, c) => sum + c, 0);
                      const percentage = ((info.count / total) * 100).toFixed(1);
                      const categoryColor = color(info.clusterId);
                      return (
                        <div key={category} className="flex items-center space-x-2">
                            <div 
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: categoryColor }}
                            ></div>
                            <span className="truncate">
                                {category}: {info.count} ({percentage}%)
                            </span>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountryClusterDistribution;