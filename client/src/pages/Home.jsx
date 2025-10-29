import Button from "../components/Button";
import CampaignCard from "../components/CampaignCard";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

// --- Configuration and Placeholders ---
const BRAND_NAME = "1TO7MEDIA";

// Sample Unsplash links for a dynamic feel
const HERO_BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1557804506-669a67965da0?q=80&w=2904&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"; // Abstract, dynamic background for hero
const CAMPAIGN_IMAGE_URL = "https://images.unsplash.com/photo-1517436034162-d3a373b9e4a3?w=1200&q=80&auto=format&fit=crop"; 

// Using more distinct brand logo placeholders to make it clear they are *logos*
const BRAND_LOGOS = [
  "https://images.unsplash.com/photo-1611269150372-e160e1814660?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Tech Brand Logo
  "https://images.unsplash.com/photo-1579294576822-263a0a385474?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Fashion Brand Logo
  "https://images.unsplash.com/photo-1549497555-46e3e5899980?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Food Brand Logo
  "https://images.unsplash.com/photo-1579294576822-263a0a385474?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Lifestyle Brand Logo
  "https://images.unsplash.com/photo-1611269150372-e160e1814660?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Gaming Brand Logo
  "https://images.unsplash.com/photo-1549497555-46e3e5899980?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Example: Sports Brand Logo
];


// --- Animated Components ---

// A more dynamic Hero for the new design
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
        **{BRAND_NAME}** is your premier platform to discover, manage, and scale impactful influencer campaigns globally.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
        className="mt-10 flex justify-center space-x-4"
      >
        <Button variant="accent">
          Launch Your Campaign
        </Button>
        <Button variant="secondary">
          Explore Features
        </Button>
      </motion.div>

      {/* Optional: Add a subtle scrolling indicator or animated down arrow */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 10, opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400 text-3xl animate-bounce"
      >
        &darr;
      </motion.div>
    </div>
  </motion.section>
);


// Component for animated section on scroll
const AnimatedSection = ({ children, delay = 0.1, id }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }} // `amount: 0.1` means 10% of the element needs to be visible
    transition={{ duration: 0.6, delay }}
    className="py-16 md:py-24"
  >
    {children}
  </motion.section>
);

// --- Data ---
const stats = [
  { value: "300K+", label: "Creators" },
  { value: "50+", label: "Countries" },
  { value: "250+", label: "Cities" },
  { value: "50+", label: "Languages" },
];

const solutions = [
  { title: "Discover Influencers", description: "Filter creators by niche, audience size, and engagement to find perfect fits for your campaign.", icon: "[Icon Placeholder]" },
  { title: "Manage Campaigns", description: "Create, collaborate and review applications with a beautiful, simple workflow.", icon: "[Icon Placeholder]" },
  { title: "Secure Payments", description: "Track payouts and approvals with clear audit trails and manual or automated payouts.", icon: "[Icon Placeholder]" },
  { title: "Engagement Models", description: "Choose from a variety of collaboration types, including paid posts, gifting, and affiliate programs.", icon: "[Icon Placeholder]" },
  { title: "AI-Powered Matching", description: "Leverage our proprietary AI to match your campaign with high-performing creators.", icon: "[Icon Placeholder]" },
  { title: "Detailed Analytics", description: "Measure ROI with deep insights into reach, impressions, engagement, and conversion.", icon: "[Icon Placeholder]" },
];

// --- Main Home Component ---

export default function Home() {
  const auth = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;
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
          const publicCampaigns = (body || []).filter((c) => c.isPublic !== false);
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

  const totalPages = Math.max(1, Math.ceil(campaigns.length / pageSize));
  const paginated = campaigns.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* 1. Hero Section */}
      <ModernHero />

      {/* 2. Loved By The Top Brands */}
      <AnimatedSection delay={0.2} id="brands">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-xl font-semibold text-purple-400 uppercase tracking-widest">Loved By The Top Brands</h2>
          <p className="mt-2 text-3xl font-bold">Trusted by Industry Leaders</p>
          <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-8 opacity-70">
            {/* Animated Brand Logos */}
            {BRAND_LOGOS.map((logoUrl, i) => (
              <motion.img
                key={i}
                src={logoUrl} // Using actual brand logo image URLs
                alt={`Brand Logo ${i + 1}`}
                className="h-8 md:h-12 w-auto mx-auto grayscale hover:grayscale-0 transition duration-300"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>

      <hr className="max-w-6xl mx-auto border-gray-800" />

      {/* Quick stats (Creators / Countries / Cities / Languages) - Motion applied */}
      <AnimatedSection delay={0.3} id="stats">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
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
                <div className="text-4xl font-extrabold text-cyan-400">{stat.value}</div>
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
            Powerful tools designed for brands and agencies to achieve unparalleled campaign success with **{BRAND_NAME}**.
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
                <div className="text-2xl font-bold mb-2 text-cyan-400">{solution.title}</div>
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
          {loading && <div className="text-sm text-center">Loading campaigns...</div>}
          {!loading && paginated.length === 0 && (
            <div className="text-sm text-slate-300 text-center">No featured campaigns available.</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((c, index) => (
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
                  budget={`$${c.budget || 0}`}
                  tags={c.category ? [c.category] : []}
                  category={c.category}
                  followersMin={c.followersMin}
                  followersMax={c.followersMax}
                  location={c.location}
                  requirements={c.requirements}
                  imageUrl={c.imageUrl || CAMPAIGN_IMAGE_URL} 
                  applied={appliedIds.has(String(c._id))}
                  onApplied={(id) => setAppliedIds((s) => new Set([...s, String(id)]))}
                />
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                variant="secondary"
              >
                &larr; Prev
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                variant="secondary"
              >
                Next &rarr;
              </Button>
            </div>
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
            Schedule a call with our experts at **{BRAND_NAME}** to design your custom marketing strategy.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="accent" size="large">
              Schedule A Call &rarr;
            </Button>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer-like section with links */}
      {/* <section className="bg-gray-950 mt-20 py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <h4 className="font-bold text-lg mb-4 text-purple-400">Company</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/about" className="hover:text-white transition">About Us</a></li>
              <li><a href="/contact" className="hover:text-white transition">Contact</a></li>
              <li><a href="/careers" className="hover:text-white transition">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4 text-purple-400">Platform</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/how-it-works" className="hover:text-white transition">How {BRAND_NAME} Works</a></li>
              <li><a href="/solutions" className="hover:text-white transition">Our Solutions</a></li>
              <li><a href="/pricing" className="hover:text-white transition">Engagement Models</a></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-bold text-lg mb-4 text-purple-400">Resources</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
              <li><a href="/faq" className="hover:text-white transition">FAQ</a></li>
              <li><a href="/support" className="hover:text-white transition">Support</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-bold text-lg mb-4 text-cyan-400">Get Started</h4>
            <p className="text-gray-400 mb-4">Launch your first campaign today or speak to our team.</p>
            <div className="flex flex-col space-y-3">
              <Button variant="accent">
                Start Your Influencer Marketing Journey
              </Button>
              <Button variant="secondary" className="hover:text-cyan-400">
                Talk To Our Experts
              </Button>
            </div>
          </div>
        </div>
      </section> */}
    </main>
  );
}