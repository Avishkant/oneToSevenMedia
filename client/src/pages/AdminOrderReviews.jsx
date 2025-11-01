import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import ApplicationCard from "../components/ApplicationCard";
import OrderModal from "../components/OrderModal";
import Button from "../components/Button";
import {
  FaSearch,
  FaRedo,
  FaTimes,
  FaUserAlt,
  FaCommentDots,
  FaFileExport,
  FaUpload,
  FaCheck,
  FaTrashAlt,
} from "react-icons/fa";

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

export default function AdminOrderReviews() {
  const [filter, setFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();

  const [selected, setSelected] = useState({});
  const [showFields, _setShowFields] = useState({});
  const [selectedFields, _setSelectedFields] = useState({});
  const [statusFilter, _setStatusFilter] = useState({});

  const [expanded, setExpanded] = useState({});
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [orderModalApp, setOrderModalApp] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importResultsOpen, setImportResultsOpen] = useState(false);

  const fetchWithAuth = async (url, opts = {}) => {
    const token = auth?.token || localStorage.getItem("accessToken");
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...opts, headers });
    return res;
  };

  const formatPayoutRelease = (val) => {
    if (!val) return "";
    switch (String(val)) {
      case "refund_on_delivery":
        return "Refund on delivery; remaining after deliverables";
      case "pay_after_deliverables":
        return "Pay order + deliverables after deliverables performed";
      case "advance_then_remaining":
        return "Pay order in advance; remaining after deliverables";
      default:
        return String(val);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/applications/orders`);
      if (!res.ok) throw new Error("Failed to load orders");
      let body = await res.json();
      if (filter && filter.trim()) {
        const q = filter.trim().toLowerCase();
        body = body.filter((a) =>
          (a.campaign?.brandName || "").toLowerCase().includes(q)
        );
      }
      setOrders(body || []);
    } catch (err) {
      toast?.add(err.message || "Failed to load orders", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCampaign = orders.reduce((acc, a) => {
    const id = a.campaign?._id || "unknown";
    acc[id] = acc[id] || { campaign: a.campaign, apps: [] };
    acc[id].apps.push(a);
    return acc;
  }, {});

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

  // Export field defaults and options
  const DEFAULT_EXPORT_FIELDS = [
    "applicationId",
    "campaignId",
    "campaignTitle",
    "brandName",
    "influencerId",
    "influencerName",
    "influencerEmail",
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
    // Order-specific fields (when influencer places order themselves)
    { key: "orderId", label: "Order ID" },
    { key: "ss", label: "Screenshot / Proof (ss)" },
    { key: "amount", label: "Amount" },
    // Shipping / address fields
    { key: "shippingAddress.line1", label: "Address Line 1" },
    { key: "shippingAddress.line2", label: "Address Line 2" },
    { key: "shippingAddress.city", label: "City" },
    { key: "shippingAddress.state", label: "State" },
    { key: "shippingAddress.postalCode", label: "Postal Code" },
    { key: "shippingAddress.country", label: "Country" },
  ];

  const openFieldsFor = (campId) => {
    _setShowFields((s) => ({ ...s, [campId]: !s[campId] }));
    _setSelectedFields((s) => ({
      ...s,
      [campId]: Array.from(
        new Set([...(s[campId] || DEFAULT_EXPORT_FIELDS), "applicationId"])
      ),
    }));
  };

  const toggleField = (campId, fieldKey) => {
    _setSelectedFields((s) => {
      const cur = new Set(s[campId] || DEFAULT_EXPORT_FIELDS);
      if (fieldKey === "applicationId")
        return {
          ...s,
          [campId]: Array.from(new Set([...(cur || []), "applicationId"])),
        };
      if (cur.has(fieldKey)) cur.delete(fieldKey);
      else cur.add(fieldKey);
      cur.add("applicationId");
      return { ...s, [campId]: Array.from(cur) };
    });
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

  const act = async (id, verb, extra = {}) => {
    try {
      const res = await fetchWithAuth(`/api/applications/${id}/order/${verb}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extra),
      });
      if (!res.ok) {
        const bodyErr = await res.json().catch(() => ({}));
        throw new Error(bodyErr.error || "Action failed");
      }
      const body = await res.json().catch(() => null);
      toast?.add(`${verb}ed`, { type: "success" });
      await load();
      return body;
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  const openActionModal = (app, verb) =>
    setActionState({ open: true, app, verb, comment: "", reason: "" });
  const closeActionModal = () => setActionState(null);
  const confirmActionModal = async () => {
    if (!actionState) return;
    const { app, verb, comment, reason } = actionState;
    const result = await act(app._id, verb, { comment, reason });
    // result may be the updated application or null
    const updatedApp = result || app;
    // determine fulfillment method: influencer or brand
    const method =
      updatedApp.fulfillmentMethod ||
      updatedApp.campaign?.fulfillmentMethod ||
      app.fulfillmentMethod ||
      app.campaign?.fulfillmentMethod ||
      "influencer";

    // If rejected, open order modal so influencer/admin can re-submit details
    if (verb === "reject") {
      // attach admin comment / rejection reason so modal pre-fills it
      if (reason) updatedApp.adminComment = reason;
      else if (comment) updatedApp.adminComment = comment;
      // For both influencer and brand, open order modal to allow filling required fields
      setOrderModalApp(updatedApp);
    }

    // If approved:
    if (verb === "approve") {
      if (method === "influencer") {
        // Approved influencer-submitted order: notify that it's accepted (influencer will see acceptance)
        toast?.add("Order accepted and influencer will be notified", {
          type: "success",
        });
      } else {
        // Approved brand order: mark as placed
        toast?.add("Order marked as placed", { type: "success" });
      }
    }

    closeActionModal();
  };

  const exportSelected = (campId) => {
    const ids = selected[campId] || [];
    const rows = (byCampaign[campId]?.apps || []).filter((a) =>
      ids.includes(a._id)
    );
    if (!rows.length)
      return toast?.add("No orders selected", { type: "error" });

    const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;

    const fields =
      selectedFields[campId] && selectedFields[campId].length
        ? selectedFields[campId]
        : DEFAULT_EXPORT_FIELDS;

    // ensure applicationId is always present and first
    const orderedFields = Array.from(new Set(["applicationId", ...fields]));

    const fieldLabel = (key) => {
      const opt = FIELD_OPTIONS.find((o) => o.key === key);
      return opt ? opt.label : key;
    };

    const getNested = (obj, path) => {
      if (!obj || !path) return "";
      const parts = path.split(".");
      let cur = obj;
      for (const p of parts) {
        if (cur == null) return "";
        cur = cur[p];
      }
      return cur == null ? "" : cur;
    };

    const getFieldValue = (r, key) => {
      // common mapped keys
      try {
        if (key === "applicationId") return r._id || "";
        if (key === "campaignId") return r.campaign?._id || "";
        if (key === "campaignTitle") return r.campaign?.title || "";
        if (key === "brandName") return r.campaign?.brandName || "";
        if (key === "influencerId") return r.influencer?._id || "";
        if (key === "influencerName") return r.influencer?.name || "";
        if (key === "influencerEmail") return r.influencer?.email || "";
        if (key === "instagram")
          return (
            r.influencer?.instagram || r.influencer?.social?.instagram || ""
          );
        if (key === "followersAtApply")
          return r.followersAtApply || r.influencer?.followers || "";
        if (key === "status") return r.status || "";
        if (key === "adminComment") return r.adminComment || "";
        if (key === "rejectionReason")
          return r.rejectionReason || r.rejection_reason || "";
        if (key === "orderId")
          return getNested(r.orderData, "orderId") || r.orderId || "";
        if (key === "ss") return getNested(r.orderData, "ss") || r.ss || "";
        if (key === "amount")
          return (
            getNested(r.orderData, "amount") ||
            getNested(r.orderData, "payment.amount") ||
            r.amount ||
            ""
          );

        // dot-notation (e.g., shippingAddress.city)
        if (key.includes(".")) {
          const parts = key.split(".");
          // try application-level path first
          const val1 = getNested(r, key);
          if (val1 !== "") return val1;
          // try orderData fallback
          const val2 = getNested(r.orderData, key);
          if (val2 !== "") return val2;
          // try shippingAddress inside orderData
          if (parts[0] === "shippingAddress") {
            const k2 = parts.slice(1).join(".");
            return (
              getNested(r.shippingAddress, k2) ||
              getNested(r.orderData?.shippingAddress, k2) ||
              ""
            );
          }
          return "";
        }

        // fallback: look in orderData or raw object
        return getNested(r.orderData, key) || r[key] || "";
      } catch {
        return "";
      }
    };

    const header = orderedFields.map((f) => esc(fieldLabel(f))).join(",");
    const csvRows = rows.map((r) =>
      orderedFields.map((f) => esc(getFieldValue(r, f))).join(",")
    );
    const csv = [header, ...csvRows].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-selected-${campId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast?.add("Exported selected orders", { type: "success" });
  };

  const exportCampaign = async (campId) => {
    try {
      const fields = (selectedFields[campId] || []).join(",");
      const res = await fetchWithAuth(
        `/api/applications/export?campaignId=${encodeURIComponent(
          campId
        )}&fields=${encodeURIComponent(fields)}`
      );
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      const blob = new Blob(["\uFEFF" + text], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${campId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast?.add("Exported campaign", { type: "success" });
    } catch (err) {
      toast?.add(err.message || "Export failed", { type: "error" });
    }
  };

  const batchAction = async (campId, action) => {
    const ids = selected[campId] || [];
    if (!ids.length) return toast?.add("No orders selected", { type: "error" });
    try {
      await Promise.all(
        ids.map((id) =>
          act(id, action === "approve" ? "approve" : "reject", {})
        )
      );
      clearSelectionFor(campId);
      await load();
    } catch (err) {
      toast?.add(err.message || "Batch action failed", { type: "error" });
    }
  };

  const importCSV = async (campId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      // Use the order-specific bulk review endpoint so CSVs imported from the
      // Order Reviews dashboard apply order-approval/rejection semantics.
      const res = await fetchWithAuth(
        `/api/applications/bulk-order-review?campaignId=${encodeURIComponent(
          campId
        )}`,
        { method: "POST", body: fd }
      );
      if (!res.ok) throw new Error("Import failed");
      const body = await res.json();
      // Save results and open modal so admin can inspect notFound/errors
      setImportResults(body);
      setImportResultsOpen(true);
      toast?.add(
        `Imported - updated: ${body.updated} staged: ${body.staged || 0}`,
        { type: "success" }
      );
      await load();
    } catch (err) {
      toast?.add(err.message || "Import failed", { type: "error" });
    }
  };

  const copyImportFailures = async () => {
    if (!importResults) return;
    const blob = {
      updated: importResults.updated || 0,
      notFound: importResults.notFound || [],
      errors: importResults.errors || [],
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(blob, null, 2));
      toast?.add("Import results copied to clipboard", { type: "success" });
    } catch {
      toast?.add("Failed to copy import results to clipboard", {
        type: "error",
      });
    }
  };

  const downloadImportResults = () => {
    if (!importResults) return;
    const data = JSON.stringify(importResults, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Order Reviews</h1>
        </div>

        <div className="glass p-4 rounded text-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <StyledInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter campaigns by brand"
            />
            <Button onClick={load} variant="primary" size="sm">
              <FaSearch /> Search
            </Button>
            <Button
              onClick={() => {
                setFilter("");
                load();
              }}
              variant="secondary"
              size="sm"
            >
              <FaRedo /> Refresh
            </Button>
            <div className="ml-auto text-sm text-gray-400">
              {" "}
              Showing{" "}
              <span className="font-semibold text-white">
                {orders.length}
              </span>{" "}
              order{orders.length !== 1 ? "s" : ""}{" "}
            </div>
          </div>

          {Object.entries(byCampaign).length === 0 && (
            <div className="text-sm text-slate-300">
              {loading ? "Loading..." : "No submitted orders."}
            </div>
          )}

          {Object.entries(byCampaign).map(([campId, g]) => {
            const isExpanded = !!expanded[campId];
            const filtered = getFilteredApps(campId);
            const totalSelected = (selected[campId] || []).length;
            return (
              <div
                key={campId}
                className="bg-gray-800/90 rounded-xl shadow-md border border-gray-700/50 overflow-hidden mb-4"
              >
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() =>
                    setExpanded((s) => ({ ...s, [campId]: !s[campId] }))
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="font-extrabold text-lg text-white">
                      {g.campaign?.brandName ||
                        g.campaign?.title ||
                        "(Unknown Campaign)"}
                    </div>
                    <div className="text-sm text-gray-400">
                      <div>
                        Brand:{" "}
                        <span className="font-medium text-cyan-400">
                          {g.campaign?.brandName || "-"}
                        </span>
                      </div>
                      {g.campaign?.adminComment && (
                        <div className="text-xs text-yellow-300 mt-1">
                          Admin note: {g.campaign.adminComment}
                        </div>
                      )}
                      {g.campaign?.payoutRelease && (
                        <div className="text-xs text-slate-300 mt-1">
                          Payout:{" "}
                          {formatPayoutRelease(g.campaign.payoutRelease)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="font-semibold text-white">
                      {g.apps.length}
                    </span>{" "}
                    order{g.apps.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pt-2 pb-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold text-white">
                        Selected: {totalSelected}
                      </span>
                      <Button
                        type="button"
                        onClick={() => selectAllFor(campId)}
                        size="sm"
                      >
                        All ({filtered.length})
                      </Button>
                      <Button
                        type="button"
                        onClick={() => clearSelectionFor(campId)}
                        size="sm"
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        onClick={() => batchAction(campId, "approve")}
                        size="sm"
                        disabled={totalSelected === 0}
                      >
                        Approve Selected
                      </Button>
                      <Button
                        type="button"
                        onClick={() => batchAction(campId, "reject")}
                        size="sm"
                        disabled={totalSelected === 0}
                      >
                        Reject Selected
                      </Button>

                      <div className="ml-auto flex gap-2">
                        <Button
                          onClick={() => exportCampaign(campId)}
                          size="sm"
                        >
                          <FaFileExport /> Export Campaign
                        </Button>
                        <Button
                          onClick={() => exportSelected(campId)}
                          size="sm"
                          disabled={totalSelected === 0}
                        >
                          <FaFileExport /> Export Selected
                        </Button>
                        <label>
                          <Button
                            onClick={() =>
                              document
                                .getElementById(`import-${campId}`)
                                .click()
                            }
                            size="sm"
                          >
                            <FaUpload /> Import CSV
                          </Button>
                          <input
                            id={`import-${campId}`}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files.length > 0 &&
                              importCSV(campId, e.target.files[0])
                            }
                          />
                        </label>

                        <Button
                          onClick={() => openFieldsFor(campId)}
                          size="sm"
                          variant="ghost"
                        >
                          Configure Export Fields
                        </Button>
                      </div>
                    </div>

                    {/* Per-campaign export field chooser visible in the campaign filter area */}
                    {showFields[campId] && (
                      <div className="mt-3 p-3 bg-gray-900 border border-gray-700 rounded">
                        <div className="text-sm text-gray-300 font-medium mb-2">
                          Select fields to include in CSV export for this
                          campaign
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                onChange={() => toggleField(campId, opt.key)}
                                disabled={opt.key === "applicationId"}
                                className="form-checkbox h-4 w-4"
                              />
                              {opt.label}{" "}
                              {opt.key === "applicationId" && (
                                <span className="text-xs text-yellow-400">
                                  (Required)
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 text-right">
                          <Button
                            onClick={() =>
                              _setShowFields((s) => ({ ...s, [campId]: false }))
                            }
                            size="sm"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-gray-700">
                      {filtered.map((a) => (
                        <div
                          key={a._id}
                          className="py-3 flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={(selected[campId] || []).includes(a._id)}
                              onChange={() => toggleSelect(campId, a._id)}
                              className="form-checkbox h-5 w-5"
                            />
                          </div>
                          <div className="flex-1">
                            <ApplicationCard
                              application={a}
                              showAdminActions
                              onApprove={() => openActionModal(a, "approve")}
                              onReject={() => openActionModal(a, "reject")}
                              onViewDetails={() => setSelectedApp(a)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setSelectedApp(null)}
            />
            <div className="relative bg-gray-800 text-white rounded-xl p-6 max-w-3xl w-full mx-auto shadow-2xl border border-purple-500/50 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-gray-700 pb-3 mb-4">
                <div>
                  <div className="text-2xl font-extrabold text-cyan-400">
                    Order Details
                  </div>
                  <div className="text-sm text-gray-400">
                    Campaign:{" "}
                    {selectedApp.campaign?.brandName ||
                      selectedApp.campaign?.title ||
                      selectedApp.campaign}
                  </div>
                </div>
                <Button onClick={() => setSelectedApp(null)} variant="ghost">
                  <FaTimes />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

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
                  ) : null}
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-700">
                  <div className="text-lg font-bold text-cyan-400 mb-2">
                    Order & Address Details
                  </div>

                  {/* Quick-order summary: always show order id / payout amount / screenshot when present */}
                  <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-sm text-gray-300 font-medium">
                        Order ID
                      </div>
                      <div className="text-white">
                        {selectedApp.orderId ||
                          (selectedApp.orderData &&
                            selectedApp.orderData.orderId) ||
                          "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 font-medium">
                        Amount
                      </div>
                      <div className="text-white">
                        {(selectedApp.payout &&
                          (selectedApp.payout.amount ||
                            selectedApp.payout.total)) ||
                          (selectedApp.orderData &&
                            (selectedApp.orderData.amount ||
                              selectedApp.orderData.payment?.amount)) ||
                          "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 font-medium">
                        Proof
                      </div>
                      <div className="text-white">
                        {selectedApp.campaignScreenshot ? (
                          <a
                            href={selectedApp.campaignScreenshot}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View screenshot
                          </a>
                        ) : selectedApp.orderData &&
                          selectedApp.orderData.ss ? (
                          <a
                            href={selectedApp.orderData.ss}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            View proof
                          </a>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fulfillment method snapshot (campaign snapshot or application snapshot) */}
                  {(selectedApp.fulfillmentMethod ||
                    selectedApp.campaign?.fulfillmentMethod) && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-300 font-medium">
                        Fulfillment Method
                      </div>
                      <div className="text-white">
                        {selectedApp.fulfillmentMethod ||
                          selectedApp.campaign?.fulfillmentMethod}
                      </div>
                    </div>
                  )}

                  {/* Shipping address */}
                  {selectedApp.shippingAddress &&
                    Object.keys(selectedApp.shippingAddress).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-300 font-medium">
                          Shipping Address
                        </div>
                        <div className="text-sm text-gray-200 bg-gray-800/60 p-3 rounded mt-1">
                          {Object.entries(selectedApp.shippingAddress).map(
                            ([k, v]) => (
                              <div key={k} className="py-0.5">
                                <span className="text-gray-400">{k}:</span>{" "}
                                <span className="text-white">
                                  {String(v || "-")}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Order form fields (use application snapshot fields if available, otherwise campaign fields, fallback to raw orderData) */}
                  {(() => {
                    const formFields =
                      selectedApp.orderFormFields ||
                      selectedApp.campaign?.orderFormFields ||
                      [];
                    const data = selectedApp.orderData || {};
                    if (!formFields || formFields.length === 0) {
                      return (
                        <div className="space-y-3 text-sm text-gray-300">
                          {Object.keys(data).length === 0 ? (
                            <div className="text-gray-500">No order data.</div>
                          ) : (
                            Object.entries(data).map(([k, v]) => (
                              <div
                                key={k}
                                className="py-1 border-b border-gray-700/50 last:border-b-0"
                              >
                                <div className="text-white font-medium">
                                  {k}
                                </div>
                                <div className="text-gray-400">
                                  {typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 text-sm text-gray-300">
                        {formFields.map((f, idx) => {
                          const key = f.key || f.name || `field_${idx}`;
                          let value = "";
                          if (key.startsWith("shippingAddress.")) {
                            const k2 = key.split(".")[1];
                            value =
                              (selectedApp.shippingAddress &&
                                selectedApp.shippingAddress[k2]) ||
                              "";
                          } else {
                            value = data[key];
                            if (
                              typeof value === "undefined" ||
                              value === null
                            ) {
                              value = selectedApp[key];
                            }
                          }
                          return (
                            <div
                              key={key}
                              className="py-1 border-b border-gray-700/50 last:border-b-0"
                            >
                              <div className="text-white font-medium">
                                {f.label || f.title || key}
                              </div>
                              <div className="text-gray-400">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value || "-")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {actionState && actionState.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setActionState(null)}
            />
            <div className="relative bg-gray-800 text-white rounded-xl p-6 max-w-lg w-full mx-auto shadow-2xl border border-purple-500/50">
              <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-4">
                <div
                  className={`text-xl font-bold ${
                    actionState.verb === "approve"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {actionState.verb === "approve"
                    ? "Approve Order"
                    : "Reject Order"}
                </div>
                <Button onClick={() => setActionState(null)} variant="ghost">
                  <FaTimes />
                </Button>
              </div>

              <div>
                <div className="text-sm text-gray-400 font-semibold mb-1">
                  Optional Comment to the Influencer
                </div>
                <StyledTextarea
                  value={actionState.comment}
                  onChange={(e) =>
                    setActionState((s) => ({ ...s, comment: e.target.value }))
                  }
                  placeholder="Add a note for the influencer"
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
                      placeholder="Rejection reason"
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
                    onClick={() => setActionState(null)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Order modal used to let influencer/admin fill order or address after rejection */}
        {importResultsOpen && importResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setImportResultsOpen(false)}
            />
            <div className="relative bg-gray-800 text-white rounded-xl p-6 max-w-2xl w-full mx-auto shadow-2xl border border-purple-500/50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold">Import Results</div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={copyImportFailures}
                    variant="ghost"
                    size="sm"
                  >
                    Copy
                  </Button>
                  <Button
                    onClick={downloadImportResults}
                    variant="secondary"
                    size="sm"
                  >
                    Download JSON
                  </Button>
                  <Button
                    onClick={() => setImportResultsOpen(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-300 mb-3">
                Summary:{" "}
                <span className="font-semibold text-white">
                  {importResults.updated || 0}
                </span>{" "}
                updated,{" "}
                <span className="font-semibold text-white">
                  {(importResults.notFound || []).length}
                </span>{" "}
                not found,{" "}
                <span className="font-semibold text-white">
                  {(importResults.errors || []).length}
                </span>{" "}
                errors
              </div>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
                <div>
                  <div className="text-sm font-semibold mb-2">Not Found</div>
                  <div className="text-xs text-gray-300 bg-gray-900 p-3 rounded h-64 overflow-auto">
                    {importResults.notFound && importResults.notFound.length ? (
                      importResults.notFound.map((n, idx) => (
                        <div
                          key={idx}
                          className="py-1 border-b border-gray-800"
                        >
                          <div className="text-xs text-rose-400">
                            Row {n.row}
                          </div>
                          <div className="text-xs">{n.reason}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">
                        No missing applications
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Errors</div>
                  <div className="text-xs text-gray-300 bg-gray-900 p-3 rounded h-64 overflow-auto">
                    {importResults.errors && importResults.errors.length ? (
                      importResults.errors.map((e, idx) => (
                        <div
                          key={idx}
                          className="py-1 border-b border-gray-800"
                        >
                          <div className="text-xs text-rose-400">
                            Row {e.row}
                          </div>
                          <div className="text-xs">
                            {e.reason}
                            {e.value ? ` — value: ${String(e.value)}` : ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No errors</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <OrderModal
          open={!!orderModalApp}
          onClose={() => setOrderModalApp(null)}
          application={orderModalApp}
          token={auth?.token}
          onSuccess={async () => {
            setOrderModalApp(null);
            toast?.add("Order submitted", { type: "success" });
            await load();
          }}
        />
      </div>
    </div>
  );
}
