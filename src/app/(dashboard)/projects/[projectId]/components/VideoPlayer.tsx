import React from "react";
import { Film, Pause, Play, Square, Music, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "../ProjectClient";

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
}: VideoPlayerProps) {
  const audioSources = project.templates?.audio_sources || [];



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

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement === video) {
        await document.exitFullscreen();
      } else {
        await video.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  return (
    <div className="bg-black relative flex flex-col justify-between overflow-hidden border-b border-border h-[50%] shrink-0">
      <div className="flex-1 relative bg-background min-h-0 overflow-hidden">
        {project.templates?.video_url ? (
          <video
            ref={videoRef}
            src={project.templates.video_url}
            className="absolute inset-0 w-full h-full object-contain"
            onClick={toggleVideoPlayback}
            playsInline
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
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
        {activeAudioUrl && activeAudioUrl !== "PROJECT_AUDIO" && (
          <audio
            ref={refAudioRef}
            src={activeAudioUrl}
            className="hidden"
          />
        )}
        {activeAudioUrl === "PROJECT_AUDIO" && stitchedAudioUrl && (
          <audio
            ref={refAudioRef}
            src={stitchedAudioUrl}
            className="hidden"
          />
        )}
      </div>

      {/* Video Controls Bar */}
      <div className="h-10 bg-muted border-t border-border flex items-center gap-3 px-3 shrink-0 select-none">
        <button
          type="button"
          onClick={togglePictureInPicture}
          className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          title="Toggle Picture-in-Picture"
        >
          <Film className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          title="Fullscreen"
        >
          <Maximize className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleVideoPlayback}
          className="h-7 w-7 text-foreground/90 hover:text-foreground border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          title={isVideoPlaying ? "Pause" : "Play Scene"}
        >
          {isVideoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-zinc-300 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={handleStopVideo}
          className="h-7 w-7 text-foreground/90 hover:text-foreground border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
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
              ? "opacity-30 cursor-not-allowed text-zinc-600 border-border"
              : isMneEnabled
              ? "bg-amber-600 border-transparent text-foreground hover:bg-amber-700"
              : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
          )}
          title={project.templates?.mne_audio_url ? "Toggle M&E (Music & Effects)" : "M&E tidak tersedia"}
        >
          <Music className={cn("h-3.5 w-3.5", isMneEnabled && "animate-pulse")} />
        </button>

        <div className="flex items-center shrink-0">
          {isStitching && <span className="mr-2 text-xs text-amber-500 animate-pulse font-bold">Menjahit audio...</span>}
          <select
            value={activeAudioUrl}
            onChange={(e) => {
              const val = e.target.value;
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
            className="bg-background border border-border text-[10px] font-mono rounded px-2 py-1 text-muted-foreground focus:outline-none focus:border-border cursor-pointer"
          >
            {audioSources.map((source) => (
              <option key={source.name} value={source.url}>
                {source.name.replace(/\.wav$/i, '')}
              </option>
            ))}
            {audioSources.length === 0 && (
              <option value="">default_audio</option>
            )}
            <option value="PROJECT_AUDIO">Audio Rekaman Saya (Scene)</option>
          </select>
        </div>

        <div className="flex-1 h-1 bg-secondary rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-zinc-650" />
        </div>
      </div>
    </div>
  );
}
