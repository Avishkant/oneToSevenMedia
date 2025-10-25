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
    if (!localStorage.getItem("accessToken")) return null;
    return parseJwt(localStorage.getItem("accessToken"));
  });
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
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
