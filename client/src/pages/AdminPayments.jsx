import { useEffect, useState } from "react";
import Button from "../components/Button";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
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

  const approvePartial = async (id) => {
    const raw = window.prompt("Enter partial amount to approve (numeric)");
    if (raw === null) return;
    const amount = Number(raw);
    if (Number.isNaN(amount))
      return toast?.add("Invalid amount", { type: "error" });
    const payNow = window.confirm("Mark this partial payout as paid now?");
    try {
      const res = await fetchWithAuth(`/api/payments/${id}/approve-partial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, payNow }),
      });
      if (!res.ok) throw new Error("Approve partial failed");
      toast?.add("Partial approved", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  const approveRemaining = async (id) => {
    if (!window.confirm("Verify deliverables and release remaining payout?"))
      return;
    try {
      const res = await fetchWithAuth(`/api/payments/${id}/approve-remaining`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Approve remaining failed");
      }
      toast?.add("Remaining payout released", { type: "success" });
      await load();
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
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
                      {p.payoutRelease === "refund_on_delivery" ? (
                        <div className="flex gap-2 justify-end">
                          {/* show order proofs if available */}
                          {p.orderProofs && p.orderProofs.submittedAt && (
                            <div className="text-xs text-slate-300 mr-2">
                              Order proof:{" "}
                              {new Date(
                                p.orderProofs.submittedAt
                              ).toLocaleString()}
                            </div>
                          )}
                          {!p.partialApproval || !p.partialApproval.amount ? (
                            <Button
                              onClick={() => approvePartial(p._id)}
                              size="sm"
                            >
                              Approve Partial
                            </Button>
                          ) : (
                            <div className="text-xs text-slate-200 mr-2">
                              Partial: {p.partialApproval.amount}{" "}
                              {p.partialApproval.paid ? "(paid)" : "(approved)"}
                            </div>
                          )}
                          {p.deliverablesProof &&
                          p.deliverablesProof.submittedAt ? (
                            <Button
                              onClick={() => approveRemaining(p._id)}
                              size="sm"
                              variant="success"
                            >
                              Release Remaining
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        p.status !== "paid" && (
                          <Button
                            onClick={() => markPaid(p._id)}
                            variant="success"
                            size="sm"
                          >
                            Mark Paid
                          </Button>
                        )
                      )}
                      <div className="inline-block ml-2">
                        <Button
                          onClick={() => setSelectedPayment(p)}
                          size="sm"
                          variant="ghost"
                        >
                          Details
                        </Button>
                      </div>
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

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedPayment(null)}
          />
          <div className="relative bg-gray-800 text-white rounded-xl p-6 max-w-3xl w-full mx-auto shadow-2xl border border-purple-500/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-700 pb-3 mb-4">
              <div>
                <div className="text-2xl font-extrabold text-cyan-400">
                  Payment Details
                </div>
                <div className="text-sm text-gray-400">
                  Campaign:{" "}
                  {selectedPayment.campaign?.brandName ||
                    selectedPayment.campaign?.title ||
                    "-"}
                </div>
              </div>
              <Button onClick={() => setSelectedPayment(null)} variant="ghost">
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                <div className="font-semibold text-white">Influencer</div>
                <div className="text-gray-400">
                  {selectedPayment.influencer?.name ||
                    selectedPayment.influencer?.email ||
                    "-"}
                </div>
              </div>

              <div className="text-sm text-gray-300">
                <div className="font-semibold text-white">Amount</div>
                <div className="text-white">{selectedPayment.amount || 0}</div>
              </div>

              <div className="text-sm text-gray-300">
                <div className="font-semibold text-white">Status</div>
                <div className="text-white">{selectedPayment.status}</div>
              </div>

              <div className="text-sm text-gray-300">
                <div className="font-semibold text-white">Comment History</div>
                <div className="text-xs text-gray-300 bg-gray-900 p-3 rounded max-h-48 overflow-auto">
                  {selectedPayment.adminComments &&
                    selectedPayment.adminComments.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-yellow-300 font-semibold mb-1">
                          Admin comments
                        </div>
                        {selectedPayment.adminComments.map((c, i) => (
                          <div
                            key={`pac-${i}`}
                            className="py-1 border-b border-gray-800"
                          >
                            <div className="text-xs text-gray-400">
                              {c.stage} —{" "}
                              {c.createdAt
                                ? new Date(c.createdAt).toLocaleString()
                                : ""}{" "}
                              {c.by ? `(by ${String(c.by)})` : ""}
                            </div>
                            <div className="text-sm text-white">
                              {c.comment}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {selectedPayment.influencerComments &&
                    selectedPayment.influencerComments.length > 0 && (
                      <div>
                        <div className="text-xs text-cyan-300 font-semibold mb-1">
                          Influencer comments
                        </div>
                        {selectedPayment.influencerComments.map((c, i) => (
                          <div
                            key={`pic-${i}`}
                            className="py-1 border-b border-gray-800"
                          >
                            <div className="text-xs text-gray-400">
                              {c.stage} —{" "}
                              {c.createdAt
                                ? new Date(c.createdAt).toLocaleString()
                                : ""}{" "}
                              {c.by ? `(by ${String(c.by)})` : ""}
                            </div>
                            <div className="text-sm text-white italic">
                              {c.comment}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {!selectedPayment.adminComments &&
                    !selectedPayment.influencerComments && (
                      <div className="text-sm text-gray-500">
                        No comments recorded.
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
