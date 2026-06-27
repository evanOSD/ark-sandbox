import React from "react";
import { Tag, Mic, Square, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WavRecorder } from "@/lib/wav-recorder";
import { Loop } from "@/types";

interface KeyTermsPanelProps {
  loop: Loop;
  termTranslations: Record<
    string,
    {
      text: string;
      blob: Blob | null;
      url: string | null;
      isRecording: boolean;
      instance: WavRecorder | null;
    }
  >;
  isSaving: boolean;
  startTermRecording: (termId: string) => void;
  stopTermRecording: (termId: string) => void;
  handleTermTextChange: (termId: string, val: string) => void;
  saveTermTranslation: (termId: string) => void;
}

export function KeyTermsPanel({
  loop,
  termTranslations,
  isSaving,
  startTermRecording,
  stopTermRecording,
  handleTermTextChange,
  saveTermTranslation,
}: KeyTermsPanelProps) {
  return (
    <>
      <div className="border-b border-border p-4 bg-muted/10 shrink-0">
        <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
          <Tag className="h-4.5 w-4.5 text-emerald-500" /> Kamus Kata Kunci (Key
          Terms)
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Kata kunci di putaran ini yang perlu disepakati ejaan dan
          pelafalannya.
        </p>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {loop.key_terms.map((term) => {
          const trans = termTranslations[term.id] || {
            text: "",
            blob: null,
            url: null,
            isRecording: false,
          };

          return (
            <div
              key={term.id}
              className="border border-border rounded-lg p-3.5 space-y-3 hover:border-border transition-all bg-background/40 text-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {term.term}
                  </h4>
                  {term.original_word && (
                    <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
                      Bahasa Asal: {term.original_word}
                    </span>
                  )}
                </div>
              </div>
              {term.meaning_or_note && (
                <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-line">
                  Definisi: {term.meaning_or_note}
                </p>
              )}

              <div className="border-t border-border pt-3 space-y-2.5">
                {/* Text Translation Input */}
                <div className="space-y-1">
                  <Label
                    htmlFor={`t-text-${term.id}`}
                    className="text-[11px] font-semibold text-muted-foreground uppercase"
                  >
                    Ejaan Terjemahan Lokal
                  </Label>
                  <Input
                    id={`t-text-${term.id}`}
                    value={trans.text}
                    onChange={(e) =>
                      handleTermTextChange(term.id, e.target.value)
                    }
                    placeholder="Ketik ejaan/kata terjemahan lokal..."
                    className="h-8.5 text-xs bg-background border-border text-foreground placeholder-muted-foreground focus:border-border focus:bg-background/80 focus:ring-emerald-500"
                  />
                </div>

                {/* Oral Audio Translation */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Rekaman Suara Pelafalan
                  </Label>
                  <div className="flex items-center gap-2">
                    {trans.isRecording ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 px-3 font-semibold text-xs gap-1"
                        onClick={() => stopTermRecording(term.id)}
                      >
                        <Square className="w-3.5 h-3.5 fill-white" /> Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 font-semibold text-xs gap-1 border-emerald-950/30 hover:border-emerald-800/40 text-emerald-400 bg-emerald-950/10"
                        onClick={() => startTermRecording(term.id)}
                      >
                        <Mic className="w-3.5 h-3.5" /> Rekam Pelafalan
                      </Button>
                    )}

                    {trans.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 font-semibold text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const audio = new Audio(trans.url!);
                          audio.play();
                        }}
                      >
                        Putar Pelafalan
                      </Button>
                    )}
                  </div>
                </div>

                {/* Save Key Term Translation Button */}
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => saveTermTranslation(term.id)}
                    disabled={isSaving || trans.isRecording}
                    className="h-8 font-semibold text-xs gap-1 px-3 border border-border text-foreground/90 hover:text-foreground bg-muted/40 hover:bg-muted"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Kata Kunci
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {loop.key_terms.length === 0 && (
          <div className="text-center p-6 text-xs text-muted-foreground italic">
            Tidak ada kata kunci yang ditempelkan di putaran ini.
          </div>
        )}
      </div>
    </>
  );
}
