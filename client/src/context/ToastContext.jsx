import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, opts = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: opts.type || "info",
      duration: opts.duration || 3000,
    };
    setToasts((t) => [...t, toast]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    // auto-dismiss
    const timers = toasts.map((t) => {
      const tm = setTimeout(() => remove(t.id), t.duration);
      return tm;
    });
    return () => timers.forEach((tm) => clearTimeout(tm));
  }, [toasts, remove]);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      {/* Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow-md text-sm max-w-xs break-words ${
              t.type === "success"
                ? "bg-emerald-600 text-white"
                : t.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-slate-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export default ToastContext;
