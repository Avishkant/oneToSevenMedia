import { useState, useEffect } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function ApplicationsAdmin() {
  const [userId, setUserId] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();

  const loadFor = async () => {
    setLoading(true);
    try {
      let res;
      const token = auth?.token || localStorage.getItem("accessToken");
      if (
        !userId &&
        auth?.user &&
        ["admin", "superadmin"].includes(auth.user.role)
      ) {
        // admin/superadmin wants to see all applications
        res = await fetch(`/api/applications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } else {
        if (!userId)
          return toast?.add("Enter influencer id", { type: "error" });
        res = await fetch(`/api/applications/by-influencer/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      }
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
    // optimistic UI: set status locally first, revert on error
    const oldApps = [...apps];
    const idx = apps.findIndex((x) => x._id === id);
    if (idx !== -1) {
      const updated = {
        ...apps[idx],
        status: verb === "approve" ? "approved" : "rejected",
      };
      const next = [...apps];
      next[idx] = updated;
      setApps(next);
    }
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/${id}/${verb}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Action failed");
      await res.json();
      toast?.add(`${verb}ed`, { type: "success" });
      // refresh list to ensure server state & fresh data
      await loadFor();
    } catch (err) {
      // revert optimistic change
      setApps(oldApps);
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  // UI helpers: expansion and modal
  const [expanded, setExpanded] = useState({});
  const [selectedApp, setSelectedApp] = useState(null);
  const toggleExpand = (campId) =>
    setExpanded((s) => ({ ...s, [campId]: !s[campId] }));
  const openDetails = (app) => setSelectedApp(app);
  const closeDetails = () => setSelectedApp(null);

  // auto-load all applications for admin/superadmin on mount
  useEffect(() => {
    if (auth?.user && ["admin", "superadmin"].includes(auth.user.role)) {
      // only auto-load when there's no specific influencer id
      if (!userId) loadFor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.role]);

  // group applications by campaign for card display
  const byCampaign = apps.reduce((acc, a) => {
    const id = a.campaign?._id || "unknown";
    acc[id] = acc[id] || { campaign: a.campaign, apps: [] };
    acc[id].apps.push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Applications (admin)</h1>
        <div className="glass p-4 rounded mb-4">
          <div className="flex gap-2 items-center">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Influencer id"
              className="px-3 py-2 rounded bg-white/3"
            />
            <button onClick={loadFor} className="btn-primary">
              Load
            </button>
            <button onClick={loadFor} className="btn-primary bg-slate-600 ml-2">
              Refresh
            </button>
            <div className="ml-auto text-sm text-slate-400">
              Showing {apps.length} application{apps.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded">
          {loading && <div>Loading...</div>}
          {!loading && apps.length === 0 && (
            <div className="text-sm text-slate-300">No applications.</div>
          )}

          <div className="grid gap-4 md:grid-cols-2 mt-2">
            {Object.values(byCampaign).map((g) => {
              const campId = g.campaign?._id || Math.random();
              const isExpanded = Boolean(expanded[campId]);
              return (
                <div key={campId} className="p-4 bg-white/3 rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(campId)}
                          className="text-slate-200/80"
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                        <div className="font-semibold text-lg">
                          {g.campaign?.title || "(unknown campaign)"}
                        </div>
                      </div>
                      <div className="text-sm text-slate-300">
                        {g.campaign?.brandName || "-"} •{" "}
                        {g.campaign?.category || "-"}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {g.apps.length} application
                        {g.apps.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      Campaign ID: {campId}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 divide-y divide-white/6">
                      {g.apps.map((a) => (
                        <div
                          key={a._id}
                          className="py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white">
                              {(a.influencer?.name || "?")
                                .split(" ")
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div>
                              <a
                                className="font-medium hover:underline"
                                href={`/admin/influencers/${
                                  a.influencer?._id || a.influencer
                                }`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {a.influencer?.name || a.influencer}
                              </a>
                              <div className="text-sm text-slate-400">
                                {a.influencer?.email ? a.influencer.email : ""}{" "}
                                • Status: {a.status} • Followers:{" "}
                                {a.followersAtApply || "-"}
                              </div>
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
                            <button
                              onClick={() => openDetails(a)}
                              className="btn-primary bg-slate-600"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedApp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={closeDetails}
              />
              <div className="relative bg-slate-900 text-slate-100 rounded p-6 max-w-2xl w-full mx-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-semibold">
                      Application details
                    </div>
                    <div className="text-sm text-slate-400">
                      {selectedApp.campaign?.title || selectedApp.campaign}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={closeDetails}
                      className="px-3 py-1 bg-white/5 rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="text-sm text-slate-300">
                    Influencer:{" "}
                    <a
                      className="font-medium hover:underline"
                      href={`/admin/influencers/${
                        selectedApp.influencer?._id || selectedApp.influencer
                      }`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedApp.influencer?.name || selectedApp.influencer}
                    </a>
                  </div>
                  <div className="text-sm text-slate-300">
                    Email: {selectedApp.influencer?.email || "-"}
                  </div>
                  <div className="text-sm text-slate-300">
                    Followers at apply: {selectedApp.followersAtApply || "-"}
                  </div>
                  <div className="text-sm text-slate-300">
                    Status: {selectedApp.status}
                  </div>
                  <div className="pt-2">
                    <div className="text-sm font-semibold">Answers</div>
                    <div className="mt-1 text-sm text-slate-300">
                      {(selectedApp.answers || []).length === 0 ? (
                        <div className="text-slate-500">
                          No answers provided.
                        </div>
                      ) : (
                        (selectedApp.answers || []).map((ans, i) => (
                          <div key={i} className="py-1">
                            <div className="text-slate-200 font-medium">
                              {ans.question}
                            </div>
                            <div className="text-slate-400">{ans.answer}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Media</div>
                    <div className="mt-2 flex gap-2">
                      {(selectedApp.sampleMedia || []).length === 0 ? (
                        <div className="text-slate-500">No media</div>
                      ) : (
                        (selectedApp.sampleMedia || []).map((m, i) => (
                          <img
                            key={i}
                            src={m}
                            alt={`media-${i}`}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
