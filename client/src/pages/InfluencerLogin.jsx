import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function InfluencerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    auth.login({ email, password }).then((res) => {
      if (!res.ok) {
        setError(res.error);
        toast?.add(res.error || "Login failed", { type: "error" });
        return;
      }
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
      if (parsedUser && parsedUser.role === "influencer") {
        toast?.add("Logged in as influencer", { type: "success" });
        // allow auth context to update then navigate
        setTimeout(
          () => navigate("/influencer/dashboard", { replace: true }),
          50
        );
      } else {
        toast?.add("Logged in", { type: "success" });
        setTimeout(() => navigate("/", { replace: true }), 50);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md glass p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">Influencer login</h2>
        <p className="text-sm text-slate-300 mb-6">
          Sign in to view and apply to campaigns.
        </p>
        {error && <div className="text-sm text-rose-400 mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          <Button type="submit" variant="primary" className="mt-3">
            Sign in
          </Button>
        </form>
        <div className="mt-4 text-sm text-slate-300">
          Don't have an account?{" "}
          <a
            href="/influencer/register"
            className="text-indigo-300 hover:underline"
          >
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
