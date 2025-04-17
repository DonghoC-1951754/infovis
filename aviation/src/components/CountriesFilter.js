import React, { useState } from "react";

const CountriesFilter = ({ onDateChange }) => {
  // Initial date value (for example, today's date)
  const [startDate, setFromDate] = useState("2024-01-01");
  const [endDate, setToDate] = useState("2025-04-17");

  // Handle the date change
  const handleFromDateChange = (e) => {
    console.log("date changed");
    setFromDate(e.target.value);
    if (startDate && endDate) {
      onDateChange(
        `http://127.0.0.1:5000/operator-country?start_date=${startDate}&end_date=${endDate}`
      );
    }
  };

  const handleToDateChange = (e) => {
    console.log("date changed");
    setToDate(e.target.value);
    if (startDate && endDate) {
      onDateChange(
        `http://127.0.0.1:5000/operator-country?start_date=${startDate}&end_date=${endDate}`
      );
    }
  };

  return (
    <aside className="w-90 bg-gray-100 p-4 border-l border-gray-300">
      {/* You can put filter controls, date pickers, etc. here */}
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <div className="mb-2">
        <label className="block mb-1">Date</label>
        <div className="flex items-center">
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={startDate}
            onChange={handleFromDateChange}
          />
          <span className="inline-flex items-center mx-2">-</span>
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={endDate}
            onChange={handleToDateChange}
          />
        </div>
      </div>
      <div>
        <label className="block mb-1">Dropdown</label>
        <select className="w-full p-2 border rounded">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
    </aside>
  );
};
export default CountriesFilter;
