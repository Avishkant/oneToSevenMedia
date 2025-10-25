import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="mt-12 grid md:grid-cols-2 gap-8 items-center" id="hero">
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          Influencer marketing that scales — beautiful, measurable, trusted.
        </h1>
        <p className="mt-4 text-slate-300 max-w-xl">
          Connect brands with creators, run campaigns, review applications and
          pay creators — all in one elegant dashboard built for speed and
          clarity.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <a href="#" className="btn-primary">
            Create Campaign
          </a>
          <a href="#" className="text-sm text-slate-300 hover:underline">
            Explore campaigns
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full"
      >
        <div className="rounded-xl overflow-hidden card-shadow glass">
          <img
            src="https://images.unsplash.com/photo-1520975688539-8d90f6a0e3d1?w=1200&q=80&auto=format&fit=crop"
            className="w-full h-64 object-cover"
            alt="hero"
          />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Featured: Spring Streetwear</h3>
                <p className="text-xs text-slate-300">
                  by UrbanThreads • $5,000 budget
                </p>
              </div>
              <div className="text-xs tag">Open</div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Short preview of a campaign card to demonstrate UI and imagery.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
