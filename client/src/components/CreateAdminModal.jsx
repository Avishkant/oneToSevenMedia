import { useState } from "react";
import useToast from "../context/useToast";
import Button from "./Button";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";

export default function CreateAdminModal({ open, onClose, onCreated, auth }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, email, password, permissions };
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Failed to create admin");
      }
      toast?.add("Admin created", { type: "success" });
      setName("");
      setEmail("");
      setPassword("");
      setPermissions([]);
      onCreated && onCreated();
      onClose && onClose();
    } catch (err) {
      toast?.add(err.message || "Create failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className="bg-slate-900 text-slate-100 rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-3">Create Admin</h3>
        <form onSubmit={handleSubmit} className="grid gap-2">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="px-3 py-2 rounded bg-white/3"
          />
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-300">Permissions</div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => {
                  const v = !!e.target.checked;
                  setSelectAll(v);
                  setPermissions(v ? ADMIN_PERMISSIONS.map((p) => p.key) : []);
                }}
              />
              <span className="text-sm">Select all</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMIN_PERMISSIONS.map((p) => (
              <label key={p.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.includes(p.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const next = [...permissions, p.key];
                      setPermissions(next);
                      if (next.length === ADMIN_PERMISSIONS.length)
                        setSelectAll(true);
                    } else {
                      setPermissions((s) => s.filter((x) => x !== p.key));
                      setSelectAll(false);
                    }
                  }}
                />
                <span className="text-sm">{p.label}</span>
                {permissions.includes(p.key) && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-600 rounded text-white">
                    Granted
                  </span>
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button type="submit" disabled={saving} variant="primary">
              {saving ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
