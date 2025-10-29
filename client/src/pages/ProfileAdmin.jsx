import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import { motion as Motion } from "framer-motion"; // Import motion for animations
import {
  FaUserShield,
  FaEnvelope,
  FaTag,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa"; // Icons for profile details
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";

// Assuming ADMIN_PERMISSIONS structure (for reference, as it's an external constant):
/* const ADMIN_PERMISSIONS = [
    { key: "campaigns:manage", label: "Manage Campaigns", description: "Can create, edit, and delete campaign listings." },
    { key: "applications:review", label: "Review Applications", description: "Can approve or reject influencer applications." },
    // ... others
];
*/

// --- Custom Components ---

// Container for profile data block
const ProfilePanel = ({ children, initialDelay = 0 }) => (
  <Motion.div
    className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-lg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: initialDelay }}
  >
    {children}
  </Motion.div>
);

// Container for a single data item
const DetailItem = ({ icon, label, value }) => {
  const Icon = icon;
  return (
    <Motion.div
      className="mb-4 p-3 rounded-lg hover:bg-gray-700/50 transition duration-300 flex items-center gap-4"
      whileHover={{ x: 5 }}
    >
      {Icon ? <Icon className="w-5 h-5 text-purple-400 flex-shrink-0" /> : null}
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase text-gray-400">
          {label}
        </div>
        <div className="text-lg font-bold text-white">{value}</div>
      </div>
    </Motion.div>
  );
};

// --- Main Component ---

export default function ProfileAdmin() {
  const auth = useAuth();
  const toast = useToast();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Data Loading Logic (Unchanged) ---
  useEffect(() => {
    let mounted = true;
    (async function load() {
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch("/api/admins/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (!mounted) return;
        setAdmin(data);
      } catch (e) {
        if (!mounted) return;
        toast?.add?.(e.message || "Failed to load admin profile", {
          type: "error",
        });
        setAdmin(auth?.user || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [auth, toast]);

  if (loading)
    return <div className="p-6 text-gray-400">Loading profile...</div>;
  if (!admin) return <div className="p-6 text-rose-400">No profile found.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* Header (Animated) */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-gray-700 pb-4 mb-8"
        >
          <h1 className="text-3xl font-extrabold text-white">
            <span className="text-cyan-400">Admin Profile</span>
          </h1>
          <div className="text-sm text-gray-400">
            Logged in as: <span className="font-semibold">{admin.email}</span>
          </div>
        </Motion.div>

        {/* --- Profile Data Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: Core Details */}
          <ProfilePanel initialDelay={0.1}>
            <h2 className="text-xl font-bold text-cyan-400 mb-6 border-b border-gray-700 pb-2">
              Core Access Details
            </h2>

            <DetailItem
              icon={FaUserShield}
              label="Name"
              value={admin.name || "-"}
            />
            <DetailItem
              icon={FaEnvelope}
              label="Email"
              value={admin.email || "-"}
            />
            <DetailItem icon={FaTag} label="Role" value={admin.role || "-"} />
          </ProfilePanel>

          {/* Column 2: Permissions List */}
          <ProfilePanel initialDelay={0.2}>
            <h2 className="text-xl font-bold text-cyan-400 mb-6 border-b border-gray-700 pb-2">
              Granted Permissions
            </h2>

            <div className="space-y-4">
              {ADMIN_PERMISSIONS.map((p, index) => (
                <Motion.div
                  key={p.key}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition duration-300"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex-1 pr-4">
                    <div className="font-semibold text-white">{p.label}</div>
                    <div className="text-xs text-gray-400">{p.description}</div>
                  </div>

                  <div>
                    {Array.isArray(admin.permissions) &&
                    admin.permissions.includes(p.key) ? (
                      <Motion.span
                        className="px-3 py-1 text-xs font-bold rounded-full text-white flex items-center gap-1 bg-emerald-600 shadow-md"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                      >
                        <FaCheckCircle className="w-3 h-3" /> Granted
                      </Motion.span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium rounded-full text-gray-400 flex items-center gap-1 bg-gray-700">
                        <FaTimesCircle className="w-3 h-3" /> Denied
                      </span>
                    )}
                  </div>
                </Motion.div>
              ))}
            </div>
          </ProfilePanel>
        </div>
      </div>
    </div>
  );
}
