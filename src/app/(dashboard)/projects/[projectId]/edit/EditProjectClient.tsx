"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  FolderOpen,
  FileText,
  BookOpen,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LabeledSelect,
  type LabeledSelectOption,
} from "@/components/shared/LabeledSelect";
import {
  LabeledMultiSelect,
  type LabeledMultiSelectOption,
} from "@/components/shared/LabeledMultiSelect";
import { updateProject } from "../actions";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
}

export interface ProjectUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface EditProjectClientProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    template_id: string;
    templates?: { name: string } | null;
    show_text_script?: boolean;
    allowed_scripts?: string;
  };
  templates: ProjectTemplate[];
  users: ProjectUser[];
  initialAssignedUserIds: string[];
  audioTemplateNames: string[];
}

export function EditProjectClient({
  project,
  templates,
  users,
  initialAssignedUserIds,
  audioTemplateNames,
}: EditProjectClientProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState(project.name);
  const [projectDesc, setProjectDesc] = useState(project.description || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    project.template_id,
  );
  const [assignedUsers, setAssignedUsers] = useState<string[]>(
    initialAssignedUserIds,
  );
  const [showTextScript, setShowTextScript] = useState(
    project.show_text_script || false,
  );
  const [allowedScripts, setAllowedScripts] = useState<string[]>(() => {
    if (project.allowed_scripts) {
      return project.allowed_scripts.split(",").filter(Boolean);
    }
    return audioTemplateNames;
  });
  const [isLoading, setIsLoading] = useState(false);

  const originalTemplateId = project.template_id;
  const templateChanged = selectedTemplateId !== originalTemplateId;

  // ── Adapt data for LabeledSelect ──────────────────────────────────────────
  const templateOptions: LabeledSelectOption[] = templates.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.description ?? undefined,
    isOriginal: t.id === originalTemplateId,
  }));

  // Dot on trigger: green = same as original, amber = changed
  const templateOptionsForTrigger: LabeledSelectOption[] = templateOptions.map(
    (o) => ({
      ...o,
      isOriginal:
        o.value === selectedTemplateId && o.value === originalTemplateId
          ? true
          : o.value === selectedTemplateId && o.value !== originalTemplateId
            ? false
            : o.isOriginal,
    }),
  );

  // Description of the currently selected template
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // ── Adapt data for LabeledMultiSelect ────────────────────────────────────
  const userOptions: LabeledMultiSelectOption[] = users.map((u) => ({
    value: u.id,
    label: u.username,
    description: u.email,
    badge: u.role,
    badgeVariant: u.role === "admin" ? "danger" : "default",
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert("Nama proyek wajib diisi");
      return;
    }
    if (templateChanged) {
      const ok = confirm(
        "⚠️ Mengganti template akan mengubah struktur scene dan loop. Data rekaman yang ada mungkin tidak sesuai. Lanjutkan?",
      );
      if (!ok) return;
    }
    setIsLoading(true);
    try {
      await updateProject(
        project.id,
        projectName,
        projectDesc,
        assignedUsers,
        selectedTemplateId,
        showTextScript,
        allowedScripts.join(","),
      );
      // Redirect to /projects after save
      router.push("/projects");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui proyek");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-0">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back → /projects */}
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs underline font-bold text-info hover:text-info-hover transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform font-bold group-hover:-translate-x-1" />
            Kembali
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">
            {project.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => router.push("/projects")}
            disabled={isLoading}
            className="text-xs font-semibold h-8 px-4 rounded-lg"
          >
            Batal
          </Button>
          <Button
            form="edit-project-form"
            type="submit"
            size="sm"
            disabled={isLoading || !projectName.trim()}
            className="text-xs font-bold h-8 px-4 rounded-lg gap-1.5 shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-3 w-3" /> Simpan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Page title ─── */}
      <div className="shrink-0 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">
          Edit Proyek
        </h1>
      </div>

      {/* ─── Main 2-column grid ─── */}
      <form
        id="edit-project-form"
        onSubmit={handleUpdateProject}
        className="flex-1 grid grid-cols-5 gap-5 min-h-0"
      >
        {/* LEFT COLUMN */}
        <div className="col-span-2 flex flex-col gap-4 min-h-0 overflow-y-auto pr-0.5">
          {/* Card: Informasi Proyek */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5 shrink-0">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary shrink-0" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Informasi Proyek
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="p-name"
                className="text-xs font-semibold text-muted-foreground"
              >
                Nama Proyek <span className="text-red-500">*</span>
              </label>
              <Input
                id="p-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Contoh: Proyek Matius Bahasa Sunda"
                required
                className="h-9 text-sm rounded-lg bg-background border-border focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/30 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="p-desc"
                className="text-xs font-semibold text-muted-foreground"
              >
                Deskripsi
              </label>
              <Input
                id="p-desc"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Bahasa target, wilayah, atau catatan..."
                className="h-9 text-sm rounded-lg bg-background border-border focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Toggle showTextScript and checklist for allowedScripts */}
            <div className="pt-2.5 space-y-3.5 border-t border-border/50">
              <label className="flex items-start gap-2.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTextScript}
                  onChange={(e) => setShowTextScript(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <span>Tampilkan Teks Script Audio ke Penerjemah</span>
                  <span className="text-[10px] text-muted-foreground font-medium normal-case">
                    Jika aktif, peran MTT, Fasilitator, dan Back Translator dapat melihat teks script template.
                  </span>
                </div>
              </label>

              {showTextScript && audioTemplateNames.length > 0 && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/40 ml-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
                    Script yang diizinkan untuk dilihat:
                  </p>
                  <div className="flex flex-col gap-2">
                    {audioTemplateNames.map((name) => {
                      const isChecked = allowedScripts.includes(name);
                      return (
                        <label key={name} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setAllowedScripts(allowedScripts.filter(n => n !== name));
                              } else {
                                setAllowedScripts([...allowedScripts, name]);
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Template Master */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Template Master
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="template-select"
                className="text-xs font-semibold text-muted-foreground"
              >
                Pilih Template
              </label>

              <LabeledSelect
                id="template-select"
                options={templateOptionsForTrigger}
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                placeholder="Pilih template..."
              />
            </div>

            {templateChanged && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                  Mengganti template akan mengubah seluruh struktur scene &amp;
                  loop. Data rekaman lama mungkin tidak sesuai.
                </p>
              </motion.div>
            )}
          </div>

          {/* Card: Deskripsi Template (read-only) */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Deskripsi Template
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedTemplate?.description ? (
                selectedTemplate.description
              ) : (
                <span className="italic text-muted-foreground/40">
                  Tidak ada deskripsi untuk template ini.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: User assignment via LabeledMultiSelect */}
        <div className="col-span-3 flex flex-col min-h-0 rounded-xl border border-border/60 bg-card overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Penugasan Penerjemah
                </p>
              </div>
              <span className="text-[12px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {assignedUsers.length} dipilih
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 ml-5">
              Klik nama pengguna untuk menambah atau menghapus dari daftar
              penugasan.
            </p>
          </div>

          {/* LabeledMultiSelect fills remaining height */}
          <LabeledMultiSelect
            options={userOptions}
            values={assignedUsers}
            onChange={setAssignedUsers}
            searchPlaceholder="Cari nama atau email pengguna..."
            className="flex-1 min-h-0"
          />
        </div>
      </form>
    </div>
  );
}
