import { motion } from "framer-motion";
import { FiStar } from "react-icons/fi";

export default function FeatureCard({ title, description }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="glass p-6 rounded-xl card-shadow"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/90 flex items-center justify-center text-white">
          <FiStar />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-slate-300 mt-1">{description}</p>
        </div>
      </div>
    </motion.article>
  );
}
