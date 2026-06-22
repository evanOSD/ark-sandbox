"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Tag, Film, Music, AlignLeft, Clock, Upload, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMsToTimecode } from "@/lib/timecode";
import { createScene, deleteScene, createLoop, deleteLoop, addKeyTermToLoop, removeKeyTermFromLoop, importLoops } from "../actions";

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  key_terms: KeyTerm[];
}

export interface Scene {
  id: string;
  name: string;
  sequence_number: number;
  loops: Loop[];
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  audio_url: string | null;
  audio_sources?: Array<{ name: string; url: string }> | null;
  mne_audio_url?: string | null;
}

interface TemplateClientProps {
  template: Template;
  scenes: Scene[];
}

export function TemplateClient({ template, scenes }: TemplateClientProps) {
  const [isSceneDialogOpen, setIsSceneDialogOpen] = useState(false);
  const [isLoopDialogOpen, setIsLoopDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);

  // Active items for adding loops or key terms
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);
  
  // CSV Import States and Ref
  const [activeImportSceneId, setActiveImportSceneId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [sceneName, setSceneName] = useState("");
  const [sceneSeq, setSceneSeq] = useState(scenes.length + 1);

  const [loopName, setLoopName] = useState("");
  const [loopSeq, setLoopSeq] = useState(1);
  const [loopStart, setLoopStart] = useState("");
  const [loopEnd, setLoopEnd] = useState("");

  const [termText, setTermText] = useState("");
  const [termOriginal, setTermOriginal] = useState("");
  const [termNote, setTermNote] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerCsvUpload = (sceneId: string) => {
    setActiveImportSceneId(sceneId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportSceneId) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const loops: Array<{ name: string; startTimecode: string; endTimecode: string; sequenceNumber: number }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length >= 3) {
          const loopName = parts[0].trim();
          const startTimecode = parts[1].trim();
          const endTimecode = parts[2].trim();
          if (loopName && startTimecode && endTimecode) {
            loops.push({
              name: loopName,
              startTimecode,
              endTimecode,
              sequenceNumber: i,
            });
          }
        }
      }

      if (loops.length === 0) {
        throw new Error("Berkas CSV kosong atau format tidak sesuai (loop,start_time,end_time)");
      }

      await importLoops(activeImportSceneId, template.id, loops);
      alert(`Berhasil mengimpor ${loops.length} loops dari berkas CSV.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengimpor CSV");
    } finally {
      setIsLoading(false);
      setActiveImportSceneId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Sorting helper
  const sortedScenes = [...scenes].sort((a, b) => a.sequence_number - b.sequence_number);
  sortedScenes.forEach((s) => {
    s.loops = [...s.loops].sort((a, b) => a.sequence_number - b.sequence_number);
  });

  const handleCreateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createScene(template.id, sceneName, Number(sceneSeq));
      setIsSceneDialogOpen(false);
      setSceneName("");
      setSceneSeq(scenes.length + 2);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuat scene");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSceneId) return;
    setIsLoading(true);
    try {
      await createLoop(activeSceneId, loopName, Number(loopSeq), loopStart, loopEnd, template.id);
      setIsLoopDialogOpen(false);
      setLoopName("");
      setLoopStart("");
      setLoopEnd("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuat loop");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoopId) return;
    setIsLoading(true);
    try {
      await addKeyTermToLoop(activeLoopId, termText, termOriginal, termNote, template.id);
      setIsTermDialogOpen(false);
      setTermText("");
      setTermOriginal("");
      setTermNote("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambahkan kata kunci");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Back Button & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Template
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {template.description || "Tidak ada deskripsi untuk template ini."}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Link href={`/templates/${template.id}/edit`}>
            <Button variant="outline" className="font-semibold gap-2">
              <Pencil className="h-4 w-4" /> Edit Template
            </Button>
          </Link>
          <Dialog open={isSceneDialogOpen} onOpenChange={setIsSceneDialogOpen}>
            <DialogTrigger render={
              <Button className="font-semibold gap-2">
                <Plus className="h-4 w-4" /> Tambah Scene
              </Button>
            } />
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleCreateScene}>
              <DialogHeader>
                <DialogTitle>Tambah Scene Baru</DialogTitle>
                <DialogDescription>
                  Scene mengelompokkan beberapa loop terjemahan secara berurutan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="s-name">Nama Scene</Label>
                  <Input
                    id="s-name"
                    value={sceneName}
                    onChange={(e) => setSceneName(e.target.value)}
                    placeholder="Contoh: Scene 1: Prolog & Pendahuluan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-seq">Urutan (Sequence Number)</Label>
                  <Input
                    id="s-seq"
                    type="number"
                    value={sceneSeq}
                    onChange={(e) => setSceneSeq(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSceneDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : "Simpan Scene"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Info Media Assets */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Video Referensi Master
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground truncate py-0 pb-4">
            {template.video_url ? (
              <a href={template.video_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">
                {template.video_url}
              </a>
            ) : (
              "Belum ada video terunggah."
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" /> Audio Referensi Master
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground py-0 pb-4 space-y-2">
            {template.audio_sources && template.audio_sources.length > 0 ? (
              <div className="space-y-1.5">
                {template.audio_sources.map((source) => (
                  <div key={source.name} className="flex items-center gap-2 justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                    <span className="font-semibold text-foreground">{source.name}</span>
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {source.url}
                    </a>
                  </div>
                ))}
                {template.mne_audio_url && (
                  <div className="flex items-center gap-2 justify-between border-t border-border/40 pt-1.5 mt-1.5">
                    <span className="font-semibold text-zinc-300">Music & Effects (M&E)</span>
                    <a href={template.mne_audio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {template.mne_audio_url}
                    </a>
                  </div>
                )}
              </div>
            ) : template.audio_url ? (
              <div className="space-y-1.5">
                <a href={template.audio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono truncate block">
                  {template.audio_url}
                </a>
                {template.mne_audio_url && (
                  <div className="flex items-center gap-2 justify-between border-t border-border/40 pt-1.5 mt-1.5">
                    <span className="font-semibold text-zinc-300">Music & Effects (M&E)</span>
                    <a href={template.mne_audio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono truncate block">
                      {template.mne_audio_url}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              "Belum ada audio terunggah."
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scenes Accordion List */}
      <div className="space-y-6">
        {sortedScenes.map((scene) => (
          <Card key={scene.id} className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between p-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded">
                  Scene {scene.sequence_number}
                </span>
                <CardTitle className="text-lg font-bold">{scene.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTriggerCsvUpload(scene.id)}
                  disabled={isLoading}
                  className="font-semibold text-xs gap-1.5 h-8 border-dashed hover:bg-muted/50"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" /> Import CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveSceneId(scene.id);
                    setLoopSeq(scene.loops.length + 1);
                    setIsLoopDialogOpen(true);
                  }}
                  className="font-semibold text-xs gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Loop
                </Button>
                <Link href={`/templates/${template.id}/scenes/${scene.id}/edit`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (confirm("Hapus scene ini beserta semua loop di dalamnya?")) {
                      await deleteScene(scene.id, template.id);
                    }
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y">
                {scene.loops.map((loop) => (
                  <div key={loop.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    {/* Loop Meta */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground font-mono">
                          Loop {loop.sequence_number}
                        </span>
                        <h4 className="font-semibold text-base text-foreground">{loop.name}</h4>
                      </div>
                      
                      {/* Timecode details */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatMsToTimecode(loop.start_time_ms)}</span>
                        <span>&mdash;</span>
                        <span>{formatMsToTimecode(loop.end_time_ms)}</span>
                        <span className="text-[10px] text-muted-foreground/60 ml-1">
                          ({((loop.end_time_ms - loop.start_time_ms) / 1000).toFixed(1)}s)
                        </span>
                      </div>

                      {/* Loop Key Terms */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <Tag className="w-3 h-3 text-primary/70 mr-0.5" />
                        {loop.key_terms.map((term) => (
                          <div
                            key={term.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full border border-border group"
                          >
                            <span>{term.term}</span>
                            {term.original_word && (
                              <span className="text-[10px] text-muted-foreground">({term.original_word})</span>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Hapus kata kunci "${term.term}" dari loop ini?`)) {
                                  await removeKeyTermFromLoop(loop.id, term.id, template.id);
                                }
                              }}
                              className="text-muted-foreground hover:text-red-500 ml-1 hover:scale-110 transition-transform font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveLoopId(loop.id);
                            setIsTermDialogOpen(true);
                          }}
                          className="h-6 rounded-full px-2 text-[11px] font-medium border border-dashed text-primary border-primary/20 hover:border-primary/50"
                        >
                          + Key Term
                        </Button>
                      </div>
                    </div>

                    {/* Loop Actions */}
                    <div className="flex items-center justify-end shrink-0 gap-2">
                      <Link href={`/templates/${template.id}/loops/${loop.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary transition-colors h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (confirm("Apakah Anda yakin ingin menghapus loop ini?")) {
                            await deleteLoop(loop.id, template.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-red-500 transition-colors h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {scene.loops.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Belum ada loop di scene ini. Klik &quot;Tambah Loop&quot; di atas untuk menambahkan.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {sortedScenes.length === 0 && (
          <div className="border-2 border-dashed rounded-xl p-12 text-center">
            <AlignLeft className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Belum ada scene di template ini</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Mulailah dengan menambahkan scene baru, lalu pecah menjadi loop terjemahan.
            </p>
          </div>
        )}
      </div>

      {/* Dialog for Adding Loop */}
      <Dialog open={isLoopDialogOpen} onOpenChange={setIsLoopDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateLoop}>
            <DialogHeader>
              <DialogTitle>Tambah Loop Baru</DialogTitle>
              <DialogDescription>
                Tentukan batas awal dan akhir putaran berdasarkan penunjuk waktu (timecode).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="l-name">Nama Loop</Label>
                <Input
                  id="l-name"
                  value={loopName}
                  onChange={(e) => setLoopName(e.target.value)}
                  placeholder="Contoh: Loop 1 - Ayat 1 sampai 3"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="l-start">Timecode Mulai</Label>
                  <Input
                    id="l-start"
                    value={loopStart}
                    onChange={(e) => setLoopStart(e.target.value)}
                    placeholder="00:00 atau 0:00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l-end">Timecode Selesai</Label>
                  <Input
                    id="l-end"
                    value={loopEnd}
                    onChange={(e) => setLoopEnd(e.target.value)}
                    placeholder="00:15 atau 0:15"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-seq">Urutan (Sequence Number)</Label>
                <Input
                  id="l-seq"
                  type="number"
                  value={loopSeq}
                  onChange={(e) => setLoopSeq(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLoopDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Loop"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding Key Term */}
      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleAddKeyTerm}>
            <DialogHeader>
              <DialogTitle>Tempel Kata Kunci</DialogTitle>
              <DialogDescription>
                Tambahkan kata kunci penting untuk referensi penerjemah di loop ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="t-term">Kata Kunci (Induk)</Label>
                <Input
                  id="t-term"
                  value={termText}
                  onChange={(e) => setTermText(e.target.value)}
                  placeholder="Misal: Kerajaan Allah, Bait Suci"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-orig">Kata Asli/Bahasa Asal (Opsional)</Label>
                <Input
                  id="t-orig"
                  value={termOriginal}
                  onChange={(e) => setTermOriginal(e.target.value)}
                  placeholder="Misal: Basileia tou Theou"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-note">Definisi/Catatan Penting (Opsional)</Label>
                <Input
                  id="t-note"
                  value={termNote}
                  onChange={(e) => setTermNote(e.target.value)}
                  placeholder="Catatan makna kata kunci..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTermDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menambahkan..." : "Tempel Kata"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden input for CSV uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCsvFileChange}
        accept=".csv"
        className="hidden"
      />
    </div>
  );
}
