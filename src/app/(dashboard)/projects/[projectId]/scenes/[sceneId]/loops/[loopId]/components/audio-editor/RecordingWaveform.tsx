import { RefObject } from "react";
import { X } from "lucide-react";
import { Region } from "wavesurfer.js/dist/plugins/regions.js";

interface RecordingWaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isRecording: boolean;
  recordingTimeMs: number;
  recCursorTime: number;
  loopDurationMs: number;
  recordedDuration: number;
  selectedRegion: Region | null;
  onClearSelection: () => void;
}

export function RecordingWaveform({
  containerRef,
  isRecording,
  recordingTimeMs,
  recCursorTime,
  loopDurationMs,
  recordedDuration,
  selectedRegion,
  onClearSelection,
}: RecordingWaveformProps) {
  const refDurationS = loopDurationMs / 1000;
  const rulerDurationS = Math.max(refDurationS, recordedDuration || 0);
  const currentTimeS = isRecording ? recordingTimeMs / 1000 : recCursorTime;
  const cursorPercent = Math.min(1.0, currentTimeS / rulerDurationS) * 100;
  const boundaryPercent = (refDurationS / rulerDurationS) * 100;
  const needlePercent = (recordedDuration / rulerDurationS) * 100;

  return (
    <div className="space-y-2">
      {/* Label and Duration info */}
      <div className="flex items-center gap-4 px-4 h-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Audio Rekaman Saya
          </span>
          <span className="text-[11px] font-mono font-bold text-indigo-500">
            {(recordedDuration || 0).toFixed(2)}s
          </span>
        </div>

        {selectedRegion && (
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded px-2 py-0.5 animate-in fade-in zoom-in-95 duration-100">
            <span className="text-[10px] text-muted-foreground font-mono font-bold">
              Seleksi: {selectedRegion.start.toFixed(2)}s –{" "}
              {selectedRegion.end.toFixed(2)}s (Durasi:{" "}
              {(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              title="Batal Seleksi"
              className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="w-full pt-0 relative">
        {/*
         * WaveSurfer fully owns this element — no React children inside.
         * Having React-managed children alongside WaveSurfer's appended DOM
         * can interfere with event handling.
         */}
        <div
          ref={containerRef}
          className="w-full relative bg-background border border-border rounded-xl p-3 min-h-[90px]"
        />

        {/* Reference boundary line (dashed red) at reference duration limit */}
        {boundaryPercent < 100 && (
          <div
            className="absolute top-3 bottom-3 w-[2px] border-l-2 border-dashed border-red-500 z-10 pointer-events-none opacity-80"
            style={{
              left: `calc(12px + (100% - 24px) * ${boundaryPercent / 100})`,
            }}
            title="Batas Audio Referensi"
          />
        )}

        {/* Needle line (solid black/dark border) at actual user recording limit */}
        {recordedDuration > 0 && needlePercent < 100 && (
          <div
            className="absolute top-3 bottom-3 w-[2px] bg-black dark:bg-zinc-100 z-10 pointer-events-none"
            style={{
              left: `calc(12px + (100% - 24px) * ${needlePercent / 100})`,
            }}
            title="Batas Akhir Rekaman Anda"
          />
        )}

        {/* Cursor time indicator — sibling of the WaveSurfer container,
            positioned relative to the outer wrapper so it visually overlays
            the waveform without living inside the WaveSurfer DOM. */}
        <div
          data-rec-cursor-indicator
          className="absolute -translate-x-1/2 bg-black text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none transition-all duration-75"
          style={{
            top: "12px",
            left: `calc(12px + (100% - 24px) * ${cursorPercent / 100})`,
          }}
        >
          {currentTimeS.toFixed(2)}s
        </div>
      </div>
    </div>
  );
}
