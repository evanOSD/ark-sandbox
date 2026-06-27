import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMsToTimecode } from "@/lib/timecode";
import { Project, Loop } from "@/types";

interface WorkspaceHeaderProps {
  project: Project;
  loop: Loop;
  isModal?: boolean;
  onClose?: () => void;
}

export function WorkspaceHeader({ project, loop, isModal, onClose }: WorkspaceHeaderProps) {
  const handleBackClick = (e: React.MouseEvent) => {
    if (isModal && onClose) {
      e.preventDefault();
      onClose();
    }
  };

  const backButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-secondary text-muted-foreground hover:text-foreground animate-fade-in"
      title="Kembali"
      onClick={handleBackClick}
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );

  return (
    <header className="h-12 bg-muted border-b border-border flex items-center justify-between px-4 shrink-0 z-10 select-none">
      <div className="flex items-center gap-3">
        {isModal ? (
          backButton
        ) : (
          <Link href={`/projects/${project.id}`} passHref legacyBehavior>
            {backButton}
          </Link>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-muted-foreground">
            {project.name}
          </span>
          <span className="text-muted-foreground/50 font-bold">/</span>
          <span className="font-black text-foreground uppercase tracking-wide">
            {loop.name}
          </span>
          <span className="text-xs border border-border rounded-full px-2.5 py-0.5 bg-muted/60 text-muted-foreground font-mono">
            {formatMsToTimecode(loop.start_time_ms)} -{" "}
            {formatMsToTimecode(loop.end_time_ms)}
          </span>
        </div>
      </div>

      {/* Right side: Save Status Info */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none font-medium pr-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Workspace Aktif</span>
      </div>
    </header>
  );
}
