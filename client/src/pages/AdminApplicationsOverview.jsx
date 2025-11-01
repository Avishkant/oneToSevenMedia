import React, { useEffect, useState } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../components/Button";
// satisfy some linters during iterative edits
void motion;

// CampaignGroupCard: renders campaign header (brand, title, count) and collapsible list of apps
function CampaignGroupCard({ campaign, apps, count, onAction }) {
  const [open, setOpen] = useState(true);

  const brandName = campaign?.brandName || campaign?.title || "(unknown)";
  const brandLogo = campaign?.brandLogo || campaign?.image || null;
  const subtitle = campaign?.title || campaign?.category || "";

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

  return (
    <div>
      <div
        role="button"
        onClick={() => setOpen((s) => !s)}
        className="glass p-3 rounded-md flex items-center justify-between cursor-pointer card-hover"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-sm text-slate-200 overflow-hidden">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                className="w-full h-full object-cover"
              />
            ) : (
              (brandName || "?")
                .split(" ")
                .map((s) => (s && s[0]) || "")
                .slice(0, 2)
                .join("")
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-slate-100">
              {brandName}
            </div>
            {subtitle && (
              <div className="text-sm text-slate-400">{subtitle}</div>
            )}
            {campaign?.adminComment && (
              <div className="text-xs text-yellow-300 mt-1">
                Admin note: {campaign.adminComment}
              </div>
            )}
            {campaign?.payoutRelease && (
              <div className="text-xs text-slate-300 mt-1">
                Payout: {formatPayoutRelease(campaign.payoutRelease)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-300">
            {count} app{count !== 1 ? "s" : ""}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            aria-expanded={open}
            className="p-2 rounded-md bg-white/3 hover:bg-white/6"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((s) => !s);
            }}
          >
            <motion.svg
              className={`w-4 h-4 text-slate-200 transform ${
                open ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M6 9l6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="mt-3 space-y-3"
          >
            {apps.map((a) => (
              <motion.li
                layout
                key={a._id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="py-3 flex items-center justify-between glass p-3 rounded-md card-shadow"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {a.influencer?.name || a.influencer}
                  </div>
                  <div className="text-sm text-slate-400">
                    Status: {a.status} • Followers: {a.followersAtApply ?? "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => onAction(a._id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onAction(a._id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminApplicationsOverview() {
  const auth = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(`/api/applications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Failed to load applications");
        const body = await res.json();
        if (mounted) setItems(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast]);

  const act = async (id, verb) => {
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/${id}/${verb}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Action failed");
      await res.json();
      toast?.add(`${verb}ed`, { type: "success" });
      // refresh
      const r = await fetch(`/api/applications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (r.ok) setItems(await r.json());
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  // group by campaign
  const grouped = items.reduce((acc, a) => {
    const key = a.campaign?._id || "unknown";
    acc[key] = acc[key] || { campaign: a.campaign, apps: [] };
    acc[key].apps.push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Applications Overview</h1>
        <div className="glass p-4 rounded text-slate-200">
          {loading && <div>Loading...</div>}
          {!loading && Object.keys(grouped).length === 0 && (
            <div className="py-8 text-center">
              <div className="empty-illu" aria-hidden>
                <svg viewBox="0 0 120 80" className="w-full h-full">
                  <g
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <circle className="dot" cx="30" cy="40" r="6" />
                    <circle
                      className="dot"
                      cx="60"
                      cy="40"
                      r="6"
                      style={{ animationDelay: "150ms" }}
                    />
                    <circle
                      className="dot"
                      cx="90"
                      cy="40"
                      r="6"
                      style={{ animationDelay: "300ms" }}
                    />
                  </g>
                </svg>
              </div>
              <div className="text-sm text-slate-300">No applications yet.</div>
              <div className="mt-3">
                <Button
                  as="a"
                  href="/admin/campaigns/create"
                  variant="gradient"
                >
                  Create campaign
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(grouped).map(([key, g]) => (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.28 }}
                >
                  <CampaignGroupCard
                    campaign={g.campaign}
                    apps={g.apps}
                    count={(g.apps || []).length}
                    onAction={act}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
