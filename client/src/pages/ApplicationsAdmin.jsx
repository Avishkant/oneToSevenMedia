import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import ApplicationCard from "../components/ApplicationCard"; // External component
import Button from "../components/Button";
import { motion, AnimatePresence } from "framer-motion";

// reference 'motion' to satisfy certain linters (it's used in JSX tags below)
void motion;
import {
  FaSearch,
  FaRedo,
  FaChevronDown,
  FaChevronRight,
  FaTimes,
  FaUserAlt,
  FaCommentDots,
  FaFileExport,
  FaUpload,
  FaCheck,
  FaTrashAlt,
} from "react-icons/fa";

// --- Custom Styled Input/Textarea Components ---
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

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

  // Selection/Filtering State
  const [selected, setSelected] = useState({}); // { campId: [appId1, appId2], ... }
  const [selectedFields, setSelectedFields] = useState({});
  const [showFields, setShowFields] = useState({});
  const [statusFilter, setStatusFilter] = useState({});

  // Modals/Details State
  const [actionState, setActionState] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [selectedApp, setSelectedApp] = useState(null);

  // --- Data Loading ---
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

  // Initial auto-load (retained)
  useEffect(() => {
    if (!(auth?.user && ["admin", "superadmin"].includes(auth.user.role)))
      return;
    let mounted = true;
    (async () => {
      if (mounted) setLoading(true);
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
  }, [auth?.user, auth?.user?.role, auth?.token, toast, brandName]);

  // --- Actions & Helpers ---
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
      setApps(next); // Optimistic UI update
    }
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/${id}/${verb}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(extra),
      });
      if (!res.ok) throw new Error("Action failed");
      toast?.add(`${verb}ed`, { type: "success" });
      await loadFor(); // Refresh full list for accurate data
    } catch (err) {
      setApps(oldApps); // Revert on error
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  const openActionModal = (app, verb) =>
    setActionState({ open: true, app, verb, comment: "", reason: "" });
  const closeActionModal = () => setActionState(null);
  const confirmActionModal = async () => {
    if (!actionState) return;
    const { app, verb, comment, reason } = actionState;
    await act(app._id, verb, { comment, reason });
    closeActionModal();
  };

  const toggleExpand = (campId) =>
    setExpanded((s) => ({ ...s, [campId]: !s[campId] }));
  const openDetails = (app) => setSelectedApp(app);
  const closeDetails = () => setSelectedApp(null);

  // Close details modal on ESC key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeDetails();
    }
    if (selectedApp) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedApp]);

  // Exclude applications that have progressed to order-review
  // (they should appear in the Orders/OrderReview dashboard instead)
  const orderStatuses = [
    "order_submitted",
    "order_form_approved",
    "order_form_rejected",
  ];
  const visibleAppsList = (apps || []).filter(
    (a) => !orderStatuses.includes((a.status || "").toLowerCase())
  );

  // Group applications by campaign
  const byCampaign = visibleAppsList.reduce((acc, a) => {
    const id = a.campaign?._id || "unknown";
    acc[id] = acc[id] || { campaign: a.campaign, apps: [] };
    acc[id].apps.push(a);
    return acc;
  }, {});

  // Get applications filtered by status within a campaign group
  const getFilteredApps = (campId) => {
    const list = byCampaign[campId]?.apps || [];
    const f = (statusFilter && statusFilter[campId]) || "all";
    if (f === "all") return list;
    if (f === "pending")
      return list.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return (
          s !== "approved" &&
          s !== "rejected" &&
          s !== "order_submitted" &&
          s !== "order_form_approved" &&
          s !== "completed"
        );
      });
    return list.filter((a) => (a.status || "").toLowerCase() === f);
  };

  // --- Batch Actions Logic ---
  const DEFAULT_EXPORT_FIELDS = [
    "applicationId",
    "influencerName",
    "influencerEmail",
    "instagram",
    "followersAtApply",
    "status",
  ];

  const FIELD_OPTIONS = [
    { key: "applicationId", label: "Application ID" },
    { key: "campaignId", label: "Campaign ID" },
    { key: "campaignTitle", label: "Campaign Title" },
    { key: "brandName", label: "Brand Name" },
    { key: "influencerId", label: "Influencer ID" },
    { key: "influencerName", label: "Influencer Name" },
    { key: "influencerEmail", label: "Influencer Email" },
    { key: "instagram", label: "Instagram" },
    { key: "followersAtApply", label: "Followers at Apply" },
    { key: "status", label: "Status" },
    { key: "adminComment", label: "Admin Comment" },
    { key: "rejectionReason", label: "Rejection Reason" },
  ];

  const toggleField = (campId, field) =>
    setSelectedFields((s) => {
      const list = new Set(s[campId] || DEFAULT_EXPORT_FIELDS);
      if (field === "applicationId") return s; // applicationId is mandatory
      if (list.has(field)) list.delete(field);
      else list.add(field);
      list.add("applicationId");
      return { ...s, [campId]: Array.from(list) };
    });

  const openFieldsFor = (campId) => {
    setShowFields((s) => ({ ...s, [campId]: !s[campId] }));
    setSelectedFields((s) => ({
      ...s,
      [campId]: Array.from(
        new Set([...(s[campId] || DEFAULT_EXPORT_FIELDS), "applicationId"])
      ),
    }));
  };

  const toggleSelect = (campId, appId) =>
    setSelected((s) => {
      const setFor = new Set(s[campId] || []);
      if (setFor.has(appId)) setFor.delete(appId);
      else setFor.add(appId);
      return { ...s, [campId]: Array.from(setFor) };
    });

  const selectAllFor = (campId) =>
    setSelected((s) => ({
      ...s,
      [campId]: getFilteredApps(campId).map((a) => a._id),
    }));

  const clearSelectionFor = (campId) =>
    setSelected((s) => ({ ...s, [campId]: [] }));

  const downloadCSV = (filename, csvText) => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast?.add(`Exported ${filename}`, { type: "success" });
  };

  const exportCampaign = async (campId) => {
    toast?.add("Starting export…", { type: "info" });
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const fieldsArr = Array.from(
        new Set([
          ...(selectedFields[campId] || DEFAULT_EXPORT_FIELDS),
          "applicationId",
        ])
      );
      const params = new URLSearchParams();
      params.set("campaignId", campId);
      params.set("fields", fieldsArr.join(","));
      const res = await fetch(`/api/applications/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Export failed");
      }
      const text = await res.text();
      // if server returned empty CSV or only headers, still download so admin can inspect
      downloadCSV(`applications-${campId}.csv`, text);
    } catch (err) {
      toast?.add(err.message || "Export failed", { type: "error" });
    }
  };

  const exportSelected = (campId) => {
    // simplified export logic from your original function for selected rows
    const ids = selected[campId] || [];
    const rows = (byCampaign[campId]?.apps || []).filter((a) =>
      ids.includes(a._id)
    );
    if (!rows.length)
      return toast?.add("No applications selected", { type: "error" });

    // Create CSV content (placeholder for complexity)
    const csvContent =
      "applicationId,influencerName,status\n" +
      rows
        .map((r) => `${r._id},${r.influencer?.name || "N/A"},${r.status}`)
        .join("\n");
    downloadCSV(`applications-selected-${campId}.csv`, csvContent);
  };

  const batchAction = async (campId, action) => {
    const ids = selected[campId] || [];
    if (!ids.length)
      return toast?.add("No applications selected", { type: "error" });
    const payload = ids.map((id) => ({ applicationId: id, status: action }));
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/bulk-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Batch action failed");
      const body = await res.json();
      toast?.add(`Updated ${body.updated} applications`, { type: "success" });
      await loadFor();
      clearSelectionFor(campId);
    } catch (err) {
      toast?.add(err.message || "Batch action failed", { type: "error" });
    }
  };

  const importCSV = async (campId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/bulk-review`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) throw new Error("Import failed");
      const body = await res.json();
      toast?.add(`Imported - updated: ${body.updated}`, { type: "success" });
      await loadFor();
    } catch (err) {
      toast?.add(err.message || "Import failed", { type: "error" });
    }
  };

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
              const filteredApps = getFilteredApps(campId);
              const totalSelected = (selected[campId] || []).length;

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
                    whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <FaChevronDown className="w-4 h-4 text-purple-400" />
                      ) : (
                        <FaChevronRight className="w-4 h-4 text-purple-400" />
                      )}
                      <div>
                        <div className="font-extrabold text-lg text-white">
                          {g.campaign?.brandName ||
                            g.campaign?.title ||
                            "(Unknown Campaign)"}
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
                        <div className="px-4 pt-2 pb-4">
                          {/* Batch Controls and Filters Bar */}
                          <div className="flex flex-wrap items-center gap-2 py-3 border-b border-gray-700/50 mb-3">
                            {/* Status Filter Buttons */}
                            {[
                              { key: "all", label: "All" },
                              { key: "pending", label: "Pending" },
                              { key: "approved", label: "Approved" },
                              { key: "rejected", label: "Rejected" },
                              {
                                key: "order_submitted",
                                label: "Order Submitted",
                              },
                            ].map((opt) => {
                              const active =
                                (statusFilter[campId] || "all") === opt.key;
                              const count = g.apps.filter((a) =>
                                opt.key === "all"
                                  ? true
                                  : opt.key === "pending"
                                  ? a.status !== "approved" &&
                                    a.status !== "rejected" &&
                                    a.status !== "order_submitted" &&
                                    a.status !== "completed"
                                  : a.status === opt.key
                              ).length;
                              return (
                                <motion.button
                                  key={opt.key}
                                  type="button"
                                  onClick={() =>
                                    setStatusFilter((s) => ({
                                      ...s,
                                      [campId]: opt.key,
                                    }))
                                  }
                                  className={`px-3 py-1 rounded text-xs font-medium transition duration-200 ${
                                    active
                                      ? "bg-purple-600 text-white shadow-md"
                                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {opt.label} ({count})
                                </motion.button>
                              );
                            })}

                            <div className="ml-4 text-sm text-gray-400">
                              Showing{" "}
                              <span className="font-semibold text-white">
                                {filteredApps.length}
                              </span>{" "}
                              of {g.apps.length}
                            </div>
                          </div>

                          {/* Batch Action and Export Toolbar */}
                          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-700/50 rounded-lg">
                            <span className="text-sm font-semibold text-white">
                              Selected: {totalSelected}
                            </span>

                            <Button
                              type="button"
                              onClick={() => selectAllFor(campId)}
                              variant="primary"
                              size="sm"
                              className="bg-cyan-600 hover:bg-cyan-500"
                            >
                              <FaCheck /> All ({filteredApps.length})
                            </Button>
                            <Button
                              type="button"
                              onClick={() => clearSelectionFor(campId)}
                              variant="secondary"
                              size="sm"
                            >
                              <FaTimes /> Clear
                            </Button>

                            <Button
                              type="button"
                              onClick={() => batchAction(campId, "approved")}
                              variant="success"
                              size="sm"
                              disabled={totalSelected === 0}
                            >
                              Approve Selected
                            </Button>
                            <Button
                              type="button"
                              onClick={() => batchAction(campId, "rejected")}
                              variant="danger"
                              size="sm"
                              disabled={totalSelected === 0}
                            >
                              <FaTrashAlt /> Reject Selected
                            </Button>

                            {/* Export Options */}
                            <motion.div className="ml-auto flex gap-2">
                              <Button
                                type="button"
                                onClick={() => exportCampaign(campId)}
                                variant="secondary"
                                size="sm"
                                className="text-purple-400 hover:bg-purple-900/30"
                              >
                                <FaFileExport /> Export Campaign
                              </Button>
                              <Button
                                type="button"
                                onClick={() => exportSelected(campId)}
                                variant="secondary"
                                size="sm"
                                className="text-purple-400 hover:bg-purple-900/30"
                                disabled={totalSelected === 0}
                              >
                                Export Selected ({totalSelected})
                              </Button>
                              <label className="relative">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    document
                                      .getElementById(`import-${campId}`)
                                      .click()
                                  }
                                  variant="warning"
                                  size="sm"
                                  className="text-gray-900"
                                >
                                  <FaUpload /> Import CSV
                                </Button>
                                <input
                                  type="file"
                                  accept=".csv,text/csv"
                                  id={`import-${campId}`}
                                  className="hidden"
                                  onChange={(e) =>
                                    e.target.files.length > 0 &&
                                    importCSV(campId, e.target.files[0])
                                  }
                                />
                              </label>
                            </motion.div>
                          </div>

                          {/* Fields Chooser Dropdown Modal Trigger */}
                          <div className="text-right mb-4">
                            <motion.button
                              type="button"
                              onClick={() => openFieldsFor(campId)}
                              className="text-sm text-cyan-400 hover:text-cyan-300 transition"
                              whileHover={{ scale: 1.02 }}
                            >
                              {showFields[campId]
                                ? "Hide Export Fields"
                                : "Configure Export Fields"}
                            </motion.button>
                          </div>

                          {/* Export Fields Modal (Inline in content) */}
                          <AnimatePresence>
                            {showFields[campId] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 bg-gray-900 border border-gray-700 rounded mb-4 overflow-hidden"
                              >
                                <div className="text-sm text-gray-300 font-medium mb-2">
                                  Select fields to include in CSV export
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {FIELD_OPTIONS.map((opt) => (
                                    <label
                                      key={opt.key}
                                      className="flex items-center gap-2 text-sm text-white hover:text-cyan-400 transition cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(
                                          selectedFields[campId] ||
                                          DEFAULT_EXPORT_FIELDS
                                        ).includes(opt.key)}
                                        onChange={() =>
                                          toggleField(campId, opt.key)
                                        }
                                        disabled={opt.key === "applicationId"}
                                        className={`form-checkbox h-4 w-4 ${
                                          opt.key === "applicationId"
                                            ? "text-yellow-500"
                                            : "text-cyan-500"
                                        } bg-gray-700 border-gray-600 rounded focus:ring-cyan-500`}
                                      />
                                      {opt.label}{" "}
                                      {opt.key === "applicationId" && (
                                        <span className="text-xs text-yellow-500">
                                          (Mandatory)
                                        </span>
                                      )}
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-3 text-right">
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      setShowFields((s) => ({
                                        ...s,
                                        [campId]: false,
                                      }))
                                    }
                                    variant="ghost"
                                    size="sm"
                                  >
                                    Close
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* List of Applications (after toolbar) */}
                          <div className="divide-y divide-gray-700">
                            {filteredApps.map((a) => (
                              <motion.div
                                key={a._id}
                                className="py-3 flex items-start gap-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex-shrink-0 mt-1">
                                  <input
                                    type="checkbox"
                                    checked={(selected[campId] || []).includes(
                                      a._id
                                    )}
                                    onChange={() => toggleSelect(campId, a._id)}
                                    aria-label={`Select application ${a._id}`}
                                    className="form-checkbox h-5 w-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                  />
                                </div>
                                <div className="flex-1">
                                  <ApplicationCard
                                    application={a}
                                    showAdminActions
                                    onApprove={() =>
                                      openActionModal(a, "approve")
                                    }
                                    onReject={() =>
                                      openActionModal(a, "reject")
                                    }
                                    onViewDetails={() => openDetails(a)}
                                  />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* --- Application Details Modal (Unchanged) --- */}
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
                      {selectedApp.campaign?.brandName ||
                        selectedApp.campaign?.title ||
                        selectedApp.campaign}
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
                          Admin Comment (current stage):
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

                    {/* Full history lists for admins */}
                    {(selectedApp.adminComments &&
                      selectedApp.adminComments.length > 0) ||
                    (selectedApp.influencerComments &&
                      selectedApp.influencerComments.length > 0) ? (
                      <div className="mt-3">
                        <div className="text-sm font-semibold text-white mb-1">
                          Full Comment History
                        </div>
                        <div className="text-xs text-gray-300 bg-gray-900 p-3 rounded max-h-48 overflow-auto">
                          {selectedApp.adminComments &&
                            selectedApp.adminComments.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs text-yellow-300 font-semibold mb-1">
                                  Admin comments
                                </div>
                                {selectedApp.adminComments.map((c, i) => (
                                  <div
                                    key={`ac-${i}`}
                                    className="py-1 border-b border-gray-800"
                                  >
                                    <div className="text-xs text-gray-400">
                                      {c.stage} —{" "}
                                      {c.createdAt
                                        ? new Date(c.createdAt).toLocaleString()
                                        : ""}{" "}
                                      {c.by ? `(by ${String(c.by)})` : ""}
                                    </div>
                                    <div className="text-sm text-white">
                                      {c.comment}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          {selectedApp.influencerComments &&
                            selectedApp.influencerComments.length > 0 && (
                              <div>
                                <div className="text-xs text-cyan-300 font-semibold mb-1">
                                  Influencer comments
                                </div>
                                {selectedApp.influencerComments.map((c, i) => (
                                  <div
                                    key={`ic-${i}`}
                                    className="py-1 border-b border-gray-800"
                                  >
                                    <div className="text-xs text-gray-400">
                                      {c.stage} —{" "}
                                      {c.createdAt
                                        ? new Date(c.createdAt).toLocaleString()
                                        : ""}{" "}
                                      {c.by ? `(by ${String(c.by)})` : ""}
                                    </div>
                                    <div className="text-sm text-white italic">
                                      {c.comment}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ) : (
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
