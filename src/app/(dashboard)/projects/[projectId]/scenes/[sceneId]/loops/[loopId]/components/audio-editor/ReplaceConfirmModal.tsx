"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ReplaceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReplaceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: ReplaceConfirmModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        initialFocus={false}
        className="max-w-md p-6 bg-background text-foreground border-2 border-muted rounded-xl"
        style={{
          boxShadow:
            "0 20px 50px 0 rgba(0,0,0,0.55), 0 1.5px 0 0 rgba(255,255,255,0.05) inset",
        }}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/50 flex items-center justify-center text-destructive">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <DialogTitle className="text-base font-bold uppercase tracking-wider text-destructive">
              Gantikan Rekaman Anda?
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground leading-relaxed px-2">
              Tindakan ini akan menghapus seluruh rekaman yang ada di editor
              saat ini dan memulai rekaman baru dari awal. Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </div>

          <div className="flex items-center justify-center gap-3 w-full pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-semibold hover:bg-muted border-border cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 h-9 text-xs font-bold gap-1 cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Ya, Gantikan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
