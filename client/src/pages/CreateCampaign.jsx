import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";

export default function CreateCampaign() {
  const [title, setTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState("");
  const [followersMin, setFollowersMin] = useState("");
  const [followersMax, setFollowersMax] = useState("");
  const [location, setLocation] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [fulfillmentMethod, setFulfillmentMethod] = useState("influencer");
  const [orderFormFields, setOrderFormFields] = useState("");
  const [influencerComment, setInfluencerComment] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [saving, setSaving] = useState(false);

  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        brandName,
        category,
        followersMin: Number(followersMin) || 0,
        followersMax: Number(followersMax) || 0,
        requirements: requirements || undefined,
        budget: Number(budget) || 0,
        deliverables: deliverables
          ? deliverables
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        location: location || undefined,
        fulfillmentMethod: fulfillmentMethod || undefined,
        orderFormFields: orderFormFields
          ? orderFormFields
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        isPublic: !!isPublic,
        influencerComment: influencerComment || undefined,
        adminComment: adminComment || undefined,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Failed to create campaign");
      }
      toast?.add("Campaign created", { type: "success" });
      navigate("/admin/campaigns", { replace: true });
    } catch (err) {
      toast?.add(err.message || "Create failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-4">Create Campaign</h1>
        <form
          onSubmit={handleSubmit}
          className="glass p-6 rounded grid grid-cols-1 gap-3"
        >
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Brand name"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Fitness & Food Influencers)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={followersMin}
              onChange={(e) =>
                setFollowersMin(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Followers min (e.g. 2000)"
              type="number"
              className="px-3 py-2 rounded bg-white/3"
            />
            <input
              value={followersMax}
              onChange={(e) =>
                setFollowersMax(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Followers max (optional)"
              type="number"
              className="px-3 py-2 rounded bg-white/3"
            />
          </div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. PAN India, Mumbai)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Requirements (e.g. Make a 30s reel around the product)"
            className="px-3 py-2 rounded bg-white/3"
            rows={3}
          />
          <input
            value={budget}
            onChange={(e) =>
              setBudget(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Budget (total, e.g. 500)"
            type="number"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            placeholder="Deliverables (e.g. 1x Reel, 3x Stories)"
            className="px-3 py-2 rounded bg-white/3"
          />
          {/* timeline / questions removed from UI */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />{" "}
            <span className="text-sm">Public</span>
          </label>

          <label className="text-sm">
            Public note for creators (influencer-facing)
          </label>
          <input
            value={influencerComment}
            onChange={(e) => setInfluencerComment(e.target.value)}
            placeholder="A short note visible to creators"
            className="px-3 py-2 rounded bg-white/3"
          />

          <label className="text-sm">Internal admin note (admin-only)</label>
          <input
            value={adminComment}
            onChange={(e) => setAdminComment(e.target.value)}
            placeholder="Internal note for admins"
            className="px-3 py-2 rounded bg-white/3"
          />

          <div className="grid grid-cols-1 gap-2">
            <label className="text-sm">Fulfillment method</label>
            <select
              value={fulfillmentMethod}
              onChange={(e) => setFulfillmentMethod(e.target.value)}
              className="px-3 py-2 rounded bg-white/3"
            >
              <option value="influencer">Influencer orders (default)</option>
              <option value="brand">
                Brand delivers (brand ships product)
              </option>
            </select>

            <label className="text-sm">
              Order form fields (comma separated)
            </label>
            <input
              value={orderFormFields}
              onChange={(e) => setOrderFormFields(e.target.value)}
              placeholder="e.g. orderId,amount,size"
              className="px-3 py-2 rounded bg-white/3"
            />
          </div>
          <div>
            <Button type="submit" disabled={saving} variant="primary">
              {saving ? "Creating..." : "Create campaign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
