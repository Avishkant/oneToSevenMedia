import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function CampaignCard({
  id,
  title,
  brand,
  budget,
  tags = [],
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
  const [followersCount, setFollowersCount] = useState(0);
  const [isApplied, setIsApplied] = useState(Boolean(applied));
  // keep internal applied state in sync with parent-provided prop
  useEffect(() => {
    setIsApplied(Boolean(applied));
  }, [applied]);
  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`glass rounded-xl overflow-hidden card-shadow border-2 ${
        highlight
          ? "border-yellow-400/60 shadow-yellow-500/20"
          : "border-transparent"
      }`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center text-sm text-slate-300">
          {brand}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-slate-300">
              <span className="font-medium text-indigo-200">{brand}</span>
              {budget ? ` • ${budget}` : ""}
            </p>
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
                <button
                  disabled={applying || isApplied}
                  onClick={() => {
                    if (!auth?.token) return navigate("/influencer/login");
                    setShowApplyModal(true);
                  }}
                  className="btn-primary"
                >
                  {isApplied ? "Applied" : applying ? "Applying..." : "Apply"}
                </button>

                {showApplyModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => setShowApplyModal(false)}
                    />
                    <div className="relative z-10 w-full max-w-md bg-slate-800 p-6 rounded">
                      <h3 className="font-semibold text-lg mb-2">
                        Apply to {title}
                      </h3>
                      <p className="text-sm text-slate-300 mb-4">
                        Please confirm your current follower count.
                      </p>
                      <input
                        type="number"
                        min={0}
                        value={followersCount}
                        onChange={(e) =>
                          setFollowersCount(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded bg-white/5 mb-4"
                        placeholder="Followers count"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowApplyModal(false)}
                          className="btn-primary bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={applying || !followersCount}
                          onClick={async () => {
                            if (!auth?.token)
                              return navigate("/influencer/login");
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
                                  followersCount,
                                }),
                              });
                              if (!res.ok) {
                                const b = await res.json().catch(() => ({}));
                                throw new Error(b.error || "Apply failed");
                              }
                              toast?.add("Applied to campaign", {
                                type: "success",
                              });
                              setIsApplied(true);
                              setShowApplyModal(false);
                              if (typeof onApplied === "function")
                                onApplied(id);
                            } catch (err) {
                              toast?.add(err.message || "Apply failed", {
                                type: "error",
                              });
                            } finally {
                              setApplying(false);
                            }
                          }}
                          className="btn-primary bg-emerald-500"
                        >
                          {applying ? "Applying..." : "Submit"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
