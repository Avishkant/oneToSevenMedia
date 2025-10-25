import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function AdminDetail() {
  const { id } = useParams();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState("");
  const auth = useAuth();
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admins/${id}`, {
          headers: auth?.token
            ? { Authorization: `Bearer ${auth.token}` }
            : undefined,
        });
        if (!res.ok) throw new Error("Unable to fetch admin");
        const body = await res.json();
        if (mounted) {
          setAdmin(body);
          setPermissions((body.permissions || []).join(", "));
        }
      } catch (err) {
        toast?.add(err.message || "Failed to load admin", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id, auth, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (password) body.password = password;
      body.permissions = permissions
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admins/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update admin");
      toast?.add("Admin updated", { type: "success" });
      setPassword("");
    } catch (err) {
      toast?.add(err.message || "Update failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ role: "admin" }),
      });
      if (!res.ok) throw new Error("Failed to restore admin");
      toast?.add("Admin restored", { type: "success" });
      // reload
      const body = await (
        await fetch(`/api/admins/${id}`, {
          headers: auth?.token
            ? { Authorization: `Bearer ${auth.token}` }
            : undefined,
        })
      ).json();
      setAdmin(body);
    } catch (err) {
      toast?.add(err.message || "Restore failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!admin) return <div className="p-6">No admin found.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin: {admin.name}</h1>
          <Link to="/admin/admins" className="text-indigo-300 hover:underline">
            Back
          </Link>
        </div>

        <div className="glass p-6 rounded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400">Email</div>
              <div className="font-medium">{admin.email}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Role</div>
              <div className="font-medium">{admin.role}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-slate-400">
                Permissions (comma separated)
              </div>
              <input
                value={permissions}
                onChange={(e) => setPermissions(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white/3 mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-slate-400">Reset password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter new password to reset"
                className="w-full px-3 py-2 rounded bg-white/3 mt-1"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {admin.role !== "admin" && (
              <button
                onClick={handleRestore}
                disabled={saving}
                className="btn-primary bg-emerald-600"
              >
                Restore to admin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
