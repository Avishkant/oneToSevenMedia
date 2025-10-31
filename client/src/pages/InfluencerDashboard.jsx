import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CampaignCard from "../components/CampaignCard";

export default function InfluencerDashboard() {
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
          <h1 className="text-3xl font-extrabold">Influencer dashboard</h1>
          <div className="text-sm">
            <button
              className="text-slate-300 hover:underline"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="glass p-6 rounded-xl card-shadow">
          <h2 className="font-semibold">
            Welcome{auth.user ? `, ${auth.user.name || ""}` : ""}
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            This is your dashboard. Browse campaigns below and apply.
          </p>
        </div>

        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Available campaigns</h3>
          <CampaignsListInner />
        </section>
      </div>
    </div>
  );
}

function CampaignsListInner() {
  const auth = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      if (!auth?.user || auth.user.role !== "influencer") return;
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(
          `/api/applications/by-influencer/${auth.user.id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) return; // ignore failures here
        const body = await res.json();
        if (mounted)
          setAppliedIds(
            new Set(
              (body || []).map((a) => String(a.campaign?._id || a.campaign))
            )
          );
      } catch {
        // ignore
      }
    }
    loadApps();
    return () => (mounted = false);
  }, [auth]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/campaigns");
        if (!res.ok) throw new Error("Failed to load campaigns");
        const body = await res.json();
        if (mounted) setItems((body || []).filter((c) => c.isPublic !== false));
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  if (loading) return <div className="mt-4">Loading campaigns...</div>;
  if (!items || items.length === 0)
    return (
      <div className="mt-4 text-sm text-slate-300">No campaigns right now.</div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((c) => (
        <CampaignCard
          key={c._id}
          id={c._id}
          title={c.title}
          brand={c.brandName}
          budget={`Rs ${c.budget || 0}`}
          tags={c.category ? [c.category] : []}
          category={c.category}
          followersMin={c.followersMin}
          followersMax={c.followersMax}
          location={c.location}
          requirements={c.requirements}
          imageUrl={
            c.imageUrl ||
            "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&q=80&auto=format&fit=crop"
          }
          applied={appliedIds.has(String(c._id))}
          isPublic={c.isPublic}
          adminComment={c.adminComment}
          influencerComment={c.influencerComment}
          onApplied={(id) => setAppliedIds((s) => new Set([...s, String(id)]))}
        />
      ))}
    </div>
  );
}
