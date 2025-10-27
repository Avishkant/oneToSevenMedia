import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function MyApplications() {
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!auth?.user) return;
      setLoading(true);
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(
          `/api/applications/by-influencer/${auth.user.id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">My Applications</h1>
        <div className="glass p-4 rounded">
          {loading && <div>Loading...</div>}
          {!loading && items.length === 0 && (
            <div className="text-sm text-slate-300">No applications yet.</div>
          )}
          <ul className="divide-y divide-white/6">
            {items.map((a) => (
              <li key={a._id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {a.campaign?.brandName || "(campaign)"}
                    </div>
                    <div className="text-sm text-slate-400">
                      Status: {a.status} • Followers at apply:{" "}
                      {a.followersAtApply ?? "-"}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">
                    Applied: {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
                {a.adminComment && (
                  <div className="mt-2 text-sm text-slate-300">
                    <div className="font-semibold">Note from admin</div>
                    <div className="text-slate-400">{a.adminComment}</div>
                  </div>
                )}
                {a.rejectionReason && (
                  <div className="mt-2 text-sm text-rose-400">
                    Rejection reason: {a.rejectionReason}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
