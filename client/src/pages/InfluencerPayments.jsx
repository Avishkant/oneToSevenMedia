import { useEffect, useState } from "react";
import Button from "../components/Button";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function InfluencerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);
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
      const res = await fetchWithAuth("/api/payments/me");
      if (!res.ok) throw new Error("Failed to load payments");
      const body = await res.json();
      setPayments(body || []);
    } catch (err) {
      toast?.add(err.message || "Failed to load payments", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadMe = async () => {
    try {
      const res = await fetchWithAuth("/api/users/me");
      if (!res.ok) return;
      const body = await res.json();
      setMe(body);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">My Payments</h2>
        <Button onClick={load} variant="secondary">
          Refresh
        </Button>
      </div>

      <div className="bg-gray-800 rounded p-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {me &&
              (!me.bankAccountNumber ||
                !me.bankAccountName ||
                !me.bankName) && (
                <div className="mb-4 p-3 bg-rose-900/30 rounded text-rose-300">
                  Your payment details are incomplete. Please add bank details
                  in your profile so we can process payouts.{" "}
                  <a
                    href="/influencer/profile"
                    className="underline text-white"
                  >
                    Edit profile
                  </a>
                </div>
              )}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2">Campaign</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} className="border-t border-gray-700">
                      <td className="py-2">
                        {p.campaign?.brandName || p.campaign?.title || "-"}
                      </td>
                      <td>{p.amount || 0}</td>
                      <td>{p.paymentType || "full"}</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-gray-400 py-6"
                      >
                        No payments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
