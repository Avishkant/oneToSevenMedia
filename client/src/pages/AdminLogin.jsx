import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await auth.login({ email, password });
    if (!res.ok) {
      setError(res.error);
      toast?.add(res.error || "Login failed", { type: "error" });
      return;
    }
    // use returned parsed user to avoid race with context update
    const parsedUser =
      res.user ||
      (res.body && res.body.token
        ? (function (t) {
            try {
              return JSON.parse(atob(t.split(".")[1]));
            } catch {
              return null;
            }
          })(res.body.token)
        : null);
    if (
      parsedUser &&
      (parsedUser.role === "admin" || parsedUser.role === "superadmin")
    ) {
      toast?.add("Admin logged in", { type: "success" });
      // allow auth context to update then navigate
      setTimeout(() => navigate("/admin/dashboard", { replace: true }), 50);
      return;
    }
    // not an admin
    setError("Not authorized as admin");
    toast?.add("Not authorized as admin", { type: "error" });
    auth.logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md glass p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">Admin login</h2>
        <p className="text-sm text-slate-300 mb-6">
          Use this route only if you are an admin or super-admin. Not linked
          from the main UI.
        </p>
        {error && <div className="text-sm text-rose-400 mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
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
          <button className="btn-primary mt-3">Sign in</button>
        </form>
      </div>
    </div>
  );
}
