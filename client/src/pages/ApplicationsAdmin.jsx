import { useState, useEffect } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import ApplicationCard from "../components/ApplicationCard";
import Button from "../components/Button";

export default function ApplicationsAdmin() {
  const [brandName, setBrandName] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();

  const loadFor = async () => {
    setLoading(true);
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load applications");
      const body = await res.json();
      let items = body || [];
      if (brandName && brandName.trim() !== "") {
        const q = brandName.trim().toLowerCase();
        items = items.filter((a) =>
          (a.campaign?.brandName || "").toLowerCase().includes(q)
        );
      }
      setApps(items);
    } catch (err) {
      toast?.add(err.message || "Failed to load", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const act = async (id, verb, extra = {}) => {
    const oldApps = [...apps];
    const idx = apps.findIndex((x) => x._id === id);
    if (idx !== -1) {
      const updated = {
        ...apps[idx],
        status: verb === "approve" ? "approved" : "rejected",
        ...extra,
      };
      const next = [...apps];
      next[idx] = updated;
      setApps(next);
    }
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/${id}/${verb}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(extra.comment ? extra : {}),
      });
      if (!res.ok) throw new Error("Action failed");
      await res.json();
      toast?.add(`${verb}ed`, { type: "success" });
      await loadFor();
    } catch (err) {
      setApps(oldApps);
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  const [actionState, setActionState] = useState(null);
  const openActionModal = (app, verb) =>
    setActionState({ open: true, app, verb, comment: "", reason: "" });
  const closeActionModal = () => setActionState(null);
  const confirmActionModal = async () => {
    if (!actionState) return;
    const { app, verb, comment, reason } = actionState;
    await act(app._id, verb, { comment, reason });
    closeActionModal();
  };

  const [expanded, setExpanded] = useState({});
  const [selectedApp, setSelectedApp] = useState(null);
  const toggleExpand = (campId) =>
    setExpanded((s) => ({ ...s, [campId]: !s[campId] }));
  const openDetails = (app) => setSelectedApp(app);
  const closeDetails = () => setSelectedApp(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeDetails();
    }
    if (selectedApp) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedApp]);

  // auto-load applications once the admin user role is known
  useEffect(() => {
    if (!(auth?.user && ["admin", "superadmin"].includes(auth.user.role)))
      return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(`/api/applications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Failed to load applications");
        const body = await res.json();
        let items = body || [];
        if (brandName && brandName.trim() !== "") {
          const q = brandName.trim().toLowerCase();
          items = items.filter((a) =>
            (a.campaign?.brandName || "").toLowerCase().includes(q)
          );
        }
        if (mounted) setApps(items);
      } catch (err) {
        toast?.add(err.message || "Failed to load", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth?.user, auth?.user?.role, brandName, auth?.token, toast]);

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
        <div className="glass p-4 rounded mb-4 text-slate-200">
          <div className="flex gap-2 items-center">
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Search by brand name"
              className="px-3 py-2 rounded bg-white/3 text-slate-900 placeholder:text-slate-500"
            />
            <Button onClick={loadFor} disabled={loading} variant="primary">
              Search
            </Button>
            <Button
              onClick={() => {
                setBrandName("");
                loadFor();
              }}
              disabled={loading}
              variant="primary"
              className="bg-slate-600 ml-2"
            >
              Refresh
            </Button>
            <div className="ml-auto text-sm text-slate-400">
              Showing {apps.length} application{apps.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {Object.keys(byCampaign).length === 0 ? (
            <div className="text-slate-500 p-4">No applications found.</div>
          ) : (
            Object.entries(byCampaign).map(([campId, g]) => {
              const isExpanded = !!expanded[campId];
              return (
                <div key={campId} className="mb-4 p-4 bg-white/2 rounded">
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
                          {g.campaign?.brandName || "(unknown campaign)"}
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
                        <div key={a._id} className="py-3">
                          <ApplicationCard
                            application={a}
                            showAdminActions
                            onApprove={() => openActionModal(a, "approve")}
                            onReject={() => openActionModal(a, "reject")}
                            onViewDetails={() => openDetails(a)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

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
                      {selectedApp.campaign?.brandName || selectedApp.campaign}
                    </div>
                  </div>
                  <div>
                    <Button
                      onClick={closeDetails}
                      variant="ghost"
                      className="px-3 py-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="text-sm text-slate-300">
                    Influencer:{" "}
                    <Button
                      as="a"
                      href={`/admin/influencers/${
                        selectedApp.influencer?._id || selectedApp.influencer
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      variant="ghost"
                      className="font-medium"
                    >
                      {selectedApp.influencer?.name || selectedApp.influencer}
                    </Button>
                  </div>
                  <div className="text-sm text-slate-300">
                    Email: {selectedApp.influencer?.email || "-"}
                  </div>
                  <div className="text-sm text-slate-300">
                    Followers at apply: {selectedApp.followersAtApply ?? "-"}
                  </div>
                  <div className="text-sm text-slate-300">
                    Status: {selectedApp.status}
                  </div>
                  {selectedApp.applicantComment && (
                    <div className="text-sm text-slate-300 mt-2">
                      <div className="font-semibold">Applicant note</div>
                      <div className="text-slate-400">
                        {selectedApp.applicantComment}
                      </div>
                    </div>
                  )}
                  {selectedApp.adminComment && (
                    <div className="text-sm text-slate-300 mt-2">
                      <div className="font-semibold">Admin note</div>
                      <div className="text-slate-400">
                        {selectedApp.adminComment}
                      </div>
                    </div>
                  )}
                  {selectedApp.rejectionReason && (
                    <div className="text-sm text-rose-400 mt-2">
                      Rejection reason: {selectedApp.rejectionReason}
                    </div>
                  )}
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

          {actionState && actionState.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={closeActionModal}
              />
              <div className="relative bg-slate-900 text-slate-100 rounded p-6 max-w-lg w-full mx-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">
                    {actionState.verb === "approve"
                      ? "Approve application"
                      : "Reject application"}
                  </div>
                  <div>
                    <Button
                      onClick={closeActionModal}
                      variant="ghost"
                      className="px-3 py-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-slate-400">
                    Optional comment to the influencer
                  </div>
                  <textarea
                    value={actionState.comment}
                    onChange={(e) =>
                      setActionState((s) => ({ ...s, comment: e.target.value }))
                    }
                    className="w-full mt-2 p-2 rounded bg-white/3 h-24 text-slate-900 placeholder:text-slate-500"
                    placeholder="Add a note for the influencer (why approved/rejected or next steps)"
                  />
                  {actionState.verb === "reject" && (
                    <div className="mt-2">
                      <div className="text-sm text-slate-400">
                        Rejection reason (brief)
                      </div>
                      <input
                        value={actionState.reason}
                        onChange={(e) =>
                          setActionState((s) => ({
                            ...s,
                            reason: e.target.value,
                          }))
                        }
                        className="w-full mt-2 p-2 rounded bg-white/3 text-slate-900 placeholder:text-slate-500"
                        placeholder="Optional rejection reason"
                      />
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button onClick={confirmActionModal} variant="primary">
                      Confirm
                    </Button>
                    <Button onClick={closeActionModal} variant="ghost">
                      Cancel
                    </Button>
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
