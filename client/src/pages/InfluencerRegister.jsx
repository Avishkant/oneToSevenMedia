import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function InfluencerRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [stateField, setStateField] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [followers, setFollowers] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState("");
  const [categories, setCategories] = useState("");
  const [languages, setLanguages] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [profession, setProfession] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const toArray = (s) => {
    if (!s) return undefined;
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        phone: phone || undefined,
        state: stateField || undefined,
        city: city || undefined,
        instagram: instagram || undefined,
        followersCount: followers ? Number(followers) : undefined,
        socialPlatforms: toArray(socialPlatforms),
        categories: toArray(categories),
        languages: toArray(languages),
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
          <input
            value={socialPlatforms}
            onChange={(e) => setSocialPlatforms(e.target.value)}
            placeholder="Social platforms (comma separated)"
            className="px-3 py-2 rounded bg-white/3 col-span-2"
          />
          <input
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="Categories/niches (comma separated)"
            className="px-3 py-2 rounded bg-white/3 col-span-2"
          />
          <input
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="Languages (comma separated)"
            className="px-3 py-2 rounded bg-white/3"
          />
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
