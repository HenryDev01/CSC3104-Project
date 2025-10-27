import { useState } from "react";
import { FaHome, FaUsers, FaClipboardList, FaCalendarAlt } from "react-icons/fa";

export function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-[#6dd5ed] to-[#2193b0] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <a href="#" className="flex items-center space-x-2">
         <a href="/home"> <h1 className="text-2xl font-bold font-sans">HealthHack</h1></a>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink href="/patient_list" Icon={FaUsers} label="Patients" />
          <NavLink href="/patient_form" Icon={FaClipboardList} label="Risk Classifier" />
          <NavLink href="/schedule" Icon={FaCalendarAlt} label="Schedule" />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden focus:outline-none p-2 rounded hover:bg-white hover:text-[#2193b0] transition"
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

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white text-[#2193b0] px-4 pb-4 space-y-2 shadow-inner rounded-b-lg">
          <MobileNavLink href="/patient_list" label="Patients" />
          <MobileNavLink href="/patient_form" label="Risk Classifier" />
          <MobileNavLink href="/schedule" label="Schedule" />
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, Icon, label }) {
  return (
    <a
      href={href}
      className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-white hover:text-[#2193b0] transition"
    >
      <Icon />
      <span>{label}</span>
    </a>
  );
}

function MobileNavLink({ href, label }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded hover:bg-[#e0f2f1] transition"
    >
      {label}
    </a>
  );
}
