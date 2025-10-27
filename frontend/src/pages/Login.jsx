import { useNavigate } from "react-router-dom";
import "../styles/index.css";
import { useState } from "react";
import { AuthenticationClient } from '../proto/auth_grpc_web_pb';
import { Credentials } from '../proto/auth_pb';

// Choose the correct host depending on where frontend runs
// Inside Docker: 'http://envoy-service:10000'
// Locally (npm start): 'http://localhost:10000'
// Use localhost when frontend is served on localhost
const client = new AuthenticationClient(
  window.location.hostname === 'localhost'
    ? 'http://localhost:10000'
    : 'http://envoy-service:10000'
);

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    const req = new Credentials();
    req.setX(username);
    req.setY(password);

    client.is_credential_correct(req, {}, (err, response) => {
      if (err) {
        console.error('gRPC error:', err);
        alert('Login failed. Check console for details.');
        return;
      }

      const correct = response.getX();

      console.log('Login response:', correct);

      if (!correct) {
        alert("Wrong username or password. Please try again.");
        return;
      }

      // ✅ Save username for Home.jsx
      localStorage.setItem("username", username);

      // Navigate to home form after successful login
      navigate('/home');
    });
  };

  return (
    <div className="flex items-center justify-end bg-[url(../img/bg/2.jpg)] bg-cover bg-center bg-no-repeat min-h-screen">
      <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>

      <div className="relative z-10 flex-1 p-12 bg-gradient-to-b from-[#9ddedd] to-[#b8ebe6]  font-sans">
{/*          <div className="bg-white text-blue-700 rounded-full p-1 mr-3"> */}
{/*             </div> */}
        <span><h1 className="animate-fadeUp-delay-400 text-xl font-bold mb-1 text-[#1a4d4a] text-shadow-lg tracking-widest">
          HEALTHACK
        </h1></span>
        <p className="animate-fadeUp-delay-400 text-lg mb-3   text-[#1a4d4a] text-shadow-sm">
          Your AI health classification journey continues here
        </p>
         <ul className="space-y-3 text-sm md:text-base">
            <li className="flex items-center text-[#1a4d4a]  justify-center md:justify-start"><span className="w-2 h-2  bg-green-400 rounded-full mr-2"></span>Risk Classification</li>
            <li className="flex items-center text-[#1a4d4a] justify-center md:justify-start"><span className="w-2 h-2 text-[#E2A5A7] bg-green-400 rounded-full mr-2"></span>Optimized Scheduling</li>
          </ul>


      </div>

      <form className="relative z-10 bg-white p-12 min-h-screen" onSubmit={handleLogin}>
        {/* Logo */}
        <div className="flex justify-center">
          <div
            className="w-24 h-24 mb-6 text-center bg-cover bg-center rounded-full shadow-lg bg-[url(../img/logo/healthcare_tech_logo.svg)]"
          ></div>
        </div>

        {/* Title */}
        <h1 className="text-2xl text-center font-bold mb-6 text-gray-800 tracking-widest">LOGIN</h1>

        {/* Username */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-3 mb-4 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-3 mb-6 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Login Button */}
        <button
          type="submit"
          className="bg-cyan-500 shadow-cyan-500/50 text-white w-full py-3 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
