import { useEffect, useState } from "react";
import Button from "../components/Button";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import AdminBackButton from "../components/AdminBackButton";
import { motion, AnimatePresence } from "framer-motion";
// import { FaMoneyBillWave, FaCheckCircle, FaTimes, FaCoins, FaInfoCircle, FaAngleDown, FaAngleUp, FaHourglassHalf } from "react-icons/fa";
import {
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimes,
  FaCoins,
  FaInfoCircle,
  FaAngleDown,
  FaAngleUp,
  FaHourglassHalf,
  FaRedo,
} from "react-icons/fa";
// 👆 FIX: FaRedo added here

// --- Main Component ---

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const auth = useAuth();

  const fetchWithAuth = async (url, opts = {}) => {
    const token = auth?.token || localStorage.getItem("accessToken");
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...opts, headers });
    return res;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/payments");
      if (!res.ok) throw new Error("Failed to load payments");
      const body = await res.json();
      setPayments(body || []);
    } catch (err) {
      toast?.add(err.message || "Failed to load payments", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to get status pill style
  const getStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return "bg-emerald-600";
      case "approved":
        return "bg-purple-600";
      case "pending":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  // Helper to format currency (assuming local currency is INR based on previous component context, but showing a generic symbol)
  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
    })}`;
  };

  const markPaid = async (id) => {
    if (
      !window.confirm(
        "CONFIRM: Mark this payment as PAID? This action is usually irreversible."
      )
    )
      return;
    try {
      const res = await fetchWithAuth(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error("Failed to update payment");
      toast?.add("Payment marked as PAID", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Failed to update payment", { type: "error" });
    }
  };

  const approvePartial = async (id) => {
    const raw = window.prompt("Enter PARTIAL amount to approve (numeric)");
    if (raw === null) return;
    const amount = Number(raw);
    if (Number.isNaN(amount) || amount <= 0)
      return toast?.add("Invalid or zero amount entered.", { type: "error" });

    const payNow = window.confirm(
      `CONFIRM: Approve ₹${amount.toLocaleString()} partially? Select OK to mark as PAID NOW, or Cancel to leave it approved/pending.`
    );

    try {
      const res = await fetchWithAuth(`/api/payments/${id}/approve-partial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, payNow }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Approve partial failed");
      }
      toast?.add("Partial payment approved/released", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  const approveRemaining = async (id) => {
    if (
      !window.confirm(
        "CONFIRM: Verify all deliverables are complete and RELEASE REMAINING payout?"
      )
    )
      return;
    try {
      const res = await fetchWithAuth(`/api/payments/${id}/approve-remaining`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Approve remaining failed");
      }
      toast?.add("Remaining payout released", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <AdminBackButton />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4"
        >
          <h1 className="text-3xl font-extrabold text-purple-400">
            <FaMoneyBillWave className="inline mr-2" /> Payments Dashboard
          </h1>
          <Button
            onClick={load}
            variant="secondary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FaRedo className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </motion.div>

        {/* Payment Table Container */}
        <motion.div
          className="bg-gray-800/90 rounded-xl shadow-2xl border border-gray-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="text-center p-8 text-lg text-cyan-400">
              <FaHourglassHalf className="w-6 h-6 mx-auto mb-2 animate-spin" />{" "}
              Loading payment data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-gray-400">
                    <th className="py-2 px-2 text-left">Campaign / Brand</th>
                    <th className="py-2 px-2 text-left">Influencer</th>
                    <th className="py-2 px-2 text-left">Amount Due</th>
                    <th className="py-2 px-2 text-left">Partial Approved</th>
                    <th className="py-2 px-2 text-left">Release Type</th>
                    <th className="py-2 px-2 text-left">Status</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, index) => (
                    <motion.tr
                      key={p._id}
                      className="border-t border-gray-700 bg-gray-700/30 hover:bg-gray-700 transition duration-200 cursor-pointer"
                      onClick={() => setSelectedPayment(p)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="py-3 px-2 font-semibold text-white truncate max-w-[150px] rounded-l-lg">
                        {p.campaign?.brandName || p.campaign?.title || "-"}
                      </td>
                      <td className="py-3 px-2 text-cyan-400">
                        {p.influencer?.name || p.influencer?.email || "-"}
                      </td>
                      <td className="py-3 px-2 font-bold text-lg">
                        {formatCurrency(
                          p.campaign && typeof p.campaign.budget === "number"
                            ? p.campaign.budget
                            : p.amount
                        )}
                      </td>
                      <td className="py-3 px-2 text-yellow-300">
                        {p.orderProofs && p.orderProofs.orderAmount
                          ? formatCurrency(p.orderProofs.orderAmount)
                          : p.amount
                          ? formatCurrency(p.amount)
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-gray-300">
                        {p.fulfillmentMethod === "brand"
                          ? "Brand Delivered"
                          : p.payoutRelease === "refund_on_delivery"
                          ? "Refund/Partial"
                          : "Full/Post-Deliverable"}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusStyle(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right rounded-r-lg">
                        <div className="flex gap-2 justify-end">
                          {/* Actions based on Payout Release Type and Status */}
                          {p.payoutRelease === "refund_on_delivery" ? (
                            <>
                              {/* Approve Partial */}
                              {!p.partialApproval ||
                              !p.partialApproval.amount ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approvePartial(p._id);
                                  }}
                                  size="sm"
                                  variant="accent"
                                  title="Approve a partial refund/advance amount"
                                >
                                  Partial
                                </Button>
                              ) : p.partialApproval.paid ? (
                                <span className="text-xs text-emerald-400 self-center">
                                  Partial Paid
                                </span>
                              ) : (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markPaid(p._id);
                                  }}
                                  size="sm"
                                  variant="success"
                                  title="Mark approved partial amount as paid"
                                >
                                  Mark Partial Paid
                                </Button>
                              )}

                              {/* Approve Remaining */}
                              {p.deliverablesProof &&
                              p.deliverablesProof.submittedAt &&
                              p.status !== "paid" ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveRemaining(p._id);
                                  }}
                                  size="sm"
                                  variant="success"
                                  title="Approve the remaining full amount after deliverables proof"
                                >
                                  Final Release
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            p.status !== "paid" &&
                            // only allow marking as paid when deliverables proof exists
                            (p.deliverablesProof &&
                            p.deliverablesProof.submittedAt ? (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markPaid(p._id);
                                }}
                                variant="success"
                                size="sm"
                              >
                                Mark Paid <FaCheckCircle className="ml-1" />
                              </Button>
                            ) : (
                              <span className="text-xs text-rose-400">
                                Awaiting deliverables
                              </span>
                            ))
                          )}

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayment(p);
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-400 py-6"
                      >
                        No pending or recent payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* --- Payment Details Modal --- */}
        <AnimatePresence>
          {selectedPayment && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/70"
                onClick={() => setSelectedPayment(null)}
              />
              <motion.div
                className="relative bg-gray-800 text-white rounded-xl p-6 max-w-xl w-full mx-auto shadow-2xl border border-purple-500/50 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start justify-between border-b border-gray-700 pb-3 mb-4">
                  <div>
                    <div className="text-2xl font-extrabold text-cyan-400">
                      Payment Details
                    </div>
                    <div className="text-sm text-gray-400">
                      Campaign:{" "}
                      {selectedPayment.campaign?.brandName ||
                        selectedPayment.campaign?.title ||
                        "-"}
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedPayment(null)}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-2 rounded-full"
                  >
                    <FaTimes />
                  </Button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <DetailRow
                      label="Influencer"
                      value={
                        selectedPayment.influencer?.name ||
                        selectedPayment.influencer?.email ||
                        "-"
                      }
                    />
                    <DetailRow
                      label="Email"
                      value={selectedPayment.influencer?.email || "-"}
                    />
                    <DetailRow
                      label="Total Amount"
                      value={formatCurrency(
                        selectedPayment.campaign &&
                          typeof selectedPayment.campaign.budget === "number"
                          ? selectedPayment.campaign.budget
                          : selectedPayment.amount
                      )}
                      valueColor="text-emerald-400 font-bold"
                    />
                    <DetailRow
                      label="Status"
                      value={selectedPayment.status}
                      valueColor={getStatusStyle(selectedPayment.status)}
                      isPill={true}
                    />
                    <DetailRow
                      label="Release Type"
                      value={selectedPayment.payoutRelease || "-"}
                    />
                    <DetailRow label="Payment ID" value={selectedPayment._id} />
                  </div>

                  {/* Partial Payment History */}
                  {selectedPayment.partialApproval?.amount > 0 && (
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                      <h4 className="font-bold text-purple-400 mb-2">
                        Partial Payout Status
                      </h4>
                      <DetailRow
                        label="Partial Approved"
                        value={formatCurrency(
                          selectedPayment.partialApproval.amount
                        )}
                        valueColor="text-yellow-400"
                      />
                      <DetailRow
                        label="Partial Paid"
                        value={
                          selectedPayment.partialApproval.paid ? "Yes" : "No"
                        }
                        valueColor={
                          selectedPayment.partialApproval.paid
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      />
                    </div>
                  )}

                  {/* Order/Deliverables Proof */}
                  {(selectedPayment.orderProofs ||
                    selectedPayment.deliverablesProof) && (
                    <div className="p-3 bg-gray-700/50 rounded-lg space-y-3">
                      <h4 className="font-bold text-purple-400">
                        Proof Submitted
                      </h4>
                      {selectedPayment.orderProofs?.submittedAt && (
                        <DetailRow
                          label="Order Proof Submitted"
                          value={new Date(
                            selectedPayment.orderProofs.submittedAt
                          ).toLocaleString()}
                        />
                      )}
                      {/* Detailed order proof fields (optional) */}
                      {selectedPayment.orderProofs?.orderAmount != null && (
                        <DetailRow
                          label="Request Amount"
                          value={formatCurrency(
                            selectedPayment.orderProofs.orderAmount
                          )}
                          valueColor="text-yellow-400"
                        />
                      )}
                      {selectedPayment.orderProofs?.engagementRate && (
                        <DetailRow
                          label="Engagement Rate"
                          value={selectedPayment.orderProofs.engagementRate}
                        />
                      )}
                      {selectedPayment.orderProofs?.impressions != null && (
                        <DetailRow
                          label="Impressions"
                          value={selectedPayment.orderProofs.impressions}
                        />
                      )}
                      {selectedPayment.orderProofs?.postLink && (
                        <DetailRow
                          label="Post Link"
                          value={
                            <a
                              href={selectedPayment.orderProofs.postLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.orderProofs?.comments && (
                        <DetailRow
                          label="Comments"
                          value={selectedPayment.orderProofs.comments}
                        />
                      )}
                      {selectedPayment.orderProofs?.reach != null && (
                        <DetailRow
                          label="Reach"
                          value={selectedPayment.orderProofs.reach}
                        />
                      )}
                      {selectedPayment.orderProofs?.videoViews != null && (
                        <DetailRow
                          label="Video Views"
                          value={selectedPayment.orderProofs.videoViews}
                        />
                      )}
                      {selectedPayment.orderProofs?.reelLink && (
                        <DetailRow
                          label="Reel Link"
                          value={
                            <a
                              href={selectedPayment.orderProofs.reelLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.orderProofs?.storyLink && (
                        <DetailRow
                          label="Story Link"
                          value={
                            <a
                              href={selectedPayment.orderProofs.storyLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.orderProofs?.feedback && (
                        <DetailRow
                          label="Feedback"
                          value={selectedPayment.orderProofs.feedback}
                        />
                      )}
                      {selectedPayment.orderProofs?.storyViews != null && (
                        <DetailRow
                          label="Story Views"
                          value={selectedPayment.orderProofs.storyViews}
                        />
                      )}
                      {selectedPayment.orderProofs?.storyInteractions !=
                        null && (
                        <DetailRow
                          label="Story Interactions"
                          value={selectedPayment.orderProofs.storyInteractions}
                        />
                      )}
                      {selectedPayment.orderProofs?.storyScreenshots &&
                        selectedPayment.orderProofs.storyScreenshots.length >
                          0 && (
                          <div className="pt-2">
                            <div className="font-semibold text-white mb-1">
                              Story Screenshots:
                            </div>
                            <div className="flex flex-col gap-2">
                              {selectedPayment.orderProofs.storyScreenshots.map(
                                (s, i) => (
                                  <a
                                    key={`ss-${i}`}
                                    href={s}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 underline"
                                  >
                                    Screenshot {i + 1}
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      {selectedPayment.deliverablesProof?.submittedAt && (
                        <DetailRow
                          label="Deliverables Submitted"
                          value={new Date(
                            selectedPayment.deliverablesProof.submittedAt
                          ).toLocaleString()}
                        />
                      )}
                      {/* Deliverables details (optional) */}
                      {selectedPayment.deliverablesProof?.proof && (
                        <DetailRow
                          label="Deliverables Proof"
                          value={
                            <a
                              href={selectedPayment.deliverablesProof.proof}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.deliverablesProof?.engagementRate && (
                        <DetailRow
                          label="Engagement Rate"
                          value={
                            selectedPayment.deliverablesProof.engagementRate
                          }
                        />
                      )}
                      {selectedPayment.deliverablesProof?.impressions !=
                        null && (
                        <DetailRow
                          label="Impressions"
                          value={selectedPayment.deliverablesProof.impressions}
                        />
                      )}
                      {selectedPayment.deliverablesProof?.postLink && (
                        <DetailRow
                          label="Post Link"
                          value={
                            <a
                              href={selectedPayment.deliverablesProof.postLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.deliverablesProof?.comments && (
                        <DetailRow
                          label="Comments"
                          value={selectedPayment.deliverablesProof.comments}
                        />
                      )}
                      {selectedPayment.deliverablesProof?.videoViews !=
                        null && (
                        <DetailRow
                          label="Video Views"
                          value={selectedPayment.deliverablesProof.videoViews}
                        />
                      )}
                      {selectedPayment.deliverablesProof?.reelLink && (
                        <DetailRow
                          label="Reel Link"
                          value={
                            <a
                              href={selectedPayment.deliverablesProof.reelLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 underline"
                            >
                              View
                            </a>
                          }
                        />
                      )}
                      {selectedPayment.deliverablesProof?.storyScreenshots &&
                        selectedPayment.deliverablesProof.storyScreenshots
                          .length > 0 && (
                          <div className="pt-2">
                            <div className="font-semibold text-white mb-1">
                              Story Screenshots:
                            </div>
                            <div className="flex flex-col gap-2">
                              {selectedPayment.deliverablesProof.storyScreenshots.map(
                                (s, i) => (
                                  <a
                                    key={`dss-${i}`}
                                    href={s}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 underline"
                                  >
                                    Screenshot {i + 1}
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      {selectedPayment.campaignScreenshot && (
                        <div className="pt-2">
                          <div className="font-semibold text-white mb-1">
                            Campaign Proof Screenshot:
                          </div>
                          <img
                            src={selectedPayment.campaignScreenshot}
                            alt="Campaign Proof"
                            className="max-w-xs h-auto rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment History */}
                  <div className="text-sm text-gray-300">
                    <div className="font-semibold text-white mb-2 border-b border-gray-700 pb-1">
                      Comment History
                    </div>
                    <div className="text-xs text-gray-300 bg-gray-900 p-3 rounded max-h-48 overflow-auto space-y-3">
                      {(selectedPayment.adminComments || [])
                        .concat(selectedPayment.influencerComments || [])
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt) - new Date(a.createdAt)
                        )
                        .map((c, i) => (
                          <div
                            key={`comment-${i}`}
                            className="pb-2 border-b border-gray-800 last:border-b-0"
                          >
                            <div className="text-xs text-gray-400 font-semibold flex justify-between">
                              <span>
                                {c.stage} —{" "}
                                {c.byName ||
                                  (c.by && c.by.name) ||
                                  "Admin/System"}
                              </span>
                              <span>
                                {c.createdAt
                                  ? new Date(c.createdAt).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                            <div
                              className={`text-sm mt-1 ${
                                c.stage === "Admin"
                                  ? "text-yellow-300"
                                  : "text-white italic"
                              }`}
                            >
                              {c.comment}
                            </div>
                          </div>
                        )) || (
                        <div className="text-sm text-gray-500">
                          No comments recorded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-right">
                  <Button
                    onClick={() => setSelectedPayment(null)}
                    variant="secondary"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Reusable Detail Row Component (for Modal)
const DetailRow = ({
  label,
  value,
  valueColor = "text-white",
  isPill = false,
}) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-600/50 last:border-b-0">
    <span className="text-gray-400">{label}</span>
    {isPill ? (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold text-white ${valueColor}`}
      >
        {value}
      </span>
    ) : (
      <span className={`font-medium ${valueColor}`}>{value}</span>
    )}
  </div>
);
