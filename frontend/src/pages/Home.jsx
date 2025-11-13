import { useNavigate } from "react-router-dom";
import { NavigationBar } from "../components/NavBar";
import { useEffect, useState } from "react";
import { AuthenticationClient } from '../proto/auth_grpc_web_pb';
import { TokenRequest } from '../proto/auth_pb';
import "../styles/index.css";
import {
  Heart,
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";


const auth_client = new AuthenticationClient(
  window.location.hostname === 'localhost'
    ? 'http://localhost:10000'
    : 'http://envoy-service:10000'
);


export function Home() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {

        navigate("/");
        return;
      }

  const req = new TokenRequest();
  req.setToken(token);

  auth_client.validate_token(req, {}, (err, res) => {
    if (err) {
      navigate("/");
      return;
    }

    if (!res.getValid()) {
      navigate("/");
    } else {
      setUsername(res.getUsername());
    }
  });
}, [navigate]);

  const handleNavigation = (path) => {
    navigate(path)
    // In your actual app, this would use: navigate(path)
  };


   const quickActions = [
    {
      name: "New Assessment",
      icon: <ClipboardList className="w-6 h-6" />,
      path: "/patient_form",
      color: "from-blue-500 to-blue-600",
      description: "Start risk analysis"
    },
    {
      name: "Patient Records",
      icon: <Users className="w-6 h-6" />,
      path: "/patient_list",
      color: "from-purple-500 to-purple-600",
      description: "View all patients"
    },
    {
      name: "Schedule",
      icon: <Calendar className="w-6 h-6" />,
      path: "/schedule",
      color: "from-indigo-500 to-indigo-600",
      description: "Manage appointments"
    },
    {
      name: "Doctor's Availability",
      icon: <TrendingUp className="w-6 h-6" />,
      path: "/doctor_availability",
      color: "from-emerald-500 to-emerald-600",
      description: "Manage doctor's time sheet"
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Bar */}
      <NavigationBar />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-1">
                Welcome back, {username} 👋
              </h1>
              <p className="text-slate-600">What would you like to do today?</p>
            </div>
            <button
            onClick={() => {
                localStorage.removeItem("token"); // remove your token
                window.location.href = "/";  // optional: redirect to login page
              }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Risk Assessment System
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Access patient records, perform risk assessments, and manage appointments all in one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-slate-700 mb-6 text-center">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`group relative overflow-hidden bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-slate-200 hover:border-transparent text-left`}
                onClick={() => handleNavigation(action.path)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{action.name}</h3>
                  <p className="text-slate-600">{action.description}</p>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </button>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
