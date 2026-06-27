"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js";
import { sliceAudioBlob } from "@/lib/audio-utils";

export type RecordingState = "idle" | "recording" | "recorded";

interface UseWaveSurferRecorderOptions {
  isOpen: boolean;
  onSave: (blob: Blob) => void;
  onClose: () => void;
  audioSettings: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
}

interface UseWaveSurferRecorderReturn {
  recordingState: RecordingState;
  recordingTimeSec: number;
  isPlaying: boolean;
  isPaused: boolean;
  /** Single container ref — WaveSurfer is recreated inside this container per phase */
  setContainer: (el: HTMLDivElement | null) => void;
  startRecord: (deviceId?: string) => Promise<void>;
  stopRecord: () => void;
  pauseRecord: () => void;
  resumeRecord: () => void;
  /** Putar antara region.start dan region.end */
  playRegion: () => void;
  /** Stop playback sepenuhnya */
  stopPlayback: () => void;
  saveRecording: () => Promise<void>;
  resetRecorder: () => void;
}

export function useWaveSurferRecorder({
  isOpen,
  onSave,
  onClose,
  audioSettings,
}: UseWaveSurferRecorderOptions): UseWaveSurferRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTimeSec, setRecordingTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Single container — WaveSurfer is recreated here as needed
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const recordRef = useRef<RecordPlugin | null>(null);

  // ── Destroy helper ──
  const destroyAll = useCallback(() => {
    wsRef.current?.destroy();
    wsRef.current = null;
    regionsRef.current = null;
    recordRef.current = null;
    console.log("[WS] destroyed all instances");
  }, []);

  /**
   * createRecordingWS — mirrors createWaveSurfer() in the reference.
   * Creates WaveSurfer + RecordPlugin with continuousWaveform in the shared container.
   */
  const createRecordingWS = useCallback((el: HTMLDivElement) => {
    destroyAll();
    console.log("[WS] createRecordingWS — container:", el, "offsetWidth:", el.offsetWidth, "offsetHeight:", el.offsetHeight);

    const ws = WaveSurfer.create({
      container: el,
      waveColor: "rgba(16, 185, 129, 0.5)",
      progressColor: "rgba(16, 120, 80, 0.8)",
      height: 80,
      // Cursor aktif — WaveSurfer akan memindahkannya otomatis lewat setTime()
      // setiap frame continuousWaveform diperbarui
      cursorWidth: 2,
      cursorColor: "#34d399",
    });
    wsRef.current = ws;

    ws.on("ready", () => console.log("[WS] mic wavesurfer ready"));
    ws.on("error", (e) => console.error("[WS] mic wavesurfer error:", e));

    // registerPlugin — exactly like the reference
    const record = ws.registerPlugin(
      RecordPlugin.create({
        renderRecordedAudio: false,
        scrollingWaveform: false,
        continuousWaveform: true,
        continuousWaveformDuration: 30,
      })
    );
    recordRef.current = record;
    console.log("[WS] RecordPlugin registered, record:", record);

    record.on("record-progress", (timeMs) => {
      setRecordingTimeSec(timeMs / 1000);
    });

    record.on("record-end", (blob) => {
      console.log("[WS] record-end fired, blob size:", blob.size, "type:", blob.type);
      console.log("[Audio Settings] AFTER recording stops (completed) - Final State:", {
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl,
      });
      setRecordedBlob(blob);
      setRecordingState("recorded");
      setIsPaused(false);
    });
  }, [destroyAll, audioSettings]);

  /**
   * createPlaybackWS — mirrors the new WaveSurfer created in record-end handler.
   * Replaces the recording WaveSurfer with a playback instance + regions.
   */
  const createPlaybackWS = useCallback((el: HTMLDivElement, blob: Blob) => {
    destroyAll();
    console.log("[WS] createPlaybackWS — container:", el, "blob size:", blob.size);

    const recordedUrl = URL.createObjectURL(blob);

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: el,
      waveColor: "rgba(16, 185, 129, 0.45)",
      progressColor: "rgb(16, 120, 80)",
      height: 80,
      cursorColor: "#10b981",
      interact: true,
      url: recordedUrl,
      plugins: [regions],
    });
    wsRef.current = ws;

    ws.on("ready", () => {
      console.log("[WS] playback wavesurfer ready, duration:", ws.getDuration());
      const duration = ws.getDuration();
      regions.clearRegions();
      regions.addRegion({
        id: "slice-region",
        start: 0,
        end: duration,
        color: "rgba(16, 185, 129, 0.15)",
        drag: true,
        resize: true,
      });
    });

    ws.on("error", (e) => console.error("[WS] playback error:", e));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => setRecordingTimeSec(time));
  }, [destroyAll]);

  // ── Initialize recording WaveSurfer when dialog opens and container is ready ──
  useEffect(() => {
    if (!isOpen || !container) return;
    console.log("[WS] dialog open + container ready → createRecordingWS");
    createRecordingWS(container);

    return () => {
      destroyAll();
    };
  }, [isOpen, container, createRecordingWS, destroyAll]);

  // ── Switch to playback WaveSurfer when recording finishes ──
  useEffect(() => {
    if (recordingState !== "recorded" || !recordedBlob || !container) return;
    console.log("[WS] state=recorded + blob ready → createPlaybackWS");
    createPlaybackWS(container, recordedBlob);
  }, [recordingState, recordedBlob, container, createPlaybackWS]);

  // ── Cleanup on dialog close ──
  useEffect(() => {
    if (!isOpen) destroyAll();
  }, [isOpen, destroyAll]);

  // ── Actions ──
  const startRecord = useCallback(async (deviceId?: string) => {
    if (!container) {
      console.warn("[WS] startRecord — no container");
      return;
    }

    // Re-create recording WaveSurfer for a fresh waveform (mirrors createWaveSurfer() call)
    createRecordingWS(container);

    // Wait one tick for React to flush the new recordRef
    await new Promise((r) => setTimeout(r, 0));

    const record = recordRef.current;
    if (!record) {
      console.warn("[WS] startRecord — recordRef still null after recreate");
      return;
    }

    setRecordedBlob(null);
    setRecordingTimeSec(0);
    setIsPlaying(false);
    setIsPaused(false);

    console.log("[Audio Settings] BEFORE recording - State:", {
      echoCancellation: audioSettings.echoCancellation,
      noiseSuppression: audioSettings.noiseSuppression,
      autoGainControl: audioSettings.autoGainControl,
    });

    try {
      const constraints: MediaTrackConstraints = {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl,
      };

      console.log("[Audio Settings] DURING recording (applying constraints):", constraints);

      await record.startRecording(constraints);
      setRecordingState("recording");

      console.log("[Audio Settings] DURING recording (successfully started):", {
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl,
      });
    } catch (err) {
      console.error("[WS] startRecording threw:", err);
      alert("Gagal memulai perekaman: " + (err instanceof Error ? err.message : err));
    }
  }, [container, createRecordingWS, audioSettings]);

  const stopRecord = useCallback(() => {
    const record = recordRef.current;
    console.log("[WS] stopRecord clicked, record:", record, "isRecording:", record?.isRecording(), "isPaused:", record?.isPaused());
    console.log("[Audio Settings] STOP clicked - Status BEFORE stopping:", {
      echoCancellation: audioSettings.echoCancellation,
      noiseSuppression: audioSettings.noiseSuppression,
      autoGainControl: audioSettings.autoGainControl,
    });
    if (record && (record.isRecording() || record.isPaused())) {
      record.stopRecording();
    }
  }, [audioSettings]);

  const pauseRecord = useCallback(() => {
    console.log("[WS] pauseRecord");
    recordRef.current?.pauseRecording();
    setIsPaused(true);
  }, []);

  const resumeRecord = useCallback(() => {
    console.log("[WS] resumeRecord");
    recordRef.current?.resumeRecording();
    setIsPaused(false);
  }, []);

  /**
   * Putar hanya bagian antara region.start dan region.end
   * Mirrors: wavesurfer.play(start, end)
   */
  const playRegion = useCallback(() => {
    const ws = wsRef.current;
    const regions = regionsRef.current;
    if (!ws) return;

    const activeRegion = regions?.getRegions()[0];
    const start = activeRegion ? activeRegion.start : 0;
    const end = activeRegion ? activeRegion.end : ws.getDuration();
    console.log("[WS] playRegion from", start, "to", end);
    ws.play(start, end);
  }, []);

  const stopPlayback = useCallback(() => {
    console.log("[WS] stopPlayback");
    wsRef.current?.stop();
  }, []);

  const resetRecorder = useCallback(() => {
    console.log("[WS] resetRecorder");
    destroyAll();
    setRecordingState("idle");
    setRecordedBlob(null);
    setRecordingTimeSec(0);
    setIsPlaying(false);
    setIsPaused(false);
    onClose();
  }, [destroyAll, onClose]);

  const saveRecording = useCallback(async () => {
    const ws = wsRef.current;
    const regions = regionsRef.current;
    if (!ws || !regions || !recordedBlob) {
      console.warn("[WS] saveRecording aborted — ws:", !!ws, "regions:", !!regions, "blob:", !!recordedBlob);
      return;
    }

    const activeRegion = regions.getRegions()[0];
    const start = activeRegion ? activeRegion.start : 0;
    const end = activeRegion ? activeRegion.end : ws.getDuration();
    console.log("[WS] slicing audio from", start, "to", end);

    try {
      const slicedBlob = await sliceAudioBlob(recordedBlob, start, end);
      onSave(slicedBlob);
      resetRecorder();
    } catch (err) {
      console.error("[WS] sliceAudioBlob threw:", err);
      alert("Gagal memotong audio: " + (err instanceof Error ? err.message : err));
    }
  }, [recordedBlob, onSave, resetRecorder]);

  return {
    recordingState,
    recordingTimeSec,
    isPlaying,
    isPaused,
    setContainer,
    startRecord,
    stopRecord,
    pauseRecord,
    resumeRecord,
    playRegion,
    stopPlayback,
    saveRecording,
    resetRecorder,
  };
}
