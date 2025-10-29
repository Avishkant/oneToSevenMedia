import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import { motion } from "framer-motion";
import { FaUserTag, FaUsers, FaSearch, FaFilter, FaRedo, FaDownload, FaAngleLeft, FaAngleRight } from "react-icons/fa";

// --- Custom Styled Input/Select Components ---
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

const StyledSelect = ({ className = "", children, ...props }) => (
  <select
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className} appearance-none cursor-pointer`}
    {...props}
  >
    {children}
  </select>
);

// --- Main Component ---

export default function InfluencersList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState("influencers"); // or 'admins'
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // --- Data Loading Logic (Improved for clarity) ---
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        async function fetchWithRefresh(url, opts = {}) {
          const token = auth?.token || localStorage.getItem("accessToken");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          // Use current headers for the fetch request
          let res = await fetch(url, { ...opts, headers: { ...opts.headers, ...headers } }); 

          if (res.status === 401 && auth && auth.refresh) {
            const refreshed = await auth.refresh();
            if (refreshed && refreshed.ok) {
              const newToken = refreshed.body.token || refreshed.body?.token;
              const newHeaders = newToken ? { Authorization: `Bearer ${newToken}` } : {};
              
              // Retry with new token
              res = await fetch(url, { ...opts, headers: { ...opts.headers, ...newHeaders } });
            }
          }
          return res;
        }

        let url = "/api/admins/influencers";
        if (viewMode === "admins") url = "/api/admins";
        
        const qs = new URLSearchParams();
        if (viewMode === "influencers") {
          if (minFollowers) qs.set("minFollowers", minFollowers);
          if (categoryFilter) qs.set("category", categoryFilter);
          if (filter) qs.set("q", filter);
        }
        
        const full = qs.toString() ? `${url}?${qs.toString()}` : url;
        const res = await fetchWithRefresh(full, { headers: {} }); // Headers added in fetchWithRefresh

        if (!res.ok) throw new Error("Unable to fetch records");
        const body = await res.json();
        if (mounted) {
          setItems(body || []);
          setPage(1); // Reset page on new data load
        }
      } catch (err) {
        toast?.add(err.message || "Failed to load records", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast, viewMode, categoryFilter, minFollowers, filter]);

  // --- Filtering, Paging, and Export Logic (Unchanged) ---
  function getFiltered() {
    const q = (filter || "").trim().toLowerCase();
    return items.filter((it) => {
      if (viewMode === "admins") {
          // Simple filter for admins list
          return (it.name || "").toLowerCase().includes(q) || (it.email || "").toLowerCase().includes(q);
      }
      // Influencer filtering logic
      if (q) {
        const hay = `${it.name || ""} ${it.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter) {
        if (
          !Array.isArray(it.categories) ||
          !it.categories.includes(categoryFilter)
        )
          return false;
      }
      if (minFollowers) {
        if ((it.followersCount || 0) < Number(minFollowers)) return false;
      }
      return true;
    });
  }

  function getPaged(list) {
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function exportCsv(filename, rows) {
    if (!rows || rows.length === 0)
      return toast?.add("No rows to export", { type: "error" });
    const cols = [
      "name",
      "email",
      "phone",
      "followersCount",
      "categories",
      "profile",
    ];
    const csv = [cols.join(",")];
    for (const r of rows) {
      // NOTE: This links to the public API endpoint, not the Admin Detail page URL
      const profile = `${window.location.origin}/api/users/${r._id || r.id}`; 
      const line = [
        escapeCsv(r.name || ""),
        escapeCsv(r.email || ""),
        escapeCsv(r.phone || ""),
        (r.followersCount || 0).toString(),
        escapeCsv((r.categories || []).join("; ")),
        escapeCsv(profile),
      ].join(",");
      csv.push(line);
    }
    const blob = new Blob([csv.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast?.add(`Exported ${rows.length} records to CSV!`, { type: "success" });
  }

  function escapeCsv(v) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }
  
  const filteredItems = getFiltered();
  const paginatedItems = getPaged(filteredItems);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  
  const allCategories = [
    ...new Set(
        items.map((it) => it.categories).flat().filter(Boolean)
    ),
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        
        {/* Header */}
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4"
        >
          <h1 className="text-3xl font-extrabold text-cyan-400">
            {viewMode === "influencers" ? "Influencer Database" : "Admin User List"}
          </h1>
          <Button as={Link} to="/admin/dashboard" variant="secondary" className="hover:bg-gray-700/50">
            Back to Dashboard
          </Button>
        </motion.div>

        {/* --- Controls and Filters --- */}
        <motion.div 
            className="bg-gray-800/90 p-5 rounded-xl border border-gray-700 shadow-lg mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-4">
            <h3 className="text-lg font-semibold text-purple-400 mr-4">View Mode:</h3>
            <Button
              onClick={() => setViewMode("influencers")}
              variant={viewMode === "influencers" ? "accent" : "ghost"}
              className={viewMode === "influencers" ? "" : "text-gray-300 hover:bg-gray-700"}
              size="sm"
            >
              <FaUserTag className="mr-2" /> Influencers
            </Button>
            <Button
              onClick={() => setViewMode("admins")}
              variant={viewMode === "admins" ? "accent" : "ghost"}
              className={viewMode === "admins" ? "" : "text-gray-300 hover:bg-gray-700"}
              size="sm"
            >
              <FaUsers className="mr-2" /> Admins
            </Button>
          </div>

          {/* Filtering Inputs */}
          <div className={`grid gap-4 ${viewMode === 'influencers' ? 'md:grid-cols-5' : 'md:grid-cols-2'}`}>
            
            <StyledInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Search name or email in ${viewMode}`}
              className={viewMode === 'influencers' ? 'md:col-span-1' : 'md:col-span-1'}
            />

            {viewMode === "influencers" && (
              <>
                <StyledInput
                  type="number"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  placeholder="Min followers"
                  className="md:col-span-1"
                />
                
                <StyledSelect
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="md:col-span-1"
                >
                  <option value="" disabled={categoryFilter !== ""}>All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </StyledSelect>
              </>
            )}

            <Button
              onClick={() => {
                setFilter("");
                setCategoryFilter("");
                setMinFollowers("");
                setPage(1);
              }}
              variant="secondary"
              className="md:col-span-1 flex items-center justify-center gap-2"
            >
              <FaRedo /> Reset Filters
            </Button>

            <Button
                onClick={() => exportCsv(`${viewMode}_filtered.csv`, filteredItems)}
                variant="success"
                className="md:col-span-1 flex items-center justify-center gap-2"
              >
                <FaDownload /> Export Filtered
            </Button>
          </div>
        </motion.div>

        {/* --- Data Table --- */}
        <motion.div 
            className="bg-gray-800/90 p-5 rounded-xl shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
        >
            
            {loading && <div className="text-center p-8 text-lg text-purple-400">Loading data...</div>}
            
            {!loading && items.length === 0 && (
                <div className="text-center p-8 text-lg text-gray-500">No records found for this user group.</div>
            )}

            {!loading && items.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-sm font-semibold uppercase text-purple-400 border-b-2 border-gray-700/50">
                                    <th className="py-3 px-2">Name</th>
                                    <th className="py-3 px-2">Email</th>
                                    <th className="py-3 px-2">Phone</th>
                                    {viewMode === "influencers" && (
                                        <>
                                            <th className="py-3 px-2">Followers</th>
                                            <th className="py-3 px-2">Categories</th>
                                        </>
                                    )}
                                    <th className="py-3 px-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map((it) => (
                                    <motion.tr
                                        key={it._id || it.id}
                                        className="bg-gray-700/50 hover:bg-gray-700 transition duration-200 rounded-lg shadow-md cursor-pointer"
                                        whileHover={{ scaleY: 1.05 }}
                                    >
                                        <td className="py-3 px-2 rounded-l-lg font-semibold text-white truncate max-w-[150px]">{it.name || "-"}</td>
                                        <td className="py-3 px-2 text-sm text-gray-300 truncate max-w-[150px]">{it.email}</td>
                                        <td className="py-3 px-2 text-sm text-gray-300">{it.phone || "-"}</td>
                                        {viewMode === "influencers" && (
                                            <>
                                                <td className="py-3 px-2 text-sm text-cyan-400 font-medium">
                                                    {it.followersCount ? it.followersCount.toLocaleString() : "0"}
                                                </td>
                                                <td className="py-3 px-2 text-xs text-gray-300">
                                                    {(it.categories || []).slice(0, 2).join(", ")}
                                                </td>
                                            </>
                                        )}
                                        <td className="py-3 px-2 rounded-r-lg text-sm">
                                            <Button
                                                as={Link}
                                                to={`/admin/${viewMode === 'influencers' ? 'influencers' : 'admins'}/${it._id || it.id}`}
                                                variant="secondary"
                                                size="sm"
                                                className="text-purple-300 hover:bg-purple-900/30"
                                            >
                                                View
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-8 flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            Showing {paginatedItems.length} of {filteredItems.length} records.
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                variant="primary"
                                className="flex items-center gap-1"
                            >
                                <FaAngleLeft /> Prev
                            </Button>
                            <div className="px-4 py-2 bg-gray-700 rounded-lg text-white font-medium self-center">
                                Page {page} of {totalPages}
                            </div>
                            <Button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                variant="primary"
                                className="flex items-center gap-1"
                            >
                                Next <FaAngleRight />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
      </div>
    </div>
  );
}