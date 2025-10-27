import { useState } from "react";
import useToast from "../context/useToast";

export default function OrderModal({
  open,
  onClose,
  application,
  token,
  onSuccess,
}) {
  const toast = useToast();
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open || !application) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orderId || orderId.trim() === "")
      return toast?.add("Order ID is required", { type: "error" });
    if (amount === "" || isNaN(Number(amount)))
      return toast?.add("Valid amount is required", { type: "error" });
    setSubmitting(true);
    try {
      const res = await fetch(`/api/applications/${application._id}/order`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: orderId.trim(),
          amount: Number(amount),
          screenshotUrl: screenshotUrl.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body && body.error ? body.error : `Request failed (${res.status})`
        );
      }
      const body = await res.json();
      toast?.add("Order submitted for review", { type: "success" });
      onSuccess && onSuccess(body);
      onClose && onClose();
    } catch (err) {
      toast?.add(err.message || "Failed to submit order", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => !submitting && onClose && onClose()}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-slate-800 text-slate-100 rounded p-6 w-full max-w-md z-10"
      >
        <h2 className="text-lg font-semibold mb-3">Submit Order</h2>
        <div className="text-sm text-slate-300 mb-4">
          Campaign:{" "}
          <span className="font-medium">
            {application.campaign?.brandName ||
              application.campaign?.title ||
              "(unknown)"}
          </span>
        </div>

        <label className="block mb-2">
          <div className="text-xs text-slate-300">Order ID</div>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/3"
          />
        </label>

        <label className="block mb-2">
          <div className="text-xs text-slate-300">Amount (numeric)</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/3"
          />
        </label>

        <label className="block mb-2">
          <div className="text-xs text-slate-300">
            Screenshot URL (optional)
          </div>
          <input
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/3"
          />
        </label>

        <label className="block mb-4">
          <div className="text-xs text-slate-300">Note (optional)</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/3"
            rows={3}
          />
        </label>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => !submitting && onClose && onClose()}
            className="px-3 py-2 rounded bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-2 rounded bg-emerald-600 text-white"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
