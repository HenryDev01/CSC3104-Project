import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PatientDetailServiceClient } from "../proto/patient_detail/patient_detail_grpc_web_pb";
import { GetPatientDetailsRequest } from "../proto/patient_detail/patient_detail_pb";
import { NavigationBar } from "../components/NavBar";

export function PatientRiskDetail() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [generalInfo, setGeneralInfo] = useState([]);
  const [diabetesInfo, setDiabetesInfo] = useState([]);
  const [hmodInfo, setHmodInfo] = useState([]);
  const [ckdInfo, setCkdInfo] = useState([]);
  const [cvdInfo, setCvdInfo] = useState([]);
  const [loading, setLoading] = useState(true);

  const client = new PatientDetailServiceClient("http://localhost:10000");

  useEffect(() => {
    const fetchDetail = () => {
      const req = new GetPatientDetailsRequest();
      req.setPatientId(parseInt(patientId));

      client.getPatientDetails(req, {}, (err, res) => {
        if (err) {
          console.error("Error fetching details:", err);
          setLoading(false);
          return;
        }

        setPatient(res.getPatient());
        setGeneralInfo(res.getGeneralInfoList());
        setDiabetesInfo(res.getDiabetesInfoList());
        setHmodInfo(res.getHmodInfoList());
        setCkdInfo(res.getCkdInfoList());
        setCvdInfo(res.getCvdInfoList());
        setLoading(false);
      });
    };

    fetchDetail();
  }, [patientId]);

  if (loading) return <div className="p-8 text-center text-lg font-semibold">Loading patient details...</div>;
  if (!patient) return <div className="p-8 text-center text-red-600">No data found for this patient.</div>;

  const renderBadge = (value, type = "percentage") => {
    let color = "bg-blue-200 text-blue-800";
    let display = value;

    if (type === "percentage" && typeof value === "number") {
      display = value.toFixed(2) + "%";
      if (value >= 75) color = "bg-red-200 text-red-800";
      else if (value >= 50) color = "bg-yellow-200 text-yellow-800";
      else if (value >= 25) color = "bg-orange-200 text-orange-800";
      else color = "bg-green-200 text-green-800";
    } else if (type === "risk" && typeof value === "string") {
      if (value === "P1") color = "bg-red-200 text-red-800";
      else if (value === "P2") color = "bg-yellow-200 text-yellow-800";
      else if (value === "P3") color = "bg-orange-200 text-orange-800";
      else if (value === "P4") color = "bg-blue-200 text-blue-800";
    }

    return <span className={`px-2 py-1 rounded-full text-sm font-semibold ${color}`}>{display}</span>;
  };

  const renderTable = (title, data) => {
    if (!data || data.length === 0) return null;
    const keys = Object.keys(data[0].toObject());
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">{title}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border">
            <thead className="bg-blue-50">
              <tr>
                {keys.map((key, idx) => (
                  <th key={idx} className="px-3 py-2 font-semibold text-gray-700 border-b">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50">
                  {keys.map((key, i) => (
                    <td key={i} className="px-3 py-2 border-b">{row.toObject()[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <NavigationBar />
      <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
        <Link to="/patient_list" className="text-blue-600 hover:underline">&larr; Back to List</Link>

        <div className="bg-white p-12 rounded-lg shadow-lg border border-gray-200 mt-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Patient Details</h1>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p><strong>ID:</strong> {patient.getPatientId()}</p>
              <p><strong>Name:</strong> {patient.getName()}</p>
              <p><strong>Age:</strong> {patient.getAge()}</p>
              <p><strong>Gender:</strong> {patient.getGender() === 1 ? "Male" : "Female"}</p>
            </div>
            <div>
              <p><strong>Risk:</strong> {renderBadge(patient.getRiskCategoryId(), "risk")} ({patient.getRiskDescription()})</p>
            </div>
          </div>

          {/* Risk Percentages */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <InfoCard title="Diabetes" value={patient.getDiabetes()} />
            <InfoCard title="HMOD" value={patient.getHmod()} />
            <InfoCard title="CKD" value={patient.getCkd()} />
            <InfoCard title="CVD" value={patient.getCvd()} />
            <InfoCard title="CHD" value={patient.getChd()} />
          </div>

          {/* Table Sections */}
          {renderTable("General Information", generalInfo)}
          {renderTable("Diabetes Information", diabetesInfo)}
          {renderTable("HMOD Information", hmodInfo)}
          {renderTable("CKD Information", ckdInfo)}
          {renderTable("CVD Information", cvdInfo)}
        </div>
      </div>
    </>
  );
}

function InfoCard({ title, value }) {
  let color = "bg-blue-200 text-blue-800";
  if (value >= 75) color = "bg-red-200 text-red-800";
  else if (value >= 50) color = "bg-yellow-200 text-yellow-800";
  else if (value >= 25) color = "bg-orange-200 text-orange-800";
  else color = "bg-green-200 text-green-800";

  return (
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <h3 className="text-gray-600 font-semibold">{title}</h3>
      <p className={`text-xl font-bold ${color}`}>{value.toFixed(2)}%</p>
    </div>
  );
}
