"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Mic, Square, Tag, Save, ChevronLeft, FileText, Check, AlertTriangle } from "lucide-react";
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
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isRefAudioLoaded, setIsRefAudioLoaded] = useState(false);
  const [isRefAudioSliced, setIsRefAudioSliced] = useState(false);
  const [hasUnsavedRecording, setHasUnsavedRecording] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("idle");
  
  const keyTermsPanelRef = useRef<PanelImperativeHandle>(null);

  useEffect(() => {
    const panel = keyTermsPanelRef.current;
    if (!panel) return;

    if (isKeyTermsOpen || isLogsOpen) {
      panel.resize("40");
    } else {
      panel.collapse();
    }
  }, [isKeyTermsOpen, isLogsOpen]);

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
              onToggleKeyTerms={() => {
                setIsKeyTermsOpen(!isKeyTermsOpen);
                if (!isKeyTermsOpen) setIsLogsOpen(false);
              }}
              isLogsOpen={isLogsOpen}
              onToggleLogs={() => {
                setIsLogsOpen(!isLogsOpen);
                if (!isLogsOpen) setIsKeyTermsOpen(false);
              }}
              onRefAudioStatusChange={(loaded, sliced, hasUnsaved) => {
                setIsRefAudioLoaded(loaded);
                setIsRefAudioSliced(sliced);
                setHasUnsavedRecording(hasUnsaved);
              }}
              onUploadStatusChange={(step) => {
                setUploadStep(step);
              }}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className={(!isKeyTermsOpen && !isLogsOpen) ? "hidden" : ""} />
          
          <ResizablePanel 
            id="keyterms-panel"
            panelRef={keyTermsPanelRef}
            collapsible={true}
            collapsedSize="0"
            defaultSize="0"
            maxSize="40"
            minSize="20"
            onResize={(size, id, prevSize) => {
              const asPercentage = typeof size === 'number' ? size : (size as unknown as {asPercentage: number})?.asPercentage;
              const prevPercentage = prevSize === undefined 
                ? undefined 
                : (typeof prevSize === 'number' ? prevSize : (prevSize as unknown as {asPercentage: number})?.asPercentage);
              
              if (asPercentage === 0) {
                if (prevPercentage !== undefined && prevPercentage > 0) {
                  if (isKeyTermsOpen) setIsKeyTermsOpen(false);
                  if (isLogsOpen) setIsLogsOpen(false);
                }
              } else {
                if (prevPercentage === 0 && !isKeyTermsOpen && !isLogsOpen) {
                  setIsKeyTermsOpen(true);
                }
              }
            }}
            className="bg-background flex flex-col border-l border-border"
          >
            {isKeyTermsOpen && (
              <>
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
              </>
            )}

            {isLogsOpen && (
              <>
                <div className="border-b border-border p-4 bg-muted/10 shrink-0">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-indigo-500" /> Logs Audio Referensi
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status penyimpanan dan pemotongan audio referensi di browser.
                  </p>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                  {/* Log Item 1: Browser Storage Status */}
                  <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">Penyimpanan Browser</h4>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isRefAudioLoaded
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {isRefAudioLoaded ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 mr-1" /> Tersimpan
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" /> Memuat...
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isRefAudioLoaded
                        ? "Audio referensi telah berhasil diunduh dan didecode ke dalam memori browser."
                        : "Mengunduh dan mendekode file audio referensi dari server..."}
                    </p>
                  </div>

                  {/* Log Item 2: Audio Slicing Status */}
                  <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">Pemotongan Audio (Slicing)</h4>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isRefAudioSliced
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {isRefAudioSliced ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 mr-1" /> Selesai Sliced
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse mr-1" /> Belum Sliced
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isRefAudioSliced
                        ? `Audio referensi berhasil dipotong agar sesuai dengan rentang loop: ${formatMsToTimecode(loop.start_time_ms)} - ${formatMsToTimecode(loop.end_time_ms)} (${((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(2)} detik).`
                        : "Sedang diproses atau gagal dipotong (menggunakan fallback audio asli)."}
                    </p>
                    <div className="text-[10px] text-muted-foreground/60 font-mono space-y-0.5 pt-1.5 border-t border-border/40">
                      <div>Start: {loop.start_time_ms} ms ({formatMsToTimecode(loop.start_time_ms)})</div>
                      <div>End: {loop.end_time_ms} ms ({formatMsToTimecode(loop.end_time_ms)})</div>
                      <div>Durasi: {loop.end_time_ms - loop.start_time_ms} ms</div>
                    </div>
                  </div>

                  {/* Log Item 3: Status Penyimpanan Rekaman */}
                  <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">Status Penyimpanan Rekaman</h4>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        uploadStep !== "idle"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : hasUnsavedRecording
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : existingRecordingUrl
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-550/10 text-zinc-400 border-zinc-550/20"
                      }`}>
                        {uploadStep !== "idle" ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" /> Mengunggah...
                          </>
                        ) : hasUnsavedRecording ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse mr-1" /> Belum Diunggah
                          </>
                        ) : existingRecordingUrl ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 mr-1" /> Tersimpan di Server
                          </>
                        ) : (
                          <>
                            Belum Ada Rekaman
                          </>
                        )}
                      </span>
                    </div>

                    {uploadStep !== "idle" ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Sedang memproses penyimpanan rekaman Anda secara permanen ke server:
                        </p>
                        <div className="space-y-1.5 bg-muted/20 border border-border/50 rounded-md p-2.5 font-mono text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              uploadStep === "config" ? "bg-amber-500 animate-pulse" : ["cloudinary", "database", "cleanup", "success"].includes(uploadStep) ? "bg-emerald-500" : "bg-zinc-600"
                            }`} />
                            <span className={uploadStep === "config" ? "text-foreground font-semibold" : ["cloudinary", "database", "cleanup", "success"].includes(uploadStep) ? "text-emerald-400" : "text-muted-foreground"}>
                              [1/4] Kredensial Unggah
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              uploadStep === "cloudinary" ? "bg-amber-500 animate-pulse" : ["database", "cleanup", "success"].includes(uploadStep) ? "bg-emerald-500" : "bg-zinc-600"
                            }`} />
                            <span className={uploadStep === "cloudinary" ? "text-foreground font-semibold" : ["database", "cleanup", "success"].includes(uploadStep) ? "text-emerald-400" : "text-muted-foreground"}>
                              [2/4] Unggah ke Cloud
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              uploadStep === "database" ? "bg-amber-500 animate-pulse" : ["cleanup", "success"].includes(uploadStep) ? "bg-emerald-500" : "bg-zinc-600"
                            }`} />
                            <span className={uploadStep === "database" ? "text-foreground font-semibold" : ["cleanup", "success"].includes(uploadStep) ? "text-emerald-400" : "text-muted-foreground"}>
                              [3/4] Catat ke Database
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              uploadStep === "cleanup" ? "bg-amber-500 animate-pulse" : uploadStep === "success" ? "bg-emerald-500" : "bg-zinc-600"
                            }`} />
                            <span className={uploadStep === "cleanup" ? "text-foreground font-semibold" : uploadStep === "success" ? "text-emerald-400" : "text-muted-foreground"}>
                              [4/4] Bersihkan Cache Lokal
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {hasUnsavedRecording ? (
                            existingRecordingUrl ? (
                              "PERINGATAN: Anda baru saja mengedit rekaman. Perubahan terbaru Anda baru tersimpan di browser secara lokal (IndexedDB) dan belum dikirim ke server. Harap klik 'Simpan Rekaman' untuk memperbarui rekaman di server secara permanen."
                            ) : (
                              "PERINGATAN: Rekaman baru telah dibuat tetapi masih tersimpan di IndexedDB browser Anda. Jika Anda menutup browser atau membersihkan cache, rekaman ini akan hilang. Harap klik 'Simpan Rekaman' untuk mengirimkannya ke server secara permanen."
                            )
                          ) : existingRecordingUrl ? (
                            "Rekaman suara Anda telah berhasil dikirim ke server Cloudinary dan tercatat di Supabase. Rekaman ini aman dan dapat diputar kembali."
                          ) : (
                            "Belum ada rekaman suara yang dibuat untuk loop putaran ini. Gunakan tombol Rekam di panel bawah untuk mulai merekam suara pelafalan Anda."
                          )}
                        </p>
                        {existingRecordingUrl && (
                          <div className="text-[10px] text-muted-foreground/60 font-mono break-all pt-1.5 border-t border-border/40">
                            {hasUnsavedRecording ? "URL Versi Server Saat Ini: " : "URL: "}{existingRecordingUrl}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}
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
