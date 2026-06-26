"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
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

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

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
              disabled={isLoading}
              className="absolute right-4 top-4 text-muted-foreground/60 hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon Indicator based on variant */}
            <motion.div
              initial={{ scale: 0.8, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.05 }}
              className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
                variant === "danger"
                  ? "bg-red-500/10 border border-red-500/20 text-red-500"
                  : "bg-primary/10 border border-primary/20 text-primary"
              }`}
            >
              {variant === "danger" ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <HelpCircle className="h-6 w-6" />
              )}
            </motion.div>

            {/* Text Contents */}
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {title}
            </h2>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {description}
            </p>

            {/* Action Buttons */}
            <div className="w-full mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full font-semibold border-border hover:bg-muted/80 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                {cancelText}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`w-full font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-xs text-white shadow-md ${
                  variant === "danger"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/10"
                    : "bg-primary hover:bg-primary/95 shadow-primary/10"
                }`}
              >
                {isLoading ? "Memproses..." : confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
