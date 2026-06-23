import Link from "next/link";
import { Play, Square, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Scene, Project, Loop } from "../../ProjectClient";

interface DraftTabProps {
  project: Project;
  activeScene: Scene | null;
  loopsWithDisplay: Array<{
    loop: Loop;
    speaker?: string;
    lineNum?: number;
    text: string;
    note?: string;
  }>;
  activeLoopPlayId: string | null;
  handlePlayLoop: (loopId: string, startMs: number) => void;
  playingAudioId: string | null;
  handlePlayAudio: (url: string, recId: string) => void;
  isAdmin: boolean;
  isLoading: boolean;
  handleStatusChange: (recId: string, status: "pending" | "recorded" | "approved") => void;
  handleDeleteRecording: (recId: string) => void;
}

export function DraftTab({
  project,
  activeScene,
  loopsWithDisplay,
  activeLoopPlayId,
  handlePlayLoop,
  playingAudioId,
  handlePlayAudio,
  isAdmin,
  isLoading,
  handleStatusChange,
  handleDeleteRecording,
}: DraftTabProps) {
  return (
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
  );
}
