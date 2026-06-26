"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description: string;
  buttonText?: string;
}

export function ErrorModal({
  isOpen,
  onClose,
  title = "Aksi Ditolak",
  description,
  buttonText = "Mengerti",
}: ErrorModalProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-card border border-border shadow-2xl rounded-2xl max-w-sm w-full p-6 overflow-hidden z-10 flex flex-col items-center text-center animate-in fade-in-50 duration-200"
          >
            {/* Close Button top-right */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted-foreground/60 hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Error Icon Indicator */}
            <motion.div
              initial={{ scale: 0.8, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.05 }}
              className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4"
            >
              <AlertCircle className="h-6 w-6" />
            </motion.div>

            {/* Text Contents */}
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {title}
            </h2>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {description}
            </p>

            {/* Action Buttons */}
            <div className="w-full mt-6">
              <Button
                onClick={onClose}
                className="w-full font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {buttonText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
