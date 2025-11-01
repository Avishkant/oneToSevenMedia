import { useEffect, useState } from "react";
import Button from "../components/Button";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const auth = useAuth();

  const fetchWithAuth = async (url, opts = {}) => {
    const token = auth?.token || localStorage.getItem("accessToken");
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...opts, headers });
    return res;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/payments");
      if (!res.ok) throw new Error("Failed to load payments");
      const body = await res.json();
      setPayments(body || []);
    } catch (err) {
      toast?.add(err.message || "Failed to load payments", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markPaid = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error("Failed to update payment");
      toast?.add("Marked paid", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Failed to update payment", { type: "error" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Payments Dashboard</h2>
        <Button onClick={load} variant="secondary">
          Refresh
        </Button>
      </div>

      <div className="bg-gray-800 rounded p-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Campaign</th>
                  <th>Influencer</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Payout Release</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t border-gray-700">
                    <td className="py-2">
                      {p.campaign?.brandName || p.campaign?.title || "-"}
                    </td>
                    <td>{p.influencer?.name || p.influencer?.email || "-"}</td>
                    <td>{p.amount || 0}</td>
                    <td>{p.paymentType || "full"}</td>
                    <td className="text-sm text-slate-300">
                      {p.payoutRelease || p.campaign?.payoutRelease || "-"}
                    </td>
                    <td>{p.status}</td>
                    <td className="text-right">
                      {p.status !== "paid" && (
                        <Button
                          onClick={() => markPaid(p._id)}
                          variant="success"
                          size="sm"
                        >
                          Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-6">
                      No payments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
