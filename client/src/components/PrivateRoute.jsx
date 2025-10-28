import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UnauthorizedPanel from "./UnauthorizedPanel";

// PrivateRoute now supports optional permission checks.
// Props:
// - roles: array of allowed roles (string)
// - permissions: array of permission keys required
// - permissionMode: 'all' (default) or 'any' — whether ALL permissions are required or ANY one suffices
export default function PrivateRoute({
  children,
  roles = [],
  permissions = [],
  permissionMode = "all",
}) {
  const auth = useAuth();
  const user = auth?.user;

  if (!auth) return <Navigate to="/influencer/login" />;
  if (!user) return <Navigate to="/influencer/login" />;

  // If no roles or permissions are specified, allow access
  if (
    (roles.length === 0 || roles === undefined) &&
    (permissions.length === 0 || permissions === undefined)
  )
    return children;

  const role = user.role || "";

  // Role check (allow superadmin whenever admin is included)
  if (roles && roles.length > 0) {
    const roleAllowed =
      roles.includes(role) ||
      (roles.includes("admin") && role === "superadmin");
    if (!roleAllowed)
      return (
        <UnauthorizedPanel
          message={"You don't have the required role to view this page."}
        />
      );
  }

  // Permission checks (if provided)
  if (permissions && permissions.length > 0) {
    // superadmin bypass
    if (role === "superadmin") return children;

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    if (permissionMode === "any") {
      const ok = permissions.some((p) => userPerms.includes(p));
      if (!ok)
        return (
          <UnauthorizedPanel
            message={
              "You don't have the required permissions to view this page."
            }
          />
        );
    } else {
      // require all
      const ok = permissions.every((p) => userPerms.includes(p));
      if (!ok)
        return (
          <UnauthorizedPanel
            message={
              "You don't have the required permissions to view this page."
            }
          />
        );
    }
  }

  return children;
}
