import { useState } from "react";
import { Heart, Users, ClipboardList, Calendar, User, Menu, X,BriefcaseMedical } from "lucide-react";

export function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              HealthHack
            </h1>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/patient_list" Icon={Users} label="Patients" />
            <NavLink href="/patient_form" Icon={ClipboardList} label="New Assessment" />
            <NavLink href="/schedule" Icon={Calendar} label="Appointment" />
            <NavLink href="/scheduler" Icon={BriefcaseMedical} label="Scheduler" />


            {/* User Profile */}
{/*             <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-sm text-slate-600"> */}
{/*               <User className="w-4 h-4" /> */}
{/*               <span>Dr. Smith</span> */}
{/*             </div> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition text-slate-600"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-200 space-y-2">
            <MobileNavLink href="/patient_list" Icon={Users} label="Patients" />
            <MobileNavLink href="/patient_form" Icon={ClipboardList} label="Risk Classifier" />
            <MobileNavLink href="/schedule" Icon={Calendar} label="Schedule" />

{/*              */}{/* Mobile User Profile */}
{/*             <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border-t border-slate-200 mt-2 pt-4"> */}
{/*               <User className="w-4 h-4" /> */}
{/*               <span>Dr. Smith</span> */}
{/*             </div> */}
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, Icon, label }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 hover:text-blue-600 transition-all duration-200"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </a>
  );
}

function MobileNavLink({ href, Icon, label }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all duration-200"
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </a>
  );
}