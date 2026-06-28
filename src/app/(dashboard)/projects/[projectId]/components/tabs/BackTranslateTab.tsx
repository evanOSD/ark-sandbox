"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Square, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Scene, Loop } from "../../ProjectClient";
import { getProjectFullExportData } from "../../actions";
import { LineRecordingModal } from "../../scenes/[sceneId]/loops/[loopId]/components/audio-editor/LineRecordingModal";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { saveBackTranslationRecording, getCloudinaryUploadParams } from "../../loops/actions";
import { useRouter } from "next/navigation";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  convertInchesToTwip,
  Footer,
  HeadingLevel,
} from "docx";

interface BackTranslateTabProps {
  projectId: string;
  activeScene: Scene | null;
  loopsWithDisplay: Array<{
    loop: Loop;
    speaker?: string;
    lineNum?: number;
    text: string;
    note?: string;
  }>;
  activeLoopPlayId: string | null;
  handlePlayLoop: (loopId: string, startMs: number) => void;
  onSaveBackTranslation: (loopId: string, text: string) => Promise<void>;
  isLoading: boolean;
  playingAudioId?: string | null;
  handlePlayAudio?: (url: string, recId: string) => void;
}

export function BackTranslateTab({
  projectId,
  activeScene,
  loopsWithDisplay,
  activeLoopPlayId,
  handlePlayLoop,
  onSaveBackTranslation,
  isLoading,
  playingAudioId,
  handlePlayAudio,
}: BackTranslateTabProps) {
  const router = useRouter();
  const audioSettings = useAudioSettings();
  // Local state to keep track of user input text temporarily while typing
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [recordingLoopId, setRecordingLoopId] = useState<string | null>(null);
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  // Refs map for auto-resize — keyed by loop.id
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const recordingLoop = activeScene?.loops.find((l) => l.id === recordingLoopId);
  const durationMs = recordingLoop
    ? recordingLoop.end_time_ms - recordingLoop.start_time_ms
    : 0;

  const handleSaveRecordingBlob = async (blob: Blob) => {
    if (!recordingLoopId) return;
    try {
      setIsSavingAudio(true);

      // Normalize to -6dB
      let finalBlob = blob;
      try {
        const { normalizeAudioBlob } = await import("@/lib/audio-utils");
        finalBlob = await normalizeAudioBlob(blob, -6);
      } catch (normErr) {
        console.error("Gagal melakukan normalisasi audio:", normErr);
        // Fallback to original blob
      }

      // 1. Get Cloudinary signed upload parameters from server
      const uploadParams = await getCloudinaryUploadParams(projectId, recordingLoopId);

      // 2. Prepare FormData for direct browser upload
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append("file", finalBlob, `${uploadParams.publicId}.wav`);
      cloudinaryFormData.append("api_key", uploadParams.apiKey);
      cloudinaryFormData.append("timestamp", String(uploadParams.timestamp));
      cloudinaryFormData.append("upload_preset", uploadParams.uploadPreset);
      cloudinaryFormData.append("public_id", uploadParams.publicId);
      cloudinaryFormData.append("signature", uploadParams.signature);

      // 3. Post to Cloudinary endpoint
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/video/upload`,
        {
          method: "POST",
          body: cloudinaryFormData,
        }
      );

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error("Cloudinary Upload Error: " + uploadData.error.message);
      }

      const secureUrl = uploadData.secure_url;

      // 4. Save the secure URL in our Supabase recordings table
      await saveBackTranslationRecording(projectId, recordingLoopId, secureUrl);
      router.refresh();
    } catch (err) {
      console.error("Gagal menyimpan rekaman:", err);
      alert(
        "Gagal menyimpan rekaman: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSavingAudio(false);
      setRecordingLoopId(null);
    }
  };

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const data = await getProjectFullExportData(projectId);

      const formatDate = (date: Date = new Date()): string => {
        const day = String(date.getDate()).padStart(2, "0");
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "Mei",
          "Jun",
          "Jul",
          "Agu",
          "Sep",
          "Okt",
          "Nov",
          "Des",
        ];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
      };
      const docDate = formatDate();

      // Build document children
      const children: Array<Paragraph | Table> = [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: data.projectName,
              size: 32, // 16 pt
              bold: true,
            }),
          ],
        }),
      ];

      // Add each scene and its table
      data.scenes.forEach((scene) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: `${scene.sequence_number} - ${scene.name}`,
                size: 28, // 14 pt
                bold: true,
              }),
            ],
          }),
        );

        if (scene.loops.length === 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "(Tidak ada loop)",
                  italics: true,
                  size: 24, // 12 pt
                }),
              ],
              spacing: { after: 200 },
            }),
          );
          return;
        }

        const tableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Loop",
                        size: 24, // 12 pt
                        bold: true,
                      }),
                    ],
                  }),
                ],
                width: { size: 15, type: WidthType.PERCENTAGE },
                shading: { fill: "f3f4f6" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Terjemahan",
                        size: 24, // 12 pt
                        bold: true,
                      }),
                    ],
                  }),
                ],
                width: { size: 42.5, type: WidthType.PERCENTAGE },
                shading: { fill: "f3f4f6" },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "Terjemahan Balik",
                        size: 24, // 12 pt
                        bold: true,
                      }),
                    ],
                  }),
                ],
                width: { size: 42.5, type: WidthType.PERCENTAGE },
                shading: { fill: "f3f4f6" },
              }),
            ],
          }),
        ];

        scene.loops.forEach((loop) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: loop.name,
                          size: 24, // 12 pt
                        }),
                      ],
                    }),
                  ],
                  width: { size: 15, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: loop.translated_text || "",
                          size: 24, // 12 pt
                        }),
                      ],
                    }),
                  ],
                  width: { size: 42.5, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: loop.back_translation || "",
                          size: 24, // 12 pt
                        }),
                      ],
                    }),
                  ],
                  width: { size: 42.5, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          );
        });

        const table = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
          },
        });

        children.push(table);
      });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: convertInchesToTwip(8.27), // A4 Width
                  height: convertInchesToTwip(11.69), // A4 Height
                },
                margin: {
                  top: convertInchesToTwip(1),
                  right: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1),
                },
              },
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `Diunduh oleh: ${data.username}`,
                        size: 22, // 11 pt
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `Waktu unduh: ${docDate}`,
                        size: 22, // 11 pt
                      }),
                    ],
                  }),
                ],
              }),
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Terjemahan_Balik_${data.projectName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor dokumen", err);
      alert("Terjadi kesalahan saat mengunduh dokumen DOCX.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBlur = (loopId: string, value: string, currentValue: string) => {
    if (value !== currentValue) {
      onSaveBackTranslation(loopId, value);
    }
  };

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Re-resize all textareas whenever localInputs or the loop list changes
  useEffect(() => {
    Object.values(textareaRefs.current).forEach((el) => {
      if (el) resizeTextarea(el);
    });
  }, [localInputs, loopsWithDisplay]);

  return (
    <div className="divide-y divide-zinc-850">
      {/* Header labels */}
      {activeScene && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-3.5 py-1.5 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-foreground select-none text-center items-center">
          <div className="text-center pr-4">Terjemahan Anda</div>
          <div className="flex items-center justify-center border-l border-r border-border px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Unduh Teks Terjemahan Balik"
              onClick={handleExportDocx}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <div className="text-center pl-4">Terjemahan Balik</div>
        </div>
      )}

      {activeScene ? (
        loopsWithDisplay.map(({ loop }) => {
          const rec = loop.recording;
          const translatedText = rec?.translated_text || "";

          // Get the back translation value from DB or local state
          const dbBackTranslation = rec?.back_translation || "";
          const inputValue =
            localInputs[loop.id] !== undefined
              ? localInputs[loop.id]
              : dbBackTranslation;

          return (
            <div
              key={loop.id}
              className="p-3.5 grid grid-cols-2 gap-4 hover:bg-muted/10 transition-colors"
            >
              {/* Left Column: Read-only draft translation */}
              <div className="flex items-start gap-4 pr-4 border-r border-border">
                {/* Play Loop Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                    activeLoopPlayId === loop.id
                      ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                      : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                  )}
                  onClick={() => handlePlayLoop(loop.id, loop.start_time_ms)}
                  title={
                    activeLoopPlayId === loop.id
                      ? "Hentikan Pemutaran Loop"
                      : "Putar Loop (Video & Audio)"
                  }
                >
                  {activeLoopPlayId === loop.id ? (
                    <Square className="h-2.5 w-2.5 fill-current" />
                  ) : (
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  )}
                </Button>

                {/* Speaker icon & loop name label */}
                <div className="flex flex-col items-center shrink-0 select-none w-12 text-center">
                  <div className="h-7 w-7 rounded border border-border flex items-center justify-center bg-zinc-500/10 text-zinc-500">
                    <span className="text-[10px] font-bold">🔊</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground font-mono mt-0.5">
                    {loop.name}
                  </span>
                </div>

                {/* Line number and translated text — select-text */}
                <div className="flex-1 flex gap-2 items-start mt-1">
                  <span className="text-xs font-mono text-muted-foreground select-none shrink-0">
                    {loop.sequence_number}
                  </span>
                  <p className="text-xs text-foreground leading-relaxed font-medium select-text">
                    {translatedText || (
                      <span className="text-muted-foreground/40 italic select-none">
                        (Belum ada draf terjemahan)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Column: Editable Back Translation textarea & Recording */}
              <div className="flex items-start gap-3 pl-4">
                {/* Record + Play/Stop Buttons stacked vertically */}
                <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                  {/* Red Record Button */}
                  <button
                    type="button"
                    onClick={() => setRecordingLoopId(loop.id)}
                    disabled={isLoading || isSavingAudio}
                    className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group disabled:opacity-50 disabled:scale-100"
                    title="Rekam Terjemahan Balik"
                  >
                    <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Play/Stop Button */}
                  {rec?.back_translation_audio_url && handlePlayAudio && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6 rounded-full border transition-colors cursor-pointer",
                        playingAudioId === `bt-${rec.id}`
                          ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                          : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                      )}
                      onClick={() => handlePlayAudio(rec.back_translation_audio_url!, `bt-${rec.id}`)}
                      title={
                        playingAudioId === `bt-${rec.id}`
                          ? "Hentikan Rekaman BT"
                          : "Putar Rekaman BT"
                      }
                    >
                      {playingAudioId === `bt-${rec.id}` ? (
                        <Square className="h-2.5 w-2.5 fill-current" />
                      ) : (
                        <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Back Translation Textarea — auto-resizes on mount and on input */}
                <textarea
                  ref={(el) => {
                    textareaRefs.current[loop.id] = el;
                    if (el) resizeTextarea(el);
                  }}
                  value={inputValue}
                  placeholder="Ketik terjemahan balik di sini..."
                  rows={1}
                  onChange={(e) => {
                    setLocalInputs({
                      ...localInputs,
                      [loop.id]: e.target.value,
                    });
                  }}
                  onInput={(e) => resizeTextarea(e.currentTarget)}
                  onBlur={(e) =>
                    handleBlur(loop.id, e.target.value, dbBackTranslation)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 min-w-[80px] bg-muted border border-border rounded px-2.5 py-1 text-xs text-foreground placeholder-muted-foreground/45 focus:outline-none focus:border-border focus:bg-background transition-colors resize-none overflow-hidden leading-relaxed"
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 text-muted-foreground text-xs italic select-none">
          Tidak ada scene aktif. Silakan pilih scene terlebih dahulu.
        </div>
      )}

      {recordingLoopId && (
        <LineRecordingModal
          isOpen={recordingLoopId !== null}
          onClose={() => setRecordingLoopId(null)}
          onSave={handleSaveRecordingBlob}
          durationMs={durationMs}
          audioSettings={audioSettings}
        />
      )}
    </div>
  );
}
