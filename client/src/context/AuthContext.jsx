import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(
      decodeURIComponent(
        Array.prototype.map
          .call(
            decoded,
            (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join("")
      )
    );
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("accessToken"));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("accessToken");
    if (!t) return null;
    return parseJwt(t);
  });
  const [refreshToken, setRefreshToken] = useState(() =>
    localStorage.getItem("refreshToken")
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem("accessToken", token);
      setUser(parseJwt(token));
    } else {
      localStorage.removeItem("accessToken");
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    else localStorage.removeItem("refreshToken");
  }, [refreshToken]);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Login failed");
      if (body.token) {
        setToken(body.token);
        if (body.refreshToken) setRefreshToken(body.refreshToken);
      }
      const parsed = body.token ? parseJwt(body.token) : null;
      setLoading(false);
      return { ok: true, body, user: parsed };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err.message };
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Registration failed");
      if (body.token) setToken(body.token);
      if (body.refreshToken) setRefreshToken(body.refreshToken);
      const parsed = body.token ? parseJwt(body.token) : null;
      setLoading(false);
      return { ok: true, body, user: parsed };
    } catch (err) {
      setLoading(false);
      return { ok: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setToken(null);
    setRefreshToken(null);
  };

  const refresh = async () => {
    // try to refresh using stored refresh token (or cookie-supporting endpoint later)
    const tokenToUse = refreshToken || localStorage.getItem("refreshToken");
    if (!tokenToUse) return { ok: false, error: "no_refresh_token" };
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokenToUse }),
      });
      const body = await res.json();
      if (!res.ok) return { ok: false, error: body.error || "refresh_failed" };
      if (body.token) setToken(body.token);
      if (body.refreshToken) setRefreshToken(body.refreshToken);
      return { ok: true, body };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        login,
        logout,
        register,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
