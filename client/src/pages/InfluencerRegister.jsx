import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import { motion } from "framer-motion"; // Import motion for animations
import {
  PLATFORM_OPTIONS,
  PLATFORM_META,
  isValidUrl,
} from "../constants/socialPlatforms";

// --- Custom Components for enhanced UI ---

// Reusable styled input
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className}`}
    {...props}
  />
);

// Reusable styled select
const StyledSelect = ({ className = "", children, ...props }) => (
  <select
    className={`px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className} appearance-none cursor-pointer`}
    style={{ lineHeight: '1.5rem' }} // Fix for select height consistency
    {...props}
  >
    {children}
  </select>
);

// --- Main Component ---

export default function InfluencerRegister() {
  // State definitions (unchanged)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [stateField, setStateField] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [followers, setFollowers] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [profession, setProfession] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  // Selection options (unchanged)
  const CATEGORY_OPTIONS = [
    "Fashion",
    "Food",
    "Travel",
    "Technology",
    "Lifestyle",
    "Fitness",
    "Beauty",
    "Parenting",
    "Other",
  ];

  const COLLAB_OPTIONS = [
    "Product Exchange",
    "Service Exchange",
    "Experience Exchange",
    "Monetary Compensation",
    "Brand Collaboration",
    "Revenue Share",
    "Cross Promotion",
    "Affiliate Program",
  ];

  const LANGUAGE_OPTIONS = [
    "English",
    "Hindi",
    "Marathi",
    "Tamil",
    "Telugu",
    "Bengali",
    "Gujarati",
    "Punjabi",
  ];

  // Platform state/logic (unchanged)
  const [platformChecks, setPlatformChecks] = useState(() =>
    PLATFORM_OPTIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {})
  );
  const [platformUrls, setPlatformUrls] = useState(() =>
    PLATFORM_OPTIONS.reduce((acc, p) => ({ ...acc, [p]: "" }), {})
  );
  const [platformErrors, setPlatformErrors] = useState(() =>
    PLATFORM_OPTIONS.reduce((acc, p) => ({ ...acc, [p]: "" }), {})
  );

  const validatePlatformUrl = (p) => {
    const url = platformUrls[p] && platformUrls[p].trim();
    if (!platformChecks[p]) {
      setPlatformErrors((e) => ({ ...e, [p]: "" }));
      return true;
    }
    if (!url) {
      setPlatformErrors((e) => ({ ...e, [p]: "URL required" }));
      return false;
    }
    if (!isValidUrl(url)) {
      setPlatformErrors((e) => ({
        ...e,
        [p]: "Enter a valid URL (https://...)",
      }));
      return false;
    }
    setPlatformErrors((e) => ({ ...e, [p]: "" }));
    return true;
  };

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedCollabs, setSelectedCollabs] = useState(new Set());
  const [selectedLanguages, setSelectedLanguages] = useState(new Set());

  const toggleCategory = (c) => {
    setSelectedCategories((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else {
        if (next.size < 2) next.add(c);
      }
      return next;
    });
  };

  const toggleCollab = (c) => {
    setSelectedCollabs((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const toggleLanguage = (c) => {
    setSelectedLanguages((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else {
        if (next.size < 3) next.add(c);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // validate selections
      if (selectedCollabs.size === 0) {
        throw new Error("Select at least one collaboration interest");
      }
      if (selectedCategories.size === 0) {
        throw new Error("Select at least one content category (up to 2)");
      }
      // validate selected platform URLs
      for (const p of PLATFORM_OPTIONS) {
        if (platformChecks[p]) {
          if (!validatePlatformUrl(p)) {
            throw new Error(`Please fix ${p} URL`);
          }
        }
      }
      const payload = {
        name,
        email,
        password,
        phone: phone || undefined,
        state: stateField || undefined,
        city: city || undefined,
        instagram: instagram || undefined,
        followersCount: followers ? Number(followers) : undefined,
        socialPlatforms: Array.from(Object.keys(platformChecks)).filter(
          (p) => platformChecks[p]
        ),
        socialProfiles: Object.fromEntries(
          Object.entries(platformUrls).filter(([, v]) => v && v.trim())
        ),
        categories: Array.from(selectedCategories),
        languages: Array.from(selectedLanguages),
        collaborationInterests: Array.from(selectedCollabs),
        gender: gender || undefined,
        dob: dob || undefined,
        employmentStatus: employmentStatus || undefined,
        profession: profession || undefined,
        role: "influencer",
      };

      const res = await auth.register(payload);
      if (!res.ok) {
        setError(res.error || "Registration failed");
        toast?.add(res.error || "Registration failed", { type: "error" });
        setLoading(false);
        return;
      }

      toast?.add("Account created — welcome to 1TO7MEDIA! 🎉", { type: "success" });
      // allow auth context to update, then navigate to dashboard
      setTimeout(
        () => navigate("/influencer/dashboard", { replace: true }),
        50
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Container Animation */}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-3xl bg-gray-800/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-purple-500/30"
      >
        <header className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-white">
            Join the <span className="text-cyan-400">1TO7MEDIA</span> Creator Network
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Sign up now to discover top campaigns, manage collaborations, and grow your revenue.
          </p>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-rose-400 bg-rose-900/40 border border-rose-700 p-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          
          {/* Section 1: Account Details */}
          <div className="col-span-2">
            <h3 className="text-xl font-semibold border-b border-gray-700/50 pb-2 mb-4 text-purple-400">Account Details</h3>
          </div>
          <StyledInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="md:col-span-2" />
          <StyledInput required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" type="email" />
          <StyledInput required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          
          {/* Section 2: Personal Info & Location */}
          <div className="col-span-2 mt-4">
            <h3 className="text-xl font-semibold border-b border-gray-700/50 pb-2 mb-4 text-purple-400">Personal & Location</h3>
          </div>
          <StyledInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" type="tel" />
          <StyledInput value={stateField} onChange={(e) => setStateField(e.target.value)} placeholder="State/Region (optional)" />
          <StyledInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" />
          
          <StyledSelect value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="" disabled className="bg-gray-700 text-gray-400">Gender (optional)</option>
            <option value="female" className="bg-gray-700">Female</option>
            <option value="male" className="bg-gray-700">Male</option>
            <option value="nonbinary" className="bg-gray-700">Non-binary</option>
            <option value="other" className="bg-gray-700">Other</option>
          </StyledSelect>
          
          <div className="md:col-span-1">
            <label className="text-xs text-gray-400 block mb-1">Date of Birth (optional)</label>
            <StyledInput value={dob} onChange={(e) => setDob(e.target.value)} type="date" />
          </div>
          <StyledInput value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} placeholder="Employment Status (optional)" />
          <StyledInput value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Profession (optional)" />


          {/* Section 3: Creator Details */}
          <div className="col-span-2 mt-4">
            <h3 className="text-xl font-semibold border-b border-gray-700/50 pb-2 mb-4 text-purple-400">Creator Profile</h3>
          </div>

          <StyledInput value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram Handle (optional)" />
          <StyledInput value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Total Followers Count (optional)" type="number" min="0" />

          {/* Content Categories (Tags) */}
          <div className="col-span-2">
            <div className="text-sm text-gray-300 font-medium mb-2">
              Content Categories <span className="text-gray-500">(select up to 2)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_OPTIONS.map((c, index) => (
                <motion.button
                  type="button"
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={`px-4 py-2 text-sm rounded-full transition duration-200 shadow-md ${
                    selectedCategories.has(c) 
                      ? "bg-cyan-500 text-gray-900 font-bold hover:bg-cyan-400" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Content Languages (Tags) */}
          <div className="col-span-2">
            <div className="text-sm text-gray-300 font-medium mb-2">
              Content Languages <span className="text-gray-500">(select up to 3)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {LANGUAGE_OPTIONS.map((l) => (
                <motion.button
                  type="button"
                  key={l}
                  onClick={() => toggleLanguage(l)}
                  className={`px-4 py-2 text-sm rounded-full transition duration-200 shadow-md ${
                    selectedLanguages.has(l) 
                      ? "bg-purple-500 text-white font-bold hover:bg-purple-400" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {l}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Social Platforms (Checkboxes and URLs) */}
          <div className="col-span-2">
            <div className="text-sm text-gray-300 font-medium mb-2">
              Social Platforms <span className="text-gray-500">(provide URL for selected)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PLATFORM_OPTIONS.map((p, index) => (
                <motion.div 
                  key={p} 
                  className={`p-3 rounded-lg border transition duration-200 ${platformChecks[p] ? 'border-cyan-400/50 bg-gray-700/50' : 'border-gray-700/50 bg-gray-700/30'}`}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <label htmlFor={`plat-${p}`} className="flex items-center gap-3 cursor-pointer">
                    <input
                      id={`plat-${p}`}
                      type="checkbox"
                      checked={!!platformChecks[p]}
                      onChange={(e) =>
                        setPlatformChecks((s) => ({
                          ...s,
                          [p]: e.target.checked,
                        }))
                      }
                      className="form-checkbox h-4 w-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      aria-label={`Enable ${p}`}
                    />
                    <span className="text-base font-semibold text-white flex items-center gap-2">
                      <span aria-hidden className="text-cyan-400">{PLATFORM_META[p]?.icon || "🔗"}</span>
                      {p}
                    </span>
                  </label>
                  
                  {platformChecks[p] && (
                    <div className="mt-3">
                      <StyledInput
                        placeholder={`${p} Profile URL`}
                        value={platformUrls[p]}
                        onChange={(e) =>
                          setPlatformUrls((s) => ({ ...s, [p]: e.target.value }))
                        }
                        onBlur={() => validatePlatformUrl(p)}
                        aria-invalid={!!platformErrors[p]}
                        aria-describedby={platformErrors[p] ? `err-${p}` : undefined}
                        className={`w-full text-sm ${platformErrors[p] ? 'border-rose-500' : ''}`}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {PLATFORM_META[p]?.example}
                      </div>
                      {platformErrors[p] && (
                        <div id={`err-${p}`} role="alert" className="text-xs text-rose-400 mt-1 font-medium">
                          {platformErrors[p]}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Collaboration Interests (Checkboxes) */}
          <div className="col-span-2">
            <div className="text-sm text-gray-300 font-medium mb-2 mt-4">
              Collaboration Interests <span className="text-gray-500">(select at least 1)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLLAB_OPTIONS.map((c) => (
                <motion.label 
                  key={c} 
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition duration-200 text-sm ${selectedCollabs.has(c) ? 'bg-purple-600/70' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCollabs.has(c)}
                    onChange={() => toggleCollab(c)}
                    className="form-checkbox h-4 w-4 text-purple-400 bg-gray-700 border-gray-600 rounded focus:ring-purple-400"
                  />
                  <span className="text-sm">{c}</span>
                </motion.label>
              ))}
            </div>
          </div>


          {/* Submission Button */}
          <div className="col-span-2 mt-6">
            <Button
              disabled={loading}
              type="submit"
              variant="primary"
              className="w-full text-lg shadow-lg hover:shadow-cyan-500/50"
            >
              {loading ? "Creating Account..." : "Register and Launch Your Profile"}
            </Button>
            <div className="text-center text-sm text-gray-500 mt-3">
                Already have an account? <a href="/influencer/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition">Log In</a>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}