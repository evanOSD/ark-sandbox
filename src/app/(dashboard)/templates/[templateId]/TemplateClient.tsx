"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Film, Music, Pencil, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  key_terms: KeyTerm[];
}

export interface Scene {
  id: string;
  name: string;
  sequence_number: number;
  loops: Loop[];
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  audio_url: string | null;
  audio_sources?: Array<{ name: string; url: string }> | null;
  mne_audio_url?: string | null;
}

export interface ProjectInfo {
  id: string;
  name: string;
  description: string | null;
}

interface TemplateClientProps {
  template: Template;
  scenes: Scene[];
  projects?: ProjectInfo[];
}

const getFilename = (url: string | null | undefined) => {
  if (!url) return "";
  try {
    const parts = url.split("?")[0].split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url;
  }
};

export function TemplateClient({ template, projects }: TemplateClientProps) {
  return (
    <div className="space-y-2">
      {/* Header Back Button */}
      <div>
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Template
        </Link>
      </div>

      {/* Header Title & Actions Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40">
        <div className="space-y-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground block">
            Nama Template
          </span>
          <h1 className="text-[16px] font-bold tracking-tight text-foreground">
            {template.name}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/templates/${template.id}/edit`}>
            <Button variant="outline" className="font-semibold gap-2">
              <Pencil className="h-4 w-4" /> Edit Template
            </Button>
          </Link>
          <Link href={`/templates/${template.id}/scenes`}>
            <Button className="font-semibold bg-primary text-primary-foreground hover:bg-primary-hover">
              Kelola Scenes
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid Layout: Deskripsi Template on the Left, Media Referensi Master on the Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deskripsi Template */}
        <div className="space-y-1.5 bg-muted p-4 rounded-lg border border-border/30 h-full">
          <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground block">
            Deskripsi Template
          </span>
          <p className="text-foreground text-[12px] max-w-4xl">
            {template.description || "Tidak ada deskripsi untuk template ini."}
          </p>
        </div>

        {/* Info Media Assets */}
        <Card className="bg-muted/30 border-dashed h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Media Referensi Master
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground py-0 pb-4 space-y-3">
            {/* Video Referensi */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 shrink-0 font-semibold text-foreground">
                <Film className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Video Referensi</span>
              </div>
              {template.video_url ? (
                <a
                  href={template.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-mono truncate max-w-[280px] sm:max-w-xs md:max-w-md text-right"
                >
                  {getFilename(template.video_url)}
                </a>
              ) : (
                <span className="italic text-muted-foreground/60">
                  Belum ada video terunggah.
                </span>
              )}
            </div>

            {/* Audio Sources */}
            {template.audio_sources && template.audio_sources.length > 0 ? (
              template.audio_sources.map((source) => (
                <div
                  key={source.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 shrink-0 font-semibold text-foreground">
                    <Music className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Audio {source.name}</span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono truncate max-w-[280px] sm:max-w-xs md:max-w-md text-right"
                  >
                    {getFilename(source.url)}
                  </a>
                </div>
              ))
            ) : template.audio_url ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 shrink-0 font-semibold text-foreground">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Audio Referensi</span>
                </div>
                <a
                  href={template.audio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-mono truncate max-w-[280px] sm:max-w-xs md:max-w-md text-right"
                >
                  {getFilename(template.audio_url)}
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 shrink-0 font-semibold text-foreground">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Audio Referensi</span>
                </div>
                <span className="italic text-muted-foreground/60">
                  Belum ada audio terunggah.
                </span>
              </div>
            )}

            {/* M&E Audio (M&E) if exists */}
            {template.mne_audio_url && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 shrink-0 font-semibold text-foreground">
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Music & Effects (M&E)</span>
                </div>
                <a
                  href={template.mne_audio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-mono truncate max-w-[280px] sm:max-w-xs md:max-w-md text-right"
                >
                  {getFilename(template.mne_audio_url)}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daftar Project yang Menggunakan Template Ini */}
      <Card className="bg-muted/10 border border-border/40 shadow-xs">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Folder className="h-4 w-4 text-primary" /> Daftar Project yang
            Menggunakan Template Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground py-0 pb-4">
          {projects && projects.length > 0 ? (
            <div className="divide-y divide-border/40">
              {projects.map((project, idx) => (
                <div
                  key={idx}
                  className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground block text-sm">
                      {project.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {project.description || "Tidak ada deskripsi project."}
                    </span>
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button className="font-semibold bg-primary text-primary-foreground hover:bg-primary-hover">
                      Buka Project
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="italic text-muted-foreground/60 py-2">
              Belum ada project yang menggunakan template ini.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
