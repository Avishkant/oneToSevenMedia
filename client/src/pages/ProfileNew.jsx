import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import { motion } from "framer-motion";
import {
  PLATFORM_OPTIONS,
  PLATFORM_META,
  isValidUrl,
} from "../constants/socialPlatforms";
import { FaEdit, FaUserCircle, FaMapMarkerAlt, FaUsers, FaTag, FaLanguage, FaHandshake, FaBriefcase, FaPhoneAlt, FaLink, FaTimes } from "react-icons/fa";

// --- Configuration and Data (Replicated for self-containment) ---
const BRAND_NAME = "1TO7MEDIA";

const CATEGORY_OPTIONS = [
  "Fashion", "Food", "Travel", "Technology", "Lifestyle",
  "Fitness", "Beauty", "Parenting", "Other",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Marathi", "Tamil", "Telugu",
  "Bengali", "Gujarati", "Punjabi",
];

const COLLAB_OPTIONS = [
  "Product Exchange", "Service Exchange", "Experience Exchange",
  "Monetary Compensation", "Brand Collaboration", "Revenue Share",
  "Cross Promotion", "Affiliate Program",
];

// --- Custom Components for enhanced UI (Reused from Register) ---

// Reusable styled input
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`w-full px-4 py-2 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition duration-200 ${className}`}
    {...props}
  />
);

// Styled container for read-only items with hover effect
const ProfileItem = ({ icon: Icon, label, children }) => (
  <motion.div
    className="p-4 bg-gray-800/70 rounded-lg border border-gray-700 cursor-default"
    whileHover={{ scale: 1.02, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)" }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
  >
    <div className="text-sm font-medium text-purple-400 flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="text-white font-semibold">{children}</div>
  </motion.div>
);

// --- Main Component ---

export default function ProfileNew() {
  const auth = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ socialProfiles: {} });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Loading Logic (Unchanged) ---
  useEffect(() => {
    let mounted = true;
    (async function load() {
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        let res = await fetch("/api/users/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        // Refresh token logic (retained for functionality)
        if (res.status === 401) {
          try {
            const body = await res.json().catch(() => ({}));
            if (body && body.error === "invalid_token" && auth?.refresh) {
              const refreshed = await auth.refresh();
              if (refreshed && refreshed.ok) {
                const newToken = refreshed.body.token || refreshed.body?.token;
                if (newToken) {
                  res = await fetch("/api/users/me", {
                    headers: { Authorization: `Bearer ${newToken}` },
                  });
                }
              }
            }
          } catch { /* ignore refresh errors */ }
        }

        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (!mounted) return;
        setProfile(data);
      } catch {
        if (!mounted) return;
        setProfile(auth?.user || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [auth]);

  // --- Editing Functions (Unchanged) ---
  const startEdit = () => {
    setForm({
      name: profile?.name || "",
      instagram: profile?.instagram || "",
      followersCount: profile?.followersCount || "",
      city: profile?.city || "",
      state: profile?.state || "",
      categories: profile?.categories || [],
      languages: profile?.languages || [],
      collaborationInterests: profile?.collaborationInterests || [],
      profession: profile?.profession || "",
      phone: profile?.phone || "",
      socialProfiles: { ...(profile?.socialProfiles || {}) },
    });
    setErrors({});
    setIsEditing(true);
  };

  const validateAll = () => {
    const next = {};
    for (const p of PLATFORM_OPTIONS) {
      const v = (form.socialProfiles && form.socialProfiles[p]) || "";
      if (v && !isValidUrl(v)) next[p] = "Enter a valid URL (https://...)";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return toast?.add?.("Please fix validation errors.", { type: "error" });
    }
    setIsSaving(true);
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const payload = {
        name: form.name,
        instagram: form.instagram,
        followersCount: form.followersCount ? Number(form.followersCount) : 0,
        city: form.city,
        state: form.state,
        categories: form.categories || [],
        languages: form.languages || [],
        collaborationInterests: form.collaborationInterests || [],
        profession: form.profession,
        phone: form.phone,
        // Filter out empty social profile URLs before saving
        socialProfiles: Object.fromEntries(
          Object.entries(form.socialProfiles || {}).filter(([, v]) => v)
        ),
      };
      
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Save failed");
      const body = await res.json();
      
      setProfile(body);
      setIsEditing(false);
      toast?.add?.("Profile updated successfully! 🎉", { type: "success" });
    } catch (e) {
      toast?.add?.(e.message || "Save failed", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleListToggle = (fieldName, option, maxCount) => {
    setForm((f) => {
      const list = Array.isArray(f[fieldName]) ? [...f[fieldName]] : [];
      const idx = list.indexOf(option);
      if (idx !== -1) list.splice(idx, 1);
      else if (!maxCount || list.length < maxCount) list.push(option);
      return { ...f, [fieldName]: list };
    });
  };

  // --- Initial Loading/Error States ---
  if (loading) return <div className="p-6 text-gray-400">Loading profile...</div>;
  if (!profile) return <div className="p-6 text-rose-400">No profile found or user is not logged in.</div>;

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">

        {/* Header and Toggle Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-gray-700 pb-4 mb-8"
        >
          <h1 className="text-3xl font-extrabold text-white">
            Your Creator Profile
          </h1>
          {!isEditing ? (
            <Button variant="primary" onClick={startEdit} className="flex items-center gap-2">
              <FaEdit /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={isSaving}
                className="min-w-[120px]"
                // Add hover/tap effect
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2"
                // Add hover/tap effect
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaTimes /> Cancel
              </Button>
            </div>
          )}
        </motion.div>

        {/* --- View Mode (Read-Only) --- */}
        {!isEditing ? (
          <motion.div
            key="view-mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Column 1: Core Details */}
            <div className="lg:col-span-1 space-y-4">
              <ProfileItem icon={FaUserCircle} label="Creator Details">
                <h2 className="text-2xl font-bold">{profile.name || "N/A"}</h2>
                <p className="text-sm text-gray-400">{profile.email}</p>
              </ProfileItem>

              <ProfileItem icon={FaUsers} label="Followers Count">
                {profile.followersCount ? `${profile.followersCount.toLocaleString()} Followers` : "-"}
              </ProfileItem>
              <ProfileItem icon={FaMapMarkerAlt} label="Location">
                {profile.city ? `${profile.city}${profile.state ? ", " + profile.state : ""}` : "-"}
              </ProfileItem>
              <ProfileItem icon={FaPhoneAlt} label="Phone">
                {profile.phone || "-"}
              </ProfileItem>
              <ProfileItem icon={FaBriefcase} label="Profession">
                {profile.profession || "-"}
              </ProfileItem>
            </div>

            {/* Column 2: Interests & Languages & Socials */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Content Interests Section (Read Mode) */}
              <motion.div 
                className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                whileHover={{ scale: 1.01, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <h3 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><FaTag /> Content Interests</h3>
                <div className="flex flex-wrap gap-3">
                  {(profile.categories || []).map((c) => (
                    <span key={c} className="px-4 py-1 text-sm rounded-full bg-cyan-600/50 text-white font-medium shadow-md">
                      {c}
                    </span>
                  )) || <span className="text-gray-400">-</span>}
                </div>
              </motion.div>

              {/* Languages Section (Read Mode) */}
              <motion.div 
                className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                whileHover={{ scale: 1.01, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <h3 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><FaLanguage /> Languages</h3>
                <div className="flex flex-wrap gap-3">
                  {(profile.languages || []).map((l) => (
                    <span key={l} className="px-4 py-1 text-sm rounded-full bg-purple-600/50 text-white font-medium shadow-md">
                      {l}
                    </span>
                  )) || <span className="text-gray-400">-</span>}
                </div>
              </motion.div>
              
              {/* Collaboration Interests Section (Read Mode) */}
              <motion.div 
                className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                whileHover={{ scale: 1.01, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <h3 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><FaHandshake /> Collaboration Interests</h3>
                <div className="flex flex-wrap gap-3">
                  {(profile.collaborationInterests || []).map((c) => (
                    <span key={c} className="px-3 py-1 text-sm rounded bg-gray-600/50 text-gray-300 shadow-sm">
                      {c}
                    </span>
                  )) || <span className="text-gray-400">-</span>}
                </div>
              </motion.div>

              {/* Social Profiles Section (Read Mode) */}
              <motion.div 
                className="bg-gray-800 p-6 rounded-xl border border-gray-700"
                whileHover={{ scale: 1.01, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <h3 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2"><FaLink /> Social Links</h3>
                <div className="space-y-3">
                  {PLATFORM_OPTIONS.map((p) => {
                    const url = profile.socialProfiles && profile.socialProfiles[p];
                    return (
                      <div key={p} className="flex items-center gap-3">
                        <span className="w-6 text-cyan-400">{PLATFORM_META[p]?.icon || "🔗"}</span>
                        <div className="flex-1 text-sm">
                          {url ? (
                            <motion.a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-cyan-300 hover:text-cyan-100 transition truncate block"
                              title={url}
                              whileHover={{ x: 5 }} // Subtle shift on link hover
                            >
                              {p}: {url}
                            </motion.a>
                          ) : (
                            <span className="text-gray-500">{p}: Not linked</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

            </div>
          </motion.div>
        ) : (
          /* --- Edit Mode --- */
          <motion.div
            key="edit-mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 bg-gray-800/90 p-8 rounded-xl shadow-2xl border border-cyan-500/30"
          >
            {/* Group 1: Core Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold text-cyan-400 col-span-2 border-b border-gray-700/50 pb-2 mb-2">Core Details</h3>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">Full Name</label><StyledInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">Instagram Handle</label><StyledInput value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">Followers Count</label><StyledInput type="number" value={form.followersCount} onChange={(e) => setForm((f) => ({ ...f, followersCount: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">Phone</label><StyledInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">City</label><StyledInput value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm text-gray-400 block">State/Region</label><StyledInput value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><label className="text-sm text-gray-400 block">Profession</label><StyledInput value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} /></div>
            </div>

            {/* Group 2: Categories, Languages, Interests */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-700/50">
              
              {/* Categories (Edit Mode) */}
              <div>
                <div className="text-sm text-gray-400 font-medium mb-2">Categories (max 2)</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <motion.button
                      key={c}
                      type="button"
                      onClick={() => handleListToggle('categories', c, 2)}
                      className={`px-3 py-1 text-sm rounded-full transition duration-200 shadow-md ${
                        Array.isArray(form.categories) && form.categories.includes(c)
                          ? "bg-cyan-500 text-gray-900 font-bold"
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
              
              {/* Languages (Edit Mode) */}
              <div>
                <div className="text-sm text-gray-400 font-medium mb-2">Languages (max 3)</div>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <motion.button
                      key={l}
                      type="button"
                      onClick={() => handleListToggle('languages', l, 3)}
                      className={`px-3 py-1 text-sm rounded-full transition duration-200 shadow-md ${
                        Array.isArray(form.languages) && form.languages.includes(l)
                          ? "bg-purple-500 text-white font-bold"
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
              
              {/* Collaboration Interests (Edit Mode) */}
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-400 font-medium mb-2">Collaboration Interests</div>
                <div className="grid grid-cols-2 gap-2">
                  {COLLAB_OPTIONS.map((c) => (
                    <motion.label 
                      key={c} 
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition duration-200 text-xs ${Array.isArray(form.collaborationInterests) && form.collaborationInterests.includes(c) ? 'bg-purple-600/70' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <input
                        type="checkbox"
                        checked={Array.isArray(form.collaborationInterests) && form.collaborationInterests.includes(c)}
                        onChange={() => handleListToggle('collaborationInterests', c)}
                        className="form-checkbox h-4 w-4 text-purple-400 bg-gray-700 border-gray-600 rounded focus:ring-purple-400"
                      />
                      <span className="text-sm">{c}</span>
                    </motion.label>
                  ))}
                </div>
              </div>
            </div>

            {/* Group 3: Social Profiles (Edit Mode) */}
            <div className="pt-4 border-t border-gray-700/50">
              <h3 className="text-xl font-semibold text-cyan-400 border-b border-gray-700/50 pb-2 mb-4">Social Profile Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLATFORM_OPTIONS.map((p) => (
                  <div key={p} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-5 text-cyan-400">{PLATFORM_META[p]?.icon || <FaLink />}</span>
                      <div className="font-medium">{p} URL</div>
                    </div>
                    <StyledInput
                      placeholder={PLATFORM_META[p]?.example}
                      value={(form.socialProfiles && form.socialProfiles[p]) || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          socialProfiles: {
                            ...(f.socialProfiles || {}),
                            [p]: e.target.value,
                          },
                        }))
                      }
                      onBlur={validateAll}
                      aria-invalid={!!errors[p]}
                    />
                    {errors[p] && (
                      <div role="alert" className="text-rose-400 text-xs mt-1">
                        {errors[p]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}