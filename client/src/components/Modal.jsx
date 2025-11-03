import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

// reference motion to satisfy some linters that fail to see JSX usage
void motion;

// Minimal focusable selector
const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(",");

export default function Modal({ children, onClose, title }) {
  const elRef = useRef(null);
  const previouslyFocused = useRef(null);

  if (!elRef.current) elRef.current = document.createElement("div");

  useEffect(() => {
    const mountNode = document.body;
    mountNode.appendChild(elRef.current);
    previouslyFocused.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose && onClose();
      }
      if (e.key === "Tab") {
        // basic focus trap
        const focusable = elRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
        if (!focusable || focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey, true);

    // focus the first focusable element inside modal or the container
    requestAnimationFrame(() => {
      const focusable = elRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
      if (focusable && focusable.length) focusable[0].focus();
      else elRef.current.tabIndex = -1;
    });

    return () => {
      document.removeEventListener("keydown", onKey, true);
      try {
        previouslyFocused.current &&
          previouslyFocused.current.focus &&
          previouslyFocused.current.focus();
      } catch (err) {
        // avoid unused var lint
        void err;
      }
      mountNode.removeChild(elRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlay = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-modal="true"
        role="dialog"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <motion.div
          className="absolute inset-0 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onClose && onClose()}
        />

        <motion.div
          className="relative bg-gray-900 text-white rounded p-4 max-w-lg w-full mx-4 z-10 shadow-lg"
          initial={{ opacity: 0, scale: 0.98, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {title && (
            <div id="modal-title" className="text-lg font-semibold mb-2">
              {title}
            </div>
          )}
          <div>{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(overlay, elRef.current);
}
