"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Mic,
  Square,
  Tag,
  Volume2,
  User,
  Loader2,
} from "lucide-react";
import { Scene } from "../../ProjectClient";
import { saveKeyTermTranslation } from "../../loops/actions";
import { createClient } from "@/utils/supabase/client";
import { renderFormattedText } from "@/utils/text-formatting";
import { TermItem, TranslationData, OccurrenceItem } from "@/types/key-terms";

interface KeyTermDetailPanelProps {
  selectedTerm: TermItem;
  projectId: string;
  initialTranslation: TranslationData | null;
  activeScene: Scene | null;
  onSaveTranslation: (fields: Partial<TranslationData>) => Promise<void>;
  isSaving: boolean;
}

export function KeyTermDetailPanel({
  selectedTerm,
  projectId,
  initialTranslation,
  activeScene,
  onSaveTranslation,
  isSaving,
}: KeyTermDetailPanelProps) {
  const [transInput, setTransInput] = useState(
    initialTranslation?.translated_text || "",
  );
  const [backInput, setBackInput] = useState(
    initialTranslation?.back_translation || "",
  );
  const [notesInput, setNotesInput] = useState(initialTranslation?.notes || "");
  const [audioUrl, setAudioUrl] = useState<string | null>(
    initialTranslation?.recorded_audio_url || null,
  );
  const [prevTranslation, setPrevTranslation] =
    useState<TranslationData | null>(initialTranslation);

  // Sync inputs on prop changes (state adjustment during rendering to avoid useEffect cascading renders)
  if (initialTranslation !== prevTranslation) {
    setPrevTranslation(initialTranslation);
    setTransInput(initialTranslation?.translated_text || "");
    setBackInput(initialTranslation?.back_translation || "");
    setNotesInput(initialTranslation?.notes || "");
    setAudioUrl(initialTranslation?.recorded_audio_url || null);
  }

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Save text inputs on blur
  const handleBlur = (
    field: "translated_text" | "back_translation" | "notes",
    value: string,
  ) => {
    let isChanged = false;
    if (field === "translated_text") {
      isChanged = (initialTranslation?.translated_text || "") !== value;
    } else if (field === "back_translation") {
      isChanged = (initialTranslation?.back_translation || "") !== value;
    } else if (field === "notes") {
      isChanged = (initialTranslation?.notes || "") !== value;
    }

    if (isChanged) {
      onSaveTranslation({ [field]: value });
    }
  };

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        try {
          const audioFile = new File(
            [recordedBlob],
            `term-${selectedTerm.id}.wav`,
            { type: "audio/wav" },
          );
          await saveKeyTermTranslation(
            projectId,
            selectedTerm.id,
            transInput,
            audioFile,
          );

          const supabase = createClient();
          const { data, error } = await supabase
            .from("project_key_term_translations")
            .select("recorded_audio_url, id")
            .eq("project_id", projectId)
            .eq("key_term_id", selectedTerm.id)
            .maybeSingle();

          if (error) throw error;

          if (data?.recorded_audio_url) {
            setAudioUrl(data.recorded_audio_url);
            onSaveTranslation({
              recorded_audio_url: data.recorded_audio_url,
              id: data.id,
            });
          }
        } catch (err) {
          console.error("Gagal mengunggah audio:", err);
          alert("Gagal menyimpan audio di server.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Gagal mengakses mikrofon:", err);
      alert("Gagal mengakses mikrofon. Pastikan izin mikrofon diaktifkan.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Audio Playback
  const togglePlayAudio = (url: string) => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.src === url) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } else {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  // Find loops where key term is present (only real loops from Supabase)
  const occurrences: OccurrenceItem[] = React.useMemo(() => {
    const realLoops =
      activeScene?.loops.filter((loop) =>
        loop.key_terms?.some((kt) => kt.id === selectedTerm.id),
      ) || [];

    return realLoops.map((loop) => ({
      id: loop.id,
      name: loop.sequence_number.toString().padStart(4, "0"),
      scriptText:
        loop.script_text_1 ||
        loop.script_text_2 ||
        loop.script_text_3 ||
        loop.script_text_4 ||
        "",
      isReal: true,
      audioUrl: loop.recording?.recorded_audio_url || null,
      lips: loop.sequence_number % 2 === 0 ? "2 LIPS" : "1 LIPS",
      avatar: loop.sequence_number % 3 === 0 ? "female" : "male",
    }));
  }, [selectedTerm, activeScene]);

  // Regex highlighting helper for terms inside occurrences
  const highlightText = (text: string, term: string) => {
    if (!text) return "";
    const mainWord = term
      .split("-")[0]
      .trim()
      .replace(/[(),:]/g, "");
    if (mainWord.length < 2) return text;

    try {
      const regex = new RegExp(`(${mainWord})`, "gi");
      const parts = text.split(regex);
      return (
        <>
          {parts.map((part, i) =>
            regex.test(part) ? (
              <mark
                key={i}
                className="bg-amber-500/20 text-amber-500 font-semibold px-0.5 rounded"
              >
                {part}
              </mark>
            ) : (
              part
            ),
          )}
        </>
      );
    } catch {
      return text;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5 text-amber-500 fill-amber-500/10" />
          {selectedTerm.term}
        </h2>
        {selectedTerm.original_word && (
          <p className="text-xs text-muted-foreground italic font-mono mt-0.5">
            ({selectedTerm.original_word})
          </p>
        )}
        {selectedTerm.category && (
          <span className="text-[11px] mt-1.5 inline-block bg-muted border border-border/60 px-2 py-0.5 rounded text-muted-foreground font-semibold">
            {selectedTerm.category}
          </span>
        )}
      </div>

      <hr className="border-border/60" />

      {/* Translation Inputs */}
      <div className="space-y-4 max-w-3xl bg-card/40 border border-border/80 p-5 rounded-xl shadow-sm">
        {/* Your Translation */}
        <div className="flex items-center gap-3">
          <span className="w-32 text-xs font-bold text-muted-foreground select-none">
            Your Translation:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-7.5 w-7.5 rounded-full flex items-center justify-center border transition-all cursor-pointer
                ${
                  isRecording
                    ? "bg-red-600 border-red-700 animate-pulse text-white hover:bg-red-700"
                    : "bg-background border-border hover:bg-muted text-red-500"
                }`}
              title={isRecording ? "Stop Rekam" : "Rekam Suara"}
            >
              {isRecording ? (
                <Square className="h-3 w-3 fill-white" />
              ) : (
                <Mic className="h-3.5 w-3.5 fill-red-500" />
              )}
            </button>
            <button
              disabled={!audioUrl}
              onClick={() => audioUrl && togglePlayAudio(audioUrl)}
              className={`h-7.5 w-7.5 rounded-full flex items-center justify-center border transition-all
                ${
                  audioUrl
                    ? "bg-background border-border hover:bg-muted text-amber-500 cursor-pointer"
                    : "bg-background border-border text-muted-foreground/30 cursor-not-allowed"
                }`}
              title="Putar Audio"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-amber-500" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-amber-500 ml-0.5" />
              )}
            </button>
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={transInput}
              onChange={(e) => setTransInput(e.target.value)}
              onBlur={() => handleBlur("translated_text", transInput)}
              placeholder="Ketik terjemahan kata kunci..."
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 pr-8"
            />
            {isSaving && (
              <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-amber-500" />
            )}
          </div>
        </div>

        {/* Back Translation */}
        <div className="flex items-center gap-3">
          <span className="w-32 text-xs font-bold text-muted-foreground select-none">
            Back Translation:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              disabled
              className="h-7.5 w-7.5 rounded-full flex items-center justify-center border border-border/30 text-muted-foreground/30 cursor-not-allowed"
            >
              <Play className="h-3.5 w-3.5 fill-muted-foreground/30 ml-0.5" />
            </button>
          </div>
          <input
            type="text"
            value={backInput}
            onChange={(e) => setBackInput(e.target.value)}
            onBlur={() => handleBlur("back_translation", backInput)}
            placeholder="Ketik terjemahan balik..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Comments / Notes */}
        <div className="flex items-start gap-3">
          <span className="w-32 text-xs font-bold text-muted-foreground pt-2 select-none">
            Comments / Notes:
          </span>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={() => handleBlur("notes", notesInput)}
            placeholder="Masukkan komentar atau catatan..."
            rows={2}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
          />
        </div>
      </div>

      {/* Meaning or Note Description */}
      {selectedTerm.meaning_or_note && (
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2 max-w-3xl italic bg-muted/20 border border-border/40 p-4.5 rounded-lg whitespace-pre-wrap">
          {renderFormattedText(selectedTerm.meaning_or_note)}
        </div>
      )}

      {/* Loops with Occurrences */}
      <div className="mt-8 space-y-4 max-w-3xl">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Loops with Occurrences
          </h4>
          <span className="text-[10px] text-muted-foreground bg-muted border border-border/60 px-2 py-0.5 rounded-full select-none">
            {occurrences.length} loops
          </span>
        </div>

        {occurrences.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">
            Kata kunci ini belum ditautkan ke loop manapun di scene yang sedang aktif.
          </div>
        ) : (
          <div className="space-y-4">
            {occurrences.map((occ: OccurrenceItem, idx: number) => {
              let avatarEl;
              if (occ.avatar === "female") {
                avatarEl = (
                  <div className="h-10 w-10 rounded border border-border flex flex-col items-center justify-center bg-pink-500/10 text-pink-500 shrink-0 text-xs select-none">
                    <User className="h-5 w-5" />
                  </div>
                );
              } else if (occ.avatar === "male") {
                avatarEl = (
                  <div className="h-10 w-10 rounded border border-border flex flex-col items-center justify-center bg-blue-500/10 text-blue-500 shrink-0 text-xs select-none">
                    <User className="h-5 w-5" />
                  </div>
                );
              } else if (occ.avatar === "bearded") {
                avatarEl = (
                  <div className="h-10 w-10 rounded border border-border flex flex-col items-center justify-center bg-amber-500/10 text-amber-500 shrink-0 text-xs select-none">
                    <User className="h-5 w-5 animate-pulse" />
                  </div>
                );
              } else {
                avatarEl = (
                  <div className="h-10 w-10 rounded border border-border flex flex-col items-center justify-center bg-zinc-500/10 text-zinc-500 shrink-0 text-xs select-none">
                    <Volume2 className="h-5 w-5" />
                  </div>
                );
              }

              return (
                <div
                  key={occ.id || idx}
                  className="pb-4 border-b border-border/40 last:border-0 flex items-start gap-4"
                >
                  {/* Avatar & Badges */}
                  <div className="flex flex-col items-center gap-1 shrink-0 select-none">
                    {avatarEl}
                    {occ.lips && (
                      <span className="text-[8px] font-extrabold text-red-500 bg-red-500/10 border border-red-500/20 px-1 rounded-sm">
                        {occ.lips}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {occ.name}
                    </span>
                  </div>

                  {/* Occurrences Audio Trigger + Script Text */}
                  <div className="flex-1 flex items-start gap-3 mt-1.5">
                    <button
                      onClick={() =>
                        occ.audioUrl && togglePlayAudio(occ.audioUrl)
                      }
                      disabled={!occ.audioUrl}
                      className={`h-6.5 w-6.5 rounded-full border flex items-center justify-center shrink-0 transition-all
                        ${
                          occ.audioUrl
                            ? "bg-background border-border hover:bg-muted text-amber-500 cursor-pointer"
                            : "bg-background border-border/10 text-muted-foreground/15 cursor-not-allowed"
                        }`}
                      title="Putar Audio Loop"
                    >
                      <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                    </button>

                    <p className="text-xs text-foreground leading-relaxed flex-1 pt-0.5">
                      {highlightText(occ.scriptText, selectedTerm.term)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
