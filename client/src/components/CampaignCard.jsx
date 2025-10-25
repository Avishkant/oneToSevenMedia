import { motion } from "framer-motion";

export default function CampaignCard({
  title,
  brand,
  budget,
  tags = [],
  imageUrl,
  highlight = false,
  actions = null,
}) {
  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`glass rounded-xl overflow-hidden card-shadow border-2 ${
        highlight
          ? "border-yellow-400/60 shadow-yellow-500/20"
          : "border-transparent"
      }`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center text-sm text-slate-300">
          {brand}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-slate-300">
              <span className="font-medium text-indigo-200">{brand}</span>
              {budget ? ` • ${budget}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>
    </motion.article>
  );
}
