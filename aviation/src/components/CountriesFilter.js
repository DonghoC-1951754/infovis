import React from "react";
import CountriesRankingTable from "./CountriesRankingTable.js";

const CountriesFilter = ({
  data,
  selectedCountry,
  onCountrySelect,
}) => {
  return (
    <div>
      <CountriesRankingTable
        data={data}
        selectedCountry={selectedCountry}
        onCountrySelect={onCountrySelect}
      />
    </div>
  );
};

export default CountriesFilter;