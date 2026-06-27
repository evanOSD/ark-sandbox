"use client";

import { RecordingState } from "./hooks/useWaveSurferRecorder";

interface WaveformDisplayProps {
  recordingState: RecordingState;
  recordingTimeSec: number;
  setContainer: (el: HTMLDivElement | null) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function WaveformDisplay({
  recordingState,
  recordingTimeSec,
  setContainer,
}: WaveformDisplayProps) {
  return (
    <div
      className="relative border border-border/80 bg-muted/5 rounded-md select-none"
      style={{ height: "128px" }}
    >
      {/* Timecode overlay */}
      <div className="absolute top-2 left-2 text-xs font-mono font-bold text-muted-foreground/80 bg-background/60 px-1.5 py-0.5 rounded border border-border/30 z-20">
        {formatTime(recordingTimeSec)}
      </div>

      {/* Idle placeholder */}
      {recordingState === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-muted-foreground text-sm">Siap untuk merekam...</span>
        </div>
      )}

      {/*
        Single WaveSurfer container — always in DOM.
        - Recording phase: continuousWaveform + native cursor otomatis bergerak
        - Recorded phase:  playback waveform + region trim
      */}
      <div
        ref={setContainer}
        className="absolute inset-0"
        style={{ paddingTop: "24px" }}
      />

      {/* Trim hint */}
      {recordingState === "recorded" && (
        <span className="absolute bottom-1.5 left-0 right-0 text-[9px] text-muted-foreground text-center z-20 pointer-events-none">
          Geser batas wilayah hijau untuk memotong audio.
        </span>
      )}
    </div>
  );
}
