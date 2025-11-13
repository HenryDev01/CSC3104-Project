import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SchedulerServiceClient } from "../proto/doctor/doctor_grpc_web_pb";
import {
  Empty,
  DoctorAvailabilityRequest,
  UpdateAvailabilityRequest,
  CreateAvailabilityRequest
} from "../proto/doctor/doctor_pb";
import { NavigationBar } from "../components/NavBar";
import { CheckCircle, AlertCircle, Plus, X } from "lucide-react";

export function DoctorAvailability() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState({ type: "", message: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    endTime: "",
    available: true
  });

  const client = new SchedulerServiceClient("http://localhost:10000");

  useEffect(() => {
    client.getDoctors(new Empty(), {}, (err, res) => {
      if (!err) setDoctors(res.getDoctorsList());
      setLoading(false);
    });
  }, []);

  const fetchAvailability = (doctorId) => {
    setLoading(true);
    const req = new DoctorAvailabilityRequest();
    req.setDoctorId(parseInt(doctorId));
    client.getAvailability(req, {}, (err, res) => {
      if (!err) setAvailability(res.getAvailabilityList());
      setLoading(false);
    });
  };

  const toggleAvailability = (slot) => {
    const req = new UpdateAvailabilityRequest();
    req.setAvailabilityId(slot.getAvailabilityId());
    req.setAvailable(!slot.getAvailable());
    client.updateAvailability(req, {}, (err, res) => {
      if (err) {
          console.log(err);
        setUpdateStatus({ type: "error", message: "Failed to update slot " + err });
      } else {
        setUpdateStatus({ type: "success", message: "Availability updated" });
        fetchAvailability(selectedDoctor);
      }
      setTimeout(() => setUpdateStatus({ type: "", message: "" }), 3000);
    });
  };

  const createAvailability = (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      setUpdateStatus({ type: "error", message: "Please select a doctor first" });
      return;
    }

    const req = new CreateAvailabilityRequest();
    req.setDoctorId(parseInt(selectedDoctor));
    req.setDate(newSlot.date);
    req.setStartTime(newSlot.startTime);
    req.setEndTime(newSlot.endTime);
    req.setAvailable(newSlot.available);

    client.createAvailability(req, {}, (err, res) => {
      if (err) {
                    console.log(err);

        setUpdateStatus({ type: "error", message: "Failed to create slot" });
      } else {
        setUpdateStatus({ type: "success", message: res.getMessage() || "Slot created successfully" });
        fetchAvailability(selectedDoctor);
        setShowCreateForm(false);
        setNewSlot({ date: "", startTime: "", endTime: "", available: true });
      }
      setTimeout(() => setUpdateStatus({ type: "", message: "" }), 3000);
    });
  };

  if (loading && doctors.length === 0) {
    return (
      <>
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-slate-700">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        <div className="max-w-7xl mx-auto px-6">
   

          {updateStatus.message && (
            <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
              updateStatus.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {updateStatus.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{updateStatus.message}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <h1 className="text-3xl font-bold text-white mb-1">Doctor Availability</h1>
              <p className="text-blue-100">Manage your availability slots</p>
            </div>

            <div className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mr-4">Select Doctor:</label>
                  <select
                    value={selectedDoctor || ""}
                    onChange={(e) => {
                      setSelectedDoctor(e.target.value);
                      fetchAvailability(e.target.value);
                      setShowCreateForm(false);
                    }}
                    className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                  >
                    <option value="">-- Select --</option>
                    {doctors.map((d) => (
                      <option key={d.getDoctorId()} value={d.getDoctorId()}>
                        {d.getName()} ({d.getSpecialization()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDoctor && (
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
                  >
                    {showCreateForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showCreateForm ? "Cancel" : "Add New Slot"}
                  </button>
                )}
              </div>

              {showCreateForm && (
                <form onSubmit={createAvailability} className="mb-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Availability Slot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={newSlot.date}
                        onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                        required
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={newSlot.startTime}
                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                        required
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={newSlot.endTime}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                        required
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                      <select
                        value={newSlot.available}
                        onChange={(e) => setNewSlot({ ...newSlot, available: e.target.value === "true" })}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      >
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Create Slot
                    </button>
                  </div>
                </form>
              )}

              {selectedDoctor && availability.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">No availability slots found</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first slot →
                  </button>
                </div>
              ) : selectedDoctor && availability.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200 rounded-xl">
                    <thead className="bg-slate-100">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Start</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">End</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.map((slot, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-3">{slot.getDate()}</td>
                          <td className="px-4 py-3">{slot.getStartTime()}</td>
                          <td className="px-4 py-3">{slot.getEndTime()}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={slot.getAvailable()}
                              onChange={() => toggleAvailability(slot)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-200 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">Select a doctor to view availability</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}