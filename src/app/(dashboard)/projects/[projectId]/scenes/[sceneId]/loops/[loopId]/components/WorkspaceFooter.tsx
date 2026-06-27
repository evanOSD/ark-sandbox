import React from "react";
import { Loop } from "@/types";

interface WorkspaceFooterProps {
  loop: Loop;
}

export function WorkspaceFooter({ loop }: WorkspaceFooterProps) {
  return (
    <footer className="h-7 bg-muted border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span>Putaran: {loop.name}</span>
        <span className="text-muted-foreground/50">|</span>
        <span className="font-mono">
          Durasi: {((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)}s
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Workspace Aktif</span>
      </div>
    </footer>
  );
}
