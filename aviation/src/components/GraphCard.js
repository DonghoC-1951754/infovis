import { useEffect, useRef } from "react";
import * as d3 from "d3";

const GraphCard = ({ id, title, renderGraph }) => {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current && renderGraph) {
      renderGraph(d3Container.current);
    }
  }, [renderGraph]);

  return (
    <div className="bg-white shadow-lg overflow-hidden p-6 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Graph {id}</h2>
      <div
        ref={d3Container}
        className="w-full h-64 flex items-center justify-center"
      ></div>
    </div>
  );
};

export default GraphCard;
