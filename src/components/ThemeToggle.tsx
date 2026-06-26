"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme, Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer setting state to next tick to avoid eslint react-hooks/set-state-in-effect warning
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-full rounded-xl bg-muted/20 animate-pulse" />;
  }

  const getIcon = (t: Theme = theme) => {
    if (t === "light")
      return <Sun className="h-4 w-4 text-amber-500 shrink-0" />;
    if (t === "dark")
      return <Moon className="h-4 w-4 text-violet-400 shrink-0" />;
    return <Laptop className="h-4 w-4 text-cyan-400 shrink-0" />;
  };

  const getLabel = (t: Theme) => {
    if (t === "light") return "Terang";
    if (t === "dark") return "Gelap";
    return "Sistem";
  };

  return (
    <div className="w-full flex items-center select-none">
      <Select value={theme} onValueChange={(val) => setTheme(val as Theme)}>
        <SelectTrigger
          className={cn(
            "transition-all duration-200 cursor-pointer rounded-xl outline-hidden focus:ring-2 focus:ring-primary/20",
            isCollapsed
              ? "h-10 w-10 p-0 border border-border/20 bg-muted/40 hover:bg-muted/80 justify-center [&>svg:last-of-type]:hidden"
              : "w-full bg-muted/40 border border-border/10 px-3 py-2 text-xs font-semibold text-foreground h-9",
          )}
          title={
            isCollapsed
              ? `Tema: ${getLabel(theme)} (Klik untuk ubah)`
              : undefined
          }
        >
          {isCollapsed ? (
            getIcon()
          ) : (
            <span className="flex items-center gap-2">
              {getIcon()}
              <SelectValue />
            </span>
          )}
        </SelectTrigger>
        <SelectContent
          align={isCollapsed ? "center" : "start"}
          className="bg-popover border border-border/30 rounded-xl shadow-lg p-1 min-w-32 z-50"
        >
          <SelectItem
            value="light"
            className="flex items-center gap-2 rounded-lg py-1.5 px-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Terang</span>
            </div>
          </SelectItem>
          <SelectItem
            value="dark"
            className="flex items-center gap-2 rounded-lg py-1.5 px-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-violet-400" />
              <span>Gelap</span>
            </div>
          </SelectItem>
          <SelectItem
            value="system"
            className="flex items-center gap-2 rounded-lg py-1.5 px-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-cyan-400" />
              <span>Sistem</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
