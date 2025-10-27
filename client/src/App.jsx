import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import InfluencerLogin from "./pages/InfluencerLogin";
import InfluencerRegister from "./pages/InfluencerRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminsList from "./pages/AdminsList";
import AdminDetail from "./pages/AdminDetail";
import CampaignsList from "./pages/CampaignsList";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignEdit from "./pages/CampaignEdit";
import ApplicationsAdmin from "./pages/ApplicationsAdmin";
import AdminApplicationsOverview from "./pages/AdminApplicationsOverview";
import MyApplications from "./pages/MyApplications";
import InfluencersList from "./pages/InfluencersList";
import AdminOrderReviews from "./pages/AdminOrderReviews";
import InfluencerDashboard from "./pages/InfluencerDashboard";
import BrowseCampaigns from "./pages/BrowseCampaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Profile from "./pages/ProfileNew";
// import Wallet from "./pages/Wallet";
import PrivateRoute from "./components/PrivateRoute";
import "./index.css";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100">
        <Header />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/influencer/login" element={<InfluencerLogin />} />
          <Route path="/influencer/register" element={<InfluencerRegister />} />
          <Route
            path="/influencer/dashboard"
            element={
              <PrivateRoute roles={["influencer"]}>
                <InfluencerDashboard />
              </PrivateRoute>
            }
          />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <AdminsList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/admins/:id"
            element={
              <PrivateRoute roles={["superadmin"]}>
                <AdminDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/campaigns"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <CampaignsList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/campaigns/create"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <CreateCampaign />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/campaigns/:id/edit"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <CampaignEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <ApplicationsAdmin />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/applications-overview"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <AdminApplicationsOverview />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/influencers"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <InfluencersList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/order-reviews"
            element={
              <PrivateRoute roles={["admin", "superadmin"]}>
                <AdminOrderReviews />
              </PrivateRoute>
            }
          />
          <Route
            path="/influencer/applications"
            element={
              <PrivateRoute roles={["influencer"]}>
                <MyApplications />
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns/browse"
            element={
              <PrivateRoute roles={["influencer"]}>
                <BrowseCampaigns />
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <PrivateRoute roles={["influencer"]}>
                <CampaignDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/influencer/profile"
            element={
              <PrivateRoute roles={["influencer"]}>
                <Profile />
              </PrivateRoute>
            }
          />
          {/*
            <Route
              path="/influencer/wallet"
              element={
                <PrivateRoute roles={["influencer"]}>
                  <Wallet />
                </PrivateRoute>
              }
            />
          */}
        </Routes>

        <Footer />
      </div>
    </ToastProvider>
  );
}

export default App;
