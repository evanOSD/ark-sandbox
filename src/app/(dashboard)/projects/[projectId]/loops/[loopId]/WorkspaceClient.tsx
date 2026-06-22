"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Square, Check, Loader2, Film, Tag, Save, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMsToTimecode } from "@/lib/timecode";
import { WavRecorder } from "@/lib/wav-recorder";
import { saveRecording, saveKeyTermTranslation } from "../actions";
import { saveLocalRecording, getLocalRecording, clearLocalRecording } from "@/lib/indexeddb";

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  translation?: {
    id: string;
    translated_text: string | null;
    recorded_audio_url: string | null;
  } | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  key_terms: KeyTerm[];
}

export interface Template {
  id: string;
  video_url: string | null;
  audio_url: string | null;
  audio_sources?: Array<{ name: string; url: string }> | null;
  mne_audio_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  template_id: string;
  templates: Template;
}

interface WorkspaceClientProps {
  project: Project;
  loop: Loop;
  existingRecordingUrl: string | null;
}

export function WorkspaceClient({ project, loop, existingRecordingUrl }: WorkspaceClientProps) {
  // Media refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mneAudioRef = useRef<HTMLAudioElement | null>(null);

  // States
  const [isMneEnabled, setIsMneEnabled] = useState(false);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(loop.start_time_ms);

  const audioSources = project.templates.audio_sources || [];
  const hasMultipleAudio = audioSources.length > 0;

  // Active audio URL state
  const [activeAudioUrl, setActiveAudioUrl] = useState<string>(() => {
    if (audioSources.length > 0) {
      return audioSources[0].url;
    }
    return project.templates.audio_url || "";
  });

  const [activeAudioName, setActiveAudioName] = useState<string>(() => {
    if (audioSources.length > 0) {
      return audioSources[0].name;
    }
    return "Default";
  });

  // Track latest playing status and current time in refs to prevent stale closure in async loaders
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const currentTimeMsRef = useRef(currentTimeMs);
  useEffect(() => {
    currentTimeMsRef.current = currentTimeMs;
  }, [currentTimeMs]);

  // Handle source swapping for audio dynamically
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Resolve URL to compare absolute locations correctly
    const resolvedUrl = activeAudioUrl.startsWith("/")
      ? window.location.origin + activeAudioUrl
      : activeAudioUrl;

    if (audio.src === resolvedUrl) return;

    audio.pause();
    audio.src = activeAudioUrl;
    audio.load();

    const setPositionAndPlay = () => {
      audio.currentTime = currentTimeMsRef.current / 1000;
      if (isPlayingRef.current) {
        audio.play().catch((err) => console.log("Audio play postponed:", err));
      }
    };

    if (audio.readyState >= 1) { // HAVE_METADATA or higher
      setPositionAndPlay();
    } else {
      audio.addEventListener("loadedmetadata", setPositionAndPlay, { once: true });
    }

    return () => {
      audio.removeEventListener("loadedmetadata", setPositionAndPlay);
    };
  }, [activeAudioUrl]);

  // Handle source swapping for M&E audio dynamically
  useEffect(() => {
    const mne = mneAudioRef.current;
    if (!mne || !project.templates.mne_audio_url) return;

    if (mne.src === project.templates.mne_audio_url) return;

    mne.pause();
    mne.src = project.templates.mne_audio_url;
    mne.load();

    const setPositionAndPlay = () => {
      mne.currentTime = currentTimeMsRef.current / 1000;
      if (isPlayingRef.current && isMneEnabled) {
        mne.play().catch((err) => console.log("M&E play postponed:", err));
      }
    };

    if (mne.readyState >= 1) {
      setPositionAndPlay();
    } else {
      mne.addEventListener("loadedmetadata", setPositionAndPlay, { once: true });
    }

    return () => {
      mne.removeEventListener("loadedmetadata", setPositionAndPlay);
    };
  }, [project.templates.mne_audio_url, isMneEnabled]);

  // Main Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(existingRecordingUrl);
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Key Term Translation states initialized from props
  const [termTranslations, setTermTranslations] = useState<
    Record<string, { text: string; blob: Blob | null; url: string | null; isRecording: boolean; instance: WavRecorder | null }>
  >(() => {
    const initial: Record<string, { text: string; blob: Blob | null; url: string | null; isRecording: boolean; instance: WavRecorder | null }> = {};
    loop.key_terms.forEach((term) => {
      initial[term.id] = {
        text: term.translation?.translated_text || "",
        blob: null,
        url: term.translation?.recorded_audio_url || null,
        isRecording: false,
        instance: null,
      };
    });
    return initial;
  });

  // Load temp recording from IndexedDB on mount
  useEffect(() => {
    async function loadTempRecording() {
      const tempBlob = await getLocalRecording(project.id, loop.id);
      if (tempBlob) {
        setRecordedBlob(tempBlob);
        setRecordedUrl(URL.createObjectURL(tempBlob));
      }
    }
    loadTempRecording();
  }, [project.id, loop.id]);

  // Set media start times on load
  useEffect(() => {
    const startSec = loop.start_time_ms / 1000;
    if (videoRef.current) {
      videoRef.current.currentTime = startSec;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = startSec;
    }
    if (mneAudioRef.current) {
      mneAudioRef.current.currentTime = startSec;
    }
  }, [loop.start_time_ms]);

  // Synchronize audio elements with native video controls
  const handlePlay = () => {
    setIsPlaying(true);
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch((err) => console.log("Audio play postponed:", err));
    }
    if (isMneEnabled && mneAudioRef.current && mneAudioRef.current.paused) {
      mneAudioRef.current.play().catch((err) => console.log("M&E play postponed:", err));
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    if (mneAudioRef.current && !mneAudioRef.current.paused) {
      mneAudioRef.current.pause();
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      if (audioRef.current) {
        audioRef.current.currentTime = videoRef.current.currentTime;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.currentTime = videoRef.current.currentTime;
      }
    }
  };

  const handleRateChange = () => {
    if (videoRef.current) {
      if (audioRef.current) {
        audioRef.current.playbackRate = videoRef.current.playbackRate;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.playbackRate = videoRef.current.playbackRate;
      }
    }
  };

  // Media sync loop & boundaries check
  const handleTimeUpdate = () => {
    const media = videoRef.current || audioRef.current;
    if (!media) return;

    const currentMs = Math.round(media.currentTime * 1000);
    setCurrentTimeMs(currentMs);

    // Stop playback at boundary
    if (currentMs >= loop.end_time_ms) {
      const startSec = loop.start_time_ms / 1000;
      if (videoRef.current) {
        videoRef.current.currentTime = startSec;
        videoRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = startSec;
        audioRef.current.pause();
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.currentTime = startSec;
        mneAudioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTimeMs(loop.start_time_ms);
    }
  };

  const handleToggleMne = () => {
    const nextState = !isMneEnabled;
    setIsMneEnabled(nextState);
    if (mneAudioRef.current) {
      if (nextState) {
        mneAudioRef.current.currentTime = videoRef.current ? videoRef.current.currentTime : (loop.start_time_ms / 1000);
        if (isPlaying) {
          mneAudioRef.current.play().catch((err) => console.log("MNE play error:", err));
        }
      } else {
        mneAudioRef.current.pause();
      }
    }
  };

  // Start Main Loop Recording
  const startMainRecording = async () => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setRecorderInstance(recorder);
      setIsRecording(true);
      setRecordedBlob(null);

      // Pause playback when recording starts
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  // Stop Main Loop Recording
  const stopMainRecording = async () => {
    if (!recorderInstance) return;
    const blob = recorderInstance.stop();
    setRecordedBlob(blob);
    setRecordedUrl(URL.createObjectURL(blob));
    setIsRecording(false);
    setRecorderInstance(null);

    // Save to IndexedDB locally
    await saveLocalRecording(project.id, loop.id, blob);
  };

  // Submit main audio recording
  const handleSubmitRecording = async () => {
    if (!recordedBlob) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("audio", new File([recordedBlob], "recording.wav", { type: "audio/wav" }));
      await saveRecording(project.id, loop.id, formData);

      // Clear from IndexedDB on successful upload
      await clearLocalRecording(project.id, loop.id);

      alert("Rekaman berhasil dikirim!");
    } catch (err) {
      alert("Gagal menyimpan rekaman: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsSaving(false);
    }
  };

  // Key Term Audio Recording Handlers
  const startTermRecording = async (termId: string) => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setTermTranslations((prev) => ({
        ...prev,
        [termId]: {
          ...prev[termId],
          isRecording: true,
          instance: recorder,
          blob: null,
        },
      }));
    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  const stopTermRecording = (termId: string) => {
    const state = termTranslations[termId];
    if (!state?.instance) return;

    const blob = state.instance.stop();
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        isRecording: false,
        instance: null,
        blob: blob,
        url: URL.createObjectURL(blob),
      },
    }));
  };

  const handleTermTextChange = (termId: string, val: string) => {
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        text: val,
      },
    }));
  };

  const saveTermTranslation = async (termId: string) => {
    const state = termTranslations[termId];
    if (!state) return;

    setIsSaving(true);
    try {
      const file = state.blob
        ? new File([state.blob], `term-${termId}.wav`, { type: "audio/wav" })
        : null;

      await saveKeyTermTranslation(project.id, termId, state.text, file);
      alert("Terjemahan kata kunci berhasil disimpan!");
    } catch (err) {
      alert("Gagal menyimpan kata kunci: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsSaving(false);
    }
  };

  const isUnsavedLocal = recordedBlob !== null;

  return (
    <div className="space-y-6">
      {/* Back to Project */}
      <div className="space-y-1">
        <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground text-sm flex items-center gap-2">
          Putaran: <span className="font-semibold text-foreground">{loop.name}</span>
          <span className="text-xs border rounded-full px-2 py-0.5 bg-muted">
            {formatMsToTimecode(loop.start_time_ms)} - {formatMsToTimecode(loop.end_time_ms)}
          </span>
        </p>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Native Player */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="overflow-hidden bg-zinc-950 border-zinc-800 text-white p-4">
            {/* Audio selector tabs */}
            {(hasMultipleAudio || project.templates.mne_audio_url) && (
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850">
                {hasMultipleAudio && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-zinc-400 self-center">Sumber Audio:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {audioSources.map((source) => (
                        <Button
                          key={source.name}
                          type="button"
                          variant={activeAudioName === source.name ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setActiveAudioUrl(source.url);
                            setActiveAudioName(source.name);
                          }}
                          className="h-8 text-xs font-semibold"
                        >
                          {source.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {project.templates.mne_audio_url && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-zinc-400 self-center">M&E Track:</span>
                    <Button
                      type="button"
                      variant={isMneEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleMne}
                      className={cn(
                        "h-8 text-xs font-semibold px-3",
                        isMneEnabled
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                          : "border-zinc-800 text-zinc-450 hover:text-white"
                      )}
                    >
                      <Music className="w-3.5 h-3.5 mr-1" />
                      {isMneEnabled ? "M&E Aktif" : "M&E Nonaktif"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Video / Audio Player Container */}
            <div className="bg-black flex flex-col items-center justify-center min-h-[300px] rounded-lg overflow-hidden border border-zinc-800 relative">
              {project.templates.video_url ? (
                <video
                  ref={videoRef}
                  src={project.templates.video_url}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeeked={handleSeeked}
                  onRateChange={handleRateChange}
                  controls
                  className="w-full h-auto max-h-[400px] object-contain"
                  playsInline
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500 py-12">
                  <Film className="h-12 w-12 stroke-[1.5]" />
                  <span className="text-sm">Video tidak tersedia. Menggunakan pemutar audio.</span>
                </div>
              )}

              {/* Reference Audio element (if audio url exists) */}
              {activeAudioUrl && (
                <audio
                  ref={audioRef}
                  src={activeAudioUrl}
                  onTimeUpdate={!project.templates.video_url ? handleTimeUpdate : undefined}
                  controls={!project.templates.video_url}
                  className={!project.templates.video_url ? "w-full p-2 bg-zinc-900 border-t border-zinc-800" : "hidden"}
                />
              )}

              {project.templates.mne_audio_url && (
                <audio
                  ref={mneAudioRef}
                  src={project.templates.mne_audio_url}
                  className="hidden"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Recording & Key Terms */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Recording Panel */}
          <Card className="border-primary/20 shadow-lg relative overflow-hidden">
            {/* Background highlights */}
            {isRecording && (
              <div className="absolute inset-0 bg-red-500/5 border border-red-500/20 animate-pulse pointer-events-none" />
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" /> Perekam Terjemahan Suara
              </CardTitle>
              <CardDescription>
                Rekam suara terjemahan lisan Anda untuk putaran ini. Format keluaran PCM WAV 16-bit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unsaved local recording warning */}
              {isUnsavedLocal && (
                <div className="bg-amber-500/10 text-amber-500 text-xs px-3 py-2 rounded-lg border border-amber-500/20 text-center font-medium animate-pulse">
                  Ada rekaman belum terkirim yang tersimpan di browser Anda.
                </div>
              )}

              {/* Voice waveform/indicator placeholder */}
              <div className="border rounded-xl p-8 bg-muted/30 flex flex-col items-center justify-center relative min-h-[140px] text-center border-dashed">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center animate-ping mx-auto duration-1000">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-red-500 text-sm animate-pulse">Sedang Merekam Suara...</div>
                    <div className="text-xs text-muted-foreground">Bicaralah dengan jelas dekat mikrofon Anda</div>
                  </div>
                ) : recordedUrl ? (
                  <div className="space-y-3 w-full">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full border border-green-500/20">
                      Hasil Rekaman Tersedia
                    </span>
                    <audio src={recordedUrl} controls className="w-full mx-auto" />
                    {recordedBlob && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Ukuran File: {(recordedBlob.size / 1024).toFixed(1)} KB | Format: WAV (PCM)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-400 space-y-1">
                    <Mic className="w-8 h-8 mx-auto stroke-[1.2] mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Siap Merekam</p>
                    <p className="text-xs">Klik tombol &quot;Mulai Rekam&quot; di bawah</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t bg-muted/10 p-4">
              {isRecording ? (
                <Button variant="destructive" className="w-full font-semibold gap-2 h-10 shadow-sm" onClick={stopMainRecording}>
                  <Square className="w-4 h-4 fill-white" /> Selesai Perekaman
                </Button>
              ) : (
                <Button className="w-full font-semibold gap-2 h-10 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={startMainRecording}>
                  <Mic className="w-4 h-4" /> Mulai Rekam
                </Button>
              )}

              {recordedBlob && (
                <div className="flex gap-2 w-full">
                  <Button
                    className="w-full font-semibold gap-2 h-10"
                    onClick={handleSubmitRecording}
                    disabled={isSaving || isRecording}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Kirim Rekaman
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full font-semibold gap-2 h-10"
                    onClick={async () => {
                      if (confirm("Buang rekaman sementara ini?")) {
                        await clearLocalRecording(project.id, loop.id);
                        setRecordedBlob(null);
                        setRecordedUrl(existingRecordingUrl);
                      }
                    }}
                    disabled={isSaving || isRecording}
                  >
                    Buang
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>

          {/* Key Terms Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-primary" /> Kamus Kata Kunci (Key Terms)
              </CardTitle>
              <CardDescription>
                Kata kunci di putaran ini yang perlu disepakati ejaan dan pelafalannya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {loop.key_terms.map((term) => {
                const trans = termTranslations[term.id] || { text: "", blob: null, url: null, isRecording: false };

                return (
                  <div key={term.id} className="border rounded-lg p-3.5 space-y-3 hover:border-primary/20 transition-all bg-card/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{term.term}</h4>
                        {term.original_word && (
                          <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
                            Bahasa Asal: {term.original_word}
                          </span>
                        )}
                      </div>
                    </div>
                    {term.meaning_or_note && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        Definisi: {term.meaning_or_note}
                      </p>
                    )}

                    <div className="border-t pt-3 space-y-2.5">
                      {/* Text Translation Input */}
                      <div className="space-y-1">
                        <Label htmlFor={`t-text-${term.id}`} className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Ejaan Terjemahan Lokal
                        </Label>
                        <Input
                          id={`t-text-${term.id}`}
                          value={trans.text}
                          onChange={(e) => handleTermTextChange(term.id, e.target.value)}
                          placeholder="Ketik ejaan/kata terjemahan lokal..."
                          className="h-8.5 text-xs bg-background/50"
                        />
                      </div>

                      {/* Oral Audio Translation */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Rekaman Suara Pelafalan
                        </Label>
                        <div className="flex items-center gap-2">
                          {trans.isRecording ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-3 font-semibold text-xs gap-1"
                              onClick={() => stopTermRecording(term.id)}
                            >
                              <Square className="w-3.5 h-3.5 fill-white" /> Stop
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 font-semibold text-xs gap-1 border-primary/20 hover:border-primary/40 text-primary bg-primary/5"
                              onClick={() => startTermRecording(term.id)}
                            >
                              <Mic className="w-3.5 h-3.5" /> Rekam Pelafalan
                            </Button>
                          )}

                          {trans.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 font-semibold text-xs gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const audio = new Audio(trans.url!);
                                audio.play();
                              }}
                            >
                              Putar Pelafalan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Save Key Term Translation Button */}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => saveTermTranslation(term.id)}
                          disabled={isSaving || trans.isRecording}
                          className="h-8 font-semibold text-xs gap-1 px-3 border border-border"
                        >
                          <Save className="w-3.5 h-3.5" /> Simpan Kata Kunci
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loop.key_terms.length === 0 && (
                <div className="text-center p-6 text-xs text-muted-foreground">
                  Tidak ada kata kunci yang ditempelkan di putaran ini.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
