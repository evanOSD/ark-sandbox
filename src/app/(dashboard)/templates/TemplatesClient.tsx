"use client";

import Link from "next/link";
import { Film, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTemplate } from "./actions";

export interface Template {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  audio_url: string | null;
  total_scenes?: number;
  total_loops?: number;
}

interface TemplatesClientProps {
  initialTemplates: Template[];
  isAdmin: boolean;
}

export function TemplatesClient({
  initialTemplates,
  isAdmin,
}: TemplatesClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Master</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Kelola template master untuk mengunggah media referensi video/audio penerjemahan."
              : "Daftar template master penerjemahan lisan."}
          </p>
        </div>

        {/* Action Buttons (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href="/templates/create">
              <Button className="font-semibold gap-2 text-xs">
                <Plus className="h-4 w-4" /> Tambah Template
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Templates Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Nama Template</th>
                <th className="px-6 py-4 font-bold tracking-wider">Deskripsi</th>
                <th className="px-6 py-4 font-bold tracking-wider">Total Scenes</th>
                <th className="px-6 py-4 font-bold tracking-wider">Total Loops</th>
                <th className="px-6 py-4 font-bold tracking-wider">Video</th>
                <th className="px-6 py-4 font-bold tracking-wider">Audio</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialTemplates.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-foreground text-base tracking-tight">{t.name}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-muted-foreground whitespace-normal line-clamp-2">
                    {t.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-base font-bold text-foreground">
                      {t.total_scenes ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-base font-bold text-foreground">
                      {t.total_loops ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${t.video_url ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
                      {t.video_url ? "Tersedia" : "Kosong"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${t.audio_url ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
                      {t.audio_url ? "Tersedia" : "Kosong"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm("Menghapus template akan menghapus seluruh scene dan loop terkait. Lanjutkan?")) {
                              await deleteTemplate(t.id);
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus Template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/templates/${t.id}`}>
                        <Button variant="outline" size="sm" className="gap-2 font-bold text-xs border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5 shadow-xs">
                          Kelola Scene & Loop <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {initialTemplates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Film className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Belum ada template master</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Buat template master untuk mengunggah referensi video/audio penerjemahan.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
