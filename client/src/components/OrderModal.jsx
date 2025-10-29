import { useState } from "react";
import useToast from "../context/useToast";
import { motion as Motion } from "framer-motion";
import Button from "./Button";
import { FaHourglassHalf, FaCheckCircle, FaTimes } from "react-icons/fa";

// Styled Input for dark theme
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);
// Styled Textarea for dark theme
const StyledTextarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cloudinary client-side unsigned upload config (set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your frontend env)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!open || !application) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploading)
      return toast?.add("Please wait for the screenshot upload to finish", {
        type: "error",
      });
    if (!orderId || orderId.trim() === "")
      return toast?.add("Order ID is required", { type: "error" });
    if (amount === "" || isNaN(Number(amount)))
      return toast?.add("Valid amount is required", { type: "error" });
    if (selectedFile && !screenshotUrl)
      return toast?.add(
        "Screenshot upload did not complete or failed. Please try again.",
        { type: "error" }
      );
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

  // --- Upload Handler Functionality ---
  const handleFileUpload = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    setUploading(true);

    try {
      // 1. Client-side Cloudinary unsigned upload
      if (cloudName && uploadPreset) {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
          {
            method: "POST",
            body: form,
            // NOTE: Content-Type is deliberately omitted when sending FormData
          }
        );

        if (!res.ok) throw new Error("Client-side Cloudinary upload failed");
        const body = await res.json();

        if (body && body.secure_url) {
          setScreenshotUrl(body.secure_url);
          toast?.add("Screenshot uploaded", { type: "success" });
          setSelectedFile(null);
        } else {
          throw new Error("Client upload did not return a URL");
        }
      } else {
        // 2. Fallback: upload via server endpoint using server Cloudinary keys
        const form = new FormData();
        form.append("file", file);

        const headers = {};
        if (token) {
          // Only Authorization header should be set manually.
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`/api/uploads`, {
          method: "POST",
          headers: headers, // FIX: Pass only Authorization header here
          body: form,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Server upload failed (${res.status})`);
        }

        const body = await res.json();
        if (body && body.url) {
          setScreenshotUrl(body.url);
          toast?.add("Screenshot uploaded (via server)", { type: "success" });
          setSelectedFile(null);
        } else {
          throw new Error("Server upload did not return a URL");
        }
      }
    } catch (err) {
      toast?.add(err.message || "Upload failed", { type: "error" });
      setScreenshotUrl(""); // Clear URL on failure
    } finally {
      setUploading(false);
    }
  };

  return (
    // Modal styled to match dark theme with animation
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => !submitting && onClose && onClose()}
      />
      <Motion.form
        initial={{ scale: 0.9, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: -20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="relative bg-gray-800 text-white rounded-xl p-6 w-full max-w-md z-[10002] shadow-2xl border border-purple-500/50"
      >
        <h2 className="text-xl font-extrabold text-cyan-400 mb-2">
          Submit Order Completion
        </h2>
        <div className="text-sm text-gray-400 mb-4">
          Campaign:{" "}
          <span className="font-medium text-white">
            {application.campaign?.brandName ||
              application.campaign?.title ||
              "(unknown)"}
          </span>
        </div>

        <label className="block mb-4">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Order/Reference ID (Required)
          </div>
          <StyledInput
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g., Brand tracking ID or link"
          />
        </label>

        <label className="block mb-4">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Final Payment Amount (Required)
          </div>
          <StyledInput
            required
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 5000"
          />
        </label>

        {/* Screenshot upload area */}
        <div className="block mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="text-sm font-semibold text-gray-300 mb-2">
            Completion Screenshot (Optional)
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleFileUpload(e.target.files && e.target.files[0])
              }
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/30 file:text-purple-300 hover:file:bg-purple-500/50"
            />

            {uploading && (
              <div className="text-sm text-purple-400 flex items-center gap-2">
                <FaHourglassHalf className="animate-spin" /> Uploading in
                progress...
              </div>
            )}

            {screenshotUrl && !uploading && (
              <div className="flex items-center gap-3 p-2 bg-gray-900 rounded-lg">
                <img
                  src={screenshotUrl}
                  alt="Proof screenshot"
                  className="w-20 h-14 object-cover rounded"
                />
                <div className="text-sm text-emerald-400">
                  <FaCheckCircle className="inline mr-1" /> Uploaded
                  Successfully
                </div>
                <Button
                  type="button"
                  onClick={() => setScreenshotUrl("")}
                  variant="ghost"
                  className="px-2 text-rose-400 hover:bg-rose-900/30 ml-auto"
                >
                  <FaTimes /> Remove
                </Button>
              </div>
            )}

            {!screenshotUrl && !uploading && (
              <div className="text-sm text-gray-500">
                Max size 5MB. Must be uploaded before submitting.
              </div>
            )}
          </div>
        </div>

        <label className="block mb-6">
          <div className="text-sm font-semibold text-gray-300 mb-1">
            Note to Brand (Optional)
          </div>
          <StyledTextarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any necessary context, links, or clarification for the brand reviewer."
            rows={3}
          />
        </label>

        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            onClick={() => !submitting && !uploading && onClose && onClose()}
            variant="secondary"
            disabled={submitting || uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              uploading ||
              !orderId.trim() ||
              amount === "" ||
              isNaN(Number(amount))
            }
            variant="success"
            className="flex items-center gap-2"
          >
            {uploading ? (
              "Uploading..."
            ) : submitting ? (
              "Submitting..."
            ) : (
              <>
                {" "}
                <FaCheckCircle /> Submit Order
              </>
            )}
          </Button>
        </div>
      </Motion.form>
    </div>
  );
}
