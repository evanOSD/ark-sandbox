"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordingState } from "./hooks/useWaveSurferRecorder";

interface RecordingActionButtonsProps {
  recordingState: RecordingState;
  onSave: () => void;
  onCancel: () => void;
}

export function RecordingActionButtons({
  recordingState,
  onSave,
  onCancel,
}: RecordingActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-border pt-4 mt-2">
      {/* Save */}
      <button
        disabled={recordingState !== "recorded"}
        onClick={onSave}
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-20 h-16 border rounded-md transition-all duration-200 select-none",
          recordingState === "recorded"
            ? "border-emerald-600/30 bg-emerald-650/10 text-emerald-500 hover:bg-emerald-650/20"
            : "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
        )}
      >
        <Check className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Simpan
        </span>
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="flex flex-col items-center justify-center gap-1 w-20 h-16 border border-red-650/30 bg-red-650/10 text-red-500 hover:bg-red-650/20 rounded-md transition-all duration-200 select-none"
      >
        <X className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Batal
        </span>
      </button>
    </div>
  );
}
