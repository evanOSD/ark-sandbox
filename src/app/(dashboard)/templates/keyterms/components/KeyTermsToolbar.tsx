"use client";

import React from "react";
import Link from "next/link";
import { Search, Tag, Folder, Plus, ArrowLeft } from "lucide-react";
import { CategoryDB } from "@/types/key-terms";
import { Button } from "@/components/ui/button";
import {
  LabeledSelect,
  LabeledSelectOption,
} from "@/components/shared/LabeledSelect";

interface KeyTermsToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (category: string) => void;
  activeCategories: CategoryDB[];
  onOpenCategoryModal: () => void;
  onOpenAddModal: () => void;
}

export function KeyTermsToolbar({
  searchQuery,
  setSearchQuery,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  activeCategories,
  onOpenCategoryModal,
  onOpenAddModal,
}: KeyTermsToolbarProps) {
  // Construct options for LabeledSelect dropdown
  const categoryOptions: LabeledSelectOption[] = [
    { value: "ALL", label: "Semua Pengelompokan" },
    { value: "Uncategorized", label: "Belum Dikategorikan (Uncategorized)" },
    ...activeCategories.map((cat) => ({
      value: cat.name,
      label: cat.name,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-[16px] font-black tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-500 fill-amber-500/10" />
            Editor Kata Kunci (Key Terms)
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Kelola pengelompokan semantik, kata asal, deskripsi kata kunci,
            serta pemetaan relasinya ke putaran rekaman cerita (Loops).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0">
          <Link href="/templates">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Template
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={onOpenCategoryModal}
            size="sm"
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4 text-amber-500" />
            Kelola Kategori
          </Button>

          <Button
            variant="default"
            onClick={onOpenAddModal}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah Kata Kunci
          </Button>
        </div>
      </div>

      {/* Filters Sub-row */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kata asal, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Category Filter dropdown using LabeledSelect */}
        <div className="w-full sm:w-80 flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap select-none font-semibold">
            Filter:
          </span>
          <LabeledSelect
            options={categoryOptions}
            value={selectedCategoryFilter}
            onChange={setSelectedCategoryFilter}
            placeholder="Pilih Kategori..."
            className="w-full"
            triggerClassName="text-xs h-9 py-1 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
