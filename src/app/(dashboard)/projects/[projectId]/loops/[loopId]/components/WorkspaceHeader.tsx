import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatMsToTimecode } from "@/lib/timecode";

interface WorkspaceHeaderProps {
  projectId: string;
  projectName: string;
  loopName: string;
  startTimeMs: number;
  endTimeMs: number;
}

export function WorkspaceHeader({
  projectId,
  projectName,
  loopName,
  startTimeMs,
  endTimeMs,
}: WorkspaceHeaderProps) {
  return (
    <div className="space-y-1">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
      <p className="text-muted-foreground text-sm flex items-center gap-2">
        Putaran:{" "}
        <span className="font-semibold text-foreground">{loopName}</span>
        <span className="text-xs border rounded-full px-2 py-0.5 bg-muted">
          {formatMsToTimecode(startTimeMs)} - {formatMsToTimecode(endTimeMs)}
        </span>
      </p>
    </div>
  );
}
