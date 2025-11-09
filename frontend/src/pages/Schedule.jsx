import { Link } from "react-router-dom";
import { NavigationBar } from "../components/NavBar";
import { useState, useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";

export function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const SCHEDULER_API = "http://localhost:5005/api/scheduler";
  const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Working hours: 9 AM - 5 PM, 1 hour per slot = 8 slots
  const timeSlots = [
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
  ];

  // Fetch appointments from scheduler
  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${SCHEDULER_API}/appointments`);
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // Refresh every 10 seconds
    const interval = setInterval(fetchAppointments, 10000);
    return () => clearInterval(interval);
  }, []);

  // Generate all days for current month
  const generateMonthDays = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const days = generateMonthDays(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  // Get appointments for selected date
  const getAppointmentsForDate = (date) => {
    return appointments.filter((appt) => {
      const apptDate = new Date(appt.scheduled_time);
      return (
        apptDate.getDate() === date.getDate() &&
        apptDate.getMonth() === date.getMonth() &&
        apptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get appointment for specific time slot
  const getAppointmentForSlot = (date, slotIndex) => {
    const dateAppointments = getAppointmentsForDate(date);
    return dateAppointments.find((appt) => {
      const apptDate = new Date(appt.scheduled_time);
      return apptDate.getHours() === 9 + slotIndex;
    });
  };

  // Check if date has appointments
  const hasAppointments = (date) => {
    return getAppointmentsForDate(date).length > 0;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "P1":
        return "bg-red-500";
      case "P2":
        return "bg-orange-500";
      case "P3":
        return "bg-yellow-500";
      case "P4":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen min-w-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Appointment Schedule
            </h1>
            <Link
              to="/scheduler"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Scheduler Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2
                className="text-xl font-bold mb-6"
                style={{ color: "#d94f70" }}
              >
                {currentMonth.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              {/* Month Navigation */}
              <div className="flex justify-between mb-4">
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1
                      )
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ← Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1
                      )
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {/* Weekday headers */}
                {weekdayHeaders.map((wd) => (
                  <div key={wd} className="font-bold text-center text-sm">
                    {wd}
                  </div>
                ))}

                {/* Empty slots for alignment */}
                {(() => {
                  const firstDay = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    1
                  );
                  let emptySlots =
                    firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                  return Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ));
                })()}

                {/* Calendar days */}
                {days.map((day) => {
                  const isSelected =
                    selectedDate &&
                    day.toDateString() === selectedDate.toDateString();
                  const hasAppts = hasAppointments(day);

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      className={`relative px-3 py-2 rounded shadow font-semibold border border-black
                        ${
                          isSelected
                            ? "bg-pink-200 border-2"
                            : "bg-white hover:bg-gray-50"
                        }`}
                    >
                      {day.getDate()}
                      {hasAppts && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots for Selected Date */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              <div className="space-y-2">
                {timeSlots.map((slot, index) => {
                  const appointment = getAppointmentForSlot(selectedDate, index);

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded border ${
                        appointment
                          ? `${getPriorityColor(
                              appointment.priority_group
                            )} text-white cursor-pointer hover:opacity-80`
                          : "bg-gray-50 border-gray-200"
                      }`}
                      onClick={() =>
                        appointment && setSelectedSlot(appointment)
                      }
                    >
                      <div className="font-semibold text-sm">{slot}</div>
                      {appointment ? (
                        <div className="text-xs mt-1">
                          <div>Patient: {appointment.patient_id.slice(0, 8)}...</div>
                          <div>Priority: {appointment.priority_group}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Available</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Appointment Details */}
          {selectedSlot && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Appointment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Patient ID:</span>{" "}
                  {selectedSlot.patient_id}
                </div>
                <div>
                  <span className="font-semibold">Priority:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded text-white ${getPriorityColor(
                      selectedSlot.priority_group
                    )}`}
                  >
                    {selectedSlot.priority_group}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Risk Score:</span>{" "}
                  {(selectedSlot.priority_score * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  {selectedSlot.status}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Scheduled Time:</span>{" "}
                  {new Date(selectedSlot.scheduled_time).toLocaleString()}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Reschedule
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Cancel
                </button>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
