import React from "react";

const CountriesRankingTable = () => {
  return (
    <div className="border rounded sm:rounded-lg bg-white mt-6">
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
          {[
            {
              name: 'Apple MacBook Pro 17"',
              color: "Silver",
            },
            {
              name: "Microsoft Surface Pro",
              color: "White",
            },
            {
              name: "Magic Mouse 2",
              color: "Black",
            },
            {
              name: "Apple Watch",
              color: "Silver",
            },
            {
              name: "iPad",
              color: "Gold",
            },
            {
              name: 'Apple iMac 27"',
              color: "Silver",
            },
          ].map((item, i) => (
            <tr
              key={i}
              className="bg-white border-b hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4">{i + 1}</td>
              <th scope="row" className="px-6 py-4 font-medium text-gray-900">
                {item.name}
              </th>
              <td className="px-6 py-4">{item.color}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CountriesRankingTable;
