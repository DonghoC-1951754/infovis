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
    
    // Filter points based on selected clusters
    const filteredPoints = clusterData.points.filter(point => 
      selectedClusters.includes(point.kmeans_cluster)
    );
    
    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    
    // Create SVG
    const svg = d3.select(scatterplotRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales - use full data extent for consistent axis across selections
    const allPoints = clusterData.points;
    const xExtent = d3.extent(allPoints, d => d.x);
    const yExtent = d3.extent(allPoints, d => d.y);
    
    const x = d3.scaleLinear()
      .domain([xExtent[0] - 0.5, xExtent[1] + 0.5])
      .range([0, width - margin.left - margin.right]);
      
    const y = d3.scaleLinear()
      .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
      .range([height - margin.top - margin.bottom, 0]);
    
    // Create color scale for clusters
    const clusterIds = [...new Set(allPoints.map(d => d.kmeans_cluster))];
    const color = d3.scaleOrdinal()
      .domain(clusterIds)
      .range(d3.schemeCategory10);
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .append("text")
      .attr("fill", "#000")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .text("First Principal Component");
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("text-anchor", "middle")
      .text("Second Principal Component");
    
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
    svg.selectAll(".dot")
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
    
    // Add title
    svg.append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("K-means Clustering of Aircraft Crash Summaries");
      
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.left - margin.right - 100}, 0)`);
      
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
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", height - margin.top - margin.bottom + 30)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(`Showing ${filteredPoints.length} of ${allPoints.length} data points`);
  };
  
  const renderDistributionChart = () => {
    if (!distributionChartRef.current || !clusterData || !clusterData.kmeans || !clusterData.kmeans.distribution) {
      return;
    }
    
    // Clear any existing SVG
    d3.select(distributionChartRef.current).selectAll("*").remove();
    
    const distribution = clusterData.kmeans.distribution;
    
    // Filter categories based on selected clusters
    const allCategories = Object.keys(distribution);
    const categories = allCategories.filter(category => {
      // Find all points with this interpretation
      const pointsWithCategory = clusterData.points.filter(point => 
        point.kmeans_interpretation === category
      );
      
      // Check if any of these points are in selected clusters
      return pointsWithCategory.some(point => 
        selectedClusters.includes(point.kmeans_cluster)
      );
    });
    
    // Calculate counts for selected clusters only
    const filteredCounts = {};
    categories.forEach(category => {
      // Count only points that belong to selected clusters
      const count = clusterData.points.filter(point => 
        point.kmeans_interpretation === category && 
        selectedClusters.includes(point.kmeans_cluster)
      ).length;
      
      filteredCounts[category] = count;
    });
    
    const counts = categories.map(category => filteredCounts[category]);
    
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
      .domain(categories)
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
      .data(categories)
      .enter()
      .append("rect")
      .attr("x", d => x(d))
      .attr("y", d => y(filteredCounts[d]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.top - margin.bottom - y(filteredCounts[d]))
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
                
                {/* Cluster Selection Panel */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">Select Clusters to Display</h3>
                    <div className="space-x-2">
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 max-h-40 overflow-y-auto p-2 border rounded">
                    {clusterList.map(cluster => (
                      <div key={cluster.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`cluster-${cluster.id}`}
                          checked={selectedClusters.includes(cluster.id)}
                          onChange={() => handleClusterToggle(cluster.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`cluster-${cluster.id}`} className="text-sm">
                          Cluster {cluster.id}: {cluster.interpretation ? 
                            (cluster.interpretation.length > 15 ? 
                              cluster.interpretation.substring(0, 15) + '...' : 
                              cluster.interpretation) : 
                            'Unknown'}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div 
                  ref={scatterplotRef} 
                  className="overflow-x-auto"
                ></div>
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