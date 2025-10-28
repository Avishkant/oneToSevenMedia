import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import {
  PLATFORM_OPTIONS,
  PLATFORM_META,
  isValidUrl,
} from "../constants/socialPlatforms";

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

export default function ProfileNew() {
  const auth = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ socialProfiles: {} });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    (async function load() {
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        let res = await fetch("/api/users/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        // attempt refresh once when server returns invalid_token
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
          } catch {
            // ignore refresh errors here and fallthrough
          }
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
    if (!validateAll())
      return toast?.add?.("Fix validation errors", { type: "error" });
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
        socialProfiles: form.socialProfiles || {},
        socialPlatforms: Object.keys(form.socialProfiles || {}).filter(
          (k) => (form.socialProfiles || {})[k]
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
      toast?.add?.("Profile updated", { type: "success" });
    } catch (e) {
      toast?.add?.(e.message || "Save failed", { type: "error" });
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;
  if (!profile) return <div className="p-6">No profile found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Your profile</h1>
        {!isEditing && (
          <Button variant="primary" onClick={startEdit}>
            Edit profile
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel">
            <div className="text-sm text-slate-400">Name</div>
            <div className="font-medium">{profile.name || "-"}</div>

            <div className="text-sm text-slate-400 mt-4">Instagram</div>
            <div>{profile.instagram || "-"}</div>

            <div className="text-sm text-slate-400 mt-4">Followers</div>
            <div>{profile.followersCount ?? "-"}</div>

            <div className="text-sm text-slate-400 mt-4">Location</div>
            <div>
              {profile.city
                ? `${profile.city}${profile.state ? ", " + profile.state : ""}`
                : "-"}
            </div>
          </div>

          <div className="panel">
            <div className="text-sm text-slate-400">Categories</div>
            <div>{(profile.categories || []).join(", ") || "-"}</div>

            <div className="text-sm text-slate-400 mt-4">Languages</div>
            <div>{(profile.languages || []).join(", ") || "-"}</div>

            <div className="text-sm text-slate-400 mt-4">
              Collaboration interests
            </div>
            <div>
              {(profile.collaborationInterests || []).join(", ") || "-"}
            </div>

            <div className="text-sm text-slate-400 mt-4">Profession</div>
            <div>{profile.profession || "-"}</div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <div className="text-sm text-slate-400">Social platforms</div>
            <div className="mt-2 space-y-2">
              {PLATFORM_OPTIONS.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-6">{PLATFORM_META[p]?.icon || "🔗"}</span>
                  <div className="flex-1">
                    {(profile.socialProfiles && profile.socialProfiles[p]) ||
                      "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400">Name</label>
              <input
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Instagram</label>
              <input
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.instagram}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instagram: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Followers</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.followersCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, followersCount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">City</label>
              <input
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">State</label>
              <input
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Profession</label>
              <input
                className="w-full px-3 py-2 rounded bg-white/5"
                value={form.profession}
                onChange={(e) =>
                  setForm((f) => ({ ...f, profession: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Categories (up to 2)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    const list = Array.isArray(form.categories)
                      ? [...form.categories]
                      : [];
                    const idx = list.indexOf(c);
                    if (idx !== -1) list.splice(idx, 1);
                    else if (list.length < 2) list.push(c);
                    setForm((f) => ({ ...f, categories: list }));
                  }}
                  className={`px-3 py-1 rounded ${
                    Array.isArray(form.categories) &&
                    form.categories.includes(c)
                      ? "bg-indigo-500"
                      : "bg-white/5"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Languages (up to 3)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    const list = Array.isArray(form.languages)
                      ? [...form.languages]
                      : [];
                    const idx = list.indexOf(l);
                    if (idx !== -1) list.splice(idx, 1);
                    else if (list.length < 3) list.push(l);
                    setForm((f) => ({ ...f, languages: list }));
                  }}
                  className={`px-3 py-1 rounded ${
                    Array.isArray(form.languages) && form.languages.includes(l)
                      ? "bg-indigo-500"
                      : "bg-white/5"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">
              Collaboration interests
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLLAB_OPTIONS.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      Array.isArray(form.collaborationInterests) &&
                      form.collaborationInterests.includes(c)
                    }
                    onChange={() => {
                      const list = Array.isArray(form.collaborationInterests)
                        ? [...form.collaborationInterests]
                        : [];
                      const idx = list.indexOf(c);
                      if (idx !== -1) list.splice(idx, 1);
                      else list.push(c);
                      setForm((f) => ({ ...f, collaborationInterests: list }));
                    }}
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Phone</div>
            <input
              className="w-full px-3 py-2 rounded bg-white/5"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>

          <div>
            <div className="text-sm text-slate-400">Social profile URLs</div>
            <div className="mt-2 space-y-3">
              {PLATFORM_OPTIONS.map((p) => (
                <div key={p} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6">
                      {PLATFORM_META[p]?.icon || "🔗"}
                    </span>
                    <div className="font-medium">{p}</div>
                  </div>
                  <input
                    className="w-full px-3 py-2 rounded bg-white/5"
                    placeholder={PLATFORM_META[p]?.example}
                    value={
                      (form.socialProfiles && form.socialProfiles[p]) || ""
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        socialProfiles: {
                          ...(f.socialProfiles || {}),
                          [p]: e.target.value,
                        },
                      }))
                    }
                    onBlur={(e) =>
                      setErrors((s) => ({
                        ...s,
                        [p]:
                          e.target.value && !isValidUrl(e.target.value)
                            ? "Enter a valid URL"
                            : undefined,
                      }))
                    }
                    aria-invalid={!!errors[p]}
                    aria-describedby={errors[p] ? `err-${p}` : undefined}
                  />
                  {errors[p] && (
                    <div
                      id={`err-${p}`}
                      role="alert"
                      className="text-rose-400 text-sm"
                    >
                      {errors[p]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSave}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
