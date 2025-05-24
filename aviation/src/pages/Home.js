import React, { useState, useEffect, useRef } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";

const Home = () => {
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [clusterList, setClusterList] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const scatterplotRef = useRef(null);
  const scatterplotContainerRef = useRef(null);
  const distributionChartRef = useRef(null);
  
  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/cluster-data');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setClusterData(data);
        
        // Initialize cluster list for selection
        if (data.kmeans && data.kmeans.clusters) {
          const clusters = data.kmeans.clusters.sort((a, b) => a.id - b.id);
          setClusterList(clusters);
          // Initially select all clusters
          setSelectedClusters(clusters.map(cluster => cluster.id));
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching cluster data:", err);
        setError("Failed to load clustering data. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchClusterData();
  }, []);
  
  useEffect(() => {
    if (clusterData && !loading) {
      // Add a small delay to ensure the container has rendered
      setTimeout(() => {
        renderScatterplot();
        renderDistributionChart();
      }, 100);
    }
  }, [clusterData, loading, selectedClusters]);
  
  const renderScatterplot = () => {
    if (!scatterplotRef.current || !clusterData || !clusterData.points) {
      return;
    }
    
    // Clear any existing SVG
    d3.select(scatterplotRef.current).selectAll("*").remove();
    
    // Filter points based on selected clusters for scatterplot only
    const filteredPoints = clusterData.points.filter(point => 
      selectedClusters.includes(point.kmeans_cluster)
    );
    
    // Get the container dimensions dynamically
    const container = scatterplotRef.current.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate responsive dimensions
    const width = Math.max(containerWidth - 20, 600); // Min width of 600px
    const height = Math.max(containerHeight - 20, 400); // Min height of 400px
    const margin = { top: 50, right: 180, bottom: 80, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG with border
    const svg = d3.select(scatterplotRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("border", "2px solid #d1d5db")
      .style("border-radius", "8px")
      .style("background-color", "#ffffff");
    
    // Add title to SVG
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Clustering by accidents for aircraft crash summaries");
    
    // Main chart area group with margins
    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales - use full data extent for consistent positioning across selections
    const allPoints = clusterData.points;
    const xExtent = d3.extent(allPoints, d => d.x);
    const yExtent = d3.extent(allPoints, d => d.y);
    
    const x = d3.scaleLinear()
      .domain([xExtent[0] - 0.1, xExtent[1] + 0.1])
      .range([0, innerWidth]);
      
    const y = d3.scaleLinear()
      .domain([yExtent[0] - 0.1, yExtent[1] + 0.1])
      .range([innerHeight, 0]);
    
    // Create color scale for clusters
    const clusterIds = [...new Set(allPoints.map(d => d.kmeans_cluster))];
    const color = d3.scaleOrdinal()
      .domain(clusterIds)
      .range(d3.schemeCategory10);
    
    // Add clip path to ensure points don't render outside the chart area during zoom
    chartArea.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);
    
    // Create a group for the plot area that will be clipped
    const plotArea = chartArea.append("g")
      .attr("clip-path", "url(#clip)");
    
    // Create a group for the points that will be zoomed
    const pointsGroup = plotArea.append("g");
    
    // Create tooltip
    let tooltip = d3.select("body").select(".scatterplot-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "scatterplot-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("box-shadow", "0 2px 10px rgba(0,0,0,0.2)")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("max-width", "300px")
        .style("font-size", "12px")
        .style("z-index", "1000");
    }
    
    // Calculate responsive dot size based on container size
    const dotSize = Math.max(3, Math.min(8, width / 150));
    const hoverSize = dotSize * 1.5;
    
    // Add dots - now using filtered points
    pointsGroup.selectAll(".dot")
      .data(filteredPoints)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r", dotSize)
      .style("fill", d => color(d.kmeans_cluster))
      .style("opacity", 0.7)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", hoverSize)
          .style("opacity", 1);
          
        tooltip
          .html(`<strong>Cluster:</strong> ${d.kmeans_cluster}<br>
                 <strong>Category:</strong> ${d.kmeans_interpretation || 'Unknown'}<br>
                 <strong>Summary:</strong> ${d.summary ? d.summary.substring(0, 150) + (d.summary.length > 150 ? '...' : '') : 'No summary available'}`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", dotSize)
          .style("opacity", 0.7);
          
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        // Set the selected point
        setSelectedPoint(d);
        
        // Visual feedback for clicked point
        pointsGroup.selectAll(".dot").style("stroke", "none").style("stroke-width", 0);
        d3.select(this).style("stroke", "#000").style("stroke-width", 2);
      });
      
    // Add legend with scrollable container for all clusters
    const legendContainer = svg.append("foreignObject")
      .attr("x", width - margin.right + 10)
      .attr("y", margin.top)
      .attr("width", 160)
      .attr("height", Math.min(300, innerHeight));
      
    const legendDiv = legendContainer.append("xhtml:div")
      .style("width", "100%")
      .style("height", "100%")
      .style("overflow-y", "auto")
      .style("background", "rgba(255, 255, 255, 0.9)")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("padding", "8px");
      
    legendDiv.append("xhtml:div")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("margin-bottom", "8px")
      .text("All Clusters:");
      
    // Show ALL clusters in the legend, not just selected ones
    const allClusters = clusterList.sort((a, b) => a.id - b.id);
    
    allClusters.forEach((cluster, i) => {
      const legendItem = legendDiv.append("xhtml:div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "4px")
        .style("opacity", selectedClusters.includes(cluster.id) ? "1" : "0.4");
        
      legendItem.append("xhtml:div")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("background-color", color(cluster.id))
        .style("margin-right", "6px")
        .style("flex-shrink", "0");
        
      legendItem.append("xhtml:div")
        .style("font-size", "10px")
        .style("line-height", "1.2")
        .text(`${cluster.id}: ${cluster.interpretation ? cluster.interpretation.substring(0, 15) + (cluster.interpretation.length > 15 ? '...' : '') : 'Unknown'}`);
    });
    
    // Display the count of visible points
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(`Showing ${filteredPoints.length} of ${allPoints.length} data points`);
    
    // Define zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("zoom", (event) => {
        const transform = event.transform;
        pointsGroup.attr("transform", transform);
      });
    
    // Add zoom behavior to the SVG
    svg.call(zoom);
    
    // Add zoom controls
    const zoomControls = svg.append("g")
      .attr("transform", `translate(${margin.left + 10}, ${height - margin.bottom + 25})`);
    
    // Zoom control panel background
    zoomControls.append("rect")
      .attr("x", -5)
      .attr("y", -5)
      .attr("width", 125)
      .attr("height", 40)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#ccc")
      .attr("rx", 4)
      .attr("opacity", 0.7);
      
    // Zoom in button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#e0e0e0")
      .attr("stroke", "#ccc")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
      });
      
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("user-select", "none")
      .text("+")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.5);
      });
      
    // Zoom out button
    zoomControls.append("rect")
      .attr("x", 40)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#e0e0e0")
      .attr("stroke", "#ccc")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.75);
      });
      
    zoomControls.append("text")
      .attr("x", 55)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("user-select", "none")
      .text("-")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.75);
      });
      
    // Reset zoom button
    zoomControls.append("rect")
      .attr("x", 80)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#e0e0e0")
      .attr("stroke", "#ccc")
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });
      
    zoomControls.append("text")
      .attr("x", 95)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("user-select", "none")
      .text("Reset")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });
      
    // Add "Zoom Controls" label
    zoomControls.append("text")
      .attr("x", -5)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .text("Zoom Controls:");
  };
  
  const renderDistributionChart = () => {
    if (!distributionChartRef.current || !clusterData || !clusterData.kmeans || !clusterData.kmeans.distribution) {
      return;
    }
    
    // Clear any existing SVG
    d3.select(distributionChartRef.current).selectAll("*").remove();
    
    const distribution = clusterData.kmeans.distribution;
    
    // Get cluster data and create enhanced dataset - SHOW ALL CLUSTERS
    const clusters = clusterData.kmeans.clusters || [];
    const enhancedData = clusters.map(cluster => ({
      id: cluster.id,
      interpretation: cluster.interpretation || 'Unknown',
      count: distribution[cluster.interpretation] || 0,
      size: cluster.size || 0,
      isSelected: selectedClusters.includes(cluster.id),
      terms: cluster.terms || []
    })).sort((a, b) => a.id - b.id); // Sort by cluster ID
    
    // Calculate totals for subtitle
    const selectedData = enhancedData.filter(d => d.isSelected);
    const selectedTotalCount = selectedData.reduce((sum, d) => sum + d.count, 0);
    const allTotalCount = enhancedData.reduce((sum, d) => sum + d.count, 0);
    const selectedClustersCount = selectedData.length;
    const totalClustersCount = enhancedData.length;
    
    // Get responsive dimensions
    const container = distributionChartRef.current.parentElement;
    const containerWidth = container.clientWidth;
    const width = Math.max(containerWidth - 40, 800);
    const height = 500;
    const margin = { top: 60, right: 30, bottom: 140, left: 80 };
    
    // Create main SVG
    const svg = d3.select(distributionChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("border", "2px solid #d1d5db")
      .style("border-radius", "8px")
      .style("background-color", "#ffffff");
    
    // Check if no data exists
    if (enhancedData.length === 0) {
      // Show message for no data
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#666")
        .text("No cluster data available");
      
      return;
    }
    
    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Create same color scale as scatterplot
    const clusterIds = [...new Set(clusterData.points.map(d => d.kmeans_cluster))];
    const color = d3.scaleOrdinal()
      .domain(clusterIds)
      .range(d3.schemeCategory10);
    
    // Set up scales - use count values for Y axis
    const x = d3.scaleBand()
      .domain(enhancedData.map(d => d.id))
      .range([0, width - margin.left - margin.right])
      .padding(0.3);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(enhancedData, d => d.count) * 1.1 || 1])
      .range([height - margin.top - margin.bottom, 0]);
    
    // Add X axis with enhanced styling
    const xAxis = chartArea.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);
      
    xAxis.selectAll(".tick")
      .data(enhancedData)
      .enter()
      .append("g")
      .attr("class", "tick")
      .attr("transform", d => `translate(${x(d.id) + x.bandwidth()/2}, 0)`)
      .style("opacity", d => d.isSelected ? 1 : 0.4) // Gray out unselected cluster labels
      .each(function(d) {
        const tick = d3.select(this);
        
        // Add tick line
        tick.append("line")
          .attr("y1", 0)
          .attr("y2", 6)
          .attr("stroke", "#666")
          .attr("stroke-width", 1);
        
        // Add cluster number
        tick.append("text")
          .attr("y", 20)
          .attr("text-anchor", "middle")
          .style("fill", "#333")
          .style("font-size", "14px")
          .style("font-weight", d.isSelected ? "bold" : "normal")
          .text(`#${d.id}`);
        
        // Add category name (wrapped)
        const words = d.interpretation.split(' ');
        const maxWidth = x.bandwidth();
        let line = [];
        let lineNumber = 0;
        const lineHeight = 12;
        
        words.forEach(word => {
          const testLine = [...line, word].join(' ');
          if (testLine.length * 6 > maxWidth && line.length > 0) {
            tick.append("text")
              .attr("y", 35 + lineNumber * lineHeight)
              .attr("text-anchor", "middle")
              .style("fill", "#666")
              .style("font-size", "10px")
              .text(line.join(' '));
            line = [word];
            lineNumber++;
          } else {
            line.push(word);
          }
        });
        
        if (line.length > 0) {
          tick.append("text")
            .attr("y", 35 + lineNumber * lineHeight)
            .attr("text-anchor", "middle")
            .style("fill", "#666")
            .style("font-size", "10px")
            .text(line.join(' '));
        }
      });
    
    // Add Y axis with enhanced styling - show count values
    const yAxis = chartArea.append("g")
      .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format("d")))
      .style("color", "#333");
      
    yAxis.selectAll("line")
      .style("stroke", "#ccc")
      .style("stroke-width", 1);
      
    yAxis.selectAll("text")
      .style("fill", "#333")
      .style("font-size", "12px");
      
    // Add Y axis label
    yAxis.append("text")
      .attr("fill", "#333")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Number of Incidents");
    
    // Create tooltip without background
    let tooltip = d3.select("body").select(".distribution-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "distribution-tooltip")
        .style("position", "absolute")
        .style("color", "black")
        .style("padding", "12px")
        .style("border-radius", "6px")
        .style("background-color", "white")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("max-width", "300px")
        .style("font-size", "12px")
        .style("z-index", "1000");
    }
    
    // Add bars with animations and interactions - FOR ALL CLUSTERS
    const bars = chartArea.selectAll(".bar")
      .data(enhancedData)
      .enter()
      .append("g")
      .attr("class", "bar")
      .style("cursor", "pointer");
    
    // Add background bars for animation effect
    bars.append("rect")
      .attr("class", "bar-bg")
      .attr("x", d => x(d.id))
      .attr("y", 0)
      .attr("width", x.bandwidth())
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "rgba(255,255,255,0.05)");
    
    // Add main bars - with conditional styling for selected/unselected
    const mainBars = bars.append("rect")
      .attr("class", "bar-main")
      .attr("x", d => x(d.id))
      .attr("y", height - margin.top - margin.bottom)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", d => d.isSelected ? color(d.id) : "#d1d5db") // Gray for unselected
      .style("opacity", d => d.isSelected ? 1 : 0.5) // More transparent for unselected
      .style("filter", d => d.isSelected ? "url(#glow)" : "none"); // No glow for unselected
    
    // Animate bars
    mainBars.transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .ease(d3.easeBounceOut)
      .attr("y", d => y(d.count))
      .attr("height", d => height - margin.top - margin.bottom - y(d.count));
    
    // Add count labels on bars - show percentage on top, only for selected clusters
    const labels = bars.append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.id) + x.bandwidth() / 2)
      .attr("y", d => y(d.count) - 10)
      .attr("text-anchor", "middle")
      .style("fill", d => d.isSelected ? "#333" : "#999")
      .style("font-size", "12px")
      .style("font-weight", d => d.isSelected ? "bold" : "normal")
      .style("opacity", 0)
      .text(d => {
        if (d.isSelected && selectedTotalCount > 0) {
          const percentage = (d.count / selectedTotalCount * 100);
          return `${percentage.toFixed(1)}%`;
        } else if (!d.isSelected && allTotalCount > 0) {
          const percentage = (d.count / allTotalCount * 100);
          return `${percentage.toFixed(1)}%`;
        }
        return '';
      });
    
    // Animate labels
    labels.transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 500)
      .style("opacity", d => d.isSelected ? 1 : 0.6);
    
    // Add hover interactions - disabled during initial animation
    let animationComplete = false;
    
    // Enable interactions after animation completes
    setTimeout(() => {
      animationComplete = true;
    }, 1000 + (enhancedData.length * 100) + 200); // Animation duration + delays + buffer
    
    bars.on("mouseover", function(event, d) {
      if (!animationComplete) return; // Prevent hover during animation
      
      // Highlight bar with slight opacity change
      d3.select(this).select(".bar-main")
        .transition()
        .duration(200)
        .style("opacity", d.isSelected ? 0.8 : 0.7);
      
      // Show tooltip
      const topTerms = d.terms.slice(0, 5).map(term => 
        typeof term === 'object' ? term.term : term
      ).join(', ');
      
      // Calculate percentage based on context (selected vs all)
      const contextPercentage = d.isSelected && selectedTotalCount > 0 
        ? (d.count / selectedTotalCount * 100).toFixed(1)
        : allTotalCount > 0 
        ? (d.count / allTotalCount * 100).toFixed(1)
        : '0.0';
      
      tooltip
        .html(`
          <div style="margin-bottom: 8px;">
            <strong>Cluster ${d.id}:</strong> ${d.interpretation}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Status:</strong> ${d.isSelected ? 'Selected' : 'Unselected'}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Incidents:</strong> ${d.count} (${contextPercentage}%)
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Cluster Size:</strong> ${d.size} points
          </div>
          ${topTerms ? `<div style="margin-bottom: 6px;">
            <strong>Key Terms:</strong> ${topTerms}
          </div>` : ''}
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.3); font-size: 11px;">
            Click to ${d.isSelected ? 'deselect' : 'select'}
          </div>
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("opacity", 1);
    })
    .on("mouseout", function(event, d) {
      if (!animationComplete) return; // Prevent hover during animation
      
      // Reset bar
      d3.select(this).select(".bar-main")
        .transition()
        .duration(200)
        .style("opacity", d.isSelected ? 1 : 0.5);
      
      // Hide tooltip
      tooltip.style("opacity", 0);
    })
    .on("click", function(event, d) {
      if (!animationComplete) return; // Prevent clicks during animation
      
      // Toggle cluster selection
      handleClusterToggle(d.id);
      
      // Add subtle click feedback
      d3.select(this).select(".bar-main")
        .transition()
        .duration(150)
        .style("opacity", 0.6)
        .transition()
        .duration(150)
        .style("opacity", d.isSelected ? 1 : 0.5);
    });
    
    // Add control buttons
    const buttonGroup = svg.append("g")
      .attr("class", "control-buttons")
      .attr("transform", `translate(${width - 200}, 15)`);
    
    // Select All button
    const selectAllButton = buttonGroup.append("g")
      .attr("class", "select-all-btn")
      .style("cursor", "pointer")
      .style("opacity", 0);

    const selectAllRect = selectAllButton.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 85)
      .attr("height", 25)
      .attr("rx", 4)
      .attr("fill", "#dbeafe")  // Tailwind bg-blue-100
      .attr("stroke", "#bfdbfe") // Slight blue border
      .attr("stroke-width", 1);

    selectAllButton.append("text")
      .attr("x", 42.5)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("fill", "#1e40af")  // Tailwind text-blue-800
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .text("Select All");

    selectAllButton
      .on("mouseover", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("fill", "#bfdbfe"); // Tailwind hover:bg-blue-200
      })
      .on("mouseout", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("fill", "#dbeafe"); // Tailwind bg-blue-100
      })
      .on("click", function(event) {
        event.stopPropagation();
        const allClusterIds = enhancedData.map(d => d.id);
        if (typeof handleSelectAllClusters === 'function') {
          handleSelectAllClusters(allClusterIds);
        } else {
          allClusterIds.forEach(id => {
            if (!selectedClusters.includes(id)) {
              handleClusterToggle(id);
            }
          });
        }

        // Visual feedback on click
        d3.select(this).select("rect")
          .transition()
          .duration(150)
          .attr("fill", "#93c5fd") // Optional deeper blue for click feedback
          .transition()
          .duration(150)
          .attr("fill", "#bfdbfe"); // Back to hover blue
      });


    
    // Deselect All / Clear All button
    const deselectAllButton = buttonGroup.append("g")
      .attr("class", "deselect-all-btn")
      .attr("transform", "translate(95, 0)")
      .style("cursor", "pointer")
      .style("opacity", 0);

    const deselectAllRect = deselectAllButton.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 85)
      .attr("height", 25)
      .attr("rx", 4)
      .attr("fill", "#f3f4f6")  // Tailwind bg-gray-100
      .attr("stroke", "#e5e7eb") // Light border (gray-200)
      .attr("stroke-width", 1);

    deselectAllButton.append("text")
      .attr("x", 42.5)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("fill", "#1f2937")  // Tailwind text-gray-800
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .text("Clear All");

    deselectAllButton
      .on("mouseover", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("fill", "#e5e7eb"); // Tailwind hover:bg-gray-200
      })
      .on("mouseout", function() {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("fill", "#f3f4f6"); // Tailwind bg-gray-100
      })
      .on("click", function(event) {
        event.stopPropagation();
        if (typeof handleDeselectAllClusters === 'function') {
          handleDeselectAllClusters();
        } else {
          [...selectedClusters].forEach(id => {
            handleClusterToggle(id);
          });
        }

        // Visual feedback
        d3.select(this).select("rect")
          .transition()
          .duration(150)
          .attr("fill", "#d1d5db") // darker gray for click
          .transition()
          .duration(150)
          .attr("fill", "#e5e7eb"); // back to hover gray
      });

    
    // Animate buttons
    selectAllButton.transition()
      .duration(800)
      .delay(600)
      .style("opacity", 1);
      
    deselectAllButton.transition()
      .duration(800)
      .delay(700)
      .style("opacity", 1);

    // Add title with animation
    const title = svg.append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("opacity", 0)
      .text("Cluster Distribution (Selected vs All Clusters)");
    
    title.transition()
      .duration(1000)
      .delay(500)
      .style("opacity", 1);
    
    // Add updated subtitle with proper variable calculations
    const subtitle = svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .style("opacity", 0)
      .text(() => {
        if (selectedClustersCount === 0) {
          return `No clusters selected - Showing all ${totalClustersCount} clusters (${allTotalCount} total incidents)`;
        } else if (selectedClustersCount === totalClustersCount) {
          return `All ${totalClustersCount} clusters selected (${allTotalCount} total incidents)`;
        } else {
          const selectedPercentage = allTotalCount > 0 ? (selectedTotalCount/allTotalCount*100).toFixed(1) : '0.0';
          return `${selectedClustersCount} of ${totalClustersCount} clusters selected (${selectedTotalCount} of ${allTotalCount} incidents - ${selectedPercentage}%)`;
        }
      });
    
    subtitle.transition()
      .duration(1000)
      .delay(700)
      .style("opacity", 1);
  };
  
  // Handle cluster selection
  const handleClusterToggle = (clusterId) => {
    setSelectedClusters(prev => {
      if (prev.includes(clusterId)) {
        return prev.filter(id => id !== clusterId);
      } else {
        return [...prev, clusterId];
      }
    });
  };

  const handleSelectAllClusters = (allIds) => {
    setSelectedClusters(allIds);
  };

  const handleDeselectAllClusters = () => {
    setSelectedClusters([]);
  };
  
  // Select all clusters - maintain numerical order
  const selectAllClusters = () => {
    const sortedClusterIds = clusterList
      .map(cluster => cluster.id)
      .sort((a, b) => a - b);
    setSelectedClusters(sortedClusterIds);
  };
  
  // Clear all selections
  const clearAllClusters = () => {
    setSelectedClusters([]);
    setSelectedPoint(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <SidePanel />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-bold mb-6">Aircraft Crash Analysis Dashboard</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="space-y-8">
              {clusterData && clusterData.points ? (
                <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-200px)]">
                  <div className="p-6 pb-4">
                    <h2 className="text-xl font-semibold mb-4">Accident Cluster Visualization</h2>
                  </div>
                  
                  {/* Responsive layout: Left panel for controls, Right side for graph */}
                  <div className="flex flex-1 px-6 pb-6 gap-6 min-h-0" ref={scatterplotContainerRef}>
                    {/* Left Panel - Cluster Selection and Point Details - Fixed width */}
                    <div className="w-80 shrink-0 flex flex-col min-h-0">
                      <div className="space-y-4 flex flex-col h-full">
                        {/* Cluster Selection Panel */}
                        <div className="shrink-0">
                          <div className="flex flex-col mb-4">
                            <h3 className="font-medium mb-2">Select Clusters to Display</h3>
                            <div className="flex space-x-2 mb-3">
                              <button 
                                onClick={selectAllClusters}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-3 py-1.5 rounded"
                              >
                                Select All
                              </button>
                              <button 
                                onClick={clearAllClusters}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          
                          <div className="max-h-[200px] overflow-y-auto p-3 border rounded bg-gray-50">
                            {clusterList
                              .sort((a, b) => a.id - b.id)
                              .map(cluster => (
                              <div key={cluster.id} className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  id={`cluster-${cluster.id}`}
                                  checked={selectedClusters.includes(cluster.id)}
                                  onChange={() => handleClusterToggle(cluster.id)}
                                  className="mr-2"
                                />
                                <label htmlFor={`cluster-${cluster.id}`} className="text-sm">
                                  Cluster {cluster.id}: {cluster.interpretation || 'Unknown'}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Selected Point Details Panel - Flexible height */}
                        <div className="flex-1 min-h-0">
                          {selectedPoint ? (
                            <div className="border rounded-lg p-4 bg-gray-50 h-full overflow-y-auto">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-medium text-sm">Point Details</h3>
                                <button 
                                  onClick={() => setSelectedPoint(null)}
                                  className="text-gray-400 hover:text-gray-600 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                              
                              <div className="space-y-3 text-xs">
                                <div>
                                  <span className="font-medium">Cluster:</span> {selectedPoint.kmeans_cluster}
                                </div>
                                
                                {selectedPoint.kmeans_interpretation && (
                                  <div>
                                    <span className="font-medium">Category:</span> 
                                    <span className="block mt-1 text-gray-600">
                                      {selectedPoint.kmeans_interpretation}
                                    </span>
                                  </div>
                                )}
                                
                                {selectedPoint.summary && (
                                  <div>
                                    <span className="font-medium">Summary:</span>
                                    <p className="mt-1 text-gray-600 leading-relaxed">
                                      {selectedPoint.summary}
                                    </p>
                                  </div>
                                )}
                                
                                {selectedPoint.date && (
                                  <div>
                                    <span className="font-medium">Date:</span> {selectedPoint.date}
                                  </div>
                                )}
                                
                                {selectedPoint.location && (
                                  <div>
                                    <span className="font-medium">Location:</span> {selectedPoint.location}
                                  </div>
                                )}
                                
                                {selectedPoint.aircraft_type && (
                                  <div>
                                    <span className="font-medium">Aircraft:</span> {selectedPoint.aircraft_type}
                                  </div>
                                )}
                                
                                {selectedPoint.fatalities !== undefined && (
                                  <div>
                                    <span className="font-medium">Fatalities:</span> {selectedPoint.fatalities}
                                  </div>
                                )}
                                
                                <div className="pt-2 border-t border-gray-200">
                                  <span className="font-medium">Coordinates:</span> 
                                  <span className="text-gray-600">
                                    ({selectedPoint.x?.toFixed(3)}, {selectedPoint.y?.toFixed(3)})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border rounded-lg p-4 bg-gray-50 h-full flex items-center justify-center">
                              <p className="text-gray-500 text-sm text-center">
                                Click on a point in the graph to view details
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Responsive Scatterplot container */}
                    <div className="flex-1 min-h-0">
                      <div 
                        ref={scatterplotRef} 
                        className="w-full h-full"
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  Missing points data for visualization
                </div>
              )}
              
              {clusterData && clusterData.kmeans && clusterData.kmeans.distribution ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">Crash Cause Distribution</h2>
                  <div 
                    ref={distributionChartRef}
                    className="w-full" 
                  ></div>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  Missing distribution data for visualization
                </div>
              )}
              
              {clusterData && clusterData.kmeans && clusterData.kmeans.clusters ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">Top Clusters</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusterData.kmeans.clusters
                      .sort((a, b) => b.size - a.size)
                      .slice(0, 6)
                      .map(cluster => (
                        <div 
                          key={cluster.id} 
                          className={`border rounded-lg p-4 ${selectedClusters.includes(cluster.id) ? 'border-blue-500' : 'border-gray-200'}`}
                        >
                          <h3 className="font-medium text-lg">Cluster {cluster.id}: {cluster.interpretation}</h3>
                          <p className="text-sm text-gray-600 mt-1">Size: {cluster.size} incidents</p>
                          {cluster.terms && (
                            <div className="mt-3">
                              <h4 className="font-medium">Top Terms:</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cluster.terms.slice(0, 8).map((term, i) => (
                                  <span 
                                    key={i} 
                                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                  >
                                    {typeof term === 'object' ? term.term : term}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {cluster.samples && cluster.samples.length > 0 && (
                            <div className="mt-3">
                              <h4 className="font-medium">Sample incident:</h4>
                              <p className="text-sm mt-1 text-gray-700 italic line-clamp-3">
                                {cluster.samples[0]}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  Missing cluster data
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;