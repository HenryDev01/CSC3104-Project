import { Link } from "react-router-dom";
import { NavigationBar } from "../components/NavBar";
import { useState, useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";

export function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    patientId: "",
    date: "",
    time: "",
  });
  const [availableTimes, setAvailableTimes] = useState([]);

  const SCHEDULER_API = "http://localhost:10000/api/scheduler";
  const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const formatTime = (timeValue) => {
    let hours, minutes;
    if (typeof timeValue === "number") {
      hours = Math.floor(timeValue / 3600);
      minutes = Math.floor((timeValue % 3600) / 60);
    } else if (typeof timeValue === "string") {
      [hours, minutes] = timeValue.split(":").map(Number);
    } else return "00:00";
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${SCHEDULER_API}/appointments`);
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchAvailability = async (date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`${SCHEDULER_API}/availability?date=${dateStr}`);
      const data = await response.json();
      setAvailability(data.availability || []);
      return data.availability || [];
    } catch (error) {
      console.error("Error fetching availability:", error);
      setAvailability([]);
      return [];
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchAvailability(selectedDate);
    const interval = setInterval(() => {
      fetchAppointments();
      fetchAvailability(selectedDate);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDate) fetchAvailability(selectedDate);
  }, [selectedDate]);

  const generateMonthDays = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const days = generateMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());

  const getAppointmentsForDate = (date) => {
    return appointments.filter((appt) => {
      const apptDate = new Date(appt.scheduled_date);
      return (
        apptDate.getDate() === date.getDate() &&
        apptDate.getMonth() === date.getMonth() &&
        apptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getAppointmentForSlot = (slotTime) => {
    const dateAppointments = getAppointmentsForDate(selectedDate);
    return dateAppointments.find((appt) => formatTime(appt.scheduled_time) === slotTime);
  };

  const hasAppointments = (date) => getAppointmentsForDate(date).length > 0;

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

  const groupedSlots = availability?.length
    ? availability.reduce((acc, slot) => {
        const startTime = formatTime(slot.start_time);
        const endTime = formatTime(slot.end_time);
        const timeRange = `${startTime} - ${endTime}`;
        if (!acc[timeRange]) acc[timeRange] = [];
        acc[timeRange].push(slot);
        return acc;
      }, {})
    : {};

  const sortedTimeSlots = Object.keys(groupedSlots).sort();

  const cancelAppointment = async (patientId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return null;
    try {
      const res = await fetch(`${SCHEDULER_API}/cancel/${patientId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      return data.appointment;
    } catch (err) {
      console.error(err);
      alert("❌ Failed to cancel appointment");
      return null;
    }
  };

  const rescheduleAppointment = async (patientId, date, time) => {
    try {
      const newDatetime = `${date}T${time}:00`;
      const res = await fetch(`${SCHEDULER_API}/reschedule/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_datetime: newDatetime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reschedule");
      return data.appointment;
    } catch (err) {
      console.error(err);
      alert("❌ Failed to reschedule appointment");
      return null;
    }
  };

  const handleRescheduleDateChange = async (newDate) => {
    setRescheduleData({ ...rescheduleData, date: newDate });
    const dateObj = new Date(newDate);
    const slots = await fetchAvailability(dateObj);
    const times = Array.from(new Set(slots.map((s) => formatTime(s.start_time))));
    setAvailableTimes(times);
  };

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen min-w-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Appointment Schedule</h1>
            <Link
              to="/scheduler"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Scheduler Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6" style={{ color: "#d94f70" }}>
                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>

              <div className="flex justify-between mb-4">
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ← Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {weekdayHeaders.map((wd) => (
                  <div key={wd} className="font-bold text-center text-sm">
                    {wd}
                  </div>
                ))}

                {(() => {
                  const firstDay = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    1
                  );
                  let emptySlots = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                  return Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ));
                })()}

                {days.map((day) => {
                  const isSelected =
                    selectedDate && day.toDateString() === selectedDate.toDateString();
                  const hasAppts = hasAppointments(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      className={`relative px-3 py-2 rounded shadow font-semibold border border-black ${
                        isSelected ? "bg-pink-200 border-2" : "bg-white hover:bg-gray-50"
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

            {/* Slots */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              {sortedTimeSlots.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No availability for this date
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sortedTimeSlots.map((timeRange) => {
                    const slots = groupedSlots[timeRange];
                    const startTime = formatTime(slots[0].start_time);
                    const appointment = getAppointmentForSlot(startTime);
                    return (
                      <div key={timeRange}>
                        <div
                          className={`p-3 rounded border ${
                            appointment
                              ? `${getPriorityColor(
                                  appointment.priority_group
                                )} text-white cursor-pointer hover:opacity-80`
                              : "bg-gray-50 border-gray-200"
                          }`}
                          onClick={() => setSelectedSlot(appointment)}
                        >
                          <div className="font-semibold text-sm">{timeRange}</div>
                          {appointment ? (
                            <div className="text-xs mt-1">
                              <div>Patient: {appointment.patient_id.slice(0, 8)}...</div>
                              <div>Priority: {appointment.priority_group}</div>
                              <div>
                                Doctor:{" "}
                                {slots.find(
                                  (slot) => slot.doctor_id === appointment.doctor_id
                                )?.doctor_name || `Dr. ${appointment.doctor_id}`}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              {slots.length} doctor(s) available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
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
                    {selectedSlot.priority_score}
                </div>
                <div>
                  <span className="font-semibold">Status:</span> {selectedSlot.status}
                </div>
                <div>
                  <span className="font-semibold">Stability:</span>{" "}
                  {selectedSlot.stability || "N/A"}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Scheduled Time:</span>{" "}
                  {selectedSlot.scheduled_date} at{" "}
                  {formatTime(selectedSlot.scheduled_time)}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowRescheduleForm(true);
                    handleRescheduleDateChange(selectedSlot.scheduled_date);
                    setRescheduleData({
                      patientId: selectedSlot.patient_id,
                      date: selectedSlot.scheduled_date,
                      time: formatTime(selectedSlot.scheduled_time),
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reschedule
                </button>
                <button
                  onClick={async () => {
                    const updated = await cancelAppointment(selectedSlot.patient_id);
                    if (updated) {
                      setSelectedSlot(updated);
                      fetchAppointments();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
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

          {/* Reschedule Form Modal */}
          {showRescheduleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-xl font-bold mb-4 text-center">
                  Reschedule Appointment
                </h2>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const updated = await rescheduleAppointment(
                      rescheduleData.patientId,
                      rescheduleData.date,
                      rescheduleData.time
                    );
                    if (updated) {
                      setSelectedSlot(updated);
                      fetchAppointments();
                      fetchAvailability(selectedDate);
                      setShowRescheduleForm(false);
                    }
                  }}
                >
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    New Date:
                  </label>
                  <input
                    type="date"
                    value={rescheduleData.date}
                    onChange={(e) => handleRescheduleDateChange(e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                    required
                  />

                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Available Time:
                  </label>
                  <select
                    value={rescheduleData.time}
                    onChange={(e) =>
                      setRescheduleData({ ...rescheduleData, time: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 mb-4"
                    required
                  >
                    <option value="">-- Select Time --</option>
                    {availableTimes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <div className="flex justify-between">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRescheduleForm(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
