import { Region } from "wavesurfer.js/dist/plugins/regions.js";
import {
  Loader2,
  Pause,
  Play,
  Scissors,
  Square,
  Trash2,
  Save,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordingControlsProps {
  // Playback
  recordedUrl: string | null;
  isRecPlaying: boolean;
  onToggleRecPlay: () => void;
  onStopRecPlay: () => void;

  // Edit actions
  selectedRegion: Region | null;
  onTrim: () => void;
  onMuteSelection: () => void;
  onDeleteSelection: () => void;
  onNormalize: () => void;
  onClearSelection: () => void;
  onDiscardRecording: () => void;

  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  recordingTimeMs: number;
  loopDurationMs: number;
  isUploading: boolean;
  recordedDuration: number;

  // Recording actions
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onUploadRecording: () => void;
}

export function RecordingControls({
  recordedUrl,
  isRecPlaying,
  onToggleRecPlay,
  onStopRecPlay,
  selectedRegion,
  onTrim,
  onMuteSelection,
  onDeleteSelection,
  onNormalize,
  onClearSelection,
  onDiscardRecording,
  isRecording,
  isPaused,
  recordingTimeMs,
  loopDurationMs,
  isUploading,
  recordedDuration,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onUploadRecording,
}: RecordingControlsProps) {
  const loopDurationS = loopDurationMs / 1000;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/60 p-2.5 rounded-xl border border-border mt-2">
      {/* Left: Edit tools */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={isRecPlaying ? "Pause" : "Putar"}
          onClick={onToggleRecPlay}
          disabled={!recordedUrl}
          className="h-8 w-8 text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 hover:text-emerald-400 bg-background/40 disabled:opacity-50"
        >
          {isRecPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Stop"
          onClick={onStopRecPlay}
          disabled={!recordedUrl}
          className="h-8 w-8 text-rose-500 border-rose-950/40 hover:bg-rose-950/20 hover:text-rose-400 bg-background/40 disabled:opacity-50"
        >
          <Square className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Trim Seleksi"
          onClick={onTrim}
          disabled={!selectedRegion || !recordedUrl}
          className="h-8 w-8 border-border text-foreground/90 hover:text-foreground hover:bg-muted bg-background/40 disabled:opacity-50"
        >
          <Scissors className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Mute / Silent Seleksi"
          onClick={onMuteSelection}
          disabled={!selectedRegion || !recordedUrl}
          className="h-8 w-8 text-red-400 border-red-950/40 hover:bg-red-950/20 hover:text-red-300 disabled:opacity-50"
        >
          <VolumeX className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Normalize (-6dB)"
          onClick={onNormalize}
          disabled={!recordedUrl}
          className="h-8 w-8 border-border text-foreground/90 hover:text-foreground hover:bg-muted bg-background/40 disabled:opacity-50"
        >
          <Volume2 className="w-4 h-4" />
        </Button>

        {(recordedUrl || isRecording) && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Hapus Semua"
            onClick={() => {
              if (selectedRegion) {
                onDeleteSelection();
              } else {
                onDiscardRecording();
              }
            }}
            className="h-8 w-8 bg-red-600 text-black hover:bg-red-500 hover:text-black border-none transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Right: Selection info + recording/upload controls */}
      <div className="flex items-center gap-3">
        {selectedRegion && (
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded px-2 py-1">
            <span className="text-[10px] text-muted-foreground font-mono font-bold">
              Seleksi: {selectedRegion.start.toFixed(2)}s –{" "}
              {selectedRegion.end.toFixed(2)}s (Durasi:{" "}
              {(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              title="Batal Seleksi"
              className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {isRecording ? (
          <RecordingActiveControls
            isPaused={isPaused}
            recordingTimeMs={recordingTimeMs}
            loopDurationS={loopDurationS}
            onPause={onPauseRecording}
            onResume={onResumeRecording}
            onStop={onStopRecording}
          />
        ) : (
          <RecordingIdleControls
            recordedUrl={recordedUrl}
            isUploading={isUploading}
            recordedDuration={recordedDuration}
            loopDurationS={loopDurationS}
            onStart={onStartRecording}
            onUpload={onUploadRecording}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-controls ────────────────────────────────────────────────────────────

interface RecordingActiveControlsProps {
  isPaused: boolean;
  recordingTimeMs: number;
  loopDurationS: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function RecordingActiveControls({
  isPaused,
  recordingTimeMs,
  loopDurationS,
  onPause,
  onResume,
  onStop,
}: RecordingActiveControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Timer */}
      <div
        data-rec-timer
        className="text-xs font-mono font-bold text-red-400"
      >
        {(recordingTimeMs / 1000).toFixed(2)}s / {loopDurationS.toFixed(2)}s
      </div>

      {/* Pause / Resume */}
      {isPaused ? (
        <button
          type="button"
          className="h-8 w-8 rounded-full border-2 border-red-600 bg-transparent hover:bg-red-950/30 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group animate-pulse"
          title="Lanjutkan Merekam (Append)"
          onClick={onResume}
        >
          <span className="w-3 h-3 rounded-full bg-red-500 group-hover:scale-110 transition-transform" />
        </button>
      ) : (
        <button
          type="button"
          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group animate-pulse"
          title="Jeda Rekaman (Pause)"
          onClick={onPause}
        >
          <Pause className="h-3.5 w-3.5 fill-white text-white" />
        </button>
      )}

      {/* Stop */}
      <button
        type="button"
        className="h-8 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center shadow-lg transition-colors"
        title="Selesai Merekam"
        onClick={onStop}
      >
        <Square className="h-3 w-3 fill-white mr-1.5" /> Stop
      </button>
    </div>
  );
}

interface RecordingIdleControlsProps {
  recordedUrl: string | null;
  isUploading: boolean;
  recordedDuration: number;
  loopDurationS: number;
  onStart: () => void;
  onUpload: () => void;
}

function RecordingIdleControls({
  recordedUrl,
  isUploading,
  recordedDuration,
  loopDurationS,
  onStart,
  onUpload,
}: RecordingIdleControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Record button */}
      <button
        type="button"
        className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group disabled:opacity-50 disabled:pointer-events-none"
        title="Mulai Rekam Baru"
        onClick={onStart}
        disabled={isUploading}
      >
        <span className="w-3 h-3 rounded-full bg-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Duration display */}
      {recordedUrl && (
        <div className="text-xs font-mono font-bold text-emerald-500">
          {recordedDuration.toFixed(2)}s / {loopDurationS.toFixed(2)}s
        </div>
      )}

      {/* Upload button */}
      {recordedUrl && (
        <Button
          className="h-8 text-xs font-bold gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-sm"
          onClick={onUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Simpan Rekaman
        </Button>
      )}
    </div>
  );
}
