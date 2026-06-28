"use client";

import React, { useState } from "react";
import { X, Edit, Trash2, Loader2, Folder } from "lucide-react";
import { CategoryDB } from "@/types/key-terms";
import { Button } from "@/components/ui/button";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategories: CategoryDB[];
  onSaveCategory: (id: string | null, name: string) => Promise<void>;
  onDeleteCategory: (cat: CategoryDB) => Promise<void>;
  isPending: boolean;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  activeCategories,
  onSaveCategory,
  onDeleteCategory,
  isPending,
}: CategoryManagerModalProps) {
  const [categoryForm, setCategoryForm] = useState({
    id: null as string | null,
    name: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    await onSaveCategory(categoryForm.id, categoryForm.name.trim());
    setCategoryForm({ id: null, name: "" });
  };

  const startEditCategory = (cat: CategoryDB) => {
    setCategoryForm({ id: cat.id, name: cat.name });
  };

  const handleCancelEdit = () => {
    setCategoryForm({ id: null, name: "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col h-[75vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Folder className="h-4.5 w-4.5 text-amber-500" />
            Kelola Kategori Semantik (Semantic Groupings)
          </h3>
          <button
            onClick={() => {
              onClose();
              setCategoryForm({ id: null, name: "" });
            }}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-b border-border/80 bg-muted/5 flex gap-2"
          >
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={
                categoryForm.id
                  ? "Ubah nama kategori..."
                  : "Nama kategori baru..."
              }
              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="flex items-center gap-1"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {categoryForm.id ? "Simpan" : "Tambah"}
            </Button>

            {categoryForm.id && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                size="sm"
              >
                Batal
              </Button>
            )}
          </form>

          {/* Categories Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeCategories.map((cat) => {
              const isDefault = cat.id.startsWith("default-");
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 border border-border/60 rounded-lg hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-xs font-semibold text-foreground">
                      {cat.name}
                    </span>
                    {isDefault && (
                      <span className="text-[9px] bg-muted border border-border/60 text-muted-foreground px-1.5 py-0.2 rounded font-semibold select-none scale-90">
                        Bawaan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit Inline */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEditCategory(cat)}
                      title="Ubah Nama"
                      className="text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete Category */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDeleteCategory(cat)}
                      title="Hapus Kategori"
                      className="text-muted-foreground hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {activeCategories.length === 0 && (
              <div className="text-center p-6 text-xs text-muted-foreground italic select-none">
                Belum ada kategori terdaftar.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              setCategoryForm({ id: null, name: "" });
            }}
            size="sm"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
