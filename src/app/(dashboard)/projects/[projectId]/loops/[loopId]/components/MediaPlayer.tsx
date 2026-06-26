import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Film, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Project, Loop } from "../WorkspaceClient";

interface MediaPlayerProps {
  project: Project;
  loop: Loop;
}

export interface MediaPlayerRef {
  pause: () => void;
}

export const MediaPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(
  ({ project, loop }, ref) => {
    // Media refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mneAudioRef = useRef<HTMLAudioElement | null>(null);

    // States
    const [isMneEnabled, setIsMneEnabled] = useState(false);
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

    // Expose pause to parent
    useImperativeHandle(ref, () => ({
      pause() {
        if (videoRef.current) videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        if (mneAudioRef.current) mneAudioRef.current.pause();
        setIsPlaying(false);
      },
    }));

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
          audio
            .play()
            .catch((err) => console.log("Audio play postponed:", err));
        }
      };

      if (audio.readyState >= 1) {
        // HAVE_METADATA or higher
        setPositionAndPlay();
      } else {
        audio.addEventListener("loadedmetadata", setPositionAndPlay, {
          once: true,
        });
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
        mne.addEventListener("loadedmetadata", setPositionAndPlay, {
          once: true,
        });
      }

      return () => {
        mne.removeEventListener("loadedmetadata", setPositionAndPlay);
      };
    }, [project.templates.mne_audio_url, isMneEnabled]);

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
      setCurrentTimeMs(loop.start_time_ms);
    }, [loop.start_time_ms]);

    // Synchronize audio elements with native video controls
    const handlePlay = () => {
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current
          .play()
          .catch((err) => console.log("Audio play postponed:", err));
      }
      if (isMneEnabled && mneAudioRef.current && mneAudioRef.current.paused) {
        mneAudioRef.current
          .play()
          .catch((err) => console.log("M&E play postponed:", err));
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
          mneAudioRef.current.currentTime = videoRef.current
            ? videoRef.current.currentTime
            : loop.start_time_ms / 1000;
          if (isPlaying) {
            mneAudioRef.current
              .play()
              .catch((err) => console.log("MNE play error:", err));
          }
        } else {
          mneAudioRef.current.pause();
        }
      }
    };

    return (
      <Card className="overflow-hidden bg-background border-border text-foreground p-4">
        {/* Audio selector tabs */}
        {(hasMultipleAudio || project.templates.mne_audio_url) && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-muted/40 p-2.5 rounded-lg border border-border">
            {hasMultipleAudio && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">
                  Sumber Audio:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {audioSources.map((source) => (
                    <Button
                      key={source.name}
                      type="button"
                      variant={
                        activeAudioName === source.name ? "default" : "outline"
                      }
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
                <span className="text-xs text-muted-foreground self-center">
                  M&E Track:
                </span>
                <Button
                  type="button"
                  variant={isMneEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleMne}
                  className={cn(
                    "h-8 text-xs font-semibold px-3",
                    isMneEnabled
                      ? "bg-amber-600 hover:bg-amber-700 text-foreground border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground",
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
        <div className="bg-black flex flex-col items-center justify-center min-h-[300px] rounded-lg overflow-hidden border border-border relative">
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
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
              <Film className="h-12 w-12 stroke-[1.5]" />
              <span className="text-sm">
                Video tidak tersedia. Menggunakan pemutar audio.
              </span>
            </div>
          )}

          {/* Reference Audio element (if audio url exists) */}
          {activeAudioUrl && (
            <audio
              ref={audioRef}
              src={activeAudioUrl}
              onTimeUpdate={
                !project.templates.video_url ? handleTimeUpdate : undefined
              }
              controls={!project.templates.video_url}
              className={
                !project.templates.video_url
                  ? "w-full p-2 bg-muted border-t border-border"
                  : "hidden"
              }
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
    );
  },
);

MediaPlayer.displayName = "MediaPlayer";
