import React, { useEffect, useRef } from "react";

const CountriesRankingTable = ({ data, selectedCountry, onCountrySelect }) => {
  const tableContainerRef = useRef(null);
  const selectedRowRef = useRef(null);

  // Auto-scroll to selected country
  useEffect(() => {
    if (
      selectedCountry &&
      selectedRowRef.current &&
      tableContainerRef.current &&
      data &&
      data.length > 0
    ) {
      const container = tableContainerRef.current;
      const selectedRow = selectedRowRef.current;

      // Calculate the position to center the selected row in the container
      const containerHeight = container.clientHeight;
      const rowTop = selectedRow.offsetTop;
      const rowHeight = selectedRow.clientHeight;

      // Center the row in the container
      const scrollTop = rowTop - containerHeight / 2 + rowHeight / 2;

      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });
    }
  }, [selectedCountry, data]);

  const handleRowClick = (countryName) => {
    const newSelection = selectedCountry === countryName ? null : countryName;
    onCountrySelect(newSelection);
  };

  if (!data || data.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-md font-semibold mb-2">Country Rankings</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Sort data by count in descending order
  const sortedData = [...data].sort((a, b) => b.Count - a.Count);

  return (
    <div className="mt-8">
      <h3 className="text-md font-semibold mb-2">Country Rankings</h3>
      <div
        className="max-h-[38rem] overflow-y-auto border border-gray-300 rounded"
        ref={tableContainerRef}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="text-left p-2 border-b">Rank</th>
              <th className="text-left p-2 border-b">Country</th>
              <th className="text-right p-2 border-b">Count</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => {
              const isSelected = selectedCountry === item["Operator Country"];
              return (
                <tr
                  key={item["Operator Country"]}
                  ref={isSelected ? selectedRowRef : null}
                  className={`cursor-pointer hover:bg-gray-100 ${
                    isSelected
                      ? "bg-orange-100 border-l-4 border-orange-500"
                      : ""
                  }`}
                  onClick={() => handleRowClick(item["Operator Country"])}
                >
                  <td className="p-2 border-b">{index + 1}</td>
                  <td
                    className={`p-2 border-b ${
                      isSelected ? "font-semibold text-orange-700" : ""
                    }`}
                  >
                    {item["Operator Country"]}
                  </td>
                  <td
                    className={`p-2 border-b text-right ${
                      isSelected ? "font-semibold text-orange-700" : ""
                    }`}
                  >
                    {item.Count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedCountry && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
          <strong>Selected:</strong> {selectedCountry}
          <button
            onClick={() => onCountrySelect(null)}
            className="ml-2 text-orange-600 hover:text-orange-800 underline"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
};

export default CountriesRankingTable;
