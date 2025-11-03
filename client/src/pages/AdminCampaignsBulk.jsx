import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import Button from "../components/Button";
import AdminBackButton from "../components/AdminBackButton";

export default function AdminCampaignsBulk() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const auth = useAuth();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast?.add("Please select a CSV file", { type: "error" });
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admins/campaigns/bulk-create`, {
        method: "POST",
        headers: {
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body.error || `Request failed (${res.status})`);
      setResult(body);
      toast?.add("Bulk create completed", { type: "success" });
    } catch (err) {
      toast?.add(err.message || "Bulk create failed", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <AdminBackButton />
        <h1 className="text-2xl font-bold mb-4">Bulk Create Campaigns (CSV)</h1>
        <p className="text-sm text-slate-300 mb-4">
          Upload a CSV with headers:
          title,brandName,category,followersMin,followersMax,location,requirements,budget,deliverables,timeline,isPublic
        </p>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded">
          <input
            type="file"
            accept="text/csv"
            onChange={(e) => setFile(e.target.files && e.target.files[0])}
          />
          <div className="mt-4 flex gap-3">
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? "Uploading…" : "Upload CSV"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
            >
              Reset
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-6 bg-gray-800 p-4 rounded">
            <h2 className="font-semibold">Result</h2>
            <pre className="text-sm mt-2 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
