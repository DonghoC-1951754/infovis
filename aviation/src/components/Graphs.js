import * as d3 from "d3";
import { useEffect, useRef } from "react";

export function graphOne(container) {
  d3.select(container).selectAll("*").remove();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", "0 0 100 100")
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Example dummy data
  const data = [
    { x: 0, y: 90 },
    { x: 20, y: 60 },
    { x: 40, y: 80 },
    { x: 60, y: 30 },
    { x: 80, y: 50 },
    { x: 100, y: 20 },
  ];

  // Line generator
  const line = d3
    .line()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(d3.curveMonotoneX); // smooth line

  // Append the path
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "teal")
    .attr("stroke-width", 2)
    .attr("d", line);
}
export function graphTwo(container) {
  /* D3 code */
}
export function graphThree(container) {
  /* D3 code */
}
export function graphFour(container) {
  /* D3 code */
}
export function graphFive(container) {
  /* D3 code */
}
export function graphSix(container) {
  /* D3 code */
}
