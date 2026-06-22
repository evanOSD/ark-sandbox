"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLoop } from "../../../../actions";

interface EditLoopClientProps {
  templateId: string;
  loop: {
    id: string;
    name: string;
    sequence_number: number;
    startTimecode: string;
    endTimecode: string;
  };
}

export function EditLoopClient({ templateId, loop }: EditLoopClientProps) {
  const router = useRouter();
  const [loopName, setLoopName] = useState(loop.name);
  const [loopSeq, setLoopSeq] = useState(loop.sequence_number);
  const [startTimecode, setStartTimecode] = useState(loop.startTimecode);
  const [endTimecode, setEndTimecode] = useState(loop.endTimecode);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loopName || !startTimecode || !endTimecode) {
      alert("Semua field wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      await updateLoop(
        loop.id,
        loopName,
        Number(loopSeq),
        startTimecode,
        endTimecode,
        templateId
      );
      router.push(`/templates/${templateId}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui loop");
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
          <CardTitle className="text-2xl font-bold tracking-tight">Edit Loop</CardTitle>
          <CardDescription>
            Ubah nama, urutan, atau penunjuk waktu (timecode) loop ini.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateLoop}>
          <CardContent className="space-y-4">
            {/* Loop Name */}
            <div className="space-y-2">
              <Label htmlFor="l-name">Nama Loop</Label>
              <Input
                id="l-name"
                value={loopName}
                onChange={(e) => setLoopName(e.target.value)}
                placeholder="Contoh: Loop 1 - Ayat 1 sampai 3"
                required
              />
            </div>

            {/* Timecode Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="l-start">Timecode Mulai</Label>
                <Input
                  id="l-start"
                  value={startTimecode}
                  onChange={(e) => setStartTimecode(e.target.value)}
                  placeholder="00:00 atau 0:00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-end">Timecode Selesai</Label>
                <Input
                  id="l-end"
                  value={endTimecode}
                  onChange={(e) => setEndTimecode(e.target.value)}
                  placeholder="00:15 atau 0:15"
                  required
                />
              </div>
            </div>

            {/* Sequence Number */}
            <div className="space-y-2">
              <Label htmlFor="l-seq">Urutan (Sequence Number)</Label>
              <Input
                id="l-seq"
                type="number"
                value={loopSeq}
                onChange={(e) => setLoopSeq(Number(e.target.value))}
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
              disabled={isLoading || !loopName || !startTimecode || !endTimecode}
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
