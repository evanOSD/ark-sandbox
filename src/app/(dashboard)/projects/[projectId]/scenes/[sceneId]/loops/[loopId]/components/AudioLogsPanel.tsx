import React from "react";
import { FileText, Check, AlertTriangle } from "lucide-react";
import { formatMsToTimecode } from "@/lib/timecode";
import { Loop } from "@/types";

interface AudioLogsPanelProps {
  loop: Loop;
  isRefAudioLoaded: boolean;
  isRefAudioSliced: boolean;
  hasUnsavedRecording: boolean;
  uploadStep: string;
  existingRecordingUrl: string | null;
}

export function AudioLogsPanel({
  loop,
  isRefAudioLoaded,
  isRefAudioSliced,
  hasUnsavedRecording,
  uploadStep,
  existingRecordingUrl,
}: AudioLogsPanelProps) {
  return (
    <>
      <div className="border-b border-border p-4 bg-muted/10 shrink-0">
        <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-indigo-500" /> Logs Audio
          Referensi
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Status penyimpanan dan pemotongan audio referensi di browser.
        </p>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Log Item 1: Browser Storage Status */}
        <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">Penyimpanan Browser</h4>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isRefAudioLoaded
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {isRefAudioLoaded ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 mr-1" /> Tersimpan
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />{" "}
                  Memuat...
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRefAudioLoaded
              ? "Audio referensi telah berhasil diunduh dan didecode ke dalam memori browser."
              : "Mengunduh dan mendekode file audio referensi dari server..."}
          </p>
        </div>

        {/* Log Item 2: Audio Slicing Status */}
        <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">Pemotongan Audio (Slicing)</h4>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isRefAudioSliced
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {isRefAudioSliced ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 mr-1" /> Selesai
                  Sliced
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse mr-1" />{" "}
                  Belum Sliced
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRefAudioSliced
              ? `Audio referensi berhasil dipotong agar sesuai dengan rentang loop: ${formatMsToTimecode(
                  loop.start_time_ms,
                )} - ${formatMsToTimecode(loop.end_time_ms)} (${(
                  (loop.end_time_ms - loop.start_time_ms) /
                  1000
                ).toFixed(2)} detik).`
              : "Sedang diproses atau gagal dipotong (menggunakan fallback audio asli)."}
          </p>
          <div className="text-[10px] text-muted-foreground/60 font-mono space-y-0.5 pt-1.5 border-t border-border/40">
            <div>
              Start: {loop.start_time_ms} ms (
              {formatMsToTimecode(loop.start_time_ms)})
            </div>
            <div>
              End: {loop.end_time_ms} ms ({formatMsToTimecode(loop.end_time_ms)}
              )
            </div>
            <div>Durasi: {loop.end_time_ms - loop.start_time_ms} ms</div>
          </div>
        </div>

        {/* Log Item 3: Status Penyimpanan Rekaman */}
        <div className="border border-border rounded-lg p-3.5 space-y-3 bg-background/40 text-foreground">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">Status Penyimpanan Rekaman</h4>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                uploadStep !== "idle"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : hasUnsavedRecording
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : existingRecordingUrl
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-550/10 text-zinc-400 border-zinc-550/20"
              }`}
            >
              {uploadStep !== "idle" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />{" "}
                  Mengunggah...
                </>
              ) : hasUnsavedRecording ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse mr-1" />{" "}
                  Belum Diunggah
                </>
              ) : existingRecordingUrl ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 mr-1" /> Tersimpan
                  di Server
                </>
              ) : (
                <>Belum Ada Rekaman</>
              )}
            </span>
          </div>

          {uploadStep !== "idle" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sedang memproses penyimpanan rekaman Anda secara permanen ke
                server:
              </p>
              <div className="space-y-1.5 bg-muted/20 border border-border/50 rounded-md p-2.5 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      uploadStep === "config"
                        ? "bg-amber-500 animate-pulse"
                        : [
                              "cloudinary",
                              "database",
                              "cleanup",
                              "success",
                            ].includes(uploadStep)
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                    }`}
                  />
                  <span
                    className={
                      uploadStep === "config"
                        ? "text-foreground font-semibold"
                        : [
                              "cloudinary",
                              "database",
                              "cleanup",
                              "success",
                            ].includes(uploadStep)
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    [1/4] Kredensial Unggah
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      uploadStep === "cloudinary"
                        ? "bg-amber-500 animate-pulse"
                        : ["database", "cleanup", "success"].includes(
                              uploadStep,
                            )
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                    }`}
                  />
                  <span
                    className={
                      uploadStep === "cloudinary"
                        ? "text-foreground font-semibold"
                        : ["database", "cleanup", "success"].includes(
                              uploadStep,
                            )
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    [2/4] Unggah ke Cloud
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      uploadStep === "database"
                        ? "bg-amber-500 animate-pulse"
                        : ["cleanup", "success"].includes(uploadStep)
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                    }`}
                  />
                  <span
                    className={
                      uploadStep === "database"
                        ? "text-foreground font-semibold"
                        : ["cleanup", "success"].includes(uploadStep)
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    [3/4] Catat ke Database
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      uploadStep === "cleanup"
                        ? "bg-amber-500 animate-pulse"
                        : uploadStep === "success"
                          ? "bg-emerald-500"
                          : "bg-zinc-600"
                    }`}
                  />
                  <span
                    className={
                      uploadStep === "cleanup"
                        ? "text-foreground font-semibold"
                        : uploadStep === "success"
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    [4/4] Bersihkan Cache Lokal
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasUnsavedRecording
                  ? existingRecordingUrl
                    ? "PERINGATAN: Anda baru saja mengedit rekaman. Perubahan terbaru Anda baru tersimpan di browser secara lokal (IndexedDB) dan belum dikirim ke server. Harap klik 'Simpan Rekaman' untuk memperbarui rekaman di server secara permanen."
                    : "PERINGATAN: Rekaman baru telah dibuat tetapi masih tersimpan di IndexedDB browser Anda. Jika Anda menutup browser atau membersihkan cache, rekaman ini akan hilang. Harap klik 'Simpan Rekaman' untuk mengirimkannya ke server secara permanen."
                  : existingRecordingUrl
                    ? "Rekaman suara Anda telah berhasil dikirim ke server Cloudinary dan tercatat di Supabase. Rekaman ini aman dan dapat diputar kembali."
                    : "Belum ada rekaman suara yang dibuat untuk loop putaran ini. Gunakan tombol Rekam di panel bawah untuk mulai merekam suara pelafalan Anda."}
              </p>
              {existingRecordingUrl && (
                <div className="text-[10px] text-muted-foreground/60 font-mono break-all pt-1.5 border-t border-border/40">
                  {hasUnsavedRecording
                    ? "URL Versi Server Saat Ini: "
                    : "URL: "}
                  {existingRecordingUrl}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
