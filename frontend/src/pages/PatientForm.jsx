// import {Link} from "react-router-dom"
// import {NavigationBar} from "../components/NavBar"


// export function PatientForm() {
//   return (
//       <>
//     <NavigationBar/>
//     <h1>Hello world 3</h1>
//     </>
//   );
// }


import React, { useState, useEffect } from 'react';
import { NavigationBar } from "../components/NavBar";
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE = "http://localhost:10000";

export function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // If ID exists, we're editing
  const isEditMode = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 1,
    diabetes: false,
    hmod: false,
    ckd: false,
    cvd: false,
    chd: 0
  });

  // Load patient data if editing
  useEffect(() => {
    if (isEditMode) {
      loadPatientData();
    }
  }, [id]);

  const loadPatientData = async () => {
    try {
      const response = await fetch(`${API_BASE}/patient/details/${id}`);
      const data = await response.json();
      
      if (data.success) {
        const p = data.patient;
        setFormData({
          name: p.Name,
          age: p.Age,
          gender: p.Gender,
          diabetes: Boolean(p.Diabetes),
          hmod: Boolean(p.HMOD),
          ckd: Boolean(p.CKD),
          cvd: Boolean(p.CVD),
          chd: p.CHD || 0
        });
      }
    } catch (err) {
      setError(`Failed to load patient data: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const url = isEditMode 
        ? `${API_BASE}/patient/update/${id}`
        : `${API_BASE}/patient/create`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Patient ${isEditMode ? 'updated' : 'created'} successfully!`);
        navigate(`/patient/${data.patient_id}`);
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} patient`);
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <>
      <NavigationBar />
      <div className="container mx-auto p-6 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">
          {isEditMode ? 'Edit Patient' : 'Add New Patient'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isEditMode ? 'Update patient information' : 'Fill in the patient\'s basic information'}
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8">
          
          {/* Basic Information */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
              Basic Information
            </h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., John Tan"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min="0"
                  max="120"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 45"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value={1}>Male</option>
                  <option value={0}>Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Health Conditions */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
              Health Conditions
            </h2>
            <p className="text-sm text-gray-600 mb-3">Select all conditions that apply:</p>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-3 border rounded hover:bg-blue-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="diabetes"
                  checked={formData.diabetes}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700 font-medium">Diabetes</span>
              </label>

              <label className="flex items-center p-3 border rounded hover:bg-blue-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="hmod"
                  checked={formData.hmod}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700 font-medium">HMOD</span>
              </label>

              <label className="flex items-center p-3 border rounded hover:bg-blue-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="ckd"
                  checked={formData.ckd}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700 font-medium">CKD</span>
              </label>

              <label className="flex items-center p-3 border rounded hover:bg-blue-50 cursor-pointer">
                <input
                  type="checkbox"
                  name="cvd"
                  checked={formData.cvd}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700 font-medium">CVD</span>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/patient_list')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed text-gray-700' 
                  : 'bg-blue-500 hover:bg-blue-700 text-white'
              }`}
            >
              {loading 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? '✓ Update Patient' : '✓ Create Patient')
              }
            </button>
          </div>
        </form>
      </div>
    </>
  );
}