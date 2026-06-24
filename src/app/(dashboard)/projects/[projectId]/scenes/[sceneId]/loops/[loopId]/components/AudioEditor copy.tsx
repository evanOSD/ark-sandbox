"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover.js";
import { Square, Loader2, Play, Pause, Trash2, Scissors, Upload, Sliders, BookOpen, Volume2, X, Volume1, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WavRecorder } from "@/lib/wav-recorder";
import { getCloudinaryConfig } from "@/app/(dashboard)/templates/actions";
import { saveRecording } from "../../../../../loops/actions";
import { saveLocalRecording, getLocalRecording, clearLocalRecording } from "@/lib/indexeddb";
import { Project, Loop } from "../WorkspaceClient";

// Helper encoding PCM 24-bit 48kHz Mono WAV
function encodeWav24Bit(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 3);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 3, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 3, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 3, true);
  /* bits per sample (24 bits) */
  view.setUint16(34, 24, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 3, true);

  // Write PCM audio samples
  let index = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp value
    let s = Math.max(-1, Math.min(1, samples[i]));
    // Konversi Float32 (-1.0 s/d 1.0) menjadi Int24 (-8388608 s/d 8388607)
    s = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
    s = Math.round(s);
    // Tulis 3 bytes (Little Endian)
    view.setUint8(index, s & 0xff);
    view.setUint8(index + 1, (s >> 8) & 0xff);
    view.setUint8(index + 2, (s >> 16) & 0xff);
    index += 3;
  }

  return new Blob([view], { type: "audio/wav" });
}

// Helper to create a silent WAV Blob of specific duration
function createSilentWavBlob(durationSeconds: number, sampleRate: number = 48000): Blob {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const floatData = new Float32Array(numSamples);
  return encodeWav24Bit(floatData, sampleRate);
}

// Function to load, slice, and set reference audio on Wavesurfer to loop segment boundaries
async function loadAndSliceReferenceAudio(
  url: string,
  startMs: number,
  endMs: number,
  ws: WaveSurfer
) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil file audio referensi.");
    
    const arrayBuffer = await response.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 48000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor((startMs / 1000) * sampleRate);
    const endSample = Math.floor((endMs / 1000) * sampleRate);
    
    // Ensure boundaries are valid
    const safeStart = Math.max(0, Math.min(startSample, audioBuffer.length));
    const safeEnd = Math.max(safeStart, Math.min(endSample, audioBuffer.length));
    const durationSamples = safeEnd - safeStart;

    if (durationSamples <= 0) {
      throw new Error("Durasi segmen audio referensi tidak valid.");
    }

    // Extract mono data (channel 0)
    const channelData = audioBuffer.getChannelData(0);
    const slicedFloatData = new Float32Array(durationSamples);
    slicedFloatData.set(channelData.subarray(safeStart, safeEnd));

    // Encode slicedFloatData into a WAV Blob
    const wavBlob = encodeWav24Bit(slicedFloatData, sampleRate);
    const blobUrl = URL.createObjectURL(wavBlob);

    // Load trimmed audio into Wavesurfer
    await ws.load(blobUrl);
    
    // Close audioContext to release resources
    await audioCtx.close();
  } catch (err) {
    console.error("Gagal melakukan slice audio referensi:", err);
    // Fallback to loading the original url if slice fails
    ws.load(url).catch((loadErr) => {
      if (loadErr.name !== "AbortError") console.error(loadErr);
    });
  }
}

interface AudioEditorProps {
  project: Project;
  loop: Loop;
  existingRecordingUrl: string | null;
  isKeyTermsOpen: boolean;
  onToggleKeyTerms: () => void;
}

export default function AudioEditor({
  project,
  loop,
  existingRecordingUrl,
  isKeyTermsOpen,
  onToggleKeyTerms,
}: AudioEditorProps) {
  const router = useRouter();

  // DOM container refs
  const refContainerRef = useRef<HTMLDivElement | null>(null);
  const recContainerRef = useRef<HTMLDivElement | null>(null);

  // WaveSurfer instances
  const refWavesurfer = useRef<WaveSurfer | null>(null);
  const recWavesurfer = useRef<WaveSurfer | null>(null);
  const recRegionsPlugin = useRef<RegionsPlugin | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);

  // State audio reference sources
  const audioSources = useMemo(() => project.templates.audio_sources || [], [project.templates.audio_sources]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Playing states
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isRecPlaying, setIsRecPlaying] = useState(false);

  // User Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(existingRecordingUrl);
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [recCursorTime, setRecCursorTime] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);

  // Phase 2: Auto-trim Refs & States
  const recorderRef = useRef<WavRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTimeMs, setRecordingTimeMs] = useState(0);
  const punchInTimeMsRef = useRef(0);
  const stopRecordingRef = useRef<() => void>(() => {});

  // UI state & loaders
  const [isUploading, setIsUploading] = useState(false);
  
  // Microphone hardware DSP settings
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const [autoGainControl, setAutoGainControl] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedNS = localStorage.getItem("ark_noise_suppression");
      const storedAGC = localStorage.getItem("ark_auto_gain_control");
      const storedEC = localStorage.getItem("ark_echo_cancellation");
      
      // Defer state updates to avoid React compiler/linter warnings
      const timer = setTimeout(() => {
        if (storedNS !== null) setNoiseSuppression(storedNS === "true");
        if (storedAGC !== null) setAutoGainControl(storedAGC === "true");
        if (storedEC !== null) setEchoCancellation(storedEC === "true");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  const toggleNoiseSuppression = () => {
    const nextVal = !noiseSuppression;
    setNoiseSuppression(nextVal);
    localStorage.setItem("ark_noise_suppression", String(nextVal));
  };
  const toggleAutoGainControl = () => {
    const nextVal = !autoGainControl;
    setAutoGainControl(nextVal);
    localStorage.setItem("ark_auto_gain_control", String(nextVal));
  };
  const toggleEchoCancellation = () => {
    const nextVal = !echoCancellation;
    setEchoCancellation(nextVal);
    localStorage.setItem("ark_echo_cancellation", String(nextVal));
  };

  // Load temp recording from IndexedDB on mount
  useEffect(() => {
    async function loadTempRecording() {
      const tempBlob = await getLocalRecording(project.id, loop.id);
      if (tempBlob) {
        setRecordedBlob(tempBlob);
        const url = URL.createObjectURL(tempBlob);
        setRecordedUrl(url);
      }
    }
    loadTempRecording();
  }, [project.id, loop.id]);

  // Initializing Reference Wavesurfer
  useEffect(() => {
    if (!refContainerRef.current) return;

    const bottomTimeline = TimelinePlugin.create({
      height: 14,
      timeInterval: 0.2,
      primaryLabelInterval: 1,
      style: {
        fontSize: "10px",
        color: "#6b7280",
      },
    });

    const hoverRef = HoverPlugin.create({
      lineColor: 'rgba(99, 102, 241, 0.5)',
      lineWidth: 2,
      labelBackground: 'rgba(0, 0, 0, 0.75)',
      labelColor: '#fff',
      labelSize: '10px',
      formatTimeCallback: (time: number) => time.toFixed(2) + "s",
    });

    const ws = WaveSurfer.create({
      container: refContainerRef.current,
      waveColor: "rgba(99, 102, 241, 0.4)", // Indigo light HSL
      progressColor: "rgb(99, 102, 241)", // Indigo dark HSL
      height: 80,
      cursorColor: "#6366f1", // Visible Indigo cursor/playhead needle
      interact: true,
      sampleRate: 48000,
      plugins: [bottomTimeline, hoverRef],
    });

    refWavesurfer.current = ws;

    ws.on("play", () => setIsRefPlaying(true));
    ws.on("pause", () => setIsRefPlaying(false));

    // Load active source, slicing it to match loop start/end times
    const targetUrl = audioSources.length > 0 
      ? audioSources[activeTabIdx].url 
      : project.templates.audio_url;

    if (targetUrl) {
      loadAndSliceReferenceAudio(targetUrl, loop.start_time_ms, loop.end_time_ms, ws);
    }

    return () => {
      ws.destroy();
    };
  }, [activeTabIdx, audioSources, project.templates.audio_url, loop.start_time_ms, loop.end_time_ms]);

  // Initializing User Recording Wavesurfer (Mounted Once)
  useEffect(() => {
    if (!recContainerRef.current) return;

    const bottomTimelineRec = TimelinePlugin.create({
      height: 14,
      timeInterval: 0.2,
      primaryLabelInterval: 1,
      style: {
        fontSize: "10px",
        color: "#6b7280",
      },
    });

    const maxDurationS = Math.max(0.1, (loop.end_time_ms - loop.start_time_ms) / 1000);

    const record = RecordPlugin.create({
      scrollingWaveform: false, // Use fixed timeline instead of scrolling
      renderRecordedAudio: false, // We load the true 24-bit WAV manually instead
    });
    recordPluginRef.current = record;

    const hoverRec = HoverPlugin.create({
      lineColor: 'rgba(16, 185, 129, 0.5)',
      lineWidth: 2,
      labelBackground: 'rgba(0, 0, 0, 0.75)',
      labelColor: '#fff',
      labelSize: '10px',
      formatTimeCallback: (time: number) => time.toFixed(2) + "s",
    });

    const ws = WaveSurfer.create({
      container: recContainerRef.current,
      waveColor: "rgba(16, 185, 129, 0.4)", // Emerald HSL light
      progressColor: "rgb(16, 185, 129)", // Emerald HSL dark
      height: 90,
      cursorColor: "#10b981",
      interact: true,
      sampleRate: 48000,
      minPxPerSec: 0, // Force fit to container
      plugins: [bottomTimelineRec, record, hoverRec],
      duration: maxDurationS, // Force silent buffer timeline before recording
    });

    recWavesurfer.current = ws;

    // Register Regions Plugin
    const regions = ws.registerPlugin(RegionsPlugin.create());
    recRegionsPlugin.current = regions;

    regions.enableDragSelection({
      color: "rgba(16, 185, 129, 0.15)",
    });

    regions.on("region-created", (region: Region) => {
      // Keep only one region active
      const allRegions = regions.getRegions();
      allRegions.forEach((r: Region) => {
        if (r.id !== region.id) r.remove();
      });
      setSelectedRegion(region);
    });

    regions.on("region-updated", (region: Region) => {
      setSelectedRegion(region);
    });

    regions.on("region-removed", () => {
      setSelectedRegion(null);
    });

    ws.on("play", () => setIsRecPlaying(true));
    ws.on("pause", () => setIsRecPlaying(false));
    ws.on("timeupdate", (currentTime: unknown) => setRecCursorTime(Number(currentTime)));
    ws.on("seeking", (currentTime: unknown) => setRecCursorTime(Number(currentTime)));
    ws.on("decode", (duration) => setRecordedDuration(duration));

    // Listen to recording progress for auto-stop
    record.on("record-progress", (timeMs: number) => {
      const totalMs = punchInTimeMsRef.current + timeMs;
      setRecordingTimeMs(totalMs);

      const maxDurMs = loop.end_time_ms - loop.start_time_ms;
      if (maxDurMs > 0 && totalMs >= maxDurMs) {
        stopRecordingRef.current();
      }
    });

    return () => {
      ws.destroy();
    };
  }, [loop.start_time_ms, loop.end_time_ms]);

  // Load recorded URL when it changes
  useEffect(() => {
    if (recWavesurfer.current && recordedUrl && !isRecording) {
      recWavesurfer.current.load(recordedUrl).catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
    } else if (recWavesurfer.current && !recordedUrl && !isRecording) {
      // Instead of completely emptying, we load a pure silence audio buffer
      // This preserves the timeline, click-to-seek, and acts exactly like an empty canvas
      const maxDurS = Math.max(0.1, (loop.end_time_ms - loop.start_time_ms) / 1000);
      const silentBlob = createSilentWavBlob(maxDurS);
      const silentUrl = URL.createObjectURL(silentBlob);
      recWavesurfer.current.load(silentUrl).catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
    }
  }, [recordedUrl, isRecording, loop.end_time_ms, loop.start_time_ms]);

  // Handle Tab Switch for Reference
  const handleTabChange = (idx: number) => {
    setActiveTabIdx(idx);
    if (refWavesurfer.current) {
      loadAndSliceReferenceAudio(audioSources[idx].url, loop.start_time_ms, loop.end_time_ms, refWavesurfer.current);
    }
  };

  // Toggle Reference Audio
  const toggleRefPlay = () => {
    if (!refWavesurfer.current) return;
    if (isRefPlaying) {
      refWavesurfer.current.pause();
    } else {
      refWavesurfer.current.play();
    }
  };

  const stopRefPlay = () => {
    if (!refWavesurfer.current) return;
    refWavesurfer.current.stop();
  };

  const toggleRecPlay = () => {
    if (!recWavesurfer.current) return;
    if (isRecPlaying) {
      recWavesurfer.current.pause();
    } else {
      recWavesurfer.current.play();
    }
  };

  const stopRecPlay = () => {
    if (!recWavesurfer.current) return;
    recWavesurfer.current.stop();
  };

  // Stop Voice Recording
  const stopRecording = async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (recordPluginRef.current?.isRecording()) {
      recordPluginRef.current.stopRecording();
    }

    const recorder = recorderRef.current || recorderInstance;
    if (!recorder) return;
    
    const blob = recorder.stop(); // 24-bit 48kHz mono padded automatically
    setRecordedBlob(blob);

    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);
    setIsRecording(false);
    setIsPaused(false);
    setRecorderInstance(null);
    recorderRef.current = null;

    await saveLocalRecording(project.id, loop.id, blob);
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
    setIsPaused(true);
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
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      if (!recordPluginRef.current) return;

      // 1. Get media stream via RecordPlugin
      const stream = await recordPluginRef.current.startMic({
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      });

      // Extract existing audio buffer and playhead position for Punch-in Recording
      let initialBuffer: Float32Array | undefined;
      let startTimeSeconds = 0;
      
      if (recWavesurfer.current) {
        const decodedData = recWavesurfer.current.getDecodedData();
        if (decodedData) {
          initialBuffer = decodedData.getChannelData(0);
        }
        startTimeSeconds = recWavesurfer.current.getCurrentTime() || 0;
      }
      punchInTimeMsRef.current = startTimeSeconds * 1000;
      
      const maxDurationS = Math.max(0.1, (loop.end_time_ms - loop.start_time_ms) / 1000);

      // 2. Start true 24-bit PCM recorder using the SAME stream
      const recorder = new WavRecorder();
      await recorder.start({
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        stream, // Re-use the existing stream to keep them synced
        initialBuffer,
        startTimeSeconds,
        maxDurationSeconds: maxDurationS,
      });
      recorderRef.current = recorder;
      setRecorderInstance(recorder);

      // 3. Start RecordPlugin rendering
      await recordPluginRef.current.startRecording();

      setIsRecording(true);
      setIsPaused(false);
      setSelectedRegion(null);

      // Stop any playing audio
      if (refWavesurfer.current) refWavesurfer.current.pause();
      if (recWavesurfer.current) recWavesurfer.current.pause();

    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  // Trim Audio (Keep selected region)
  const handleTrim = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    const channelData = buffer.getChannelData(0);
    // Keep exact same length, just mute everything outside selection
    const trimmedData = new Float32Array(channelData.length);
    trimmedData.set(channelData.subarray(startIndex, endIndex), startIndex);

    const wavBlob = encodeWav24Bit(trimmedData, sampleRate);
    setRecordedBlob(wavBlob);

    // Clear regions and reload waveform
    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    // Save to IndexedDB local cache
    await saveLocalRecording(project.id, loop.id, wavBlob);
  };

  // Mute / Silent Audio Selection (Erase Audio without removing time)
  const handleMuteSelection = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);

    const channelData = buffer.getChannelData(0);
    // Keep exact same length, just mute the selected region
    const stitchedData = new Float32Array(channelData);
    for (let i = startIndex; i < endIndex; i++) {
      stitchedData[i] = 0;
    }

    const wavBlob = encodeWav24Bit(stitchedData, sampleRate);
    setRecordedBlob(wavBlob);

    // Clear regions and reload waveform
    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    // Save to IndexedDB local cache
    await saveLocalRecording(project.id, loop.id, wavBlob);
  };

  // Clear Selection
  const handleClearSelection = () => {
    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);
  };

  // Normalize Audio to -6dB
  const handleNormalize = async () => {
    if (!recWavesurfer.current || !recordedUrl) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    
    // 1. Find Max Peak
    let maxPeak = 0;
    for (let i = 0; i < channelData.length; i++) {
      const absVal = Math.abs(channelData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }

    if (maxPeak === 0) return; // Silent audio, skip
    
    // 2. Calculate Multiplier for -6dB
    const targetPeak = Math.pow(10, -6 / 20); // ~0.501187
    const multiplier = targetPeak / maxPeak;

    // 3. Apply Multiplier
    const normalizedData = new Float32Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      normalizedData[i] = channelData[i] * multiplier;
    }

    // 4. Save and Update
    const wavBlob = encodeWav24Bit(normalizedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(project.id, loop.id, wavBlob);
  };

  // Normalize Selection Audio to -6dB
  const handleNormalizeSelection = async () => {
    if (!recWavesurfer.current || !recordedUrl || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    
    // 1. Find Max Peak in the selected region
    let maxPeak = 0;
    for (let i = startIndex; i < endIndex; i++) {
      const absVal = Math.abs(channelData[i]);
      if (absVal > maxPeak) maxPeak = absVal;
    }

    if (maxPeak === 0) return; // Silent audio, skip
    
    // 2. Calculate Multiplier for -6dB
    const targetPeak = Math.pow(10, -6 / 20); // ~0.501187
    const multiplier = targetPeak / maxPeak;

    // 3. Apply Multiplier ONLY to the selected region
    const normalizedData = new Float32Array(channelData);
    for (let i = startIndex; i < endIndex; i++) {
      normalizedData[i] *= multiplier;
    }

    // 4. Save and Update
    const wavBlob = encodeWav24Bit(normalizedData, sampleRate);
    setRecordedBlob(wavBlob);

    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    const url = URL.createObjectURL(wavBlob);
    setRecordedUrl(url);

    await saveLocalRecording(project.id, loop.id, wavBlob);
  };

  // Discard Recording (Hapus Semua Rekaman)
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
    setIsPaused(false);
    setRecCursorTime(0);
    setRecordingTimeMs(0);
    
    // Clear regions
    if (recRegionsPlugin.current) {
      recRegionsPlugin.current.clearRegions();
    }
    setSelectedRegion(null);

    await clearLocalRecording(project.id, loop.id);
  };

  // Submit and Upload to Cloudinary
  const handleUploadRecording = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    try {
      // 1. Dapatkan Cloudinary Config
      const config = await getCloudinaryConfig();
      if (!config.cloudName || !config.apiKey) {
        throw new Error("Cloudinary API credentials are not configured on the server!");
      }

      // 2. Minta Signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const uploadPreset = config.uploadPreset;
      const paramsToSign = {
        timestamp,
        upload_preset: uploadPreset,
      };

      const signatureRes = await fetch("/api/cloudinary-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
      });

      const signatureData = await signatureRes.json();
      if (signatureData.error) {
        throw new Error("Gagal memperoleh tanda tangan Cloudinary: " + signatureData.error);
      }

      // 3. Upload direct ke Cloudinary dari browser
      const formData = new FormData();
      formData.append("file", recordedBlob, "recording.wav");
      formData.append("api_key", config.apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("upload_preset", uploadPreset);
      formData.append("signature", signatureData.signature);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error("Cloudinary Upload Error: " + uploadData.error.message);
      }

      const secureUrl = uploadData.secure_url;

      // 4. Hubungkan ke database dengan menyimpan URL rekaman
      const recordFormData = new FormData();
      recordFormData.append("audio_url", secureUrl);
      await saveRecording(project.id, loop.id, recordFormData);

      // 5. Hapus cache IndexedDB
      await clearLocalRecording(project.id, loop.id);

      alert("Rekaman berhasil diunggah! Anda akan dialihkan kembali ke halaman proyek.");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      alert("Gagal mengunggah rekaman: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsUploading(false);
    }
  };



  const isUnsavedLocal = recordedBlob !== null;
  const currentScriptText = audioSources[activeTabIdx]?.script_text || "";

  return (
    <div className="w-full h-full bg-background flex flex-col relative overflow-hidden text-foreground">
      {isRecording && (
        <div className="absolute inset-0 bg-red-500/5 border border-red-500/10 animate-pulse pointer-events-none z-10" />
      )}
      <div className="border-b border-border p-2 flex flex-row items-center justify-between shrink-0 bg-muted/10">
        <div className="flex flex-wrap gap-1.5 p-1 bg-background border border-border rounded-lg w-fit">
          {audioSources.length > 0 ? (
            audioSources.map((source, index) => (
              <Button
                key={source.name}
                type="button"
                variant="ghost"
                onClick={() => handleTabChange(index)}
                className={`h-8.5 text-xs font-semibold px-4 transition-all rounded-md ${
                  activeTabIdx === index
                    ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent"
                }`}
              >
                {source.name}
              </Button>
            ))
          ) : (
            <div className="h-8.5 px-4 flex items-center text-xs font-semibold text-muted-foreground">Default</div>
          )}
        </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={isKeyTermsOpen ? "default" : "outline"} 
                size="sm" 
                onClick={onToggleKeyTerms}
                className={`w-fit cursor-pointer h-8 text-xs font-semibold m-0 transition-colors ${isKeyTermsOpen ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" : "text-foreground"}`}
              >
                <BookOpen className={`w-3.5 h-3.5 mr-1.5 ${isKeyTermsOpen ? "text-white" : "text-indigo-500"}`} /> Kamus Kata Kunci
              </Button>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" size="sm" className="w-fit cursor-pointer h-8 text-xs font-semibold m-0" style={{ marginTop: 0 }} />}>
                  <Sliders className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Audio Settings
                </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="end">
                <div className="space-y-2 text-foreground">
                  <div className="flex items-center justify-between border-b border-border pb-1.5 px-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-emerald-500" /> Audio Settings
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={toggleNoiseSuppression}
                      disabled={isRecording}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all duration-200 ${
                        isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        noiseSuppression
                          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                          : "bg-background/40 border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex flex-col pr-1.5">
                        <span className="text-[10px] font-bold text-foreground">Noise Suppression</span>
                        <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight">Reduksi bising sekitar</span>
                      </div>
                      <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${noiseSuppression ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {noiseSuppression ? "ON" : "OFF"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleAutoGainControl}
                      disabled={isRecording}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all duration-200 ${
                        isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        autoGainControl
                          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                          : "bg-background/40 border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex flex-col pr-1.5">
                        <span className="text-[10px] font-bold text-foreground">Auto Gain Control</span>
                        <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight">Penyesuaian volume</span>
                      </div>
                      <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${autoGainControl ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {autoGainControl ? "ON" : "OFF"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleEchoCancellation}
                      disabled={isRecording}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all duration-200 ${
                        isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        echoCancellation
                          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                          : "bg-background/40 border-border hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex flex-col pr-1.5">
                        <span className="text-[10px] font-bold text-foreground">Echo Cancellation</span>
                        <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight">Mencegah gema speaker</span>
                      </div>
                      <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${echoCancellation ? "bg-emerald-500/20 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {echoCancellation ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border space-y-1 bg-muted/5 shrink-0">
            {/* Script Display Overlay */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 relative min-h-[90px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">
                  Naskah Skrip ({audioSources[activeTabIdx]?.name || "Default"})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleRefPlay}
                    className="h-6 text-[10px] font-semibold text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 hover:text-emerald-400 bg-background/40 px-2"
                  >
                    {isRefPlaying ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                    {isRefPlaying ? "Pause" : "Putar Referensi"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopRefPlay}
                    className="h-6 text-[10px] font-semibold text-rose-500 border-rose-950/40 hover:bg-rose-950/20 hover:text-rose-400 bg-background/40 px-2"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed font-medium">
                {currentScriptText || <span className="text-muted-foreground italic">Skrip teks tidak tersedia untuk tab ini.</span>}
              </p>
            </div>

            {/* Wavesurfer Container */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Audio Referensi</span>
                <span className="text-[10px] font-mono font-bold text-indigo-500">
                  {((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)}s
                </span>
              </div>
              <div ref={refContainerRef} className="w-full bg-background border border-border rounded-xl p-2.5 cursor-text" />
              <div className="w-full pt-2 relative">
                <div ref={recContainerRef} className="w-full relative bg-background border border-border rounded-xl p-3 min-h-[90px] cursor-text">
                  {/* Black Cursor Time Indicator */}
                  <div 
                    className="absolute top-1 -translate-x-1/2 bg-black text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none transition-all duration-75"
                    style={{ 
                      left: `calc(12px + calc(100% - 24px) * ${(isRecording ? recordingTimeMs / 1000 : recCursorTime) / Math.max(0.1, (loop.end_time_ms - loop.start_time_ms) / 1000)})` 
                    }}
                  >
                    {(isRecording ? recordingTimeMs / 1000 : recCursorTime).toFixed(2)}s
                  </div>
                </div>
              </div>
                  
              {/* Audio Editor Controls (Trim/Delete & Record) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/60 p-2.5 rounded-xl border border-border mt-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title={isRecPlaying ? "Pause" : "Putar"}
                    onClick={toggleRecPlay}
                    disabled={!recordedUrl}
                    className="h-8 w-8 text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 hover:text-emerald-400 bg-background/40 disabled:opacity-50"
                  >
                    {isRecPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Stop"
                    onClick={stopRecPlay}
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
                    onClick={handleTrim}
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
                    onClick={handleMuteSelection}
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
                    onClick={handleNormalize}
                    disabled={!recordedUrl}
                    className="h-8 w-8 border-border text-foreground/90 hover:text-foreground hover:bg-muted bg-background/40 disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Normalize Seleksi (-6dB)"
                    onClick={handleNormalizeSelection}
                    disabled={!selectedRegion || !recordedUrl}
                    className="h-8 w-8 border-border text-foreground/90 hover:text-foreground hover:bg-muted bg-background/40 disabled:opacity-50"
                  >
                    <Volume1 className="w-4 h-4" />
                  </Button>

                  {(recordedUrl || isRecording) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Hapus Semua"
                      onClick={handleDiscardRecording}
                      className="h-8 w-8 bg-red-600 text-black hover:bg-red-500 hover:text-black border-none transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {selectedRegion && (
                    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded px-2 py-1">
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        Seleksi: {selectedRegion.start.toFixed(2)}s - {selectedRegion.end.toFixed(2)}s (Durasi: {(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
                      </span>
                      <button 
                        type="button" 
                        onClick={handleClearSelection}
                        title="Batal Seleksi"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {isRecording ? (
                    <div className="flex items-center gap-3">
                      {/* Timer Display */}
                      <div className="text-xs font-mono font-bold text-red-400">
                        {(recordingTimeMs / 1000).toFixed(2)}s / {((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)}s
                      </div>

                      {/* Pause / Resume Button */}
                      {isPaused ? (
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full border-2 border-red-600 bg-transparent hover:bg-red-950/30 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group animate-pulse"
                          title="Lanjutkan Merekam (Append)"
                          onClick={resumeRecording}
                        >
                          <span className="w-3 h-3 rounded-full bg-red-500 group-hover:scale-110 transition-transform" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group animate-pulse"
                          title="Jeda Rekaman (Pause)"
                          onClick={pauseRecording}
                        >
                          <Pause className="h-3.5 w-3.5 fill-white text-white" />
                        </button>
                      )}

                      {/* Finalize / Stop Button */}
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center shadow-lg transition-colors"
                        title="Selesai Merekam"
                        onClick={stopRecording}
                      >
                        <Square className="h-3 w-3 fill-white mr-1.5" /> Stop
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group disabled:opacity-50 disabled:pointer-events-none"
                        title="Mulai Rekam Baru"
                        onClick={startRecording}
                        disabled={isUploading}
                      >
                        <span className="w-3 h-3 rounded-full bg-white group-hover:scale-110 transition-transform" />
                      </button>

                      {/* Duration Display when not recording */}
                      {recordedUrl && (
                        <div className="text-xs font-mono font-bold text-emerald-500">
                          {recordedDuration.toFixed(2)}s / {((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)}s
                        </div>
                      )}

                      {/* Upload Button moved into controls */}
                      {recordedUrl && !isRecording && (
                        <Button
                          className="h-8 text-xs font-bold gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-sm"
                          onClick={handleUploadRecording}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          Simpan Rekaman
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-2 flex-1 overflow-y-auto">
            {/* Status warning unsaved */}
            {isUnsavedLocal && (
              <div className="bg-amber-500/10 text-amber-500 text-xs px-3 py-2.5 rounded-xl border border-amber-500/20 text-center font-semibold animate-pulse">
                Ada rekaman lokal yang belum dikirim ke Cloudinary.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
