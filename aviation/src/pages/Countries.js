import React, { useState, useEffect } from "react";
import SidePanel from "../components/Sidepanel";
import CountriesFilter from "../components/CountriesFilter";
import * as d3 from "d3";

const Countries = () => {
  const [data, setData] = useState(null);
  const [crashLocationsData, setCrashLocationsData] = useState(null);
  const [flightRoutesData, setFlightRoutesData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [mapView, setMapView] = useState("countries"); // "countries", "crashes", "routes"
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-04-17");
  const handleCountrySelect = (countryName) => {
    setSelectedCountry(countryName);
  };

  const getColor = (count) => {
    if (!count) return "#f2f0f7";
    
    const maxCount = Math.max(...data.map((item) => item.Count));
    const logScale = d3.scaleLog()
      .domain([1, maxCount])
      .range(["#f1a1a1", "#8b0000"]);
    
    return logScale(count);
  };

  // Fetch countries data
  useEffect(() => {
    const url = `http://localhost:5000/operator-country?start_date=${startDate}&end_date=${endDate}`;
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) => setError(error.message));
  }, [startDate, endDate]);

  // Fetch crash locations data
  useEffect(() => {
    if (mapView === "crashes") {
      const url = `http://localhost:5000/crash-locations?start_date=${startDate}&end_date=${endDate}`;
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => setCrashLocationsData(data))
        .catch((error) => setError(error.message));
    }
  }, [mapView, startDate, endDate]);

  // Fetch flight routes data
  useEffect(() => {
    if (mapView === "routes") {
      const url = `http://localhost:5000/flight-routes?start_date=${startDate}&end_date=${endDate}`;
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => setFlightRoutesData(data))
        .catch((error) => setError(error.message));
    }
  }, [mapView, startDate, endDate]);

  const renderCountriesMap = () => {
    if (!data) return;

    const width = 960;
    const height = 600;
    const svg = d3.select("#map");

    svg.selectAll("*").remove();

    const g = svg.append("g");

    const projection = d3
      .geoMercator()
      .scale(130)
      .center([0, 40])
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    d3.json("/assets/world-geojson.json").then((worldData) => {
      g.selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", (d) => {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const count = country ? country.Count : 0;
          return getColor(count);
        })
        .attr("stroke", "#565758")
        .attr("stroke-width", (d) => {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const isSelected =
            country && selectedCountry === country["Operator Country"];
          return isSelected ? 3 : 0.2;
        })
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          if (country) {
            const newSelection =
              selectedCountry === country["Operator Country"]
                ? null
                : country["Operator Country"];
            setSelectedCountry(newSelection);
          }
        })
        .on("mouseover", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          if (country) {
            d3.select(this)
              .attr("stroke", "#139be8")
              .attr("stroke-width", 1.5);
          }
        })
        .on("mouseout", function (event, d) {
          const countryName = d.properties.name;
          const countryNameLong = d.properties.name_long;

          const country = data.find(
            (item) =>
              item["Operator Country"].toLowerCase() ===
                countryName.toLowerCase() ||
              item["Operator Country"].toLowerCase() ===
                countryNameLong.toLowerCase()
          );

          const isSelected =
            country && selectedCountry === country["Operator Country"];

          d3.select(this)
            .attr("stroke", "#565758")
            .attr("stroke-width", isSelected ? 3 : 0.2);
        });
    });

    // Add zoom functionality
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Create legend for countries
    d3.select("#legend").selectAll("*").remove();

    const legendWidth = 300;
    const legendHeight = 10;
    const margin = { top: 0, right: 20, bottom: 20, left: 20 };

    const svgLegend = d3
      .select("#legend")
      .append("svg")
      .attr("width", legendWidth + margin.left + margin.right)
      .attr("height", legendHeight + margin.bottom);

    const defs = svgLegend.append("defs");

    const minVal = Math.max(1, d3.min(data, (d) => d.Count));
    const maxVal = d3.max(data, (d) => d.Count);

    const logScale = d3.scaleLog()
      .domain([minVal, maxVal])
      .range([0, 1]);

    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    const numStops = 20;
    for (let i = 0; i <= numStops; i++) {
      const logValue = minVal * Math.pow(maxVal / minVal, i / numStops);
      const position = logScale(logValue) * 100;
      
      const mapLogScale = d3.scaleLog()
        .domain([minVal, maxVal])
        .range(["#f2f0f7", "#8b0000"]);
      
      const color = mapLogScale(logValue);
      
      gradient.append("stop")
        .attr("offset", `${position}%`)
        .attr("stop-color", color);
    }

    svgLegend
      .append("rect")
      .attr("x", margin.left)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const xScale = d3
      .scaleLog()
      .domain([minVal, maxVal])
      .range([0, legendWidth]);

    function generateLogTicks(min, max) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logStep = (logMax - logMin) / 4;
      
      const ticks = [];
      for (let i = 0; i <= 4; i++) {
        const logValue = logMin + (i * logStep);
        let tickValue = Math.pow(10, logValue);
        
        if (tickValue < 10) {
          tickValue = Math.round(tickValue);
        } else if (tickValue < 100) {
          tickValue = Math.round(tickValue / 5) * 5;
        } else if (tickValue < 1000) {
          tickValue = Math.round(tickValue / 10) * 10;
        } else {
          tickValue = Math.round(tickValue / 100) * 100;
        }
        
        ticks.push(tickValue);
      }
      
      ticks[0] = min;
      ticks[ticks.length - 1] = max;
      
      return [...new Set(ticks)].sort((a, b) => a - b);
    }

    const tickValues = generateLogTicks(minVal, maxVal);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d3.format("~s"));

    svgLegend
      .append("g")
      .attr("transform", `translate(${margin.left}, ${legendHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px");
  };

const renderCrashLocationsMap = () => {
    if (!crashLocationsData) return;

    const width = 960;
    const height = 600;
    const svg = d3.select("#map");

    svg.selectAll("*").remove();

    const g = svg.append("g");

    const projection = d3
      .geoMercator()
      .scale(130)
      .center([0, 40])
      .translate([width / 2, height / 2]);
    
    const path = d3.geoPath().projection(projection);

    const locationCounts = {};
    crashLocationsData.forEach(crash => {
      if (crash.latitude && crash.longitude) {
        const key = `${crash.latitude},${crash.longitude}`;
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(locationCounts));
    const radiusScale = d3.scaleSqrt()
      .domain([1, maxCount])
      .range([3, 15]);

    const colorScale = d3.scaleLinear()
      .domain([1, maxCount])
      .range(["#f7bbba", "#8b0000"]);
    d3.json("/assets/world-geojson.json").then((worldData) => {
      g.selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#f8f9fa")
        .attr("stroke", "#dee2e6")
        .attr("stroke-width", 0.5);

      Object.entries(locationCounts).forEach(([coords, count]) => {
        const [lat, lng] = coords.split(',').map(Number);
        const [x, y] = projection([lng, lat]);
        
        if (x && y) {
          g.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", radiusScale(count))
            .attr("fill", colorScale(count))
            .attr("fill-opacity", 0.7)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.2)
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
              const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "8px")
                .style("border-radius", "4px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .style("z-index", "1000");

              const crashes = crashLocationsData.filter(crash => 
                crash.latitude === lat && crash.longitude === lng
              );
              
              tooltip.html(`
                <div>
                  <strong>Location:</strong> ${crashes[0].location}<br>
                  <strong>Crashes:</strong> ${count}<br>
                  <strong>Total Fatalities:</strong> ${crashes.reduce((sum, c) => sum + (c.fatalities || 0), 0)}
                </div>
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");

              d3.select(this)
                .attr("stroke", "#007bff")
                .attr("stroke-width", 2);
            })
            .on("mouseout", function() {
              d3.selectAll(".tooltip").remove();
              d3.select(this)
                .attr("stroke", "#000")
                .attr("stroke-width", 0.2);
            })
            .on("click", function() {
              const crashes = crashLocationsData.filter(crash => 
                crash.latitude === lat && crash.longitude === lng
              );
              setSelectedLocation({
                location: crashes[0].location,
                crashes: crashes,
                count: count
              });
            });
        }
      });

      d3.select("#legend").selectAll("*").remove();
      
      const legendSvg = d3.select("#legend")
        .append("svg")
        .attr("width", 300)
        .attr("height", 100);

      const rawLegend = new Set([
        1,
        Math.ceil(maxCount / 4),
        Math.ceil(maxCount / 2),
        maxCount
      ]);

      const legendData = Array.from(rawLegend).sort((a, b) => a - b);
      
      legendData.forEach((value, i) => {
        const x = 20 + i * 60;
        const y = 30;
        
        legendSvg.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", radiusScale(value))
          .attr("fill", colorScale(value))
          .attr("fill-opacity", 0.7)
          .attr("stroke", "#000")
          .attr("stroke-width", 0.2);
        
        legendSvg.append("text")
          .attr("x", x)
          .attr("y", y + radiusScale(maxCount) + 15)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .text(value);
      });

      legendSvg.append("text")
        .attr("x", 150)
        .attr("y", 80)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Number of Crashes");
    });

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
  };

  const renderFlightRoutesMap = () => {
    if (!flightRoutesData) return;

    const width = 960;
    const height = 600;
    const svg = d3.select("#map");

    svg.selectAll("*").remove();

    const g = svg.append("g");

    const projection = d3
      .geoMercator()
      .scale(130)
      .center([0, 40])
      .translate([width / 2, height / 2]);
    
    const path = d3.geoPath().projection(projection);

    const routeFrequency = {};
    const validRoutes = flightRoutesData.filter(route => 
      route.origin_lat && route.origin_lng && 
      route.destination_lat && route.destination_lng
    );

    validRoutes.forEach(route => {
      const key = `${route.origin_lat},${route.origin_lng}-${route.destination_lat},${route.destination_lng}`;
      if (!routeFrequency[key]) {
        routeFrequency[key] = {
          count: 0,
          route: route,
          crashes: []
        };
      }
      routeFrequency[key].count++;
      routeFrequency[key].crashes.push(route);
    });

    const maxFrequency = Math.max(...Object.values(routeFrequency).map(r => r.count));
    
    const strokeScale = d3.scaleLinear()
      .domain([1, maxFrequency])
      .range([1, 5]);

    const opacityScale = d3.scaleLinear()
      .domain([1, maxFrequency])
      .range([0.3, 0.8]);

    const colorScale = d3.scaleLinear()
      .domain([1, maxFrequency])
      .range(["#f7bbba", "#8b0000"]);

    d3.json("/assets/world-geojson.json").then((worldData) => {
      g.selectAll(".country")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#f8f9fa")
        .attr("stroke", "#dee2e6")
        .attr("stroke-width", 0.5);

      Object.entries(routeFrequency).forEach(([routeKey, routeData]) => {
        const route = routeData.route;
        const originCoords = projection([route.origin_lng, route.origin_lat]);
        const destCoords = projection([route.destination_lng, route.destination_lat]);

        if (originCoords && destCoords) {
          const dx = destCoords[0] - originCoords[0];
          const dy = destCoords[1] - originCoords[1];
          const dr = Math.sqrt(dx * dx + dy * dy);
          
          const pathData = `M${originCoords[0]},${originCoords[1]}A${dr},${dr} 0 0,1 ${destCoords[0]},${destCoords[1]}`;
          
          g.append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", colorScale(routeData.count))
            .attr("stroke-width", strokeScale(routeData.count))
            .attr("stroke-opacity", opacityScale(routeData.count))
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
              const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "8px")
                .style("border-radius", "4px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .style("z-index", "1000");

              tooltip.html(`
                <div>
                  <strong>Route:</strong> ${route.origin_city || 'Unknown'} → ${route.destination_city || 'Unknown'}<br>
                  <strong>Crashes on route:</strong> ${routeData.count}<br>
                  <strong>Total Fatalities:</strong> ${routeData.crashes.reduce((sum, c) => sum + (c.fatalities || 0), 0)}
                </div>
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");

              d3.select(this)
                .attr("stroke", "#0004ff")
                .attr("stroke-width", strokeScale(routeData.count) + 2);
            })
            .on("mouseout", function() {
              d3.selectAll(".tooltip").remove();
              d3.select(this)
                .attr("stroke", colorScale(routeData.count))
                .attr("stroke-width", strokeScale(routeData.count));
            })
            .on("click", function() {
              setSelectedRoute(routeData);
            });

          [originCoords, destCoords].forEach((coords, index) => {
            g.append("circle")
              .attr("cx", coords[0])
              .attr("cy", coords[1])
              .attr("r", 3)
              .attr("fill", index === 0 ? "#28a745" : "#dc3545")
              .attr("stroke", "#000")
              .attr("stroke-width", 0.2);
          });
        }
      });

      d3.select("#legend").selectAll("*").remove();
      
      const legendSvg = d3.select("#legend")
        .append("svg")
        .attr("width", 300)
        .attr("height", 120);

      const rawLegend = new Set([
        1,
        Math.ceil(maxFrequency / 3),
        Math.ceil(maxFrequency / 1.5),
        maxFrequency
      ]);

      let legendData = Array.from(rawLegend).sort((a, b) => a - b);
      
      legendData.forEach((value, i) => {
        const y = 20 + i * 15;
        
        legendSvg.append("line")
          .attr("x1", 20)
          .attr("x2", 60)
          .attr("y1", y)
          .attr("y2", y)
          .attr("stroke", colorScale(value))
          .attr("stroke-width", strokeScale(value))
          .attr("stroke-opacity", opacityScale(value));
        
        legendSvg.append("text")
          .attr("x", 70)
          .attr("y", y + 3)
          .style("font-size", "10px")
          .text(`${value} crash${value > 1 ? 'es' : ''}`);
      });

      legendSvg.append("circle")
        .attr("cx", 200)
        .attr("cy", 25)
        .attr("r", 4)
        .attr("fill", "#28a745")
        .attr("stroke", "#000");
      
      legendSvg.append("text")
        .attr("x", 210)
        .attr("y", 28)
        .style("font-size", "10px")
        .text("Origin");

      legendSvg.append("circle")
        .attr("cx", 200)
        .attr("cy", 45)
        .attr("r", 4)
        .attr("fill", "#dc3545")
        .attr("stroke", "#000");
      
      legendSvg.append("text")
        .attr("x", 210)
        .attr("y", 48)
        .style("font-size", "10px")
        .text("Destination");

      legendSvg.append("text")
        .attr("x", 150)
        .attr("y", 100)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Crashed Flight Routes");
    });

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
  };

  useEffect(() => {
    if (mapView === "countries" && data) {
      renderCountriesMap();
    } else if (mapView === "crashes" && crashLocationsData) {
      renderCrashLocationsMap();
    } else if (mapView === "routes" && flightRoutesData) {
      renderFlightRoutesMap();
    }
  }, [data, crashLocationsData, flightRoutesData, selectedCountry, mapView]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "startDate") {
      setStartDate(value);
    } else if (name === "endDate") {
      setEndDate(value);
    }
  };

  const renderSideContent = () => {
    if (mapView === "crashes" && selectedLocation) {
      return (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">{selectedLocation.location}</h3>
          <p className="text-sm text-gray-600 mb-2">
            {selectedLocation.count} crashes at this location
          </p>
          
          <div className="max-h-64 overflow-y-auto">
            {selectedLocation.crashes.map((crash, index) => (
              <div key={index} className="border-b pb-2 mb-2 last:border-b-0">
                <div className="text-xs text-gray-500">{crash.date}</div>
                <div className="text-sm">{crash.operator}</div>
                <div className="text-sm">{crash.ac_type}</div>
                <div className="text-xs text-red-600">
                  Fatalities: {crash.fatalities || 0}
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setSelectedLocation(null)}
            className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Close details
          </button>
        </div>
      );
    }

    if (mapView === "routes" && selectedRoute) {
      return (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">
            {selectedRoute.route.origin_city || 'Unknown'} → {selectedRoute.route.destination_city || 'Unknown'}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {selectedRoute.count} crashes on this route
          </p>
          
          <div className="max-h-64 overflow-y-auto">
            {selectedRoute.crashes.map((crash, index) => (
              <div key={index} className="border-b pb-2 mb-2 last:border-b-0">
                <div className="text-xs text-gray-500">{crash.date}</div>
                <div className="text-sm">{crash.operator}</div>
                <div className="text-sm">{crash.ac_type}</div>
                <div className="text-xs">Flight: {crash.flight_number || 'N/A'}</div>
                <div className="text-xs text-red-600">
                  Fatalities: {crash.fatalities || 0}
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setSelectedRoute(null)}
            className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Close details
          </button>
        </div>
      );
    }

    return null;
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="h-screen flex">
      <SidePanel />

      <div className="relative w-full h-full border">
        <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded shadow">
          <label className="block text-sm font-medium mb-2">Map View:</label>
          <select
            value={mapView}
            onChange={(e) => {
              setMapView(e.target.value);
              setSelectedLocation(null);
              setSelectedRoute(null);
            }}
            className="p-2 border rounded"
          >
            <option value="countries">Operator Countries of Origin</option>
            <option value="crashes">Crash Locations</option>
            <option value="routes">Crashed Flight Routes</option>
          </select>
        </div>

        <div className="absolute top-4 left-80 z-10 bg-white/90 p-3 rounded shadow">
          <label className="block text-sm font-medium mb-2">Date Range:</label>
          <div className="flex items-center space-x-2">
            <input
              name="startDate"
              type="date"
              className="p-2 border rounded text-sm"
              value={startDate}
              onChange={handleDateChange}
            />
            <span>-</span>
            <input
              name="endDate"
              type="date"
              className="p-2 border rounded text-sm"
              value={endDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <svg id="map" viewBox="0 0 960 600" className="w-full h-full"></svg>
        
        <div
          id="legend"
          className="absolute bottom-2 right-2 bg-white/90 p-2 rounded shadow"
        ></div>
      </div>

      <aside className="w-105 bg-gray-100 p-4 border-l border-gray-300">
        {mapView === "countries" && (
          <aside className="w-96 bg-gray-100 p-4 border-l border-gray-300">
            <h2 className="text-lg font-semibold mb-4">Country Details</h2>
            <CountriesFilter
              data={data}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountry}
            />
          </aside>
        )}
      </aside>
    </div>
  );
};

export default Countries;