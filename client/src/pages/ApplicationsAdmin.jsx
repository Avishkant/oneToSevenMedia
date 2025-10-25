import { useState } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function ApplicationsAdmin() {
  const [userId, setUserId] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();

  const loadFor = async () => {
    if (!userId) return toast?.add("Enter influencer id", { type: "error" });
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/by-influencer/${userId}`, {
        headers: auth?.token
          ? { Authorization: `Bearer ${auth.token}` }
          : undefined,
      });
      if (!res.ok) throw new Error("Failed to load applications");
      const body = await res.json();
      setApps(body);
    } catch (err) {
      toast?.add(err.message || "Failed to load", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const act = async (id, verb) => {
    try {
      const res = await fetch(`/api/applications/${id}/${verb}`, {
        method: "POST",
        headers: auth?.token
          ? { Authorization: `Bearer ${auth.token}` }
          : undefined,
      });
      if (!res.ok) throw new Error("Action failed");
      await res.json();
      toast?.add(`${verb}ed`, { type: "success" });
      // refresh list
      await loadFor();
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Applications (admin)</h1>
        <div className="glass p-4 rounded mb-4">
          <div className="flex gap-2">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Influencer id"
              className="px-3 py-2 rounded bg-white/3"
            />
            <button onClick={loadFor} className="btn-primary">
              Load
            </button>
          </div>
        </div>

        <div className="glass p-4 rounded">
          {loading && <div>Loading...</div>}
          {!loading && apps.length === 0 && (
            <div className="text-sm text-slate-300">No applications.</div>
          )}
          <ul className="divide-y divide-white/6">
            {apps.map((a) => (
              <li key={a._id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      Campaign: {a.campaign?.title || a.campaign}
                    </div>
                    <div className="text-sm text-slate-400">
                      Status: {a.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(a._id, "approve")}
                      className="btn-primary bg-emerald-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(a._id, "reject")}
                      className="btn-primary bg-rose-500"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
