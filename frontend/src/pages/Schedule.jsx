import {Link} from "react-router-dom"
import {NavigationBar} from "../components/NavBar"
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import {useState} from "react"
import "react-big-calendar/lib/css/react-big-calendar.css";

// Generate all days for a given month
const generateMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};


export function Schedule() {
      const today = new Date();
      const [selectedDate, setSelectedDate] = useState(null);
      const [selectedSlot, setSelectedSlot] = useState(null);
      const [currentMonth, setCurrentMonth] = useState(new Date());
      const days = generateMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());
      const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const month = today.getMonth();

      return (
          <>
          <NavigationBar/>
            <div className="min-h-screen min-w-screen bg-gray-50">

           <div className="max-w-5xl mx-auto p-6">

               {/* Month View */}
           <h2 className="text-xl font-sans font-bold mb-6" style= {{"color":"#d94f70"}}>
            {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {/* Add weekday headers */}
              {weekdayHeaders.map((wd) => (
                <div key={wd} className="font-bold font-sans text-center">
                  {wd}
                </div>
              ))}

              {/* Empty slots to align first day */}
              {(() => {
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                // getDay(): Sunday=0, Monday=1, ... Saturday=6
                let emptySlots = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                return Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ));
              })()}

              {/* Actual days */}
              {days.map((day) => {
                const dayStr = day.getDate();
                const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedSlot(null);
                    }}
                    className={`px-3 py-2 rounded shadow font-semibold border-1 border-solid border-[#000000]
                      ${isSelected ? "bg-[#e2a5a7] text-white" : "bg-white hover:bg-gray-200"}
                    `}
                  >
                    {dayStr}
                  </button>
                );
              })}


            </div>
            <div className ="flex justify-content-end mb-6">
                    <div className = "flex-1">
                      <button className ="px-3 py-2 rounded shadow font-semibold bg-white" style ={{"color":"#d94f70"}}
                      onClick={() => {
                      const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                      setCurrentMonth(prevMonth);
                      setSelectedDate(null); // reset selected date if you want
                    }}>Previous</button>
                    </div>

                    <div>
                        <button className ="px-3 py-2 rounded shadow font-semibold bg-white"  style ={{"color":"#d94f70"}} onClick={() => {
                          const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                          setCurrentMonth(nextMonth);
                          setSelectedDate(null); // reset selected date if you want
                        }}>Next</button>
                   </div>
                </div>
            </div>


             {/* Daily Time Slots */}
              {selectedDate && (
                <div className="mb-6">
                  <h2 className="text-xl font-sans text-center font-semibold mb-4" style ={{"color":"#d94f70"}} >
                    Available Time Slots for {selectedDate.toDateString()}
                  </h2>


                </div>
              )}
            </div>

          </>
      );
}


