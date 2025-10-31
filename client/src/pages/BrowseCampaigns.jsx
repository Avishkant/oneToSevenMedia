import { useEffect, useState } from "react";
import CampaignCard from "../components/CampaignCard";

export default function BrowseCampaigns() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

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
        // ignore for now
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  const filtered = items.filter((c) =>
    q ? c.title?.toLowerCase().includes(q.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Browse Campaigns</h1>
          <input
            className="px-3 py-2 rounded bg-white/5 text-slate-100"
            placeholder="Search campaigns"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading && <div>Loading campaigns...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-sm text-slate-400">No campaigns found.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map((c) => (
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
              isPublic={c.isPublic}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
