import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const [isApplied, setIsApplied] = useState(false);

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

  // check whether current influencer already applied
  useEffect(() => {
    let mounted = true;
    async function checkApplied() {
      if (!auth?.token || !auth?.user || auth.user.role !== "influencer")
        return;
      try {
        const uid = auth.user.id || auth.user._id || auth.user.sub;
        const res = await fetch(`/api/applications/by-influencer/${uid}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) return;
        const apps = await res.json();
        if (!mounted) return;
        const found = (apps || []).some(
          (a) =>
            String(a.campaign?._id || a.campaign) === String(id) &&
            a.status !== "rejected"
        );
        setIsApplied(Boolean(found));
      } catch (e) {
        console.debug("checkApplied failed", e?.message || e);
      }
    }
    checkApplied();
    return () => (mounted = false);
  }, [auth, id]);

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
            <Button
              variant={isApplied ? "ghost" : "primary"}
              disabled={isApplied}
              onClick={() => {
                if (!auth?.token) return navigate("/influencer/login");
                if (isApplied) {
                  toast?.add("You have already applied to this campaign", {
                    type: "info",
                  });
                  return;
                }
                // navigate to apply flow or open modal (kept simple here)
                navigate(`/campaigns/${id}/apply`);
              }}
            >
              {isApplied ? "Applied" : "Apply"}
            </Button>
            <Button variant="ghost">Chat</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
