"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scene, Loop } from "../../ProjectClient";

interface AudioSource {
  name: string;
  url: string;
}

interface ConsultTabProps {
  activeScene: Scene | null;
  audioSources: AudioSource[];
  activeLoopPlayId: string | null;
  handlePlayLoop: (loopId: string, startMs: number) => void;
  onSaveBackTranslation: (loopId: string, text: string) => Promise<void>;
  isLoading: boolean;
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
}: ConsultTabProps) {
  // Script picker — own state independent of DraftTab
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string>(() =>
    audioSources.length > 0 ? audioSources[0].url : "",
  );

  const selectedSourceIndex = useMemo(
    () =>
      Math.max(
        0,
        audioSources.findIndex((s) => s.url === selectedSourceUrl),
      ),
    [audioSources, selectedSourceUrl],
  );

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

  const getAudioSourceLabel = (value: string | null) => {
    if (!value) return "Pilih Audio";
    const selected = audioSources.find((source) => source.url === value);
    return selected?.name.replace(/\.wav$/i, "") || "default_audio";
  };

  return (
    <div className="divide-y divide-zinc-850">
      {/* Header — script text picker */}
      {activeScene && (
        <div className="px-3.5 py-1.5 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-foreground select-none flex items-center gap-2">
          <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
            Script:
          </span>
          <Select
            value={selectedSourceUrl}
            onValueChange={(val) => {
              if (val) setSelectedSourceUrl(val);
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-6 text-[10px] font-mono border-border bg-background min-w-[100px] cursor-pointer"
            >
              <SelectValue placeholder="Pilih Audio">
                {(value) => getAudioSourceLabel(value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {audioSources.map((source) => (
                <SelectItem key={source.url} value={source.url}>
                  {source.name.replace(/\.wav$/i, "")}
                </SelectItem>
              ))}
              {audioSources.length === 0 && (
                <SelectItem value="">default_audio</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeScene ? (
        loops.map((loop) => {
          const rec = loop.recording;
          const scriptText = getScriptTextForIndex(loop, selectedSourceIndex);

          // back_translation — same value as BackTranslateTab
          const dbBackTranslation = rec?.back_translation || "";
          const inputValue =
            localInputs[loop.id] !== undefined
              ? localInputs[loop.id]
              : dbBackTranslation;

          return (
            <div
              key={loop.id}
              className="px-3.5 py-3 hover:bg-muted/10 transition-colors space-y-1.5"
            >
              {/* Top row: Play + Loop name + Script text (read-only) */}
              <div className="flex items-start gap-3">
                {/* Play button */}
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

                {/* Loop name */}
                <span className="text-[10px] font-bold font-mono text-muted-foreground shrink-0 mt-1.5 w-10">
                  {loop.name}
                </span>

                {/* Script text (read-only) */}
                <p className="text-xs text-foreground leading-relaxed font-medium select-text flex-1">
                  {scriptText || (
                    <span className="text-muted-foreground/40 italic select-none">
                      (Belum ada teks script)
                    </span>
                  )}
                </p>
              </div>

              {/* Bottom row: aligned spacer + back translation textarea */}
              <div className="flex items-start gap-3">
                {/* Spacer — matches play button width */}
                <div className="w-6 shrink-0" />

                {/* Back label aligns where Loop name is */}
                <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground/60 shrink-0 mt-1.5 w-10 text-center select-none"></span>

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
