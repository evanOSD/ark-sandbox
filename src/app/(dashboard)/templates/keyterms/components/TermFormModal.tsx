"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Tag,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from "lucide-react";
import { KeyTermDB, CategoryDB } from "@/types/key-terms";
import { Button } from "@/components/ui/button";
import { normalizeHTML } from "@/utils/text-formatting";

interface TermFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTerm: KeyTermDB | null;
  activeCategories: CategoryDB[];
  onSave: (data: {
    term: string;
    originalWord: string | null;
    meaningOrNote: string | null;
    category: string | null;
  }) => Promise<void>;
  isPending: boolean;
}

export function TermFormModal({
  isOpen,
  onClose,
  editingTerm,
  activeCategories,
  onSave,
  isPending,
}: TermFormModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  const [termForm, setTermForm] = useState(() => {
    if (editingTerm) {
      const hasCategory = activeCategories.some(
        (c) => c.name === (editingTerm.category || ""),
      );
      return {
        term: editingTerm.term,
        originalWord: editingTerm.original_word || "",
        category: hasCategory
          ? editingTerm.category || ""
          : editingTerm.category
            ? "CUSTOM"
            : "",
        customCategory: hasCategory ? "" : editingTerm.category || "",
        meaningOrNote: editingTerm.meaning_or_note || "",
      };
    } else {
      const defaultCat =
        activeCategories.length > 0 ? activeCategories[0].name : "";
      return {
        term: "",
        originalWord: "",
        category: defaultCat,
        customCategory: "",
        meaningOrNote: "",
      };
    }
  });

  // Set default Paragraph Separator to <br> so browser generates clean line breaks instead of div wraps
  useEffect(() => {
    if (isOpen) {
      document.execCommand("defaultParagraphSeparator", false, "br");
    }
  }, [isOpen]);

  // Load and convert database newlines (\n) to visual line breaks (<br>) in WYSIWYG
  useEffect(() => {
    if (isOpen && editorRef.current) {
      const rawNote = editingTerm?.meaning_or_note || "";
      const htmlContent = rawNote.replace(/\n/g, "<br>");
      editorRef.current.innerHTML = htmlContent;
      setIsEditorEmpty(rawNote.trim() === "");
    }
  }, [isOpen, editingTerm]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termForm.term.trim()) return;

    const finalCategory =
      termForm.category === "CUSTOM"
        ? termForm.customCategory.trim()
        : termForm.category;

    // Use current innerHTML from editor to guarantee fresh content
    const currentHTML = editorRef.current?.innerHTML || "";
    const cleanMeaning = normalizeHTML(currentHTML);

    await onSave({
      term: termForm.term.trim(),
      originalWord: termForm.originalWord.trim() || null,
      meaningOrNote: cleanMeaning || null,
      category: finalCategory || null,
    });
  };

  const handleFormat = (
    command: "bold" | "italic" | "underline" | "strikeThrough",
  ) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const normalized = normalizeHTML(currentHTML);
      setTermForm((prev) => ({ ...prev, meaningOrNote: normalized }));
      setIsEditorEmpty(normalized.trim() === "");
      editorRef.current.focus();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    const normalized = normalizeHTML(html);
    setTermForm((prev) => ({ ...prev, meaningOrNote: normalized }));
    setIsEditorEmpty(normalized.trim() === "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!termForm.term.trim()) return;

      const finalCategory =
        termForm.category === "CUSTOM"
          ? termForm.customCategory.trim()
          : termForm.category;

      const currentHTML = editorRef.current?.innerHTML || "";
      const cleanMeaning = normalizeHTML(currentHTML);

      onSave({
        term: termForm.term.trim(),
        originalWord: termForm.originalWord.trim() || null,
        meaningOrNote: cleanMeaning || null,
        category: finalCategory || null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl w-[1000px] max-w-[1000px] h-[500px] max-h-[500px] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-500" />
            {editingTerm ? "Edit Detail Kata Kunci" : "Tambah Kata Kunci Baru"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 flex-1 flex flex-col justify-between overflow-hidden min-h-0"
        >
          {/* Main Grid Content */}
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0 pb-4">
            {/* Left Column (Inputs) */}
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  Nama Kata Kunci <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={termForm.term}
                  onChange={(e) =>
                    setTermForm((prev) => ({ ...prev, term: e.target.value }))
                  }
                  placeholder="Contoh: The Lord - in reference to God"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Original word */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  Bahasa Asal (Original Word)
                </label>
                <input
                  type="text"
                  value={termForm.originalWord}
                  onChange={(e) =>
                    setTermForm((prev) => ({
                      ...prev,
                      originalWord: e.target.value,
                    }))
                  }
                  placeholder="Contoh: kurios"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Category Grouping */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  Pengelompokan Semantik (Category)
                </label>
                <div className="flex gap-2">
                  <select
                    value={termForm.category}
                    onChange={(e) =>
                      setTermForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="bg-background border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">
                      -- Tanpa Kategori (Uncategorized) --
                    </option>
                    <option value="CUSTOM">-- Ketik Kustom --</option>
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  {termForm.category === "CUSTOM" && (
                    <input
                      type="text"
                      required
                      value={termForm.customCategory}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          customCategory: e.target.value,
                        }))
                      }
                      placeholder="Ketik kategori grouping semantik..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (WYSIWYG Editor with formatting tools) */}
            <div className="flex flex-col h-full min-h-0 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground">
                  Definisi & Catatan Penggunaan (Description)
                </label>
                {/* Format buttons */}
                <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded border border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFormat("bold")}
                    title="Tebal (Bold)"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFormat("italic")}
                    title="Miring (Italic)"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFormat("underline")}
                    title="Garis Bawah (Underline)"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFormat("strikeThrough")}
                    title="Coret (Strikethrough)"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Rich Editor Box */}
              <div className="flex-1 w-full relative min-h-[180px] overflow-hidden flex flex-col">
                {isEditorEmpty && (
                  <div className="absolute top-2.5 left-3 text-muted-foreground/40 text-xs pointer-events-none select-none max-w-[95%] leading-relaxed">
                    Masukkan penjelasan semantik, rujukan naskah, atau tips
                    penerjemahan... (Tekan Enter untuk Simpan, Shift+Enter untuk
                    Baris Baru)
                  </div>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 overflow-y-auto leading-relaxed cursor-text outline-none select-text"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
