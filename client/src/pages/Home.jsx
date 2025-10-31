import Button from "../components/Button";
import CampaignCard from "../components/CampaignCard";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
// quiet lint: motion is used in JSX components below
void motion;

// --- Configuration and Placeholders ---
const BRAND_NAME = "1TO7MEDIA";

// Sample Unsplash links for a dynamic feel
const HERO_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1557804506-669a67965da0?q=80&w=2904&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
const CAMPAIGN_IMAGE_URL =
  "https://images.unsplash.com/photo-1517436034162-d3a373b9e4a3?w=1200&q=80&auto=format&fit=crop";

// Using more distinct brand logo placeholders. Duplicated to ensure enough logos for a smooth scroll loop.
const ORIGINAL_BRAND_LOGOS = [
  "https://logo.clearbit.com/google.com",
  "https://logo.clearbit.com/amazon.com",
  "https://logo.clearbit.com/nike.com",
  "https://logo.clearbit.com/spotify.com",
  "https://logo.clearbit.com/apple.com",
  "https://logo.clearbit.com/coca-cola.com",
];
// Duplicate logos to create the illusion of infinite scrolling
const BRAND_LOGOS = [...ORIGINAL_BRAND_LOGOS, ...ORIGINAL_BRAND_LOGOS];

// --- Animated Components ---

// A more dynamic Hero for the new design (Unchanged from last successful iteration)
const ModernHero = () => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1 }}
    className="relative pt-24 pb-32 min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 text-white"
  >
    {/* Background Image with Parallax/Zoom effect on scroll */}
    <div
      className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500"
      style={{ backgroundImage: `url(${HERO_BACKGROUND_IMAGE})` }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/70"></div>
    </div>

    {/* Dynamic Background Effects (glowing blobs, subtle particles - simulated) */}
    <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-10">
      <div className="absolute w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob top-10 left-10"></div>
      <div className="absolute w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 bottom-10 right-10"></div>
      <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 top-1/4 right-1/4"></div>
    </div>

    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-20 text-center">
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        className="text-6xl md:text-8xl font-extrabold tracking-tight"
      >
        <span className="block">Elevate Your Brand with</span>
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          Influencer Marketing Excellence
        </span>
      </motion.h1>

      <motion.p
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
        className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto"
      >
        **{BRAND_NAME}** is your premier platform to discover, manage, and scale
        impactful influencer campaigns globally.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
        className="mt-10 flex justify-center space-x-4"
      >
        <Button variant="accent">Launch Your Campaign</Button>
        <Button variant="secondary">Explore Features</Button>
      </motion.div>

      {/* Optional: Add a subtle scrolling indicator or animated down arrow */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 10, opacity: 1 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 text-3xl animate-bounce"
      >
        ↓
      </motion.div>
    </div>
  </motion.section>
);

// --- NEW: Continuous Scrolling Brand Logo Component ---
function BrandScroller({ logos = BRAND_LOGOS }) {
  // Duration scales with the number of logos to keep speed consistent
  const duration = logos.length * 1.5;

  // Custom utility class for gradient mask (you'd define this in global CSS)
  // .mask-gradient { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }

  return (
    <div className="relative w-full overflow-hidden py-6 bg-gray-900/50">
      {/* Visual Fade Mask */}
      <div
        className="absolute inset-0 pointer-events-none z-10 
        bg-gradient-to-r from-gray-900 via-transparent to-gray-900 
        opacity-70"
      ></div>

      <motion.div
        className="flex"
        // Keyframe animation: move the entire row of duplicated logos left by half its width
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          x: {
            repeat: Infinity,
            duration: duration,
            ease: "linear",
          },
        }}
      >
        {logos.map((logo, i) => (
          <motion.div
            key={i}
            className="flex items-center justify-center h-16 w-48 flex-shrink-0 p-3"
            // Individual logo animation for scale on hover
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img
              src={logo}
              alt={`Brand ${i + 1}`}
              // Hover effect: go from muted grayscale to full color
              className="max-h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// Component for animated section on scroll (Unchanged)
const AnimatedSection = ({ children, delay = 0.1, id }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.6, delay }}
    className="py-16 md:py-24"
  >
    {children}
  </motion.section>
);

// --- Data (Unchanged) ---
const stats = [
  { value: "300K+", label: "Creators" },
  { value: "50+", label: "Countries" },
  { value: "250+", label: "Cities" },
  { value: "50+", label: "Languages" },
];

const solutions = [
  {
    title: "Discover Influencers",
    description:
      "Filter creators by niche, audience size, and engagement to find perfect fits for your campaign.",
  },
  {
    title: "Manage Campaigns",
    description:
      "Create, collaborate and review applications with a beautiful, simple workflow.",
  },
  {
    title: "Secure Payments",
    description:
      "Track payouts and approvals with clear audit trails and manual or automated payouts.",
  },
  {
    title: "Engagement Models",
    description:
      "Choose from a variety of collaboration types, including paid posts, gifting, and affiliate programs.",
  },
  {
    title: "AI-Powered Matching",
    description:
      "Leverage our proprietary AI to match your campaign with high-performing creators.",
  },
  {
    title: "Detailed Analytics",
    description:
      "Measure ROI with deep insights into reach, impressions, engagement, and conversion.",
  },
];

// --- Main Home Component ---

export default function Home() {
  const auth = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState(new Set());

  // Load applications (logic remains the same)
  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      if (!auth?.user || auth.user.role !== "influencer") return;
      try {
        const token = auth?.token || localStorage.getItem("accessToken");
        const res = await fetch(
          `/api/applications/by-influencer/${auth.user.id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) return;
        const body = await res.json();
        if (mounted)
          setAppliedIds(
            new Set(
              (body || []).map((a) => String(a.campaign?._id || a.campaign))
            )
          );
      } catch {
        // ignore
      }
    }
    loadApps();
    return () => (mounted = false);
  }, [auth]);

  // Load campaigns (logic remains the same)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/campaigns");
        if (!res.ok) throw new Error("Failed to load campaigns");
        const body = await res.json();
        if (mounted) {
          const publicCampaigns = (body || []).filter(
            (c) => c.isPublic !== false
          );
          setCampaigns(publicCampaigns);
        }
      } catch {
        // ignore for now
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // Pick newest 3 campaigns to feature (sort by createdAt if available)
  const newestCampaigns = campaigns
    .slice()
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* 1. Hero Section */}
      <ModernHero />

      {/* 2. Loved By The Top Brands */}
      <AnimatedSection delay={0.2} id="brands">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-xl font-semibold text-purple-400 uppercase tracking-widest">
            Loved By The Top Brands
          </h2>
          <p className="mt-2 text-3xl font-bold">Trusted by Industry Leaders</p>

          {/* Use the new BrandScroller component */}
          <BrandScroller />
        </div>
      </AnimatedSection>

      <hr className="max-w-6xl mx-auto border-gray-800 my-8" />

      {/* Quick stats (Creators / Countries / Cities / Languages) - Motion applied */}
      <AnimatedSection delay={0.3} id="stats">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold mb-6 text-center">
            Our Reach
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-cyan-500 transition duration-300 transform hover:scale-[1.02]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
              >
                <div className="text-4xl font-extrabold text-cyan-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <hr className="max-w-6xl mx-auto border-gray-800" />

      {/* 3. Our Influencer Marketing Solutions */}
      <AnimatedSection delay={0.4} id="solutions">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold mb-4 text-center">
            Our <span className="text-purple-400">Solutions</span>
          </h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">
            Powerful tools designed for brands and agencies to achieve
            unparalleled campaign success with **{BRAND_NAME}**.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="p-6 bg-gray-800/70 rounded-xl shadow-lg border border-gray-700/50 transition duration-300 hover:shadow-cyan-500/20"
              >
                <div className="text-2xl font-bold mb-2 text-cyan-400">
                  {solution.title}
                </div>
                <p className="text-gray-400">{solution.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <hr className="max-w-6xl mx-auto border-gray-800" />

      {/* 4. Featured Campaigns */}
      <AnimatedSection delay={0.2} id="campaigns">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold mb-10 text-center">
            Featured <span className="text-purple-400">Campaigns</span>
          </h2>
          {loading && (
            <div className="text-sm text-center">Loading campaigns...</div>
          )}
          {!loading && newestCampaigns.length === 0 && (
            <div className="text-sm text-slate-300 text-center">
              No featured campaigns available.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {newestCampaigns.map((c, index) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <CampaignCard
                  id={c._id}
                  title={c.title}
                  brand={c.brandName}
                  budget={`₹${c.budget || 0}`}
                  tags={c.category ? [c.category] : []}
                  category={c.category}
                  followersMin={c.followersMin}
                  followersMax={c.followersMax}
                  location={c.location}
                  requirements={c.requirements}
                  imageUrl={c.imageUrl || CAMPAIGN_IMAGE_URL}
                  applied={appliedIds.has(String(c._id))}
                  isPublic={c.isPublic}
                  adminComment={c.adminComment}
                  influencerComment={c.influencerComment}
                  onApplied={(id) =>
                    setAppliedIds((s) => new Set([...s, String(id)]))
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <hr className="max-w-6xl mx-auto border-gray-800" />

      {/* 5. Start Your Influencer Marketing Journey - SCHEDULE A CALL (CTA) */}
      <AnimatedSection delay={0.2} id="schedule-call">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 bg-gray-800 rounded-xl p-12 text-center shadow-2xl border border-purple-600/50">
          <h3 className="text-4xl font-extrabold mb-4">
            Ready to <span className="text-cyan-400">Scale</span> Your Reach?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Schedule a call with our experts at **{BRAND_NAME}** to design your
            custom marketing strategy.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="accent" size="large">
              Schedule A Call →
            </Button>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer-like section removed as per user's previous code version */}
    </main>
  );
}
