import { useEffect, useState } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const auth = useAuth();
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      async function fetchWithRefresh(url, opts = {}) {
        let res = await fetch(url, opts);
        if (res.status === 401 && auth && auth.refresh) {
          const refreshed = await auth.refresh();
          if (refreshed && refreshed.ok) {
            const newToken = auth?.token || localStorage.getItem("accessToken");
            opts.headers = {
              ...(opts.headers || {}),
              ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
            };
            res = await fetch(url, opts);
          }
        }
        return res;
      }

      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetchWithRefresh(`/api/applications/orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load orders");
      const body = await res.json();
      setOrders(body || []);
    } catch (err) {
      toast?.add(err.message || "Failed to load", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id, verb) => {
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetch(`/api/applications/${id}/order/${verb}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ comment: selected?.comment }),
      });
      if (!res.ok) throw new Error("Action failed");
      await res.json();
      toast?.add(`${verb}ed`, { type: "success" });
      await load();
      setSelected(null);
    } catch (err) {
      toast?.add(err.message || "Action failed", { type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Submitted Orders</h1>
        </div>

        <div className="glass p-4 rounded text-slate-200">
          {loading && <div className="text-sm">Loading...</div>}
          {!loading && orders.length === 0 && (
            <div className="text-sm text-slate-300">No submitted orders.</div>
          )}

          {!loading && orders.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {orders.map((o) => (
                <div key={o._id} className="p-3 bg-white/3 rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{o.influencer?.name}</div>
                      <div className="text-sm text-slate-400">
                        {o.influencer?.email}
                      </div>
                      <div className="text-sm text-slate-300">
                        Campaign: {o.campaign?.brandName} — {o.campaign?.title}
                      </div>
                      <div className="text-sm text-slate-300">
                        Order ID: {o.orderId} • Amount: {o.payout?.amount ?? 0}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          setSelected({ app: o, comment: "" });
                        }}
                        variant="primary"
                        size="sm"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSelected(null)}
              />
              <div className="relative bg-slate-900 text-slate-100 rounded p-6 max-w-lg w-full mx-4">
                <div className="text-lg font-semibold">Review order</div>
                <div className="mt-3">
                  <div className="text-sm text-slate-300">
                    Influencer: {selected.app.influencer?.name} (
                    {selected.app.influencer?.email})
                  </div>
                  <div className="text-sm text-slate-300">
                    Campaign: {selected.app.campaign?.brandName} —{" "}
                    {selected.app.campaign?.title}
                  </div>
                  <div className="text-sm text-slate-300">
                    Order ID: {selected.app.orderId}
                  </div>
                  <div className="text-sm text-slate-300">
                    Amount: {selected.app.payout?.amount ?? 0}
                  </div>
                  {selected.app.campaignScreenshot && (
                    <div className="mt-2">
                      <div className="text-sm font-semibold">Screenshot</div>
                      <img
                        src={selected.app.campaignScreenshot}
                        alt="order-ss"
                        className="w-full max-h-60 object-contain mt-2 rounded"
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="text-sm text-slate-400">
                      Optional note to influencer
                    </div>
                    <textarea
                      value={selected.comment}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, comment: e.target.value }))
                      }
                      className="w-full mt-2 p-2 rounded bg-white/3 h-24"
                    />
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button
                      onClick={() => act(selected.app._id, "approve")}
                      variant="success"
                      size="sm"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => act(selected.app._id, "reject")}
                      variant="danger"
                      size="sm"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => setSelected(null)}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
