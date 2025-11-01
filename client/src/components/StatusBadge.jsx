import React from "react";

function Icon({ name, className = "" }) {
  // small inline SVG icons by name
  const common = "w-3.5 h-3.5 stroke-current";
  switch (name) {
    case "check":
      return (
        <svg
          className={common + " " + className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "clock":
      return (
        <svg
          className={common + " " + className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 7v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "x":
      return (
        <svg
          className={common + " " + className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "cart":
      return (
        <svg
          className={common + " " + className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path
            d="M3 3h2l.4 2M7 13h10l4-8H5.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
      );
    case "arrow":
      return (
        <svg
          className={common + " " + className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path
            d="M5 12h14M12 5l7 7-7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function StatusBadge({ status }) {
  const map = {
    applied: {
      text: "Applied",
      cls: "bg-slate-700 text-slate-100",
      icon: "arrow",
    },
    reviewing: {
      text: "Reviewing",
      cls: "bg-amber-600 text-white",
      icon: "clock",
    },
    approved: {
      text: "Approved",
      cls: "bg-emerald-600 text-white",
      icon: "check",
    },
    rejected: { text: "Rejected", cls: "bg-rose-600 text-white", icon: "x" },
    order_submitted: {
      text: "Order Submitted",
      cls: "bg-indigo-600 text-white",
      icon: "cart",
    },
    order_form_approved: {
      text: "Order Approved",
      cls: "bg-emerald-600 text-white",
      icon: "check",
    },
    order_form_rejected: {
      text: "Order Rejected",
      cls: "bg-rose-600 text-white",
      icon: "x",
    },
    proof_submitted: {
      text: "Proof Submitted",
      cls: "bg-indigo-500 text-white",
      icon: "clock",
    },
    deliverables_submitted: {
      text: "Deliverables Submitted",
      cls: "bg-indigo-500 text-white",
      icon: "clock",
    },
    partial_approved: {
      text: "Partial Approved",
      cls: "bg-amber-500 text-white",
      icon: "check",
    },
    paid: { text: "Paid", cls: "bg-emerald-600 text-white", icon: "check" },
    ordered: { text: "Ordered", cls: "bg-indigo-600 text-white", icon: "cart" },
    submitted: {
      text: "Submitted",
      cls: "bg-indigo-500 text-white",
      icon: "arrow",
    },
  };

  const item = map[status] || {
    text: status || "Unknown",
    cls: "bg-white/5 text-slate-100",
    icon: null,
  };

  const isReviewing = status === "reviewing";

  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${
        item.cls
      } ${isReviewing ? "animate-pulse status-pulse" : ""}`}
    >
      {item.icon && (
        <span className="icon opacity-95" aria-hidden>
          <Icon name={item.icon} />
        </span>
      )}
      <span>{item.text}</span>
    </span>
  );
}
