import { useState, useRef, useEffect } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
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
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#campaigns" className="hover:text-white">
            Campaigns
          </a>
          <a href="#pricing" className="hover:text-white">
            Pricing
          </a>
          {!user ? (
            <Link to="/influencer/login" className="btn-primary">
              Influencer login
            </Link>
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
                  className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/6 rounded-md shadow-lg z-50 py-2"
                >
                  {role === "influencer" && (
                    <Link
                      to="/influencer/dashboard"
                      className="block px-4 py-2 hover:bg-white/5"
                    >
                      Dashboard
                    </Link>
                  )}
                  {(role === "admin" || role === "superadmin") && (
                    <Link
                      to="/admin/dashboard"
                      className="block px-4 py-2 hover:bg-white/5"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-white/5"
                  >
                    Sign out
                  </button>
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
            <a href="#features" className="block">
              Features
            </a>
            <a href="#campaigns" className="block">
              Campaigns
            </a>
            <a href="#pricing" className="block">
              Pricing
            </a>

            {!user && (
              <Link
                to="/influencer/login"
                className="block btn-primary w-full text-center"
                onClick={() => setOpen(false)}
              >
                Influencer login
              </Link>
            )}

            {user && (
              <div>
                {role === "influencer" && (
                  <Link to="/influencer/dashboard" className="block">
                    Dashboard
                  </Link>
                )}
                {(role === "admin" || role === "superadmin") && (
                  <Link to="/admin/dashboard" className="block">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block btn-primary w-full mt-2"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
