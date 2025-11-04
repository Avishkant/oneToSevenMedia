import { useState, useEffect } from "react";
import useToast from "../context/useToast";
import { motion as Motion } from "framer-motion";
import Button from "./Button";
import { Link } from "react-router-dom";
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
  const [orderData, setOrderData] = useState({});
  const [shippingAddress, setShippingAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [bankOk, setBankOk] = useState(true);

  // load current user bank details to ensure influencer can receive payouts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = token || localStorage.getItem("accessToken");
        const res = await fetch("/api/users/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return;
        const me = await res.json();
        if (!mounted) return;
        const ok = me.bankAccountNumber && me.bankAccountName && me.bankName;
        setBankOk(Boolean(ok));
      } catch {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [open, application]);

  useEffect(() => {
    // pre-fill fields when modal opens so influencer can edit/resubmit
    if (!open || !application) return;
    setOrderId(application.orderId || "");
    setAmount(
      application.payout && typeof application.payout.amount !== "undefined"
        ? String(application.payout.amount)
        : ""
    );
    setScreenshotUrl(
      application.campaignScreenshot || application.campaignScreenshot || ""
    );
    setOrderData(application.orderData || {});
    setShippingAddress(
      application.shippingAddress || {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phone: "",
      }
    );
    // if application is marked as needing an appeal, ensure orderData carries form name
    if (application.needsAppeal && application.appealFormName) {
      setOrderData((od) => ({
        ...(od || {}),
        formName: application.appealFormName,
      }));
    }
    setComment(application.applicantComment || application.adminComment || "");
    setErrors({});
    setGeneralError("");
  }, [open, application]);

  // Cloudinary client-side unsigned upload config (set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your frontend env)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!open || !application) return null;
  const methodRender =
    application.fulfillmentMethod ||
    application.campaign?.fulfillmentMethod ||
    "influencer";

  async function handleSubmit(e) {
    e.preventDefault();
    const method =
      application.fulfillmentMethod ||
      application.campaign?.fulfillmentMethod ||
      "influencer";
    // inline validation
    setErrors({});
    setGeneralError("");
    if (uploading) {
      setGeneralError("Please wait for the screenshot upload to finish");
      return;
    }
    const nextErrors = {};
    if (method === "brand") {
      if (!shippingAddress || !shippingAddress.line1)
        nextErrors["shippingAddress.line1"] = "Address line 1 is required";
      if (!shippingAddress || !shippingAddress.postalCode)
        nextErrors["shippingAddress.postalCode"] =
          "Postal / ZIP code is required";
    } else {
      // ensure influencer has bank details before allowing order submission
      if (!bankOk) {
        setGeneralError(
          "Please add your bank details in your profile before submitting order details for payout. "
        );
        return;
      }
      if (!orderId || orderId.trim() === "")
        nextErrors.orderId = "Order ID is required";
      if (amount === "" || isNaN(Number(amount)))
        nextErrors.amount = "Valid amount is required";
      if (selectedFile && !screenshotUrl)
        nextErrors.screenshot = "Screenshot upload did not complete or failed";
      const dynamicFields =
        application.orderFormFields ||
        application.campaign?.orderFormFields ||
        [];
      (dynamicFields || []).forEach((k) => {
        const v = orderData[k];
        if (typeof v === "undefined" || v === null || String(v).trim() === "")
          nextErrors[k] = `${k} is required`;
      });
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      // include appeal form name into orderData when required by the application
      const outgoingOrderData = { ...(orderData || {}) };
      if (application && application.needsAppeal && application.appealFormName)
        outgoingOrderData.formName = application.appealFormName;

      const res = await fetch(`/api/applications/${application._id}/order`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          method === "brand"
            ? {
                shippingAddress,
                comment: comment.trim() || undefined,
              }
            : {
                orderId: orderId.trim(),
                amount: Number(amount),
                screenshotUrl: screenshotUrl.trim() || undefined,
                orderData:
                  Object.keys(outgoingOrderData).length > 0
                    ? outgoingOrderData
                    : undefined,
                comment: comment.trim() || undefined,
              }
        ),
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
    // Debug: log upload start so devtools console shows activity when user clicks
    try {
      console.log("handleFileUpload: starting upload", {
        name: file.name,
        size: file.size,
        type: file.type,
        cloudName,
        uploadPreset,
      });
    } catch {
      // ignore
    }

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

        // Debug: log that we're about to call the server upload endpoint
        console.log("handleFileUpload: falling back to server /api/uploads", {
          headers,
        });
        const res = await fetch(`/api/uploads`, {
          method: "POST",
          headers: headers, // FIX: Pass only Authorization header here
          body: form,
        });

        if (res.ok) {
          const body = await res.json();
          if (body && body.url) {
            setScreenshotUrl(body.url);
            toast?.add("Screenshot uploaded (via server)", { type: "success" });
            setSelectedFile(null);
          } else {
            throw new Error("Server upload did not return a URL");
          }
        } else {
          // Try base64 JSON fallback if multipart upload failed (some dev proxies or clients
          // can interfere with multipart requests). This reads the file as a data URL and
          // posts JSON to /api/uploads/base64 which the server accepts.
          const serverBody = await res.json().catch(() => ({}));
          console.warn(
            "Server multipart upload failed, attempting base64 fallback",
            serverBody
          );

          // read file as data URL
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });

          const jsonRes = await fetch(`/api/uploads/base64`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ filename: file.name, data: dataUrl }),
          });
          if (!jsonRes.ok) {
            const jb = await jsonRes.json().catch(() => ({}));
            console.warn(
              "Server base64 upload failed, attempting disk-backed fallback",
              jb,
              jsonRes.status
            );
            // Try disk-backed upload as a final fallback: send the original File using multipart/form-data
            try {
              const diskForm = new FormData();
              diskForm.append("file", file);
              const diskHeaders = {};
              if (token) diskHeaders.Authorization = `Bearer ${token}`;
              const diskRes = await fetch(`/api/uploads/disk`, {
                method: "POST",
                headers: diskHeaders,
                body: diskForm,
              });
              if (diskRes.ok) {
                const db = await diskRes.json();
                if (db && db.url) {
                  setScreenshotUrl(db.url);
                  toast?.add("Screenshot uploaded (via server disk)", {
                    type: "success",
                  });
                  setSelectedFile(null);
                  return;
                }
              }
              const dbj = await diskRes.json().catch(() => ({}));
              throw new Error(
                dbj.error || `Server disk upload failed (${diskRes.status})`
              );
            } catch (diskErr) {
              throw new Error(
                jb.error ||
                  diskErr.message ||
                  `Server base64 upload failed (${jsonRes.status})`
              );
            }
          }

          const jb = await jsonRes.json();
          if (jb && jb.url) {
            setScreenshotUrl(jb.url);
            toast?.add("Screenshot uploaded (via server base64)", {
              type: "success",
            });
            setSelectedFile(null);
          } else {
            throw new Error("Server base64 upload did not return a URL");
          }
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
    <div className="fixed inset-0 z-[10001] flex items-start sm:items-center justify-center p-4 backdrop-blur-sm">
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
        className="relative bg-gray-800 text-white rounded-xl p-6 w-full max-w-md z-[10002] shadow-2xl border border-purple-500/50 max-h-[calc(100vh-4rem)] overflow-y-auto mt-6 sm:mt-0"
      >
        {/** Show a distinct header/banner when this is an appeal/resubmission */}
        <h2 className="text-xl font-extrabold text-cyan-400 mb-2">
          {application &&
          (application.needsAppeal ||
            (application.status || "").toLowerCase() === "rejected")
            ? application.appealFormName || "Appeal Form"
            : "Submit Order Completion"}
        </h2>
        {application &&
          (application.needsAppeal ||
            (application.status || "").toLowerCase() === "rejected") && (
            <div className="mb-3 p-3 rounded bg-rose-900/30 border border-rose-600 text-sm text-rose-300">
              Your previous submission was rejected
              {application.rejectionReason
                ? `: ${application.rejectionReason}`
                : ""}
              . Please complete the appeal form below and resubmit. The appeal
              form name is{" "}
              <strong>{application.appealFormName || "appeal form"}</strong>.
            </div>
          )}
        <div className="text-sm text-gray-400 mb-4">
          Campaign:{" "}
          <span className="font-medium text-white">
            {application.campaign?.brandName ||
              application.campaign?.title ||
              "(unknown)"}
          </span>
        </div>
        {generalError && (
          <div className="mb-3 text-sm text-rose-400">{generalError}</div>
        )}

        {(application.fulfillmentMethod ||
          application.campaign?.fulfillmentMethod ||
          "influencer") === "brand" ? (
          <div className="space-y-4 mb-4">
            <div className="text-sm font-semibold text-gray-300">
              Shipping Address (required)
            </div>
            <StyledInput
              value={shippingAddress.line1}
              onChange={(e) => {
                setShippingAddress({
                  ...shippingAddress,
                  line1: e.target.value,
                });
                setErrors((prev) => ({
                  ...prev,
                  ["shippingAddress.line1"]: undefined,
                }));
              }}
              onBlur={() => {
                if (
                  !shippingAddress ||
                  !shippingAddress.line1 ||
                  String(shippingAddress.line1).trim() === ""
                ) {
                  setErrors((prev) => ({
                    ...prev,
                    ["shippingAddress.line1"]: "Address line 1 is required",
                  }));
                }
              }}
              placeholder="Address line 1"
            />
            {errors["shippingAddress.line1"] && (
              <div className="mt-1 text-xs text-rose-400">
                {errors["shippingAddress.line1"]}
              </div>
            )}
            <StyledInput
              value={shippingAddress.line2}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  line2: e.target.value,
                })
              }
              placeholder="Address line 2 (optional)"
            />
            <div className="grid grid-cols-2 gap-2">
              <StyledInput
                value={shippingAddress.city}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    city: e.target.value,
                  })
                }
                placeholder="City"
              />
              <StyledInput
                value={shippingAddress.state}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    state: e.target.value,
                  })
                }
                placeholder="State"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StyledInput
                value={shippingAddress.postalCode}
                onChange={(e) => {
                  setShippingAddress({
                    ...shippingAddress,
                    postalCode: e.target.value,
                  });
                  setErrors((prev) => ({
                    ...prev,
                    ["shippingAddress.postalCode"]: undefined,
                  }));
                }}
                onBlur={() => {
                  if (
                    !shippingAddress ||
                    !shippingAddress.postalCode ||
                    String(shippingAddress.postalCode).trim() === ""
                  ) {
                    setErrors((prev) => ({
                      ...prev,
                      ["shippingAddress.postalCode"]:
                        "Postal / ZIP code is required",
                    }));
                  }
                }}
                placeholder="Postal / ZIP code"
              />
              {errors["shippingAddress.postalCode"] && (
                <div className="mt-1 text-xs text-rose-400">
                  {errors["shippingAddress.postalCode"]}
                </div>
              )}
              <StyledInput
                value={shippingAddress.country}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    country: e.target.value,
                  })
                }
                placeholder="Country"
              />
            </div>
            <StyledInput
              value={shippingAddress.phone}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  phone: e.target.value,
                })
              }
              placeholder="Phone (optional)"
            />
          </div>
        ) : (
          <>
            <label className="block mb-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">
                Order/Reference ID (Required)
              </div>
              <StyledInput
                required
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setErrors((prev) => ({ ...prev, orderId: undefined }));
                }}
                onBlur={() => {
                  if (!orderId || String(orderId).trim() === "")
                    setErrors((prev) => ({
                      ...prev,
                      orderId: "Order ID is required",
                    }));
                }}
                placeholder="e.g., Brand tracking ID or link"
              />
              {errors.orderId && (
                <div className="mt-1 text-xs text-rose-400">
                  {errors.orderId}
                </div>
              )}
            </label>

            <label className="block mb-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">
                Final Payment Amount (Required)
              </div>
              <StyledInput
                required
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                onBlur={() => {
                  if (amount === "" || isNaN(Number(amount)))
                    setErrors((prev) => ({
                      ...prev,
                      amount: "Valid amount is required",
                    }));
                }}
                placeholder="e.g., 5000"
              />
              {errors.amount && (
                <div className="mt-1 text-xs text-rose-400">
                  {errors.amount}
                </div>
              )}
            </label>

            {/* Dynamic order fields */}
            {(
              application.orderFormFields ||
              application.campaign?.orderFormFields ||
              []
            ).length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-300 mb-2">
                  Additional order details
                </div>
                {(
                  application.orderFormFields ||
                  application.campaign?.orderFormFields ||
                  []
                ).map((k) => (
                  <div className="mb-2" key={k}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400 mb-1">
                        {k} <span className="text-rose-400">*</span>
                      </div>
                    </div>
                    <StyledInput
                      value={orderData[k] || ""}
                      onChange={(e) => {
                        setOrderData({ ...orderData, [k]: e.target.value });
                        setErrors((prev) => ({ ...prev, [k]: undefined }));
                      }}
                      onBlur={() => {
                        const v = orderData[k];
                        if (
                          typeof v === "undefined" ||
                          v === null ||
                          String(v).trim() === ""
                        ) {
                          setErrors((prev) => ({
                            ...prev,
                            [k]: `${k} is required`,
                          }));
                        }
                      }}
                      placeholder={k}
                    />
                    {errors[k] && (
                      <div className="mt-1 text-xs text-rose-400">
                        {errors[k]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-4 bg-gradient-to-t from-gray-800/95 to-transparent">
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
                (methodRender === "brand"
                  ? !(
                      shippingAddress &&
                      shippingAddress.line1 &&
                      shippingAddress.postalCode
                    )
                  : !orderId.trim() ||
                    amount === "" ||
                    isNaN(Number(amount))) ||
                (methodRender !== "brand" && !bankOk)
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
                  <FaCheckCircle /> Submit Order
                </>
              )}
            </Button>
          </div>
        </div>
      </Motion.form>
    </div>
  );
}
