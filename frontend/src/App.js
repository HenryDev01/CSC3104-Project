import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import {Login} from './pages/Login'
import {PatientForm} from './pages/PatientForm'
import {PatientList} from './pages/PatientList'
import {PatientRiskDetail} from './pages/PatientRiskDetail'
import {Schedule} from './pages/Schedule'


function App() {
  return (
    <Router>
        <Routes>
            <Route path = "/" element={<Login/>} />
            <Route path = "/patient_form" element={<PatientForm/>} />
            <Route path = "/patient_list" element={<PatientList/>} />
            <Route path = "/patient_detail" element={<PatientRiskDetail/>} />
            <Route path = "/schedule" element={<Schedule/>} />
        </Routes>
    </Router>
  );
}

export default App;
