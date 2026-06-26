"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  User,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  Search,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "./actions";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  template_id: string;
  templates?: { name: string } | null;
  created_at: string;
  scenesCompleted: number;
  scenesTotal: number;
  loopsCompleted: number;
  loopsTotal: number;
  assignedUsers: string[];
}

type SortKey = "name" | "template" | "scenesCompleted" | "loopsCompleted";
type SortDir = "asc" | "desc";

interface FilterState {
  name: string;
  template: string;
  user: string;
  progressMin: string;
  progressMax: string;
}

const FILTER_INITIAL: FilterState = {
  name: "",
  template: "",
  user: "",
  progressMin: "",
  progressMax: "",
};

interface ProjectsClientProps {
  initialProjects: Project[];
  isAdmin: boolean;
}

export function ProjectsClient({ initialProjects, isAdmin }: ProjectsClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(FILTER_INITIAL);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        // Only close if not clicking the toggle button
        const toggle = document.getElementById("filter-toggle-btn");
        if (!toggle?.contains(e.target as Node)) {
          setFilterOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  // Unique template names for filter dropdown
  const templateNames = useMemo(
    () => Array.from(new Set(initialProjects.map((p) => p.templates?.name).filter(Boolean) as string[])).sort(),
    [initialProjects],
  );

  // All unique usernames for filter
  const allUsernames = useMemo(
    () => Array.from(new Set(initialProjects.flatMap((p) => p.assignedUsers))).sort(),
    [initialProjects],
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "").length,
    [filters],
  );

  // Filter
  const filtered = useMemo(() => {
    return initialProjects.filter((p) => {
      if (filters.name && !p.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.template && p.templates?.name !== filters.template) return false;
      if (filters.user && !p.assignedUsers.includes(filters.user)) return false;
      const pct = p.loopsTotal > 0 ? Math.round((p.loopsCompleted / p.loopsTotal) * 100) : 0;
      if (filters.progressMin !== "" && pct < Number(filters.progressMin)) return false;
      if (filters.progressMax !== "" && pct > Number(filters.progressMax)) return false;
      return true;
    });
  }, [initialProjects, filters]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      switch (sortKey) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "template":
          va = (a.templates?.name ?? "").toLowerCase();
          vb = (b.templates?.name ?? "").toLowerCase();
          break;
        case "scenesCompleted":
          va = a.scenesTotal > 0 ? a.scenesCompleted / a.scenesTotal : 0;
          vb = b.scenesTotal > 0 ? b.scenesCompleted / b.scenesTotal : 0;
          break;
        case "loopsCompleted":
          va = a.loopsTotal > 0 ? a.loopsCompleted / a.loopsTotal : 0;
          vb = b.loopsTotal > 0 ? b.loopsCompleted / b.loopsTotal : 0;
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary ml-1 inline" />
      : <ChevronDown className="h-3 w-3 text-primary ml-1 inline" />;
  };

  const setFilter = (key: keyof FilterState, val: string) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  const resetFilters = () => setFilters(FILTER_INITIAL);

  return (
    <div className="space-y-5 relative">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyek</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Kelola proyek, buat baru, dan tugaskan penerjemah."
              : "Daftar proyek penerjemahan yang ditugaskan kepada Anda."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/projects/create">
              <Button className="font-semibold gap-2 text-xs">
                <Plus className="h-4 w-4" /> Buat Proyek
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Toolbar: filter toggle + active count ── */}
      <div className="flex items-center gap-2">
        <Button
          id="filter-toggle-btn"
          variant={filterOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterOpen((o) => !o)}
          className="gap-2 text-xs font-semibold h-8 px-3 rounded-lg"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="bg-primary-foreground text-primary rounded-full text-[9px] font-black px-1.5 py-0.5 leading-none ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-xs text-muted-foreground h-8 px-2 rounded-lg"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} dari {initialProjects.length} proyek
        </span>
      </div>

      {/* ── Table + Filter Sidebar wrapper ── */}
      <div className="flex gap-4 items-start">
        {/* Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-border/50 bg-background shadow-lg min-w-0">
          <table className="w-full border-collapse text-left text-sm text-muted-foreground">
            <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-foreground border-b border-border/40">
              <tr>
                {/* Sortable: Nama Proyek */}
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-muted/60 select-none transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Nama Proyek {sortIcon("name")}
                </th>
                {/* Sortable: Template */}
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-muted/60 select-none transition-colors"
                  onClick={() => handleSort("template")}
                >
                  Template {sortIcon("template")}
                </th>
                {/* Non-sortable */}
                <th className="px-6 py-4">Penerjemah</th>
                {/* Sortable: Scene Progress */}
                <th
                  className="px-6 py-4 text-center cursor-pointer hover:bg-muted/60 select-none transition-colors"
                  onClick={() => handleSort("scenesCompleted")}
                >
                  Scene Progress {sortIcon("scenesCompleted")}
                </th>
                {/* Sortable: Loop Progress */}
                <th
                  className="px-6 py-4 text-center cursor-pointer hover:bg-muted/60 select-none transition-colors"
                  onClick={() => handleSort("loopsCompleted")}
                >
                  Loop Progress {sortIcon("loopsCompleted")}
                </th>
                {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sorted.map((p) => {
                const progressPercent =
                  p.loopsTotal > 0
                    ? Math.round((p.loopsCompleted / p.loopsTotal) * 100)
                    : 0;

                return (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <Link href={`/projects/${p.id}`}>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-bold text-primary hover:underline text-left justify-start"
                        >
                          {p.name}
                        </Button>
                      </Link>
                    </td>
                    <td className="px-6 py-4">{p.templates?.name || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {p.assignedUsers.map((username) => (
                          <span
                            key={username}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                          >
                            <User className="w-2.5 h-2.5" />
                            {username}
                          </span>
                        ))}
                        {p.assignedUsers.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            Belum ditugaskan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-foreground">
                      {p.scenesCompleted}/{p.scenesTotal}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-foreground">
                            {p.loopsCompleted}/{p.loopsTotal}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/projects/${p.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Edit Proyek"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm("Apakah Anda yakin ingin menghapus proyek ini?")) {
                                await deleteProject(p.id);
                              }
                            }}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                    <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">
                      {activeFilterCount > 0 ? "Tidak ada proyek yang cocok" : "Belum ada proyek aktif"}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {activeFilterCount > 0
                        ? "Coba ubah atau reset filter pencarian."
                        : isAdmin
                          ? "Mulailah dengan membuat proyek baru dari template master."
                          : "Anda belum ditugaskan ke proyek apa pun saat ini."}
                    </p>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="mt-4 gap-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset Filter
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Filter Sidebar ── */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              ref={sidebarRef}
              key="filter-sidebar"
              initial={{ opacity: 0, x: 24, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: 24, width: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 h-screen z-50 overflow-hidden border-l border-border/60 bg-card shadow-2xl flex flex-col"
              style={{ minWidth: 0 }}
            >
              <div style={{ width: 280 }} className="h-full flex flex-col">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Filter
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Filter Fields */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1">

                  {/* Nama Proyek */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Nama Proyek
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 pointer-events-none" />
                      <Input
                        value={filters.name}
                        onChange={(e) => setFilter("name", e.target.value)}
                        placeholder="Cari nama proyek..."
                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border placeholder:text-muted-foreground/30"
                      />
                      {filters.name && (
                        <button
                          onClick={() => setFilter("name", "")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Template */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Template
                    </label>
                    <select
                      value={filters.template}
                      onChange={(e) => setFilter("template", e.target.value)}
                      className="w-full h-8 text-xs rounded-lg bg-background border border-border px-2 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Semua template</option>
                      {templateNames.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Penerjemah */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Penerjemah
                    </label>
                    <select
                      value={filters.user}
                      onChange={(e) => setFilter("user", e.target.value)}
                      className="w-full h-8 text-xs rounded-lg bg-background border border-border px-2 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Semua penerjemah</option>
                      {allUsernames.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Loop Progress % */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Loop Progress (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.progressMin}
                        onChange={(e) => setFilter("progressMin", e.target.value)}
                        placeholder="Min"
                        className="h-8 text-xs rounded-lg bg-background border-border placeholder:text-muted-foreground/30 w-full"
                      />
                      <span className="text-muted-foreground/50 text-xs shrink-0">–</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.progressMax}
                        onChange={(e) => setFilter("progressMax", e.target.value)}
                        placeholder="Max"
                        className="h-8 text-xs rounded-lg bg-background border-border placeholder:text-muted-foreground/30 w-full"
                      />
                    </div>
                  </div>

                </div>

                {/* Active filters summary */}
                {activeFilterCount > 0 && (
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1">
                      {filters.name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          Nama: {filters.name}
                          <button onClick={() => setFilter("name", "")}><X className="h-2 w-2" /></button>
                        </span>
                      )}
                      {filters.template && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          Template: {filters.template}
                          <button onClick={() => setFilter("template", "")}><X className="h-2 w-2" /></button>
                        </span>
                      )}
                      {filters.user && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          Penerjemah: {filters.user}
                          <button onClick={() => setFilter("user", "")}><X className="h-2 w-2" /></button>
                        </span>
                      )}
                      {(filters.progressMin || filters.progressMax) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          Progress: {filters.progressMin || "0"}–{filters.progressMax || "100"}%
                          <button onClick={() => { setFilter("progressMin", ""); setFilter("progressMax", ""); }}><X className="h-2 w-2" /></button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
