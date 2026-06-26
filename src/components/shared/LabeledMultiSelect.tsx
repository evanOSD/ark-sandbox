"use client";

import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface LabeledMultiSelectOption {
  /** The underlying value (e.g. user ID) */
  value: string;
  /** The human-readable label (e.g. username) */
  label: string;
  /** Optional secondary text shown below the label (e.g. email) */
  description?: string;
  /** Optional badge text (e.g. "admin", "user") */
  badge?: string;
  /** Controls badge color: "danger" = red, default = muted */
  badgeVariant?: "danger" | "default";
}

export interface LabeledMultiSelectProps {
  options: LabeledMultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  /** Placeholder shown in the search input */
  searchPlaceholder?: string;
  /** Text shown when no options match the search */
  emptyText?: string;
  /** Extra classes for the outer container */
  className?: string;
  /** Footer hint text */
  hint?: string;
}

/**
 * LabeledMultiSelect — an inline (non-popup) multi-selection panel with
 * built-in search, keyboard navigation (↑ ↓ Enter Space), selected chips,
 * and click-outside handling.
 *
 * Design is derived from LabeledSelect conventions but renders as a
 * full-height panel rather than a popover dropdown.
 *
 * Stored at: src/components/shared/LabeledMultiSelect.tsx
 */
export function LabeledMultiSelect({
  options,
  values,
  onChange,
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada pilihan tersedia.",
  className,
  hint,
}: LabeledMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedOptions = options.filter((o) => values.includes(o.value));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setFocusedIndex(-1); // reset keyboard focus when filter changes
  };


  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const row = listRef.current.children[focusedIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const toggleValue = (val: string) => {
    onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  };

  const removeValue = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        listRef.current?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        listRef.current?.focus();
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          toggleValue(filtered[focusedIndex].value);
        }
        break;
      case "Escape":
        setSearch("");
        searchRef.current?.blur();
        break;
    }
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (focusedIndex <= 0) {
          // Return focus to search input
          searchRef.current?.focus();
          setFocusedIndex(-1);
        } else {
          setFocusedIndex((prev) => prev - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          toggleValue(filtered[focusedIndex].value);
        }
        break;
      case "Escape":
        setSearch("");
        searchRef.current?.focus();
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className={cn("flex flex-col min-h-0 overflow-hidden", className)}>
      {/* ── Selected chips ── */}
      {selectedOptions.length > 0 && (
        <div className="px-3 py-2 border-b border-border/40 shrink-0 flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => removeValue(o.value)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                "text-[10px] font-semibold",
                "bg-primary/10 text-primary border border-primary/20",
                "hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20",
                "transition-colors group",
              )}
              aria-label={`Hapus ${o.label}`}
            >
              {o.label}
              <X className="h-2 w-2 opacity-50 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      {/* ── Search input ── */}
      <div className="px-3 py-2.5 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 pointer-events-none" />
          <Input
            ref={searchRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs rounded-lg bg-background border-border placeholder:text-muted-foreground/30 focus:ring-4 focus:ring-primary/10"
            aria-label="Cari pilihan"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Option list ── */}
      <div
        ref={listRef}
        role="listbox"
        aria-multiselectable="true"
        tabIndex={filtered.length > 0 ? 0 : -1}
        onKeyDown={handleListKeyDown}
        className="flex-1 overflow-y-auto divide-y divide-border/40 focus:outline-none"
      >
        {filtered.map((opt, idx) => {
          const isSelected = values.includes(opt.value);
          const isFocused = idx === focusedIndex;
          const initials = opt.label
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              onClick={() => toggleValue(opt.value)}
              onMouseEnter={() => setFocusedIndex(idx)}
              className={cn(
                "flex items-center justify-between px-4 py-2.5",
                "cursor-pointer select-none transition-colors",
                isFocused && "bg-muted/20",
                isSelected && "bg-primary/5",
                isSelected && isFocused && "bg-primary/10",
              )}
            >
              {/* Left: avatar + label */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "text-[11px] font-black shrink-0 transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">
                      {opt.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: badge + checkbox */}
              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                {opt.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                      opt.badgeVariant === "danger"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {opt.badge}
                  </span>
                )}
                <div
                  className={cn(
                    "w-4 h-4 rounded-sm border flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            {search ? `Tidak ada hasil untuk "${search}"` : emptyText}
          </div>
        )}
      </div>

      {/* ── Footer hint ── */}
      {hint && (
        <div className="px-4 py-2.5 border-t border-border/40 shrink-0 bg-muted/5">
          <p className="text-[10px] text-muted-foreground/60">{hint}</p>
        </div>
      )}
    </div>
  );
}
