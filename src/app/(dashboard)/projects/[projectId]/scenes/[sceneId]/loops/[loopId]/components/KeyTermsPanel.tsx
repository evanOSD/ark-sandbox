import React from "react";
import { Tag } from "lucide-react";
import { Loop } from "@/types";
import { renderFormattedText } from "@/utils/text-formatting";

interface KeyTermsPanelProps {
  loop: Loop;
}

export function KeyTermsPanel({ loop }: KeyTermsPanelProps) {
  return (
    <>
      <div className="border-b border-border p-4 bg-muted/10 shrink-0">
        <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
          <Tag className="h-4.5 w-4.5 text-emerald-500" />
          Kata Kunci (Key Terms)
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Kata kunci di putaran ini yang perlu disepakati ejaan dan
          pelafalannya.
        </p>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {loop.key_terms.map((term) => {
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
                  Definisi: {renderFormattedText(term.meaning_or_note)}
                </p>
              )}
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
