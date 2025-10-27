import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function MyApplications() {
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!auth?.user) return;
      setLoading(true);
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(
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

  function StatusBadge({ status }) {
    const map = {
      applied: { text: "Applied", cls: "bg-white/5 text-slate-100" },
      reviewing: { text: "Reviewing", cls: "bg-amber-600 text-white" },
      approved: { text: "Approved", cls: "bg-emerald-600 text-white" },
      rejected: { text: "Rejected", cls: "bg-rose-600 text-white" },
    };
    const item = map[status] || {
      text: status || "Unknown",
      cls: "bg-white/5 text-slate-100",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${item.cls}`}>
        {item.text}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">My Applications</h1>

        <div className="glass p-4 rounded mb-4 flex flex-col sm:flex-row gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand or campaign"
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/3"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/4"
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
            className="px-3 py-2 rounded bg-white/3 w-full sm:w-1/5"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("");
                setStatusFilter("all");
              }}
              className="btn-primary bg-slate-600"
            >
              Reset
            </button>
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
              <article key={a._id} className="bg-white/3 rounded p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-100">
                          {a.campaign?.brandName ||
                            a.campaign ||
                            "(unknown campaign)"}
                        </div>
                        <div className="text-sm text-slate-400">
                          {a.campaign?.title || ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Applied</div>
                        <div className="text-sm text-slate-200">
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      <div className="text-sm text-slate-300">
                        Followers at apply:{" "}
                        <span className="font-medium">
                          {a.followersAtApply ?? "-"}
                        </span>
                      </div>
                    </div>

                    {a.applicantComment && (
                      <div className="mt-3 text-sm text-slate-300">
                        <div className="font-semibold">Your note</div>
                        <div className="text-slate-400">
                          {a.applicantComment}
                        </div>
                      </div>
                    )}

                    {a.adminComment && (
                      <div className="mt-3 text-sm">
                        <div className="font-semibold text-slate-100">
                          Note from admin
                        </div>
                        <div className="text-slate-300">{a.adminComment}</div>
                      </div>
                    )}

                    {a.rejectionReason && (
                      <div className="mt-3 text-sm text-rose-400">
                        Rejection: {a.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {(a.sampleMedia || []).length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {a.sampleMedia.map((m, i) => (
                      <img
                        key={i}
                        src={m}
                        alt={`sample-${i}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
