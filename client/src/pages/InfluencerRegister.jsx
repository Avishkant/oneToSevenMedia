import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import {
  PLATFORM_OPTIONS,
  PLATFORM_META,
  isValidUrl,
} from "../constants/socialPlatforms";

export default function InfluencerRegister() {
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

  // selections handled with checkbox state below

  // platform names pulled from central constants

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

      toast?.add("Account created — welcome!", { type: "success" });
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl glass p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">Create influencer account</h2>
        <p className="text-sm text-slate-300 mb-6">
          Sign up to discover campaigns and apply as a creator.
        </p>
        {error && <div className="text-sm text-rose-400 mb-3">{error}</div>}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="px-3 py-2 rounded bg-white/3 col-span-2"
          />
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
            placeholder="State (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Instagram handle (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            placeholder="Followers count (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <div className="col-span-2">
            <div className="text-sm text-slate-300 mb-2">
              Social platforms (provide URL for selected)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <div key={p} className="flex items-start gap-2">
                  <div className="pt-2">
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
                      aria-label={`Enable ${p}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor={`plat-${p}`}
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <span aria-hidden>{PLATFORM_META[p]?.icon || "🔗"}</span>
                      <span>{p}</span>
                    </label>
                    {platformChecks[p] && (
                      <div className="mt-1">
                        <input
                          placeholder={`${p} URL`}
                          value={platformUrls[p]}
                          onChange={(e) =>
                            setPlatformUrls((s) => ({
                              ...s,
                              [p]: e.target.value,
                            }))
                          }
                          onBlur={() => validatePlatformUrl(p)}
                          aria-invalid={!!platformErrors[p]}
                          aria-describedby={
                            platformErrors[p] ? `err-${p}` : undefined
                          }
                          className="w-full px-2 py-1 rounded bg-white/3"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          {PLATFORM_META[p]?.example}
                        </div>
                        {platformErrors[p] && (
                          <div
                            id={`err-${p}`}
                            role="alert"
                            className="text-xs text-rose-400 mt-1"
                          >
                            {platformErrors[p]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-sm text-slate-300 mb-2">
              Content categories (select up to 2)
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={`px-3 py-1 rounded ${
                    selectedCategories.has(c) ? "bg-indigo-500" : "bg-white/5"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-sm text-slate-300 mb-2">
              Collaboration interests (select at least 1)
            </div>
            <div className="flex flex-wrap gap-2">
              {COLLAB_OPTIONS.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCollabs.has(c)}
                    onChange={() => toggleCollab(c)}
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-300 mb-2">
              Content languages (select up to 3)
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => toggleLanguage(l)}
                  className={`px-3 py-1 rounded ${
                    selectedLanguages.has(l) ? "bg-indigo-500" : "bg-white/5"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="px-3 py-2 rounded bg-white/3"
          >
            <option value="">Gender (optional)</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="nonbinary">Non-binary</option>
            <option value="other">Other</option>
          </select>
          <input
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            type="date"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            placeholder="Employment status (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />
          <input
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            placeholder="Profession (optional)"
            className="px-3 py-2 rounded bg-white/3"
          />

          <div className="col-span-2 mt-3">
            <button disabled={loading} className="btn-primary w-full">
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
