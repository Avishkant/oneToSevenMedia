import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaDollarSign,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaClipboardCheck,
  FaFileAlt,
  FaHourglassHalf,
  FaRedo,
} from "react-icons/fa"; // Ensure all icons are imported

// --- Custom Styled Input Component (for Modal forms) ---
const StyledInput = ({ className = "", error, ...props }) => (
  <>
    <input
      className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border ${
        error
          ? "border-rose-500 focus:ring-rose-400"
          : "border-gray-600 focus:ring-cyan-400"
      } text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition duration-200 ${className}`}
      {...props}
    />
    {error && <div className="text-rose-400 text-xs mt-1">{error}</div>}
  </>
);

// Helper for formatting currency
const formatCurrency = (amount) => {
  return `₹${(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
  })}`;
};

// NOTE: amount resolution is handled inline in the table cells below.

// --- Main Component ---
export default function InfluencerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const auth = useAuth();

  const fetchWithAuth = async (url, opts = {}) => {
    const token = auth?.token || localStorage.getItem("accessToken");
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...opts, headers });
  };

  // Refreshes all data
  const refreshPayments = async () => {
    setLoading(true);
    try {
      const [paymentsRes, meRes] = await Promise.all([
        fetchWithAuth("/api/payments/me"),
        fetchWithAuth("/api/users/me"),
      ]);

      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch (error) {
      // Log error for debugging; user-facing message is generic
      console.error(error);
      toast?.add("Failed to load payments or profile", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (id, type) => setModal({ id, type });
  const closeForm = () => setModal(null);

  const submitOrderProof = async (id, payload) => {
    try {
      const res = await fetchWithAuth(
        `/api/payments/${id}/submit-order-proof`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast?.add("Order proof submitted", { type: "success" });
      await refreshPayments();
    } catch (err) {
      toast?.add(err.message || "Submit failed", { type: "error" });
    }
  };

  const submitDeliverables = async (id, payload) => {
    try {
      const res = await fetchWithAuth(
        `/api/payments/${id}/submit-deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast?.add("Deliverables submitted", { type: "success" });
      await refreshPayments();
    } catch (err) {
      toast?.add(err.message || "Submit failed", { type: "error" });
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600">
            Paid
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600">
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-600">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-600">
            {status || "N/A"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        {/* Header and Refresh */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4"
        >
          <h2 className="text-3xl font-extrabold text-cyan-400">
            <FaMoneyBillWave className="inline mr-2" /> My Payouts
          </h2>
          <Button
            onClick={refreshPayments}
            variant="secondary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FaRedo className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </motion.div>

        {/* Bank Details Warning */}
        <AnimatePresence>
          {me &&
            (!me.bankAccountNumber || !me.bankAccountName || !me.bankName) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 text-yellow-300 bg-yellow-900/40 border border-yellow-700 rounded-xl flex items-center gap-3 shadow-md"
              >
                <FaExclamationTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  **Action Required:** Please add your bank details in your
                  <Link
                    to="/influencer/profile"
                    className="font-bold text-yellow-100 hover:underline ml-1"
                  >
                    Profile
                  </Link>
                  to receive payouts and avoid delays.
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* --- Payments Table --- */}
        <motion.div
          className="bg-gray-800/90 rounded-xl shadow-2xl border border-gray-700 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="text-center p-8 text-lg text-purple-400">
              Loading payment data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-gray-400 border-b-2 border-gray-700/50">
                    <th className="py-3 px-2">Campaign</th>
                    <th className="py-3 px-2">Order Amount</th>
                    <th className="py-3 px-2">Amount</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Payment Type</th>
                    <th className="py-3 px-2 text-right">Progress/Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments || []).map((p, index) => (
                    <motion.tr
                      key={p._id}
                      className="bg-gray-700/30 hover:bg-gray-700 transition duration-200 cursor-pointer"
                      onClick={() =>
                        console.log("Open payment history/details")
                      } // Placeholder for full details modal
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="py-3 px-2 font-semibold text-white truncate max-w-[150px] rounded-l-lg">
                        {p.campaign?.title || p.campaignTitle || "-"}
                      </td>

                      <td className="py-3 px-2 text-yellow-300">
                        {p.orderProofs &&
                        typeof p.orderProofs.orderAmount === "number"
                          ? formatCurrency(p.orderProofs.orderAmount)
                          : p.amount
                          ? formatCurrency(p.amount)
                          : "-"}
                        {p?.partialApproval &&
                          p.partialApproval.amount != null && (
                            <div className="text-xs text-yellow-200 mt-1">
                              Approved:{" "}
                              {formatCurrency(p.partialApproval.amount)}
                            </div>
                          )}
                      </td>

                      <td className="py-3 px-2 font-bold text-purple-400">
                        {formatCurrency(
                          p.campaign && typeof p.campaign.budget === "number"
                            ? p.campaign.budget
                            : p.amount
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {getStatusPill(p.status || p.state)}
                      </td>

                      <td className="py-3 px-2 text-sm text-gray-300">
                        {p.payoutRelease === "refund_on_delivery"
                          ? "Refund/Partial"
                          : "Full Payment"}
                      </td>
                      <td className="py-3 px-2 text-right space-y-1 rounded-r-lg">
                        {p.payoutRelease === "refund_on_delivery" ? (
                          // --- REFUND/PARTIAL Payout Flow ---
                          <div className="flex flex-col items-end gap-2">
                            {/* 1. Order Proof Submission */}
                            {!p.orderProofs || !p.orderProofs.submittedAt ? (
                              <Button
                                size="sm"
                                variant="accent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openForm(p._id, "order");
                                }}
                              >
                                Fill Order Proof
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-semibold">
                                Order Proof Submitted
                              </span>
                            )}

                            {/* 2. Deliverables Proof Submission */}
                            {p.orderProofs &&
                              p.orderProofs.submittedAt &&
                              (!p.deliverablesProof ||
                                !p.deliverablesProof.submittedAt) && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openForm(p._id, "deliverables");
                                  }}
                                >
                                  Fill Deliverables Proof
                                </Button>
                              )}

                            {/* Status Indicators */}
                            {p.orderProofs &&
                              p.orderProofs.submittedAt &&
                              p.deliverablesProof &&
                              p.deliverablesProof.submittedAt &&
                              p.status !== "paid" && (
                                <span className="text-xs text-yellow-300">
                                  Awaiting Final Review
                                </span>
                              )}
                          </div>
                        ) : (
                          // --- STANDARD Payout Flow (After Deliverables) ---
                          p.status !== "paid" &&
                          p.status === "approved" && (
                            <span className="text-sm font-medium text-purple-300">
                              Awaiting Admin Payout
                            </span>
                          )
                        )}

                        {/* Paid Indicator */}
                        {p.status === "paid" && (
                          <div className="text-sm font-bold text-emerald-400">
                            Paid:{" "}
                            {new Date(
                              p.payout?.paidAt || Date.now()
                            ).toLocaleDateString()}
                          </div>
                        )}

                        <div className="w-full">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("View History");
                            }}
                          >
                            View History
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}

                  {payments.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-400 py-6"
                      >
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* --- Modal Container --- */}
        <AnimatePresence>
          {modal && (
            <motion.div
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/70"
                onClick={closeForm}
              />
              <div className="relative z-[10002] max-w-md w-full max-h-[85vh] overflow-y-auto">
                {modal.type === "order" ? (
                  <OrderProofInline
                    payment={payments.find((x) => x._id === modal.id)}
                    onSubmit={(payload) => {
                      submitOrderProof(modal.id, payload);
                      closeForm();
                    }}
                    onCancel={closeForm}
                  />
                ) : (
                  <DeliverablesInline
                    payment={payments.find((x) => x._id === modal.id)}
                    onSubmit={(payload) => {
                      submitDeliverables(modal.id, payload);
                      closeForm();
                    }}
                    onCancel={closeForm}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Inline Form Components (Defined here to avoid ReferenceError and use in Modal) ---
// Note: These must be outside the main component's export function but inside the file.

function OrderProofInline({ payment, onSubmit, onCancel }) {
  const [orderScreenshot, setOrderScreenshot] = useState(
    payment?.orderProofs?.orderScreenshot || ""
  );
  const [deliveredScreenshot, setDeliveredScreenshot] = useState(
    payment?.orderProofs?.deliveredScreenshot || ""
  );
  const [orderAmount, setOrderAmount] = useState(
    payment?.orderProofs?.orderAmount || ""
  );
  // optional fields
  const [engagementRate, setEngagementRate] = useState(
    payment?.orderProofs?.engagementRate || ""
  );
  const [impressions, setImpressions] = useState(
    payment?.orderProofs?.impressions || ""
  );
  const [postLink, setPostLink] = useState(
    payment?.orderProofs?.postLink || ""
  );
  const [additionalComments, setAdditionalComments] = useState(
    payment?.orderProofs?.comments || ""
  );
  const [reach, setReach] = useState(payment?.orderProofs?.reach || "");
  const [videoViews, setVideoViews] = useState(
    payment?.orderProofs?.videoViews || ""
  );
  const [reelLink, setReelLink] = useState(
    payment?.orderProofs?.reelLink || ""
  );
  const [storyLink, setStoryLink] = useState(
    payment?.orderProofs?.storyLink || ""
  );
  const [feedback, setFeedback] = useState(
    payment?.orderProofs?.feedback || ""
  );
  const [storyViews, setStoryViews] = useState(
    payment?.orderProofs?.storyViews || ""
  );
  const [storyInteractions, setStoryInteractions] = useState(
    payment?.orderProofs?.storyInteractions || ""
  );
  const [storyScreenshots, setStoryScreenshots] = useState(
    (payment?.orderProofs?.storyScreenshots || []).join(", ") || ""
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    // Required fields for submission per requirements
    if (!orderScreenshot || String(orderScreenshot).trim() === "")
      e.orderScreenshot = "Screenshot is required";
    if (
      orderAmount === "" ||
      orderAmount === null ||
      Number.isNaN(Number(orderAmount)) ||
      Number(orderAmount) <= 0
    )
      e.orderAmount = "Request Amount must be a positive number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      orderScreenshot: String(orderScreenshot).trim(),
      deliveredScreenshot: String(deliveredScreenshot).trim() || undefined,
      orderAmount: Number(orderAmount),
      engagementRate: engagementRate || undefined,
      impressions: impressions ? Number(impressions) : undefined,
      postLink: postLink || undefined,
      comments: additionalComments || undefined,
      // keep legacy 'comment' so server records influencerComments as before
      comment: additionalComments || undefined,
      reach: reach ? Number(reach) : undefined,
      videoViews: videoViews ? Number(videoViews) : undefined,
      reelLink: reelLink || undefined,
      storyLink: storyLink || undefined,
      feedback: feedback || undefined,
      storyViews: storyViews ? Number(storyViews) : undefined,
      storyInteractions: storyInteractions
        ? Number(storyInteractions)
        : undefined,
      storyScreenshots: storyScreenshots
        ? storyScreenshots
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    };
    onSubmit(payload);
    // The parent component handles the async API call and setting 'submitting' to false via closeForm()
  };

  return (
    <motion.div
      className="p-5 bg-gray-900 rounded-xl shadow-lg border border-cyan-500/30"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <FaFileAlt /> Submit Order Proof
      </h3>
      <div className="text-xs text-gray-400 mb-4">
        Please provide proof of the order placed and its delivery status to
        release the initial payment/refund.
      </div>

      <label className="block mb-3">
        <div className="text-sm font-semibold text-gray-300 mb-1">
          Order Placed Screenshot URL
        </div>
        <StyledInput
          required
          value={orderScreenshot}
          onChange={(e) => {
            setOrderScreenshot(e.target.value);
            setErrors((e) => ({ ...e, orderScreenshot: "" }));
          }}
          placeholder="Screenshot link (e.g., Cloudinary URL)"
          error={errors.orderScreenshot}
        />
      </label>

      <div className="grid grid-cols-1 gap-3">
        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Product Delivered Screenshot URL (optional)
          </div>
          <StyledInput
            value={deliveredScreenshot}
            onChange={(e) => setDeliveredScreenshot(e.target.value)}
            placeholder="Screenshot link of delivery proof"
            error={errors.deliveredScreenshot}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Request Amount (₹) — required
          </div>
          <StyledInput
            required
            value={orderAmount}
            onChange={(e) => {
              setOrderAmount(e.target.value);
              setErrors((e) => ({ ...e, orderAmount: "" }));
            }}
            placeholder="Amount (e.g., 500)"
            type="number"
            error={errors.orderAmount}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Engagement Rate (%)
          </div>
          <StyledInput
            value={engagementRate}
            onChange={(e) => setEngagementRate(e.target.value)}
            placeholder="e.g., 5.2%"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Impressions
          </div>
          <StyledInput
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
            type="number"
            placeholder="Total impressions"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Post Link (URL)
          </div>
          <StyledInput
            value={postLink}
            onChange={(e) => setPostLink(e.target.value)}
            placeholder="Instagram post link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Additional Comments
          </div>
          <textarea
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={3}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">Reach</div>
          <StyledInput
            value={reach}
            onChange={(e) => setReach(e.target.value)}
            type="number"
            placeholder="Total reach"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Video Views
          </div>
          <StyledInput
            value={videoViews}
            onChange={(e) => setVideoViews(e.target.value)}
            type="number"
            placeholder="Video views"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Reel Link (URL)
          </div>
          <StyledInput
            value={reelLink}
            onChange={(e) => setReelLink(e.target.value)}
            placeholder="Instagram reel link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Link (URL)
          </div>
          <StyledInput
            value={storyLink}
            onChange={(e) => setStoryLink(e.target.value)}
            placeholder="Story link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Feedback (Campaign feedback)
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={3}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Views
          </div>
          <StyledInput
            value={storyViews}
            onChange={(e) => setStoryViews(e.target.value)}
            type="number"
            placeholder="Total story views"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Interactions
          </div>
          <StyledInput
            value={storyInteractions}
            onChange={(e) => setStoryInteractions(e.target.value)}
            type="number"
            placeholder="Taps, replies, shares"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Screenshots (comma-separated URLs)
          </div>
          <StyledInput
            value={storyScreenshots}
            onChange={(e) => setStoryScreenshots(e.target.value)}
            placeholder="https://... , https://..."
          />
        </label>
      </div>

      <div className="mt-4 flex gap-3 justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          variant="primary"
        >
          {submitting ? "Submitting..." : "Submit Proof"}
        </Button>
      </div>
    </motion.div>
  );
}

function DeliverablesInline({ payment, onSubmit, onCancel }) {
  // deliverables fields (optional except proof)
  const [proof, setProof] = useState(payment?.deliverablesProof?.proof || "");
  const [engagementRate, setEngagementRate] = useState(
    payment?.deliverablesProof?.engagementRate || ""
  );
  const [impressions, setImpressions] = useState(
    payment?.deliverablesProof?.impressions || ""
  );
  const [postLink, setPostLink] = useState(
    payment?.deliverablesProof?.postLink || ""
  );
  const [comments, setComments] = useState(
    payment?.deliverablesProof?.comments || ""
  );
  const [reach, setReach] = useState(payment?.deliverablesProof?.reach || "");
  const [videoViews, setVideoViews] = useState(
    payment?.deliverablesProof?.videoViews || ""
  );
  const [reelLink, setReelLink] = useState(
    payment?.deliverablesProof?.reelLink || ""
  );
  const [storyLink, setStoryLink] = useState(
    payment?.deliverablesProof?.storyLink || ""
  );
  const [feedback, setFeedback] = useState(
    payment?.deliverablesProof?.feedback || ""
  );
  const [storyViews, setStoryViews] = useState(
    payment?.deliverablesProof?.storyViews || ""
  );
  const [storyInteractions, setStoryInteractions] = useState(
    payment?.deliverablesProof?.storyInteractions || ""
  );
  const [storyScreenshots, setStoryScreenshots] = useState(
    (payment?.deliverablesProof?.storyScreenshots || []).join(", ") || ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!proof || !String(proof).trim()) {
      setError("Deliverables proof is required");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      proof: String(proof).trim(),
      engagementRate: engagementRate || undefined,
      impressions: impressions ? Number(impressions) : undefined,
      postLink: postLink || undefined,
      comments: comments || undefined,
      reach: reach ? Number(reach) : undefined,
      videoViews: videoViews ? Number(videoViews) : undefined,
      reelLink: reelLink || undefined,
      storyLink: storyLink || undefined,
      feedback: feedback || undefined,
      storyViews: storyViews ? Number(storyViews) : undefined,
      storyInteractions: storyInteractions
        ? Number(storyInteractions)
        : undefined,
      storyScreenshots: storyScreenshots
        ? storyScreenshots
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      comment: comments || undefined,
    };
    onSubmit(payload);
  };

  return (
    <motion.div
      className="p-5 bg-gray-900 rounded-xl shadow-lg border border-cyan-500/30"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <FaClipboardCheck /> Submit Deliverables Proof
      </h3>
      <div className="text-xs text-gray-400 mb-4">
        Provide links or notes showing that you have successfully completed the
        agreed-upon content deliverables (e.g., published reel link).
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Deliverables Proof URL (required)
          </div>
          <StyledInput
            value={proof}
            onChange={(e) => {
              setProof(e.target.value);
              setError("");
            }}
            placeholder="https://..."
            error={error}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Engagement Rate (%)
          </div>
          <StyledInput
            value={engagementRate}
            onChange={(e) => setEngagementRate(e.target.value)}
            placeholder="e.g., 5.2%"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Impressions
          </div>
          <StyledInput
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
            type="number"
            placeholder="Total impressions"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Post Link (URL)
          </div>
          <StyledInput
            value={postLink}
            onChange={(e) => setPostLink(e.target.value)}
            placeholder="Instagram post link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Comments
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={2}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">Reach</div>
          <StyledInput
            value={reach}
            onChange={(e) => setReach(e.target.value)}
            type="number"
            placeholder="Total reach"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Video Views
          </div>
          <StyledInput
            value={videoViews}
            onChange={(e) => setVideoViews(e.target.value)}
            type="number"
            placeholder="Video views"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Reel Link (URL)
          </div>
          <StyledInput
            value={reelLink}
            onChange={(e) => setReelLink(e.target.value)}
            placeholder="Instagram reel link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Link (URL)
          </div>
          <StyledInput
            value={storyLink}
            onChange={(e) => setStoryLink(e.target.value)}
            placeholder="Story link"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Feedback (Campaign feedback)
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={2}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Views
          </div>
          <StyledInput
            value={storyViews}
            onChange={(e) => setStoryViews(e.target.value)}
            type="number"
            placeholder="Total story views"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Interactions
          </div>
          <StyledInput
            value={storyInteractions}
            onChange={(e) => setStoryInteractions(e.target.value)}
            type="number"
            placeholder="Taps, replies, shares"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Story Screenshots (comma-separated URLs)
          </div>
          <StyledInput
            value={storyScreenshots}
            onChange={(e) => setStoryScreenshots(e.target.value)}
            placeholder="https://... , https://..."
          />
        </label>
      </div>

      <div className="mt-4 flex gap-3 justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          variant="primary"
        >
          {submitting ? "Submitting..." : "Submit Deliverables"}
        </Button>
      </div>
    </motion.div>
  );
}
