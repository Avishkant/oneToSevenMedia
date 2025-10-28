import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// If a backend URL was provided at build time, rewrite client-side requests
// that target the API root ("/api/...") to the full backend origin.
// This ensures calls like fetch('/api/...') work in production where
// the frontend and backend are on different origins.
(function rewriteApiFetch() {
  // prefer build-time VITE_BACKEND_URL, fall back to a runtime window variable
  // This lets you avoid rebuilding if you can inject a small script setting window.__BACKEND_URL__
  const API_BASE =
    import.meta.env.VITE_BACKEND_URL || window.__BACKEND_URL__ || "";
  if (!API_BASE) return;
  try {
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        if (typeof input === "string" && input.startsWith("/api/")) {
          input = API_BASE.replace(/\/$/, "") + input;
        } else if (input instanceof Request) {
          const url = new URL(input.url, window.location.origin);
          if (url.pathname.startsWith("/api/")) {
            const newUrl =
              API_BASE.replace(/\/$/, "") + url.pathname + url.search;
            input = new Request(newUrl, input);
          }
        }
      } catch {
        // fallback to original input on error
      }
      return orig(input, init);
    };
  } catch {
    // ignore if fetch cannot be overridden
  }
})();
