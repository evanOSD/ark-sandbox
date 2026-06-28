// src/app/(dashboard)/projects/[projectId]/components/VideoPlayer.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  PictureInPicture,
  Pause,
  Play,
  Square,
  Music,
  Maximize,
  Minimize2,
} from "lucide-react"; // Menambahkan Minimize2
import { cn } from "@/lib/utils";
import { Project } from "../ProjectClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoPlayerProps {
  project: Project;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mneAudioRef: React.RefObject<HTMLAudioElement | null>;
  refAudioRef: React.RefObject<HTMLAudioElement | null>;
  activeAudioUrl: string;
  setActiveAudioUrl: (url: string) => void;
  isVideoPlaying: boolean;
  isMneEnabled: boolean;
  toggleVideoPlayback: () => void;
  handleStopVideo: () => void;
  handleToggleMne: () => void;
  stitchedAudioUrl?: string | null;
  isStitching?: boolean;
  onTimecodeUpdate?: (timecode: string, fps: number) => void;
}

export function VideoPlayer({
  project,
  videoRef,
  mneAudioRef,
  refAudioRef,
  activeAudioUrl,
  setActiveAudioUrl,
  isVideoPlaying,
  isMneEnabled,
  toggleVideoPlayback,
  handleStopVideo,
  handleToggleMne,
  stitchedAudioUrl,
  isStitching,
  onTimecodeUpdate,
}: VideoPlayerProps) {
  const audioSources = project.templates?.audio_sources || [];
  const getAudioSourceLabel = (value: string | null) => {
    if (!value) return "Pilih Audio";
    if (value === "PROJECT_AUDIO") return "Audio Rekaman Saya (Scene)";

    const selected = audioSources.find((source) => source.url === value);
    return selected?.name.replace(/\.wav$/i, "") || "default_audio";
  };

  // Referensi kontainer utama agar kontrol bar ikut fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  // State untuk melacak status fullscreen aktif
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Menyimak event perubahan layar penuh (termasuk jika user menekan tombol ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const onTimecodeUpdateRef = useRef(onTimecodeUpdate);
  useEffect(() => {
    onTimecodeUpdateRef.current = onTimecodeUpdate;
  }, [onTimecodeUpdate]);

  // Listen to video current time changes and calculate frame-accurate SMPTE Timecode at 25 fps
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTimecode = () => {
      const seconds = video.currentTime || 0;
      const fps = 25; // Constant 25 fps (standard for the project videos)

      const totalFrames = Math.floor(seconds * fps);
      const hours = Math.floor(totalFrames / (3600 * fps));
      const minutes = Math.floor((totalFrames % (3600 * fps)) / (60 * fps));
      const secs = Math.floor((totalFrames % (60 * fps)) / fps);
      const frames = Math.floor(totalFrames % fps);

      const pad = (val: number) => String(val).padStart(2, "0");
      if (onTimecodeUpdateRef.current) {
        onTimecodeUpdateRef.current(
          `${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(frames)}`,
          fps,
        );
      }
    };

    video.addEventListener("timeupdate", updateTimecode);
    video.addEventListener("loadedmetadata", updateTimecode);

    // Initial update
    updateTimecode();

    return () => {
      video.removeEventListener("timeupdate", updateTimecode);
      video.removeEventListener("loadedmetadata", updateTimecode);
    };
  }, [project.templates?.video_url, videoRef]);

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Failed to toggle Picture-in-Picture:", error);
    }
  };

  // Fungsi Fullscreen yang telah diperbarui ke level kontainer modul
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-black relative flex flex-col justify-between overflow-hidden border-b border-border shrink-0 transition-all duration-200",
        isFullscreen ? "w-full h-full p-0 m-0 z-50 fixed inset-0" : "h-[50%]",
      )}
    >
      <div className="flex-1 relative bg-background min-h-0 overflow-hidden">
        {project.templates?.video_url ? (
          <video
            ref={videoRef}
            src={project.templates.video_url}
            className="absolute inset-0 w-full h-full object-contain cursor-pointer"
            onClick={toggleVideoPlayback}
            playsInline
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground select-text">
            <PictureInPicture className="h-14 w-14 stroke-[1.2] animate-pulse select-none" />
            <span className="text-xs font-bold">
              Video referensi tidak terunggah
            </span>
          </div>
        )}
        {project.templates?.mne_audio_url && (
          <audio
            ref={mneAudioRef}
            src={project.templates.mne_audio_url}
            className="hidden"
          />
        )}
        {activeAudioUrl && activeAudioUrl !== "PROJECT_AUDIO" && (
          <audio ref={refAudioRef} src={activeAudioUrl} className="hidden" />
        )}
        {activeAudioUrl === "PROJECT_AUDIO" && stitchedAudioUrl && (
          <audio ref={refAudioRef} src={stitchedAudioUrl} className="hidden" />
        )}
      </div>

      {/* Video Controls Bar */}
      <div className="h-10 bg-muted border-t border-border flex items-center gap-3 px-3 shrink-0 select-none">
        <button
          type="button"
          onClick={togglePictureInPicture}
          className="h-7 w-7 text-foreground/80 border border-zinc-850/50 hover:bg-zinc-800/20 bg-background/40 hover:text-foreground rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          title="Toggle Picture-in-Picture"
        >
          <PictureInPicture className="h-4 w-4" />
        </button>

        {/* TOMBOL FULLSCREEN & EXIT DENGAN INDIKATOR DINAMIS */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={cn(
            "h-7 w-7 border rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer",
            isFullscreen
              ? "text-indigo-400 border-indigo-950/40 hover:bg-indigo-950/20 bg-background/40 hover:text-indigo-300"
              : "text-foreground/80 border-zinc-850/50 hover:bg-zinc-800/20 bg-background/40 hover:text-foreground",
          )}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" /> // Tampil saat layar penuh
          ) : (
            <Maximize className="h-3.5 w-3.5" /> // Tampil saat layar normal
          )}
        </button>

        <button
          type="button"
          onClick={toggleVideoPlayback}
          className={cn(
            "h-7 w-7 border rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer",
            isVideoPlaying
              ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
              : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
          )}
          title={isVideoPlaying ? "Pause" : "Play Scene"}
        >
          {isVideoPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleStopVideo}
          className="h-7 w-7 text-rose-500 border border-rose-950/40 rounded-full flex items-center justify-center hover:bg-rose-950/20 hover:text-rose-400 bg-background/40 transition-colors shrink-0 cursor-pointer"
          title="Stop & Reset"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>

        <button
          type="button"
          onClick={handleToggleMne}
          disabled={!project.templates?.mne_audio_url}
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center transition-colors shrink-0 border cursor-pointer text-foreground/80",
            !project.templates?.mne_audio_url
              ? "opacity-30 cursor-not-allowed border-zinc-850/40 bg-transparent"
              : isMneEnabled
                ? "bg-amber-600 border-amber-950/40 hover:bg-amber-700"
                : "bg-background/40 border-zinc-850/50 hover:bg-zinc-800/20",
          )}
          title={
            project.templates?.mne_audio_url
              ? "Toggle M&E (Music & Effects)"
              : "M&E tidak tersedia"
          }
        >
          <Music
            className={cn("h-3.5 w-3.5", isMneEnabled && "animate-pulse")}
          />
        </button>

        <div className="flex items-center shrink-0">
          {isStitching && (
            <span className="mr-2 text-xs text-amber-500 animate-pulse font-bold select-text">
              Menjahit audio...
            </span>
          )}

          <Select
            value={activeAudioUrl}
            onValueChange={(val) => {
              if (!val) return;

              if (val === "PROJECT_AUDIO") {
                setActiveAudioUrl(val);
              } else {
                const selected = audioSources.find((src) => src.url === val);
                if (selected) {
                  setActiveAudioUrl(selected.url);
                } else {
                  setActiveAudioUrl(val);
                }
              }
            }}
          >
            <SelectTrigger
              size="sm"
              className="text-[10px] font-mono rounded bg-background text-muted-foreground border-border cursor-pointer min-w-[180px]"
            >
              <SelectValue placeholder="Pilih Audio">
                {(value) => getAudioSourceLabel(value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="text-[10px] font-mono">
              {audioSources.map((source) => (
                <SelectItem key={source.url} value={source.url}>
                  {source.name.replace(/\.wav$/i, "")}
                </SelectItem>
              ))}

              {/* FIX: Memasukkan properti audio_url dari Supabase sebagai value pengikat */}
              {audioSources.length === 0 && (
                <SelectItem value={project.templates?.audio_url || ""}>
                  default_audio
                </SelectItem>
              )}

              <SelectItem value="PROJECT_AUDIO">
                Audio Rekaman Saya (Scene)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 h-1 bg-secondary rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-zinc-650" />
        </div>
      </div>
    </div>
  );
}
