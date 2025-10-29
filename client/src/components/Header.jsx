import { useState, useRef, useEffect } from "react";
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence

const BRAND_NAME = "1TO7MEDIA";

// Custom Link component with hover effect
const NavLink = ({ to, children, className = "" }) => (
  <motion.div
    className="relative group cursor-pointer"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    <Link to={to} className={`text-sm font-medium transition duration-200 text-gray-300 hover:text-cyan-400 ${className}`}>
      {children}
    </Link>
    {/* Underline hover effect */}
    <span className="absolute left-0 bottom-[-5px] h-0.5 w-0 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
  </motion.div>
);

// --- Main Component ---

export default function Header() {
  const [open, setOpen] = useState(false); // Mobile menu state
  const auth = useAuth();
  const navigate = useNavigate();

  const user = auth?.user;
  const role = user?.role || "";

  const logoTarget = user
    ? role === "influencer"
      ? "/influencer/dashboard"
      : role === "admin" || role === "superadmin"
      ? "/admin/dashboard"
      : "/"
    : "/";

  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false); // Desktop user menu state

  useEffect(() => {
    function handleDocClick(e) {
      if (!menuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("touchstart", handleDocClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("touchstart", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await auth.logout();
    navigate("/");
  };

  const initials =
    user && (user.name || user.email)
      ? (user.name || user.email)
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "";

  const hasPerm = (key) =>
    !!(
      user &&
      Array.isArray(user.permissions) &&
      user.permissions.includes(key)
    );

  const canCampaign = hasPerm("campaigns:manage");
  const canCampaignCreate = hasPerm("campaign:create");
  const canApplications = hasPerm("applications:review");
  const canOrders = hasPerm("orders:review");
  const canPayments = hasPerm("payouts:approve");

  return (
    <header className="sticky top-0 z-40 py-4 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-md shadow-xl transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        
        {/* --- Logo Area --- */}
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Link to={logoTarget} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex flex-col items-center justify-center text-white font-black shadow-lg">
                <span className="text-sm leading-none">1T7</span>
                <span className="text-xs -mt-1 leading-none">M</span>
            </div>
            <span className="font-extrabold text-xl text-white tracking-wide">{BRAND_NAME}</span>
            </Link>
        </motion.div>

        {/* --- Desktop Navigation --- */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          
          {/* Dynamic Navigation Links */}
          {user && role === "influencer" ? (
            <>
              <NavLink to="/campaigns/browse">Campaigns</NavLink>
              <NavLink to="/influencer/applications">My applications</NavLink>
              <NavLink to="/influencer/profile">Profile</NavLink>
            </>
          ) : user && (role === "admin" || role === "superadmin") ? (
            <>
              {canCampaign ? (<NavLink to="/admin/campaigns">Campaigns</NavLink>) : (<span className="text-slate-500">Campaigns</span>)}
              {canCampaignCreate && (<NavLink to="/admin/campaigns/create" className="text-cyan-400">Create</NavLink>)}
              {canApplications ? (<NavLink to="/admin/applications">Applications</NavLink>) : (<span className="text-slate-500">Applications</span>)}
              {canOrders ? (<NavLink to="/admin/order-reviews">Orders</NavLink>) : (<span className="text-slate-500">Orders</span>)}
              {canPayments ? (<NavLink to="/admin/payments">Payments</NavLink>) : (<span className="text-slate-500">Payments</span>)}
            </>
          ) : (
            <>
              <a href="/#solutions" className="text-gray-300 hover:text-cyan-400 transition duration-200">Solutions</a>
              <a href="/#campaigns" className="text-gray-300 hover:text-cyan-400 transition duration-200">Featured Campaigns</a>
              <Link to="/campaigns/browse" className="text-gray-300 hover:text-cyan-400 transition duration-200">Browse</Link>
            </>
          )}

          {/* Authentication/User Menu */}
          {!user ? (
            <Button as={Link} to="/influencer/login" variant="accent" 
                // Add button hover effect
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
              Influencer Login
            </Button>
          ) : (
            <div className="relative">
              <motion.button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-3 px-3 py-1 rounded-full hover:bg-gray-800 transition"
                // Add profile button hover effect
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-gray-900 font-bold shadow-md">
                  {initials}
                </div>
                <span className="text-white font-medium hidden lg:inline">
                  {user.name || user.email}
                </span>
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-2 origin-top-right"
                  >
                    {/* Profile summary */}
                    <div className="px-4 py-3 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-gray-900 font-bold">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {user.name || user.email}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        to={role === "influencer" ? "/influencer/profile" : "/profile"}
                        className="flex items-center gap-3 px-4 py-2 text-white hover:bg-purple-600/30 transition duration-200"
                        onClick={() => setMenuOpen(false)}
                      >
                        <FiUser className="w-4 h-4 text-purple-400" /> My Profile
                      </Link>
                      {/* Admin dashboard link for admins/superadmins */}
                      {(role === "admin" || role === "superadmin") && (
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-3 px-4 py-2 text-white hover:bg-purple-600/30 transition duration-200"
                          onClick={() => setMenuOpen(false)}
                        >
                            <span className="text-purple-400">📊</span> Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-gray-700 mt-2">
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="w-full justify-start text-left text-rose-400 hover:bg-rose-900/30 px-4 py-2 flex items-center gap-3"
                      >
                        <FiLogOut className="w-4 h-4" /> Sign out
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* --- Mobile Menu Toggle --- */}
        <button
          className="md:hidden text-white/90 p-2 rounded-full hover:bg-gray-800 transition"
          onClick={() => setOpen((o) => !o)}
          aria-label="menu"
        >
          {open ? <FiX size={24} className="text-cyan-400" /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* --- Mobile Menu Content --- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden mt-4 px-6 overflow-hidden"
          >
            <div className="flex flex-col gap-3 bg-gray-800/90 border border-gray-700 p-4 rounded-xl shadow-lg">
              {/* Dynamic Links */}
              {(user && role === "influencer") || (!user && (
                <>
                  <Link to="/campaigns/browse" className="block text-white hover:text-cyan-400 transition">Browse Campaigns</Link>
                  <Link to="/influencer/applications" className="block text-white hover:text-cyan-400 transition">My applications</Link>
                  <Link to="/influencer/profile" className="block text-white hover:text-cyan-400 transition">Profile</Link>
                </>
              ))}

              {/* Admin Links */}
              {user && (role === "admin" || role === "superadmin") && (
                <>
                  {canCampaign ? (<Link to="/admin/campaigns" className="block text-white hover:text-cyan-400 transition">Campaigns</Link>) : (<div className="block text-slate-500">Campaigns</div>)}
                  {canApplications ? (<Link to="/admin/applications" className="block text-white hover:text-cyan-400 transition">Applications</Link>) : (<div className="block text-slate-500">Applications</div>)}
                  {canOrders ? (<Link to="/admin/order-reviews" className="block text-white hover:text-cyan-400 transition">Order reviews</Link>) : (<div className="block text-slate-500">Order reviews</div>)}
                  {canPayments ? (<Link to="/admin/payments" className="block text-white hover:text-cyan-400 transition">Payments</Link>) : (<div className="block text-slate-500">Payments</div>)}
                  <Link to="/admin/dashboard" className="block text-white hover:text-cyan-400 transition">Dashboard</Link>
                </>
              )}
              
              {/* Public Links */}
              {!user && (
                <>
                  <a href="/#solutions" className="block text-white hover:text-cyan-400 transition">Solutions</a>
                  <a href="/#campaigns" className="block text-white hover:text-cyan-400 transition">Featured Campaigns</a>
                </>
              )}


              {/* Auth Buttons */}
              {!user ? (
                <Button
                  as={Link}
                  to="/influencer/login"
                  variant="accent"
                  className="w-full mt-2"
                  onClick={() => setOpen(false)}
                >
                  Influencer login
                </Button>
              ) : (
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full mt-2"
                >
                  Sign out
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}