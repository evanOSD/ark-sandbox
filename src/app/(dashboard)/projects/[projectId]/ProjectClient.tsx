"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateRecordingStatus, deleteRecording } from "./actions";
import { VideoPlayer } from "./components/VideoPlayer";
import { NotesPanel } from "./components/NotesPanel";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { DraftTab } from "./components/tabs/DraftTab";
import { KeyTermsTab } from "./components/tabs/KeyTermsTab";
import { PlaceholderTab } from "./components/tabs/PlaceholderTab";

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

export interface Note {
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
          <VideoPlayer
            project={project}
            videoRef={videoRef}
            mneAudioRef={mneAudioRef}
            refAudioRef={refAudioRef}
            activeAudioUrl={activeAudioUrl}
            setActiveAudioUrl={setActiveAudioUrl}
            isVideoPlaying={isVideoPlaying}
            isMneEnabled={isMneEnabled}
            toggleVideoPlayback={toggleVideoPlayback}
            handleStopVideo={handleStopVideo}
            handleToggleMne={handleToggleMne}
          />
          
          <NotesPanel
            notes={notes}
            setNotes={setNotes}
            newNoteText={newNoteText}
            setNewNoteText={setNewNoteText}
            selectedNoteLoop={selectedNoteLoop}
            setSelectedNoteLoop={setSelectedNoteLoop}
            activeScene={activeScene}
            handleAddNote={handleAddNote}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column (Editor Workspace Area) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <WorkspaceTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Workspace Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable loop entries based on selected tab */}
            <div className="flex-1 overflow-y-auto">
              
              {activeTab === "draft" && (
                <DraftTab
                  project={project}
                  activeScene={activeScene}
                  loopsWithDisplay={loopsWithDisplay}
                  activeLoopPlayId={activeLoopPlayId}
                  handlePlayLoop={handlePlayLoop}
                  playingAudioId={playingAudioId}
                  handlePlayAudio={handlePlayAudio}
                  isAdmin={isAdmin}
                  isLoading={isLoading}
                  handleStatusChange={handleStatusChange}
                  handleDeleteRecording={handleDeleteRecording}
                />
              )}

              {activeTab === "keyTerms" && (
                <KeyTermsTab activeScene={activeScene} />
              )}

              {["transcribe", "backTranslate", "consult"].includes(activeTab) && (
                <PlaceholderTab activeTab={activeTab as "transcribe" | "backTranslate" | "consult"} />
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
