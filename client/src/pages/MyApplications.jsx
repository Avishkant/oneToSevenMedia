import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import ApplicationCard from "../components/ApplicationCard";

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
        toast?.add(err.message || "Failed to load", { type: "error" });
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">My Applications</h1>

        <div className="glass p-4 rounded mb-4 flex flex-col sm:flex-row gap-2 items-center text-slate-900">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand or campaign"
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/3 text-slate-400 placeholder:text-slate-400"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/4 text-slate-600"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/5 text-slate-600"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="ml-auto flex gap-2">
            <Button
              onClick={() => {
                setSearch("");
                setCategoryFilter("");
                setStatusFilter("all");
              }}
              variant="primary"
              className="bg-slate-600"
            >
              Reset
            </Button>
          </div>
        </div>

        {loading && (
          <div className="glass p-6 rounded text-center text-sm">
            Loading applications…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="glass p-6 rounded text-center text-sm text-slate-300">
            You have no matching applications.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <ApplicationCard
                key={a._id}
                application={a}
                onViewDetails={() => setSelectedApp(a)}
                onSubmitOrder={(app) => {
                  setSelectedApp(app);
                  setOrderModalOpen(true);
                }}
              />
            ))}
          </div>
        )}

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
          }}
        />
      </div>
    </div>
  );
}
