import { RefObject } from "react";

interface RecordingWaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isRecording: boolean;
  recordingTimeMs: number;
  recCursorTime: number;
  loopDurationMs: number;
  recordedDuration: number;
}

export function RecordingWaveform({
  containerRef,
  isRecording,
  recordingTimeMs,
  recCursorTime,
  loopDurationMs,
  recordedDuration,
}: RecordingWaveformProps) {
  const refDurationS = loopDurationMs / 1000;
  const rulerDurationS = Math.max(refDurationS, recordedDuration || 0);
  const currentTimeS = isRecording ? recordingTimeMs / 1000 : recCursorTime;
  const cursorPercent = Math.min(1.0, currentTimeS / rulerDurationS) * 100;
  const boundaryPercent = (refDurationS / rulerDurationS) * 100;
  const needlePercent = (recordedDuration / rulerDurationS) * 100;

  return (
    <div className="w-full pt-2 relative">
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
  );
}

