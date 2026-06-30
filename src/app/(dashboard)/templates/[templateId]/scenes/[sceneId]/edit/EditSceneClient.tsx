"use client";

import React, { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabeledMultiSelect, LabeledMultiSelectOption } from "@/components/shared/LabeledMultiSelect";
import { formatMsToTimecode, parseTimecodeToMs } from "@/lib/timecode";
import {
  bindKeyTermToLoop,
  removeKeyTermFromLoop,
  saveLoopsBulk,
} from "../../../../actions";

interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
}

interface LoopItem {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  startTimecode?: string;
  endTimecode?: string;
  key_terms: KeyTerm[];
  isNew?: boolean;
}

interface EditSceneClientProps {
  templateId: string;
  scene: {
    id: string;
    name: string;
    sequence_number: number;
    loops: LoopItem[];
  };
  allAvailableKeyTerms: KeyTerm[];
}

export function EditSceneClient({ templateId, scene, allAvailableKeyTerms }: EditSceneClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the initial state locally so we can update it after an instant deletion
  // without relying on a full component remount from router.refresh()
  const [internalInitialLoops, setInternalInitialLoops] = useState<LoopItem[]>(scene.loops);

  // Loops local state
  const [loops, setLoops] = useState<LoopItem[]>(() =>
    scene.loops.map((l) => ({
      ...l,
      startTimecode: formatMsToTimecode(l.start_time_ms),
      endTimecode: formatMsToTimecode(l.end_time_ms),
    }))
  );
  const [deletedLoopIds, setDeletedLoopIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Key Term Dialog States
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);
  const [selectedKeyTermIds, setSelectedKeyTermIds] = useState<string[]>([]);

  // Determine if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (deletedLoopIds.length > 0) return true;
    if (loops.length !== internalInitialLoops.length) return true;
    for (let i = 0; i < loops.length; i++) {
      const l = loops[i];
      const orig = internalInitialLoops.find((x) => x.id === l.id);
      if (!orig) return true; // new loop
      const origStart = formatMsToTimecode(orig.start_time_ms);
      const origEnd = formatMsToTimecode(orig.end_time_ms);
      if (
        l.name !== orig.name ||
        l.sequence_number !== orig.sequence_number ||
        l.startTimecode !== origStart ||
        l.endTimecode !== origEnd
      ) {
        return true;
      }
    }
    return false;
  }, [loops, internalInitialLoops, deletedLoopIds]);

  // Handlers for Loops
  const handleAddLoop = () => {
    const nextSeq =
      loops.length > 0
        ? Math.max(...loops.map((l) => l.sequence_number)) + 1
        : 1;

    const newLoop: LoopItem = {
      id: `new-${Date.now()}`,
      name: "",
      sequence_number: nextSeq,
      start_time_ms: 0,
      end_time_ms: 0,
      startTimecode: "00:00",
      endTimecode: "00:00",
      key_terms: [],
      isNew: true,
    };
    setLoops([...loops, newLoop]);
  };

  const handleUpdateSeq = (id: string, seq: number) => {
    setLoops(
      loops.map((l) => (l.id === id ? { ...l, sequence_number: seq } : l))
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setLoops(loops.map((l) => (l.id === id ? { ...l, name } : l)));
  };

  const handleUpdateStart = (id: string, startVal: string) => {
    setLoops(
      loops.map((l) => (l.id === id ? { ...l, startTimecode: startVal } : l))
    );
  };

  const handleUpdateEnd = (id: string, endVal: string) => {
    setLoops(
      loops.map((l) => (l.id === id ? { ...l, endTimecode: endVal } : l))
    );
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (id.startsWith("new-")) {
      setLoops(loops.filter((l) => l.id !== id));
      return;
    }

    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus loop "${name || "tanpa nama"}"?`
    );
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const { deleteLoop } = await import("../../../../actions");
      await deleteLoop(id, templateId);
      
      // Update local state instantly so UI reflects the deletion without losing other unsaved edits
      setLoops(loops.filter((l) => l.id !== id));
      setInternalInitialLoops(internalInitialLoops.filter((l) => l.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus loop");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLoops(
      internalInitialLoops.map((l) => ({
        ...l,
        startTimecode: formatMsToTimecode(l.start_time_ms),
        endTimecode: formatMsToTimecode(l.end_time_ms),
      }))
    );
    setDeletedLoopIds([]);
  };

  const handleSaveBulk = async () => {
    // Validate
    for (const l of loops) {
      if (!l.name.trim()) {
        alert("Semua loop harus memiliki nama yang valid");
        return;
      }
      if (!l.startTimecode?.trim() || !l.endTimecode?.trim()) {
        alert(`Batas waktu untuk loop "${l.name}" wajib diisi`);
        return;
      }
      try {
        const startMs = parseTimecodeToMs(l.startTimecode);
        const endMs = parseTimecodeToMs(l.endTimecode);
        if (startMs >= endMs) {
          alert(`Waktu mulai loop "${l.name}" harus lebih kecil dari waktu selesai`);
          return;
        }
      } catch {
        alert(`Format timecode loop "${l.name}" tidak valid (gunakan format mm:ss atau hh:mm:ss)`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const toCreate = loops
        .filter((l) => l.isNew)
        .map((l) => ({
          name: l.name,
          sequence_number: l.sequence_number,
          start_time_ms: parseTimecodeToMs(l.startTimecode!),
          end_time_ms: parseTimecodeToMs(l.endTimecode!),
        }));

      const toUpdate = loops
        .filter((l) => {
          if (l.isNew) return false;
          const orig = internalInitialLoops.find((x) => x.id === l.id);
          if (!orig) return false;
          const origStart = formatMsToTimecode(orig.start_time_ms);
          const origEnd = formatMsToTimecode(orig.end_time_ms);
          return (
            orig.name !== l.name ||
            orig.sequence_number !== l.sequence_number ||
            origStart !== l.startTimecode ||
            origEnd !== l.endTimecode
          );
        })
        .map((l) => ({
          id: l.id,
          name: l.name,
          sequence_number: l.sequence_number,
          start_time_ms: parseTimecodeToMs(l.startTimecode!),
          end_time_ms: parseTimecodeToMs(l.endTimecode!),
        }));

      await saveLoopsBulk(scene.id, templateId, toCreate, toUpdate, deletedLoopIds);
      setDeletedLoopIds([]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for CSV Import
  const handleTriggerCsvUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const newLoopsList = [...loops];

      let addedCount = 0;
      let startSeq =
        loops.length > 0
          ? Math.max(...loops.map((l) => l.sequence_number)) + 1
          : 1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length >= 3) {
          const loopName = parts[0].trim();
          const startTimecode = parts[1].trim();
          const endTimecode = parts[2].trim();
          if (loopName && startTimecode && endTimecode) {
            newLoopsList.push({
              id: `new-csv-${Date.now()}-${i}`,
              name: loopName,
              sequence_number: startSeq++,
              start_time_ms: 0,
              end_time_ms: 0,
              startTimecode,
              endTimecode,
              key_terms: [],
              isNew: true,
            });
            addedCount++;
          }
        }
      }

      if (addedCount === 0) {
        throw new Error(
          "Berkas CSV kosong atau format tidak sesuai (loop,start_time,end_time)"
        );
      }

      setLoops(newLoopsList);
      alert(
        `Berhasil memuat ${addedCount} loops dari berkas CSV ke dalam tabel. Silakan klik "Simpan Perubahan" untuk menyimpan ke database.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengimpor CSV");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handlers for Key Terms
  const handleAddKeyTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoopId) return;
    if (selectedKeyTermIds.length === 0) {
      alert("Silakan pilih kata kunci terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    try {
      for (const keyTermId of selectedKeyTermIds) {
        await bindKeyTermToLoop(activeLoopId, keyTermId, templateId);
      }
      setIsTermDialogOpen(false);
      setSelectedKeyTermIds([]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menautkan kata kunci");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKeyTerm = async (loopId: string, termId: string) => {
    if (!confirm("Hapus kata kunci ini dari loop?")) {
      return;
    }

    setIsLoading(true);
    try {
      await removeKeyTermFromLoop(loopId, termId, templateId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus kata kunci");
    } finally {
      setIsLoading(false);
    }
  };

  // Sort loops for rendering
  const sortedDisplayLoops = useMemo(() => {
    return [...loops].sort((a, b) => a.sequence_number - b.sequence_number);
  }, [loops]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-0 relative">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/templates/${templateId}`}
            className="inline-flex items-center gap-1.5 text-xs underline font-bold text-info hover:text-info-hover transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform font-bold group-hover:-translate-x-1" />
            Kembali ke Template
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">
            {scene.name}
          </span>
        </div>

        <Link href={`/templates/keyterms`}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold bg-background border-border hover:bg-secondary cursor-pointer"
          >
            Pergi ke Key Terms Editor
          </Button>
        </Link>
      </div>

      {/* ─── Page title ─── */}
      <div className="shrink-0 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">
          Kelola Loops
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5">
          Ubah urutan, nama loop, dan batas waktu langsung di dalam tabel. Perubahan akan disimpan sekaligus.
        </p>
      </div>

      {/* ─── Toolbar: Unsaved Banner & Action Buttons ─── */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card mb-4 shrink-0 h-14">
        {/* Left Indicator */}
        <div className="text-xs text-primary font-bold">
          {hasChanges ? "Perubahan Terdeteksi" : "Semua Perubahan Disimpan"}
        </div>

        {/* Center: Unsaved Changes Banner */}
        <div className="flex-1 flex justify-center">
          {hasChanges && (
            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full text-xs font-bold animate-in fade-in duration-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Ada perubahan yang belum disimpan!</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleTriggerCsvUpload}
            disabled={isLoading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !hasChanges}
            className={`text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-sm transition-all ${
              hasChanges
                ? "bg-destructive hover:bg-destructive-hover text-destructive-foreground"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Batal
          </Button>
          <Button
            type="button"
            onClick={handleSaveBulk}
            disabled={isLoading || !hasChanges}
            className={`text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-sm transition-all ${
              hasChanges
                ? "bg-primary hover:bg-primary-hover text-primary-foreground"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Simpan Perubahan
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={handleAddLoop}
            disabled={isLoading}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-md"
          >
            <Plus className="h-4 w-4" /> Tambah Loop
          </Button>
        </div>
      </div>

      {/* ─── Table Container ─── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border/60 bg-card flex flex-col min-h-0 mb-4">
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full border-collapse text-left text-xs text-muted-foreground">
            <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-foreground border-b border-border/40 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-20">Urutan</th>
                <th className="px-4 py-3">Nama Loop</th>
                <th className="px-4 py-3 w-32">Waktu Mulai</th>
                <th className="px-4 py-3 w-32">Waktu Selesai</th>
                <th className="px-4 py-3 w-24">Durasi</th>
                <th className="px-4 py-3">Kata Kunci (Key Terms)</th>
                <th className="px-4 py-3 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sortedDisplayLoops.map((loop) => {
                let durationStr = "-";
                try {
                  const s = parseTimecodeToMs(loop.startTimecode || "");
                  const e = parseTimecodeToMs(loop.endTimecode || "");
                  if (e > s) {
                    durationStr = `${((e - s) / 1000).toFixed(1)}s`;
                  }
                } catch {
                  // silent
                }

                return (
                  <tr
                    key={loop.id}
                    className={`hover:bg-muted/10 transition-colors align-middle ${
                      loop.isNew ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={loop.sequence_number}
                        onChange={(e) =>
                          handleUpdateSeq(loop.id, Number(e.target.value))
                        }
                        className="h-8 text-xs font-mono font-bold bg-background border-border w-14"
                        disabled={isLoading}
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={loop.name}
                        onChange={(e) => handleUpdateName(loop.id, e.target.value)}
                        placeholder="Masukkan nama loop..."
                        className="h-8 text-xs font-medium bg-background border-border w-full max-w-xs"
                        disabled={isLoading}
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={loop.startTimecode || ""}
                        onChange={(e) => handleUpdateStart(loop.id, e.target.value)}
                        placeholder="00:00"
                        className="h-8 text-xs font-mono bg-background border-border w-24"
                        disabled={isLoading}
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={loop.endTimecode || ""}
                        onChange={(e) => handleUpdateEnd(loop.id, e.target.value)}
                        placeholder="00:15"
                        className="h-8 text-xs font-mono bg-background border-border w-24"
                        disabled={isLoading}
                        required
                      />
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-foreground font-semibold">
                      {durationStr}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
                        {loop.key_terms.map((term) => (
                          <div
                            key={term.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded-full border border-border group"
                            title={term.meaning_or_note || undefined}
                          >
                            <span className="font-medium">{term.term}</span>
                            {term.original_word && (
                              <span className="text-[9px] text-muted-foreground">
                                ({term.original_word})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyTerm(loop.id, term.id)}
                              className="text-muted-foreground hover:text-red-500 ml-1 hover:scale-110 transition-transform font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loop.isNew}
                          onClick={() => {
                            setActiveLoopId(loop.id);
                            setIsTermDialogOpen(true);
                          }}
                          className={`h-5 rounded-full px-2 text-[10px] font-semibold border border-dashed text-primary border-primary/20 hover:border-primary/50 py-0 ${
                            loop.isNew ? "opacity-50 cursor-not-allowed border-muted" : ""
                          }`}
                          title={
                            loop.isNew
                              ? "Simpan loop terlebih dahulu untuk menambahkan kata kunci"
                              : "Tambah Kata Kunci"
                          }
                        >
                          + Key Term
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(loop.id, loop.name)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-colors"
                        disabled={isLoading}
                        title="Hapus Row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {loops.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground italic"
                  >
                    Belum ada loop terdaftar di scene ini. Klik tombol &quot;Tambah Loop&quot; atau &quot;Import CSV&quot; di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Dialog for Adding Key Term ─── */}
      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent className="sm:max-w-[40%] max-h-[85vh] flex flex-col">
          <form onSubmit={handleAddKeyTerm} className="flex flex-col flex-1 min-h-0">
            <DialogHeader className="shrink-0">
              <DialogTitle>Tautkan Kata Kunci</DialogTitle>
              <DialogDescription>
                Pilih satu atau beberapa kata kunci penting yang sudah terdaftar untuk ditautkan pada loop ini.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 pr-0.5">
              <div className="space-y-2">
                <Label>Pilih Kata Kunci</Label>
                {(() => {
                  const activeLoop = loops.find((l) => l.id === activeLoopId);
                  const existingTermIds = activeLoop ? activeLoop.key_terms.map((kt) => kt.id) : [];
                  const selectableKeyTerms = allAvailableKeyTerms.filter(
                    (kt) => !existingTermIds.includes(kt.id)
                  );

                  if (selectableKeyTerms.length > 0) {
                    const multiSelectOptions: LabeledMultiSelectOption[] = selectableKeyTerms.map((kt) => ({
                      value: kt.id,
                      label: kt.term,
                      description: kt.meaning_or_note || undefined,
                      badge: kt.original_word || undefined,
                    }));

                    return (
                      <LabeledMultiSelect
                        options={multiSelectOptions}
                        values={selectedKeyTermIds}
                        onChange={setSelectedKeyTermIds}
                        searchPlaceholder="Cari kata kunci..."
                        emptyText="Tidak ada kata kunci yang cocok."
                        className="border rounded-lg bg-background p-2"
                      />
                    );
                  }

                  return (
                    <div className="text-xs text-muted-foreground bg-muted p-3 text-center rounded-lg border border-border/50 font-medium">
                      Tidak ada kata kunci baru yang tersedia untuk ditautkan di loop ini.
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-lg bg-primary/5 border border-border/60 p-3 space-y-2 shrink-0">
                <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                  Jika kata kunci yang Anda cari tidak tersedia, silakan tambahkan kata kunci baru terlebih dahulu melalui <strong>Key Terms Editor</strong>.
                </p>
                <Link href={`/templates/keyterms`} target="_blank">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-[10px] font-bold gap-1 mt-1 bg-background border-border hover:bg-secondary cursor-pointer"
                  >
                    Pergi ke Key Terms Editor
                  </Button>
                </Link>
              </div>
            </div>
            <DialogFooter className="shrink-0 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTermDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menautkan..." : "Tautkan Kata"}
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
