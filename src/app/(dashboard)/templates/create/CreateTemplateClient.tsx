"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, Film, Folder, Loader2, Music, Cloud, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTemplate, getCloudinaryConfig } from "../actions";

interface CloudinaryWidget {
  open: () => void;
}

interface CloudinaryInstance {
  createUploadWidget: (
    options: Record<string, unknown>,
    callback: (error: unknown, result: { event: string; info: { secure_url: string } }) => void
  ) => CloudinaryWidget;
}

interface AudioSourceInput {
  label: string;
  sourceType: "local" | "cloudinary" | "url";
  file: File | null;
  url: string;
}

export function CreateTemplateClient() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  
  // Tab states for source: local file vs Cloudinary widget vs Direct URL
  const [videoSource, setVideoSource] = useState<"local" | "cloudinary" | "url">("local");
  
  // Video local file state
  const [templateVideoFile, setTemplateVideoFile] = useState<File | null>(null);
  
  // Video Cloudinary / Pasted URL state
  const [templateVideoUrl, setTemplateVideoUrl] = useState("");

  // M&E Audio States
  const [mneSource, setMneSource] = useState<"local" | "cloudinary" | "url">("url");
  const [mneAudioFile, setMneAudioFile] = useState<File | null>(null);
  const [mneAudioUrl, setMneAudioUrl] = useState("");

  // Dynamic Audio sources (2-4 references, admin names them)
  const [audioSources, setAudioSources] = useState<AudioSourceInput[]>([
    { label: "TB", sourceType: "local", file: null, url: "" },
    { label: "BIMK", sourceType: "local", file: null, url: "" }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const updateAudioSource = (index: number, fields: Partial<AudioSourceInput>) => {
    setAudioSources(prev => prev.map((item, idx) => idx === index ? { ...item, ...fields } : item));
  };

  const addAudioSource = () => {
    if (audioSources.length >= 4) return;
    setAudioSources(prev => [...prev, { label: "", sourceType: "local", file: null, url: "" }]);
  };

  const removeAudioSource = (index: number) => {
    if (audioSources.length <= 1) return;
    setAudioSources(prev => prev.filter((_, idx) => idx !== index));
  };

  const openCloudinaryWidget = async (type: "video" | "audio" | "mne", audioIndex?: number) => {
    try {
      const config = await getCloudinaryConfig();
      if (!config.cloudName || !config.apiKey) {
        alert("Cloudinary belum dikonfigurasi dengan benar di file .env.local!");
        return;
      }

      const globalWindow = window as unknown as { cloudinary?: CloudinaryInstance };
      if (!globalWindow.cloudinary) {
        alert("Script Cloudinary belum selesai dimuat. Silakan tunggu beberapa saat atau muat ulang halaman.");
        return;
      }

      const myWidget = globalWindow.cloudinary.createUploadWidget(
        {
          cloudName: config.cloudName,
          apiKey: config.apiKey,
          uploadPreset: config.uploadPreset,
          resourceType: type === "video" ? "video" : "raw",
          clientAllowedFormats: type === "video" ? ["mp4", "mov", "mkv"] : ["mp3", "wav", "m4a"],
          uploadSignature: async (
            callback: (signature: string) => void,
            paramsToSign: Record<string, string | number>
          ) => {
            try {
              const res = await fetch("/api/cloudinary-signature", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ paramsToSign }),
              });
              const data = await res.json();
              callback(data.signature);
            } catch (err) {
              console.error("Gagal mendapatkan tanda tangan Cloudinary:", err);
            }
          },
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            const secureUrl = result.info.secure_url;
            if (type === "video") {
              setTemplateVideoUrl(secureUrl);
            } else if (type === "mne") {
              setMneAudioUrl(secureUrl);
            } else if (audioIndex !== undefined) {
              setAudioSources(prev => prev.map((item, idx) => idx === audioIndex ? { ...item, url: secureUrl } : item));
            }
          }
        }
      );

      myWidget.open();
    } catch {
      alert("Gagal memuat konfigurasi Cloudinary");
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return;

    // Check if at least one audio source label is filled
    const invalidAudio = audioSources.some(src => !src.label.trim());
    if (invalidAudio) {
      alert("Semua sumber audio harus memiliki label (contoh: TB, BIMK, dsb)");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", templateName);
      formData.append("description", templateDesc);

      // Handle Video Source
      if (videoSource === "local" && templateVideoFile) {
        formData.append("video", templateVideoFile);
      } else if ((videoSource === "cloudinary" || videoSource === "url") && templateVideoUrl) {
        formData.append("video_url", templateVideoUrl);
      }

      // Handle M&E Audio Source
      if (mneSource === "local" && mneAudioFile) {
        formData.append("mne_audio", mneAudioFile);
      } else if ((mneSource === "cloudinary" || mneSource === "url") && mneAudioUrl) {
        formData.append("mne_audio_url", mneAudioUrl);
      }

      // Handle Audio Sources
      formData.append("audio_sources_count", String(audioSources.length));
      audioSources.forEach((source, index) => {
        formData.append(`audio_label_${index}`, source.label);
        formData.append(`audio_source_type_${index}`, source.sourceType);
        if (source.sourceType === "local" && source.file) {
          formData.append(`audio_file_${index}`, source.file);
        } else if (source.url) {
          formData.append(`audio_url_${index}`, source.url);
        }
      });

      await createTemplate(formData);
      router.push("/templates");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuat template");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back Link */}
      <Link
        href="/templates"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Kembali ke Daftar Template
      </Link>

      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Buat Template Master Baru</CardTitle>
          <CardDescription>
            Tambahkan berkas media induk (video/audio) untuk dipecah menjadi loops terjemahan lisan.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateTemplate}>
          <CardContent className="space-y-5">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="t-name" className="text-sm font-semibold">Nama Template</Label>
              <Input
                id="t-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Contoh: Injil Matius Pasal 1"
                required
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="t-desc" className="text-sm font-semibold">Deskripsi</Label>
              <Input
                id="t-desc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Deskripsi singkat konten template..."
                className="w-full"
              />
            </div>

            {/* VIDEO INPUT SECTION */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Film className="h-4 w-4 text-primary" /> Video Referensi
                </Label>
                
                {/* Source Switcher */}
                <div className="flex gap-1 p-0.5 bg-muted rounded-md text-[11px] font-bold w-fit">
                  <button
                    type="button"
                    onClick={() => setVideoSource("local")}
                    className={`px-2 py-1 rounded transition-all ${
                      videoSource === "local" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lokal
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSource("cloudinary")}
                    className={`px-2 py-1 rounded transition-all ${
                      videoSource === "cloudinary" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cloudinary
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSource("url")}
                    className={`px-2 py-1 rounded transition-all ${
                      videoSource === "url" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Link URL
                  </button>
                </div>
              </div>

              {/* Video Local Upload Dropzone */}
              {videoSource === "local" && (
                <div className="border border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-5 text-center cursor-pointer relative bg-muted/20 hover:bg-muted/30 group">
                  <input
                    type="file"
                    id="t-video"
                    accept="video/*"
                    onChange={(e) => setTemplateVideoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Film className="h-8 w-8 text-muted-foreground mx-auto mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold block text-foreground truncate max-w-full px-2">
                    {templateVideoFile ? templateVideoFile.name : "Pilih atau seret file video (.mp4, .mov, .mkv)"}
                  </span>
                  {templateVideoFile && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {(templateVideoFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              )}

              {/* Video Cloudinary Upload Widget */}
              {videoSource === "cloudinary" && (
                <div className="border border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCloudinaryWidget("video")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold"
                  >
                    <Cloud className="h-4 w-4 text-primary" /> Buka Widget Cloudinary
                  </Button>
                  {templateVideoUrl ? (
                    <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded text-[11px] text-primary break-all font-mono">
                      Tautan terunggah: {templateVideoUrl}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2.5">
                      Unggah file video baru atau pilih file dari Media Library Cloudinary Anda.
                    </p>
                  )}
                </div>
              )}

              {/* Video Pasted URL */}
              {videoSource === "url" && (
                <div className="space-y-1">
                  <Input
                    type="url"
                    placeholder="Tempel tautan video Cloudinary (contoh: https://res.cloudinary.com/...)"
                    value={templateVideoUrl}
                    onChange={(e) => setTemplateVideoUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Gunakan opsi ini jika Anda sudah memiliki link file video di Cloudinary.
                  </p>
                </div>
              )}
            </div>

            {/* MUSIC & EFFECTS (M&E) AUDIO INPUT SECTION */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Music className="h-4 w-4 text-primary" /> Audio M&E (Music & Effects - Opsional)
                </Label>
                
                {/* Source Switcher */}
                <div className="flex gap-1 p-0.5 bg-muted rounded-md text-[11px] font-bold w-fit">
                  <button
                    type="button"
                    onClick={() => setMneSource("local")}
                    className={`px-2 py-1 rounded transition-all ${
                      mneSource === "local" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lokal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMneSource("cloudinary")}
                    className={`px-2 py-1 rounded transition-all ${
                      mneSource === "cloudinary" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cloudinary
                  </button>
                  <button
                    type="button"
                    onClick={() => setMneSource("url")}
                    className={`px-2 py-1 rounded transition-all ${
                      mneSource === "url" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Link URL
                  </button>
                </div>
              </div>

              {/* M&E Local Upload Dropzone */}
              {mneSource === "local" && (
                <div className="border border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-5 text-center cursor-pointer relative bg-muted/20 hover:bg-muted/30 group">
                  <input
                    type="file"
                    id="t-mne"
                    accept="audio/*"
                    onChange={(e) => setMneAudioFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold block text-foreground truncate max-w-full px-2">
                    {mneAudioFile ? mneAudioFile.name : "Pilih atau seret file audio M&E (.mp3, .wav, .m4a)"}
                  </span>
                  {mneAudioFile && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {(mneAudioFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              )}

              {/* M&E Cloudinary Upload Widget */}
              {mneSource === "cloudinary" && (
                <div className="border border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openCloudinaryWidget("mne")}
                    className="mx-auto flex items-center gap-2 text-xs font-semibold"
                  >
                    <Cloud className="h-4 w-4 text-primary" /> Buka Widget Cloudinary
                  </Button>
                  {mneAudioUrl ? (
                    <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded text-[11px] text-primary break-all font-mono">
                      Tautan terunggah: {mneAudioUrl}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2.5">
                      Unggah file audio M&E baru atau pilih file dari Media Library Cloudinary Anda.
                    </p>
                  )}
                </div>
              )}

              {/* M&E Pasted URL */}
              {mneSource === "url" && (
                <div className="space-y-1">
                  <Input
                    type="url"
                    placeholder="Tempel tautan audio M&E (contoh: https://res.cloudinary.com/...)"
                    value={mneAudioUrl}
                    onChange={(e) => setMneAudioUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Gunakan opsi ini jika Anda sudah memiliki link file audio M&E di Cloudinary.
                  </p>
                </div>
              )}
            </div>

            {/* AUDIO INPUT SECTION */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <Music className="h-4 w-4 text-primary" /> Audio Referensi Master (2-4 sumber)
                </Label>
                {audioSources.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAudioSource}
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <Plus className="h-3 w-3" /> Tambah Sumber Audio
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {audioSources.map((source, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-muted/10 space-y-3 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-zinc-500 min-w-[20px]">#{index + 1}</span>
                        <Input
                          type="text"
                          placeholder="Label Audio (misal: TB, BIMK, TSI)"
                          value={source.label}
                          onChange={(e) => updateAudioSource(index, { label: e.target.value })}
                          className="h-8 text-xs font-semibold max-w-[180px]"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Source Switcher */}
                        <div className="flex gap-1 p-0.5 bg-muted rounded-md text-[10px] font-bold w-fit">
                          <button
                            type="button"
                            onClick={() => updateAudioSource(index, { sourceType: "local" })}
                            className={`px-2 py-0.5 rounded transition-all ${
                              source.sourceType === "local" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Lokal
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAudioSource(index, { sourceType: "cloudinary" })}
                            className={`px-2 py-0.5 rounded transition-all ${
                              source.sourceType === "cloudinary" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Cloudinary
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAudioSource(index, { sourceType: "url" })}
                            className={`px-2 py-0.5 rounded transition-all ${
                              source.sourceType === "url" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Link URL
                          </button>
                        </div>

                        {audioSources.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAudioSource(index)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Audio Local Upload Dropzone */}
                    {source.sourceType === "local" && (
                      <div className="border border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-4 text-center cursor-pointer relative bg-muted/20 hover:bg-muted/30 group">
                        <input
                          type="file"
                          id={`t-audio-${index}`}
                          accept="audio/*"
                          onChange={(e) => updateAudioSource(index, { file: e.target.files?.[0] || null })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Folder className="h-6 w-6 text-muted-foreground mx-auto mb-1.5 transition-transform group-hover:scale-110" />
                        <span className="text-xs font-semibold block text-foreground truncate max-w-full px-2">
                          {source.file ? source.file.name : "Pilih atau seret file audio (.mp3, .wav, .m4a)"}
                        </span>
                        {source.file && (
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">
                            {(source.file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    )}

                    {/* Audio Cloudinary Upload Widget */}
                    {source.sourceType === "cloudinary" && (
                      <div className="border border-dashed border-border rounded-lg p-4 text-center bg-muted/20">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCloudinaryWidget("audio", index)}
                          className="mx-auto flex items-center gap-1.5 text-[11px] font-semibold h-8"
                        >
                          <Cloud className="h-3.5 w-3.5 text-primary" /> Buka Widget Cloudinary
                        </Button>
                        {source.url ? (
                          <div className="mt-2 p-1.5 bg-primary/5 border border-primary/20 rounded text-[10px] text-primary break-all font-mono">
                            Tautan terunggah: {source.url}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Unggah file audio baru atau pilih file dari Media Library Cloudinary Anda.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Audio Pasted URL */}
                    {source.sourceType === "url" && (
                      <div className="space-y-1">
                        <Input
                          type="url"
                          placeholder="Tempel tautan audio (contoh: https://res.cloudinary.com/...)"
                          value={source.url}
                          onChange={(e) => updateAudioSource(index, { url: e.target.value })}
                          className="w-full h-8 text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Gunakan opsi ini jika Anda sudah memiliki link file audio.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-4 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/templates")}
              disabled={isLoading}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !templateName}
              className="text-xs font-semibold gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Template"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Cloudinary Widget Script Loader */}
      <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="lazyOnload" />
    </div>
  );
}
