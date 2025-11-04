import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
// ensure tooling recognizes motion usage in non-capitalized import (prevents some lint false-positives)
void motion;
import ReactDOM from "react-dom";
import StatusBadge from "./StatusBadge";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";

export default function ApplicationCard({
  application,
  onSubmitOrder,
  onViewDetails,
  onApprove,
  onReject,
  showAdminActions = false,
  reviewed = false,
  // optional callbacks for order lifecycle & appeals (parents may provide)
  onApproveOrder,
  onReleasePayment,
  onSubmitAppeal,
}) {
  const a = application || {};
  // local UI state for details and order form
  const [orderDraft, setOrderDraft] = useState(() => ({
    reference: a.order?.reference || "",
    amount: a.order?.amount || "",
    notes: a.order?.notes || "",
  }));
  const [orderStatus, setOrderStatus] = useState(
    a.order?.status || "not-filled"
  );
  const [adminNoteDraft, setAdminNoteDraft] = useState(a.adminComment || "");
  const [showDetails, setShowDetails] = useState(false);
  // We no longer use inline submission UI here (order form is shown via
  // the shared OrderModal). Keep no-op placeholders to avoid refactors
  // elsewhere, but don't declare unused variables that break lint.
  // lifecycle & appeal local state
  const [paymentReleased, setPaymentReleased] = useState(
    Boolean(a.paymentReleased)
  );
  const [appeal, setAppeal] = useState({ comment: "", files: [] });
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealValidation, setAppealValidation] = useState({
    comment: "",
    files: "",
  });
  const [appealSubmitted, setAppealSubmitted] = useState(
    Boolean(a.appeal?.submitted)
  );

  const auth = useAuth();
  const currentUser = auth?.user || null;

  const brand = a.campaign?.brandName || a.campaign?.title || "(unknown)";
  // application.influencer may be an object, an id string, or missing.
  const influencerData =
    a.influencer && typeof a.influencer === "object" ? a.influencer : null;
  const influencerName =
    influencerData?.name || currentUser?.name || influencerData || null;
  const influencerEmail = influencerData?.email || currentUser?.email || "";
  // show only the date portion (no time) in application lists
  const when = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-";
  const approvedAt = a.approvedAt
    ? new Date(a.approvedAt).toLocaleDateString()
    : null;
  // determine whether an order already exists (either from prop or local state)
  const orderExists = Boolean(
    (a.order && a.order.status) || orderStatus !== "not-filled"
  );
  const status = String((a.status || "").toLowerCase());
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  // order-review statuses that represent an approved/rejected order
  const isOrderApproved =
    status === "order_form_approved" || status === "completed";
  const isOrderRejected =
    status === "order_form_rejected" || status === "order_rejected";
  const isReviewed = Boolean(
    reviewed || isApproved || isRejected || isOrderApproved || isOrderRejected
  );
  const lastAppId = useRef();

  useEffect(() => {
    // Only re-sync the local form state when a different application (by id)
    // is passed in. This avoids clobbering local edits when the parent
    // re-creates the `application` object reference on unrelated renders.
    const src = application || {};
    const currId = src._id;
    if (lastAppId.current === currId) return;
    lastAppId.current = currId;

    setOrderDraft({
      reference: src.order?.reference || "",
      amount: src.order?.amount || "",
      notes: src.order?.notes || "",
    });
    setOrderStatus(src.order?.status || "not-filled");
    setAdminNoteDraft(src.adminComment || "");
    setPaymentReleased(Boolean(src.paymentReleased));
    setAppealSubmitted(Boolean(src.appeal?.submitted));
  }, [application]);

  // close modal on Escape for accessibility
  useEffect(() => {
    if (!showDetails) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowDetails(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDetails]);

  // prevent background scrolling when modal is open
  useEffect(() => {
    if (showDetails) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showDetails]);

  // Portal helper so the modal renders at the document root and can't be clipped by parent
  const ModalPortal = ({ children }) => {
    if (typeof document === "undefined") return null;
    return ReactDOM.createPortal(children, document.body);
  };
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.28 }}
      className="glass rounded-xl overflow-hidden card-shadow border border-white/6 motion-safe:transform-gpu card-hover animate-fadeInUp"
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-sm text-slate-200 overflow-hidden">
              {influencerName
                ? (influencerName + "  ")
                    .split(" ")
                    .map((s) => (s && s[0]) || "")
                    .slice(0, 2)
                    .join("")
                : brand
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                {influencerName ? (
                  <>
                    <div className="text-base font-semibold text-slate-100">
                      {influencerName}
                    </div>
                    <div className="text-sm text-slate-400">{brand}</div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-semibold text-slate-100">
                      {brand}
                    </div>
                    <div className="text-sm text-slate-400">
                      {a.campaign?.title || ""}
                    </div>
                  </>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{when}</div>
                <div className="mt-2">
                  <StatusBadge status={a.status} />
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div>
                <div className="font-medium text-slate-200">Followers</div>
                <div className="text-slate-400">
                  {a.followersAtApply ?? "-"}
                </div>
              </div>
              <div>
                <div className="font-medium text-slate-200">Campaign</div>
                <div className="text-slate-400">
                  {a.campaign?.category || "-"}
                </div>
              </div>
            </div>

            {/* applicant and admin notes moved into the details modal to avoid
                showing influencer/admin notes on the compact card */}

            {/* Small row with applied date - details opened from footer only */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                <span className="font-medium text-slate-200">Applied:</span>{" "}
                {when}
              </div>
              <div className="flex items-center gap-2">
                {approvedAt && (
                  <div className="text-sm text-amber-200">
                    Approved: {approvedAt}
                  </div>
                )}
              </div>
            </div>

            {/* Details modal (pops up when Details is clicked) */}
            {showDetails && (
              <ModalPortal>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                  <div
                    className="absolute inset-0 bg-black/70"
                    onClick={() => setShowDetails(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="relative z-10 w-full max-w-6xl bg-slate-900 rounded-lg p-10 overflow-auto max-h-[94vh] shadow-2xl border border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-semibold">
                          {influencerName || brand}
                        </div>
                        <div className="text-sm text-slate-400">
                          {brand} • {influencerEmail}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-300">
                          Applied: <span className="font-medium">{when}</span>
                        </div>
                        {approvedAt && (
                          <div className="text-sm text-amber-300">
                            Approved: {approvedAt}
                          </div>
                        )}
                        <div>
                          <StatusBadge status={a.status} />
                        </div>
                        <button
                          type="button"
                          className="ml-2 text-xl text-slate-400 hover:text-white"
                          onClick={() => setShowDetails(false)}
                          aria-label="Close details"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <hr className="my-4 border-gray-800" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm text-slate-300 font-medium">
                          Applicant note
                        </h4>
                        <p className="text-sm text-slate-400 mt-2">
                          {a.applicantComment || "-"}
                        </p>

                        <div className="mt-6">
                          <h4 className="text-sm text-slate-300 font-medium">
                            Admin note
                          </h4>
                          {showAdminActions ? (
                            <div className="mt-2">
                              <textarea
                                value={adminNoteDraft}
                                onChange={(e) =>
                                  setAdminNoteDraft(e.target.value)
                                }
                                className="w-full px-3 py-2 rounded bg-white/5 text-sm"
                                rows={4}
                              />
                              <div className="flex gap-2 justify-end mt-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setAdminNoteDraft(a.adminComment || "")
                                  }
                                >
                                  Reset
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    /* parent should persist */
                                  }}
                                >
                                  Save Note
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 mt-2">
                              {a.adminComment || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm text-slate-300 font-medium">
                          Order / Fulfillment
                        </h4>
                        <div className="mt-3 bg-slate-800 border border-gray-800 rounded p-4">
                          {isApproved &&
                          !orderExists &&
                          orderStatus === "not-filled" ? (
                            <div className="space-y-3">
                              <div className="text-sm text-slate-300">
                                No order has been submitted for this application
                                yet.
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowDetails(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    // Prefer parent to open the shared OrderModal. If not provided,
                                    // fall back to closing details (no-op) so UI doesn't break.
                                    if (onSubmitOrder) onSubmitOrder(a);
                                    else setShowDetails(false);
                                  }}
                                  disabled={!onSubmitOrder}
                                >
                                  Open Order Form
                                </Button>
                              </div>
                            </div>
                          ) : // If not approved yet, let the user know order form will appear after approval
                          !isApproved ? (
                            <div className="text-sm text-slate-400">
                              The order form will be available after this
                              application is approved.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-sm text-slate-200">
                                Reference:{" "}
                                <span className="font-medium">
                                  {orderDraft.reference ||
                                    (a.order && a.order.reference) ||
                                    "-"}
                                </span>
                              </div>
                              <div className="text-sm text-slate-200">
                                Amount:{" "}
                                <span className="font-medium">
                                  {orderDraft.amount ||
                                    (a.order && a.order.amount) ||
                                    "-"}
                                </span>
                              </div>
                              <div className="text-sm text-slate-200">
                                Status:{" "}
                                <span className="font-medium">
                                  {orderStatus}
                                </span>
                              </div>
                              <div className="flex gap-2 justify-end">
                                {/* If admin, show approval/release controls */}
                                {showAdminActions &&
                                  orderStatus === "submitted" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="accent"
                                        onClick={async () => {
                                          try {
                                            setOrderStatus("approved");
                                            if (onApproveOrder)
                                              await Promise.resolve(
                                                onApproveOrder(a)
                                              );
                                          } catch {
                                            setOrderStatus("submitted");
                                          }
                                        }}
                                      >
                                        Approve Order
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          setOrderStatus("rejected");
                                          if (onApproveOrder)
                                            await Promise.resolve(
                                              onApproveOrder(a, {
                                                rejected: true,
                                              })
                                            );
                                        }}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}

                                {/* If non-admin influencer can mark in-progress / cancel locally */}
                                {!showAdminActions &&
                                  orderStatus === "submitted" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="accent"
                                        onClick={() =>
                                          setOrderStatus("in-progress")
                                        }
                                      >
                                        Mark In Progress
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setOrderStatus("cancelled")
                                        }
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  )}

                                {orderStatus === "in-progress" && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => setOrderStatus("completed")}
                                  >
                                    Mark Completed
                                  </Button>
                                )}

                                {/* Admin: allow releasing payment once order approved */}
                                {showAdminActions &&
                                  orderStatus === "approved" && (
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={async () => {
                                        try {
                                          setPaymentReleased(true);
                                          if (onReleasePayment)
                                            await Promise.resolve(
                                              onReleasePayment(a)
                                            );
                                        } catch {
                                          setPaymentReleased(false);
                                        }
                                      }}
                                    >
                                      Release Payment
                                    </Button>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Appeal UI: shown to influencer after payment is released and no appeal submitted yet */}
                    {paymentReleased &&
                      !appealSubmitted &&
                      !showAdminActions && (
                        <div className="mt-6 bg-slate-900 border border-gray-800 rounded p-4">
                          <h4 className="text-sm text-slate-300 font-medium">
                            Appeal / Dispute
                          </h4>
                          <p className="text-sm text-slate-400 mt-2">
                            If there's an issue with payment or deliverables,
                            submit evidence (screenshots) and a short note.
                          </p>
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={appeal.comment}
                              onChange={(e) =>
                                setAppeal((s) => ({
                                  ...s,
                                  comment: e.target.value,
                                }))
                              }
                              placeholder="Describe the issue..."
                              className="w-full px-3 py-2 rounded bg-white/5 text-sm"
                              rows={3}
                            />
                            {appealValidation.comment && (
                              <div className="text-xs text-red-400 mt-1">
                                {appealValidation.comment}
                              </div>
                            )}
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) =>
                                  setAppeal((s) => ({
                                    ...s,
                                    files: Array.from(e.target.files || []),
                                  }))
                                }
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAppeal({ comment: "", files: [] });
                                  setAppealValidation({
                                    comment: "",
                                    files: "",
                                  });
                                }}
                              >
                                Reset
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  // require at least a comment or one file
                                  const hasComment =
                                    (appeal.comment || "").trim().length > 0;
                                  const hasFiles =
                                    (appeal.files || []).length > 0;
                                  if (!hasComment && !hasFiles) {
                                    setAppealValidation({
                                      comment:
                                        "Add a comment or attach a screenshot",
                                      files: "",
                                    });
                                    return;
                                  }
                                  try {
                                    setAppealSubmitting(true);
                                    if (onSubmitAppeal)
                                      await Promise.resolve(
                                        onSubmitAppeal(a, {
                                          comment: appeal.comment,
                                          files: appeal.files,
                                        })
                                      );
                                    setAppealSubmitted(true);
                                  } catch (err) {
                                    setAppealValidation((s) => ({
                                      ...s,
                                      comment: err?.message || "Submit failed",
                                    }));
                                  } finally {
                                    setAppealSubmitting(false);
                                  }
                                }}
                                disabled={appealSubmitting}
                              >
                                {appealSubmitting
                                  ? "Submitting..."
                                  : "Submit Appeal"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                    {(a.sampleMedia || []).length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm text-slate-300 font-medium">
                          Samples
                        </h4>
                        <div className="mt-3 flex gap-3 overflow-x-auto">
                          {a.sampleMedia.map((m, i) => (
                            <img
                              key={i}
                              src={m}
                              alt={`sample-${i}`}
                              className="w-32 h-32 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-2">
                      {showAdminActions && (
                        <>
                          <Button
                            onClick={() => onApprove && onApprove(a)}
                            variant={isReviewed ? "ghost" : "success"}
                            size="sm"
                            disabled={isReviewed}
                            className={isReviewed ? "text-slate-400" : ""}
                          >
                            {isReviewed ? "Reviewed" : "Approve"}
                          </Button>
                          <Button
                            onClick={() => onReject && onReject(a)}
                            variant={isReviewed ? "ghost" : "danger"}
                            size="sm"
                            disabled={isReviewed}
                            className={isReviewed ? "text-slate-400" : ""}
                          >
                            {isReviewed ? "Reviewed" : "Reject"}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDetails(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </ModalPortal>
            )}
          </div>
        </div>

        {(a.sampleMedia || []).length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {a.sampleMedia.map((m, i) => (
              <img
                key={i}
                src={m}
                alt={`sample-${i}`}
                className="w-20 h-20 object-cover rounded transform transition-transform duration-200 hover:scale-105"
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Status:{" "}
            <span className="font-medium text-slate-100">{a.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {showAdminActions ? (
              <>
                <Button
                  onClick={() => onApprove && onApprove(a)}
                  variant={isReviewed ? "ghost" : "success"}
                  size="sm"
                  disabled={isReviewed}
                  className={isReviewed ? "text-slate-400" : ""}
                  leftIcon={
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                >
                  {isReviewed ? "Reviewed" : "Approve"}
                </Button>
                <Button
                  onClick={() => onReject && onReject(a)}
                  variant={isReviewed ? "ghost" : "danger"}
                  size="sm"
                  disabled={isReviewed}
                  className={isReviewed ? "text-slate-400" : ""}
                  leftIcon={
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                >
                  Reject
                </Button>
                {/* disable footer approve/reject when already final */}
                {/* visually disabled handled by Button component */}
                <Button
                  onClick={() => {
                    // For admin views, prefer the parent details handler (admin panel)
                    // and avoid opening the influencer details card beneath it.
                    if (showAdminActions && onViewDetails) {
                      onViewDetails(a);
                      return;
                    }
                    setShowDetails(true);
                    if (onViewDetails) onViewDetails(a);
                  }}
                  variant="ghost"
                  size="sm"
                  leftIcon={
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M12 5v7l4 2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                >
                  Details
                </Button>
              </>
            ) : (
              <>
                {a.status === "approved" ? (
                  <Button
                    onClick={() => {
                      if (showAdminActions && onViewDetails) {
                        onViewDetails(a);
                        return;
                      }
                      setShowDetails(true);
                      if (onViewDetails) onViewDetails(a);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Details
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (showAdminActions && onViewDetails) {
                        onViewDetails(a);
                        return;
                      }
                      setShowDetails(true);
                      if (onViewDetails) onViewDetails(a);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Details
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
