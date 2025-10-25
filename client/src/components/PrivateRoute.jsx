import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children, roles = [] }) {
  const auth = useAuth();
  const user = auth?.user;

  if (!auth) return <Navigate to="/influencer/login" />;
  if (!user) return <Navigate to="/influencer/login" />;

  if (roles.length === 0) return children;

  const role = user.role || user?.role || "";
  if (
    roles.includes(role) ||
    (roles.includes("admin") && role === "superadmin")
  ) {
    return children;
  }

  // unauthorized
  return <Navigate to="/" />;
}
