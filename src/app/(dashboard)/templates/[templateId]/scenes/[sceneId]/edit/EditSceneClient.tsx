"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateScene } from "../../../../actions";

interface EditSceneClientProps {
  templateId: string;
  scene: {
    id: string;
    name: string;
    sequence_number: number;
  };
}

export function EditSceneClient({ templateId, scene }: EditSceneClientProps) {
  const router = useRouter();
  const [sceneName, setSceneName] = useState(scene.name);
  const [sceneSeq, setSceneSeq] = useState(scene.sequence_number);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneName) {
      alert("Nama scene wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      await updateScene(scene.id, sceneName, Number(sceneSeq), templateId);
      router.push(`/templates/${templateId}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui scene");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/templates/${templateId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Kembali ke Detail Template
      </Link>

      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Edit Scene</CardTitle>
          <CardDescription>
            Ubah nama atau urutan tampilan scene ini di dalam template.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateScene}>
          <CardContent className="space-y-4">
            {/* Scene Name */}
            <div className="space-y-2">
              <Label htmlFor="s-name">Nama Scene</Label>
              <Input
                id="s-name"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                placeholder="Contoh: Scene 1: Prolog & Pendahuluan"
                required
              />
            </div>

            {/* Sequence Number */}
            <div className="space-y-2">
              <Label htmlFor="s-seq">Urutan (Sequence Number)</Label>
              <Input
                id="s-seq"
                type="number"
                value={sceneSeq}
                onChange={(e) => setSceneSeq(Number(e.target.value))}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-4 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/templates/${templateId}`)}
              disabled={isLoading}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !sceneName}
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
