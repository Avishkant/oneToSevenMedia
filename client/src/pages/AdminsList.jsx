import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import CreateAdminModal from "../components/CreateAdminModal";

export default function AdminsList() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admins", {
          headers: auth?.token
            ? { Authorization: `Bearer ${auth.token}` }
            : undefined,
        });
        if (!res.ok) throw new Error("Unable to fetch admins");
        const body = await res.json();
        if (mounted) setAdmins(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load admins", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admins", {
        headers: auth?.token
          ? { Authorization: `Bearer ${auth.token}` }
          : undefined,
      });
      if (!res.ok) throw new Error("Unable to fetch admins");
      const body = await res.json();
      setAdmins(body);
    } catch (err) {
      toast?.add(err.message || "Failed to load admins", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this admin? This will demote them.")) return;
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: "DELETE",
        headers: auth?.token
          ? { Authorization: `Bearer ${auth.token}` }
          : undefined,
      });
      if (!res.ok) throw new Error("Delete failed");
      toast?.add("Admin deleted/demoted", { type: "success" });
      await reload();
    } catch (err) {
      toast?.add(err.message || "Delete failed", { type: "error" });
    }
  };

  const filtered = admins.filter((a) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admins</h1>
          <Link
            to="/admin/dashboard"
            className="text-indigo-300 hover:underline"
          >
            Back
          </Link>
        </div>

        <div className="glass p-4 rounded">
          {/* Creation is handled via modal to keep the list compact */}

          {loading && <div className="text-sm">Loading...</div>}
          {!loading && admins.length === 0 && (
            <div className="text-sm text-slate-300">No admins found.</div>
          )}
          <div className="glass p-4 rounded">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name or email"
                  className="px-3 py-2 rounded bg-white/3"
                />
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary"
                >
                  Create admin
                </button>
              </div>
            </div>

            {loading && <div className="text-sm">Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-sm text-slate-300">No admins found.</div>
            )}
            <ul className="divide-y divide-white/6">
              {paginated.map((a) => (
                <li
                  key={a._id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-sm text-slate-400">{a.email}</div>
                  </div>
                  <div className="text-sm flex items-center gap-3">
                    <Link
                      to={`/admin/admins/${a._id}`}
                      className="text-indigo-300 hover:underline"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="text-rose-400 hover:underline"
                    >
                      Delete
                    </button>
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-primary"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          {showModal && (
            <CreateAdminModal
              open={showModal}
              onClose={() => setShowModal(false)}
              onCreated={reload}
              auth={auth}
            />
          )}
        </div>
      </div>
    </div>
  );
}
