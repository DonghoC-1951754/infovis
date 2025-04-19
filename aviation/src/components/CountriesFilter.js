import React, { useEffect, useState } from "react";
import CountriesRankingTable from "./CountriesRankingTable.js";

const CountriesFilter = ({ onDateChange }) => {
  const [startDate, setFromDate] = useState("2024-01-01");
  const [endDate, setToDate] = useState("2025-04-17");
  const [data, setData] = useState(null);

  const getData = (startDate, endDate) => {
    fetch(
      `http://127.0.0.1:5000/operator-country?start_date=${startDate}&end_date=${endDate}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Fetch error");
        return res.json();
      })
      .then((json) => {
        setData(json);
        onDateChange(json);
      })
      .catch((err) => console.error(err));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "startDate") {
      setFromDate(value);
    } else if (name === "endDate") {
      setToDate(value);
    }
  };

  useEffect(() => {
    getData(startDate, endDate);
  }, [startDate, endDate]);

  return (
    <aside className="w-90 bg-gray-100 p-4 border-l border-gray-300">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <div className="mb-2 max-w-80">
        <label className="block mb-1">Date</label>
        <div className="flex items-center">
          <input
            name="startDate"
            type="date"
            className="p-2 border rounded"
            value={startDate}
            onChange={handleDateChange}
          />
          <span className="inline-flex items-center mx-2">-</span>
          <input
            name="endDate"
            type="date"
            className="p-2 border rounded"
            value={endDate}
            onChange={handleDateChange}
          />
        </div>
      </div>
      <div className="max-w-80">
        <label className="block mb-1">Dropdown</label>
        <select className="w-full mb-3 p-2 border rounded">
          <option>
            Number of accidents by the operator's country of origin
          </option>
          <option>Option 2</option>
        </select>
      </div>
      <CountriesRankingTable data={data} />
    </aside>
  );
};
export default CountriesFilter;
