import { useState } from "react";
import { NavigationBar } from "../components/NavBar";
import { PatientServiceClient } from "../proto/list_patient/list_patient_grpc_web_pb";
import { ListPatientsRequest } from "../proto/list_patient/list_patient_pb";
import { RiskServiceClient } from "../proto/risk_ai/risk_grpc_web_pb";
import { SubmitRequest, GetRequest } from "../proto/risk_ai/risk_pb";



export function PatientForm() {
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

  });
};
 return (
    <>
      <NavigationBar />
         {!riskData ? (
      <div className="max-w-5xl mx-auto mt-10 bg-white p-8 shadow rounded-xl">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          {isNewPatient ? "New Patient Consultation" : "Existing Patient Notes"}
        </h1>

        {/* toggle buttons */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            type="button"
            onClick={() => setIsNewPatient(true)}
            className={`px-4 py-2 rounded-lg border ${
              isNewPatient ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            New Patient
          </button>
          <button
            type="button"
            onClick={() => setIsNewPatient(false)}
            className={`px-4 py-2 rounded-lg border ${
              !isNewPatient ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Existing Patient
          </button>
        </div>


          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">


            <InputField label="Serum Creatinine (mg/dL)" name="Serum Creatinine(mg/dL)" value={formData["Serum Creatinine(mg/dL)"]} onChange={handleChange} />
            <InputField label="eGFR (ml/min/1.73m²)" name="eGFR(ml/min/1.73m-square)" value={formData["eGFR(ml/min/1.73m-square)"]} onChange={handleChange} />
            <InputField label="UACR (mg/g)" name="UACR(mg/g)" value={formData["UACR(mg/g)"]} onChange={handleChange} />
            <InputField label="FBG (mg/dL)" name="FBG(mg/dL)" value={formData["FBG(mg/dL)"]} onChange={handleChange} />
            <InputField label="HbA1c (%)" name="HbA1c(%)" value={formData["HbA1c(%)"]} onChange={handleChange} />
            <InputField label="LV Mass (g/m²)" name="LV Mass(g/m-square)" value={formData["LV Mass(g/m-square)"]} onChange={handleChange} />
            <InputField label="Resting Pulse (bpm)" name="Resting pulse(beats/minute)" value={formData["Resting pulse(beats/minute)"]} onChange={handleChange} />
            <InputField label="Microalbuminuria (mg/day)" name="Microalbuminuria(mg/day)" value={formData["Microalbuminuria(mg/day)"]} onChange={handleChange} />
            <InputField label="PWV (m/s)" name="PWV(m/s)" value={formData["PWV(m/s)"]} onChange={handleChange} />
            <InputField label="ABI" name="ABI" value={formData["ABI"]} onChange={handleChange} />
            <InputField label="Age (years)" name="Age (years)" value={formData["Age (years)"]} onChange={handleChange} />
            <InputField label="Total Cholesterol (mg/dl)" name="Total Cholesterol  (mg/dl)" value={formData["Total Cholesterol  (mg/dl)"]} onChange={handleChange} />
            <InputField label="HDL (mg/dl)" name="HDL(mg/dl)" value={formData["HDL(mg/dl)"]} onChange={handleChange} />
            <InputField label="BP (mm of Hg)" name="BP(mm of Hg)" value={formData["BP(mm of Hg)"]} onChange={handleChange} />
            <InputField label="Average Daily Steps" name="Average Daily Steps" value={formData["Average Daily Steps"]} onChange={handleChange} />
            <InputField label="LDL (mg/dl)" name="LDL(mg/dl)" value={formData["LDL(mg/dl)"]} onChange={handleChange} />
            <InputField label="CACS" name="CACS" value={formData["CACS"]} onChange={handleChange} />
            <InputField label="Smoking (packs/year)" name="Smoking (packs/year)" value={formData["Smoking (packs/year)"]} onChange={handleChange} />
            <InputField label="NT-proBNP levels (pg/ml)" name="NT-proBNP levels(pg/ml)" value={formData["NT-proBNP levels(pg/ml)"]} onChange={handleChange} />
            <InputField label="Sex (M=1/F=0)" name="Sex(M=1/F=0)" value={formData["Sex(M=1/F=0)"]} onChange={handleChange} />



            <div className="col-span-2 flex justify-end mt-6">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Proceed To Classification
              </button>
            </div>
          </form>
        </div>
              ) : (
                  <div className="max-w-5xl mx-auto mt-10 bg-white p-8 shadow rounded-xl">

                          <div className="mt-6">
                            <h2 className="text-xl font-bold mb-4">Risk Classification</h2>
                            {loading && <p>Loading results...</p>}
                            {riskData && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(riskData.probs).map(([disease, prob]) => (
                                  <div key={disease} className="p-4 border rounded-lg shadow">
                                    <h3 className="font-semibold">{disease.toUpperCase()}</h3>
                                    <p>Probability: {(prob * 100).toFixed(2)}%</p>
                                    <p>Risk Tier: {riskData.disease_groups[disease]}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                  </div>
                        )}

    </>
  );
}

function InputField({ label, name, value, onChange, type = "number", required = false, placeholder = "" }) {
  return (
    <div>
      <label className="block text-gray-700 font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
        step="any"
        required={required}
      />
    </div>
  );
}

function Card({animation,background,children})
{
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

     </div>
}

