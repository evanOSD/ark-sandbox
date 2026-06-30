"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Scene, Loop } from "../../ProjectClient";

interface AudioSource {
  name: string;
  url: string;
}

interface ConsultTabProps {
  activeScene: Scene | null;
  audioSources: AudioSource[];
  activeLoopPlayId: string | null;
  handlePlayLoop: (loopId: string, startMs: number, audioUrl?: string) => void;
  onSaveBackTranslation: (loopId: string, text: string) => Promise<void>;
  isLoading: boolean;
  activeAudioUrl: string;
  isShowScriptAllowed: boolean;
  showTextScript: boolean;
  allowedScripts: string;
}

/** Pick the correct script_text_N for a loop based on the audio source index */
function getScriptTextForIndex(loop: Loop, index: number): string {
  if (index === 0) return loop.script_text_1 || "";
  if (index === 1) return loop.script_text_2 || "";
  if (index === 2) return loop.script_text_3 || "";
  if (index === 3) return loop.script_text_4 || "";
  return loop.script_text_1 || "";
}

export function ConsultTab({
  activeScene,
  audioSources,
  activeLoopPlayId,
  handlePlayLoop,
  onSaveBackTranslation,
  isLoading,
  activeAudioUrl,
  isShowScriptAllowed,
  showTextScript,
  allowedScripts,
}: ConsultTabProps) {
  // Determine which script indices to render based on role/settings
  const allowedNames = allowedScripts ? allowedScripts.split(",").filter(Boolean) : [];
  let displayedIndices: number[] = [];
  let hideScriptText = false;

  if (isShowScriptAllowed) {
    // Admin/Consultant: always show ALL templates regardless of any setting
    displayedIndices = audioSources.length > 0 ? audioSources.map((_, idx) => idx) : [0];
  } else {
    if (showTextScript) {
      // User with access: only allowed templates, with text visible
      audioSources.forEach((src, idx) => {
        if (allowedNames.includes(src.name)) {
          displayedIndices.push(idx);
        }
      });
      if (displayedIndices.length === 0 && audioSources.length > 0) {
        displayedIndices.push(0);
      }
    } else {
      // User without access: show all template labels but hide script text
      displayedIndices = audioSources.length > 0 ? audioSources.map((_, idx) => idx) : [0];
      hideScriptText = true;
    }
  }

  // Local state for back_translation textarea
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});

  // Refs map for auto-resize
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const loops = useMemo(() => activeScene?.loops || [], [activeScene?.loops]);

  // Re-resize all textareas whenever inputs or loops change
  useEffect(() => {
    Object.values(textareaRefs.current).forEach((el) => {
      if (el) resizeTextarea(el);
    });
  }, [localInputs, loops]);

  const handleBlur = (loopId: string, value: string, currentValue: string) => {
    if (value !== currentValue) {
      onSaveBackTranslation(loopId, value);
    }
  };

  return (
    <div className="divide-y divide-zinc-850">
      {/* Header row */}
      {activeScene && (
        <div className="px-3.5 py-1.5 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-foreground select-none flex items-center gap-2">
          <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
            Konsultasi
          </span>
        </div>
      )}

      {activeScene ? (
        loops.map((loop) => {
          const rec = loop.recording;

          // back_translation — same value as BackTranslateTab
          const dbBackTranslation = rec?.back_translation || "";
          const inputValue =
            localInputs[loop.id] !== undefined
              ? localInputs[loop.id]
              : dbBackTranslation;

          return (
            <div
              key={loop.id}
              className="px-3.5 py-3 hover:bg-muted/10 transition-colors space-y-2"
            >
              {/* Script rows — one per displayed template */}
              <div className="space-y-1.5">
                {displayedIndices.map((scriptIdx) => {
                  const source = audioSources[scriptIdx];
                  const sourceUrl = source?.url || "";
                  const labelName = source ? source.name.replace(/\.wav$/i, "") : "";
                  const scriptText = getScriptTextForIndex(loop, scriptIdx);
                  const isPlayingThis = activeLoopPlayId === loop.id && activeAudioUrl === sourceUrl;

                  return (
                    <div key={scriptIdx} className="flex items-start gap-3">
                      {/* Play button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                          isPlayingThis
                            ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                            : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                        )}
                        onClick={() => handlePlayLoop(loop.id, loop.start_time_ms, sourceUrl)}
                        title={isPlayingThis ? "Hentikan Pemutaran Loop" : `Putar Loop (${labelName})`}
                      >
                        {isPlayingThis ? (
                          <Square className="h-2.5 w-2.5 fill-current" />
                        ) : (
                          <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                        )}
                      </Button>

                      {/* Loop name & Label — always shown for all roles */}
                      <div className="flex flex-col shrink-0 select-none w-10 mt-0.5">
                        <span className="text-[10px] font-bold font-mono text-muted-foreground leading-none">
                          {loop.name}
                        </span>
                        {labelName && (
                          <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider leading-relaxed">
                            {labelName}
                          </span>
                        )}
                      </div>

                      {/* Script text (read-only) — hidden when hideScriptText */}
                      {!hideScriptText && (
                        <p className="text-xs text-foreground leading-relaxed font-medium select-text flex-1 mt-0.5">
                          {scriptText || (
                            <span className="text-muted-foreground/40 italic select-none">
                              (Belum ada teks script)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back translation textarea row */}
              <div className="flex items-start gap-3 pl-9">
                {/* "Terjemahan Balik" label */}
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0 mt-2 w-20 text-right select-none leading-tight">
                  Terjemahan<br />Balik
                </span>

                {/* Back translation textarea */}
                <textarea
                  ref={(el) => {
                    textareaRefs.current[loop.id] = el;
                    if (el) resizeTextarea(el);
                  }}
                  value={inputValue}
                  placeholder="Ketik terjemahan balik di sini..."
                  rows={1}
                  onChange={(e) => {
                    setLocalInputs({
                      ...localInputs,
                      [loop.id]: e.target.value,
                    });
                  }}
                  onInput={(e) => resizeTextarea(e.currentTarget)}
                  onBlur={(e) =>
                    handleBlur(loop.id, e.target.value, dbBackTranslation)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 min-w-0 bg-muted border border-border rounded px-2.5 py-1 text-xs text-foreground placeholder-muted-foreground/45 focus:outline-none focus:border-border focus:bg-background transition-colors resize-none overflow-hidden leading-relaxed"
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 text-muted-foreground text-xs italic select-none">
          Tidak ada scene aktif. Silakan pilih scene terlebih dahulu.
        </div>
      )}
    </div>
  );
}

