import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function CampaignEdit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!res.ok) throw new Error("Failed to load campaign");
        const body = await res.json();
        if (mounted) setCampaign(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: campaign.title,
        brandName: campaign.brandName,
        category: campaign.category,
        followersMin: Number(campaign.followersMin) || 0,
        followersMax: Number(campaign.followersMax) || 0,
        location: campaign.location || undefined,
        budget: Number(campaign.budget) || 0,
        deliverables: Array.isArray(campaign.deliverables)
          ? campaign.deliverables
          : campaign.deliverables
          ? campaign.deliverables
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        isPublic: !!campaign.isPublic,
      };

      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Update failed");
      }
      toast?.add("Campaign updated", { type: "success" });
      navigate("/admin/campaigns", { replace: true });
    } catch (err) {
      toast?.add(err.message || "Update failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!campaign) return <div className="p-6">No campaign found.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Edit Campaign</h1>
        <form
          onSubmit={handleSubmit}
          className="glass p-6 rounded grid grid-cols-1 gap-3"
        >
          <input
            value={campaign.title}
            onChange={(e) =>
              setCampaign({ ...campaign, title: e.target.value })
            }
            placeholder="Title"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={campaign.brandName}
            onChange={(e) =>
              setCampaign({ ...campaign, brandName: e.target.value })
            }
            placeholder="Brand name"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={campaign.category}
            onChange={(e) =>
              setCampaign({ ...campaign, category: e.target.value })
            }
            placeholder="Category"
            className="px-3 py-2 rounded bg-white/3"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={campaign.followersMin}
              onChange={(e) =>
                setCampaign({
                  ...campaign,
                  followersMin: Number(e.target.value),
                })
              }
              placeholder="Followers min"
              type="number"
              className="px-3 py-2 rounded bg-white/3"
            />
            <input
              value={campaign.followersMax}
              onChange={(e) =>
                setCampaign({
                  ...campaign,
                  followersMax: Number(e.target.value),
                })
              }
              placeholder="Followers max"
              type="number"
              className="px-3 py-2 rounded bg-white/3"
            />
          </div>
          <input
            value={campaign.location || ""}
            onChange={(e) =>
              setCampaign({ ...campaign, location: e.target.value })
            }
            placeholder="Location (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={campaign.budget}
            onChange={(e) =>
              setCampaign({ ...campaign, budget: Number(e.target.value) })
            }
            placeholder="Budget"
            type="number"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={
              Array.isArray(campaign.deliverables)
                ? campaign.deliverables.join(", ")
                : campaign.deliverables || ""
            }
            onChange={(e) =>
              setCampaign({ ...campaign, deliverables: e.target.value })
            }
            placeholder="Deliverables (comma separated)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!campaign.isPublic}
              onChange={(e) =>
                setCampaign({ ...campaign, isPublic: e.target.checked })
              }
            />{" "}
            <span className="text-sm">Public</span>
          </label>
          <div>
            <button disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
