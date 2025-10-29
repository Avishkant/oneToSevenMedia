import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import ApplicationCard from "../components/ApplicationCard"; // External component
import Button from "../components/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaRedo,
  FaChevronDown,
  FaChevronRight,
  FaTimes,
  FaUserAlt,
  FaInfoCircle,
  FaCalendarAlt,
  FaEnvelope,
  FaCommentDots,
  FaGlobe,
  FaMoneyBillAlt,
} from "react-icons/fa";

// --- Custom Components ---

// Styled Input for dark theme
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

// Styled Textarea for dark theme
const StyledTextarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full mt-2 p-3 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className}`}
    {...props}
  />
);

// --- Main Component ---

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

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-cyan-400 mb-6">
          Application Review (Admin)
        </h1>

        {/* --- Search and Controls --- */}
        <motion.div
          className="bg-gray-800/90 p-5 rounded-xl border border-gray-700 shadow-lg mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <StyledInput
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Filter by brand name"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && loadFor()}
            />

            <Button
              onClick={loadFor}
              disabled={loading}
              variant="primary"
              className="flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading ? (
                "Searching..."
              ) : (
                <>
                  <FaSearch /> Search
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setBrandName("");
                loadFor();
              }}
              disabled={loading}
              variant="secondary"
              className="flex items-center justify-center gap-2 min-w-[120px]"
            >
              <FaRedo /> Refresh
            </Button>

            <div className="ml-auto text-sm text-gray-400 self-center mt-2 sm:mt-0">
              Showing{" "}
              <span className="font-bold text-white">{apps.length}</span>{" "}
              application{apps.length !== 1 ? "s" : ""}
            </div>
          </div>
        </motion.div>

        {/* --- Applications List --- */}
        <div className="mt-6 space-y-4">
          {Object.keys(byCampaign).length === 0 ? (
            <div className="text-center text-gray-500 p-8 bg-gray-800 rounded-xl">
              {loading
                ? "Loading applications..."
                : "No applications found matching the criteria."}
            </div>
          ) : (
            Object.entries(byCampaign).map(([campId, g], index) => {
              const isExpanded = !!expanded[campId];
              return (
                <motion.div
                  key={campId}
                  className="bg-gray-800/90 rounded-xl shadow-md border border-gray-700/50 overflow-hidden"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {/* Campaign Header (Accordion Trigger) */}
                  <motion.div
                    className="p-4 cursor-pointer flex items-center justify-between transition duration-300"
                    onClick={() => toggleExpand(campId)}
                    whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }} // subtle hover background change
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <FaChevronDown className="w-4 h-4 text-purple-400" />
                      ) : (
                        <FaChevronRight className="w-4 h-4 text-purple-400" />
                      )}
                      <div>
                        <div className="font-extrabold text-lg text-white">
                          {g.campaign?.title || "(Unknown Campaign Title)"}
                        </div>
                        <div className="text-sm text-gray-400">
                          Brand:{" "}
                          <span className="font-medium text-cyan-400">
                            {g.campaign?.brandName || "-"}
                          </span>{" "}
                          | Category: {g.campaign?.category || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      <span className="font-semibold text-white">
                        {g.apps.length}
                      </span>{" "}
                      application{g.apps.length !== 1 ? "s" : ""}
                    </div>
                  </motion.div>

                  {/* Applications List (Collapsible Content) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden border-t border-gray-700"
                      >
                        <div className="divide-y divide-gray-700 px-4 pt-2 pb-4">
                          {g.apps.map((a) => (
                            <motion.div
                              key={a._id}
                              className="py-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ApplicationCard
                                application={a}
                                showAdminActions
                                onApprove={() => openActionModal(a, "approve")}
                                onReject={() => openActionModal(a, "reject")}
                                onViewDetails={() => openDetails(a)}
                                // Assuming ApplicationCard supports modern styling via its own component file
                              />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* --- Application Details Modal --- */}
        <AnimatePresence>
          {selectedApp && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/70"
                onClick={closeDetails}
              />
              <motion.div
                className="relative bg-gray-800 text-white rounded-xl p-6 max-w-3xl w-full mx-auto shadow-2xl border border-purple-500/50 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start justify-between border-b border-gray-700 pb-3 mb-4">
                  <div>
                    <div className="text-2xl font-extrabold text-cyan-400">
                      Application Details
                    </div>
                    <div className="text-sm text-gray-400">
                      Campaign:{" "}
                      {selectedApp.campaign?.title || selectedApp.campaign}
                    </div>
                  </div>
                  <Button
                    onClick={closeDetails}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-2 rounded-full"
                  >
                    <FaTimes />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Influencer Info */}
                  <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-bold text-lg text-purple-400 flex items-center gap-2">
                      <FaUserAlt /> Influencer Info
                    </h4>
                    <p className="text-sm text-gray-300">
                      Name:{" "}
                      <Link
                        to={`/admin/influencers/${
                          selectedApp.influencer?._id || selectedApp.influencer
                        }`}
                        target="_blank"
                        className="font-medium text-cyan-300 hover:text-cyan-100 transition"
                      >
                        {selectedApp.influencer?.name || selectedApp.influencer}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-300">
                      Email: {selectedApp.influencer?.email || "-"}
                    </p>
                    <p className="text-sm text-gray-300">
                      Followers at apply:{" "}
                      <span className="font-bold">
                        {selectedApp.followersAtApply ?? "-"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Status:{" "}
                      <span
                        className={`font-bold ${
                          selectedApp.status === "approved"
                            ? "text-emerald-400"
                            : selectedApp.status === "rejected"
                            ? "text-rose-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {selectedApp.status}
                      </span>
                    </p>
                  </div>

                  {/* Applicant Comment / Admin Notes */}
                  <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg">
                    <h4 className="font-bold text-lg text-purple-400 flex items-center gap-2">
                      <FaCommentDots /> Notes & History
                    </h4>

                    {selectedApp.applicantComment && (
                      <div className="text-sm text-gray-300">
                        <div className="font-semibold text-white">
                          Applicant Note:
                        </div>
                        <div className="text-gray-400 italic">
                          {selectedApp.applicantComment}
                        </div>
                      </div>
                    )}
                    {selectedApp.adminComment && (
                      <div className="text-sm text-gray-300">
                        <div className="font-semibold text-white">
                          Admin Comment:
                        </div>
                        <div className="text-gray-400">
                          {selectedApp.adminComment}
                        </div>
                      </div>
                    )}
                    {selectedApp.rejectionReason && (
                      <div className="text-sm text-rose-400">
                        <div className="font-semibold">Rejection Reason:</div>
                        <div className="text-rose-300">
                          {selectedApp.rejectionReason}
                        </div>
                      </div>
                    )}
                    {!selectedApp.applicantComment &&
                      !selectedApp.adminComment && (
                        <p className="text-sm text-gray-500">
                          No notes recorded.
                        </p>
                      )}
                  </div>

                  {/* Answers */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-700">
                    <div className="text-lg font-bold text-cyan-400 mb-2">
                      Submitted Answers
                    </div>
                    <div className="space-y-3 text-sm text-gray-300">
                      {(selectedApp.answers || []).length === 0 ? (
                        <div className="text-gray-500">
                          No custom questions answered.
                        </div>
                      ) : (
                        (selectedApp.answers || []).map((ans, i) => (
                          <div
                            key={i}
                            className="py-1 border-b border-gray-700/50 last:border-b-0"
                          >
                            <div className="text-white font-medium">
                              {ans.question}
                            </div>
                            <div className="text-gray-400">{ans.answer}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Media */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-700">
                    <div className="text-lg font-bold text-cyan-400 mb-2">
                      Sample Media/Portfolio
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {(selectedApp.sampleMedia || []).length === 0 ? (
                        <div className="text-gray-500">No media uploaded.</div>
                      ) : (
                        (selectedApp.sampleMedia || []).map((m, i) => (
                          <motion.img
                            key={i}
                            src={m}
                            alt={`media-${i}`}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-700 cursor-pointer"
                            whileHover={{ scale: 1.1, zIndex: 10 }}
                            transition={{ duration: 0.2 }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Action Confirmation Modal (Approve/Reject) --- */}
        <AnimatePresence>
          {actionState && actionState.open && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/70"
                onClick={closeActionModal}
              />
              <motion.div
                className="relative bg-gray-800 text-white rounded-xl p-6 max-w-lg w-full mx-auto shadow-2xl border border-purple-500/50"
                initial={{ scale: 0.9, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
                  <div
                    className={`text-xl font-bold ${
                      actionState.verb === "approve"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {actionState.verb === "approve"
                      ? "Approve Application"
                      : "Reject Application"}
                  </div>
                  <Button
                    onClick={closeActionModal}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-2 rounded-full"
                  >
                    <FaTimes />
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-gray-400 font-semibold mb-1">
                    Optional Comment to the Influencer
                  </div>
                  <StyledTextarea
                    value={actionState.comment}
                    onChange={(e) =>
                      setActionState((s) => ({ ...s, comment: e.target.value }))
                    }
                    placeholder="Add a note for the influencer (e.g., next steps or feedback)"
                  />

                  {actionState.verb === "reject" && (
                    <div className="mt-4">
                      <div className="text-sm text-rose-400 font-semibold mb-1">
                        Rejection Reason (brief)
                      </div>
                      <StyledInput
                        value={actionState.reason}
                        onChange={(e) =>
                          setActionState((s) => ({
                            ...s,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="e.g., not enough followers, niche mismatch"
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={confirmActionModal}
                      variant={
                        actionState.verb === "approve" ? "success" : "danger"
                      }
                      className="flex-1"
                    >
                      Confirm {actionState.verb}
                    </Button>
                    <Button
                      onClick={closeActionModal}
                      variant="secondary"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
