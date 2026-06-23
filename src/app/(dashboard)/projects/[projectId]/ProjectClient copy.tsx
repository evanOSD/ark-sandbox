"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Music,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  MessageSquare,
  ShieldCheck,
  Star,
  Film,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateRecordingStatus, deleteRecording } from "./actions";

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
}

export interface Recording {
  id: string;
  recorded_audio_url: string;
  status: "pending" | "recorded" | "approved";
  recorded_by_user?: { username: string } | null;
  created_at: string;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  key_terms: KeyTerm[];
  recording?: Recording | null;
}

export interface Scene {
  id: string;
  name: string;
  sequence_number: number;
  loops: Loop[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  template_id: string;
  templates?: {
    name: string;
    video_url: string | null;
    audio_url: string | null;
    audio_sources?: Array<{ name: string; url: string }> | null;
    mne_audio_url?: string | null;
  } | null;
}

interface ProjectClientProps {
  project: Project;
  scenes: Scene[];
  isAdmin: boolean;
}

interface Note {
  id: string;
  author: string;
  age: string;
  text: string;
  loopName: string;
}

// Define structured mock texts from the screenshot for template loops
const MOCK_LOOP_TEXTS: Record<string, { speaker: string; lineNum: number; text: string; note?: string }> = {
  "PT-01": {
    speaker: "OG01",
    lineNum: 1,
    text: "In the beginning, God created the world. He created the sky and the earth and everything in them. [When we look at all that God has made, it is amazing.]"
  },
  "PT-02": {
    speaker: "OG01",
    lineNum: 2,
    text: "Everything God made was good. Everything reveals his [greatness and] goodness and power."
  },
  "PT-03": {
    speaker: "OG02",
    lineNum: 1,
    text: "God created all the different kinds of plants and animals."
  },
  "PT-04": {
    speaker: "OG02",
    lineNum: 2,
    text: "Then he formed the first man from the soil (1) he breathed into his nostrils and gave him life(2).",
    note: "(1) OR: He took soil from the ground and made the first man. (2) OR He breathed into his nostrils and caused him to live"
  },
  "PT-05": {
    speaker: "OG02",
    lineNum: 3,
    text: "The first man was called Adam."
  },
  "PT-06": {
    speaker: "OG03",
    lineNum: 1,
    text: "Then God created a woman(1) to be Adam's wife and companion. She was called Eve. [God created the man and the woman(2) so that they could enjoy a close relationship(3) with him.(4)] They lived with happiness in his presence in a beautiful garden(5) [called Eden(6)]. There was no suffering and no death.",
    note: "(1) OR: the first woman (2) OR Adam and Eve (3) OR in his likeness OR: to resemble himself [Be careful not to imply that human beings would be exactly the same as God.] (4) OR: fellowship OR: communion (5) OR: so that they could live in friendship with him OR: so that they could walk together with him. (In some languages, walk with implies 'relationship'.) (6) OR place (7) OR: in the place he had prepared for them"
  },
  "PT-07": {
    speaker: "OG03",
    lineNum: 2,
    text: "This is another line for PT-07."
  }
};

export function ProjectClient({ project, scenes, isAdmin }: ProjectClientProps) {
  // Sort scenes
  const sortedScenes = [...scenes].sort((a, b) => a.sequence_number - b.sequence_number);
  sortedScenes.forEach((s) => {
    s.loops = [...s.loops].sort((a, b) => a.sequence_number - b.sequence_number);
  });

  // State
  const [activeTab, setActiveTab] = useState<"draft" | "keyTerms" | "transcribe" | "backTranslate" | "consult">("draft");
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Video states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Audio reference selection
  const audioSources = project.templates?.audio_sources || [];
  const [activeAudioUrl, setActiveAudioUrl] = useState<string>(() => {
    if (audioSources.length > 0) return audioSources[0].url;
    return project.templates?.audio_url || "";
  });

  // M&E audio states
  const mneAudioRef = useRef<HTMLAudioElement | null>(null);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMneEnabled, setIsMneEnabled] = useState(false);
  const [activeLoopPlayId, setActiveLoopPlayId] = useState<string | null>(null);

  // Notes state matching screenshot
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      author: "unknown",
      age: "29 wks",
      text: "hjdhkjhkj",
      loopName: "PT-01",
    },
    {
      id: "2",
      author: "unknown",
      age: "27 wks",
      text: "blm direkam",
      loopName: "PT-03",
    },
  ]);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedNoteLoop, setSelectedNoteLoop] = useState("");

  const activeScene = sortedScenes[activeSceneIndex] || null;



  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPlaying) {
      video.pause();
      if (refAudioRef.current) {
        refAudioRef.current.pause();
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.pause();
      }
      setIsVideoPlaying(false);
      setActiveLoopPlayId(null);
    } else {
      video.play().catch((err) => console.log("Video playback postponed:", err));
      if (refAudioRef.current) {
        refAudioRef.current.currentTime = video.currentTime;
        refAudioRef.current.play().catch((err) => console.log("Ref audio play error:", err));
      }
      if (isMneEnabled && mneAudioRef.current) {
        mneAudioRef.current.currentTime = video.currentTime;
        mneAudioRef.current.play().catch((err) => console.log("MNE play error:", err));
      }
      setIsVideoPlaying(true);
    }
  };

  const handleStopVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsVideoPlaying(false);
    setActiveLoopPlayId(null);

    if (refAudioRef.current) {
      refAudioRef.current.pause();
    }
    if (mneAudioRef.current) {
      mneAudioRef.current.pause();
    }

    // Find the first loop in the active scene and seek to its start time
    const firstLoop = activeScene?.loops?.[0];
    const targetMs = firstLoop ? firstLoop.start_time_ms : 0;
    video.currentTime = targetMs / 1000;
    if (refAudioRef.current) {
      refAudioRef.current.currentTime = targetMs / 1000;
    }
    if (mneAudioRef.current) {
      mneAudioRef.current.currentTime = targetMs / 1000;
    }
  };

  // Synchronize M&E and Reference audio, and handle loop boundary stops
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlaySync = () => {
      if (refAudioRef.current && refAudioRef.current.paused) {
        refAudioRef.current.currentTime = video.currentTime;
        refAudioRef.current.play().catch((err) => console.log("Ref audio play error:", err));
      }
      if (isMneEnabled && mneAudioRef.current && mneAudioRef.current.paused) {
        mneAudioRef.current.currentTime = video.currentTime;
        mneAudioRef.current.play().catch((err) => console.log("MNE play error:", err));
      }
    };

    const handlePauseSync = () => {
      if (refAudioRef.current && !refAudioRef.current.paused) {
        refAudioRef.current.pause();
      }
      if (mneAudioRef.current && !mneAudioRef.current.paused) {
        mneAudioRef.current.pause();
      }
    };

    const handleSeekSync = () => {
      if (refAudioRef.current) {
        refAudioRef.current.currentTime = video.currentTime;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.currentTime = video.currentTime;
      }
    };

    const handleRateChangeSync = () => {
      if (refAudioRef.current) {
        refAudioRef.current.playbackRate = video.playbackRate;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.playbackRate = video.playbackRate;
      }
    };

    const handleTimeUpdateSync = () => {
      if (!activeLoopPlayId || !activeScene) return;
      const currentLoop = activeScene.loops.find((l) => l.id === activeLoopPlayId);
      if (!currentLoop) return;

      const currentTimeMs = video.currentTime * 1000;
      if (currentTimeMs >= currentLoop.end_time_ms) {
        // Stop playback
        video.pause();
        setIsVideoPlaying(false);
        setActiveLoopPlayId(null);

        // Pause synchronized audios
        if (refAudioRef.current) {
          refAudioRef.current.pause();
        }
        if (mneAudioRef.current) {
          mneAudioRef.current.pause();
        }

        // Seek back to start time
        video.currentTime = currentLoop.start_time_ms / 1000;
        if (refAudioRef.current) {
          refAudioRef.current.currentTime = currentLoop.start_time_ms / 1000;
        }
        if (mneAudioRef.current) {
          mneAudioRef.current.currentTime = currentLoop.start_time_ms / 1000;
        }
      }
    };

    video.addEventListener("play", handlePlaySync);
    video.addEventListener("pause", handlePauseSync);
    video.addEventListener("seeking", handleSeekSync);
    video.addEventListener("ratechange", handleRateChangeSync);
    video.addEventListener("timeupdate", handleTimeUpdateSync);

    return () => {
      video.removeEventListener("play", handlePlaySync);
      video.removeEventListener("pause", handlePauseSync);
      video.removeEventListener("seeking", handleSeekSync);
      video.removeEventListener("ratechange", handleRateChangeSync);
      video.removeEventListener("timeupdate", handleTimeUpdateSync);
    };
  }, [isMneEnabled, activeLoopPlayId, activeScene]);

  // Handle source swapping for reference audio dynamically
  useEffect(() => {
    const refAudio = refAudioRef.current;
    if (!refAudio || !activeAudioUrl) return;

    // Resolve URL to compare absolute locations correctly
    const resolvedUrl = activeAudioUrl.startsWith("/")
      ? window.location.origin + activeAudioUrl
      : activeAudioUrl;

    if (refAudio.src === resolvedUrl) return;

    refAudio.pause();
    refAudio.src = activeAudioUrl;
    refAudio.load();

    const setPositionAndPlay = () => {
      refAudio.currentTime = videoRef.current ? videoRef.current.currentTime : 0;
      if (isVideoPlaying) {
        refAudio.play().catch((err) => console.log("Ref audio play postponed:", err));
      }
    };

    if (refAudio.readyState >= 1) { // HAVE_METADATA or higher
      setPositionAndPlay();
    } else {
      refAudio.addEventListener("loadedmetadata", setPositionAndPlay, { once: true });
    }

    return () => {
      refAudio.removeEventListener("loadedmetadata", setPositionAndPlay);
    };
  }, [activeAudioUrl, isVideoPlaying]);

  const handleToggleMne = () => {
    const nextState = !isMneEnabled;
    setIsMneEnabled(nextState);
    if (mneAudioRef.current) {
      if (nextState) {
        mneAudioRef.current.currentTime = videoRef.current ? videoRef.current.currentTime : 0;
        if (isVideoPlaying) {
          mneAudioRef.current.play().catch((err) => console.log("MNE play error:", err));
        }
      } else {
        mneAudioRef.current.pause();
      }
    }
  };

  const handlePlayLoop = (loopId: string, startMs: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (activeLoopPlayId === loopId) {
      // Stop playback
      video.pause();
      setIsVideoPlaying(false);
      setActiveLoopPlayId(null);

      if (refAudioRef.current) {
        refAudioRef.current.pause();
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.pause();
      }

      // Seek back to start time
      video.currentTime = startMs / 1000;
      if (refAudioRef.current) {
        refAudioRef.current.currentTime = startMs / 1000;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.currentTime = startMs / 1000;
      }
    } else {
      // Seek all elements to start time first
      video.currentTime = startMs / 1000;
      if (refAudioRef.current) {
        refAudioRef.current.currentTime = startMs / 1000;
      }
      if (mneAudioRef.current) {
        mneAudioRef.current.currentTime = startMs / 1000;
      }

      setActiveLoopPlayId(loopId);

      // Play video (sync will trigger play on reference and MNE)
      video.play().catch((err) => console.log("Loop video play error:", err));
      setIsVideoPlaying(true);
    }
  };

  // Play User Audio Recording Handler
  const handlePlayAudio = (url: string, recId: string) => {
    if (audioElement && playingAudioId === recId) {
      audioElement.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      setPlayingAudioId(null);
    });
    audio.play().catch((err) => console.log("Audio play deferred:", err));
    setPlayingAudioId(recId);
    setAudioElement(audio);
  };

  // Status handler (approve / reject)
  const handleStatusChange = async (recId: string, status: "pending" | "recorded" | "approved") => {
    setIsLoading(true);
    try {
      await updateRecordingStatus(project.id, recId, status);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui status");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete handler
  const handleDeleteRecording = async (recId: string) => {
    if (!confirm("Apakah Anda yakin ingin menolak & menghapus rekaman ini?")) return;
    setIsLoading(true);
    try {
      await deleteRecording(project.id, recId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus rekaman");
    } finally {
      setIsLoading(false);
    }
  };

  // Add Comment/Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: Note = {
      id: `note-${notes.length}-${newNoteText.substring(0, 10)}-${notes.reduce((acc, n) => acc + n.text.length, 0)}`,
      author: "unknown",
      age: "Just now",
      text: newNoteText,
      loopName: selectedNoteLoop || (activeScene?.loops?.[0]?.name || "Umum"),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNewNoteText("");
  };

  // Map loops to display text from mock data
  const loopsWithDisplay = (activeScene?.loops || []).map((loop) => {
    if (MOCK_LOOP_TEXTS[loop.name]) {
      return { loop, ...MOCK_LOOP_TEXTS[loop.name] };
    }
    const ptMatch = loop.name.match(/PT-0?(\d+)/i);
    if (ptMatch) {
      const num = parseInt(ptMatch[1], 10);
      const mockKey = `PT-${String(num).padStart(2, "0")}`;
      if (MOCK_LOOP_TEXTS[mockKey]) {
        return { loop, ...MOCK_LOOP_TEXTS[mockKey] };
      }
    }

    return {
      loop,
      text: `Rujukan teks draf untuk ${loop.name}.`,
      note: undefined as string | undefined,
    };
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      
      {/* 1. Header/Top Bar */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400 hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-zinc-200">{project.name}</span>
            {isAdmin && (
              <Link href={`/projects/${project.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-primary" title="Edit Proyek">
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Center: Scene Selector Switcher */}
        {sortedScenes.length > 0 && (
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 px-3 py-1 rounded text-xs select-none">
            <button
              type="button"
              className="text-zinc-500 hover:text-white disabled:opacity-30"
              onClick={() => setActiveSceneIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeSceneIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-black text-zinc-100 px-2 tracking-wide uppercase">
              {activeSceneIndex + 1} - {activeScene?.name || "Scene"}
            </span>
            <button
              type="button"
              className="text-zinc-500 hover:text-white disabled:opacity-30"
              onClick={() => setActiveSceneIndex((prev) => Math.min(sortedScenes.length - 1, prev + 1))}
              disabled={activeSceneIndex === sortedScenes.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Right side info (removed S/R Status) */}
        <div className="w-12 h-4 shrink-0" />
      </header>

      {/* 2. Main split container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column (Video Player & Notes/Comments) */}
        <div className="w-[40%] flex flex-col border-r border-zinc-800 overflow-hidden shrink-0">
          
          {/* Top Half: Video Player */}
          <div className="bg-black relative flex flex-col justify-between overflow-hidden border-b border-zinc-800 h-[50%] shrink-0">
            <div className="flex-1 relative bg-zinc-950 min-h-0 overflow-hidden">
              {project.templates?.video_url ? (
                <video
                  ref={videoRef}
                  src={project.templates.video_url}
                  className="absolute inset-0 w-full h-full object-contain"
                  onClick={toggleVideoPlayback}
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-650">
                  <Film className="h-14 w-14 stroke-[1.2] animate-pulse" />
                  <span className="text-xs font-bold">Video referensi tidak terunggah</span>
                </div>
              )}
              {project.templates?.mne_audio_url && (
                <audio
                  ref={mneAudioRef}
                  src={project.templates.mne_audio_url}
                  className="hidden"
                />
              )}
              {activeAudioUrl && (
                <audio
                  ref={refAudioRef}
                  src={activeAudioUrl}
                  className="hidden"
                />
              )}
            </div>

            {/* Video Controls Bar matching screenshot */}
            <div className="h-10 bg-zinc-900 border-t border-zinc-850 flex items-center gap-3 px-3 shrink-0 select-none">
              <div className="flex items-center text-zinc-500">
                <Film className="h-4 w-4" />
              </div>

              <button
                type="button"
                onClick={toggleVideoPlayback}
                className="h-7 w-7 text-zinc-300 hover:text-white border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors shrink-0"
                title={isVideoPlaying ? "Pause" : "Play"}
              >
                {isVideoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-zinc-300 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleStopVideo}
                className="h-7 w-7 text-zinc-300 hover:text-white border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors shrink-0"
                title="Stop & Reset"
              >
                <Square className="h-3 w-3 fill-zinc-300" />
              </button>

              <button
                type="button"
                onClick={handleToggleMne}
                disabled={!project.templates?.mne_audio_url}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center transition-colors shrink-0 border",
                  !project.templates?.mne_audio_url
                    ? "opacity-30 cursor-not-allowed text-zinc-600 border-zinc-850"
                    : isMneEnabled
                    ? "bg-amber-600 border-transparent text-white hover:bg-amber-700"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                )}
                title={project.templates?.mne_audio_url ? "Toggle M&E (Music & Effects)" : "M&E tidak tersedia"}
              >
                <Music className={cn("h-3.5 w-3.5", isMneEnabled && "animate-pulse")} />
              </button>

              <div className="flex items-center shrink-0">
                <select
                  value={activeAudioUrl}
                  onChange={(e) => {
                    const selected = audioSources.find((src) => src.url === e.target.value);
                    if (selected) {
                      setActiveAudioUrl(selected.url);
                    }
                  }}
                  className="bg-zinc-950 border border-zinc-850 text-[10px] font-mono rounded px-2 py-1 text-zinc-400 focus:outline-none focus:border-zinc-700 cursor-pointer"
                >
                  {audioSources.map((source) => (
                    <option key={source.name} value={source.url}>
                      {source.name.endsWith('.wav') ? source.name : `${source.name}.wav`}
                    </option>
                  ))}
                  {audioSources.length === 0 && (
                    <option value="">default_audio.wav</option>
                  )}
                </select>
              </div>

              <div className="flex-1 h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-zinc-650" />
              </div>
            </div>
          </div>

          {/* Bottom Half: Notes/Comments Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/30">
            <div className="h-9 border-b border-zinc-800 bg-zinc-900/80 px-3 flex items-center gap-2 shrink-0 select-none">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Notes</span>
              <span className="text-zinc-650">|</span>
              <button
                type="button"
                className="text-zinc-400 hover:text-white flex items-center gap-0.5 text-xs font-bold"
                onClick={() => document.getElementById("new-note-input")?.focus()}
                title="Add Note"
              >
                <MessageSquare className="h-4 w-4" />
                <Plus className="h-3 w-3 -ml-1 mt-1 font-bold" />
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {notes.map((note) => (
                <div key={note.id} className="border border-zinc-800/80 bg-zinc-950/45 rounded p-2.5 space-y-1.5 hover:border-zinc-750 transition-colors">
                  <div className="flex items-start justify-between text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500/70" />
                      <span className="font-semibold text-zinc-300">{note.author}</span>
                      <span>[{note.age}]</span>
                    </div>
                    <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-[9px] text-amber-600/80">
                      {note.loopName}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed pl-4 border-l border-zinc-800">
                    {note.text}
                  </p>
                  <div className="flex items-center justify-end gap-3 text-[9px] text-zinc-550 font-semibold pt-1">
                    <button type="button" className="hover:text-zinc-300 transition-colors">Add Comment</button>
                    <button
                      type="button"
                      disabled={isLoading}
                      className="hover:text-red-400 disabled:opacity-50 transition-colors"
                      onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                    >
                      Delete Note
                    </button>
                    <button type="button" className="hover:text-zinc-300 transition-colors">Unassigned</button>
                  </div>
                </div>
              ))}

              {notes.length === 0 && (
                <div className="text-center py-8 text-xs text-zinc-650 italic">
                  Belum ada catatan proyek.
                </div>
              )}
            </div>

            {/* Note Input Box */}
            <form onSubmit={handleAddNote} className="p-2.5 border-t border-zinc-800 bg-zinc-900/60 flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <select
                  value={selectedNoteLoop}
                  onChange={(e) => setSelectedNoteLoop(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] rounded p-1 text-zinc-400 focus:outline-none focus:border-zinc-700 w-fit cursor-pointer"
                >
                  <option value="">Pilih Loop (Opsional)</option>
                  {activeScene?.loops.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-note-input"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Ketik catatan atau umpan balik baru..."
                  className="h-8.5 text-xs bg-zinc-950 border-zinc-850"
                  required
                />
                <Button type="submit" size="sm" disabled={isLoading} className="h-8 px-3 font-semibold text-xs shrink-0">
                  Kirim
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (Editor Workspace Area) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          
          {/* Tabs row */}
          <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex shrink-0">
            {(["draft", "keyTerms", "transcribe", "backTranslate", "consult"] as const).map((tab) => {
              const labels: Record<string, string> = {
                draft: "Draft",
                keyTerms: "Key Terms",
                transcribe: "Transcribe",
                backTranslate: "Back Translate",
                consult: "Consult",
              };
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 text-xs font-bold tracking-wide uppercase border-r border-zinc-850 transition-all text-center focus:outline-none",
                    isActive
                      ? "bg-zinc-950 text-amber-500 border-b border-b-amber-500 font-black"
                      : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-200"
                  )}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Workspace Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Scrollable loop entries based on selected tab */}
            <div className="flex-1 overflow-y-auto">
              
              {activeTab === "draft" && (
                <div className="divide-y divide-zinc-850">
                  {activeScene ? (
                    loopsWithDisplay.map(({ loop, text, note }) => {
                      const rec = loop.recording;
                      return (
                        <div key={loop.id} className="p-3.5 flex items-start gap-4 hover:bg-zinc-900/10 transition-colors">
                          {/* Play Loop Button (simultaneous video, ref audio, and MNE) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors",
                              activeLoopPlayId === loop.id
                                ? "bg-amber-600 border-transparent text-white hover:bg-amber-700"
                                : "text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-800"
                            )}
                            onClick={() => handlePlayLoop(loop.id, loop.start_time_ms)}
                            title={activeLoopPlayId === loop.id ? "Hentikan Pemutaran Loop" : "Putar Loop (Video & Audio)"}
                          >
                            {activeLoopPlayId === loop.id ? (
                              <Square className="h-2.5 w-2.5 fill-current" />
                            ) : (
                              <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                            )}
                          </Button>

                          {/* Loop Name */}
                          <span className="text-xs font-bold text-zinc-500 font-mono shrink-0 select-none w-12 mt-1">
                            {loop.name}
                          </span>

                          {/* Text & Alternate Notes */}
                          <div className="flex-1 space-y-1.5">
                            <p className="text-xs text-zinc-200 leading-relaxed font-semibold">
                              {text}
                            </p>
                            {note && (
                              <p className="text-[10px] text-zinc-500 leading-relaxed pl-3 border-l border-zinc-800 font-medium">
                                {note}
                              </p>
                            )}
                          </div>

                          {/* Controls buttons (Red circle, play result, status check) */}
                          <div className="flex items-center gap-3.5 shrink-0 mt-0.5">
                            {/* Red Record Button */}
                            <Link href={`/projects/${project.id}/scenes/${activeScene.id}/loops/${loop.id}`}>
                              <button
                                type="button"
                                className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group"
                                title="Rekam Loop"
                              >
                                <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
                              </button>
                            </Link>

                            {/* User Audio Result if exists */}
                            {rec ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePlayAudio(rec.recorded_audio_url, rec.id)}
                                  className={cn(
                                    "h-6 px-2 text-[9px] font-bold border-zinc-800 rounded bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 gap-1",
                                    playingAudioId === rec.id && "bg-primary text-primary-foreground border-primary"
                                  )}
                                >
                                  <Play className="h-2.5 w-2.5 fill-current" /> Hasil
                                </Button>

                                {/* Status tag */}
                                {rec.status === "approved" ? (
                                  <span className="h-6 px-2 rounded bg-green-950/20 text-green-400 border border-green-900/20 text-[9px] font-bold flex items-center gap-0.5 uppercase tracking-wider">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Disetujui
                                  </span>
                                ) : (
                                  <span className="h-6 px-2 rounded bg-blue-950/20 text-blue-400 border border-blue-900/20 text-[9px] font-bold flex items-center gap-0.5 uppercase tracking-wider animate-pulse">
                                    <AlertCircle className="h-2.5 w-2.5" /> Review
                                  </span>
                                )}

                                {/* Admin controls */}
                                {isAdmin && (
                                  <div className="flex items-center gap-1">
                                    {rec.status === "recorded" && (
                                      <Button
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() => handleStatusChange(rec.id, "approved")}
                                        className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold"
                                      >
                                        Setujui
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={isLoading}
                                      onClick={() => handleDeleteRecording(rec.id)}
                                      className="h-6 w-6 text-zinc-550 hover:text-red-500"
                                      title="Hapus Rekaman"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-14 h-6 border border-dashed border-zinc-800 rounded bg-zinc-950/40 flex items-center justify-center select-none">
                                <span className="text-[9px] text-zinc-650 font-bold uppercase tracking-wider">Empty</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl m-4">
                      <p className="text-zinc-500 text-sm">Tidak ada scene yang ditemukan dalam proyek ini.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "keyTerms" && (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-300">Glosarium Kata Kunci (Key Terms)</h3>
                  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/10">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase font-semibold">
                        <tr>
                          <th className="p-3">Kata Kunci</th>
                          <th className="p-3">Bahasa Asal</th>
                          <th className="p-3">Definisi/Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {activeScene?.loops
                          .flatMap((l) => l.key_terms)
                          .map((term, index) => (
                            <tr key={index} className="hover:bg-zinc-900/20">
                              <td className="p-3 font-semibold text-zinc-200">{term.term}</td>
                              <td className="p-3 font-mono text-zinc-450">{term.original_word || "-"}</td>
                              <td className="p-3 text-zinc-450">Referensi glosarium lokal untuk ayat di scene ini.</td>
                            </tr>
                          ))}
                        {(!activeScene || activeScene.loops.flatMap((l) => l.key_terms).length === 0) && (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-zinc-500 italic">
                              Tidak ada kata kunci di scene ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {["transcribe", "backTranslate", "consult"].includes(activeTab) && (
                <div className="text-center py-12 text-zinc-500 text-xs italic">
                  Bagian evaluasi {activeTab} siap digunakan. Admin dapat meninjau rekaman draft suara yang terkumpul.
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* 3. Bottom Bar / Status Bar */}
      <footer className="h-7 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-3 text-[10px] text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>Scene {activeSceneIndex + 1} of {sortedScenes.length}</span>
          <span className="text-zinc-800">|</span>
          <span className="font-mono">00:00:22:29</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>S/R Status</span>
        </div>
      </footer>

    </div>
  );
}
