"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import { Mic, Square, Check, Loader2, Play, Pause, Trash2, Scissors, Upload, RotateCcw, Volume2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { WavRecorder } from "@/lib/wav-recorder";
import { getCloudinaryConfig } from "@/app/(dashboard)/templates/actions";
import { saveRecording } from "../../../../../loops/actions";
import { saveTranslationText } from "../../../../../actions";
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
  existingTranslationText: string | null;
  children?: React.ReactNode;
}

export default function AudioEditor({
  project,
  loop,
  existingRecordingUrl,
  existingTranslationText,
  children,
}: AudioEditorProps) {
  // DOM container refs
  const refContainerRef = useRef<HTMLDivElement | null>(null);
  const recContainerRef = useRef<HTMLDivElement | null>(null);

  // WaveSurfer instances
  const refWavesurfer = useRef<WaveSurfer | null>(null);
  const recWavesurfer = useRef<WaveSurfer | null>(null);
  const recRegionsPlugin = useRef<RegionsPlugin | null>(null);

  // State audio reference sources
  const audioSources = useMemo(() => project.templates.audio_sources || [], [project.templates.audio_sources]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Playing states
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isRecPlaying, setIsRecPlaying] = useState(false);

  // User Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(existingRecordingUrl);
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // UI state & loaders
  const [isUploading, setIsUploading] = useState(false);
  const [translationText, setTranslationText] = useState(existingTranslationText || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
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

    const ws = WaveSurfer.create({
      container: refContainerRef.current,
      waveColor: "rgba(99, 102, 241, 0.4)", // Indigo light HSL
      progressColor: "rgb(99, 102, 241)", // Indigo dark HSL
      height: 80,
      cursorColor: "#6366f1", // Visible Indigo cursor/playhead needle
      interact: true,
      barWidth: 2,
      barGap: 3,
      sampleRate: 48000,
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

  // Initializing User Recording Wavesurfer
  useEffect(() => {
    if (!recContainerRef.current || !recordedUrl) {
      recWavesurfer.current = null;
      return;
    }

    const ws = WaveSurfer.create({
      container: recContainerRef.current,
      waveColor: "rgba(16, 185, 129, 0.4)", // Emerald HSL light
      progressColor: "rgb(16, 185, 129)", // Emerald HSL dark
      height: 90,
      cursorColor: "#10b981",
      interact: true,
      barWidth: 2,
      barGap: 3,
      sampleRate: 48000,
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

    // Load active recording, catching AbortError
    ws.load(recordedUrl).catch((err) => {
      if (err.name !== "AbortError") console.error(err);
    });

    return () => {
      ws.destroy();
    };
  }, [recordedUrl]);

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

  // Toggle User Audio
  const toggleRecPlay = () => {
    if (!recWavesurfer.current) return;
    if (isRecPlaying) {
      recWavesurfer.current.pause();
    } else {
      recWavesurfer.current.play();
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const recorder = new WavRecorder();
      await recorder.start({
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      });
      setRecorderInstance(recorder);
      setIsRecording(true);
      setSelectedRegion(null);

      // Stop any playing audio
      if (refWavesurfer.current) refWavesurfer.current.pause();
      if (recWavesurfer.current) recWavesurfer.current.pause();
    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  // Stop Voice Recording
  const stopRecording = async () => {
    if (!recorderInstance) return;
    const blob = recorderInstance.stop(); // Upgraded 24-bit 48kHz mono
    setRecordedBlob(blob);

    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);
    setIsRecording(false);
    setRecorderInstance(null);

    // Save locally to IndexedDB cache
    await saveLocalRecording(project.id, loop.id, blob);
  };

  // Trim Audio (Keep selected region)
  const handleTrim = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);
    const newLength = endIndex - startIndex;

    if (newLength <= 0) return;

    const channelData = buffer.getChannelData(0);
    const trimmedData = new Float32Array(newLength);
    trimmedData.set(channelData.subarray(startIndex, endIndex));

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

  // Delete Audio (Stitch edges)
  const handleDelete = async () => {
    if (!recWavesurfer.current || !selectedRegion) return;
    const buffer = recWavesurfer.current.getDecodedData();
    if (!buffer) return;

    const sampleRate = buffer.sampleRate;
    const startIndex = Math.floor(selectedRegion.start * sampleRate);
    const endIndex = Math.floor(selectedRegion.end * sampleRate);

    const part1Length = startIndex;
    const part2Length = Math.max(0, buffer.length - endIndex);
    const newLength = part1Length + part2Length;

    if (newLength <= 0) return;

    const channelData = buffer.getChannelData(0);
    const stitchedData = new Float32Array(newLength);
    stitchedData.set(channelData.subarray(0, startIndex));
    stitchedData.set(channelData.subarray(endIndex), startIndex);

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

      alert("Rekaman berhasil diunggah langsung ke Cloudinary!");
    } catch (err) {
      alert("Gagal mengunggah rekaman: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsUploading(false);
    }
  };

  // Discard local recording
  const handleDiscardRecording = async () => {
    if (confirm("Buang rekaman sementara ini?")) {
      await clearLocalRecording(project.id, loop.id);
      setRecordedBlob(null);
      setRecordedUrl(existingRecordingUrl);
      setSelectedRegion(null);
    }
  };

  // Autosave Translation Text Area onBlur
  const handleTextBlur = async () => {
    setSaveStatus("saving");
    try {
      await saveTranslationText(project.id, loop.id, translationText);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const isUnsavedLocal = recordedBlob !== null;
  const currentScriptText = audioSources[activeTabIdx]?.script_text || "";

  return (
    <div className="grid lg:grid-cols-12 w-full h-full items-stretch overflow-hidden bg-zinc-950">
      {/* Left Column: User Recording Player/Editor */}
      <div className="lg:col-span-7 h-full overflow-y-auto p-6 space-y-6">

        {/* CARD 2: Perekam & Penyunting Audio */}
        <Card className="border border-zinc-800 bg-zinc-900/50 shadow-2xl relative overflow-hidden text-zinc-100">
          {isRecording && (
            <div className="absolute inset-0 bg-red-500/5 border border-red-500/10 animate-pulse pointer-events-none" />
          )}
          <CardHeader className="border-b border-zinc-850 pb-3">
            <CardTitle className="text-sm font-bold tracking-wide uppercase text-zinc-400 flex items-center gap-2">
              <Mic className="w-4.5 h-4.5 text-emerald-500" /> Perekam & Editor Terjemahan
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Format audio mono 24-bit 48kHz PCM WAV. Lakukan seleksi pada gelombang audio dengan menarik kursor untuk melakukan Trim atau Delete.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Status warning unsaved */}
            {isUnsavedLocal && (
              <div className="bg-amber-500/10 text-amber-500 text-xs px-3 py-2.5 rounded-xl border border-amber-500/20 text-center font-semibold animate-pulse">
                Ada rekaman lokal yang belum dikirim ke Cloudinary.
              </div>
            )}

            {/* Control Panel: Audio Processing Settings */}
            <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/20 space-y-3 text-zinc-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-500" /> Pemrosesan Mikrofon (Hardware/Browser DSP)
                </span>
                <span className="text-[10px] text-zinc-550 italic">
                  Nonaktifkan semua untuk suara mentah (Raw)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={toggleNoiseSuppression}
                  disabled={isRecording}
                  className={`flex flex-col items-start justify-center p-3 rounded-xl border text-left transition-all duration-200 ${
                    isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    noiseSuppression
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="text-[11px] font-bold text-zinc-200">Noise Suppression</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Reduksi suara bising kipas/ruangan</span>
                  <span className={`text-[10px] font-bold mt-2 ${noiseSuppression ? "text-emerald-400" : "text-zinc-550"}`}>
                    {noiseSuppression ? "Aktif (ON)" : "Nonaktif (OFF)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleAutoGainControl}
                  disabled={isRecording}
                  className={`flex flex-col items-start justify-center p-3 rounded-xl border text-left transition-all duration-200 ${
                    isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    autoGainControl
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="text-[11px] font-bold text-zinc-200">Auto Gain Control</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Penyesuaian volume otomatis</span>
                  <span className={`text-[10px] font-bold mt-2 ${autoGainControl ? "text-emerald-400" : "text-zinc-550"}`}>
                    {autoGainControl ? "Aktif (ON)" : "Nonaktif (OFF)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleEchoCancellation}
                  disabled={isRecording}
                  className={`flex flex-col items-start justify-center p-3 rounded-xl border text-left transition-all duration-200 ${
                    isRecording ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    echoCancellation
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="text-[11px] font-bold text-zinc-200">Echo Cancellation</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Mencegah gema dari speaker</span>
                  <span className={`text-[10px] font-bold mt-2 ${echoCancellation ? "text-emerald-400" : "text-zinc-550"}`}>
                    {echoCancellation ? "Aktif (ON)" : "Nonaktif (OFF)"}
                  </span>
                </button>
              </div>
            </div>

            {/* Audio interface container */}
            <div className="border border-dashed border-zinc-800 rounded-2xl p-6 bg-zinc-950/40 flex flex-col items-center justify-center min-h-[160px] text-center transition-all">
              {isRecording ? (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center animate-ping duration-1000 mx-auto">
                    <Mic className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-bold text-red-500 text-sm animate-pulse">Sedang Merekam Suara Terjemahan...</div>
                    <div className="text-xs text-zinc-400 mt-1">Bicaralah dengan jelas dekat mikrofon Anda</div>
                  </div>
                </div>
              ) : recordedUrl ? (
                <div className="w-full space-y-4">
                  <div ref={recContainerRef} className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3" />
                  
                  {/* Audio Editor Controls (Trim/Delete) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleRecPlay}
                        className="h-8 text-xs font-semibold border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 bg-zinc-950/40"
                      >
                        {isRecPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                        {isRecPlaying ? "Pause" : "Putar"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTrim}
                        disabled={!selectedRegion}
                        className="h-8 text-xs font-semibold border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 bg-zinc-950/40 disabled:opacity-50"
                      >
                        <Scissors className="w-3.5 h-3.5 mr-1" /> Trim Seleksi
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={!selectedRegion}
                        className="h-8 text-xs font-semibold text-red-400 border-red-950/40 hover:bg-red-950/20 hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Seleksi
                      </Button>
                    </div>

                    {selectedRegion && (
                      <div className="text-[10px] text-zinc-400 font-mono font-bold">
                        Seleksi: {selectedRegion.start.toFixed(2)}s - {selectedRegion.end.toFixed(2)}s (Durasi: {(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Mic className="w-10 h-10 mx-auto text-zinc-500 stroke-[1.2] mb-1" />
                  <p className="text-sm font-semibold text-zinc-300">Siap Merekam</p>
                  <p className="text-xs text-zinc-550">Tekan tombol &quot;Mulai Rekam&quot; di bawah untuk merekam audio terjemahan Anda</p>
                </div>
              )}
            </div>

            {/* INPUT: Text Translation Area */}
            <div className="space-y-2 border-t border-zinc-850 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="translation-input" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Teks Hasil Terjemahan
                </Label>
                {saveStatus === "saving" && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan perubahan...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-[10px] text-emerald-555 flex items-center gap-1 font-semibold animate-fade-in">
                    <Check className="w-3.5 h-3.5" /> Tersimpan otomatis
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-[10px] text-red-500 font-semibold animate-pulse">
                    Gagal menyimpan perubahan!
                  </span>
                )}
              </div>
              <textarea
                id="translation-input"
                value={translationText}
                onChange={(e) => setTranslationText(e.target.value)}
                onBlur={handleTextBlur}
                placeholder="Masukkan ejaan teks hasil terjemahan lisan di sini (Perubahan akan disimpan otomatis saat Anda beralih kolom)..."
                className="flex min-h-[100px] w-full rounded-md border border-zinc-850 bg-zinc-950 px-3 py-2 text-sm shadow-xs placeholder:text-zinc-650 text-zinc-100 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-zinc-850 bg-zinc-900/20 p-4">
            {isRecording ? (
              <Button
                variant="destructive"
                className="w-full font-bold gap-2 h-10.5 shadow-md hover:bg-red-700"
                onClick={stopRecording}
              >
                <Square className="w-4 h-4 fill-white" /> Selesai Perekaman
              </Button>
            ) : (
              <Button
                className="w-full font-bold gap-2 h-10.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                onClick={startRecording}
                disabled={isUploading}
              >
                <Mic className="w-4 h-4" /> Mulai Rekam Baru
              </Button>
            )}

            {recordedBlob && (
              <div className="flex gap-2 w-full">
                <Button
                  className="w-full font-bold gap-2 h-10.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-sm"
                  onClick={handleUploadRecording}
                  disabled={isUploading || isRecording}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah ke Cloudinary...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Kirim Rekaman ke Cloudinary
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-bold gap-2 h-10.5 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 bg-zinc-950/40"
                  onClick={handleDiscardRecording}
                  disabled={isUploading || isRecording}
                >
                  <RotateCcw className="w-4 h-4" /> Buang Rekaman
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Right Column: Reference Audio & Key Terms */}
      <div className="lg:col-span-5 h-full overflow-y-auto p-6 space-y-6 border-t lg:border-t-0 lg:border-l border-zinc-800">
        {/* CARD 1: Audio Referensi & Skrip */}
        <Card className="overflow-hidden border border-zinc-800 bg-zinc-900/50 text-white shadow-2xl">
          <CardHeader className="border-b border-zinc-850 pb-3 bg-zinc-900/10">
            <CardTitle className="text-sm font-bold tracking-wide uppercase text-zinc-400 flex items-center gap-2">
              <Volume2 className="w-4.5 h-4.5 text-indigo-400" /> Audio Referensi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Tab buttons */}
            {audioSources.length > 1 && (
              <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-lg w-fit">
                {audioSources.map((source, index) => (
                  <Button
                    key={source.name}
                    type="button"
                    variant="ghost"
                    onClick={() => handleTabChange(index)}
                    className={`h-8.5 text-xs font-semibold px-4 transition-all rounded-md ${
                      activeTabIdx === index
                        ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900 bg-transparent"
                    }`}
                  >
                    {source.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Script Display Overlay */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 relative min-h-[90px] backdrop-blur-xs">
              <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mb-1.5">
                Naskah Skrip ({audioSources[activeTabIdx]?.name || "Default"})
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                {currentScriptText || <span className="text-zinc-550 italic">Skrip teks tidak tersedia untuk tab ini.</span>}
              </p>
            </div>

            {/* Wavesurfer Container */}
            <div className="space-y-2">
              <div ref={refContainerRef} className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5" />
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleRefPlay}
                  className="h-8 text-xs font-semibold border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 bg-zinc-950/40"
                >
                  {isRefPlaying ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                  {isRefPlaying ? "Pause Referensi" : "Putar Referensi"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {children}
      </div>
    </div>
  );
}
