import Hero from "../components/Hero";
import FeatureCard from "../components/FeatureCard";
import CampaignCard from "../components/CampaignCard";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

export default function Home() {
  const auth = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;
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
        if (!res.ok) return;
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
        if (mounted)
          setCampaigns((body || []).filter((c) => c.isPublic !== false));
      } catch {
        // ignore for now
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  const totalPages = Math.max(1, Math.ceil(campaigns.length / pageSize));
  const paginated = campaigns.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="max-w-6xl mx-auto px-6 lg:px-8">
      <Hero />

      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          title="Discover Influencers"
          description="Filter creators by niche, audience size, and engagement to find perfect fits for your campaign."
          icon="/"
        />
        <FeatureCard
          title="Manage Campaigns"
          description="Create, collaborate and review applications with a beautiful, simple workflow."
          icon="/"
        />
        <FeatureCard
          title="Secure Payments"
          description="Track payouts and approvals with clear audit trails and manual or automated payouts."
          icon="/"
        />
      </section>

      <section className="mt-16" id="campaigns">
        <h2 className="text-3xl font-extrabold mb-6">Featured Campaigns</h2>
        {loading && <div className="text-sm">Loading campaigns...</div>}
        {!loading && paginated.length === 0 && (
          <div className="text-sm text-slate-300">No campaigns available.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((c) => (
            <CampaignCard
              key={c._id}
              id={c._id}
              title={c.title}
              brand={c.brandName}
              budget={`$${c.budget || 0}`}
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
              onApplied={(id) =>
                setAppliedIds((s) => new Set([...s, String(id)]))
              }
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-300">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              variant="primary"
            >
              Prev
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              variant="primary"
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
