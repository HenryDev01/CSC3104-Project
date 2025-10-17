import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/index.css";

export function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("username");
    if (!storedName) {
      // If username does not exist, send back to login
      navigate("/");
    } else {
      setUsername(storedName);
    }
  }, [navigate]);

  const services = [
    {
      name: "Consultation Form",
      icon: "🩺",
      path: "/patient_form",
      color: "from-[#9ddedd] to-[#b8ebe6]",
    },
    {
      name: "Patient List",
      icon: "📋",
      path: "/patient_list",
      color: "from-[#E2A5A7] to-[#f4c2c2]",
    },
    {
      name: "Schedule",
      icon: "🗓️",
      path: "/schedule",
      color: "from-[#b2c7f0] to-[#cce0ff]",
    },
    {
      name: "Risk Detail",
      icon: "⚕️",
      path: "/patient_detail",
      color: "from-[#ffd59e] to-[#fff1b8]",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url(../img/bg/2.jpg)] bg-cover bg-center bg-no-repeat relative">
      {/* background blur overlay */}
      <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>

      {/* main container */}
      <div className="relative z-10 bg-white/80  shadow-lg p-10 w-11/12 md:w-3/4 lg:w-2/3 text-center">
        <h1 className="text-4xl font-bold text-[#E2A5A7] mb-8 tracking-widest">
          Welcome, {username} 👋
        </h1>
        <p className="text-gray-600 mb-10 text-lg">
          Choose a service below to continue your healthcare workflow
        </p>

        {/* service grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              onClick={() => navigate(service.path)}
              className={`cursor-pointer rounded-2xl p-8 shadow-md transition transform hover:scale-105 bg-gradient-to-b ${service.color}`}
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h2 className="text-xl font-semibold text-gray-800">{service.name}</h2>
            </div>
          ))}
        </div>

        <button
            onClick={() => {
                localStorage.removeItem("username");
                navigate("/");
                }}
            className="mt-10 px-6 py-2 bg-[#E2A5A7] text-white rounded-lg hover:bg-[#c78587] transition w-full"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
