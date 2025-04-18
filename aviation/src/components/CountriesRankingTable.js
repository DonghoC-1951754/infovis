import React from "react";

const CountriesRankingTable = ({ data }) => {
  if (!data) return <p>No data available.</p>;

  return (
    <div className="border rounded sm:rounded-lg bg-white mt-6 max-w-80">
      <div className="overflow-y-auto max-h-80">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th scope="col" className="px-6 py-3">
                No.
              </th>
              <th scope="col" className="px-6 py-3">
                Country
              </th>
              <th scope="col" className="px-6 py-3">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item, i) => (
              <tr
                key={i}
                className="bg-white border-b hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">{i + 1}</td>
                <th scope="row" className="px-6 py-4 font-medium text-gray-900">
                  {item["Operator Country"]}
                </th>
                <td className="px-6 py-4">{item["Count"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CountriesRankingTable;
