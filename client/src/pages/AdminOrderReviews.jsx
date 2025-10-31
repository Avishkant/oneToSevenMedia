import { useEffect, useState } from "react";
import useToast from "../context/useToast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

export default function AdminOrderReviews() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState("");
  const auth = useAuth();
  const toast = useToast();

  const fetchWithRefresh = async (url, opts = {}) => {
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
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const qs = campaignFilter ? `?campaignId=${campaignFilter}` : "";
      const res = await fetchWithRefresh(`/api/applications/orders${qs}`, {
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
    // fetch campaigns for filter dropdown
    (async () => {
      try {
        const res = await fetch(`/api/campaigns`);
        if (res.ok) {
          const body = await res.json();
          setCampaigns(body || []);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // reload when campaign filter changes
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignFilter]);

  const act = async (id, verb, extra = {}) => {
    try {
      const token = auth?.token || localStorage.getItem("accessToken");
      const res = await fetchWithRefresh(
        `/api/applications/${id}/order/${verb}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(extra),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action failed");
      }
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
          <h1 className="text-2xl font-bold">Order Reviews</h1>
        </div>

        <div className="glass p-4 rounded text-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="bg-slate-800 text-slate-200 px-3 py-2 rounded"
            >
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.brandName} — {c.title}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept="text/csv"
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const fd = new FormData();
                fd.append("file", f);
                try {
                  const token =
                    auth?.token || localStorage.getItem("accessToken");
                  const res = await fetchWithRefresh(
                    `/api/applications/bulk-review`,
                    {
                      method: "POST",
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                      body: fd,
                    }
                  );
                  if (!res.ok) throw new Error("Import failed");
                  const body = await res.json();
                  toast?.add(`Imported - updated: ${body.updated}`, {
                    type: "success",
                  });
                  await load();
                } catch (err) {
                  toast?.add(err.message || "Import failed", { type: "error" });
                }
              }}
            />
            <Button
              onClick={async () => {
                try {
                  const qs = campaignFilter ? `?campaignId=${campaignFilter}` : "";
                  const res = await fetchWithRefresh(`/api/applications/orders${qs}`);
                  if (!res.ok) throw new Error("Failed to fetch orders for export");
                  const rowsData = await res.json();
                  if (!rowsData || rowsData.length === 0)
                    return toast?.add("No orders to export", { type: "error" });

                  const headers = [
                    "applicationId",
                    "campaignId",
                    "campaignTitle",
                    "brandName",
                    "influencerId",
                    "influencerName",
                    "influencerEmail",
                    "status",
                  ];
                  const campaignObj = campaigns.find((c) => c._id === campaignFilter);
                  const dynamic = (campaignObj && campaignObj.orderFormFields) || [];
                  const allHeaders = headers.concat(dynamic);

                  const getNested = (obj, path) => {
                    if (!obj || !path) return "";
                    const parts = path.split(".");
                    let cur = obj;
                    for (let i = 0; i < parts.length; i++) {
                      const p = parts[i];
                      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
                      else return "";
                    }
                    return cur === null || typeof cur === "undefined" ? "" : cur;
                  };

                  const esc = (v) => {
                    if (v === null || typeof v === "undefined") return "";
                    const s = String(v);
                    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
                      return `"${s.replace(/"/g, '""')}"`;
                    }
                    return s;
                  };

                  const rows = rowsData.map((o) => {
                    const base = [
                      o._id,
                      o.campaign?._id || "",
                      o.campaign?.title || "",
                      o.campaign?.brandName || "",
                      o.influencer?._id || "",
                      o.influencer?.name || "",
                      o.influencer?.email || "",
                      o.status || "",
                    ];
                    const dyn = dynamic.map((k) => {
                      if (k.startsWith("shippingAddress.")) {
                        const key = k.split(".")[1];
                        return o.shippingAddress ? o.shippingAddress[key] : "";
                      }
                      return (o.orderData && getNested(o.orderData, k)) || getNested(o, k) || "";
                    });
                    return base.concat(dyn);
                  });

                  // prepend UTF-8 BOM for Excel compatibility and use CRLF line endings
                  const bom = "\uFEFF";
                  const csvLines = [allHeaders.join(",")].concat(
                    rows.map((r) => r.map(esc).join(","))
                  );
                  const csv = bom + csvLines.join("\r\n");

                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `orders-${campaignFilter || "all"}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  toast?.add(err.message || "Export failed", { type: "error" });
                }
              }}
              variant="gradient"
              size="sm"
            >
              Export
            </Button>
          </div>
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
                        {o.campaign?.fulfillmentMethod === "brand" ? (
                          <>
                            Shipping Address: {o.shippingAddress?.line1 || "-"},{" "}
                            {o.shippingAddress?.city || ""}{" "}
                            {o.shippingAddress?.postalCode || ""}
                          </>
                        ) : (
                          <>
                            Order ID: {o.orderId} • Amount:{" "}
                            {o.payout?.amount ?? 0}
                          </>
                        )}
                      </div>
                      {o.rejectionReason && (
                        <div className="text-sm text-rose-400 mt-1">
                          Previously rejected: {o.rejectionReason}
                        </div>
                      )}
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
                  {/* render dynamic order fields or shipping address */}
                  {selected.app.campaign?.orderFormFields &&
                    selected.app.campaign.orderFormFields.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-semibold">
                          Order details
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                          {selected.app.campaign.orderFormFields.map((k) => (
                            <div key={k} className="mb-1">
                              <span className="font-medium mr-2">{k}:</span>
                              <span>
                                {k.startsWith("shippingAddress.")
                                  ? selected.app.shippingAddress &&
                                    selected.app.shippingAddress[
                                      k.split(".")[1]
                                    ]
                                  : (selected.app.orderData &&
                                      selected.app.orderData[k]) ||
                                    "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  <div className="mt-3">
                    <div className="text-sm text-slate-400">
                      Comment to influencer (optional)
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
                      onClick={() =>
                        act(selected.app._id, "approve", {
                          comment: selected.comment,
                        })
                      }
                      variant="success"
                      size="sm"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        const reason =
                          window.prompt(
                            "Reason for rejection (visible to influencer):"
                          ) || "";
                        if (reason.trim() === "") return;
                        act(selected.app._id, "reject", {
                          reason,
                          comment: selected.comment,
                        });
                      }}
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
