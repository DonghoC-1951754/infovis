import React from "react";
import SidePanel from "../components/Sidepanel";

const About = () => {
  const contributors = [
    {
      name: "Dongho Chun",
      contributions: [
        "Manufacturers page",
        "Plane Statistics page",
        "Countries page: Number of Accidents by Operator's Country of Origin",
        "Manufacturers (GeoJSON and countries), aircraft specification, registration prefix and main aviation datasets scraping, processing and backend logic",
      ],
    },
    {
      name: "Seppe Kimps",
      contributions: [
        "General Info page",
        "Accident Classifications page",
        "Countries page: ...",
        "Processing, clustering and backend logic",
      ],
    },
  ];

  return (
    <div className="h-screen flex">
      <SidePanel />
      <div className="flex-1 p-10 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6">Project Contributions</h1>
        <ul className="space-y-6">
          {contributors.map((person, index) => (
            <li key={index} className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-2">{person.name}</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {person.contributions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default About;
