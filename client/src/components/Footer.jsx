import {
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaFacebook,
  FaYoutube,
} from "react-icons/fa";
// Import framer-motion for hover effects and transitions
import { motion } from "framer-motion";

const BRAND_NAME = "1TO7MEDIA";

// Data for the footer links
const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { name: "How it Works", href: "/how-it-works" },
      { name: "Solutions", href: "/solutions" },
      { name: "Pricing & Models", href: "/pricing" },
      { name: "Campaigns", href: "/campaigns" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
      { name: "Legal", href: "/legal" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Blog", href: "/blog" },
      { name: "Help Center", href: "/help" },
      { name: "FAQ", href: "/faq" },
      { name: "Developers", href: "/dev" },
    ],
  },
];

// Reusable animated social icon component
const SocialIcon = ({ Icon, label, href }) => (
  <motion.a
    href={href}
    aria-label={label}
    className="text-gray-500 hover:text-cyan-400 transition duration-300 p-2 rounded-full hover:bg-gray-800"
    whileHover={{ scale: 1.2, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
  >
    <Icon className="w-5 h-5" />
  </motion.a>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-700/50 bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        {/* --- Main Footer Content: Logo and Links --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand Identity & Tagline */}
          <div className="col-span-2 md:col-span-2">
            <motion.div
              className="flex items-center gap-3 mb-4 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Modern Logo Design */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex flex-col items-center justify-center text-white font-black shadow-lg">
                <span className="text-sm leading-none">1T7</span>
                <span className="text-xs -mt-1 leading-none">M</span>
              </div>
              <div className="text-2xl font-extrabold tracking-wider">
                {BRAND_NAME}
              </div>
            </motion.div>
            <p className="text-gray-400 max-w-sm mt-4">
              Influencer marketing, **simplified and scaled**. Discover, manage,
              and execute top-tier campaigns worldwide.
            </p>
          </div>

          {/* Link Sections */}
          {FOOTER_LINKS.map((section, sectionIndex) => (
            <div key={section.title} className="col-span-1">
              <h4 className="text-lg font-bold mb-4 text-purple-400">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 * linkIndex + 0.5 }}
                  >
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-cyan-400 transition duration-200 text-sm"
                    >
                      {link.name}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <p className="text-sm text-gray-500 order-2 md:order-1">
            &copy; {currentYear} {BRAND_NAME}. All rights reserved.
          </p>

          {/* Social Media Icons with Motion */}
          <div className="flex items-center gap-2 order-1 md:order-2">
            <SocialIcon Icon={FaTwitter} label="Twitter" href="#" />
            <SocialIcon Icon={FaInstagram} label="Instagram" href="#" />
            <SocialIcon Icon={FaLinkedin} label="LinkedIn" href="#" />
            <SocialIcon Icon={FaFacebook} label="Facebook" href="#" />
            <SocialIcon Icon={FaYoutube} label="YouTube" href="#" />
          </div>
        </div>
      </div>
    </footer>
  );
}
