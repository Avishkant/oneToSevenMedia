import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import ApplicationCard from "../components/ApplicationCard"; // External component
import { motion } from "framer-motion";
import { FaFilter, FaSearch, FaRedo, FaTag, FaCheckCircle, FaTimes, FaHourglassHalf } from "react-icons/fa";

// --- Custom Styled Components ---

// Styled Input for dark theme
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

// Styled Select for dark theme
const StyledSelect = ({ className = "", children, ...props }) => (
  <select
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className} appearance-none cursor-pointer`}
    {...props}
  >
    {children}
  </select>
);

// --- Main Component ---

export default function MyApplications() {
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // --- Data Loading Logic (Unchanged) ---
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!auth?.user) return;
      setLoading(true);
      try {
        async function fetchWithRefresh(url, opts = {}) {
          let res = await fetch(url, opts);
          if (res.status === 401 && auth && auth.refresh) {
            const refreshed = await auth.refresh();
            if (refreshed && refreshed.ok) {
              const newToken =
                auth?.token || localStorage.getItem("accessToken");
              opts.headers = {
                ...(opts.headers || {}),
                ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
              };
              res = await fetch(url, opts);
            }
          }
          return res;
        }

        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetchWithRefresh(
          `/api/applications/by-influencer/${auth.user.id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) throw new Error("Failed to load applications");
        const body = await res.json();
        if (mounted) setItems(body || []);
      } catch (err) {
        toast?.add(err.message || "Failed to load applications", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast]);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.campaign?.category).filter(Boolean))],
    [items]
  );

  // --- Filtering Logic (Unchanged) ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (q) {
        const hay = `${a.campaign?.brandName || ""} ${
          a.campaign?.title || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter) {
        if ((a.campaign?.category || "") !== categoryFilter) return false;
      }
      if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (!["applied", "reviewing"].includes(a.status)) return false;
        } else {
          if (a.status !== statusFilter) return false;
        }
      }
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-cyan-400 mb-6">My Campaign Applications</h1>

        {/* --- Filter and Search Bar (Animated) --- */}
        <motion.div
            className="bg-gray-800/90 p-5 rounded-xl border border-gray-700 shadow-lg mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            
            {/* Search Input */}
            <StyledInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand or campaign title"
              className="w-full md:w-1/3"
            />

            {/* Category Filter */}
            <StyledSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-1/4"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </StyledSelect>

            {/* Status Filter */}
            <StyledSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-1/5"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </StyledSelect>

            {/* Reset Button */}
            <motion.div 
                className="ml-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={() => {
                        setSearch("");
                        setCategoryFilter("");
                        setStatusFilter("all");
                    }}
                    variant="secondary"
                    className="w-full md:w-auto flex items-center justify-center gap-2"
                >
                    <FaRedo /> Reset Filters
                </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* --- Loading/Empty States --- */}
        {loading && (
          <div className="text-center p-12 rounded-xl text-lg text-purple-400 bg-gray-800/80 shadow-inner">
            <FaHourglassHalf className="w-8 h-8 mx-auto mb-3 animate-spin" />
            Loading applications…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center p-12 rounded-xl text-lg text-gray-400 bg-gray-800/80 shadow-inner">
            <FaTimes className="w-8 h-8 mx-auto mb-3 text-rose-400" />
            You have no applications matching the current filters.
          </div>
        )}

        {/* --- Application Grid (Staggered Motion) --- */}
        {!loading && filtered.length > 0 && (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.1 } },
                hidden: {},
            }}
          >
            {filtered.map((a, index) => (
              <motion.div 
                key={a._id}
                variants={{
                    visible: { opacity: 1, y: 0 },
                    hidden: { opacity: 0, y: 50 },
                }}
                transition={{ duration: 0.4 }}
              >
                <ApplicationCard
                  application={a}
                  onViewDetails={() => setSelectedApp(a)}
                  onSubmitOrder={(app) => {
                    setSelectedApp(app);
                    setOrderModalOpen(true);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* --- Order Submission Modal (Retained) --- */}
        <OrderModal
          open={orderModalOpen}
          onClose={() => {
            setOrderModalOpen(false);
            setSelectedApp(null);
          }}
          application={selectedApp}
          token={auth?.token || localStorage.getItem("accessToken")}
          onSuccess={(updated) => {
            // replace updated application in list
            setItems((prev) =>
              prev.map((it) => (it._id === updated._id ? updated : it))
            );
            toast?.add("Order submitted successfully!", { type: "success" });
          }}
        />
      </div>
    </div>
  );
}