import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.js";
import { WavRecorder } from "@/lib/wav-recorder";

interface WaveSurferWithRenderer {
  renderer: {
    renderProgress(progress: number, isPlaying?: boolean): void;
  };
}
import {
  saveLocalRecording,
  getLocalRecording,
  clearLocalRecording,
} from "@/lib/indexeddb";
import { createSilentWavBlob, loadAndPadAudio } from "@/lib/audio-utils";
import type { LoopBoundary } from "./useAudioEditorState.types";
import type { AudioSettings } from "./useAudioSettings";

interface UseAudioEditorRecordingOptions {
  projectId: string;
  loopId: string;
  loopBoundary: LoopBoundary;
  existingRecordingUrl: string | null;
  audioSettings: AudioSettings;
  refWavesurfer: React.MutableRefObject<WaveSurfer | null>;
}

export function useAudioEditorRecording({
  projectId,
  loopId,
  loopBoundary,
  existingRecordingUrl,
  audioSettings,
  refWavesurfer,
}: UseAudioEditorRecordingOptions) {
  const { noiseSuppression, autoGainControl, echoCancellation } = audioSettings;

  const recContainerRef = useRef<HTMLDivElement | null>(null);
  const recWavesurfer = useRef<WaveSurfer | null>(null);
  const recRegionsPlugin = useRef<RegionsPlugin | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecPlaying, setIsRecPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(existingRecordingUrl);
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [recCursorTime, setRecCursorTime] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [actualRecordedDuration, setActualRecordedDuration] = useState<number>(0);
  const actualRecordedDurationRef = useRef(0);

  useEffect(() => {
    actualRecordedDurationRef.current = actualRecordedDuration;
  }, [actualRecordedDuration]);

  // Decode the raw/unpadded recorded audio to find its true/actual duration
  useEffect(() => {
    let active = true;
    async function calculateDuration() {
      if (recordedBlob) {
        try {
          const arrayBuffer = await recordedBlob.arrayBuffer();
          const AudioContextClass =
            window.AudioContext ||
            (
              window as Window &
                typeof globalThis & { webkitAudioContext?: typeof AudioContext }
            ).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (active) {
            setActualRecordedDuration(audioBuffer.duration);
          }
          await audioCtx.close();
        } catch (err) {
          console.error("Gagal men-decode recordedBlob untuk durasi (self-healing triggered):", err);
          if (active) {
            await clearLocalRecording(projectId, loopId);
            setRecordedBlob(null);
            setRecordedUrl(existingRecordingUrl);
            setActualRecordedDuration(0);
          }
        }
      } else if (recordedUrl) {
        try {
          const res = await fetch(recordedUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const AudioContextClass =
              window.AudioContext ||
              (
                window as Window &
                  typeof globalThis & { webkitAudioContext?: typeof AudioContext }
              ).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            if (active) {
              setActualRecordedDuration(audioBuffer.duration);
            }
            await audioCtx.close();
          }
        } catch (err) {
          console.error("Gagal mengambil/men-decode recordedUrl untuk durasi:", err);
        }
      } else {
        if (active) {
          setActualRecordedDuration(0);
        }
      }
    }
    calculateDuration();
    return () => {
      active = false;
    };
  }, [recordedBlob, recordedUrl, projectId, loopId, existingRecordingUrl]);

  const recorderRef = useRef<WavRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTimeMs, setRecordingTimeMs] = useState(0);
  const [recordingProgressTimeMs, setRecordingProgressTimeMs] = useState(0);
  const punchInTimeMsRef = useRef(0);
  const replaceEndTimeMsRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<() => void>(() => {});

  const animationFrameIdRef = useRef<number | null>(null);
  const recordingStartTimeMsRef = useRef<number>(0);
  const recordingAccumulatedTimeMsRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  const [punchInTimeMs, setPunchInTimeMs] = useState(0);
  const [replaceEndTimeMs, setReplaceEndTimeMs] = useState<number | null>(null);

  const updateVisualRecordingProgressRef = useRef<() => void>(() => {});

  const updateVisualRecordingProgress = useCallback(() => {
    if (!isRecordingRef.current || isPausedRef.current) return;

    const now = performance.now();
    const elapsedSinceLastStart = now - recordingStartTimeMsRef.current;
    const totalElapsedMs = recordingAccumulatedTimeMsRef.current + elapsedSinceLastStart;
    const totalMs = punchInTimeMsRef.current + totalElapsedMs;

    const maxDurS = Math.max(
      0.1,
      (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000,
    );

    const activeLoopDurationMsVal = (replaceEndTimeMsRef.current !== null)
      ? (replaceEndTimeMsRef.current - punchInTimeMsRef.current)
      : (loopBoundary.end_time_ms - loopBoundary.start_time_ms);

    const progressTimeMs = replaceEndTimeMsRef.current !== null ? totalElapsedMs : totalMs;

    // 1. Update WaveSurfer progress canvas directly
    if (recWavesurfer.current) {
      const progress = (totalMs / 1000) / maxDurS;
      ((recWavesurfer.current as unknown) as WaveSurferWithRenderer).renderer.renderProgress(progress);
    }

    // 2. Update cursor overlay DOM directly
    const cursorIndicator = document.querySelector('[data-rec-cursor-indicator]') as HTMLDivElement | null;
    if (cursorIndicator) {
      const progress = (totalMs / 1000) / maxDurS;
      cursorIndicator.style.left = `calc(12px + (100% - 24px) * ${progress})`;
      cursorIndicator.textContent = `${(totalMs / 1000).toFixed(2)}s`;
    }

    // 3. Update timer DOM directly
    const timer = document.querySelector('[data-rec-timer]') as HTMLDivElement | null;
    if (timer) {
      timer.textContent = `${(progressTimeMs / 1000).toFixed(2)}s / ${(activeLoopDurationMsVal / 1000).toFixed(2)}s`;
    }

    if (replaceEndTimeMsRef.current !== null && totalMs >= replaceEndTimeMsRef.current) {
      // Force exact end values in DOM
      if (recWavesurfer.current) {
        ((recWavesurfer.current as unknown) as WaveSurferWithRenderer).renderer.renderProgress((replaceEndTimeMsRef.current / 1000) / maxDurS);
      }
      if (cursorIndicator) {
        const progress = (replaceEndTimeMsRef.current / 1000) / maxDurS;
        cursorIndicator.style.left = `calc(12px + (100% - 24px) * ${progress})`;
        cursorIndicator.textContent = `${(replaceEndTimeMsRef.current / 1000).toFixed(2)}s`;
      }
      if (timer) {
        const maxProgressTimeMs = replaceEndTimeMsRef.current - punchInTimeMsRef.current;
        timer.textContent = `${(maxProgressTimeMs / 1000).toFixed(2)}s / ${(activeLoopDurationMsVal / 1000).toFixed(2)}s`;
      }

      setRecordingTimeMs(replaceEndTimeMsRef.current);
      setRecordingProgressTimeMs(replaceEndTimeMsRef.current - punchInTimeMsRef.current);
      stopRecordingRef.current();
      return;
    }

    const maxDurMs = loopBoundary.end_time_ms - loopBoundary.start_time_ms;
    if (maxDurMs > 0 && totalMs >= maxDurMs) {
      // Force exact end values in DOM
      if (recWavesurfer.current) {
        ((recWavesurfer.current as unknown) as WaveSurferWithRenderer).renderer.renderProgress(1);
      }
      if (cursorIndicator) {
        cursorIndicator.style.left = `calc(12px + (100% - 24px) * 1)`;
        cursorIndicator.textContent = `${(maxDurMs / 1000).toFixed(2)}s`;
      }
      if (timer) {
        timer.textContent = `${(maxDurMs / 1000).toFixed(2)}s / ${(activeLoopDurationMsVal / 1000).toFixed(2)}s`;
      }

      setRecordingTimeMs(maxDurMs);
      setRecordingProgressTimeMs(maxDurMs);
      stopRecordingRef.current();
      return;
    }

    animationFrameIdRef.current = requestAnimationFrame(updateVisualRecordingProgressRef.current);
  }, [loopBoundary.end_time_ms, loopBoundary.start_time_ms]);

  useEffect(() => {
    updateVisualRecordingProgressRef.current = updateVisualRecordingProgress;
  }, [updateVisualRecordingProgress]);

  // Load temp recording from IndexedDB on mount
  useEffect(() => {
    async function loadTempRecording() {
      const tempBlob = await getLocalRecording(projectId, loopId);
      if (tempBlob) {
        try {
          const arrayBuffer = await tempBlob.arrayBuffer();
          const AudioContextClass =
            window.AudioContext ||
            (
              window as Window &
                typeof globalThis & { webkitAudioContext?: typeof AudioContext }
            ).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          await audioCtx.decodeAudioData(arrayBuffer);
          await audioCtx.close();

          setRecordedBlob(tempBlob);
          const url = URL.createObjectURL(tempBlob);
          setRecordedUrl(url);
        } catch (err) {
          console.warn("Temp recording loaded from IndexedDB is corrupt, clearing:", err);
          await clearLocalRecording(projectId, loopId);
          setRecordedBlob(null);
          setRecordedUrl(existingRecordingUrl);
        }
      }
    }
    loadTempRecording();
  }, [projectId, loopId, existingRecordingUrl]);

  // Initialize Recording WaveSurfer
  useEffect(() => {
    if (!recContainerRef.current) return;

    const maxDurationS = Math.max(
      0.1,
      (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000,
    );

    const bottomTimelineRec = TimelinePlugin.create({
      height: 14,
      timeInterval: 0.2,
      primaryLabelInterval: 1,
      style: {
        fontSize: "10px",
        color: "#6b7280",
      },
      duration: maxDurationS,
    });

    const record = RecordPlugin.create({
      scrollingWaveform: false,
      renderRecordedAudio: false,
    });
    recordPluginRef.current = record;

    const hoverRec = HoverPlugin.create({
      lineColor: "rgba(16, 185, 129, 0.5)",
      lineWidth: 2,
      labelBackground: "rgba(0, 0, 0, 0.75)",
      labelColor: "#fff",
      labelSize: "10px",
      formatTimeCallback: (time: number) => time.toFixed(2) + "s",
    });

    const ws = WaveSurfer.create({
      container: recContainerRef.current,
      waveColor: "rgba(16, 185, 129, 0.4)",
      progressColor: "rgb(16, 185, 129)",
      height: 90,
      cursorColor: "#10b981",
      interact: true,
      sampleRate: 48000,
      minPxPerSec: 0,
      plugins: [bottomTimelineRec, record, hoverRec],
      duration: maxDurationS,
    });

    recWavesurfer.current = ws;

    const regions = ws.registerPlugin(RegionsPlugin.create());
    recRegionsPlugin.current = regions;

    regions.enableDragSelection({
      color: "rgba(16, 185, 129, 0.15)",
    });

    regions.on("region-created", (region: Region) => {
      const allRegions = regions.getRegions();
      allRegions.forEach((r: Region) => {
        if (r.id !== region.id) r.remove();
      });

      const actualDur = actualRecordedDurationRef.current;
      if (actualDur > 0) {
        let start = region.start;
        let end = region.end;
        let changed = false;
        if (start > actualDur) {
          start = actualDur;
          changed = true;
        }
        if (end > actualDur) {
          end = actualDur;
          changed = true;
        }
        if (end - start <= 0.01) {
          region.remove();
          setSelectedRegion(null);
          return;
        }
        if (changed) {
          region.setOptions({ start, end });
        }
      }
      setSelectedRegion(region);
    });

    regions.on("region-updated", (region: Region) => {
      const actualDur = actualRecordedDurationRef.current;
      if (actualDur > 0) {
        let start = region.start;
        let end = region.end;
        let changed = false;
        if (start > actualDur) {
          start = actualDur;
          changed = true;
        }
        if (end > actualDur) {
          end = actualDur;
          changed = true;
        }
        if (end - start <= 0.01) {
          region.remove();
          setSelectedRegion(null);
          return;
        }
        if (changed) {
          region.setOptions({ start, end });
        }
      }
      setSelectedRegion(region);
    });

    regions.on("region-removed", () => {
      setSelectedRegion(null);
    });

    ws.on("click", (relativeX: number) => {
      const activeRegions = regions.getRegions();
      if (activeRegions.length > 0) {
        const duration = ws.getDuration();
        const clickedTime = relativeX * duration;
        const activeRegion = activeRegions[0];
        if (activeRegion) {
          if (clickedTime < activeRegion.start || clickedTime > activeRegion.end) {
            regions.clearRegions();
            setSelectedRegion(null);
          }
        }
      }
    });

    ws.on("play", () => setIsRecPlaying(true));
    ws.on("pause", () => setIsRecPlaying(false));
    ws.on("timeupdate", (currentTime: unknown) => {
      const time = Number(currentTime);
      setRecCursorTime(time);
      const actualDur = actualRecordedDurationRef.current;
      if (ws.isPlaying() && actualDur > 0 && time >= actualDur) {
        ws.pause();
        ws.setTime(actualDur);
      }
    });
    ws.on("seeking", (currentTime: unknown) => setRecCursorTime(Number(currentTime)));
    ws.on("decode", (duration) => setRecordedDuration(duration));
    ws.on("error", (err: Error) => {
      if (err.name !== "AbortError") console.warn("[RecWaveform]", err.message);
    });

    record.on("record-progress", () => {
      // Handled smoothly via requestAnimationFrame in updateVisualRecordingProgress
    });

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      ws.destroy();
    };
  }, [loopBoundary.start_time_ms, loopBoundary.end_time_ms]);

  // Load recorded URL when it changes
  useEffect(() => {
    const maxDurS = Math.max(
      0.1,
      (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000,
    );

    if (recWavesurfer.current && recordedUrl && !isRecording) {
      loadAndPadAudio(recordedUrl, maxDurS, recWavesurfer.current).catch(async (err) => {
        console.error("Gagal memproses dan melakukan pad audio (self-healing triggered):", err);
        if (recordedBlob) {
          await clearLocalRecording(projectId, loopId);
          setRecordedBlob(null);
          setRecordedUrl(existingRecordingUrl);
          setActualRecordedDuration(0);
        }
      });
    } else if (recWavesurfer.current && !recordedUrl && !isRecording) {
      const silentBlob = createSilentWavBlob(maxDurS);
      const silentUrl = URL.createObjectURL(silentBlob);
      recWavesurfer.current.load(silentUrl).catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
    }
  }, [recordedUrl, isRecording, loopBoundary.end_time_ms, loopBoundary.start_time_ms, projectId, loopId, existingRecordingUrl, recordedBlob]);

  // Draw red region if recording exceeds template loop duration
  useEffect(() => {
    const ws = recWavesurfer.current;
    const regions = recRegionsPlugin.current;
    if (!ws || !regions) return;

    // Clear existing over-duration regions first
    const allRegions = regions.getRegions();
    allRegions.forEach((r: Region) => {
      if (r.id === "over-duration-region") {
        r.remove();
      }
    });

    const maxDurS = (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000;
    if (recordedDuration > maxDurS) {
      regions.addRegion({
        id: "over-duration-region",
        start: maxDurS,
        end: recordedDuration,
        color: "rgba(255, 0, 0, 0.25)",
        drag: false,
        resize: false,
      });
    }
  }, [recordedDuration, loopBoundary.end_time_ms, loopBoundary.start_time_ms]);

  const stopRecording = async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    const now = performance.now();
    const elapsedSinceLastStart = isPausedRef.current ? 0 : (now - recordingStartTimeMsRef.current);
    const totalElapsedMs = recordingAccumulatedTimeMsRef.current + elapsedSinceLastStart;
    const totalMs = punchInTimeMsRef.current + totalElapsedMs;

    setRecordingTimeMs(totalMs);
    setRecordingProgressTimeMs(replaceEndTimeMsRef.current !== null ? totalElapsedMs : totalMs);

    if (recordPluginRef.current?.isRecording()) {
      try {
        await recordPluginRef.current.stopRecording();
      } catch {
        // ignore
      }
    }

    const recorder = recorderRef.current || recorderInstance;
    if (!recorder) return;

    const blob = recorder.stop();
    setRecordedBlob(blob);

    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setReplaceEndTimeMs(null);

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    setRecorderInstance(null);
    recorderRef.current = null;

    if (recWavesurfer.current) {
      recWavesurfer.current.setOptions({ interact: true });
    }

    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    await saveLocalRecording(projectId, loopId, blob);
  };

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  const pauseRecording = () => {
    if (recordPluginRef.current?.isRecording()) {
      recordPluginRef.current.pauseRecording();
    }
    const recorder = recorderRef.current || recorderInstance;
    if (recorder) {
      recorder.pause();
    }

    const now = performance.now();
    const elapsedSinceLastStart = now - recordingStartTimeMsRef.current;
    const totalElapsedMs = recordingAccumulatedTimeMsRef.current + elapsedSinceLastStart;
    const totalMs = punchInTimeMsRef.current + totalElapsedMs;

    setRecordingTimeMs(totalMs);
    setRecordingProgressTimeMs(replaceEndTimeMsRef.current !== null ? totalElapsedMs : totalMs);

    setIsPaused(true);
    isPausedRef.current = true;

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    recordingAccumulatedTimeMsRef.current += elapsedSinceLastStart;
  };

  const resumeRecording = () => {
    if (recordPluginRef.current?.isPaused()) {
      recordPluginRef.current.resumeRecording();
    }
    const recorder = recorderRef.current || recorderInstance;
    if (recorder) {
      recorder.resume();
    }
    setIsPaused(false);
    isPausedRef.current = false;

    recordingStartTimeMsRef.current = performance.now();
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    animationFrameIdRef.current = requestAnimationFrame(updateVisualRecordingProgress);
  };

  const startRecording = async () => {
    try {
      if (!recordPluginRef.current) return;

      const stream = await recordPluginRef.current.startMic({
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      });

      let initialBuffer: Float32Array | undefined;
      let startTimeSeconds = 0;

      if (recWavesurfer.current) {
        const decodedData = recWavesurfer.current.getDecodedData();
        if (decodedData) {
          initialBuffer = decodedData.getChannelData(0);
        }
        startTimeSeconds = recWavesurfer.current.getCurrentTime() || 0;
      }

      if (selectedRegion) {
        startTimeSeconds = selectedRegion.start;
        replaceEndTimeMsRef.current = selectedRegion.end * 1000;
        setReplaceEndTimeMs(selectedRegion.end * 1000);
        if (recWavesurfer.current) {
          recWavesurfer.current.setTime(selectedRegion.start);
        }
      } else {
        replaceEndTimeMsRef.current = null;
        setReplaceEndTimeMs(null);
      }

      punchInTimeMsRef.current = startTimeSeconds * 1000;
      setPunchInTimeMs(startTimeSeconds * 1000);

      const maxDurationS = Math.max(
        0.1,
        (loopBoundary.end_time_ms - loopBoundary.start_time_ms) / 1000,
      );

      const recorder = new WavRecorder();
      await recorder.start({
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        stream,
        initialBuffer,
        startTimeSeconds,
        maxDurationSeconds: maxDurationS,
      });
      recorderRef.current = recorder;
      setRecorderInstance(recorder);

      // recordPluginRef.current.startRecording() is commented out to prevent WaveSurfer from clearing the existing waveform.
      // Waveform context is preserved for the user during replace/record.
      // await recordPluginRef.current.startRecording();

      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;

      recordingStartTimeMsRef.current = performance.now();
      recordingAccumulatedTimeMsRef.current = 0;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(updateVisualRecordingProgress);

      if (refWavesurfer.current) refWavesurfer.current.pause();
      if (recWavesurfer.current) recWavesurfer.current.pause();
    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  const toggleRecPlay = () => {
    if (!recWavesurfer.current) return;
    if (isRecPlaying) {
      recWavesurfer.current.pause();
    } else {
      if (selectedRegion) {
        selectedRegion.play(true);
      } else {
        recWavesurfer.current.play();
      }
    }
  };

  const stopRecPlay = () => {
    if (!recWavesurfer.current) return;
    recWavesurfer.current.stop();
    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);
  };

  const handleDiscardRecording = async () => {
    if (!confirm("Hapus semua rekaman ini?")) return;

    if (recordPluginRef.current?.isRecording()) {
      recordPluginRef.current.stopRecording();
    }

    if (recWavesurfer.current) {
      recWavesurfer.current.empty();
    }

    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setReplaceEndTimeMs(null);

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    setRecCursorTime(0);
    setRecordingTimeMs(0);

    if (recRegionsPlugin.current) recRegionsPlugin.current.clearRegions();
    setSelectedRegion(null);

    await clearLocalRecording(projectId, loopId);
  };

  const activeLoopDurationMs = (isRecording && replaceEndTimeMs !== null)
    ? (replaceEndTimeMs - punchInTimeMs)
    : (loopBoundary.end_time_ms - loopBoundary.start_time_ms);

  return {
    recContainerRef,
    recWavesurfer,
    recRegionsPlugin,
    recordPluginRef,
    isRecording,
    isPaused,
    isRecPlaying,
    recordedBlob,
    recordedUrl,
    selectedRegion,
    recCursorTime,
    recordedDuration,
    actualRecordedDuration,
    recordingTimeMs,
    recordingProgressTimeMs,
    activeLoopDurationMs,
    setRecordedBlob,
    setRecordedUrl,
    setSelectedRegion,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecPlay,
    stopRecPlay,
    handleDiscardRecording,
  };
}
