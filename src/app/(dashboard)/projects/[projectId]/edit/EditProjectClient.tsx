"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  };
  users: ProjectUser[];
  initialAssignedUserIds: string[];
}

export function EditProjectClient({ project, users, initialAssignedUserIds }: EditProjectClientProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState(project.name);
  const [projectDesc, setProjectDesc] = useState(project.description || "");
  const [assignedUsers, setAssignedUsers] = useState<string[]>(initialAssignedUserIds);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) {
      alert("Nama proyek wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      await updateProject(project.id, projectName, projectDesc, assignedUsers);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui proyek");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Kembali ke Detail Proyek
      </Link>

      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Edit Proyek: {project.name}</CardTitle>
          <CardDescription>
            Perbarui nama, deskripsi, atau ubah penugasan translator untuk proyek ini.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateProject}>
          <CardContent className="space-y-5">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="p-name" className="text-sm font-semibold">Nama Proyek</Label>
              <Input
                id="p-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Contoh: Proyek Matius Bahasa Sunda"
                required
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="p-desc" className="text-sm font-semibold">Deskripsi Proyek</Label>
              <Input
                id="p-desc"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Bahasa target, wilayah, atau catatan proyek..."
                className="w-full"
              />
            </div>

            {/* Locked Template Indicator */}
            <div className="space-y-2 bg-muted/40 p-3.5 rounded-lg border border-border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Master Terkunci</Label>
              <p className="text-sm font-bold text-foreground">{project.templates?.name || "N/A"}</p>
              <p className="text-[10px] text-muted-foreground">Template master proyek tidak dapat diubah setelah proyek dibuat.</p>
            </div>

            {/* User Assignments Checkboxes */}
            <div className="space-y-2.5 pt-2">
              <Label className="text-sm font-semibold">Tugaskan Penerjemah</Label>
              <div className="border border-border rounded-lg divide-y bg-background/50 overflow-hidden">
                {users.map((u) => {
                  const isAssigned = assignedUsers.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserAssignment(u.id)}
                      className={`flex items-center justify-between p-3.5 cursor-pointer select-none transition-colors hover:bg-muted/30 ${
                        isAssigned ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isAssigned
                              ? "bg-primary border-primary text-primary-foreground scale-105"
                              : "border-border"
                          }`}
                        >
                          {isAssigned && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{u.username}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full select-none ${
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-600 dark:text-red-500"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  );
                })}

                {users.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Tidak ada penerjemah terdaftar.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-4 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projects/${project.id}`)}
              disabled={isLoading}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !projectName}
              className="text-xs font-semibold gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
