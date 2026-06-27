"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWaveSurferRecorder } from "./hooks/useWaveSurferRecorder";
import { useMicLevel } from "./hooks/useMicLevel";
import { RecordingTransportButtons } from "./RecordingTransportButtons";
import { WaveformDisplay } from "./WaveformDisplay";
import { MicLevelMeter } from "./MicLevelMeter";
import { RecordingActionButtons } from "./RecordingActionButtons";

interface LineRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  durationMs: number;
}

export function LineRecordingModal({
  isOpen,
  onClose,
  onSave,
}: LineRecordingModalProps) {
  const {
    recordingState,
    recordingTimeSec,
    isPlaying,
    setContainer,
    startRecord,
    stopRecord,
    playRegion,
    stopPlayback,
    saveRecording,
    resetRecorder,
  } = useWaveSurferRecorder({ isOpen, onSave, onClose });

  const micLevel = useMicLevel(isOpen);

  const handleRecordClick = () => {
    if (recordingState === "recording") {
      stopRecord();
    } else {
      startRecord();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resetRecorder();
      }}
    >
      <DialogContent
        style={{
          width: "55vw",
          maxWidth: "55vw",
          boxShadow:
            "0 8px 40px 0 rgba(0,0,0,0.45), 0 1.5px 0 0 rgba(255,255,255,0.04) inset",
        }}
        className="bg-background text-foreground border-2 border-muted p-6 rounded-xl"
      >
        {/* WaveSurfer region border styling */}
        <style>{`
          .wavesurfer-region {
            border-left: 2px solid rgba(16, 185, 129, 0.8) !important;
            border-right: 2px solid rgba(16, 185, 129, 0.8) !important;
          }
        `}</style>

        <DialogHeader className="flex flex-row items-center justify-between border-b border-muted pb-3">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Recording
          </DialogTitle>
        </DialogHeader>

        {/* Main layout: [Transport | Waveform | Level Meter] */}
        <div className="grid grid-cols-[110px_1fr_90px] gap-4 items-center pt-6 pb-2">
          <RecordingTransportButtons
            recordingState={recordingState}
            isPlaying={isPlaying}
            onRecordClick={handleRecordClick}
            onPlayClick={playRegion}
            onStopPlaybackClick={stopPlayback}
          />

          <WaveformDisplay
            recordingState={recordingState}
            recordingTimeSec={recordingTimeSec}
            setContainer={setContainer}
          />

          <MicLevelMeter level={micLevel} />
        </div>

        {/* Save / Cancel */}
        <RecordingActionButtons
          recordingState={recordingState}
          onSave={saveRecording}
          onCancel={resetRecorder}
        />
      </DialogContent>
    </Dialog>
  );
}
