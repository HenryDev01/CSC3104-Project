import {React,useState} from 'react';
import ReactDOM from 'react-dom/client';
import "../styles/index.css"
import { FaHome, FaUsers, FaClipboardList, FaCalendarAlt } from "react-icons/fa";



export function NavigationBar()
{
    const [isOpen, setIsOpen] = useState(false);
    return (
    <nav className="bg-[#e2a5a7] text-white shadow-md w-100">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-start items-center space-x-8 transition-colors">
          <a href="#" className="flex items-center space-x-2 hover:text-[#d94f70]">
              <h1 className="text-2xl font-sans font-bold mb-0">HealthHack</h1>
        </a>
        <a href="/patient_list" className="flex items-center space-x-2 hover:text-[#000000] ">
          <FaUsers />
          <span className = "font-sans">Patients</span>
        </a>
        <a href="/patient_form" className="flex items-center space-x-2 hover:text-[#000000] ">
          <FaClipboardList />
          <span className = "font-sans" >Risk Classifier</span>
        </a>
        <a href="/schedule" className="flex items-center space-x-2 hover:text-[#000000]">
          <FaCalendarAlt />
          <span className = "font-sans">Schedule</span>
        </a>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-blue-500 px-4 pb-3 space-y-2">
            <a href="#" className="hover:text-blue-200">Home</a>
          <a href="/patient_list" className="hover:text-blue-200">Patients</a>
          <a href="/patient_form" className="hover:text-blue-200">Risk Classifier</a>
          <a href="/schedule" className="hover:text-blue-200">Schedule</a>

        </div>
      )}
    </nav>
  );
}