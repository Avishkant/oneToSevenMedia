import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import { motion } from "framer-motion"; // Import motion for animations
import { FaBullhorn, FaCheckSquare, FaClipboardList, FaUsers, FaArrowRight, FaPlusCircle, FaMoneyBillWave } from "react-icons/fa"; // Icons for modules

// --- Animation Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 10 } 
  },
  hover: { 
    scale: 1.05, 
    boxShadow: "0 15px 30px rgba(0, 0, 0, 0.5), 0 0 10px rgba(78, 117, 255, 0.4)", // Stronger shadow/glow
    transition: { duration: 0.3 }
  }
};

const iconColor = "text-cyan-400"; // Primary accent color

// --- Dashboard Modules Configuration ---
const dashboardModules = [
  {
    title: "Campaigns",
    icon: FaBullhorn,
    description: "Create, review, and manage all ongoing brand campaigns.",
    link: "/admin/campaigns",
    linkText: "Manage Campaigns",
    variant: "primary"
  },
  {
    title: "Applications",
    icon: FaCheckSquare,
    description: "Review influencer applications for campaigns and manage approvals.",
    link: "/admin/applications",
    linkText: "Review Applications",
    variant: "accent"
  },
  {
    title: "Order Reviews",
    icon: FaClipboardList,
    description: "Review submitted campaign deliverables, add comments, and approve payouts.",
    link: "/admin/order-reviews",
    linkText: "Open Order Reviews",
    variant: "success"
  },
  {
    title: "Users & Access",
    icon: FaUsers,
    description: "Manage administrators, brands, and the full influencer database.",
    link: "/admin/influencers",
    linkText: "Manage Influencers",
    variant: "secondary"
  }
];

// --- Custom Dashboard Card Component ---
const DashboardCard = ({ data, index, auth }) => {
  const isUserModule = data.title === "Users & Access";
  const canViewInfluencers = auth?.user?.role === "superadmin" || (Array.isArray(auth?.user?.permissions) && auth.user.permissions.includes("influencers:view"));

  return (
    <motion.div
      className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 flex flex-col justify-between"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{ delay: index * 0.1 }}
    >
      <div>
        <data.icon className={`w-8 h-8 mb-4 ${iconColor}`} />
        <h3 className="text-xl font-extrabold text-white">{data.title}</h3>
        <p className="text-sm text-gray-400 mt-2">{data.description}</p>
      </div>

      <div className="mt-6">
        {isUserModule ? (
          <div className="flex flex-col gap-2">
            {auth?.user?.role === "superadmin" && (
              <Button as={Link} to="/admin/admins" variant="ghost" size="sm" className="text-purple-300 hover:bg-gray-700/50">
                Manage Admins <FaArrowRight className="ml-2 w-3 h-3" />
              </Button>
            )}
            {canViewInfluencers && (
              <Button as={Link} to={data.link} variant="ghost" size="sm" className="text-purple-300 hover:bg-gray-700/50">
                Manage Influencers <FaArrowRight className="ml-2 w-3 h-3" />
              </Button>
            )}
            {!canViewInfluencers && auth?.user?.role !== "superadmin" && (
                 <span className="text-sm text-gray-500">No user management access</span>
            )}
          </div>
        ) : (
          <Button as={Link} to={data.link} variant={data.variant} className="w-full justify-center">
            {data.linkText}
          </Button>
        )}
      </div>
    </motion.div>
  );
};


// --- Main Component ---
export default function AdminDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await auth.logout();
    navigate("/");
  };
  
  // Permissions checks (retained for logic)
  const canCampaignCreate = auth?.user?.permissions?.includes("campaign:create");
  const canPaymentsApprove = auth?.user?.permissions?.includes("payouts:approve");


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        
        {/* Dashboard Header */}
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-10 border-b border-gray-700 pb-4"
        >
          <h1 className="text-4xl font-extrabold text-white">
            <span className="text-cyan-400">1TO7MEDIA</span> Admin Hub
          </h1>
          <div className="text-sm flex gap-3">
            <Button as={Link} to="/" variant="secondary" className="hover:bg-gray-700/50 text-gray-400">
              Back to Site
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-rose-400 hover:bg-rose-900/30"
            >
              Sign out
            </Button>
          </div>
        </motion.div>

        {/* Dashboard Cards (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {dashboardModules.map((module, index) => (
            <DashboardCard key={module.title} data={module} index={index} auth={auth} />
          ))}
        </div>

        {/* Quick Actions Section */}
        <motion.section 
          className="mt-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-gray-800/90 p-8 rounded-xl border border-purple-600/50 shadow-xl">
            <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-3">
              <FaPlusCircle /> Quick Actions
            </h2>
            <p className="text-gray-400 mb-6">Jump straight into common tasks.</p>
            <div className="flex flex-wrap gap-4">
              
              {canCampaignCreate && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    as={Link}
                    to="/admin/campaigns/create"
                    variant="primary"
                    size="large"
                    className="flex items-center gap-2"
                  >
                    <FaBullhorn /> Create New Campaign
                  </Button>
                </motion.div>
              )}
              
              {canPaymentsApprove && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    as={Link}
                    to="/admin/payments"
                    variant="success" 
                    size="large" 
                    className="flex items-center gap-2"
                  >
                    <FaMoneyBillWave /> Approve Payouts
                  </Button>
                </motion.div>
              )}

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    as={Link}
                    to="/admin/applications"
                    variant="secondary" 
                    size="large" 
                    className="flex items-center gap-2"
                  >
                    <FaCheckSquare /> Review Pending Applications
                  </Button>
                </motion.div>

            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}