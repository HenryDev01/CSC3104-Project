import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = useMemo(() => {
    return window.location.hostname === "localhost"
      ? "http://localhost:10000"
      : "http://envoy-service:10000";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/patient/details/${id}`);
        const json = await res.json();
        setPatient(json);
      } catch (e) {
        console.error("Error fetching details:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, API_BASE]);

  if (loading) {
    return <div className="p-10 text-gray-600">Loading…</div>;
  }

  if (!patient || patient.error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 mb-4">Patient not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  const InfoCard = ({ title, children }) => (
    <div className="bg-white/90 rounded-2xl shadow p-6">
      <h2 className="text-xl font-semibold text-[#E2A5A7] mb-3">{title}</h2>
      {children}
    </div>
  );

  const Field = ({ label, value }) => (
    <div className="flex justify-between py-1 text-gray-700">
      <span className="font-medium">{label}</span>
      <span>{value ?? "-"}</span>
    </div>
  );

  const yesNo = (v) => (v ? "Yes" : "No");

  return (
    <div className="min-h-screen bg-[url(../img/bg/2.jpg)] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>

      <div className="relative z-10 max-w-5xl mx-auto py-10 px-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-white/80 rounded shadow hover:bg-white"
        >
          ← Back
        </button>

        <div className="bg-white/90 rounded-2xl shadow p-6">
          <h1 className="text-3xl font-bold text-[#E2A5A7] mb-2">
            {patient.Name} (ID: {patient.PatientID})
          </h1>
          <p className="text-gray-600">
            Risk: <b>{patient.RiskDescription}</b> ({patient.RiskCategoryID}) • CHD:{" "}
            <b>{patient.CHD}%</b>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard title="Profile">
            <Field label="Age" value={patient.Age} />
            <Field label="Gender" value={patient.Gender === 1 ? "Male" : "Female"} />
            <Field label="Diabetes" value={yesNo(patient.Diabetes)} />
            <Field label="HMOD" value={yesNo(patient.HMOD)} />
            <Field label="CKD" value={yesNo(patient.CKD)} />
            <Field label="CVD" value={yesNo(patient.CVD)} />
          </InfoCard>

          <InfoCard title="General (latest)">
            <Field label="Avg Daily Steps" value={patient.general?.AvgDailySteps} />
            <Field label="HDL" value={patient.general?.HDL} />
            <Field label="LDL" value={patient.general?.LDL} />
            <Field label="Cholesterol" value={patient.general?.Cholesterol} />
            <Field label="CACS" value={patient.general?.CACS} />
            <Field label="Resting Pulse" value={patient.general?.RestingPulse} />
            <Field label="Test Date" value={patient.general?.TestDate} />
          </InfoCard>

          <InfoCard title="Diabetes (latest)">
            <Field label="FBG" value={patient.diabetes?.FBG} />
            <Field label="HbA1c" value={patient.diabetes?.HbA1c} />
            <Field label="Test Date" value={patient.diabetes?.TestDate} />
          </InfoCard>

          <InfoCard title="HMOD (latest)">
            <Field label="LV Mass" value={patient.hmod?.LVMass} />
            <Field label="Microalbuminuria" value={patient.hmod?.Microalbuminuria} />
            <Field label="PWV" value={patient.hmod?.PWV} />
            <Field label="ABI" value={patient.hmod?.ABI} />
            <Field label="Test Date" value={patient.hmod?.TestDate} />
          </InfoCard>

          <InfoCard title="CKD (latest)">
            <Field label="Serum Creatinine" value={patient.ckd?.SerumCreatinine} />
            <Field label="eGFR" value={patient.ckd?.eGFR} />
            <Field label="UACR" value={patient.ckd?.UACR} />
            <Field label="Test Date" value={patient.ckd?.TestDate} />
          </InfoCard>

          <InfoCard title="CVD (latest)">
            <Field label="BP" value={patient.cvd?.BP} />
            <Field label="Smoking" value={patient.cvd?.Smoking ? "Yes" : "No"} />
            <Field label="Test Date" value={patient.cvd?.TestDate} />
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
