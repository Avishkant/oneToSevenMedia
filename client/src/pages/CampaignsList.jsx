import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CampaignCard from "../components/CampaignCard";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function CampaignsList() {
  const [items, setItems] = useState([]);
  const [deleteState, setDeleteState] = useState({
    open: false,
    id: null,
    brand: "",
  });
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (category) qs.set("category", category);
        if (brand) qs.set("brand", brand);
        if (minFollowers) qs.set("minFollowers", minFollowers);
        const url = `/api/campaigns${qs.toString() ? `?${qs.toString()}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load campaigns");
        const body = await res.json();
        if (mounted) setItems(body);
      } catch (err) {
        toast?.add(err.message || "Failed to load campaigns", {
          type: "error",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [auth, toast, category, brand, minFollowers]);

  const filtered = items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <Link
            to="/admin/dashboard"
            className="text-indigo-300 hover:underline"
          >
            Back
          </Link>
        </div>

        <div className="glass p-4 rounded text-slate-200">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="Category"
              className="px-3 py-2 rounded bg-white/3 text-slate-900 placeholder:text-slate-500"
            />
            <input
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
              placeholder="Brand"
              className="px-3 py-2 rounded bg-white/3 text-slate-900 placeholder:text-slate-500"
            />
            <input
              value={minFollowers}
              onChange={(e) => {
                setMinFollowers(e.target.value);
                setPage(1);
              }}
              placeholder="Min followers"
              className="px-3 py-2 rounded bg-white/3 text-slate-900 placeholder:text-slate-500"
            />
            <div className="flex items-center">
              <button
                onClick={() => {
                  setCategory("");
                  setBrand("");
                  setMinFollowers("");
                  setPage(1);
                }}
                className="btn-primary"
              >
                Reset
              </button>
            </div>
          </div>

          {loading && <div className="text-sm">Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-sm text-slate-300">No campaigns found.</div>
          )}
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {paginated.map((c) => {
              const brandMatch = brand
                ? c.brandName.toLowerCase().includes(brand.toLowerCase())
                : false;
              return (
                <motion.li
                  key={c._id}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <CampaignCard
                    title={c.title}
                    brand={c.brandName}
                    budget={c.budget}
                    tags={c.category ? [c.category] : []}
                    category={c.category}
                    followersMin={c.followersMin}
                    followersMax={c.followersMax}
                    location={c.location}
                    requirements={c.requirements}
                    imageUrl={c.imageUrl}
                    highlight={brandMatch}
                    actions={
                      <>
                        <Link
                          to={`/admin/campaigns/${c._id}/edit`}
                          className="text-indigo-300 hover:underline text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() =>
                            setDeleteState({
                              open: true,
                              id: c._id,
                              brand: c.brandName,
                            })
                          }
                          className="text-rose-300 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </>
                    }
                  />
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Delete confirmation modal */}
          {deleteState.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() =>
                  setDeleteState({ open: false, id: null, brand: "" })
                }
              />
              <div className="relative bg-slate-900 text-slate-100 rounded p-6 max-w-md w-full mx-4">
                <div className="text-lg font-semibold">Delete campaign</div>
                <div className="mt-3 text-sm text-slate-300">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{deleteState.brand}</span>?
                  This will also remove all related applications and cannot be
                  undone.
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    onClick={() =>
                      setDeleteState({ open: false, id: null, brand: "" })
                    }
                    className="btn-primary bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const token =
                          auth?.token || localStorage.getItem("accessToken");
                        const res = await fetch(
                          `/api/campaigns/${deleteState.id}`,
                          {
                            method: "DELETE",
                            headers: token
                              ? { Authorization: `Bearer ${token}` }
                              : undefined,
                          }
                        );
                        if (!res.ok) throw new Error("Delete failed");
                        // remove from local list
                        setItems((s) =>
                          s.filter((i) => i._id !== deleteState.id)
                        );
                        toast?.add("Campaign deleted", { type: "success" });
                        setDeleteState({ open: false, id: null, brand: "" });
                      } catch (err) {
                        toast?.add(err.message || "Delete failed", {
                          type: "error",
                        });
                      }
                    }}
                    className="btn-primary bg-rose-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-300">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-primary"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-primary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
