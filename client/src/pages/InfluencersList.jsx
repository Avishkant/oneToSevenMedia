import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function InfluencersList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableEndpoint, setAvailableEndpoint] = useState(null);
  const auth = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    let mounted = true;
    async function tryEndpoints() {
      setLoading(true);
      const candidates = ["/api/influencers", "/api/users", "/api/admins"]; // try plausible endpoints
      for (const ep of candidates) {
        try {
          const res = await fetch(ep, {
            headers: auth?.token
              ? { Authorization: `Bearer ${auth.token}` }
              : undefined,
          });
          if (!res.ok) continue;
          const body = await res.json();
          if (mounted) {
            setAvailableEndpoint(ep);
            setItems(body);
            setLoading(false);
          }
          return;
        } catch {
          // try next
        }
      }
      if (mounted) {
        setLoading(false);
        toast?.add("No influencers endpoint available on server", {
          type: "error",
        });
      }
    }
    tryEndpoints();
    return () => (mounted = false);
  }, [auth, toast]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Influencers</h1>
          <Link
            to="/admin/dashboard"
            className="text-indigo-300 hover:underline"
          >
            Back
          </Link>
        </div>

        <div className="glass p-4 rounded">
          {loading && <div className="text-sm">Loading...</div>}
          {!loading && !availableEndpoint && (
            <div className="text-sm text-slate-300">
              No endpoint to list influencers on server.
            </div>
          )}
          {!loading &&
            items.length > 0 &&
            (() => {
              const filtered = items.filter((it) => {
                if (!filter) return true;
                const q = filter.toLowerCase();
                return (
                  (it.name || "").toLowerCase().includes(q) ||
                  (it.email || "").toLowerCase().includes(q)
                );
              });
              const totalPages = Math.max(
                1,
                Math.ceil(filtered.length / pageSize)
              );
              const paginated = filtered.slice(
                (page - 1) * pageSize,
                page * pageSize
              );
              return (
                <>
                  <div className="mb-3 flex gap-2">
                    <input
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search name or email"
                      className="px-3 py-2 rounded bg-white/3"
                    />
                  </div>
                  <ul className="divide-y divide-white/6">
                    {paginated.map((it) => (
                      <li
                        key={it._id || it.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold">
                            {it.name || it.email}
                          </div>
                          <div className="text-sm text-slate-400">
                            {it.email}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-300">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="btn-primary"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page >= totalPages}
                        className="btn-primary"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
