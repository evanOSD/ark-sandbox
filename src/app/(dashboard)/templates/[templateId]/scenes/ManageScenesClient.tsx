"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveScenesBulk } from "../../actions";

interface SceneItem {
  id: string;
  name: string;
  sequence_number: number;
  loopCount: number;
  isNew?: boolean;
}

interface ManageScenesClientProps {
  templateId: string;
  templateName: string;
  initialScenes: SceneItem[];
}

export function ManageScenesClient({
  templateId,
  templateName,
  initialScenes,
}: ManageScenesClientProps) {
  const router = useRouter();

  // Track the initial state locally so we can update it after an instant deletion
  // without relying on a full component remount from router.refresh()
  const [internalInitialScenes, setInternalInitialScenes] =
    useState<SceneItem[]>(initialScenes);

  const [scenes, setScenes] = useState<SceneItem[]>(initialScenes);
  const [deletedSceneIds, setDeletedSceneIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (deletedSceneIds.length > 0) return true;
    if (scenes.length !== internalInitialScenes.length) return true;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const orig = internalInitialScenes.find((x) => x.id === s.id);
      if (!orig) return true; // new scene
      if (s.name !== orig.name || s.sequence_number !== orig.sequence_number) {
        return true;
      }
    }
    return false;
  }, [scenes, internalInitialScenes, deletedSceneIds]);

  const handleAddScene = () => {
    const nextSeq =
      scenes.length > 0
        ? Math.max(...scenes.map((s) => s.sequence_number)) + 1
        : 1;

    const newScene: SceneItem = {
      id: `new-${Date.now()}`,
      name: "",
      sequence_number: nextSeq,
      loopCount: 0,
      isNew: true,
    };
    setScenes([...scenes, newScene]);
  };

  const handleUpdateSeq = (id: string, seq: number) => {
    setScenes(
      scenes.map((s) => (s.id === id ? { ...s, sequence_number: seq } : s)),
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, name } : s)));
  };
  const handleDeleteRow = async (id: string) => {
    if (id.startsWith("new-")) {
      setScenes(scenes.filter((s) => s.id !== id));
      return;
    }

    if (deletedSceneIds.includes(id)) {
      setDeletedSceneIds(deletedSceneIds.filter((x) => x !== id));
    } else {
      setDeletedSceneIds([...deletedSceneIds, id]);
    }
  };

  const handleReset = () => {
    setScenes(internalInitialScenes);
    setDeletedSceneIds([]);
  };

  const handleSaveBulk = async () => {
    const invalidScene = scenes.some(
      (s) => !deletedSceneIds.includes(s.id) && !s.name.trim(),
    );
    if (invalidScene) {
      alert("Semua scene harus memiliki nama yang valid");
      return;
    }

    setIsLoading(true);
    try {
      const toCreate = scenes
        .filter((s) => s.isNew)
        .map((s) => ({
          name: s.name,
          sequence_number: s.sequence_number,
        }));

      const toUpdate = scenes
        .filter((s) => {
          if (s.isNew) return false;
          if (deletedSceneIds.includes(s.id)) return false;
          const orig = internalInitialScenes.find((x) => x.id === s.id);
          return (
            orig &&
            (orig.name !== s.name || orig.sequence_number !== s.sequence_number)
          );
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          sequence_number: s.sequence_number,
        }));

      await saveScenesBulk(templateId, toCreate, toUpdate, deletedSceneIds);

      const remainingScenes = scenes.filter(
        (s) => !deletedSceneIds.includes(s.id),
      );
      setScenes(remainingScenes);
      setInternalInitialScenes(remainingScenes);
      setDeletedSceneIds([]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setIsLoading(false);
    }
  };
  // Sort scenes by sequence number for display
  const sortedDisplayScenes = useMemo(() => {
    return [...scenes].sort((a, b) => a.sequence_number - b.sequence_number);
  }, [scenes]);

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
            {templateName}
          </span>
        </div>
      </div>

      {/* ─── Page title ─── */}
      <div className="shrink-0 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">
          Kelola Scenes
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5">
          Ubah urutan dan nama scene langsung di dalam tabel. Perubahan akan
          disimpan sekaligus.
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
            onClick={handleAddScene}
            disabled={isLoading}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-md"
          >
            <Plus className="h-4 w-4" /> Tambah Scenes
          </Button>
        </div>
      </div>

      {/* ─── Table Container ─── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border/60 bg-card flex flex-col min-h-0 mb-4">
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full border-collapse text-left text-xs text-muted-foreground">
            <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-foreground border-b border-border/40 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-24">Urutan</th>
                <th className="px-4 py-3">Nama Scene</th>
                <th className="px-4 py-3 w-28 text-center">Jumlah Loop</th>
                <th className="px-4 py-3 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sortedDisplayScenes.map((scene) => {
                const isDeleted = deletedSceneIds.includes(scene.id);
                return (
                  <tr
                    key={scene.id}
                    className={`transition-colors align-middle border-b border-border/40 last:border-0 ${
                      scene.isNew ? "bg-emerald-500/5" : ""
                    } ${
                      isDeleted
                        ? "bg-warning/15 hover:bg-warning/20 border-warning/30"
                        : "hover:bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={scene.sequence_number}
                        onChange={(e) =>
                          handleUpdateSeq(scene.id, Number(e.target.value))
                        }
                        className={`h-8 text-xs font-mono font-bold w-16 transition-all ${
                          isDeleted
                            ? "bg-warning/10 border-warning/30 text-warning-foreground opacity-70"
                            : "bg-background border-border"
                        }`}
                        disabled={isLoading || isDeleted}
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={scene.name}
                        onChange={(e) =>
                          handleUpdateName(scene.id, e.target.value)
                        }
                        placeholder="Masukkan nama scene..."
                        className={`h-8 text-xs font-medium w-full max-w-md transition-all ${
                          isDeleted
                            ? "bg-warning/10 border-warning/30 text-warning-foreground opacity-70 line-through"
                            : "bg-background border-border"
                        }`}
                        disabled={isLoading || isDeleted}
                        required
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {scene.loopCount} Loop
                        </span>
                        {!scene.id.startsWith("new-") && !isDeleted && (
                          <Link href={`/templates/${templateId}/scenes/${scene.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] font-semibold px-2 py-0 cursor-pointer"
                            >
                              Edit Loops
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(scene.id)}
                        className={`h-8 w-8 transition-colors ${
                          isDeleted
                            ? "text-warning hover:text-warning-hover"
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                        disabled={isLoading}
                        title={isDeleted ? "Batal Hapus Row" : "Hapus Row"}
                      >
                        {isDeleted ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {scenes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-muted-foreground italic"
                  >
                    Belum ada scene terdaftar. Klik tombol &quot;Tambah
                    Scenes&quot; di atas untuk membuat scene pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
