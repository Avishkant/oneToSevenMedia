import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await auth.logout();
    navigate("/");
  };
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
          <div className="text-sm">
            <Link to="/" className="text-slate-300 hover:underline">
              Back to site
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 text-slate-300 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Campaigns</h3>
            <p className="text-sm text-slate-300 mt-2">
              Create and manage brand campaigns.
            </p>
            <div className="mt-4">
              <Link to="/admin/campaigns" className="btn-primary">
                Manage campaigns
              </Link>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Applications</h3>
            <p className="text-sm text-slate-300 mt-2">
              Review influencer applications and approve payouts.
            </p>
            <div className="mt-4">
              <Link to="/admin/applications" className="btn-primary">
                Review applications
              </Link>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Order Reviews</h3>
            <p className="text-sm text-slate-300 mt-2">
              Review submitted order forms, add comments, and approve or reject
              payouts.
            </p>
            <div className="mt-4">
              <Link
                to="/admin/order-reviews"
                className="btn-primary bg-emerald-600"
              >
                Open order reviews
              </Link>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Users</h3>
            <p className="text-sm text-slate-300 mt-2">
              Manage admins, brands and influencers.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {auth?.user?.role === "superadmin" && (
                <Link
                  to="/admin/admins"
                  className="text-indigo-300 hover:underline"
                >
                  Admins
                </Link>
              )}
              {auth?.user?.role === "superadmin" ||
              (Array.isArray(auth?.user?.permissions) &&
                auth.user.permissions.includes("influencers:view")) ? (
                <Link
                  to="/admin/influencers"
                  className="text-indigo-300 hover:underline"
                >
                  Influencers
                </Link>
              ) : (
                <div className="text-slate-500">Influencers</div>
              )}
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="glass p-6 rounded-xl card-shadow">
            <h2 className="font-semibold">Quick actions</h2>
            <div className="mt-4 flex gap-3">
              <Link
                to="/admin/campaigns/create"
                className="btn-primary inline-block text-center"
              >
                Create campaign
              </Link>
              <button className="btn-primary bg-emerald-500 hover:bg-emerald-600">
                Approve payouts
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
