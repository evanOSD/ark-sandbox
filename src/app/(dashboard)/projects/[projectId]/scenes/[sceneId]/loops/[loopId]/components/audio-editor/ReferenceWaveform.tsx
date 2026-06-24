import { RefObject } from "react";

interface ReferenceWaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  durationMs: number;
}

export function ReferenceWaveform({
  containerRef,
  durationMs,
}: ReferenceWaveformProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Audio Referensi
        </span>
        <span className="text-[10px] font-mono font-bold text-indigo-500">
          {(durationMs / 1000).toFixed(2)}s
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full bg-background border border-border rounded-xl p-2.5 cursor-text"
      />
    </div>
  );
}
