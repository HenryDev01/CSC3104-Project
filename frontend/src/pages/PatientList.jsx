import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function PatientList() {
  const [data, setData] = useState({ total: 0, page: 1, page_size: 20, patients: [] });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);

  // Envoy URL depending on where frontend is served
  const API_BASE = useMemo(() => {
    return window.location.hostname === "localhost"
      ? "http://localhost:10000"
      : "http://envoy-service:10000";
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: "20",
      ...(q ? { q } : {}),
      ...(risk ? { risk } : {}),
      ...(gender ? { gender } : {}),
    });
    try {
      const res = await fetch(`${API_BASE}/list/patients?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Fetch error:", e);
      setData({ total: 0, page: 1, page_size: 20, patients: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // re-fetch when page changes

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.page_size || 20)));

  const navigate = useNavigate();

  const getRiskColor = (riskId) => {
    switch (riskId) {
      case "P1":
        return "bg-red-400/30 text-red-700 border border-red-400";
      case "P2":
        return "bg-orange-400/30 text-orange-700 border border-orange-400";
      case "P3":
        return "bg-yellow-300/30 text-yellow-700 border border-yellow-400";
      case "P4":
        return "bg-green-400/30 text-green-700 border border-green-400";
      default:
        return "bg-gray-200 text-gray-700 border border-gray-300";
    }
  };  

  return (
    <div className="min-h-screen bg-[url(../img/bg/2.jpg)] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 backdrop-blur-xs bg-black/10"></div>

      <div className="relative z-10 max-w-6xl mx-auto py-10 px-6">
        <h1 className="text-3xl font-bold text-[#E2A5A7] mb-6 tracking-widest">
          Patient List
        </h1>

        <div className="flex justify-start mb-6">
          <button
            onClick={() => navigate("/home")}
            className="px-4 py-2 bg-[#E2A5A7] text-white rounded-lg hover:bg-[#d18a8d] transition-colors shadow"
          >
            Back to Home
          </button>
        </div>

        {/* Filters */}
        <form
          onSubmit={onSearch}
          className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-sm text-gray-700 mb-1">Search Name</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. John"
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Risk</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="P1">P1 (Highest)</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4 (Lowest)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="1">Male</option>
              <option value="0">Female</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-[#E2A5A7] text-white py-2 rounded hover:bg-[#c78587] transition"
          >
            Apply
          </button>
        </form>

        {/* Table */}
        <div className="bg-white/85 rounded-2xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-600">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Age</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Gender</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Diabetes</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">CKD</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">CVD</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">CHD %</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.patients || []).map((p) => (
                    <tr key={p.PatientID} className="border-t">
                      <td className="px-4 py-3">{p.PatientID}</td>
                      <td
                        className="px-4 py-3 text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/patient/${p.PatientID}`)}>
                        {p.Name}
                      </td>
                      <td className="px-4 py-3">{p.Age}</td>
                      <td className="px-4 py-3">{p.Gender === 1 ? "Male" : "Female"}</td>
                      <td className="px-4 py-3">{p.Diabetes ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{p.CKD ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{p.CVD ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{Number(p.CHD).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(
                            p.RiskCategoryID
                          )}`}
                        >
                          {p.RiskCategoryID}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data.patients || data.patients.length === 0) && (
                    <tr>
                      <td className="px-4 py-6 text-gray-500" colSpan={9}>
                        No patients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-gray-600">
            Total: {data.total} • Page {data.page} / {Math.max(1, Math.ceil((data.total || 0) / (data.page_size || 20)))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setPage((p) =>
                  p < Math.max(1, Math.ceil((data.total || 0) / (data.page_size || 20)))
                    ? p + 1
                    : p
                )
              }
              disabled={page >= Math.max(1, Math.ceil((data.total || 0) / (data.page_size || 20)))}
              className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
