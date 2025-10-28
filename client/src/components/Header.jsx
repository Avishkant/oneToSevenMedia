import { useState, useRef, useEffect } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const [open, setOpen] = useState(false);
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="py-6 border-b border-white/6 bg-gradient-to-b from-transparent to-black/10">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <Link to={logoTarget} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black">
            1to7
          </div>
          <span className="font-semibold text-lg">oneToSeven</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/90">
          {/* Show different nav items for logged-in influencers */}
          {user && role === "influencer" ? (
            <>
              <Link to="/campaigns/browse" className="hover:text-white">
                Campaigns
              </Link>
              <Link to="/influencer/applications" className="hover:text-white">
                My applications
              </Link>
            </>
          ) : user && (role === "admin" || role === "superadmin") ? (
            <>
              {canCampaign ? (
                <Link to="/admin/campaigns" className="hover:text-white">
                  Campaigns
                </Link>
              ) : (
                <span className="text-slate-500">Campaigns</span>
              )}

              {/* optional create link/button - shown only when admin has create permission */}
              {canCampaignCreate && (
                <Link to="/admin/campaigns/create" className="hover:text-white">
                  Create campaign
                </Link>
              )}

              {canApplications ? (
                <Link to="/admin/applications" className="hover:text-white">
                  Applications
                </Link>
              ) : (
                <span className="text-slate-500">Applications</span>
              )}

              {canOrders ? (
                <Link to="/admin/order-reviews" className="hover:text-white">
                  Order reviews
                </Link>
              ) : (
                <span className="text-slate-500">Order reviews</span>
              )}

              {canPayments ? (
                <Link to="/admin/payments" className="hover:text-white">
                  Payments
                </Link>
              ) : (
                <span className="text-slate-500">Payments</span>
              )}

              <Link to="/admin/dashboard" className="hover:text-white">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <a href="#features" className="hover:text-white">
                Features
              </a>
              <a href="#campaigns" className="hover:text-white">
                Campaigns
              </a>
              <a href="/campaigns/browse" className="hover:text-white">
                Browse
              </a>
            </>
          )}

          {!user ? (
            <Button as={Link} to="/influencer/login" variant="primary">
              Influencer login
            </Button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-3 px-3 py-1 rounded-md hover:bg-white/5"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                  {initials}
                </div>
                <span className="hidden md:inline">
                  {user.name || user.email}
                </span>
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-56 bg-slate-800 border border-white/6 rounded-md shadow-lg z-50 py-2"
                >
                  {/* Profile summary */}
                  <div className="px-4 py-3 border-b border-white/6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                        {initials}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.name || user.email}
                        </div>
                        <div className="text-xs text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link
                      to={
                        role === "influencer"
                          ? "/influencer/profile"
                          : "/profile"
                      }
                      className="block px-4 py-2 hover:bg-white/5"
                    >
                      My profile
                    </Link>
                  </div>

                  <div className="border-t border-white/6 mt-2">
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full justify-start px-4 py-2"
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        <button
          className="md:hidden text-white/90"
          onClick={() => setOpen((o) => !o)}
          aria-label="menu"
        >
          {open ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden mt-4 px-6">
          <div className="flex flex-col gap-3 glass p-4 rounded-md">
            {user && role === "influencer" ? (
              <>
                <Link to="/campaigns/browse" className="block">
                  Campaigns
                </Link>
                <Link to="/influencer/applications" className="block">
                  My applications
                </Link>
                <Link to="/influencer/profile" className="block">
                  Profile
                </Link>
              </>
            ) : user && (role === "admin" || role === "superadmin") ? (
              <>
                {canCampaign ? (
                  <Link to="/admin/campaigns" className="block">
                    Campaigns
                  </Link>
                ) : (
                  <div className="block text-slate-500">Campaigns</div>
                )}

                {canApplications ? (
                  <Link to="/admin/applications" className="block">
                    Applications
                  </Link>
                ) : (
                  <div className="block text-slate-500">Applications</div>
                )}

                {canOrders ? (
                  <Link to="/admin/order-reviews" className="block">
                    Order reviews
                  </Link>
                ) : (
                  <div className="block text-slate-500">Order reviews</div>
                )}

                {canPayments ? (
                  <Link to="/admin/payments" className="block">
                    Payments
                  </Link>
                ) : (
                  <div className="block text-slate-500">Payments</div>
                )}

                <Link to="/admin/dashboard" className="block">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <a href="#features" className="block">
                  Features
                </a>
                <a href="#campaigns" className="block">
                  Campaigns
                </a>
              </>
            )}

            {!user && (
              <Button
                as={Link}
                to="/influencer/login"
                variant="primary"
                className="block w-full text-center"
                onClick={() => setOpen(false)}
              >
                Influencer login
              </Button>
            )}

            {user && (
              <div>
                {(role === "admin" || role === "superadmin") && (
                  <Link to="/admin/dashboard" className="block">
                    Admin
                  </Link>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="block w-full mt-2"
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
