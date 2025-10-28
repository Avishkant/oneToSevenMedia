import { motion as Motion } from "framer-motion";
import Button from "./Button";

export default function Hero() {
  return (
    <section className="mt-12 grid md:grid-cols-2 gap-8 items-center" id="hero">
      <Motion.div
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold">
          New — launch your first campaign
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
          Influencer marketing that scales — beautiful, measurable, trusted.
        </h1>
        <p className="mt-4 text-slate-300 max-w-xl text-lg">
          Connect brands with creators, run campaigns, review applications and
          pay creators — all in one elegant dashboard built for speed and
          clarity.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Button as="a" href="#" variant="gradient">
            Get started
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Button>
          <a href="#" className="text-sm text-slate-300 hover:underline">
            Explore campaigns
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
          <div className="p-4 rounded-lg glass">
            <div className="text-sm text-slate-400">Active campaigns</div>
            <div className="text-2xl font-bold">24</div>
          </div>
          <div className="p-4 rounded-lg glass">
            <div className="text-sm text-slate-400">Avg payout</div>
            <div className="text-2xl font-bold">$520</div>
          </div>
        </div>
      </Motion.div>

      <Motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full flex justify-center"
      >
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl overflow-hidden card-shadow">
            <img
              src="https://images.unsplash.com/photo-1520975688539-8d90f6a0e3d1?w=1200&q=80&auto=format&fit=crop"
              className="w-full h-80 object-cover"
              alt="hero"
            />
            <div className="p-5 bg-gradient-to-t from-black/50 to-transparent text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    Featured: Spring Streetwear
                  </h3>
                  <p className="text-xs text-slate-200">
                    by UrbanThreads • $5,000 budget
                  </p>
                </div>
                <div className="text-xs tag">Open</div>
              </div>
              <p className="mt-3 text-sm text-slate-200">
                Short preview of a campaign to showcase imagery and style.
              </p>
            </div>
          </div>

          <div className="absolute -bottom-6 left-6 w-44 p-3 rounded-xl glass border border-white/6">
            <div className="text-xs text-slate-400">Top creator</div>
            <div className="font-medium">Asha Kapoor</div>
            <div className="text-xs text-slate-400">
              Instagram • 120k followers
            </div>
          </div>
        </div>
      </Motion.div>
    </section>
  );
}
