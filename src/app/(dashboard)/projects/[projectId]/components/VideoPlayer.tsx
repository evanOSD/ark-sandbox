import React from "react";
import { Film, Pause, Play, Square, Music } from "lucide-react";
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
}: VideoPlayerProps) {
  const audioSources = project.templates?.audio_sources || [];

  return (
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

      {/* Video Controls Bar */}
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
  );
}
