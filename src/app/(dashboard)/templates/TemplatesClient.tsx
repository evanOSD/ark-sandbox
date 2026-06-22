"use client";

import Link from "next/link";
import { Film, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTemplate } from "./actions";

export interface Template {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  audio_url: string | null;
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

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialTemplates.map((t) => (
          <Card key={t.id} className="group hover:border-primary/40 hover:shadow-md transition-all flex flex-col">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                  {t.name}
                </CardTitle>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (confirm("Menghapus template akan menghapus seluruh scene dan loop terkait. Lanjutkan?")) {
                        await deleteTemplate(t.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {t.description || "Tidak ada deskripsi template."}
              </p>
              <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Video:</span>
                  <span className="font-mono text-foreground truncate max-w-[150px]">
                    {t.video_url ? "Tersedia" : "Tidak ada"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Audio:</span>
                  <span className="font-mono text-foreground truncate max-w-[150px]">
                    {t.audio_url ? "Tersedia" : "Tidak ada"}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 bg-muted/20">
              <Link href={`/templates/${t.id}`} className="w-full">
                <Button variant="outline" className="w-full gap-2 font-semibold border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5">
                  Kelola Scene & Loop <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
        {initialTemplates.length === 0 && (
          <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center">
            <Film className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Belum ada template master</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Buat template master untuk mengunggah referensi video/audio penerjemahan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
