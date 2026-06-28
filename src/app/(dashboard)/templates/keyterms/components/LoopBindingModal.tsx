"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  Loader2,
  Link2,
  ChevronDown,
  ChevronRight,
  Folder,
  BookOpen,
} from "lucide-react";
import { KeyTermDB, TemplateDB, SceneDB, LoopDB } from "@/types/key-terms";
import { Button } from "@/components/ui/button";

interface LoopBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: KeyTermDB;
  templates: TemplateDB[];
  scenes: SceneDB[];
  loops: LoopDB[];
  initialSelectedLoopIds: Set<string>;
  onSave: (loopIds: string[]) => Promise<void>;
  isPending: boolean;
}

export function LoopBindingModal({
  isOpen,
  onClose,
  term,
  templates,
  scenes,
  loops,
  initialSelectedLoopIds,
  onSave,
  isPending,
}: LoopBindingModalProps) {
  const [selectedLoopIds, setSelectedLoopIds] = useState<Set<string>>(
    () => new Set(initialSelectedLoopIds),
  );
  const [expandedTemplates, setExpandedTemplates] = useState<
    Record<string, boolean>
  >({});
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>(
    {},
  );

  if (!isOpen) return null;

  // Toggle template expand/collapse
  const toggleTemplate = (templateId: string) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  // Toggle scene expand/collapse
  const toggleScene = (sceneId: string) => {
    setExpandedScenes((prev) => ({
      ...prev,
      [sceneId]: !prev[sceneId],
    }));
  };

  // Toggle loop selection checkbox
  const toggleLoopSelection = (loopId: string) => {
    setSelectedLoopIds((prev) => {
      const next = new Set(prev);
      if (next.has(loopId)) {
        next.delete(loopId);
      } else {
        next.add(loopId);
      }
      return next;
    });
  };

  // Check if all loops in a scene are checked
  const isSceneAllChecked = (sceneId: string) => {
    const sceneLoops = loops.filter((l) => l.scene_id === sceneId);
    if (sceneLoops.length === 0) return false;
    return sceneLoops.every((l) => selectedLoopIds.has(l.id));
  };

  // Toggle all loops in a scene
  const toggleSceneAllLoops = (sceneId: string) => {
    const sceneLoops = loops.filter((l) => l.scene_id === sceneId);
    const allChecked = isSceneAllChecked(sceneId);

    setSelectedLoopIds((prev) => {
      const next = new Set(prev);
      sceneLoops.forEach((l) => {
        if (allChecked) {
          next.delete(l.id);
        } else {
          next.add(l.id);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    await onSave(Array.from(selectedLoopIds));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-amber-500" />
              Hubungkan Loop:{" "}
              <span className="text-amber-500 font-bold">
                &quot;{term.term}&quot;
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-[11px] text-muted-foreground italic border border-border/60 bg-muted/5 p-3 rounded-lg">
            Centang kotak putaran cerita (loop) di mana kata kunci ini akan
            digunakan. Kata kunci tersebut akan otomatis muncul pada workspace
            pengisi suara loop bersangkutan.
          </p>

          {templates.map((tmpl) => {
            const tmplScenes = scenes.filter((s) => s.template_id === tmpl.id);
            const isExpanded = !!expandedTemplates[tmpl.id];

            return (
              <div
                key={tmpl.id}
                className="border border-border/80 rounded-lg overflow-hidden bg-muted/5"
              >
                {/* Template Row */}
                <div
                  onClick={() => toggleTemplate(tmpl.id)}
                  className="p-3 bg-muted/25 hover:bg-muted/40 transition-colors flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Folder className="h-4 w-4 text-amber-500 fill-amber-500/10" />
                    <span className="text-xs font-bold text-foreground">
                      Template: {tmpl.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-background border border-border/40 px-2 py-0.5 rounded">
                    {tmplScenes.length} Scenes
                  </span>
                </div>

                {/* Expanded Scenes */}
                {isExpanded && (
                  <div className="p-3 pl-6 border-t border-border/40 space-y-3 bg-background">
                    {tmplScenes.map((scn) => {
                      const scnLoops = loops.filter(
                        (l) => l.scene_id === scn.id,
                      );
                      const isScnExpanded = !!expandedScenes[scn.id];
                      const allChecked = isSceneAllChecked(scn.id);

                      return (
                        <div
                          key={scn.id}
                          className="border border-border/40 rounded bg-card/40"
                        >
                          {/* Scene Header */}
                          <div className="p-2 bg-muted/15 flex items-center justify-between select-none">
                            <div
                              onClick={() => toggleScene(scn.id)}
                              className="flex items-center gap-1.5 cursor-pointer flex-1"
                            >
                              {isScnExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-bold text-foreground/80">
                                {scn.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Select All in Scene */}
                              {isScnExpanded && scnLoops.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleSceneAllLoops(scn.id)}
                                  className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                                >
                                  {allChecked ? "Uncheck Semua" : "Pilih Semua"}
                                </button>
                              )}
                              <span className="text-[9px] font-mono text-muted-foreground bg-muted border border-border/40 px-1.5 rounded scale-90">
                                {scnLoops.length} Loops
                              </span>
                            </div>
                          </div>

                          {/* Scene Loops */}
                          {isScnExpanded && (
                            <div className="p-2 pl-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-3 gap-2">
                              {scnLoops.map((loopItem) => {
                                const isSelected = selectedLoopIds.has(
                                  loopItem.id,
                                );
                                return (
                                  <div
                                    key={loopItem.id}
                                    onClick={() =>
                                      toggleLoopSelection(loopItem.id)
                                    }
                                    className={`flex items-center gap-2 p-1.5 border rounded cursor-pointer transition-all select-none
                                      ${
                                        isSelected
                                          ? "border-amber-500/50 bg-amber-500/5 text-amber-500 font-bold"
                                          : "border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                                      }`}
                                  >
                                    <div
                                      className={`h-4 w-4 border rounded flex items-center justify-center shrink-0 transition-all
                                      ${
                                        isSelected
                                          ? "bg-amber-500 border-amber-600 text-white"
                                          : "border-border bg-background"
                                      }`}
                                    >
                                      {isSelected && (
                                        <Check className="h-3 w-3 stroke-[3]" />
                                      )}
                                    </div>
                                    <span className="text-[11px] truncate">
                                      Loop{" "}
                                      {loopItem.sequence_number
                                        .toString()
                                        .padStart(4, "0")}{" "}
                                      ({loopItem.name})
                                    </span>
                                  </div>
                                );
                              })}

                              {scnLoops.length === 0 && (
                                <div className="col-span-full p-4 text-center text-[10px] text-muted-foreground italic">
                                  Tidak ada loop di scene ini.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {tmplScenes.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground italic select-none">
                        Tidak ada scene di template ini.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
          <div className="text-[10px] text-muted-foreground select-none">
            Terpilih:{" "}
            <strong className="text-amber-500">{selectedLoopIds.size}</strong>{" "}
            loops
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Hubungan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
