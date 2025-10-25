import { useState } from "react";
import useToast from "../context/useToast";

export default function CreateAdminModal({ open, onClose, onCreated, auth }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        password,
        permissions: permissions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
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
      setPermissions("");
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
          <input
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
            placeholder="Permissions (comma separated)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
