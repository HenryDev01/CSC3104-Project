import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {Login} from './pages/Login'
import { Home } from './pages/Home';
import {PatientForm} from './pages/PatientForm'
import {PatientList} from './pages/PatientList'
import { PatientDetails } from "./pages/PatientDetails";
import {Schedule} from './pages/Schedule'


function App() {
  return (
    <Router>
        <Routes>
            <Route path = "/" element={<Login/>} />
            <Route path="/home" element={<Home />} />
            <Route path = "/patient_form" element={<PatientForm/>} />
            <Route path = "/patient_list" element={<PatientList/>} />
            <Route path="/patient/:id" element={<PatientDetails />} />
            <Route path = "/schedule" element={<Schedule/>} />
            <Route path="/patient_form/:id" element={<PatientForm />} />
        </Routes>
    </Router>
  );
}

export default App;
