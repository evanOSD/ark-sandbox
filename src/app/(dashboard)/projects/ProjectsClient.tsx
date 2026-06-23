"use client";

import Link from "next/link";
import { Folder, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ProjectsClientProps {
  initialProjects: Project[];
  isAdmin: boolean;
}

export function ProjectsClient({
  initialProjects,
  isAdmin,
}: ProjectsClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyek</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Kelola proyek, buat baru, dan tugaskan penerjemah."
              : "Daftar proyek penerjemahan yang ditugaskan kepada Anda."}
          </p>
        </div>

        {/* Action Button (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href="/projects/create">
              <Button className="font-semibold gap-2 text-xs">
                <Plus className="h-4 w-4" /> Buat Proyek
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Table container with full-width responsive scroll */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-background shadow-lg">
        <table className="w-full border-collapse text-left text-sm text-muted-foreground">
          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-foreground border-b border-border/40">
            <tr>
              <th className="px-6 py-4">Nama Proyek</th>
              <th className="px-6 py-4">Template</th>
              <th className="px-6 py-4">Penerjemah</th>
              <th className="px-6 py-4 text-center">Scene Progress</th>
              <th className="px-6 py-4 text-center">Loop Progress</th>
              {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {initialProjects.map((p) => {
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
                      {/* Micro progress bar */}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (
                            confirm("Apakah Anda yakin ingin menghapus proyek ini?")
                          ) {
                            await deleteProject(p.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}

            {initialProjects.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-6 py-12 text-center"
                >
                  <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">
                    Belum ada proyek aktif
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {isAdmin
                      ? "Mulailah dengan membuat proyek baru dari template master."
                      : "Anda belum ditugaskan ke proyek apa pun saat ini."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
