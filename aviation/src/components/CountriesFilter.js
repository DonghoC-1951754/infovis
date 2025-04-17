import React, { useState } from "react";
import CountriesRankingTable from "./CountriesRankingTable.js";

const CountriesFilter = ({ onDateChange }) => {
  // Initial date value (for example, today's date)
  const [startDate, setFromDate] = useState("2024-01-01");
  const [endDate, setToDate] = useState("2025-04-17");

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "startDate") {
      setFromDate(value);
    } else if (name === "endDate") {
      setToDate(value);
    }
    onDateChange(
      `http://127.0.0.1:5000/operator-country?start_date=${startDate}&end_date=${endDate}`
    );
  };

  return (
    <aside className="w-90 bg-gray-100 p-4 border-l border-gray-300">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <div className="mb-2">
        <label className="block mb-1">Date</label>
        <div className="flex items-center">
          <input
            name="startDate"
            type="date"
            className="w-full p-2 border rounded"
            value={startDate}
            onChange={handleDateChange}
          />
          <span className="inline-flex items-center mx-2">-</span>
          <input
            name="endDate"
            type="date"
            className="w-full p-2 border rounded"
            value={endDate}
            onChange={handleDateChange}
          />
        </div>
      </div>
      <div>
        <label className="block mb-1">Dropdown</label>
        <select className="w-full mb-3 p-2 border rounded">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
      <CountriesRankingTable />
    </aside>
  );
};
export default CountriesFilter;
