import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {Login} from './pages/Login'
import { Home } from './pages/Home';
import {PatientForm} from './pages/PatientForm'
import {PatientList} from './pages/PatientList'
import {PatientRiskDetail} from './pages/PatientRiskDetail'
import {Schedule} from './pages/Schedule'
import {DoctorAvailability} from './pages/DoctorAvailability'
import {SchedulerDashboard} from './pages/SchedulerDashboard'



function App() {
  return (
    <Router>
        <Routes>
            <Route path = "/" element={<Login/>} />
            <Route path="/home" element={<Home />} />
            <Route path = "/patient_form" element={<PatientForm/>} />
            <Route path = "/patient_list" element={<PatientList/>} />
            <Route path = "/patient_detail/:patientId" element={<PatientRiskDetail/>} />
            <Route path = "/schedule" element={<Schedule/>} />
            <Route path = "/doctor_availability" element={<DoctorAvailability/>} />
            <Route path = "/scheduler" element={<SchedulerDashboard/>} />

        </Routes>
    </Router>
  );
}

export default App;
