import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScriptDisplayProps {
  scriptText: string;
  sourceName: string;
  isRefPlaying: boolean;
  onToggleRefPlay: () => void;
  onStopRefPlay: () => void;
}

export function ScriptDisplay({
  scriptText,
  sourceName,
  isRefPlaying,
  onToggleRefPlay,
  onStopRefPlay,
}: ScriptDisplayProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-muted/30 relative min-h-[90px]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">
          Naskah Skrip ({sourceName})
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleRefPlay}
            className="h-6 text-[10px] font-semibold text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 hover:text-emerald-400 bg-background/40 px-2"
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
            className="h-6 text-[10px] font-semibold text-rose-500 border-rose-950/40 hover:bg-rose-950/20 hover:text-rose-400 bg-background/40 px-2"
          >
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </div>
      </div>
      <p className="text-sm text-foreground leading-relaxed font-medium">
        {scriptText || (
          <span className="text-muted-foreground italic">
            Skrip teks tidak tersedia untuk tab ini.
          </span>
        )}
      </p>
    </div>
  );
}
