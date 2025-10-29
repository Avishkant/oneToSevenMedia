// import { useState } from "react";
// import Button from "../components/Button";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import useToast from "../context/useToast";

// export default function InfluencerLogin() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState(null);
//   const navigate = useNavigate();
//   const auth = useAuth();
//   const toast = useToast();

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setError(null);
//     auth.login({ email, password }).then((res) => {
//       if (!res.ok) {
//         setError(res.error);
//         toast?.add(res.error || "Login failed", { type: "error" });
//         return;
//       }
//       const parsedUser =
//         res.user ||
//         (res.body && res.body.token
//           ? (function (t) {
//               try {
//                 return JSON.parse(atob(t.split(".")[1]));
//               } catch {
//                 return null;
//               }
//             })(res.body.token)
//           : null);
//       if (parsedUser && parsedUser.role === "influencer") {
//         toast?.add("Logged in as influencer", { type: "success" });
//         // allow auth context to update then navigate
//         setTimeout(
//           () => navigate("/influencer/dashboard", { replace: true }),
//           50
//         );
//       } else {
//         toast?.add("Logged in", { type: "success" });
//         setTimeout(() => navigate("/", { replace: true }), 50);
//       }
//     });
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="w-full max-w-md glass p-8 rounded-xl">
//         <h2 className="text-2xl font-bold mb-4">Influencer login</h2>
//         <p className="text-sm text-slate-300 mb-6">
//           Sign in to view and apply to campaigns.
//         </p>
//         {error && <div className="text-sm text-rose-400 mb-3">{error}</div>}
//         <form onSubmit={handleSubmit} className="flex flex-col gap-3">
//           <input
//             required
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder="Email"
//             className="px-3 py-2 rounded bg-white/3"
//           />
//           <input
//             required
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="Password"
//             className="px-3 py-2 rounded bg-white/3"
//           />
//           <Button type="submit" variant="primary" className="mt-3">
//             Sign in
//           </Button>
//         </form>
//         <div className="mt-4 text-sm text-slate-300">
//           Don't have an account?{" "}
//           <a
//             href="/influencer/register"
//             className="text-indigo-300 hover:underline"
//           >
//             Create account
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }




















import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useToast from "../context/useToast";
import { motion } from "framer-motion";
import { FaUserTag, FaSignInAlt } from "react-icons/fa";

// --- Custom Styled Input Component ---
const StyledInput = ({ className = "", ...props }) => (
  <input
    className={`w-full px-4 py-3 rounded-lg bg-gray-700/70 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition duration-300 ${className}`}
    {...props}
  />
);

export default function InfluencerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    auth.login({ email, password }).then((res) => {
      setLoading(false);
      if (!res.ok) {
        const errorMsg = res.error || "Login failed";
        setError(errorMsg);
        toast?.add(errorMsg, { type: "error" });
        return;
      }
      
      const parsedUser =
        res.user ||
        (res.body && res.body.token
          ? (function (t) {
              try {
                return JSON.parse(atob(t.split(".")[1]));
              } catch {
                return null;
              }
            })(res.body.token)
          : null);
          
      if (parsedUser && parsedUser.role === "influencer") {
        toast?.add("Logged in as influencer", { type: "success" });
        // allow auth context to update then navigate
        setTimeout(
          () => navigate("/influencer/dashboard", { replace: true }),
          50
        );
      } else {
        // Handle non-influencer login if necessary, or default to home/logout
        toast?.add("Logged in", { type: "success" });
        setTimeout(() => navigate("/", { replace: true }), 50);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-gray-800/90 backdrop-blur-md p-10 rounded-2xl shadow-2xl border border-purple-500/30"
      >
        <header className="text-center mb-8">
          <FaUserTag className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
          <h2 className="text-3xl font-extrabold text-white">
            Influencer <span className="text-purple-400">Sign In</span>
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Access your creator dashboard to view and apply to campaigns.
          </p>
        </header>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-rose-400 bg-rose-900/40 border border-rose-700 p-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <StyledInput
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
          />
          <StyledInput
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          
          <motion.div 
            className="mt-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button type="submit" variant="primary" className="w-full text-lg shadow-lg hover:shadow-cyan-500/50" disabled={loading}>
              <FaSignInAlt className="mr-2" /> {loading ? "Verifying..." : "Sign In"}
            </Button>
          </motion.div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <motion.a
            href="/influencer/register"
            className="text-purple-400 hover:text-purple-300 font-medium transition duration-200"
            whileHover={{ scale: 1.05 }}
          >
            Create account
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}