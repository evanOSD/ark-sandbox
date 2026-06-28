"use client";

import React, { useState, useTransition } from "react";
import {
  KeyTermDB,
  LoopKeyTermDB,
  CategoryDB,
  TemplateDB,
  SceneDB,
  LoopDB,
} from "@/types/key-terms";
import {
  saveKeyTerm,
  deleteKeyTerm,
  updateKeyTermLoopRelations,
  saveCategory,
  deleteCategory,
} from "./actions";
import { useRouter } from "next/navigation";

// Import local components
import { KeyTermsToolbar } from "./components/KeyTermsToolbar";
import { KeyTermsTable } from "./components/KeyTermsTable";
import { TermFormModal } from "./components/TermFormModal";
import { LoopBindingModal } from "./components/LoopBindingModal";
import { CategoryManagerModal } from "./components/CategoryManagerModal";

interface KeyTermsEditorClientProps {
  initialKeyTerms: KeyTermDB[];
  initialRelations: LoopKeyTermDB[];
  initialCategories: CategoryDB[];
  templates: TemplateDB[];
  scenes: SceneDB[];
  loops: LoopDB[];
}

const FALLBACK_CATEGORIES = [
  "Semantic Groupings",
  "Supernatural beings",
  "People with religious function",
  "Places of worship",
  "Messages, communications",
  "Secular rulers and people",
  "Eternal life / eternal death",
  "Mercy",
];

export function KeyTermsEditorClient({
  initialKeyTerms,
  initialRelations,
  initialCategories,
  templates,
  scenes,
  loops,
}: KeyTermsEditorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Dynamic Categories state
  const [activeCategories, setActiveCategories] = useState<CategoryDB[]>(() => {
    if (initialCategories && initialCategories.length > 0) {
      return initialCategories;
    }
    return FALLBACK_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      name: c,
    }));
  });

  // Modal visibility states
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isLoopModalOpen, setIsLoopModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Active items states
  const [editingTerm, setEditingTerm] = useState<KeyTermDB | null>(null);
  const [bindingTerm, setBindingTerm] = useState<KeyTermDB | null>(null);

  // Local active data mapping (synchronous UI updates)
  const [activeKeyTerms, setActiveKeyTerms] =
    useState<KeyTermDB[]>(initialKeyTerms);
  const [activeRelations, setActiveRelations] =
    useState<LoopKeyTermDB[]>(initialRelations);

  // Filtered terms to display
  const filteredTerms = activeKeyTerms.filter((kt) => {
    const matchesSearch =
      kt.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (kt.original_word &&
        kt.original_word.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (kt.meaning_or_note &&
        kt.meaning_or_note.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      kt.category === selectedCategoryFilter ||
      (selectedCategoryFilter === "Uncategorized" && !kt.category);

    return matchesSearch && matchesCategory;
  });

  // Open modal for creating new key term
  const handleOpenAddModal = () => {
    setEditingTerm(null);
    setIsTermModalOpen(true);
  };

  // Open modal for editing key term
  const handleOpenEditModal = (term: KeyTermDB) => {
    setEditingTerm(term);
    setIsTermModalOpen(true);
  };

  // Open modal for managing loop relationships
  const handleOpenLoopModal = (term: KeyTermDB) => {
    setBindingTerm(term);
    setIsLoopModalOpen(true);
  };

  // Save Key Term Form submission
  const handleSaveTerm = async (data: {
    term: string;
    originalWord: string | null;
    meaningOrNote: string | null;
    category: string | null;
  }) => {
    startTransition(async () => {
      try {
        const saved = await saveKeyTerm({
          id: editingTerm?.id || null,
          term: data.term,
          originalWord: data.originalWord,
          meaningOrNote: data.meaningOrNote,
          category: data.category,
        });

        // Update local client states
        if (editingTerm) {
          setActiveKeyTerms((prev) =>
            prev.map((t) => (t.id === editingTerm.id ? saved : t)),
          );
        } else {
          setActiveKeyTerms((prev) => [saved, ...prev]);
        }

        setIsTermModalOpen(false);
        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Gagal menyimpan kata kunci",
        );
      }
    });
  };

  // Delete Key Term
  const handleDeleteTerm = (term: KeyTermDB) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus kata kunci "${term.term}" beserta seluruh hubungan loop-nya?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteKeyTerm(term.id);

        // Update local client states
        setActiveKeyTerms((prev) => prev.filter((t) => t.id !== term.id));
        setActiveRelations((prev) =>
          prev.filter((rel) => rel.key_term_id !== term.id),
        );

        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Gagal menghapus kata kunci",
        );
      }
    });
  };

  // Save loop binding relationships
  const handleSaveLoopBindings = async (loopIds: string[]) => {
    if (!bindingTerm) return;

    startTransition(async () => {
      try {
        await updateKeyTermLoopRelations(bindingTerm.id, loopIds);

        // Update local relations state
        setActiveRelations((prev) => [
          ...prev.filter((rel) => rel.key_term_id !== bindingTerm.id),
          ...loopIds.map((loopId) => ({
            key_term_id: bindingTerm.id,
            template_loop_id: loopId,
          })),
        ]);

        setIsLoopModalOpen(false);
        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Gagal menyimpan hubungan loop",
        );
      }
    });
  };

  // Save Category (create/update)
  const handleSaveCategory = async (id: string | null, name: string) => {
    const isEditing = id !== null && !id.startsWith("default-");

    startTransition(async () => {
      try {
        const saved = await saveCategory(isEditing ? id : null, name);

        if (isEditing) {
          // Update in categories state
          setActiveCategories((prev) =>
            prev.map((c) => (c.id === id ? saved : c)),
          );

          // Rename occurrences in activeKeyTerms as well
          const oldName = activeCategories.find((c) => c.id === id)?.name;
          if (oldName) {
            setActiveKeyTerms((prev) =>
              prev.map((kt) =>
                kt.category === oldName ? { ...kt, category: saved.name } : kt,
              ),
            );
          }
        } else {
          // If it was a mock category and we created a real one, let's filter out the mock one
          setActiveCategories((prev) => {
            const clean = prev.filter(
              (c) => c.name !== saved.name && !c.id.startsWith("default-"),
            );
            return [...clean, saved].sort((a, b) =>
              a.name.localeCompare(b.name),
            );
          });
        }

        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal menyimpan kategori");
      }
    });
  };

  // Delete Category
  const handleDeleteCategory = async (cat: CategoryDB) => {
    if (cat.id.startsWith("default-")) {
      setActiveCategories((prev) => prev.filter((c) => c.id !== cat.id));
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Semua kata kunci yang menggunakan kategori ini akan diubah kategorinya menjadi "Belum Dikategorikan".`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCategory(cat.id, cat.name);

        // Remove from state
        setActiveCategories((prev) => prev.filter((c) => c.id !== cat.id));
        // Reset category in key terms referencing this category
        setActiveKeyTerms((prev) =>
          prev.map((kt) =>
            kt.category === cat.name ? { ...kt, category: null } : kt,
          ),
        );

        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal menghapus kategori");
      }
    });
  };

  // Get selected term bound loops Set
  const getBoundLoopIds = () => {
    if (!bindingTerm) return new Set<string>();
    const bound = activeRelations
      .filter((rel) => rel.key_term_id === bindingTerm.id)
      .map((rel) => rel.template_loop_id);
    return new Set(bound);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters Toolbar using LabeledSelect & custom Button */}
      <KeyTermsToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategoryFilter={selectedCategoryFilter}
        setSelectedCategoryFilter={setSelectedCategoryFilter}
        activeCategories={activeCategories}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Main Grid Table using custom Button */}
      <KeyTermsTable
        terms={filteredTerms}
        activeRelations={activeRelations}
        onOpenLoopModal={handleOpenLoopModal}
        onOpenEditModal={handleOpenEditModal}
        onDeleteTerm={handleDeleteTerm}
      />

      {/* Term Form Dialog Modal */}
      {isTermModalOpen && (
        <TermFormModal
          key={editingTerm ? editingTerm.id : "new-term"}
          isOpen={isTermModalOpen}
          onClose={() => setIsTermModalOpen(false)}
          editingTerm={editingTerm}
          activeCategories={activeCategories}
          onSave={handleSaveTerm}
          isPending={isPending}
        />
      )}

      {/* Loop Binding Checklist Modal */}
      {isLoopModalOpen && bindingTerm && (
        <LoopBindingModal
          key={bindingTerm.id}
          isOpen={isLoopModalOpen}
          onClose={() => setIsLoopModalOpen(false)}
          term={bindingTerm}
          templates={templates}
          scenes={scenes}
          loops={loops}
          initialSelectedLoopIds={getBoundLoopIds()}
          onSave={handleSaveLoopBindings}
          isPending={isPending}
        />
      )}

      {/* Category CRUD Manager Modal */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          key="category-manager"
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          activeCategories={activeCategories}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          isPending={isPending}
        />
      )}
    </div>
  );
}
