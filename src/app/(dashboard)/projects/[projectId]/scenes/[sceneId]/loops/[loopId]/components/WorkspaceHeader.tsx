import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";

interface WorkspaceHeaderProps {
  project: Project;
  isModal?: boolean;
  onClose?: () => void;
}

export function WorkspaceHeader({
  project,
  isModal,
  onClose,
}: WorkspaceHeaderProps) {
  const handleCloseClick = (e: React.MouseEvent) => {
    if (onClose) {
      e.preventDefault();
      onClose();
    }
  };

  const closeButton = (
    <Button
      variant="destructive"
      size="icon"
      className="h-8 w-8 bg-red-600 hover:bg-red-700 text-white hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
      title="Tutup"
      onClick={handleCloseClick}
    >
      <X className="h-4 w-4" />
    </Button>
  );

  return (
    <header className="h-12 bg-muted border-b border-border flex items-center justify-between px-4 shrink-0 z-10 select-none">
      {/* Portal target for audio editor controls */}
      <div
        id="workspace-header-controls"
        className="flex-1 flex items-center gap-4 mr-4"
      />

      {/* Right side: Red X Close Button */}
      {isModal ? (
        closeButton
      ) : (
        <Link href={`/projects/${project.id}`} passHref legacyBehavior>
          {closeButton}
        </Link>
      )}
    </header>
  );
}
