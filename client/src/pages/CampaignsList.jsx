import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CampaignCard from "../components/CampaignCard";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";

export default function CampaignsList() {
  const [items, setItems] = useState([]);
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

        <div className="glass p-4 rounded">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="Category"
              className="px-3 py-2 rounded bg-white/3"
            />
            <input
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
              placeholder="Brand"
              className="px-3 py-2 rounded bg-white/3"
            />
            <input
              value={minFollowers}
              onChange={(e) => {
                setMinFollowers(e.target.value);
                setPage(1);
              }}
              placeholder="Min followers"
              className="px-3 py-2 rounded bg-white/3"
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
                        <Link
                          to={`/admin/campaigns/${c._id}`}
                          className="text-slate-300 hover:underline text-sm"
                        >
                          View
                        </Link>
                      </>
                    }
                  />
                </motion.li>
              );
            })}
          </motion.ul>

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
