import { useState, useEffect } from "react";
import {useNavigate} from "react-router-dom"
import { NavigationBar } from "../components/NavBar";
import { PatientServiceClient } from "../proto/list_patient/list_patient_grpc_web_pb";
import { Heart, Activity, Droplet, User, TrendingUp, AlertCircle } from "lucide-react";
import { ListPatientsRequest, Empty } from "../proto/list_patient/list_patient_pb";
import { RiskServiceClient } from "../proto/risk_ai/risk_grpc_web_pb";
import { SubmitRequest, GetRequest } from "../proto/risk_ai/risk_pb";
import { AuthenticationClient } from '../proto/auth_grpc_web_pb';
import { TokenRequest } from '../proto/auth_pb';
import { PatientDetailServiceClient } from "../proto/patient_detail/patient_detail_grpc_web_pb";
import {
  CreatePatientRequest,
  InsertPatientRecordsRequest,
  GetPatientDetailsRequest,
  UpdatePatientDetailsRequest,
  UpdateMedicalRecordsRequest,
  Patient,
  GeneralInformation,
  DiabetesInformation,
  HMODInformation,
  CKDInformation,
  CVDInformation
} from "../proto/patient_detail/patient_detail_pb";




export function PatientForm() {
    const [username,setUsername] = useState('');
    const [patients,setPatients] = useState([]);
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [patientId, setPatientId] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
    const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    "name": "",
    "age": "",
    "gender": "",
    "Serum Creatinine(mg/dL)": "",
      "eGFR(ml/min/1.73m-square)": "",
      "UACR(mg/g)": "",
      "FBG(mg/dL)": "",
      "HbA1c(%)": "",
      "LV Mass(g/m-square)": "",
      "Resting pulse(beats/minute)": "",
      "Microalbuminuria(mg/day)": "",
      "PWV(m/s)": "",
      "ABI": "",
      "Age (years)": "",
      "Total Cholesterol  (mg/dl)": "",
      "HDL(mg/dl)": "",
      "BP(mm of Hg)": "",
      "Average Daily Steps": "",
      "LDL(mg/dl)": "",
      "CACS": "",
      "Smoking (packs/year)": "",
      "NT-proBNP levels(pg/ml)": "",
      "Sex(M=1/F=0)": "",
  });
   const navigate = useNavigate();

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {

        navigate("/");
        return;
      }

  const req = new TokenRequest();
  req.setToken(token);

      const auth_client = new AuthenticationClient("http://localhost:10000");

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


      const patientClient = new PatientDetailServiceClient("http://localhost:10000");


    const grpcClient = new RiskServiceClient("http://localhost:10000");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



 const handleSubmit = (e) => {
  e.preventDefault();


  const req = new SubmitRequest();
  req.setSiteId("test");

  // set all non-empty form fields into the features map
  console.log(JSON.stringify(formData))
   const normalizedFormData = Object.fromEntries(
  Object.entries(formData).map(([key, value]) => [
    key,
    isNaN(value) || value === "" ? value : Number(value),
      ])
    );

  req.setFeaturesJson(JSON.stringify(normalizedFormData)); // stringify all features
    console.log(normalizedFormData)

  grpcClient.submitRisk(req, {}, (err, res) => {
    if (err) {
      console.error("Submit error:", err.message);
      return;
    }
    const id = res.getPatientId();
    if(isNewPatient)
        setPatientId(id);
    else
        setPatientId(selectedPatient);
    console.log("New patient id:", id);
    pollRisk(id);
  });
};
  const pollRisk = (id) => {
  const req = new GetRequest();
  req.setPatientId(id);

  grpcClient.getRisk(req, {}, (err, res) => {
    if (err) {
      console.error("Get error:", err.message);
      setTimeout(() => pollRisk(id), 20000);
      return;
    }

    const data = res.toObject();
     // Parse the JSON string fields into JS objects
      const parsedData = {
        ...data,
        probs: JSON.parse(data.probs || '{}'),
        disease_groups: JSON.parse(data.diseaseGroups || '{}')
      };

  console.log("Received classification:", parsedData);
  setRiskData(parsedData);
  setLoading(false);

  console.log(riskData)

  });
};

  const list_patient_client = new PatientServiceClient("http://localhost:10000");
  const fetchPatients = () => {

    list_patient_client.listAllPatients(new Empty(), {}, (err, response) => {
      if (err) console.error(err);
      else {
          console.log(response.getPatientsList())
        setPatients(response.getPatientsList());
      }
    });
  };

   useEffect(() => {
    fetchPatients();
  }, []);


  const handleSchedule = async (e) => {
  e.preventDefault(); // if it's inside a form

  try {
    const res = await fetch("http://localhost:10000/api/scheduler/process-risk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
     body: JSON.stringify({ patient_id: patientId }),

    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Processed patients:", data.processed_patients);
    alert(`Processed ${data.processed_patients.length} patient(s). Queue size: ${data.queue_size}`);
    await handleSave();
    console.log("Navigation");
    navigate("/scheduler");

  } catch (err) {
    console.error("Error scheduling patients:", err);
    alert("Failed to schedule patients. See console for details.");
  }
};



 const getRiskColor = (tier) => {
    if (tier.includes("P1")) return "from-red-500 to-red-600";
    if (tier.includes("P2")) return "from-yellow-500 to-orange-500";
    return "from-green-500 to-emerald-600";
  };

  const getRiskIcon = (disease) => {
    const icons = {
      cardiovascular: <Heart className="w-6 h-6" />,
      diabetes: <Activity className="w-6 h-6" />,
      kidney: <Droplet className="w-6 h-6" />,
      hypertension: <TrendingUp className="w-6 h-6" />
    };
    return icons[disease] || <AlertCircle className="w-6 h-6" />;
  };


  const handleSaveQueue = async () => {
      try {
            const response = await fetch("http://localhost:10000/api/scheduler/add_queue", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                patient_id: patientId,
                risk_data: riskData, // Entire risk object as JSON
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to add to queue: ${response.status}`);
            }

            await handleSave();
            const result = await response.json();
            console.log("Added to queue:", result);
            navigate('/scheduler')
          } catch (error) {
            console.error("Error adding to queue:", error);
          }
        };
  


  const handleSave = () => {
         return new Promise((resolve, reject) => {
         // Create new patient

      const patient = new Patient();

      Object.entries(riskData.probs).forEach(([disease, prob]) => {
      switch (disease) {
        case "dm":
          patient.setDiabetes(prob);
          break;
        case "hmod":
          patient.setHmod(prob);
          break;
        case "ckd":
          patient.setCkd(prob);
          break;
        case "cvd":
          patient.setCvd(prob);
          break;
        case "chd":
          patient.setChd(prob);
          break;
      }
    });
      patient.setRiskCategoryId(riskData.riskGroup);
      patient.setRiskDescription(riskData.riskGroup);
      // Create Patient object
      patient.setPatientId(patientId);
      patient.setName(formData.name);
      patient.setAge(parseInt(formData.age) || 0);
      patient.setGender(parseInt(formData.gender) || 0);

        // General Information
        const general = new GeneralInformation();
        general.setInfoId(0);
        general.setPid(patientId);
        general.setAvgDailySteps(parseInt(formData["Average Daily Steps"]) || 0);
        general.setHdl(parseInt(formData["HDL(mg/dl)"]) || 0);
        general.setLdl(parseInt(formData["LDL(mg/dl)"]) || 0);
        general.setCholesterol(parseFloat(formData["Total Cholesterol  (mg/dl)"]) || 0);
        general.setCacs(parseInt(formData["CACS"]) || 0);
        general.setRestingPulse(parseInt(formData["Resting pulse(beats/minute)"]) || 0);
        general.setTestDate(new Date().toISOString().split("T")[0]);

        // Diabetes Information
        const diabetes = new DiabetesInformation();
        diabetes.setDiabetesId(0);
        diabetes.setPid(patientId);
        diabetes.setFbg(parseInt(formData["FBG(mg/dL)"]) || 0);
        diabetes.setHba1c(parseFloat(formData["HbA1c(%)"]) || 0);
        diabetes.setTestDate(new Date().toISOString().split("T")[0]);

        // HMOD Information
        const hmod = new HMODInformation();
        hmod.setHmodId(0);
        hmod.setPid(patientId);
        hmod.setLvMass(parseInt(formData["LV Mass(g/m-square)"]) || 0);
        hmod.setMicroalbuminuria(parseInt(formData["Microalbuminuria(mg/day)"]) || 0);
        hmod.setPwv(parseFloat(formData["PWV(m/s)"]) || 0);
        hmod.setAbi(parseFloat(formData["ABI"]) || 0);
        hmod.setTestDate(new Date().toISOString().split("T")[0]);

        // CKD Information
        const ckd = new CKDInformation();
        ckd.setCkdId(0);
        ckd.setPid(patientId);
        ckd.setSerumCreatinine(parseFloat(formData["Serum Creatinine(mg/dL)"]) || 0);
        ckd.setEgfr(parseInt(formData["eGFR(ml/min/1.73m-square)"]) || 0);
        ckd.setUacr(parseInt(formData["UACR(mg/g)"]) || 0);
        ckd.setTestDate(new Date().toISOString().split("T")[0]);


        // CVD Information
        const cvd = new CVDInformation();
        cvd.setCvdId(0);
        cvd.setPid(patientId);
        cvd.setBp(formData["BP(mm of Hg)"] || "120/80");
        cvd.setSmoking(parseInt(formData["Smoking (packs/year)"]) || 0);
        cvd.setTestDate(new Date().toISOString().split("T")[0]);
        if(isNewPatient)
        {
             const req = new CreatePatientRequest();
             req.setCvdInfo(cvd);
             req.setCkdInfo(ckd);
             req.setDiabetesInfo(diabetes);
             req.setGeneralInfo(general);
             req.setPatient(patient);
             req.setHmodInfo(hmod);


            patientClient.createPatient(req, {}, (err, res) => {
                if (err) {
                  console.error("Error creating patient:", err);
                  alert("Failed to create patient");
                  reject(err);
                  return;
                }

                if (res.getSuccess()) {
                  alert(res.getMessage());
                  resolve(res)

                } else {
                  alert("Failed to create: " + res.getMessage());
                  reject(new Error(res.getMessage())); // ADDED: Reject on failure
                }
              });
          }else{
              const req = new InsertPatientRecordsRequest();
               req.setCvdInfo(cvd);
                 req.setCkdInfo(ckd);
                 req.setDiabetesInfo(diabetes);
                 req.setGeneralInfo(general);
                 req.setPatient(patient);
                 req.setHmodInfo(hmod);


             patientClient.insertPatientRecords(req, {}, (err, res) => {
                  if (err) {
                    console.error("Error inserting records:", err);
                    alert("Failed to insert records");
                    reject(err); // ADDED: Reject the promise on error
                    return;
                  }

                  if (res.getSuccess()) {
                    alert(res.getMessage());
                    resolve(res); // ADDED: Resolve the promise on success
                  } else {
                    alert("Failed to insert: " + res.getMessage());
                    reject(new Error(res.getMessage())); // ADDED: Reject on failure
                  }
                });


          }

      });

  }


 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <NavigationBar />

      {!riskData ? (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Patient Risk Assessment
              </h2>
              <p className="text-blue-100">
                Complete the form below for AI-powered risk analysis
              </p>
            </div>

            <div className="p-8">
              {/* Toggle Buttons */}
              <div className="flex gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => setIsNewPatient(true)}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    isNewPatient
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  New Patient
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewPatient(false)}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    !isNewPatient
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Existing Patient
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {!isNewPatient && (
                    <Section title="Existing Patient">
                        <select
                          value={selectedPatient}
                          onChange={(e) => setSelectedPatient(e.target.value)}
                          style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                        >
                          <option value="">Select a patient</option>
                          {patients.map((p, index) => (
                            <option key={index} value={p.getPatientId()}>
                              {p.getName()}
                            </option>
                          ))}
                        </select>
                      </Section>
                      )}


                {/* Demographic Section */}
                <Section title="Demographics" icon="👤">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <InputField label="Name" name="name" type= "text" value={formData["name"]} onChange={handleChange} />
                    <InputField label="Age (years)" name="Age (years)" value={formData["Age (years)"]} onChange={handleChange} />
                    <InputField label="Sex (M=1/F=0)" name="Sex(M=1/F=0)" value={formData["Sex(M=1/F=0)"]} onChange={handleChange} />
                    <InputField label="Average Daily Steps" name="Average Daily Steps" value={formData["Average Daily Steps"]} onChange={handleChange} />
                  </div>
                </Section>

                {/* Cardiovascular Section */}
                <Section title="Cardiovascular Markers" icon="❤️">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="BP (mm of Hg)" name="BP(mm of Hg)" value={formData["BP(mm of Hg)"]} onChange={handleChange} />
                    <InputField label="Resting Pulse (bpm)" name="Resting pulse(beats/minute)" value={formData["Resting pulse(beats/minute)"]} onChange={handleChange} />
                    <InputField label="LV Mass (g/m²)" name="LV Mass(g/m-square)" value={formData["LV Mass(g/m-square)"]} onChange={handleChange} />
                    <InputField label="PWV (m/s)" name="PWV(m/s)" value={formData["PWV(m/s)"]} onChange={handleChange} />
                    <InputField label="ABI" name="ABI" value={formData["ABI"]} onChange={handleChange} />
                    <InputField label="CACS" name="CACS" value={formData["CACS"]} onChange={handleChange} />
                    <InputField label="NT-proBNP (pg/ml)" name="NT-proBNP levels(pg/ml)" value={formData["NT-proBNP levels(pg/ml)"]} onChange={handleChange} />
                  </div>
                </Section>

                {/* Metabolic Section */}
                <Section title="Metabolic & Lipid Profile" icon="🧬">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="FBG (mg/dL)" name="FBG(mg/dL)" value={formData["FBG(mg/dL)"]} onChange={handleChange} />
                    <InputField label="HbA1c (%)" name="HbA1c(%)" value={formData["HbA1c(%)"]} onChange={handleChange} />
                    <InputField label="Total Cholesterol (mg/dl)" name="Total Cholesterol  (mg/dl)" value={formData["Total Cholesterol  (mg/dl)"]} onChange={handleChange} />
                    <InputField label="HDL (mg/dl)" name="HDL(mg/dl)" value={formData["HDL(mg/dl)"]} onChange={handleChange} />
                    <InputField label="LDL (mg/dl)" name="LDL(mg/dl)" value={formData["LDL(mg/dl)"]} onChange={handleChange} />
                  </div>
                </Section>

                {/* Renal Section */}
                <Section title="Renal Function" icon="💧">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Serum Creatinine (mg/dL)" name="Serum Creatinine(mg/dL)" value={formData["Serum Creatinine(mg/dL)"]} onChange={handleChange} />
                    <InputField label="eGFR (ml/min/1.73m²)" name="eGFR(ml/min/1.73m-square)" value={formData["eGFR(ml/min/1.73m-square)"]} onChange={handleChange} />
                    <InputField label="UACR (mg/g)" name="UACR(mg/g)" value={formData["UACR(mg/g)"]} onChange={handleChange} />
                    <InputField label="Microalbuminuria (mg/day)" name="Microalbuminuria(mg/day)" value={formData["Microalbuminuria(mg/day)"]} onChange={handleChange} />
                  </div>
                </Section>

                {/* Lifestyle Section */}
                <Section title="Lifestyle Factors" icon="🚬">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Smoking (packs/year)" name="Smoking (packs/year)" value={formData["Smoking (packs/year)"]} onChange={handleChange} />
                  </div>
                </Section>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <Activity className="w-5 h-5" />
                    Analyze Risk Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Risk Analysis Results
              </h2>
              <p className="text-blue-100">
                AI-powered disease risk assessment complete
              </p>
            </div>

            <div className="p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-600 font-medium">Analyzing patient data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(riskData.probs).map(([disease, prob]) => (
                    <div
                      key={disease}
                      className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-xl"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getRiskColor(riskData.disease_groups[disease])}`}></div>

                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${getRiskColor(riskData.disease_groups[disease])} text-white`}>
                              {getRiskIcon(disease)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-800 capitalize">
                                {disease}
                              </h3>
                              <p className="text-sm text-slate-500">Disease Risk</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Probability */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-slate-600">Probability</span>
                              <span className="text-2xl font-bold text-slate-800">{(prob * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${getRiskColor(riskData.disease_groups[disease])} transition-all duration-1000 ease-out`}
                                style={{ width: `${prob * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Risk Tier Badge */}
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${getRiskColor(riskData.disease_groups[disease])} text-white font-semibold text-sm`}>
                            <AlertCircle className="w-4 h-4" />
                            {riskData.disease_groups[disease]}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end mt-8 pt-8 border-t border-slate-200">
                <button
                  onClick={() => setRiskData(null)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300"
                >
                  New Assessment
                </button>
                 <button
                 onClick= {handleSaveQueue}
                 className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300">
                  Save & Schedule Later
                </button>

                <button
                onClick={handleSchedule}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Save & Schedule Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b-2 border-slate-200">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "number" }) {
  return (
    <div className="group">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none"
        step="any"
      />
    </div>
  );
}