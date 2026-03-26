"use client";

import { cn } from "@/lib/utils/cn";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Modal({ open, onClose, children, className, title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          <div className="absolute inset-0 bg-dark/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto",
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
                <h2 className="font-display text-xl font-bold text-dark">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-dark-50 transition-colors text-dark-400 hover:text-dark"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
