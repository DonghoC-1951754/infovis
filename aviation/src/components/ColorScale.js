import * as d3 from "d3";

let colorScaleCache = {};

export const getManufacturerColorScale = (allManufacturers) => {
  const uniqueManufacturers = Array.from(new Set(allManufacturers)).sort();

  // Check if we already have this set cached
  const cacheKey = uniqueManufacturers.join(",");
  if (colorScaleCache[cacheKey]) return colorScaleCache[cacheKey];

  const colors = d3.schemeCategory10.concat(d3.schemeSet2, d3.schemeSet3);
  const scale = d3
    .scaleOrdinal()
    .domain(uniqueManufacturers)
    .range(colors.slice(0, uniqueManufacturers.length));

  colorScaleCache[cacheKey] = scale;
  return scale;
};
