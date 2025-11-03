import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import { motion } from "framer-motion";
import { FaBullhorn, FaUsers, FaMapMarkerAlt, FaDollarSign, FaListUl, FaLock, FaExternalLinkAlt } from "react-icons/fa";

// --- Custom Styled Input/Textarea Components ---
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
  const [payoutRelease, setPayoutRelease] = useState("pay_after_deliverables");
  const [saving, setSaving] = useState(false);

  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Helper for input change handlers (clears non-numeric input for number fields)
  const handleNumberChange = (setter) => (e) => {
    setter(e.target.value === "" ? "" : Number(e.target.value));
  };


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
          ? deliverables.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        location: location || undefined,
        fulfillmentMethod: fulfillmentMethod || undefined,
        orderFormFields: orderFormFields
          ? orderFormFields.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        isPublic: !!isPublic,
        influencerComment: influencerComment || undefined,
        adminComment: adminComment || undefined,
        payoutRelease: payoutRelease || undefined,
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
      toast?.add("Campaign created successfully! 🎉", { type: "success" });
      navigate("/admin/campaigns", { replace: true });
    } catch (err) {
      toast?.add(err.message || "Create failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-cyan-400 mb-6">
            <FaBullhorn className="inline mr-2" /> Create New Campaign
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
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Campaign Identity</h2>
            <StyledInput required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign Title (e.g., 'Summer Sneaker Launch')" />
            <StyledInput required value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand Name (e.g., 'Nike')" />
            <StyledInput required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. Fitness, Beauty, Technology)" />
          </section>

          {/* Section 2: Targeting and Logistics */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
             <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Targeting & Requirements</h2>

             {/* Followers Range */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Min Followers (0 for any)</label>
                    <StyledInput value={followersMin} onChange={handleNumberChange(setFollowersMin)} placeholder="Min Followers (e.g. 2000)" type="number" min="0" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Max Followers (Optional)</label>
                    <StyledInput value={followersMax} onChange={handleNumberChange(setFollowersMax)} placeholder="Max Followers" type="number" min="0" />
                </div>
             </div>
             
             <div className="space-y-1">
                <label className="text-xs text-gray-400">Location</label>
                <StyledInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. PAN India, Mumbai, Global)" />
             </div>

             <div className="space-y-1">
                <label className="text-xs text-gray-400">Campaign Requirements / Brief</label>
                <StyledTextarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Detailed requirements (e.g. Make a 30s reel around the product focusing on durability...)" rows={3} />
             </div>
          </section>
          
          {/* Section 3: Deliverables and Budget */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Budget & Output</h2>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Total Budget (Numeric)</label>
                    <StyledInput value={budget} onChange={handleNumberChange(setBudget)} placeholder="Budget (e.g. 500)" type="number" required />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400">Deliverables (Comma Separated)</label>
                    <StyledInput value={deliverables} onChange={(e) => setDeliverables(e.target.value)} placeholder="e.g. 1x Reel, 3x Stories, 1x Post" />
                </div>
            </div>
          </section>

          {/* Section 4: Advanced Configuration */}
          <section className="space-y-4 pt-4 border-t border-gray-700/50">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2 mb-4">Advanced Configuration</h2>
            
            {/* Fulfillment & Payout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Fulfillment Method</label>
                    <StyledSelect value={fulfillmentMethod} onChange={(e) => setFulfillmentMethod(e.target.value)}>
                        <option value="influencer" className="bg-gray-700">Influencer orders (default)</option>
                        <option value="brand" className="bg-gray-700">Brand delivers (brand ships product)</option>
                    </StyledSelect>
                </div>
                
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Payout Release Timing</label>
                    <StyledSelect value={payoutRelease} onChange={(e) => setPayoutRelease(e.target.value)}>
                        <option value="refund_on_delivery" className="bg-gray-700">Refund on delivery, remaining after deliverables</option>
                        <option value="pay_after_deliverables" className="bg-gray-700">Pay order + deliverables after deliverables performed</option>
                        <option value="advance_then_remaining" className="bg-gray-700">Pay order in advance, remaining paid after deliverables</option>
                    </StyledSelect>
                </div>
            </div>
            
            {/* Order Form Fields */}
            <div className="space-y-1">
                <label className="text-xs text-gray-400">Order Form Fields (Comma separated list of required fields)</label>
                <StyledInput value={orderFormFields} onChange={(e) => setOrderFormFields(e.target.value)} placeholder="e.g. trackingId, orderAmount, productSize" />
            </div>

            {/* Public/Internal Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Public Note for Creators</label>
                    <StyledInput value={influencerComment} onChange={(e) => setInfluencerComment(e.target.value)} placeholder="A short note visible to creators" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Internal Admin Note</label>
                    <StyledInput value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Internal note for admins" />
                </div>
            </div>

            {/* Public Toggle */}
            <div className="pt-2">
                <label className="flex items-center gap-3 text-white cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-medium">
                        Make Campaign Public 
                        {isPublic ? 
                            <span className="text-emerald-400 ml-2">(Visible to all creators)</span> : 
                            <span className="text-rose-400 ml-2">(Private/Draft)</span>
                        }
                    </span>
                </label>
            </div>
          </section>

          {/* Submission Button */}
          <motion.div 
            className="pt-6 border-t border-gray-700/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button type="submit" disabled={saving} variant="primary" className="w-full text-lg shadow-lg hover:shadow-cyan-500/50">
              {saving ? "Creating Campaign..." : <><FaBullhorn className="mr-2" /> Create Campaign</>}
            </Button>
          </motion.div>

        </motion.form>
      </div>
    </div>
  );
}