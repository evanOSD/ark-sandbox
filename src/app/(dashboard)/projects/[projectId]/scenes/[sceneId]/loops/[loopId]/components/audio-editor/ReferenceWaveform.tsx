import { RefObject } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferenceWaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  durationMs: number;
  isRefPlaying: boolean;
  onToggleRefPlay: () => void;
  onStopRefPlay: () => void;
}

export function ReferenceWaveform({
  containerRef,
  durationMs,
  isRefPlaying,
  onToggleRefPlay,
  onStopRefPlay,
}: ReferenceWaveformProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 mt-2 px-4 h-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Audio Referensi
          </span>
          <span className="text-[11px] font-mono font-bold text-indigo-500">
            {(durationMs / 1000).toFixed(2)}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleRefPlay}
            className="h-6 text-[11px] font-semibold text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 hover:text-emerald-400 bg-background/40 px-2"
          >
            {isRefPlaying ? (
              <Pause className="w-3 h-3 mr-1" />
            ) : (
              <Play className="w-3 h-3 mr-1" />
            )}
            {isRefPlaying ? "Pause" : "Putar Referensi"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStopRefPlay}
            className="h-6 text-[11px] font-semibold text-rose-500 border-rose-950/40 hover:bg-rose-950/20 hover:text-rose-400 bg-background/40 px-2"
          >
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full bg-background border border-border rounded-xl p-2.5 cursor-text"
      />
    </div>
  );
}
