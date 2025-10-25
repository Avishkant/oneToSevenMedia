import { useEffect, useState } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function AdminApplicationsOverview() {
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications`, {
          headers: auth?.token
            ? { Authorization: `Bearer ${auth.token}` }
            : undefined,
        });
        if (!res.ok) throw new Error("Failed to load applications");
        const body = await res.json();
        if (mounted) setItems(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast]);

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
      // refresh
      const r = await fetch(`/api/applications`, {
        headers: auth?.token
          ? { Authorization: `Bearer ${auth.token}` }
          : undefined,
      });
      if (r.ok) setItems(await r.json());
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  // group by campaign
  const grouped = items.reduce((acc, a) => {
    const key = a.campaign?._id || "unknown";
    acc[key] = acc[key] || { campaign: a.campaign, apps: [] };
    acc[key].apps.push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Applications Overview</h1>
        <div className="glass p-4 rounded">
          {loading && <div>Loading...</div>}
          {!loading && Object.keys(grouped).length === 0 && (
            <div className="text-sm text-slate-300">No applications yet.</div>
          )}
          {Object.values(grouped).map((g) => (
            <div key={g.campaign?._id || Math.random()} className="mb-6">
              <div className="font-semibold">
                {g.campaign?.title || "(unknown campaign)"}
              </div>
              <ul className="divide-y divide-white/6 mt-2">
                {g.apps.map((a) => (
                  <li
                    key={a._id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {a.influencer?.name || a.influencer}
                      </div>
                      <div className="text-sm text-slate-400">
                        Status: {a.status} • Followers:{" "}
                        {a.followersAtApply || "-"}
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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
