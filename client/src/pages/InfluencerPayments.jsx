import { useEffect, useState } from "react";
import Button from "../components/Button";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";

// Clean, minimal InfluencerPayments page with button-driven forms.
export default function InfluencerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);
  // modal holds { id, type } when a popup form is open, otherwise null
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const auth = useAuth();

  const fetchWithAuth = async (url, opts = {}) => {
    const token = auth?.token || localStorage.getItem("accessToken");
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...opts, headers });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/payments/me");
        if (res.ok) setPayments(await res.json());
        const meRes = await fetchWithAuth("/api/users/me");
        if (meRes.ok) setMe(await meRes.json());
      } catch (err) {
        console.error(err);
        toast?.add("Failed to load payments", { type: "error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (id, type) => setModal({ id, type });
  const closeForm = () => setModal(null);

  const submitOrderProof = async (id, payload) => {
    try {
      const res = await fetchWithAuth(
        `/api/payments/${id}/submit-order-proof`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast?.add("Order proof submitted", { type: "success" });
      const updated = await (await fetchWithAuth("/api/payments/me")).json();
      setPayments(updated);
    } catch (err) {
      toast?.add(err.message || "Submit failed", { type: "error" });
    }
  };

  const submitDeliverables = async (id, payload) => {
    try {
      const res = await fetchWithAuth(
        `/api/payments/${id}/submit-deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast?.add("Deliverables submitted", { type: "success" });
      const updated = await (await fetchWithAuth("/api/payments/me")).json();
      setPayments(updated);
    } catch (err) {
      toast?.add(err.message || "Submit failed", { type: "error" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">My Payments</h2>
        <Button
          onClick={() =>
            (async () => {
              setLoading(true);
              await fetchWithAuth("/api/payments/me")
                .then((r) => r.ok && r.json().then((d) => setPayments(d)))
                .finally(() => setLoading(false));
            })()
          }
          variant="secondary"
        >
          Refresh
        </Button>
      </div>

      <div className="bg-gray-800 rounded p-4">
        {me &&
          (!me.bankAccountNumber || !me.bankAccountName || !me.bankName) && (
            <div className="mb-4 text-yellow-300">
              Please add your bank details in your profile to receive payouts.
            </div>
          )}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-gray-400">
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(payments || []).map((p) => (
                  <tr
                    key={p._id}
                    className="align-top border-t border-gray-700 py-2"
                  >
                    <td className="py-3">
                      {p.campaign?.title || p.campaignTitle || "-"}
                    </td>
                    <td className="py-3">
                      {p.amount || (p.payout && p.payout.amount) || "-"}
                    </td>
                    <td className="py-3">{p.status || p.state || "-"}</td>
                    <td className="py-3">
                      {p.payoutRelease === "refund_on_delivery" ? (
                        <div className="space-y-2">
                          {!p.orderProofs || !p.orderProofs.submittedAt ? (
                            <div>
                              <Button
                                size="sm"
                                onClick={() => openForm(p._id, "order")}
                              >
                                Fill Order Proof
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-300">
                              Order proof submitted at:{" "}
                              {new Date(
                                p.orderProofs.submittedAt
                              ).toLocaleString()}
                            </div>
                          )}

                          {p.orderProofs && p.orderProofs.submittedAt && (
                            <div>
                              {!p.deliverablesProof ||
                              !p.deliverablesProof.submittedAt ? (
                                <div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      openForm(p._id, "deliverables")
                                    }
                                  >
                                    Fill Deliverables Proof
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-300">
                                  Deliverables submitted at:{" "}
                                  {new Date(
                                    p.deliverablesProof.submittedAt
                                  ).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-300">
                          {p.payoutRelease || "-"}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-6">
                      No payments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Modal popup for Order / Deliverables forms */}
            {modal && (
              <Modal onClose={closeForm}>
                {modal.type === "order" ? (
                  <OrderProofInline
                    payment={payments.find((x) => x._id === modal.id)}
                    onSubmit={(payload) => {
                      submitOrderProof(modal.id, payload);
                      closeForm();
                    }}
                    onCancel={closeForm}
                  />
                ) : (
                  <DeliverablesInline
                    payment={payments.find((x) => x._id === modal.id)}
                    onSubmit={(payload) => {
                      submitDeliverables(modal.id, payload);
                      closeForm();
                    }}
                    onCancel={closeForm}
                  />
                )}
              </Modal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 rounded p-4 max-w-lg w-full z-10 shadow-lg">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function OrderProofInline({ payment, onSubmit, onCancel }) {
  const [orderScreenshot, setOrderScreenshot] = useState(
    payment?.orderProofs?.orderScreenshot || ""
  );
  const [deliveredScreenshot, setDeliveredScreenshot] = useState(
    payment?.orderProofs?.deliveredScreenshot || ""
  );
  const [orderAmount, setOrderAmount] = useState(
    payment?.orderProofs?.orderAmount || ""
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!orderScreenshot || String(orderScreenshot).trim() === "")
      e.orderScreenshot = "Order screenshot is required";
    if (!deliveredScreenshot || String(deliveredScreenshot).trim() === "")
      e.deliveredScreenshot = "Delivered screenshot is required";
    if (
      orderAmount === "" ||
      orderAmount === null ||
      Number.isNaN(Number(orderAmount)) ||
      Number(orderAmount) <= 0
    )
      e.orderAmount = "Order amount must be a positive number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      orderScreenshot: String(orderScreenshot).trim(),
      deliveredScreenshot: String(deliveredScreenshot).trim(),
      orderAmount: Number(orderAmount),
    });
  };

  return (
    <div className="p-2 bg-gray-900 rounded">
      <div className="text-xs text-gray-300">
        Order proof (order & delivered)
      </div>
      <input
        required
        value={orderScreenshot}
        onChange={(e) => setOrderScreenshot(e.target.value)}
        placeholder="Order screenshot URL"
        className="px-2 py-1 rounded bg-gray-800 mt-1 w-full"
      />
      {errors.orderScreenshot && (
        <div className="text-red-400 text-xs mt-1">
          {errors.orderScreenshot}
        </div>
      )}

      <input
        required
        value={deliveredScreenshot}
        onChange={(e) => setDeliveredScreenshot(e.target.value)}
        placeholder="Delivered screenshot URL"
        className="px-2 py-1 rounded bg-gray-800 mt-2 w-full"
      />
      {errors.deliveredScreenshot && (
        <div className="text-red-400 text-xs mt-1">
          {errors.deliveredScreenshot}
        </div>
      )}

      <input
        required
        value={orderAmount}
        onChange={(e) => setOrderAmount(e.target.value)}
        placeholder="Order amount"
        type="number"
        className="px-2 py-1 rounded bg-gray-800 mt-2 w-full"
      />
      {errors.orderAmount && (
        <div className="text-red-400 text-xs mt-1">{errors.orderAmount}</div>
      )}

      <div className="mt-3 text-right flex gap-2 justify-end">
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Close
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Submit Proof
        </Button>
      </div>
    </div>
  );
}

function DeliverablesInline({ payment, onSubmit, onCancel }) {
  const [proof, setProof] = useState(payment?.deliverablesProof?.proof || "");
  return (
    <div className="p-2 bg-gray-900 rounded">
      <div className="text-xs text-gray-300">
        Deliverables proof (after delivery)
      </div>
      <input
        value={proof}
        onChange={(e) => setProof(e.target.value)}
        placeholder="Deliverables proof URL or notes"
        className="px-2 py-1 rounded bg-gray-800 mt-1 w-full"
      />
      <div className="mt-2 text-right flex gap-2 justify-end">
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Close
        </Button>
        <Button size="sm" onClick={() => onSubmit({ proof })}>
          Submit Deliverables
        </Button>
      </div>
    </div>
  );
}
