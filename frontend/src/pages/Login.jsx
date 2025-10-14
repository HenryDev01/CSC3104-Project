import {Link, useNavigate} from "react-router-dom"
import Logo from "../img/logo/2.png";
import "../styles/index.css"
import {useState} from "react"
import { AuthenticationClient } from '../proto/auth_grpc_web_pb';
import { Credentials } from '../proto/auth_pb';

const client = new AuthenticationClient('http://localhost:10000');

export function Login() {
  const[username,setUsername] = useState();
  const[password,setPassword] = useState();
  const navigate = useNavigate();

  const handleLogin = (e) =>
  {

      e.preventDefault();
      const req = new Credentials();
      req.setX(username);
      req.setY(password);

    client.is_credential_correct(req, {}, (err, response) => {
      if (err) {
        console.error('gRPC error:', err);
        return;
      }
       const correct = response.getX();
       if(!correct)
       {
           alert("Wrong username or password. use Henry for username and Boey for password as of now.");
           return;
        }

       console.log(correct);
       navigate('/patient_form');

    });
  };


  return (
      <>
      <div className ="flex items-center justify-end bg-[url(../img/bg/2.jpg)]   bg-cover bg-center bg-no-repeat min-h-screen">
            <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>

            <div className=" relative z-10 flex-1 p-12 bg-gradient-to-b from-[#9ddedd] to-[#b8ebe6] text-center font-sans">
              <h1 className=" animate-fadeUp-delay-400 text-4xl font-bold mb-2 text-[#E2A5A7] text-shadow-lg tracking-widest">WELCOME BACK</h1>
              <p className="animate-fadeUp-delay-400 text-lg mb-2 font-bold text-[#E2A5A7] text-shadow-sm">
                Your AI health classification journey continues here
              </p>

          </div>

          <form className = "relative z-10 bg-white p-8 min-h-screen" onSubmit={handleLogin}>
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
                  className="bg-[#E2A5A7] shadow-cyan-500/50 text-white w-full py-3 rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Sign In
                </button>
          </form>

      </div>
    </>
  );
}


