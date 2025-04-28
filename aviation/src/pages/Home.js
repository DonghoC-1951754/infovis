import React, { useState, useEffect, useRef } from "react";
import SidePanel from "../components/Sidepanel";
import * as d3 from "d3";

const Home = () => {
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [clusterList, setClusterList] = useState([]);
  
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
      renderScatterplot();
      renderDistributionChart();
    }
  }, [clusterData, loading, selectedClusters]); // Re-render when selectedClusters changes
  
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
    
    const width = 750; // Slightly reduced to ensure better fit
    const height = 500;
    const margin = { top: 40, right: 80, bottom: 80, left: 70 }; // Increased bottom margin for zoom controls
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(scatterplotRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Add title to SVG (outside any groups)
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("K-means Clustering of Aircraft Crash Summaries");
    
    // Main chart area group with margins
    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales - use full data extent for consistent axis across selections
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
    
    // X axis - Create outside the clipped area
    const xAxisGroup = chartArea.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`);
    
    // Y axis - Create outside the clipped area
    const yAxisGroup = chartArea.append("g")
      .attr("class", "y-axis");
    
    // Initial axis creation
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    
    // Apply axes
    xAxisGroup.call(xAxis);
    yAxisGroup.call(yAxis);
    
    // Add axis labels with improved names based on aircraft crash analysis
    xAxisGroup.append("text")
      .attr("fill", "#000")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Incident Type Similarity");
    
    yAxisGroup.append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", -45) // Moved slightly left to avoid overlap
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Causal Factor Relationship");
    
    // Create tooltip
    let tooltip = d3.select("body").select(".scatterplot-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "scatterplot-tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg z-10 max-w-xs")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("position", "absolute");
    }
    
    // Add dots - now using filtered points
    pointsGroup.selectAll(".dot")
      .data(filteredPoints)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r", 5)
      .style("fill", d => color(d.kmeans_cluster))
      .style("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 8)
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
          .attr("r", 5)
          .style("opacity", 0.7);
          
        tooltip.style("opacity", 0);
      });
      
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right - 60}, ${margin.top})`);
      
    const displayedClusters = clusterList.filter(cluster => 
      selectedClusters.includes(cluster.id)
    ).sort((a, b) => a.id - b.id);
    
    displayedClusters.slice(0, 10).forEach((cluster, i) => {
      legend.append("circle")
        .attr("cx", 0)
        .attr("cy", i * 20)
        .attr("r", 5)
        .style("fill", color(cluster.id));
        
      legend.append("text")
        .attr("x", 10)
        .attr("y", i * 20 + 5)
        .text(`Cluster ${cluster.id}: ${cluster.interpretation ? cluster.interpretation.substring(0, 15) + (cluster.interpretation.length > 15 ? '...' : '') : 'Unknown'}`)
        .style("font-size", "10px");
    });
    
    // Display the count of visible points
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(`Showing ${filteredPoints.length} of ${allPoints.length} data points`);
    
    // Define zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])  // Set min/max zoom scale
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("zoom", (event) => {
        // Get the new transform
        const transform = event.transform;
        
        // Calculate new scales based on the transform
        const newX = transform.rescaleX(x);
        const newY = transform.rescaleY(y);
        
        // Update the axes with the new scales
        xAxisGroup.call(d3.axisBottom(newX));
        yAxisGroup.call(d3.axisLeft(newY));
        
        // Update the dots positions with the transform
        pointsGroup.attr("transform", transform);
      });
    
    // Add zoom behavior to the SVG
    svg.call(zoom);
    
    // Add zoom controls
    const zoomControls = svg.append("g")
      .attr("transform", `translate(${margin.left + 10}, ${height - margin.bottom + 45})`);
    
    // Zoom control panel background for better visibility
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
    
    // Use all clusters for the distribution chart (not just selected ones)
    const allCategories = Object.keys(distribution);
    
    // Calculate counts using all data
    const counts = allCategories.map(category => distribution[category]);
    
    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 120, left: 60 };
    
    // Create SVG
    const svg = d3.select(distributionChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales
    const x = d3.scaleBand()
      .domain(allCategories)
      .range([0, width - margin.left - margin.right])
      .padding(0.2);
      
    const y = d3.scaleLinear()
      .domain([0, d3.max(counts) || 1]) // Handle empty array
      .range([height - margin.top - margin.bottom, 0]);
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("x", -8)
      .attr("y", 6);
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("text-anchor", "middle")
      .text("Number of Crashes");
    
    // Add bars
    svg.selectAll("rect")
      .data(allCategories)
      .enter()
      .append("rect")
      .attr("x", d => x(d))
      .attr("y", d => y(distribution[d]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.top - margin.bottom - y(distribution[d]))
      .attr("fill", "skyblue");
    
    // Add title
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Distribution of Aircraft Crash Causes");
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
  
  // Select all clusters
  const selectAllClusters = () => {
    setSelectedClusters(clusterList.map(cluster => cluster.id));
  };
  
  // Clear all selections
  const clearAllClusters = () => {
    setSelectedClusters([]);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <SidePanel />
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Aircraft Crash Analysis Dashboard</h1>
        
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
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Cluster Visualization</h2>
                
                {/* Improved layout with proper spacing */}
                <div className="flex flex-row items-start gap-6" ref={scatterplotContainerRef}>
                  {/* Scatterplot container with flex-grow to use available space */}
                  <div 
                    ref={scatterplotRef} 
                    className="flex-grow"
                  ></div>
                  
                  {/* Cluster Selection Panel - fixed width and properly spaced */}
                  <div className="w-64 shrink-0">
                    <div className="sticky top-0">
                      <div className="flex flex-col mb-4">
                        <h3 className="font-medium mb-2">Select Clusters to Display</h3>
                        <div className="flex space-x-2 mb-3">
                          <button 
                            onClick={selectAllClusters}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            Select All
                          </button>
                          <button 
                            onClick={clearAllClusters}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto p-2 border rounded mb-6">
                        {clusterList.map(cluster => (
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
                  className="overflow-x-auto" 
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
      </main>
    </div>
  );
};

export default Home;