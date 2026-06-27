"use client";

import { Mic, Square, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordingState } from "./hooks/useWaveSurferRecorder";

interface RecordingTransportButtonsProps {
  recordingState: RecordingState;
  isPlaying: boolean;
  onRecordClick: () => void;
  onPlayClick: () => void;
  onStopPlaybackClick: () => void;
}

export function RecordingTransportButtons({
  recordingState,
  isPlaying,
  onRecordClick,
  onPlayClick,
  onStopPlaybackClick,
}: RecordingTransportButtonsProps) {
  const isRecording = recordingState === "recording";
  const isRecorded = recordingState === "recorded";

  return (
    <div className="flex flex-col gap-3 items-center w-full">

      {/* Rekam / Stop Rec */}
      <button
        onClick={onRecordClick}
        className={cn(
          "flex flex-col items-center justify-center gap-2 w-full h-20 rounded-md border",
          "text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none",
          isRecording
            ? "border-red-500 bg-red-500/10 text-red-500 shadow-md"
            : "border-border bg-muted/20 hover:bg-muted/40 text-foreground"
        )}
      >
        {isRecording ? (
          <>
            <Square className="h-6 w-6 fill-current" />
            <span>Stop</span>
          </>
        ) : isRecorded ? (
          <>
            <Mic className="h-5 w-5 text-muted-foreground" />
            <span>Rekam Ulang</span>
          </>
        ) : (
          <>
            <Mic className="h-6 w-6 text-muted-foreground" />
            <span>Rekam</span>
          </>
        )}
      </button>

      {/* Putar / Stop — selalu tampil, disabled saat merekam */}
      {isPlaying ? (
        <button
          disabled={isRecording}
          onClick={onStopPlaybackClick}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full h-10 rounded-md border border-border",
            "text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none",
            isRecording
              ? "opacity-40 cursor-not-allowed bg-muted/20 text-foreground"
              : "bg-muted/20 hover:bg-muted/40 text-foreground"
          )}
        >
          <Square className="h-4 w-4 fill-current text-red-400" />
          <span>Stop</span>
        </button>
      ) : (
        <button
          disabled={isRecording || !isRecorded}
          onClick={onPlayClick}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full h-10 rounded-md border border-border",
            "text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none",
            isRecording || !isRecorded
              ? "opacity-40 cursor-not-allowed bg-muted/20 text-foreground"
              : "bg-muted/20 hover:bg-muted/40 text-foreground"
          )}
        >
          <Play className="h-4 w-4 fill-current text-blue-500" />
          <span>Putar</span>
        </button>
      )}

    </div>
  );
}
