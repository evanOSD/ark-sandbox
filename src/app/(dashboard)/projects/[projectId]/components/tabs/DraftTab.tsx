import { Play, Square, Check, SearchAlert, Trash2 } from "lucide-react";
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
  handleStatusChange: (
    recId: string,
    status: "pending" | "recorded" | "approved",
  ) => void;
  handleDeleteRecording: (recId: string) => void;
  activeAudioUrl: string;
  setActiveAudioUrl: (url: string) => void;
  handleSaveTranslation: (loopId: string, text: string) => void;
  onOpenRecordModal: (loopId: string, sceneId: string) => void;
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
  activeAudioUrl,
  setActiveAudioUrl,
  handleSaveTranslation,
  onOpenRecordModal,
}: DraftTabProps) {
  const audioSources = project.templates?.audio_sources || [];

  return (
    <div className="divide-y divide-zinc-850">
      {activeScene && (
        <div className="grid grid-cols-2 gap-4 px-3.5 py-1.5 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-foreground select-none text-center items-center">
          <div className="pr-4 border-r border-border flex items-center justify-center gap-1.5">
            <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              Referensi:
            </span>
            <select
              value={activeAudioUrl}
              onChange={(e) => {
                setActiveAudioUrl(e.target.value);
              }}
              className="bg-background border border-border text-[10px] font-mono rounded px-2 py-0.5 text-foreground focus:outline-none focus:border-border cursor-pointer"
            >
              {audioSources.map((source) => (
                <option key={source.name} value={source.url}>
                  {source.name.replace(/\.wav$/i, "")}
                </option>
              ))}
              {audioSources.length === 0 && (
                <option value="">default_audio</option>
              )}
            </select>
          </div>
          <div className="pl-4 text-center">terjemahan anda</div>
        </div>
      )}
      {activeScene ? (
        loopsWithDisplay.map(({ loop, text, note }) => {
          const rec = loop.recording;
          return (
            <div
              key={loop.id}
              className="p-3.5 grid grid-cols-2 gap-4 hover:bg-muted/10 transition-colors"
            >
              {/* Left Column: Play, Name, Text */}
              <div className="flex items-start gap-4 pr-4 border-r border-border">
                {/* Play Loop Button (simultaneous video, ref audio, and MNE) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                    activeLoopPlayId === loop.id
                      ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                      : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                  )}
                  onClick={() => handlePlayLoop(loop.id, loop.start_time_ms)}
                  title={
                    activeLoopPlayId === loop.id
                      ? "Hentikan Pemutaran Loop"
                      : "Putar Loop (Video & Audio)"
                  }
                >
                  {activeLoopPlayId === loop.id ? (
                    <Square className="h-2.5 w-2.5 fill-current" />
                  ) : (
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  )}
                </Button>

                {/* Loop Name */}
                <span className="text-xs font-bold text-muted-foreground font-mono shrink-0 select-none w-12 mt-1">
                  {loop.name}
                </span>

                {/* Text & Alternate Notes */}
                <div className="flex-1 space-y-1.5">
                  <p className="text-xs text-foreground leading-relaxed font-semibold">
                    {text}
                  </p>
                  {note && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed pl-3 border-l border-border font-medium">
                      {note}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Record and Results/Input */}
              <div className="flex flex-col gap-2 pl-4 justify-center">
                <div className="flex items-start gap-3 w-full">
                  {/* Record + Play/Stop Buttons stacked vertically */}
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                    {/* Red Record Button */}
                    <button
                      type="button"
                      onClick={() => onOpenRecordModal(loop.id, activeScene.id)}
                      className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group"
                      title="Rekam Loop"
                    >
                      <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Play/Stop Button */}
                    {rec && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 rounded-full border transition-colors cursor-pointer",
                          playingAudioId === rec.id
                            ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                            : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                        )}
                        onClick={() =>
                          handlePlayAudio(rec.recorded_audio_url, rec.id)
                        }
                        title={
                          playingAudioId === rec.id
                            ? "Hentikan Rekaman"
                            : "Putar Hasil Rekaman"
                        }
                      >
                        {playingAudioId === rec.id ? (
                          <Square className="h-2.5 w-2.5 fill-current" />
                        ) : (
                          <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Translation Text Input */}
                  <textarea
                    key={`trans-input-${loop.id}-${rec?.id || "none"}`}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    defaultValue={rec?.translated_text || ""}
                    placeholder="Empty"
                    rows={1}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                    onBlur={(e) =>
                      handleSaveTranslation(loop.id, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-1 min-w-[80px] bg-muted border border-border rounded px-2.5 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-border focus:bg-background transition-colors resize-none overflow-hidden leading-relaxed"
                  />

                  {/* Status tag & Admin controls */}
                  {rec && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Status tag */}
                      {rec.status === "approved" ? (
                        <span className="h-6 px-2 rounded bg-background text-success border border-success text-[10px] font-bold flex items-center gap-0.5 uppercase tracking-wider">
                          <Check className="h-4 w-4" /> Disetujui
                        </span>
                      ) : (
                        <span className="h-6 px-2 rounded bg-background text-destructive border border-destructive text-[10px] font-bold flex items-center gap-0.5 uppercase wrapped-text tracking-wider">
                          <SearchAlert className="h-4 w-4" /> Perlu Review
                        </span>
                      )}

                      {/* Admin controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {rec.status === "recorded" && (
                            <Button
                              size="sm"
                              disabled={isLoading}
                              onClick={() =>
                                handleStatusChange(rec.id, "approved")
                              }
                              className="h-6 px-2 bg-green-600 hover:bg-green-700 text-foreground text-[9px] font-bold"
                            >
                              Setujui
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => handleDeleteRecording(rec.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            title="Hapus Rekaman"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl m-4">
          <p className="text-muted-foreground text-sm">
            Tidak ada scene yang ditemukan dalam proyek ini.
          </p>
        </div>
      )}
    </div>
  );
}
