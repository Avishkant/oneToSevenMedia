import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

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

  useEffect(() => {
    let mounted = true;
    async function load() {
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
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let url = "/api/admins/influencers";
        if (viewMode === "admins") url = "/api/admins";
        const qs = new URLSearchParams();
        if (viewMode === "influencers") {
          if (minFollowers) qs.set("minFollowers", minFollowers);
          if (categoryFilter) qs.set("category", categoryFilter);
          if (filter) qs.set("q", filter);
        }
        const full = qs.toString() ? `${url}?${qs.toString()}` : url;
        const res = await fetchWithRefresh(full, { headers });
        if (!res.ok) throw new Error("Unable to fetch");
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
  }, [auth, toast, viewMode, categoryFilter, minFollowers, filter]);

  function getFiltered() {
    const q = (filter || "").trim().toLowerCase();
    return items.filter((it) => {
      if (viewMode === "admins") return true; // admins list has its own filtering maybe by name/email
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
  }

  function escapeCsv(v) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }

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

        <div className="glass p-4 rounded text-slate-200">
          {loading && <div className="text-sm">Loading...</div>}
          {!loading && items.length === 0 && (
            <div className="text-sm text-slate-300">No records found.</div>
          )}

          {!loading && items.length > 0 && (
            <div>
              <div className="mb-3 flex flex-col sm:flex-row gap-2 items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode("influencers")}
                    className={`px-3 py-1 rounded ${
                      viewMode === "influencers"
                        ? "bg-indigo-600"
                        : "bg-white/5"
                    }`}
                  >
                    Influencers
                  </button>
                  <button
                    onClick={() => setViewMode("admins")}
                    className={`px-3 py-1 rounded ${
                      viewMode === "admins" ? "bg-indigo-600" : "bg-white/5"
                    }`}
                  >
                    Admins
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                  <input
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search name or email"
                    className="px-3 py-2 rounded bg-white/3 w-full sm:w-64 text-slate-900 placeholder:text-slate-500"
                  />
                  {viewMode === "influencers" && (
                    <>
                      <input
                        value={minFollowers}
                        onChange={(e) => setMinFollowers(e.target.value)}
                        placeholder="Min followers"
                        className="px-3 py-2 rounded bg-white/3 w-40 text-slate-900 placeholder:text-slate-500"
                      />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 rounded bg-white/3 text-slate-900"
                      >
                        <option value="">All categories</option>
                        {[
                          ...new Set(
                            items
                              .map((it) => it.categories)
                              .flat()
                              .filter(Boolean)
                          ),
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setFilter("");
                      setCategoryFilter("");
                      setMinFollowers("");
                    }}
                    className="btn-primary bg-slate-600"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => exportCsv("influencers_all.csv", items)}
                  className="btn-primary"
                >
                  Export all
                </button>
                <button
                  onClick={() =>
                    exportCsv("influencers_filtered.csv", getFiltered())
                  }
                  className="btn-primary bg-emerald-600"
                >
                  Export filtered
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-sm text-slate-400 border-b border-white/6">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Phone</th>
                      <th className="py-2">Followers</th>
                      <th className="py-2">Categories</th>
                      <th className="py-2">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaged(getFiltered()).map((it) => (
                      <tr
                        key={it._id || it.id}
                        className="border-b border-white/6"
                      >
                        <td className="py-3 font-semibold">{it.name}</td>
                        <td className="py-3 text-sm text-slate-300">
                          {it.email}
                        </td>
                        <td className="py-3 text-sm">{it.phone || "-"}</td>
                        <td className="py-3 text-sm">
                          {it.followersCount ?? 0}
                        </td>
                        <td className="py-3 text-sm">
                          {(it.categories || []).join(", ")}
                        </td>
                        <td className="py-3 text-sm">
                          <a
                            href={`/api/users/${it._id || it.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-300 hover:underline"
                          >
                            API
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  Page {page} of{" "}
                  {Math.max(1, Math.ceil(getFiltered().length / pageSize))}
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
                      setPage((p) =>
                        Math.min(
                          Math.max(
                            1,
                            Math.ceil(getFiltered().length / pageSize)
                          ),
                          p + 1
                        )
                      )
                    }
                    disabled={
                      page >=
                      Math.max(1, Math.ceil(getFiltered().length / pageSize))
                    }
                    className="btn-primary"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
