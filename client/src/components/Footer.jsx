import { FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/6 py-10">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black">
            1to7
          </div>
          <div>
            <div className="font-semibold">oneToSeven</div>
            <div className="text-xs text-slate-400">
              Influencer marketing, simplified.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <a href="#" aria-label="twitter">
            <FaTwitter />
          </a>
          <a href="#" aria-label="instagram">
            <FaInstagram />
          </a>
          <a href="#" aria-label="linkedin">
            <FaLinkedin />
          </a>
        </div>
      </div>
    </footer>
  );
}
