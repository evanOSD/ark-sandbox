"use client";

import React, { useState, useEffect } from "react";
import { Scene } from "../../ProjectClient";
import { createClient } from "@/utils/supabase/client";
import { TranslationData, TermItem, CategoryItem } from "@/types/key-terms";
import { KeyTermSidebar } from "./KeyTermSidebar";
import { KeyTermDetailPanel } from "./KeyTermDetailPanel";

interface KeyTermsTabProps {
  activeScene: Scene | null;
  projectId: string;
  onSaveStateChange?: (status: "saving" | "saved" | "idle") => void;
  handlePlayLoop: (loopId: string, startMs: number) => void;
  activeLoopPlayId: string | null;
}

export function KeyTermsTab({
  activeScene,
  projectId,
  onSaveStateChange,
  handlePlayLoop,
  activeLoopPlayId,
}: KeyTermsTabProps) {
  const [selectedTerm, setSelectedTerm] = useState<TermItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [translations, setTranslations] = useState<
    Record<string, TranslationData>
  >({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [dbSupport, setDbSupport] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Extract unique key terms from scene loops (only real Supabase data)
  const allKeyTerms = React.useMemo(() => {
    const uniqueMap = new Map<string, TermItem>();
    if (activeScene && activeScene.loops) {
      for (const loop of activeScene.loops) {
        if (loop.key_terms) {
          for (const kt of loop.key_terms) {
            uniqueMap.set(kt.id, {
              id: kt.id,
              term: kt.term,
              original_word: kt.original_word,
              meaning_or_note: kt.meaning_or_note,
              category: kt.category ?? null,
            });
          }
        }
      }
    }
    return Array.from(uniqueMap.values());
  }, [activeScene]);

  // Load translations and check database capabilities
  useEffect(() => {
    const loadTranslations = async () => {
      setIsDataLoading(true);
      try {
        const supabase = createClient();

        // Check if database table columns exist
        const { error: probeError } = await supabase
          .from("project_key_term_translations")
          .select("back_translation, notes")
          .limit(1);

        const hasDbSupport = !probeError;
        setDbSupport(hasDbSupport);

        // Fetch translations
        const { data, error } = await supabase
          .from("project_key_term_translations")
          .select("*")
          .eq("project_id", projectId);

        if (error) throw error;

        const transMap: Record<string, TranslationData> = {};
        for (const row of data || []) {
          transMap[row.key_term_id] = {
            id: row.id,
            translated_text: row.translated_text || "",
            key_term_audio_url: row.key_term_audio_url || "",
            key_term_bt_audio_url: row.key_term_bt_audio_url || "",
            back_translation: hasDbSupport
              ? row.back_translation || ""
              : localStorage.getItem(
                  `back_trans_${projectId}_${row.key_term_id}`,
                ) || "",
            notes: hasDbSupport
              ? row.notes || ""
              : localStorage.getItem(`notes_${projectId}_${row.key_term_id}`) ||
                "",
          };
        }

        setTranslations(transMap);
      } catch (e) {
        console.error("Gagal memuat terjemahan:", e);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (projectId) {
      loadTranslations();
    }
  }, [projectId]);

  // Build filtered categories list — only from real Supabase data, grouped by category field
  const categoriesWithTerms: CategoryItem[] = React.useMemo(() => {
    const filteredTerms = allKeyTerms.filter((kt) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        kt.term.toLowerCase().includes(q) ||
        (kt.original_word && kt.original_word.toLowerCase().includes(q)) ||
        (kt.meaning_or_note && kt.meaning_or_note.toLowerCase().includes(q))
      );
    });

    // Group by category; uncategorized goes to "Belum Dikategorikan"
    const groupMap = new Map<string, TermItem[]>();
    for (const kt of filteredTerms) {
      const groupName = kt.category?.trim() || "Belum Dikategorikan";
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(kt);
    }

    // Sort groups: named categories alphabetically first, "Belum Dikategorikan" last
    const entries = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === "Belum Dikategorikan") return 1;
      if (b === "Belum Dikategorikan") return -1;
      return a.localeCompare(b);
    });

    return entries.map(([name, terms]) => ({
      name,
      terms: terms.sort((a, b) => a.term.localeCompare(b.term)),
    }));
  }, [allKeyTerms, searchQuery]);

  // Derive the active selected term
  const activeTerm =
    selectedTerm ||
    categoriesWithTerms.find((c) => c.terms.length > 0)?.terms[0] ||
    null;

  // Save changes callback from child component
  const handleSaveTranslation = async (fields: Partial<TranslationData>) => {
    if (!activeTerm) return;

    setSavingStates((prev) => ({ ...prev, [activeTerm.id]: true }));
    onSaveStateChange?.("saving");
    try {
      const supabase = createClient();
      const existing = translations[activeTerm.id];

      const updateData: {
        updated_at: string;
        translated_text?: string | null;
        key_term_audio_url?: string | null;
        key_term_bt_audio_url?: string | null;
        back_translation?: string | null;
        notes?: string | null;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (fields.translated_text !== undefined) {
        updateData.translated_text = fields.translated_text || null;
      }

      if (fields.key_term_audio_url !== undefined) {
        updateData.key_term_audio_url = fields.key_term_audio_url || null;
      }

      if (fields.key_term_bt_audio_url !== undefined) {
        updateData.key_term_bt_audio_url = fields.key_term_bt_audio_url || null;
      }

      if (dbSupport) {
        if (fields.back_translation !== undefined)
          updateData.back_translation = fields.back_translation || null;
        if (fields.notes !== undefined) updateData.notes = fields.notes || null;
      } else {
        if (fields.back_translation !== undefined) {
          localStorage.setItem(
            `back_trans_${projectId}_${activeTerm.id}`,
            fields.back_translation,
          );
        }
        if (fields.notes !== undefined) {
          localStorage.setItem(
            `notes_${projectId}_${activeTerm.id}`,
            fields.notes,
          );
        }
      }

      if (existing?.id) {
        const { error } = await supabase
          .from("project_key_term_translations")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Anda belum login");

        const insertData = {
          project_id: projectId,
          key_term_id: activeTerm.id,
          recorded_by: user.id,
          ...updateData,
        };

        const { data, error } = await supabase
          .from("project_key_term_translations")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTranslations((prev) => ({
            ...prev,
            [activeTerm.id]: {
              ...(prev[activeTerm.id] || {}),
              id: data.id,
            },
          }));
        }
      }

      setTranslations((prev) => ({
        ...prev,
        [activeTerm.id]: {
          ...(prev[activeTerm.id] || {}),
          ...fields,
        },
      }));
      onSaveStateChange?.("saved");
    } catch (e) {
      console.error("Gagal menyimpan terjemahan:", e);
      onSaveStateChange?.("idle");
    } finally {
      setSavingStates((prev) => ({ ...prev, [activeTerm.id]: false }));
    }
  };

  const isSavingActive = activeTerm ? !!savingStates[activeTerm.id] : false;
  const activeTranslation = activeTerm
    ? translations[activeTerm.id] || null
    : null;

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-background text-foreground border-t border-border">
      {/* Left Column: Sidebar List */}
      <KeyTermSidebar
        categoriesWithTerms={categoriesWithTerms}
        activeTerm={activeTerm}
        onSelectTerm={setSelectedTerm}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isDataLoading={isDataLoading}
      />

      {/* Right Column: Detail Panel */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 bg-card/5">
        {activeTerm ? (
          <KeyTermDetailPanel
            key={activeTerm.id}
            selectedTerm={activeTerm}
            projectId={projectId}
            initialTranslation={activeTranslation}
            activeScene={activeScene}
            onSaveTranslation={handleSaveTranslation}
            isSaving={isSavingActive}
            handlePlayLoop={handlePlayLoop}
            activeLoopPlayId={activeLoopPlayId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs select-none italic">
            {allKeyTerms.length === 0
              ? "Belum ada kata kunci yang ditautkan ke scene ini. Silakan tambahkan kata kunci melalui Key Terms Editor."
              : "Pilih kata kunci dari daftar di sebelah kiri untuk melihat detail terjemahan."}
          </div>
        )}
      </div>
    </div>
  );
}
