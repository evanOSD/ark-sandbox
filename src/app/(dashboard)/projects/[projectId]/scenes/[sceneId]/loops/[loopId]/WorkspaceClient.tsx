"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Square, Tag, Save, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  existingTranslationText?: string | null;
}

export function WorkspaceClient({
  project,
  loop,
  existingRecordingUrl,
  existingTranslationText,
}: WorkspaceClientProps) {
  // States
  const [isSaving, setIsSaving] = useState(false);

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
    <div className="dark flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      
      {/* 1. Header/Top Bar */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${project.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-zinc-400 hover:text-foreground animate-fade-in" title="Kembali ke Proyek">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-zinc-450">{project.name}</span>
            <span className="text-zinc-800 font-bold">/</span>
            <span className="font-black text-zinc-200 uppercase tracking-wide">{loop.name}</span>
            <span className="text-xs border border-zinc-800 rounded-full px-2.5 py-0.5 bg-zinc-900/60 text-zinc-400 font-mono">
              {formatMsToTimecode(loop.start_time_ms)} - {formatMsToTimecode(loop.end_time_ms)}
            </span>
          </div>
        </div>

        {/* Right side: Save Status Info */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 select-none font-medium pr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Workspace Aktif</span>
        </div>
      </header>

      {/* 2. Main split container */}
      <div className="flex-1 overflow-hidden">
        <AudioEditor
          project={project}
          loop={loop}
          existingRecordingUrl={existingRecordingUrl}
          existingTranslationText={existingTranslationText || null}
        >
          {/* Key Terms Panel */}
          <Card className="border border-zinc-800 bg-zinc-900/50 shadow-2xl text-zinc-100 overflow-hidden flex flex-col">
            <CardHeader className="border-b border-zinc-850 pb-3">
              <CardTitle className="text-sm font-bold tracking-wide uppercase text-zinc-400 flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-emerald-500" /> Kamus Kata Kunci (Key Terms)
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Kata kunci di putaran ini yang perlu disepakati ejaan dan pelafalannya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 overflow-y-auto">
              {loop.key_terms.map((term) => {
                const trans = termTranslations[term.id] || { text: "", blob: null, url: null, isRecording: false };

                return (
                  <div
                    key={term.id}
                    className="border border-zinc-850 rounded-lg p-3.5 space-y-3 hover:border-zinc-750 transition-all bg-zinc-950/40 text-zinc-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100">{term.term}</h4>
                        {term.original_word && (
                          <span className="text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-400 px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
                            Bahasa Asal: {term.original_word}
                          </span>
                        )}
                      </div>
                    </div>
                    {term.meaning_or_note && (
                      <p className="text-xs text-zinc-400 italic leading-relaxed">
                        Definisi: {term.meaning_or_note}
                      </p>
                    )}

                    <div className="border-t border-zinc-850 pt-3 space-y-2.5">
                      {/* Text Translation Input */}
                      <div className="space-y-1">
                        <Label
                          htmlFor={`t-text-${term.id}`}
                          className="text-[11px] font-semibold text-zinc-400 uppercase"
                        >
                          Ejaan Terjemahan Lokal
                        </Label>
                        <Input
                          id={`t-text-${term.id}`}
                          value={trans.text}
                          onChange={(e) => handleTermTextChange(term.id, e.target.value)}
                          placeholder="Ketik ejaan/kata terjemahan lokal..."
                          className="h-8.5 text-xs bg-zinc-950 border-zinc-850 text-zinc-100 placeholder-zinc-650 focus:border-zinc-700 focus:bg-zinc-950/80 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Oral Audio Translation */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-zinc-400 uppercase">
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
                              className="h-8 px-2 font-semibold text-xs gap-1 text-zinc-400 hover:text-zinc-200"
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
                          className="h-8 font-semibold text-xs gap-1 px-3 border border-zinc-800 text-zinc-300 hover:text-white bg-zinc-900/40 hover:bg-zinc-900"
                        >
                          <Save className="w-3.5 h-3.5" /> Simpan Kata Kunci
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loop.key_terms.length === 0 && (
                <div className="text-center p-6 text-xs text-zinc-550 italic">
                  Tidak ada kata kunci yang ditempelkan di putaran ini.
                </div>
              )}
            </CardContent>
          </Card>
        </AudioEditor>
      </div>

      {/* 3. Bottom Bar / Status Bar */}
      <footer className="h-7 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-3 text-[10px] text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>Putaran: {loop.name}</span>
          <span className="text-zinc-800">|</span>
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
