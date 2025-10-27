import { useEffect, useState } from "react";
import { NavigationBar } from "../components/NavBar";
import { PatientServiceClient } from "../proto/list_patient/list_patient_grpc_web_pb";
import { ListPatientsRequest } from "../proto/list_patient/list_patient_pb";

export function PatientList() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const client = new PatientServiceClient("http://localhost:10000");

  const fetchPatients = () => {
    const req = new ListPatientsRequest();
    req.setName(search);
    req.setSortBy(sortKey);
    req.setSortOrder(sortAsc ? "asc" : "desc");
    req.setPageNumber(page);
    req.setPageSize(pageSize);

    client.listPatients(req, {}, (err, response) => {
      if (err) console.error(err);
      else {
        setPatients(response.getPatientsList());
        setTotalCount(response.getTotalCount());
      }
    });
  };

  useEffect(() => {
    fetchPatients();
  }, [search, sortKey, sortAsc, page]);

const renderBadge = (value) => {
  let color = "bg-blue-200 text-blue-800";
  let display = value;

  if (typeof value === "number") {
    display = value.toFixed(2) + "%";
    if (value >= 75) color = "bg-red-200 text-red-800";
    else if (value >= 50) color = "bg-yellow-200 text-yellow-800";
    else if (value >= 25) color = "bg-orange-200 text-orange-800";
    else color = "bg-green-200 text-green-800";
  } else if (typeof value === "string") {
    display = value;
    if (value === "P1") color = "bg-red-200 text-red-800";
    else if (value === "P2") color = "bg-yellow-200 text-yellow-800";
    else if (value === "P3") color = "bg-orange-200 text-orange-800";
    else if (value === "P4") color = "bg-blue-200 text-blue-800";
  }

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${color}`}>
      {display}
    </span>
  );
};

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
          <div className="bg-white p-12 rounded-lg shadow-lg border border-gray-200 mb-6">

        <h2 className="text-3xl font-bold text-gray-800 mb-4">Patient List</h2>

        {/* Legend */}
        <div className="flex items-center space-x-4 mb-4">
          <Legend color="bg-red-200 text-red-800" label="P1: Critical" />
          <Legend color="bg-yellow-200 text-yellow-800" label="P2: Moderate Critical" />
          <Legend color="bg-orange-200 text-orange-800" label="P3: Moderate" />
          <Legend color="bg-blue-200 text-blue-800" label="P4: Low" />
        </div>

        {/* Search + Sort */}
        <div className="flex flex-wrap items-center space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:border-blue-300"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:border-blue-300"
          >
            <option value="">Sort by</option>
            <option value="Diabetes">Diabetes</option>
            <option value="Hmod">HMOD</option>
            <option value="Ckd">CKD</option>
            <option value="Cvd">CVD</option>
            <option value="Chd">CHD</option>
          </select>
          {sortKey && (
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              {sortAsc ? "Asc" : "Desc"}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                 <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">% Diabetes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">% HMOD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">% CKD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">% CVD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">% CHD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Risk Group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p, i) => (
                <tr key={i} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2">{p.getPatientId()}</td>
                  <td className="px-4 py-2">{p.getName()}</td>
                  <td className="px-4 py-2">{renderBadge(p.getDiabetes())}</td>
                  <td className="px-4 py-2">{renderBadge(p.getHmod())}</td>
                  <td className="px-4 py-2">{renderBadge(p.getCkd())}</td>
                  <td className="px-4 py-2">{renderBadge(p.getCvd())}</td>
                  <td className="px-4 py-2">{renderBadge(p.getChd())}</td>
                  <td className="px-4 py-2 font-semibold">{renderBadge(p.getRiskCategoryId())}</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

            {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>


        </div>

     </div>
    </>
  );
}

const Legend = ({ color, label }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{label}</span>
);
