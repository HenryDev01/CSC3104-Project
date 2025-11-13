import { useEffect, useState } from "react";
import { NavigationBar } from "../components/NavBar";

export function SchedulerDashboard() {
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview"); // overview, queue, appointments

  const SCHEDULER_API = "http://localhost:10000/api/scheduler";

  // Fetch data from scheduler service
  const fetchData = async () => {
    try {
      const [statsRes, queueRes, appointmentsRes] = await Promise.all([
        fetch(`${SCHEDULER_API}/stats`),
        fetch(`${SCHEDULER_API}/queue`),
        fetch(`${SCHEDULER_API}/appointments`),
      ]);

      const statsData = await statsRes.json();
      const queueData = await queueRes.json();
      const appointmentsData = await appointmentsRes.json();

      setStats(statsData);
      setQueue(queueData.patients || []);
      setAppointments(appointmentsData.appointments || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching scheduler data:", error);
      setLoading(false);
    }
  };

  // Schedule next patient
  const scheduleNext = async () => {
    try {
      const response = await fetch(`${SCHEDULER_API}/schedule-next`, {
        method: "POST",
      });

      if (response.ok) {
        alert("✅ Patient scheduled successfully!");
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || "Failed to schedule"}`);

        console.log(error);
      }
    } catch (error) {
      console.error("Error scheduling patient:", error);
      alert("❌ Failed to schedule patient");
    }
  };

  // Schedule batch of patients
  const scheduleBatch = async (batchSize) => {
    try {
      const response = await fetch(`${SCHEDULER_API}/schedule-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: batchSize }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Scheduled ${data.scheduled_count} patients!`);
        fetchData();
      } else {
        alert("❌ Failed to schedule batch");
      }
    } catch (error) {
      console.error("Error scheduling batch:", error);
      alert("❌ Failed to schedule batch");
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "P1":
        return "bg-red-100 text-red-800 border-red-300";
      case "P2":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "P3":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "P4":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "P5":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      P1: "Critical",
      P2: "Urgent",
      P3: "Moderate",
      P4: "Routine",
      P5: "Low",
    };
    return labels[priority] || priority;
  };

    // Helper function to convert seconds to time string
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};



  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl font-semibold text-gray-600">Loading scheduler data...</div>
        </div>
      </>
    );
  }



  return (
    <>
      <NavigationBar />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Scheduler Dashboard</h1>
            <p className="text-gray-600">Manage patient appointment scheduling and priority queue</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Queue Size</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{queue.length || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Scheduled</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {stats.scheduled_appointments || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Active</div>
              <div className="text-3xl font-bold text-purple-600 mt-2">
                {appointments.length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Priority Distribution</div>
              <div className="mt-2 space-y-1">
                {Object.entries(stats.priority_distribution || {}).map(([priority, count]) => (
                  <div key={priority} className="flex justify-between text-sm">
                    <span className="font-medium">{priority}:</span>
                    <span className="text-gray-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3">
            <button
              onClick={scheduleNext}
              disabled={queue.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Schedule Next Patient
            </button>
            <button
              onClick={() => scheduleBatch(5)}
              disabled={queue.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Schedule Next 5
            </button>
            <button
              onClick={() => scheduleBatch(10)}
              disabled={queue.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Schedule Next 10
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition ml-auto"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setSelectedTab("overview")}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    selectedTab === "overview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedTab("queue")}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    selectedTab === "queue"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Queue ({queue.length})
                </button>
                <button
                  onClick={() => setSelectedTab("appointments")}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    selectedTab === "appointments"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Scheduled ({appointments.length})
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {selectedTab === "overview" && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">System Overview</h2>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-semibold text-gray-800">Auto-Scheduling Active</div>
                      <div className="text-sm text-gray-600">
                        P1 (Critical) and P2 (Urgent) patients are automatically scheduled
                      </div>
                    </div>
                    <div className="border-l-4 border-yellow-500 pl-4 py-2">
                      <div className="font-semibold text-gray-800">Manual Scheduling Required</div>
                      <div className="text-sm text-gray-600">
                        P3, P4, and P5 patients need manual confirmation
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "queue" && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Patient Queue</h2>
                  {queue.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No patients in queue
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Priority
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Risk Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stability
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time Added
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {queue.map((patient, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {patient.patient_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPriorityColor(
                                    patient.priority_group
                                  )}`}
                                >
                                  {patient.priority_group} - {getPriorityLabel(patient.priority_group)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(patient.priority_score * 100).toFixed(1)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {patient.stability}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(patient.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "appointments" && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Scheduled Appointments</h2>
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No scheduled appointments
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Priority
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Scheduled Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {appointments.map((appt, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {appt.patient_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPriorityColor(
                                    appt.priority_group
                                  )}`}
                                >
                                  {appt.priority_group}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {new Date(appt.scheduled_date).toLocaleDateString()} at {formatTime(appt.scheduled_time)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                                  {appt.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(appt.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
