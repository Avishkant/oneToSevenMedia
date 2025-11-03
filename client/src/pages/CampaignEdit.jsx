import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaBullhorn, FaUsers, FaMapMarkerAlt, FaDollarSign, FaListUl, FaLockOpen, FaLock } from "react-icons/fa";

// --- Custom Styled Input/Select Components (Retained for consistency) ---
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

const StyledTextarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-200 ${className}`}
    {...props}
  />
);

const StyledSelect = ({ className = "", children, ...props }) => (
    <select
      className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className} appearance-none cursor-pointer`}
      {...props}
    >
      {children}
    </select>
);


// --- Main Component ---
export default function CampaignEdit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true); // Set to true initially
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Helper for setting state from input
  const handleCampaignChange = (field, isNumber = false) => (e) => {
    let value = e.target.value;
    if (isNumber) {
        value = value === "" ? "" : Number(value);
    }
    setCampaign({ ...campaign, [field]: value });
  };
  
  // --- Data Loading ---
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(`/api/campaigns/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Failed to load campaign");
        const body = await res.json();
        
        // --- DATA NORMALIZATION FOR FORM ---
        // Convert array fields back to comma-separated strings for easier form editing
        body.deliverables = Array.isArray(body.deliverables) ? body.deliverables.join(", ") : body.deliverables || "";
        body.orderFormFields = Array.isArray(body.orderFormFields) ? body.orderFormFields.join(", ") : body.orderFormFields || "";
        // --- END NORMALIZATION ---

        if (mounted) setCampaign(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load", { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id, toast, auth]);


  // --- Form Submission ---
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
        requirements: campaign.requirements || undefined,
        budget: Number(campaign.budget) || 0,
        location: campaign.location || undefined,
        isPublic: !!campaign.isPublic,
        fulfillmentMethod: campaign.fulfillmentMethod || undefined,
        influencerComment: campaign.influencerComment || undefined,
        adminComment: campaign.adminComment || undefined,
        payoutRelease: campaign.payoutRelease || undefined,
        
        // Convert strings back to arrays, filtering out empty strings
        deliverables: campaign.deliverables 
          ? String(campaign.deliverables).split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        orderFormFields: campaign.orderFormFields
          ? String(campaign.orderFormFields).split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
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
      toast?.add("Campaign updated successfully! 🎉", { type: "success" });
      navigate("/admin/campaigns", { replace: true });
    } catch (err) {
      toast?.add(err.message || "Update failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };
  
  // --- Loading/Error States ---
  if (loading) return <div className="p-6 text-gray-400">Loading campaign details...</div>;
  if (!campaign) return <div className="p-6 text-rose-400">No campaign found or unauthorized access.</div>;

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-cyan-400 mb-6">
            <FaEdit className="inline mr-2" /> Edit Campaign: <span className="text-white">{campaign.title}</span>
        </h1>
        
        <motion.form
          onSubmit={handleSubmit}
          className="bg-gray-800/90 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-purple-500/30 space-y-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          
          {/* Section 1: Core Campaign Details */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Core Identity</h2>
            <StyledInput required value={campaign.title} onChange={handleCampaignChange('title')} placeholder="Campaign Title" />
            <StyledInput required value={campaign.brandName} onChange={handleCampaignChange('brandName')} placeholder="Brand Name" disabled /> {/* Brand name often disabled after creation */}
            <StyledInput required value={campaign.category} onChange={handleCampaignChange('category')} placeholder="Category (e.g. Fitness & Food Influencers)" />
          </section>

          {/* Section 2: Targeting and Logistics */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
             <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Targeting & Requirements</h2>

             {/* Followers Range */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Min Followers (0 for any)</label>
                    <StyledInput value={campaign.followersMin || ""} onChange={handleCampaignChange('followersMin', true)} placeholder="Min Followers" type="number" min="0" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Max Followers (Optional)</label>
                    <StyledInput value={campaign.followersMax || ""} onChange={handleCampaignChange('followersMax', true)} placeholder="Max Followers" type="number" min="0" />
                </div>
             </div>
             
             <div className="space-y-1">
                <label className="text-xs text-gray-400">Location</label>
                <StyledInput value={campaign.location || ""} onChange={handleCampaignChange('location')} placeholder="Location (e.g. PAN India, Mumbai, Global)" />
             </div>

             <div className="space-y-1">
                <label className="text-xs text-gray-400">Campaign Requirements / Brief</label>
                <StyledTextarea value={campaign.requirements || ""} onChange={handleCampaignChange('requirements')} placeholder="Detailed requirements (e.g. Make a 30s reel around the product...)" rows={3} />
             </div>
          </section>
          
          {/* Section 3: Deliverables and Budget */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Budget & Output</h2>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Total Budget (Numeric)</label>
                    <StyledInput value={campaign.budget || ""} onChange={handleCampaignChange('budget', true)} placeholder="Budget (e.g. 500)" type="number" required />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Deliverables (Comma Separated)</label>
                    <StyledInput value={campaign.deliverables} onChange={handleCampaignChange('deliverables')} placeholder="e.g. 1x Reel, 3x Stories, 1x Post" />
                </div>
            </div>
          </section>

          {/* Section 4: Advanced Configuration */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Advanced Configuration & Notes</h2>
            
            {/* Fulfillment & Payout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Fulfillment Method</label>
                    <StyledSelect value={campaign.fulfillmentMethod || "influencer"} onChange={handleCampaignChange('fulfillmentMethod')}>
                        <option value="influencer" className="bg-gray-700">Influencer orders (default)</option>
                        <option value="brand" className="bg-gray-700">Brand delivers (brand ships product)</option>
                    </StyledSelect>
                </div>
                
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Payout Release Timing</label>
                    <StyledSelect value={campaign.payoutRelease || "pay_after_deliverables"} onChange={handleCampaignChange('payoutRelease')}>
                        <option value="refund_on_delivery" className="bg-gray-700">Refund on delivery, remaining after deliverables</option>
                        <option value="pay_after_deliverables" className="bg-gray-700">Pay order + deliverables after deliverables performed</option>
                        <option value="advance_then_remaining" className="bg-gray-700">Pay order in advance, remaining paid after deliverables</option>
                    </StyledSelect>
                </div>
            </div>
            
            {/* Order Form Fields */}
            <div className="space-y-1">
                <label className="text-xs text-gray-400">Order Form Fields (Comma separated list of required fields)</label>
                <StyledInput value={campaign.orderFormFields} onChange={handleCampaignChange('orderFormFields')} placeholder="e.g. trackingId, orderAmount, productSize" />
            </div>

            {/* Public/Internal Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Public Note for Creators</label>
                    <StyledInput value={campaign.influencerComment || ""} onChange={handleCampaignChange('influencerComment')} placeholder="A short note visible to creators" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Internal Admin Note</label>
                    <StyledInput value={campaign.adminComment || ""} onChange={handleCampaignChange('adminComment')} placeholder="Internal note for admins" />
                </div>
            </div>

            {/* Public Toggle */}
            <div className="pt-2">
                <label className="flex items-center gap-3 text-white cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!campaign.isPublic}
                        onChange={(e) => setCampaign({ ...campaign, isPublic: e.target.checked })}
                        className="form-checkbox h-5 w-5 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-medium">
                        Make Campaign Public 
                        {!campaign.isPublic ? 
                            <span className="text-emerald-400 ml-2 flex items-center gap-1"><FaLockOpen /> (Visible to all creators)</span> : 
                            <span className="text-rose-400 ml-2 flex items-center gap-1"><FaLock /> (Private/Draft)</span>
                        }
                    </span>
                </label>
            </div>
          </section>

          {/* Submission Button */}
          <motion.div 
            className="pt-6 border-t border-gray-700/50 flex gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button type="submit" disabled={saving} variant="primary" className="flex-1 text-lg shadow-lg hover:shadow-cyan-500/50">
              {saving ? "Saving Changes..." : <><FaEdit className="mr-2" /> Save Changes</>}
            </Button>
            <Button type="button" onClick={() => navigate("/admin/campaigns")} variant="secondary" disabled={saving}>
               Cancel
            </Button>
          </motion.div>

        </motion.form>
      </div>
    </div>
  );
}