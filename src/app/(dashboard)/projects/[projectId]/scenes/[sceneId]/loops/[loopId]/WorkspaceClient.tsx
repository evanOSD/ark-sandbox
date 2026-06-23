"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Mic, Square, Tag, Save, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PanelImperativeHandle } from "react-resizable-panels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMsToTimecode } from "@/lib/timecode";
import { WavRecorder } from "@/lib/wav-recorder";
import { saveKeyTermTranslation } from "../../../../loops/actions";
import dynamic from "next/dynamic";

const AudioEditor = dynamic(() => import("./components/AudioEditor"), { ssr: false });

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  translation?: {
    id: string;
    translated_text: string | null;
    recorded_audio_url: string | null;
  } | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  script_text_1?: string | null;
  script_text_2?: string | null;
  script_text_3?: string | null;
  script_text_4?: string | null;
  key_terms: KeyTerm[];
}

export interface Template {
  id: string;
  video_url: string | null;
  audio_url: string | null;
  audio_sources?: Array<{ name: string; url: string; script_text: string | null }> | null;
  mne_audio_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  template_id: string;
  templates: Template;
}

interface WorkspaceClientProps {
  project: Project;
  loop: Loop;
  existingRecordingUrl: string | null;
}

export function WorkspaceClient({
  project,
  loop,
  existingRecordingUrl,
}: WorkspaceClientProps) {
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyTermsOpen, setIsKeyTermsOpen] = useState(false);
  const keyTermsPanelRef = useRef<PanelImperativeHandle>(null);

  useEffect(() => {
    if (isKeyTermsOpen) {
      keyTermsPanelRef.current?.resize("40");
    } else {
      keyTermsPanelRef.current?.collapse();
    }
  }, [isKeyTermsOpen]);

  // Key Term Translation states initialized from props
  const [termTranslations, setTermTranslations] = useState<
    Record<
      string,
      { text: string; blob: Blob | null; url: string | null; isRecording: boolean; instance: WavRecorder | null }
    >
  >(() => {
    const initial: Record<
      string,
      { text: string; blob: Blob | null; url: string | null; isRecording: boolean; instance: WavRecorder | null }
    > = {};
    loop.key_terms.forEach((term) => {
      initial[term.id] = {
        text: term.translation?.translated_text || "",
        blob: null,
        url: term.translation?.recorded_audio_url || null,
        isRecording: false,
        instance: null,
      };
    });
    return initial;
  });

  // Key Term Audio Recording Handlers
  const startTermRecording = async (termId: string) => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setTermTranslations((prev) => ({
        ...prev,
        [termId]: {
          ...prev[termId],
          isRecording: true,
          instance: recorder,
          blob: null,
        },
      }));
    } catch (err) {
      alert("Gagal mengakses mikrofon: " + (err instanceof Error ? err.message : err));
    }
  };

  const stopTermRecording = (termId: string) => {
    const state = termTranslations[termId];
    if (!state?.instance) return;

    const blob = state.instance.stop();
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        isRecording: false,
        instance: null,
        blob: blob,
        url: URL.createObjectURL(blob),
      },
    }));
  };

  const handleTermTextChange = (termId: string, val: string) => {
    setTermTranslations((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        text: val,
      },
    }));
  };

  const saveTermTranslation = async (termId: string) => {
    const state = termTranslations[termId];
    if (!state) return;

    setIsSaving(true);
    try {
      const file = state.blob ? new File([state.blob], `term-${termId}.wav`, { type: "audio/wav" }) : null;

      await saveKeyTermTranslation(project.id, termId, state.text, file);
      alert("Terjemahan kata kunci berhasil disimpan!");
    } catch (err) {
      alert("Gagal menyimpan kata kunci: " + (err instanceof Error ? err.message : err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground select-none">
      
      {/* 1. Header/Top Bar */}
      <header className="h-12 bg-muted border-b border-border flex items-center justify-between px-4 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${project.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary text-muted-foreground hover:text-foreground animate-fade-in" title="Kembali ke Proyek">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-muted-foreground">{project.name}</span>
            <span className="text-muted-foreground/50 font-bold">/</span>
            <span className="font-black text-foreground uppercase tracking-wide">{loop.name}</span>
            <span className="text-xs border border-border rounded-full px-2.5 py-0.5 bg-muted/60 text-muted-foreground font-mono">
              {formatMsToTimecode(loop.start_time_ms)} - {formatMsToTimecode(loop.end_time_ms)}
            </span>
          </div>
        </div>

        {/* Right side: Save Status Info */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none font-medium pr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Workspace Aktif</span>
        </div>
      </header>

      {/* 2. Main split container */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup id="workspace-group" orientation="horizontal">
          <ResizablePanel id="editor-panel" minSize="50">
            <AudioEditor
              project={project}
              loop={loop}
              existingRecordingUrl={existingRecordingUrl}
              isKeyTermsOpen={isKeyTermsOpen}
              onToggleKeyTerms={() => setIsKeyTermsOpen(!isKeyTermsOpen)}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className={!isKeyTermsOpen ? "hidden" : ""} />
          
          <ResizablePanel 
            id="keyterms-panel"
            panelRef={keyTermsPanelRef}
            collapsible={true}
            collapsedSize="0"
            defaultSize="0"
            maxSize="40"
            minSize="20"
            onResize={(size) => {
              // Ignore typescript checking on size parameter structure to support multi versions
              const asPercentage = typeof size === 'number' ? size : (size as unknown as {asPercentage: number})?.asPercentage;
              if (asPercentage === 0) {
                if (isKeyTermsOpen) setIsKeyTermsOpen(false);
              } else {
                if (!isKeyTermsOpen) setIsKeyTermsOpen(true);
              }
            }}
            className="bg-background flex flex-col border-l border-border"
          >
            <div className="border-b border-border p-4 bg-muted/10 shrink-0">
              <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-emerald-500" /> Kamus Kata Kunci (Key Terms)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Kata kunci di putaran ini yang perlu disepakati ejaan dan pelafalannya.
              </p>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {loop.key_terms.map((term) => {
                const trans = termTranslations[term.id] || { text: "", blob: null, url: null, isRecording: false };

                return (
                  <div
                    key={term.id}
                    className="border border-border rounded-lg p-3.5 space-y-3 hover:border-border transition-all bg-background/40 text-foreground"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{term.term}</h4>
                        {term.original_word && (
                          <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
                            Bahasa Asal: {term.original_word}
                          </span>
                        )}
                      </div>
                    </div>
                    {term.meaning_or_note && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
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
                          onChange={(e) => handleTermTextChange(term.id, e.target.value)}
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* 3. Bottom Bar / Status Bar */}
      <footer className="h-7 bg-muted border-t border-border flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>Putaran: {loop.name}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="font-mono">Durasi: {((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)}s</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Workspace Aktif</span>
        </div>
      </footer>
    </div>
  );
}
