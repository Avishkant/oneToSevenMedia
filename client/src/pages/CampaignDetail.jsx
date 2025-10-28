import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/Button";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!res.ok) throw new Error("Failed to load campaign");
        const body = await res.json();
        if (mounted) setCampaign(body);
      } catch {
        // navigate back on error
        navigate(-1);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id, navigate]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!campaign) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass p-6 rounded">
          <div className="flex items-start gap-6">
            <img
              src={campaign.imageUrl}
              alt="campaign"
              className="w-40 h-40 object-cover rounded"
            />
            <div>
              <h1 className="text-2xl font-bold">{campaign.brandName}</h1>
              <div className="text-sm text-slate-400 mt-2">
                {campaign.title} • {campaign.category}
              </div>
              <p className="mt-4 text-slate-200">{campaign.brief}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="primary">Apply</Button>
            <Button variant="ghost">Chat</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
