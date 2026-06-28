"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ShieldCheck, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  updateRecordingStatus,
  deleteRecording,
  saveTranslationText,
  saveBackTranslationText,
  getLoopWorkspaceData,
} from "./actions";
import { VideoPlayer } from "./components/VideoPlayer";
import { NotesPanel } from "./components/NotesPanel";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { DraftTab } from "./components/tabs/DraftTab";
import { KeyTermsTab } from "./components/tabs/KeyTermsTab";
import { BackTranslateTab } from "./components/tabs/BackTranslateTab";
import { ConsultTab } from "./components/tabs/ConsultTab";

const WorkspaceClient = dynamic(
  () =>
    import("./scenes/[sceneId]/loops/[loopId]/WorkspaceClient").then(
      (mod) => mod.WorkspaceClient,
    ),
  { ssr: false },
);

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  category: string | null;
}

export interface Recording {
  id: string;
  recorded_audio_url: string;
  status: "pending" | "recorded" | "approved";
  recorded_by_user?: { username: string } | null;
  created_at: string;
  translated_text?: string | null;
  back_translation?: string | null;
  back_translation_audio_url?: string | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  key_terms: KeyTerm[];
  recording?: Recording | null;
  script_text_1: string | null;
  script_text_2: string | null;
  script_text_3: string | null;
  script_text_4: string | null;
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

const getFormattedDateTime = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
};

export function ProjectClient({
  project,
  scenes,
  isAdmin,
}: ProjectClientProps) {
  // State
  const [localScenes, setLocalScenes] = useState<Scene[]>(scenes);
  const router = useRouter();

  // Modal states
  const [activeLoopIdForModal, setActiveLoopIdForModal] = useState<
    string | null
  >(null);
  const [modalLoopData, setModalLoopData] = useState<{
    loop: unknown;
    existingRecordingUrl: string | null;
  } | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const handleOpenRecordModal = async (loopId: string, sceneId: string) => {
    setActiveLoopIdForModal(loopId);
    setIsModalLoading(true);
    setModalLoopData(null);
    try {
      const data = await getLoopWorkspaceData(project.id, sceneId, loopId);
      setModalLoopData(data);
    } catch (err) {
      console.error(err);
      alert(
        "Gagal memuat data loop: " + (err instanceof Error ? err.message : err),
      );
      setActiveLoopIdForModal(null);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setActiveLoopIdForModal(null);
    setModalLoopData(null);
    router.refresh();
  };
  const [activeTab, setActiveTab] = useState<
    "draft" | "keyTerms" | "backTranslate" | "consult"
  >("draft");
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [stitchedAudioUrls, setStitchedAudioUrls] = useState<
    Record<string, string>
  >({});
  const [isStitching, setIsStitching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [prevScenes, setPrevScenes] = useState<Scene[]>(scenes);
  if (scenes !== prevScenes) {
    setPrevScenes(scenes);
    setLocalScenes(scenes);
  }
  const sortedScenes = [...localScenes].sort(
    (a, b) => a.sequence_number - b.sequence_number,
  );
  sortedScenes.forEach((s) => {
    s.loops = [...s.loops].sort(
      (a, b) => a.sequence_number - b.sequence_number,
    );
  });

  // Video states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTimecode, setVideoTimecode] = useState("00:00:00:00");

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
      video
        .play()
        .catch((err) => console.log("Video playback postponed:", err));
      if (refAudioRef.current) {
        refAudioRef.current.currentTime = video.currentTime;
        refAudioRef.current
          .play()
          .catch((err) => console.log("Ref audio play error:", err));
      }
      if (isMneEnabled && mneAudioRef.current) {
        mneAudioRef.current.currentTime = video.currentTime;
        mneAudioRef.current
          .play()
          .catch((err) => console.log("MNE play error:", err));
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
        refAudioRef.current
          .play()
          .catch((err) => console.log("Ref audio play error:", err));
      }
      if (isMneEnabled && mneAudioRef.current && mneAudioRef.current.paused) {
        mneAudioRef.current.currentTime = video.currentTime;
        mneAudioRef.current
          .play()
          .catch((err) => console.log("MNE play error:", err));
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
      const currentLoop = activeScene.loops.find(
        (l) => l.id === activeLoopPlayId,
      );
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

    let targetUrl = activeAudioUrl;
    if (activeAudioUrl === "PROJECT_AUDIO" && activeScene) {
      if (!stitchedAudioUrls[activeScene.id]) return; // wait for stitch
      targetUrl = stitchedAudioUrls[activeScene.id];
    }

    // Resolve URL to compare absolute locations correctly
    const resolvedUrl = targetUrl.startsWith("/")
      ? window.location.origin + targetUrl
      : targetUrl;

    if (refAudio.src === resolvedUrl) return;

    refAudio.pause();
    refAudio.src = targetUrl;
    refAudio.load();

    const setPositionAndPlay = () => {
      refAudio.currentTime = videoRef.current
        ? videoRef.current.currentTime
        : 0;
      if (isVideoPlaying) {
        refAudio
          .play()
          .catch((err) => console.log("Ref audio play postponed:", err));
      }
    };

    if (refAudio.readyState >= 1) {
      // HAVE_METADATA or higher
      setPositionAndPlay();
    } else {
      refAudio.addEventListener("loadedmetadata", setPositionAndPlay, {
        once: true,
      });
    }

    return () => {
      refAudio.removeEventListener("loadedmetadata", setPositionAndPlay);
    };
  }, [activeAudioUrl, isVideoPlaying, activeScene, stitchedAudioUrls]);

  // Auto-stitch logic when "PROJECT_AUDIO" is selected
  useEffect(() => {
    if (
      activeAudioUrl === "PROJECT_AUDIO" &&
      activeScene &&
      !stitchedAudioUrls[activeScene.id]
    ) {
      let isMounted = true;
      const stitch = async () => {
        setIsStitching(true);
        try {
          const { stitchSceneAudio } = await import("@/lib/audio-stitcher");
          const loopsWithAudio = activeScene.loops
            .filter((l) => l.recording?.recorded_audio_url)
            .map((l) => ({
              start_time_ms: l.start_time_ms,
              audio_url: l.recording!.recorded_audio_url,
            }));

          const maxEnd = Math.max(
            ...activeScene.loops.map((l) => l.end_time_ms),
            1000,
          );
          const blobUrl = await stitchSceneAudio(loopsWithAudio, maxEnd);
          if (blobUrl && isMounted) {
            setStitchedAudioUrls((prev) => ({
              ...prev,
              [activeScene.id]: blobUrl,
            }));
          }
        } catch (err) {
          console.error(err);
        } finally {
          if (isMounted) setIsStitching(false);
        }
      };
      stitch();
      return () => {
        isMounted = false;
      };
    }
  }, [activeAudioUrl, activeScene, stitchedAudioUrls]);

  const handleToggleMne = () => {
    const nextState = !isMneEnabled;
    setIsMneEnabled(nextState);
    if (mneAudioRef.current) {
      if (nextState) {
        mneAudioRef.current.currentTime = videoRef.current
          ? videoRef.current.currentTime
          : 0;
        if (isVideoPlaying) {
          mneAudioRef.current
            .play()
            .catch((err) => console.log("MNE play error:", err));
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
  const handleStatusChange = async (
    recId: string,
    status: "pending" | "recorded" | "approved",
  ) => {
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
    if (!confirm("Apakah Anda yakin ingin menolak & menghapus rekaman ini?"))
      return;
    setIsLoading(true);
    try {
      await deleteRecording(project.id, recId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus rekaman");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save translation handler
  const handleSaveTranslation = async (loopId: string, text: string) => {
    // Check if anything actually changed
    let oldText = "";
    for (const s of localScenes) {
      const l = s.loops.find((lp) => lp.id === loopId);
      if (l) {
        oldText = l.recording?.translated_text || "";
        break;
      }
    }
    if (oldText === text) return; // No change, skip save

    setSaveStatus("saving");

    // Optimistic Update
    setLocalScenes((prevScenes) =>
      prevScenes.map((s) => ({
        ...s,
        loops: s.loops.map((l) => {
          if (l.id === loopId) {
            const rec = l.recording;
            return {
              ...l,
              recording: rec
                ? { ...rec, translated_text: text }
                : {
                    id: `temp-rec-${loopId}`,
                    recorded_audio_url: "",
                    status: "pending" as const,
                    created_at: new Date().toISOString(),
                    translated_text: text,
                  },
            };
          }
          return l;
        }),
      })),
    );

    try {
      await saveTranslationText(project.id, loopId, text);
      setSaveStatus("saved");
      setLastSavedTime(getFormattedDateTime());
    } catch (err) {
      console.error(err);
      setSaveStatus("idle");
      alert(err instanceof Error ? err.message : "Gagal menyimpan terjemahan");
      // Rollback optimistic update
      setLocalScenes(scenes);
    }
  };

  // Auto-save back translation handler
  const handleSaveBackTranslation = async (loopId: string, text: string) => {
    // Check if anything actually changed
    let oldText = "";
    for (const s of localScenes) {
      const l = s.loops.find((lp) => lp.id === loopId);
      if (l) {
        oldText = l.recording?.back_translation || "";
        break;
      }
    }
    if (oldText === text) return; // No change, skip save

    setSaveStatus("saving");

    // Optimistic Update
    setLocalScenes((prevScenes) =>
      prevScenes.map((s) => ({
        ...s,
        loops: s.loops.map((l) => {
          if (l.id === loopId) {
            const rec = l.recording;
            return {
              ...l,
              recording: rec
                ? { ...rec, back_translation: text }
                : {
                    id: `temp-rec-${loopId}`,
                    recorded_audio_url: "",
                    status: "pending" as const,
                    created_at: new Date().toISOString(),
                    back_translation: text,
                  },
            };
          }
          return l;
        }),
      })),
    );

    try {
      await saveBackTranslationText(project.id, loopId, text);
      setSaveStatus("saved");
      setLastSavedTime(getFormattedDateTime());
    } catch (err) {
      console.error(err);
      // Suppress alert and keep optimistic value locally if database schema table/column doesn't exist yet
      setSaveStatus("saved");
      setLastSavedTime(getFormattedDateTime() + " (Local)");
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
      loopName: selectedNoteLoop || activeScene?.loops?.[0]?.name || "Umum",
    };

    setNotes((prev) => [newNote, ...prev]);
    setNewNoteText("");
  };

  // Map loops to display text based on selected audio source
  const loopsWithDisplay = (activeScene?.loops || []).map((loop) => {
    // Determine active audio index (0 for audio_url_1, 1 for audio_url_2, etc.)
    const activeAudioIndex = audioSources.findIndex(
      (src) => src.url === activeAudioUrl,
    );
    let dbText: string | null = null;
    if (activeAudioIndex === 0) dbText = loop.script_text_1;
    else if (activeAudioIndex === 1) dbText = loop.script_text_2;
    else if (activeAudioIndex === 2) dbText = loop.script_text_3;
    else if (activeAudioIndex === 3) dbText = loop.script_text_4;
    else dbText = loop.script_text_1;

    return {
      loop,
      text: dbText || `Teks draf belum terisi untuk ${loop.name}.`,
      note: undefined as string | undefined,
    };
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* 1. Header/Top Bar */}
      <header className="h-12 bg-muted border-b border-border flex items-center justify-between px-4 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-foreground">
              {project.name}
            </span>
            {isAdmin && (
              <Link href={`/projects/${project.id}/edit`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  title="Edit Proyek"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Center: Scene Selector Switcher */}
        {sortedScenes.length > 0 && (
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-1 rounded text-xs select-none">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() =>
                setActiveSceneIndex((prev) => Math.max(0, prev - 1))
              }
              disabled={activeSceneIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-black text-foreground px-2 tracking-wide uppercase">
              {activeSceneIndex + 1} - {activeScene?.name || "Scene"}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() =>
                setActiveSceneIndex((prev) =>
                  Math.min(sortedScenes.length - 1, prev + 1),
                )
              }
              disabled={activeSceneIndex === sortedScenes.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Right side: Global Save Status Info */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none font-medium pr-1">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              <span className="text-amber-500 font-semibold animate-pulse">
                Menyimpan...
              </span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3.5]" />
              <span className="text-emerald-500 font-semibold">
                Tersimpan {lastSavedTime}
              </span>
            </>
          )}
          {saveStatus === "idle" && (
            <>
              {lastSavedTime ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3.5]" />
                  <span>Tersimpan {lastSavedTime}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                  <span>Semua tersimpan</span>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* 2. Main split container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column (Video Player & Notes/Comments) */}
        <div className="w-[40%] flex flex-col border-r border-border overflow-hidden shrink-0">
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
            stitchedAudioUrl={
              activeScene ? stitchedAudioUrls[activeScene.id] : null
            }
            isStitching={isStitching}
            onTimecodeUpdate={setVideoTimecode}
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
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <WorkspaceTabs activeTab={activeTab} setActiveTab={setActiveTab} />

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
                  activeAudioUrl={activeAudioUrl}
                  setActiveAudioUrl={setActiveAudioUrl}
                  handleSaveTranslation={handleSaveTranslation}
                  onOpenRecordModal={handleOpenRecordModal}
                />
              )}

              {activeTab === "keyTerms" && (
              <KeyTermsTab
                  activeScene={activeScene}
                  projectId={project.id}
                  handlePlayLoop={handlePlayLoop}
                  activeLoopPlayId={activeLoopPlayId}
                  onSaveStateChange={(status) => {
                    setSaveStatus(status);
                    if (status === "saved") {
                      setLastSavedTime(getFormattedDateTime());
                    }
                  }}
                />
              )}

              {activeTab === "backTranslate" && (
                <BackTranslateTab
                  projectId={project.id}
                  activeScene={activeScene}
                  loopsWithDisplay={loopsWithDisplay}
                  activeLoopPlayId={activeLoopPlayId}
                  handlePlayLoop={handlePlayLoop}
                  onSaveBackTranslation={handleSaveBackTranslation}
                  isLoading={isLoading}
                  playingAudioId={playingAudioId}
                  handlePlayAudio={handlePlayAudio}
                />
              )}

              {activeTab === "consult" && (
                <ConsultTab
                  activeScene={activeScene}
                  audioSources={audioSources}
                  activeLoopPlayId={activeLoopPlayId}
                  handlePlayLoop={handlePlayLoop}
                  onSaveBackTranslation={handleSaveBackTranslation}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar / Status Bar */}
      <footer className="h-7 bg-muted border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>
            Scene {activeSceneIndex + 1} of {sortedScenes.length}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span className="font-mono">{videoTimecode}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>S/R Status</span>
        </div>
      </footer>

      {/* Loop Workspace Modal Dialog */}
      <Dialog
        open={!!activeLoopIdForModal}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        {/* Lebar & Tinggi Audio Loop Editor */}
        <DialogContent
          style={{
            width: "1000px",
            maxWidth: "1000px",
            height: "490px",
            maxHeight: "490px",
          }}
          className="p-0 overflow-hidden flex flex-col bg-background text-foreground border border-border"
        >
          <DialogTitle className="sr-only">Loop Workspace</DialogTitle>
          {isModalLoading && (
            <div className="flex-1 flex items-center justify-center bg-background/80">
              <span className="text-sm font-semibold animate-pulse text-muted-foreground">
                Memuat Workspace...
              </span>
            </div>
          )}
          {!isModalLoading &&
            modalLoopData &&
            (() => {
              const projectWithScripts = {
                ...project,
                templates: project.templates
                  ? {
                      ...project.templates,
                      audio_sources:
                        project.templates.audio_sources?.map(
                          (source, index) => {
                            const loopObj = modalLoopData.loop as Record<
                              string,
                              unknown
                            >;
                            const scriptField = `script_text_${index + 1}`;
                            return {
                              ...source,
                              script_text: loopObj?.[scriptField] || null,
                            };
                          },
                        ) || [],
                    }
                  : null,
              };

              return (
                <div className="flex-1 overflow-hidden relative">
                  <WorkspaceClient
                    project={
                      projectWithScripts as unknown as import("@/types").Project
                    }
                    loop={
                      modalLoopData.loop as unknown as import("@/types").Loop
                    }
                    existingRecordingUrl={modalLoopData.existingRecordingUrl}
                    isModal={true}
                    onClose={handleCloseModal}
                  />
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
