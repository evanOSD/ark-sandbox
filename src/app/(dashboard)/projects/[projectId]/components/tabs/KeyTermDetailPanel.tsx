"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Tag, Volume2, User, Loader2 } from "lucide-react";
import { Scene } from "../../ProjectClient";
import { getCloudinaryUploadParamsKeyTerms } from "../../loops/actions";
import { renderFormattedText } from "@/utils/text-formatting";
import { TermItem, TranslationData, OccurrenceItem } from "@/types/key-terms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LineRecordingModal } from "../../scenes/[sceneId]/loops/[loopId]/components/audio-editor/LineRecordingModal";
import { useAudioSettings } from "@/hooks/useAudioSettings";

interface KeyTermDetailPanelProps {
  selectedTerm: TermItem;
  projectId: string;
  initialTranslation: TranslationData | null;
  activeScene: Scene | null;
  onSaveTranslation: (fields: Partial<TranslationData>) => Promise<void>;
  isSaving: boolean;
  handlePlayLoop: (loopId: string, startMs: number, audioUrl?: string) => void;
  activeLoopPlayId: string | null;
  isShowScriptAllowed: boolean;
  showTextScript: boolean;
  allowedScripts: string;
  audioSources: Array<{ name: string; url: string }>;
  activeAudioUrl: string;
}

export function KeyTermDetailPanel({
  selectedTerm,
  projectId,
  initialTranslation,
  activeScene,
  onSaveTranslation,
  isSaving,
  handlePlayLoop,
  activeLoopPlayId,
  isShowScriptAllowed,
  showTextScript,
  allowedScripts,
  audioSources,
  activeAudioUrl,
}: KeyTermDetailPanelProps) {
  const [transInput, setTransInput] = useState(
    initialTranslation?.translated_text || "",
  );
  const [backInput, setBackInput] = useState(
    initialTranslation?.back_translation || "",
  );
  const [notesInput, setNotesInput] = useState(initialTranslation?.notes || "");
  const [ktAudioUrl, setKtAudioUrl] = useState<string | null>(
    initialTranslation?.key_term_audio_url || null,
  );
  const [btAudioUrl, setBtAudioUrl] = useState<string | null>(
    initialTranslation?.key_term_bt_audio_url || null,
  );
  const [prevTranslation, setPrevTranslation] =
    useState<TranslationData | null>(initialTranslation);

  // Sync inputs on prop changes (state adjustment during rendering to avoid useEffect cascading renders)
  if (initialTranslation !== prevTranslation) {
    setPrevTranslation(initialTranslation);
    setTransInput(initialTranslation?.translated_text || "");
    setBackInput(initialTranslation?.back_translation || "");
    setNotesInput(initialTranslation?.notes || "");
    setKtAudioUrl(initialTranslation?.key_term_audio_url || null);
    setBtAudioUrl(initialTranslation?.key_term_bt_audio_url || null);
  }

  // Recording state using LineRecordingModal
  const [recordingTermType, setRecordingTermType] = useState<
    "kt" | "kt-bt" | null
  >(null);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const audioSettings = useAudioSettings();

  // Refs and hooks for textarea auto-resizing
  const transRef = useRef<HTMLTextAreaElement | null>(null);
  const backRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (transRef.current) resizeTextarea(transRef.current);
    if (backRef.current) resizeTextarea(backRef.current);
    if (notesRef.current) resizeTextarea(notesRef.current);
  }, [transInput, backInput, notesInput, selectedTerm]);

  // Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
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

  const handleSaveRecordingBlob = async (blob: Blob) => {
    if (!recordingTermType) return;

    try {
      setIsSavingAudio(true);

      // Normalize to -6dB
      let finalBlob = blob;
      try {
        const { normalizeAudioBlob } = await import("@/lib/audio-utils");
        finalBlob = await normalizeAudioBlob(blob, -6);
      } catch (normErr) {
        console.error("Gagal melakukan normalisasi audio:", normErr);
      }

      // 1. Get Cloudinary signed upload parameters from server
      const uploadParams = await getCloudinaryUploadParamsKeyTerms(
        projectId,
        selectedTerm.id,
        recordingTermType,
      );

      // 2. Prepare FormData for direct browser upload
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append(
        "file",
        finalBlob,
        `${uploadParams.publicId}.wav`,
      );
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
        },
      );

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        throw new Error("Cloudinary Upload Error: " + uploadData.error.message);
      }

      const secureUrl = uploadData.secure_url;

      // 4. Save to Database via parent callback onSaveTranslation
      if (recordingTermType === "kt") {
        setKtAudioUrl(secureUrl);
        await onSaveTranslation({ key_term_audio_url: secureUrl });
      } else {
        setBtAudioUrl(secureUrl);
        await onSaveTranslation({ key_term_bt_audio_url: secureUrl });
      }
    } catch (err) {
      console.error("Gagal menyimpan rekaman:", err);
      alert(
        "Gagal menyimpan rekaman: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSavingAudio(false);
      setRecordingTermType(null);
    }
  };

  // Audio Playback
  const togglePlayAudio = (url: string, id: string) => {
    if (audioRef.current) {
      if (playingAudioId === id) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudioId(id);
        audioRef.current.onended = () => setPlayingAudioId(null);
      }
    } else {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Find loops where key term is present (only real loops from Supabase)
  const realLoops =
    activeScene?.loops.filter((loop) =>
      loop.key_terms?.some((kt) => kt.id === selectedTerm.id),
    ) || [];

  const occurrences: OccurrenceItem[] = realLoops.map((loop) => ({
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
    startTimeMs: loop.start_time_ms,
    lips: loop.sequence_number % 2 === 0 ? "2 LIPS" : "1 LIPS",
    avatar: loop.sequence_number % 3 === 0 ? "female" : "male",
    loop,
  }));

  // Determine which script indices to show per occurrence based on role/settings
  const allowedNames = allowedScripts ? allowedScripts.split(",").filter(Boolean) : [];
  let displayedIndices: number[] = [];
  let hideScriptText = false;

  if (isShowScriptAllowed) {
    // Admin/Consultant: always show ALL templates regardless of any setting
    displayedIndices = audioSources.length > 0 ? audioSources.map((_, idx) => idx) : [0];
  } else {
    if (showTextScript) {
      // User with access: only allowed templates, with text visible
      audioSources.forEach((src, idx) => {
        if (allowedNames.includes(src.name)) {
          displayedIndices.push(idx);
        }
      });
      if (displayedIndices.length === 0 && audioSources.length > 0) {
        displayedIndices.push(0);
      }
    } else {
      // User without access: show all template labels but hide script text
      displayedIndices = audioSources.length > 0 ? audioSources.map((_, idx) => idx) : [0];
      hideScriptText = true;
    }
  }

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
            {/* Red Record Button */}
            <button
              type="button"
              onClick={() => setRecordingTermType("kt")}
              disabled={isSavingAudio}
              className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group shrink-0 mt-0.5 disabled:opacity-50 disabled:scale-100"
              title="Rekam Pelafalan Kata Kunci"
            >
              <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Play/Stop Button */}
            {ktAudioUrl && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                  playingAudioId === `kt-${selectedTerm.id}`
                    ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                    : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                )}
                onClick={() =>
                  togglePlayAudio(ktAudioUrl, `kt-${selectedTerm.id}`)
                }
                title={
                  playingAudioId === `kt-${selectedTerm.id}`
                    ? "Hentikan Pemutaran"
                    : "Putar Pelafalan Kata Kunci"
                }
              >
                {playingAudioId === `kt-${selectedTerm.id}` ? (
                  <Square className="h-2.5 w-2.5 fill-current" />
                ) : (
                  <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                )}
              </Button>
            )}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={(el) => {
                transRef.current = el;
                if (el) resizeTextarea(el);
              }}
              value={transInput}
              onChange={(e) => setTransInput(e.target.value)}
              onInput={(e) => resizeTextarea(e.currentTarget)}
              onBlur={() => handleBlur("translated_text", transInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              placeholder="Ketik terjemahan kata kunci..."
              rows={1}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 pr-8 resize-none overflow-hidden leading-relaxed"
            />
            {isSaving && (
              <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-amber-500" />
            )}
          </div>
        </div>

        {/* Back Translation */}
        <div className="flex items-start gap-3">
          <span className="w-32 text-xs font-bold text-muted-foreground pt-2 select-none">
            Back Translation:
          </span>
          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            {/* Red Record Button */}
            <button
              type="button"
              onClick={() => setRecordingTermType("kt-bt")}
              disabled={isSavingAudio}
              className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group shrink-0 mt-0.5 disabled:opacity-50 disabled:scale-100"
              title="Rekam Terjemahan Balik Kata Kunci"
            >
              <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Play/Stop Button */}
            {btAudioUrl && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                  playingAudioId === `kt-bt-${selectedTerm.id}`
                    ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                    : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                )}
                onClick={() =>
                  togglePlayAudio(btAudioUrl, `kt-bt-${selectedTerm.id}`)
                }
                title={
                  playingAudioId === `kt-bt-${selectedTerm.id}`
                    ? "Hentikan Pemutaran"
                    : "Putar Terjemahan Balik Kata Kunci"
                }
              >
                {playingAudioId === `kt-bt-${selectedTerm.id}` ? (
                  <Square className="h-2.5 w-2.5 fill-current" />
                ) : (
                  <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                )}
              </Button>
            )}
          </div>
          <textarea
            ref={(el) => {
              backRef.current = el;
              if (el) resizeTextarea(el);
            }}
            value={backInput}
            onChange={(e) => setBackInput(e.target.value)}
            onInput={(e) => resizeTextarea(e.currentTarget)}
            onBlur={() => handleBlur("back_translation", backInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder="Ketik terjemahan balik..."
            rows={1}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none overflow-hidden leading-relaxed"
          />
        </div>

        {/* Comments / Notes */}
        <div className="flex items-start gap-3">
          <span className="w-32 text-xs font-bold text-muted-foreground pt-2 select-none">
            Comments / Notes:
          </span>
          <textarea
            ref={(el) => {
              notesRef.current = el;
              if (el) resizeTextarea(el);
            }}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onInput={(e) => resizeTextarea(e.currentTarget)}
            onBlur={() => handleBlur("notes", notesInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder="Masukkan komentar atau catatan..."
            rows={1}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none overflow-hidden leading-relaxed"
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
            Kata kunci ini belum ditautkan ke loop manapun di scene yang sedang
            aktif.
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
                  <div className="flex-1 flex flex-col gap-2 mt-1">
                    {displayedIndices.map((scriptIdx) => {
                      const source = audioSources[scriptIdx];
                      const sourceUrl = source?.url || "";
                      const labelName = source ? source.name.replace(/\.wav$/i, "") : "";

                      let scriptText = "";
                      if (occ.loop) {
                        if (scriptIdx === 0) scriptText = occ.loop.script_text_1 || "";
                        else if (scriptIdx === 1) scriptText = occ.loop.script_text_2 || "";
                        else if (scriptIdx === 2) scriptText = occ.loop.script_text_3 || "";
                        else if (scriptIdx === 3) scriptText = occ.loop.script_text_4 || "";
                      } else {
                        scriptText = occ.scriptText;
                      }

                      const isPlayingThis = activeLoopPlayId === occ.id && activeAudioUrl === sourceUrl;

                      return (
                        <div key={scriptIdx} className="flex items-start gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePlayLoop(occ.id, occ.startTimeMs, sourceUrl)}
                            className={cn(
                              "h-6 w-6 rounded-full border shrink-0 transition-colors cursor-pointer",
                              isPlayingThis
                                ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                                : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                            )}
                            title={isPlayingThis ? "Hentikan Pemutaran Loop" : `Putar Loop (${labelName})`}
                          >
                            {isPlayingThis ? (
                              <Square className="h-2.5 w-2.5 fill-current" />
                            ) : (
                              <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                            )}
                          </Button>

                          <div className="flex flex-col flex-1 pt-0.5">
                            {/* Label — always shown for all roles */}
                            {labelName && (
                              <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider leading-none mb-0.5">
                                {labelName}
                              </span>
                            )}
                            {/* Script text — hidden when hideScriptText */}
                            {!hideScriptText && (
                              <p className="text-xs text-foreground leading-relaxed">
                                {highlightText(scriptText, selectedTerm.term) || (
                                  <span className="text-muted-foreground/40 italic select-none">(Belum ada teks script)</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {recordingTermType && (
        <LineRecordingModal
          isOpen={recordingTermType !== null}
          onClose={() => setRecordingTermType(null)}
          onSave={handleSaveRecordingBlob}
          durationMs={3000}
          audioSettings={audioSettings}
        />
      )}
    </div>
  );
}
