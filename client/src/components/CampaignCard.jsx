import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "./Button";

// Default horizontal banner to use when a campaign doesn't provide an image
// Switched to a neutral abstract/business-style banner suitable for all campaigns
const DEFAULT_CAMPAIGN_BANNER =
  "https://images.unsplash.com/photo-1505682634904-d7c1de1d0f0f?w=1600&q=80&auto=format&fit=crop";

export default function CampaignCard({
  id,
  title,
  brand,
  budget,
  tags = [],
  category,
  followersMin,
  followersMax,
  location,
  requirements,
  imageUrl,
  highlight = false,
  actions = null,
  applied = false,
  onApplied = null,
}) {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [followersCount, setFollowersCount] = useState("");
  const [applicantComment, setApplicantComment] = useState("");
  const [isApplied, setIsApplied] = useState(Boolean(applied));
  // keep internal applied state in sync with parent-provided prop
  useEffect(() => {
    setIsApplied(Boolean(applied));
  }, [applied]);
  // render modal outside of the animated card to avoid clipping when the
  // card receives transform styles (framer-motion can create a new stacking
  // context which causes fixed/absolute children to be clipped). Rendering
  // the modal as a sibling prevents the 'buttons hidden' issue on some
  // browsers/devices.
  const applyModal = showApplyModal ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`apply-${id}-title`}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowApplyModal(false)}
      />
      <div className="relative z-10 w-full max-w-md bg-slate-800 p-6 rounded max-h-[90vh] overflow-auto">
        <h3 className="font-semibold text-lg mb-2">
          <span id={`apply-${id}-title`}>Apply to {title}</span>
        </h3>
        <p className="text-sm text-slate-300 mb-4">
          Please confirm your current follower count.
        </p>
        <input
          type="number"
          min={0}
          value={followersCount}
          onChange={(e) => setFollowersCount(e.target.value)}
          className="w-full px-3 py-2 rounded bg-white/5 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Followers count"
          placeholder="Followers count"
        />
        <div className="text-sm text-slate-300 mb-3">
          Optional note to the brand (why you're a fit / context)
        </div>
        <textarea
          value={applicantComment}
          onChange={(e) => setApplicantComment(e.target.value)}
          className="w-full px-3 py-2 rounded bg-white/5 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          placeholder="Add a short comment (optional)"
          aria-label="Application comment"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => setShowApplyModal(false)}
            variant="ghost"
            className="bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            disabled={
              applying || followersCount === "" || isNaN(Number(followersCount))
            }
            onClick={async () => {
              if (!auth?.token) return navigate("/influencer/login");
              setApplying(true);
              try {
                const res = await fetch("/api/applications", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(auth?.token
                      ? { Authorization: `Bearer ${auth.token}` }
                      : {}),
                  },
                  body: JSON.stringify({
                    campaignId: id,
                    followersCount: Number(followersCount),
                    comment: applicantComment,
                  }),
                });
                if (!res.ok) {
                  const b = await res.json().catch(() => ({}));
                  throw new Error(b.error || "Apply failed");
                }
                toast?.add("Applied to campaign", { type: "success" });
                setIsApplied(true);
                setShowApplyModal(false);
                if (typeof onApplied === "function") onApplied(id);
              } catch (err) {
                toast?.add(err.message || "Apply failed", { type: "error" });
              } finally {
                setApplying(false);
              }
            }}
            className=""
          >
            {applying ? "Applying..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {applyModal}
      <motion.article
        whileHover={{ scale: 1.025 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className={`glass rounded-xl overflow-hidden card-shadow border-2 ${
          highlight
            ? "border-yellow-400/60 shadow-yellow-500/20"
            : "border-transparent"
        }`}
      >
        {/* Banner / hero area */}
        <motion.div
          className="relative w-full overflow-hidden"
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4 }}
        >
          <img
            src={imageUrl || DEFAULT_CAMPAIGN_BANNER}
            alt={title}
            className="w-full h-44 md:h-48 object-cover transform transition-transform duration-500"
          />

          {/* Gradient overlay to make text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Title/brand overlay */}
          <div className="absolute left-4 bottom-3 right-4 flex items-end justify-between">
            <div>
              <div className="text-sm text-slate-200/90 font-semibold">{brand}</div>
              <div className="text-base md:text-lg font-bold text-white leading-tight">{title}</div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {budget && (
                <div className="text-sm bg-white/10 text-white px-3 py-1 rounded-full backdrop-blur">
                  {budget}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{brand}</h3>
              <p className="text-xs text-slate-300">
                <span className="font-medium text-indigo-200">{title}</span>
                {budget ? ` • ${budget}` : ""}
              </p>
              <div className="mt-3 text-sm text-slate-300 space-y-1">
                <div>
                  <span className="font-semibold">Looking for:</span>{" "}
                  {category || tags[0] || "-"}
                </div>
                <div>
                  <span className="font-semibold">Followers:</span>{" "}
                  {typeof followersMin === "number" && followersMin > 0
                    ? followersMax && followersMax > followersMin
                      ? `${followersMin} - ${followersMax}`
                      : `Above ${followersMin}`
                    : followersMax && followersMax > 0
                    ? `Up to ${followersMax}`
                    : "-"}
                </div>
                <div>
                  <span className="font-semibold">Location:</span>{" "}
                  {location || "-"}
                </div>
                <div>
                  <span className="font-semibold">Requirements:</span>{" "}
                  {requirements ? (
                    <span className="text-slate-400">{requirements}</span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tags.slice(0, 2).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {actions}
              {!actions && auth?.user?.role === "influencer" && (
                <>
                  <Button
                    disabled={applying || isApplied}
                    onClick={() => {
                      if (!auth?.token) return navigate("/influencer/login");
                      setShowApplyModal(true);
                    }}
                    variant={isApplied ? "ghost" : "primary"}
                    className="w-full md:w-auto"
                    aria-pressed={isApplied}
                  >
                    {isApplied ? "Applied" : applying ? "Applying..." : "Apply"}
                  </Button>

                  {/* modal rendered as sibling above */}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
}
