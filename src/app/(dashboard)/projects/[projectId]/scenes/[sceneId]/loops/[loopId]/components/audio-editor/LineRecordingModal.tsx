"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

import { useWaveSurferRecorder } from "./hooks/useWaveSurferRecorder";
import { useMicLevel } from "./hooks/useMicLevel";
import { RecordingTransportButtons } from "./RecordingTransportButtons";
import { WaveformDisplay } from "./WaveformDisplay";
import { MicLevelMeter } from "./MicLevelMeter";
import { RecordingActionButtons } from "./RecordingActionButtons";
import { motion, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LineRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  durationMs: number;
  audioSettings: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
}

export function LineRecordingModal({
  isOpen,
  onClose,
  onSave,
  audioSettings,
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
  } = useWaveSurferRecorder({ isOpen, onSave, onClose, audioSettings });

  const micLevel = useMicLevel(isOpen);
  const dragControls = useDragControls();
  const modalRef = useRef<HTMLDivElement>(null);
  const [dragConstraints, setDragConstraints] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (modalRef.current) {
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;

      const limitX = Math.max(0, (window.innerWidth - modalWidth) / 2);
      const limitY = Math.max(0, (window.innerHeight - modalHeight) / 2);

      setDragConstraints({
        left: -limitX,
        right: limitX,
        top: -limitY,
        bottom: limitY,
      });
    }
    dragControls.start(e);
  };

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
        showCloseButton={false}
        initialFocus={false}
        style={{
          width: "55vw",
          maxWidth: "55vw",
          padding: 0,
          background: "transparent",
          border: "none",
          boxShadow: "none",
        }}
        className="p-0 border-0 bg-transparent shadow-none"
      >
        <motion.div
          ref={modalRef}
          key={isOpen ? "open" : "closed"}
          drag
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={dragConstraints}
          dragMomentum={true}
          dragElastic={0.05}
          dragTransition={{ power: 0.08, timeConstant: 180 }}
          className="bg-background text-foreground border-2 border-muted p-6 rounded-xl w-full h-full relative pointer-events-auto"
          style={{
            boxShadow:
              "0 8px 40px 0 rgba(0,0,0,0.45), 0 1.5px 0 0 rgba(255,255,255,0.04) inset",
          }}
        >
          {/* WaveSurfer region border styling */}
          <style>{`
            .wavesurfer-region {
              border-left: 2px solid rgba(16, 185, 129, 0.8) !important;
              border-right: 2px solid rgba(16, 185, 129, 0.8) !important;
            }
          `}</style>

          <DialogClose
            render={
              <Button
                variant="ghost"
                className="absolute top-2.5 right-2.5 cursor-pointer z-50 hover:bg-muted text-muted-foreground/60 hover:text-foreground"
                size="icon-sm"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <DialogHeader
            onPointerDown={handlePointerDown}
            className="flex flex-row items-center justify-between border-b border-muted -mx-6 -mt-6 p-4 px-6 bg-muted/40 hover:bg-muted/70 cursor-grab active:cursor-grabbing rounded-t-xl transition-colors select-none touch-none"
          >
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground select-none">
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
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
