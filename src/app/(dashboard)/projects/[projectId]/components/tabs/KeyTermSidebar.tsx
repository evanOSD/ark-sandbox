"use client";

import React from "react";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { CategoryItem, TermItem } from "@/types/key-terms";

interface KeyTermSidebarProps {
  categoriesWithTerms: CategoryItem[];
  activeTerm: TermItem | null;
  onSelectTerm: (term: TermItem) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isDataLoading: boolean;
}

export function KeyTermSidebar({
  categoriesWithTerms,
  activeTerm,
  onSelectTerm,
  searchQuery,
  onSearchQueryChange,
  isDataLoading,
}: KeyTermSidebarProps) {
  return (
    <div className="w-[35%] border-r border-border flex flex-col h-full overflow-hidden bg-card/20 select-none">
      {/* Search Container */}
      <div className="p-3 border-b border-border space-y-2 bg-muted/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kata kunci..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Categories Tree */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {isDataLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span>Memuat glosarium...</span>
          </div>
        ) : categoriesWithTerms.length === 0 ? (
          <div className="text-center p-6 text-xs text-muted-foreground italic">
            {searchQuery
              ? "Tidak ada kata kunci yang cocok dengan pencarian."
              : "Tidak ada kata kunci yang terhubung ke scene ini."}
          </div>
        ) : (
          categoriesWithTerms.map((cat) => (
            <div key={cat.name} className="mb-4">
              <div className="flex items-center gap-1 px-1.5 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span>{cat.name}</span>
              </div>
              <div className="ml-2.5 border-l border-border/40 pl-2 mt-1 space-y-1.5">
                {cat.terms.map((t) => {
                  const isSelected = activeTerm?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTerm(t)}
                      className={`relative px-3 py-1.5 text-xs rounded transition-all cursor-pointer flex items-center justify-between group
                        ${
                          isSelected
                            ? "bg-muted font-bold text-amber-500 border border-border/40"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                    >
                      <div className="truncate pr-2">{t.term}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
