import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

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
            <Button as={Link} to="/" variant="ghost" className="text-slate-300">
              Back to site
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="ml-4 text-slate-300"
            >
              Sign out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Campaigns</h3>
            <p className="text-sm text-slate-300 mt-2">
              Create and manage brand campaigns.
            </p>
            <div className="mt-4">
              <Button as={Link} to="/admin/campaigns" variant="primary">
                Manage campaigns
              </Button>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Applications</h3>
            <p className="text-sm text-slate-300 mt-2">
              Review influencer applications and approve payouts.
            </p>
            <div className="mt-4">
              <Button as={Link} to="/admin/applications" variant="primary">
                Review applications
              </Button>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Order Reviews</h3>
            <p className="text-sm text-slate-300 mt-2">
              Review submitted order forms, add comments, and approve or reject
              payouts.
            </p>
            <div className="mt-4">
              <Button as={Link} to="/admin/order-reviews" variant="success">
                Open order reviews
              </Button>
            </div>
          </div>
          <div className="glass p-6 rounded-xl card-shadow card-hover animate-fadeInUp">
            <h3 className="font-semibold">Users</h3>
            <p className="text-sm text-slate-300 mt-2">
              Manage admins, brands and influencers.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {auth?.user?.role === "superadmin" && (
                <Button
                  as={Link}
                  to="/admin/admins"
                  variant="ghost"
                  size="sm"
                  className="text-indigo-300"
                >
                  Admins
                </Button>
              )}
              {auth?.user?.role === "superadmin" ||
              (Array.isArray(auth?.user?.permissions) &&
                auth.user.permissions.includes("influencers:view")) ? (
                <Button
                  as={Link}
                  to="/admin/influencers"
                  variant="ghost"
                  size="sm"
                  className="text-indigo-300"
                >
                  Influencers
                </Button>
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
              <Button
                as={Link}
                to="/admin/campaigns/create"
                variant="primary"
                className="inline-block text-center"
              >
                Create campaign
              </Button>
              <Button variant="success">Approve payouts</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
