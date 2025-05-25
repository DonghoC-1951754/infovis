import React from "react";
import home_icon from "../assets/home-icon.svg";
import countries_icon from "../assets/countries-icon.svg";
import manufacturer_icon from "../assets/manufacturer-icon.svg";
import plane_icon from "../assets/plane-icon.svg";

const SidePanel = () => {
  return (
    <div>
      <aside
        id="default-sidebar"
        className="w-60 h-screen"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <ul className="space-y-2 font-medium">
            <li>
              <a
                href="/"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <img
                  src={home_icon}
                  alt="Home"
                  className="shrink-0 w-5 h-5 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                />
                <span className="ms-3">Accident Classifications</span>
              </a>
            </li>
            <li>
              <a
                href="countries"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <img
                  src={countries_icon}
                  alt="Countries"
                  className="shrink-0 w-5 h-5 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                />
                <span className="flex-1 ms-3 whitespace-nowrap">Countries</span>
              </a>
            </li>
            <li>
              <a
                href="manufacturers"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <img
                  src={manufacturer_icon}
                  alt="Manufacturers"
                  className="shrink-0 w-5 h-5 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                />
                <span className="flex-1 ms-3 whitespace-nowrap">
                  Manufacturers
                </span>
              </a>
            </li>
            <li>
              <a
                href="/planestats"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <img
                  src={plane_icon}
                  alt="Plane Statistics"
                  className="shrink-0 w-5 h-5 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                />
                <span className="flex-1 ms-3 whitespace-nowrap">
                  Plane Statistics
                </span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  className="shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 20"
                >
                  <path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z" />
                </svg>
                <span className="flex-1 ms-3 whitespace-nowrap">
                  Through The Years
                </span>
              </a>
            </li>
            <li>
              <a
                href="/about"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <svg
                  className="shrink-0 w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm.75-5.5V5a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0Z" />
                </svg>
                <span className="flex-1 ms-3 whitespace-nowrap">About</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default SidePanel;
