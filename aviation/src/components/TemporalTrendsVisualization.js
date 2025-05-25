import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TemporalTrendsVisualization = ({ clusterData, selectedClusters }) => {
  const chartRef = useRef(null);
  const [viewMode, setViewMode] = useState('yearly'); 
  const [showCumulative, setShowCumulative] = useState(false);

  const sanitizeClassName = (clusterName) => {
    return clusterName
      .replace(/[^a-zA-Z0-9\s-]/g, '') 
      .replace(/\s+/g, '-') 
      .replace(/-+/g, '-') 
      .replace(/^-|-$/g, '') 
      .toLowerCase();
  };

  useEffect(() => {
    if (clusterData && clusterData.points && selectedClusters.length > 0) {
      renderTemporalChart();
    }
  }, [clusterData, selectedClusters, viewMode, showCumulative]);

  const processTemporalData = () => {
    if (!clusterData?.points) return [];

    const filteredPoints = clusterData.points.filter(point => 
      selectedClusters.includes(point.kmeans_cluster) && 
      point.Year && !isNaN(point.Year)
    );
    
    const clusterMap = {};
    if (clusterData.kmeans?.clusters) {
      clusterData.kmeans.clusters.forEach(cluster => {
        clusterMap[cluster.id] = cluster.interpretation || `Cluster ${cluster.id}`;
      });
    }

    const allYearsInDataset = clusterData.points
      .map(p => p.Year)
      .filter(year => year && !isNaN(year));
    
    const minYear = Math.min(...allYearsInDataset);
    const maxYear = Math.max(...allYearsInDataset);

    const allClusters = [...new Set(filteredPoints.map(p => 
      clusterMap[p.kmeans_cluster] || `Cluster ${p.kmeans_cluster}`
    ))];

    const groupedData = {};
    
    if (viewMode === 'yearly') {
      // Initialize all years in range with 0 values for all clusters
      for (let year = minYear; year <= maxYear; year++) {
        groupedData[year] = {};
        allClusters.forEach(cluster => {
          groupedData[year][cluster] = 0;
        });
      }
    }
    
    filteredPoints.forEach(point => {
      let timePeriod;
      
      if (viewMode === 'yearly') {
        timePeriod = point.Year;
      } else if (viewMode === 'decade') {
        timePeriod = Math.floor(point.Year / 10) * 10;
      } else if (viewMode === 'seasonal') {
        // Extract month from date if available
        if (point.Date) {
          const date = new Date(point.Date);
          const month = date.getMonth();
          if (month >= 2 && month <= 4) timePeriod = 'Spring';
          else if (month >= 5 && month <= 7) timePeriod = 'Summer';
          else if (month >= 8 && month <= 10) timePeriod = 'Fall';
          else timePeriod = 'Winter';
        } else {
          return;
        }
      }

      const clusterName = clusterMap[point.kmeans_cluster] || `Cluster ${point.kmeans_cluster}`;
      
      if (!groupedData[timePeriod]) {
        groupedData[timePeriod] = {};
        // Initialize all clusters with 0 for new time periods
        allClusters.forEach(cluster => {
          groupedData[timePeriod][cluster] = 0;
        });
      }
      
      groupedData[timePeriod][clusterName]++;
    });

    const timePoints = Object.keys(groupedData).sort((a, b) => {
      if (viewMode === 'seasonal') {
        const order = { 'Spring': 0, 'Summer': 1, 'Fall': 2, 'Winter': 3 };
        return order[a] - order[b];
      }
      return a - b;
    });

    const result = timePoints.map(timePeriod => {
      const entry = { timePeriod };
      allClusters.forEach(cluster => {
        entry[cluster] = groupedData[timePeriod][cluster] || 0;
      });
      return entry;
    });

    if (showCumulative && viewMode !== 'seasonal') {
      allClusters.forEach(cluster => {
        let cumulative = 0;
        result.forEach(entry => {
          cumulative += entry[cluster];
          entry[cluster] = cumulative;
        });
      });
    }

    return { data: result, clusters: allClusters };
  };

  const renderTemporalChart = () => {
    if (!chartRef.current) return;

    d3.select(chartRef.current).selectAll("*").remove();

    const { data, clusters } = processTemporalData();
    
    if (data.length === 0) {
      // Show no data message
      const svg = d3.select(chartRef.current)
        .append("svg")
        .attr("width", 800)
        .attr("height", 400);
        
      svg.append("text")
        .attr("x", 400)
        .attr("y", 200)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("No data available for selected clusters");
      return;
    }

    const margin = { top: 60, right: 200, bottom: 80, left: 60 };
    const containerWidth = chartRef.current.clientWidth;
    const containerHeight = 400;

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .style("border", "2px solid #d1d5db")
      .style("border-radius", "8px")
      .style("background-color", "#ffffff");

    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let xScale, xAxis;
    
    if (viewMode === 'yearly') {
      const years = data.map(d => +d.timePeriod);
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      
      xScale = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([0, width]);

      // Create custom axis with ticks for every year but labels every two years
      const allYears = [];
      for (let year = minYear; year <= maxYear; year++) {
        allYears.push(year);
      }
      
      xAxis = d3.axisBottom(xScale)
        .tickValues(allYears)
        .tickFormat((d, i) => {
          // Show label every two years
          return (d % 2 === 0) ? d : '';
        });
    } else {
      xScale = d3.scaleBand()
        .domain(data.map(d => d.timePeriod))
        .range([0, width])
        .padding(0.1);
        
      xAxis = d3.axisBottom(xScale);
    }

    const maxValue = d3.max(data, d => 
      d3.max(clusters, cluster => d[cluster])
    );

    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Get all cluster IDs from the entire dataset to maintain consistent colors
    const allClusterIds = [...new Set(clusterData.points.map(p => p.kmeans_cluster))];
    const mainColorScale = d3.scaleOrdinal()
      .domain(allClusterIds)
      .range(d3.schemeCategory10);

    // Create a mapping from cluster names to their IDs for color consistency
    const clusterNameToId = {};
    if (clusterData.kmeans?.clusters) {
      clusterData.kmeans.clusters.forEach(cluster => {
        const clusterName = cluster.interpretation || `Cluster ${cluster.id}`;
        clusterNameToId[clusterName] = cluster.id;
      });
    }

    const colorScale = (clusterName) => {
      const clusterId = clusterNameToId[clusterName];
      return clusterId !== undefined ? mainColorScale(clusterId) : '#999999';
    };

    const line = d3.line()
      .x(d => {
        if (viewMode === 'yearly') {
          return xScale(+d.timePeriod);
        } else {
          return xScale(d.timePeriod) + xScale.bandwidth() / 2;
        }
      })
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const xAxisGroup = chartArea.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    if ((viewMode === 'yearly' && data.length > 20) || (viewMode !== 'yearly' && data.length > 10)) {
      xAxisGroup.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
    }

    chartArea.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("d")));

    chartArea.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(showCumulative ? "Cumulative Accidents" : "Number of Accidents");

    const timeLabel = {
      'yearly': 'Year',
      'decade': 'Decade',
      'seasonal': 'Season'
    }[viewMode];

    chartArea.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(timeLabel);

    let tooltip = d3.select("body").select(".temporal-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "temporal-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("font-size", "12px")
        .style("z-index", "1000");
    }

    clusters.forEach(cluster => {
      const clusterData = data.map(d => ({
        timePeriod: d.timePeriod,
        value: d[cluster]
      }));

      if (clusterData.length === 0) return;

      const sanitizedClassName = sanitizeClassName(cluster);

      chartArea.append("path")
        .datum(clusterData)
        .attr("fill", "none")
        .attr("stroke", colorScale(cluster))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.8)
        .attr("d", line);

      // Draw points - but only show points where value > 0 to avoid clutter
      chartArea.selectAll(`.point-${sanitizedClassName}`)
        .data(clusterData.filter(d => d.value > 0))
        .enter()
        .append("circle")
        .attr("class", `point-${sanitizedClassName}`)
        .attr("cx", d => {
          if (viewMode === 'yearly') {
            return xScale(+d.timePeriod);
          } else {
            return xScale(d.timePeriod) + xScale.bandwidth() / 2;
          }
        })
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", colorScale(cluster))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 6);

          tooltip
            .html(`<strong>${cluster}</strong><br>
                   ${timeLabel}: ${d.timePeriod}<br>
                   ${showCumulative ? 'Cumulative ' : ''}Accidents: ${d.value}`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 4);

          tooltip.style("opacity", 0);
        });
    });

    const legend = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 20}, ${margin.top})`);

    legend.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Accident Types:");

    clusters.forEach((cluster, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendItem.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", colorScale(cluster))
        .attr("stroke-width", 3);

      legendItem.append("circle")
        .attr("cx", 7.5)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", colorScale(cluster))
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 4)
        .style("font-size", "11px")
        .text(cluster.length > 20 ? cluster.substring(0, 20) + "..." : cluster);
    });

    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`${showCumulative ? 'Cumulative ' : ''}Accident Trends by ${timeLabel}`);

    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text(`Showing ${clusters.length} accident types across ${data.length} ${timeLabel.toLowerCase()}${data.length !== 1 ? 's' : ''}`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Temporal Accident Trends</h2>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">View:</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="yearly">By Year</option>
              <option value="decade">By Decade</option>
              <option value="seasonal">By Season</option>
            </select>
          </div>
          
          {viewMode !== 'seasonal' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cumulative"
                checked={showCumulative}
                onChange={(e) => setShowCumulative(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="cumulative" className="text-sm">Cumulative</label>
            </div>
          )}
        </div>
      </div>
      
      <div ref={chartRef} className="w-full"></div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          This visualization shows how different types of accidents have evolved over time. 
          {viewMode === 'yearly' && " Each point represents accidents in a specific year. The x-axis shows the full year range with labels every two years. Lines connect through years with zero accidents."}
          {viewMode === 'decade' && " Data is grouped by decades to show longer-term trends."}
          {viewMode === 'seasonal' && " Data is grouped by seasons to reveal seasonal patterns."}
          {showCumulative && " The cumulative view shows the running total over time."}
        </p>
      </div>
    </div>
  );
};

export default TemporalTrendsVisualization;