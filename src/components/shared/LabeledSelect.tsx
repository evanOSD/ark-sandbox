"use client";

import { useRef, useEffect, useState, useCallback, KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabeledSelectOption {
  /** The underlying value (e.g. UUID) */
  value: string;
  /** The human-readable label shown in the trigger and dropdown */
  label: string;
  /** Optional secondary text shown below the label in the dropdown */
  description?: string;
  /** If true, a status dot is rendered next to the label */
  isOriginal?: boolean;
}

export interface LabeledSelectProps {
  options: LabeledSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes applied to the trigger button */
  triggerClassName?: string;
  /** Extra classes applied to the dropdown container */
  dropdownClassName?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * LabeledSelect — a fully accessible custom select that always shows the
 * option *label* in the trigger (never the raw value), supports keyboard
 * navigation (↑ ↓ Enter Escape) and closes when clicking outside.
 *
 * Stored at: src/components/shared/LabeledSelect.tsx
 */
export function LabeledSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  triggerClassName,
  dropdownClassName,
  className,
  disabled = false,
  id,
}: LabeledSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    // Pre-focus the currently selected option
    const idx = options.findIndex((o) => o.value === value);
    setFocusedIndex(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      closeDropdown();
    },
    [onChange, closeDropdown],
  );

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        e.preventDefault();
        openDropdown();
        break;
      case "ArrowUp":
        e.preventDefault();
        openDropdown();
        break;
      case "Escape":
        closeDropdown();
        break;
    }
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          selectOption(options[focusedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        closeDropdown();
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg",
          "bg-background border border-border text-sm font-medium text-foreground",
          "hover:bg-muted/30 transition-colors",
          "focus:outline-none focus:ring-4 focus:ring-primary/10",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          triggerClassName,
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption ? (
            <>
              {selectedOption.isOriginal !== undefined && (
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    selectedOption.isOriginal ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground/40 truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className={cn(
            "absolute z-50 top-full mt-1.5 left-0 w-full min-w-max",
            "bg-card border border-border rounded-xl shadow-xl overflow-hidden",
            "focus:outline-none",
            dropdownClassName,
          )}
          // Keep focus in list for keyboard nav
          onFocus={(e) => e.stopPropagation()}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(opt.value)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 text-sm cursor-pointer transition-colors",
                  isFocused && "bg-muted/50",
                  isSelected && !isFocused && "bg-primary/5",
                )}
              >
                {/* Status dot — only render if option declares isOriginal */}
                {opt.isOriginal !== undefined ? (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      opt.isOriginal ? "bg-emerald-500" : "bg-transparent",
                    )}
                  />
                ) : null}
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-foreground whitespace-nowrap block">
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap block">
                      {opt.description}
                    </span>
                  )}
                </span>
                {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
              </div>
            );
          })}

          {options.length === 0 && (
            <div className="px-4 py-3 text-xs text-muted-foreground text-center">
              Tidak ada pilihan tersedia.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
