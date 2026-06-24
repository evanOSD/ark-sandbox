import { RefObject } from "react";

interface RecordingWaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isRecording: boolean;
  recordingTimeMs: number;
  recCursorTime: number;
  loopDurationMs: number;
}

export function RecordingWaveform({
  containerRef,
  isRecording,
  recordingTimeMs,
  recCursorTime,
  loopDurationMs,
}: RecordingWaveformProps) {
  const maxDurationS = Math.max(0.1, loopDurationMs / 1000);
  const currentTimeS = isRecording ? recordingTimeMs / 1000 : recCursorTime;
  const leftPercent = currentTimeS / maxDurationS;

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

      {/* Cursor time indicator — sibling of the WaveSurfer container,
          positioned relative to the outer wrapper so it visually overlays
          the waveform without living inside the WaveSurfer DOM. */}
      <div
        className="absolute -translate-x-1/2 bg-black text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none transition-all duration-75"
        style={{
          top: "12px",
          left: `calc(12px + (100% - 24px) * ${leftPercent})`,
        }}
      >
        {currentTimeS.toFixed(2)}s
      </div>
    </div>
  );
}

