import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PatientDetailServiceClient } from "../proto/patient_detail/patient_detail_grpc_web_pb";
import {
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
import { AuthenticationClient } from '../proto/auth_grpc_web_pb';
import { TokenRequest } from '../proto/auth_pb';
import { NavigationBar } from "../components/NavBar";
import { Edit2, Save, X, AlertCircle, CheckCircle, Plus, Trash2 } from "lucide-react";

export function PatientRiskDetail() {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({ type: "", message: "" });

  const { patientId } = useParams();
  const [username, setUsername] = useState('');

  const [patient, setPatient] = useState(null);
  const [generalInfo, setGeneralInfo] = useState([]);
  const [diabetesInfo, setDiabetesInfo] = useState([]);
  const [hmodInfo, setHmodInfo] = useState([]);
  const [ckdInfo, setCkdInfo] = useState([]);
  const [cvdInfo, setCvdInfo] = useState([]);

  // Editable versions of the info arrays
  const [editedGeneralInfo, setEditedGeneralInfo] = useState([]);
  const [editedDiabetesInfo, setEditedDiabetesInfo] = useState([]);
  const [editedHmodInfo, setEditedHmodInfo] = useState([]);
  const [editedCkdInfo, setEditedCkdInfo] = useState([]);
  const [editedCvdInfo, setEditedCvdInfo] = useState([]);

  const [loading, setLoading] = useState(true);

  const client = new PatientDetailServiceClient("http://localhost:10000");
  const auth_client = new AuthenticationClient("http://localhost:10000");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const req = new TokenRequest();
    req.setToken(token);

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

  useEffect(() => {
    const fetchDetail = () => {
      const req = new GetPatientDetailsRequest();
      console.log(patientId);
      req.setPatientId(patientId);

      client.getPatientDetails(req, {}, (err, res) => {
        if (err) {
          console.error("Error fetching details:", err);
          setLoading(false);
          return;
        }

        const patientData = res.getPatient();
        setPatient(patientData);
        setEditedPatient({
          patientId: patientData.getPatientId(),
          name: patientData.getName(),
          age: patientData.getAge(),
          gender: patientData.getGender(),
          diabetes: patientData.getDiabetes(),
          hmod: patientData.getHmod(),
          ckd: patientData.getCkd(),
          cvd: patientData.getCvd(),
          chd: patientData.getChd(),
          riskCategoryId: patientData.getRiskCategoryId(),
        });

        const generalList = res.getGeneralInfoList();
        const diabetesList = res.getDiabetesInfoList();
        const hmodList = res.getHmodInfoList();
        const ckdList = res.getCkdInfoList();
        const cvdList = res.getCvdInfoList();

        setGeneralInfo(generalList);
        setDiabetesInfo(diabetesList);
        setHmodInfo(hmodList);
        setCkdInfo(ckdList);
        setCvdInfo(cvdList);

        // Initialize editable versions
        setEditedGeneralInfo(generalList.map(item => item.toObject()));
        setEditedDiabetesInfo(diabetesList.map(item => item.toObject()));
        setEditedHmodInfo(hmodList.map(item => item.toObject()));
        setEditedCkdInfo(ckdList.map(item => item.toObject()));
        setEditedCvdInfo(cvdList.map(item => item.toObject()));

        setLoading(false);
      });
    };

    fetchDetail();
  }, [patientId]);

  const handleEditClick = () => {
    setIsEditing(true);
    setUpdateStatus({ type: "", message: "" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original patient data
    setEditedPatient({
      patientId: patient.getPatientId(),
      name: patient.getName(),
      age: patient.getAge(),
      gender: patient.getGender(),
      diabetes: patient.getDiabetes(),
      hmod: patient.getHmod(),
      ckd: patient.getCkd(),
      cvd: patient.getCvd(),
      chd: patient.getChd(),
      riskCategoryId: patient.getRiskCategoryId(),
    });

    // Reset info arrays
    setEditedGeneralInfo(generalInfo.map(item => item.toObject()));
    setEditedDiabetesInfo(diabetesInfo.map(item => item.toObject()));
    setEditedHmodInfo(hmodInfo.map(item => item.toObject()));
    setEditedCkdInfo(ckdInfo.map(item => item.toObject()));
    setEditedCvdInfo(cvdInfo.map(item => item.toObject()));

    setUpdateStatus({ type: "", message: "" });
  };

  const handleInputChange = (field, value) => {
    setEditedPatient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveClick = () => {
    // First update patient basic info
    const patientReq = new UpdatePatientDetailsRequest();
    const updatedPatient = new Patient();

    updatedPatient.setPatientId(editedPatient.patientId);
    updatedPatient.setName(editedPatient.name);
    updatedPatient.setAge(parseInt(editedPatient.age));
    updatedPatient.setGender(parseInt(editedPatient.gender));
    updatedPatient.setDiabetes(parseFloat(editedPatient.diabetes));
    updatedPatient.setHmod(parseFloat(editedPatient.hmod));
    updatedPatient.setCkd(parseFloat(editedPatient.ckd));
    updatedPatient.setCvd(parseFloat(editedPatient.cvd));
    updatedPatient.setChd(parseFloat(editedPatient.chd));
    updatedPatient.setRiskCategoryId(editedPatient.riskCategoryId);

    patientReq.setPatient(updatedPatient);

    client.updatePatientDetails(patientReq, {}, (err, res) => {
      if (err) {
        console.error("Error updating patient:", err);
        setUpdateStatus({
          type: "error",
          message: "Failed to update patient: " + err.message
        });
        return;
      }

      if (res.getSuccess()) {
        const newPatient = res.getUpdatedPatient();
        setPatient(newPatient);

        // Now update medical records
        updateMedicalRecords();
      } else {
        setUpdateStatus({
          type: "error",
          message: res.getMessage()
        });
      }
    });
  };

  const updateMedicalRecords = () => {
    const req = new UpdateMedicalRecordsRequest();
    req.setPatientId(patientId);

    // Convert and add General Information
    editedGeneralInfo.forEach(info => {
      const generalInfo = new GeneralInformation();
      generalInfo.setInfoId(info.infoId || 0);
      generalInfo.setPid(info.pid);
      generalInfo.setAvgDailySteps(parseInt(info.avgDailySteps) || 0);
      generalInfo.setHdl(parseInt(info.hdl) || 0);
      generalInfo.setLdl(parseInt(info.ldl) || 0);
      generalInfo.setCholesterol(parseFloat(info.cholesterol) || 0);
      generalInfo.setCacs(parseInt(info.cacs) || 0);
      generalInfo.setRestingPulse(parseInt(info.restingPulse) || 0);
      generalInfo.setTestDate(info.testDate || '');
      req.addGeneralInfo(generalInfo);
    });

    // Convert and add Diabetes Information
    editedDiabetesInfo.forEach(info => {
      const diabetesInfo = new DiabetesInformation();
      diabetesInfo.setDiabetesId(info.diabetesId || 0);
      diabetesInfo.setPid(info.pid);
      diabetesInfo.setFbg(parseInt(info.fbg) || 0);
      diabetesInfo.setHba1c(parseFloat(info.hba1c) || 0);
      diabetesInfo.setTestDate(info.testDate || '');
      req.addDiabetesInfo(diabetesInfo);
    });

    // Convert and add HMOD Information
    editedHmodInfo.forEach(info => {
      const hmodInfo = new HMODInformation();
      hmodInfo.setHmodId(info.hmodId || 0);
      hmodInfo.setPid(info.pid);
      hmodInfo.setLvMass(parseInt(info.lvMass) || 0);
      hmodInfo.setMicroalbuminuria(parseInt(info.microalbuminuria) || 0);
      hmodInfo.setPwv(parseFloat(info.pwv) || 0);
      hmodInfo.setAbi(parseFloat(info.abi) || 0);
      hmodInfo.setTestDate(info.testDate || '');
      req.addHmodInfo(hmodInfo);
    });

    // Convert and add CKD Information
    editedCkdInfo.forEach(info => {
      const ckdInfo = new CKDInformation();
      ckdInfo.setCkdId(info.ckdId || 0);
      ckdInfo.setPid(info.pid);
      ckdInfo.setSerumCreatinine(parseFloat(info.serumCreatinine) || 0);
      ckdInfo.setEgfr(parseInt(info.egfr) || 0);
      ckdInfo.setUacr(parseInt(info.uacr) || 0);
      ckdInfo.setTestDate(info.testDate || '');
      req.addCkdInfo(ckdInfo);
    });

    // Convert and add CVD Information
    editedCvdInfo.forEach(info => {
      const cvdInfo = new CVDInformation();
      cvdInfo.setCvdId(info.cvdId || 0);
      cvdInfo.setPid(info.pid);
      cvdInfo.setBp(info.bp || '120/80');
      cvdInfo.setSmoking(parseInt(info.smoking) || 0);
      cvdInfo.setTestDate(info.testDate || '');
      req.addCvdInfo(cvdInfo);
    });

    // Call the updateMedicalRecords endpoint
    client.updateMedicalRecords(req, {}, (err, res) => {
      if (err) {
        console.error("Error updating medical records:", err);
        setUpdateStatus({
          type: "error",
          message: "Patient updated but failed to update medical records: " + err.message
        });
        return;
      }

      if (res.getSuccess()) {
        setUpdateStatus({
          type: "success",
          message: "Patient and medical records updated successfully!"
        });
        setIsEditing(false);

        // Refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUpdateStatus({
          type: "error",
          message: "Patient updated but medical records update failed: " + res.getMessage()
        });
      }
    });
  };

  // Add new record functions
  const handleAddGeneralInfo = () => {
    setEditedGeneralInfo([...editedGeneralInfo, {
      infoId: 0,
      pid: parseInt(patientId),
      avgDailySteps: 0,
      hdl: 0,
      ldl: 0,
      cholesterol: 0,
      cacs: 0,
      restingPulse: 0,
      testDate: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleAddDiabetesInfo = () => {
    setEditedDiabetesInfo([...editedDiabetesInfo, {
      diabetesId: 0,
      pid: parseInt(patientId),
      fbg: 0,
      hba1c: 0,
      testDate: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleAddHmodInfo = () => {
    setEditedHmodInfo([...editedHmodInfo, {
      hmodId: 0,
      pid: parseInt(patientId),
      lvMass: 0,
      microalbuminuria: 0,
      pwv: 0,
      abi: 0,
      testDate: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleAddCkdInfo = () => {
    setEditedCkdInfo([...editedCkdInfo, {
      ckdId: 0,
      pid: parseInt(patientId),
      serumCreatinine: 0,
      egfr: 0,
      uacr: 0,
      testDate: new Date().toISOString().split('T')[0]
    }]);
  };

  const handleAddCvdInfo = () => {
    setEditedCvdInfo([...editedCvdInfo, {
      cvdId: 0,
      pid: parseInt(patientId),
      bp: "120/80",
      smoking: 0,
      testDate: new Date().toISOString().split('T')[0]
    }]);
  };

  // Delete record functions
  const handleDeleteRecord = (type, index) => {
    switch(type) {
      case 'general':
        setEditedGeneralInfo(editedGeneralInfo.filter((_, i) => i !== index));
        break;
      case 'diabetes':
        setEditedDiabetesInfo(editedDiabetesInfo.filter((_, i) => i !== index));
        break;
      case 'hmod':
        setEditedHmodInfo(editedHmodInfo.filter((_, i) => i !== index));
        break;
      case 'ckd':
        setEditedCkdInfo(editedCkdInfo.filter((_, i) => i !== index));
        break;
      case 'cvd':
        setEditedCvdInfo(editedCvdInfo.filter((_, i) => i !== index));
        break;
    }
  };

  // Update record field functions
  const handleUpdateField = (type, index, field, value) => {
    switch(type) {
      case 'general':
        const newGeneral = [...editedGeneralInfo];
        newGeneral[index] = { ...newGeneral[index], [field]: value };
        setEditedGeneralInfo(newGeneral);
        break;
      case 'diabetes':
        const newDiabetes = [...editedDiabetesInfo];
        newDiabetes[index] = { ...newDiabetes[index], [field]: value };
        setEditedDiabetesInfo(newDiabetes);
        break;
      case 'hmod':
        const newHmod = [...editedHmodInfo];
        newHmod[index] = { ...newHmod[index], [field]: value };
        setEditedHmodInfo(newHmod);
        break;
      case 'ckd':
        const newCkd = [...editedCkdInfo];
        newCkd[index] = { ...newCkd[index], [field]: value };
        setEditedCkdInfo(newCkd);
        break;
      case 'cvd':
        const newCvd = [...editedCvdInfo];
        newCvd[index] = { ...newCvd[index], [field]: value };
        setEditedCvdInfo(newCvd);
        break;
    }
  };

      const handleAddToQueue = async () => {
      if (!patient) return;

      const riskData = {
        diabetes: patient.getDiabetes(),
        hmod: patient.getHmod(),
        ckd: patient.getCkd(),
        cvd: patient.getCvd(),
        chd: patient.getChd(),
        riskGroup: patient.getRiskCategoryId()
      };

      try {
        const response = await fetch("http://localhost:10000/api/scheduler/add_queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patient.getPatientId(),
            risk_data: riskData
          })
        });

        const data = await response.json();

        if (data.success) {
          setUpdateStatus({
            type: "success",
            message: data.message
          });
        } else {
          setUpdateStatus({
            type: "error",
            message: data.error || "Failed to add to queue"
          });
        }
      } catch (err) {
        console.error("Error adding to queue:", err);
        setUpdateStatus({
          type: "error",
          message: "Failed to connect to scheduler service"
        });
      }
    };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-slate-700">Loading patient details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!patient) {
    return (
      <>
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-center text-xl font-semibold text-red-600">No data found for this patient</p>
            <Link
              to="/patient_list"
              className="mt-6 block text-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Back to Patient List
            </Link>
          </div>
        </div>
      </>
    );
  }

  const renderBadge = (value, type = "percentage") => {
    let color = "bg-blue-100 text-blue-700";
    let display = value;

    if (type === "percentage" && typeof value === "number") {
      display = value.toFixed(2) + "%";
      if (value >= 75) color = "bg-red-100 text-red-700";
      else if (value >= 50) color = "bg-yellow-100 text-yellow-700";
      else if (value >= 25) color = "bg-orange-100 text-orange-700";
      else color = "bg-green-100 text-green-700";
    } else if (type === "risk" && typeof value === "string") {
      if (value === "P1") color = "bg-red-100 text-red-700";
      else if (value === "P2") color = "bg-yellow-100 text-yellow-700";
      else if (value === "P3") color = "bg-orange-100 text-orange-700";
      else if (value === "P4") color = "bg-blue-100 text-blue-700";
    }

    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{display}</span>;
  };

  const renderEditableTable = (title, data, type, onAdd) => {
    if (!isEditing && (!data || data.length === 0)) return null;

    const keys = data && data.length > 0 ? Object.keys(data[0]) : [];

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>

        </div>

        {data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  {keys.map((key, idx) => (
                    <th key={idx} className="px-4 py-3 text-left font-semibold text-slate-700">
                      {key}
                    </th>
                  ))}
                  {isEditing && (
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    {keys.map((key, i) => (
                      <td key={i} className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type={typeof row[key] === 'number' ? 'number' : 'text'}
                            value={row[key]}
                            onChange={(e) => handleUpdateField(type, idx, key,
                              typeof row[key] === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                            )}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                            step={typeof row[key] === 'number' ? '0.01' : undefined}
                          />
                        ) : (
                          <span className="text-slate-600">{row[key]}</span>
                        )}
                      </td>
                    ))}
                    {isEditing && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteRecord(type, idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No records available. Click "Add Record" to create one.</p>
        )}
      </div>
    );
  };

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <Link
            to="/patient_list"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            ← Back to Patient List
          </Link>

          {/* Status Alert */}
          {updateStatus.message && (
            <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
              updateStatus.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {updateStatus.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{updateStatus.message}</span>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Patient Details</h1>
                <p className="text-blue-100">Complete medical record and risk assessment</p>
              </div>

                 {/* Add to Queue Button */}
                <button
                  onClick={handleAddToQueue}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-slate-800 rounded-xl font-semibold hover:bg-yellow-500 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  Add to Queue
                </button>

              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Patient
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveClick}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="p-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <InfoRow label="Patient ID" value={patient.getPatientId()} isEditing={false} />

                  <InfoRow
                    label="Name"
                    value={isEditing ? editedPatient.name : patient.getName()}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange('name', value)}
                    type="text"
                  />

                  <InfoRow
                    label="Age"
                    value={isEditing ? editedPatient.age : patient.getAge()}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange('age', value)}
                    type="number"
                  />

                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700 w-32">Gender:</label>
                    {isEditing ? (
                      <select
                        value={editedPatient.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none"
                      >
                        <option value={1}>Male</option>
                        <option value={0}>Female</option>
                      </select>
                    ) : (
                      <span className="text-slate-800">{patient.getGender() === 1 ? "Male" : "Female"}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700 w-32">Risk Category:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedPatient.riskCategoryId}
                        onChange={(e) => handleInputChange('riskCategoryId', e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {renderBadge(patient.getRiskCategoryId(), "risk")}
                        <span className="text-slate-600">({patient.getRiskDescription()})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk Percentages */}
              <h3 className="text-xl font-bold text-slate-800 mb-4">Disease Risk Percentages</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <RiskCard
                  title="Diabetes"
                  value={isEditing ? editedPatient.diabetes : patient.getDiabetes()}
                  isEditing={isEditing}
                  onChange={(value) => handleInputChange('diabetes', value)}
                />
                <RiskCard
                  title="HMOD"
                  value={isEditing ? editedPatient.hmod : patient.getHmod()}
                  isEditing={isEditing}
                  onChange={(value) => handleInputChange('hmod', value)}
                />
                <RiskCard
                  title="CKD"
                  value={isEditing ? editedPatient.ckd : patient.getCkd()}
                  isEditing={isEditing}
                  onChange={(value) => handleInputChange('ckd', value)}
                />
                <RiskCard
                  title="CVD"
                  value={isEditing ? editedPatient.cvd : patient.getCvd()}
                  isEditing={isEditing}
                  onChange={(value) => handleInputChange('cvd', value)}
                />
                <RiskCard
                  title="CHD"
                  value={isEditing ? editedPatient.chd : patient.getChd()}
                  isEditing={isEditing}
                  onChange={(value) => handleInputChange('chd', value)}
                />
              </div>

              {/* Data Tables */}
              <h3 className="text-xl font-bold text-slate-800 mb-4 mt-8">Medical Records</h3>
              {renderEditableTable("General Information", isEditing ? editedGeneralInfo : generalInfo.map(i => i.toObject()), 'general', handleAddGeneralInfo)}
              {renderEditableTable("Diabetes Information", isEditing ? editedDiabetesInfo : diabetesInfo.map(i => i.toObject()), 'diabetes', handleAddDiabetesInfo)}
              {renderEditableTable("HMOD Information", isEditing ? editedHmodInfo : hmodInfo.map(i => i.toObject()), 'hmod', handleAddHmodInfo)}
              {renderEditableTable("CKD Information", isEditing ? editedCkdInfo : ckdInfo.map(i => i.toObject()), 'ckd', handleAddCkdInfo)}
              {renderEditableTable("CVD Information", isEditing ? editedCvdInfo : cvdInfo.map(i => i.toObject()), 'cvd', handleAddCvdInfo)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, isEditing, onChange, type = "text" }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-semibold text-slate-700 w-32">{label}:</label>
      {isEditing && onChange ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all duration-300 outline-none"
          step={type === "number" ? "0.01" : undefined}
        />
      ) : (
        <span className="text-slate-800">{value}</span>
      )}
    </div>
  );
}

function RiskCard({ title, value, isEditing, onChange }) {
  let color = "bg-blue-100 text-blue-700 border-blue-200";
  const numValue = parseFloat(value);

  if (numValue >= 75) color = "bg-red-100 text-red-700 border-red-200";
  else if (numValue >= 50) color = "bg-yellow-100 text-yellow-700 border-yellow-200";
  else if (numValue >= 25) color = "bg-orange-100 text-orange-700 border-orange-200";
  else color = "bg-green-100 text-green-700 border-green-200";

  return (
    <div className={`rounded-2xl border-2 p-5 text-center transition-all duration-300 ${isEditing ? 'bg-white' : color}`}>
      <h3 className={`font-semibold mb-2 ${isEditing ? 'text-slate-700' : ''}`}>{title}</h3>
      {isEditing ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step="0.01"
          className="w-full px-3 py-2 text-center border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      ) : (
        <p className="text-2xl font-bold">{numValue.toFixed(2)}%</p>
      )}
    </div>
  );
}