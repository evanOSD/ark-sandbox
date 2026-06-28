"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Mic,
  Square,
  Tag,
  ChevronDown,
  Search,
  Loader2,
  Volume2,
  User,
} from "lucide-react";
import { Scene } from "../../ProjectClient";
import { saveKeyTermTranslation } from "../../loops/actions";
import { createClient } from "@/utils/supabase/client";
import { renderFormattedText } from "@/utils/text-formatting";

interface KeyTermsTabProps {
  activeScene: Scene | null;
  projectId: string;
}

interface TranslationData {
  id?: string;
  translated_text?: string;
  recorded_audio_url?: string;
  back_translation?: string;
  notes?: string;
}

interface TermItem {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  category: string | null;
}

interface OccurrenceItem {
  id: string;
  name: string;
  scriptText: string;
  isReal: boolean;
  audioUrl?: string | null;
  lips: string;
  avatar: string;
}

interface CategoryItem {
  name: string;
  terms: TermItem[];
}

export function KeyTermsTab({ activeScene, projectId }: KeyTermsTabProps) {
  const [selectedTerm, setSelectedTerm] = useState<TermItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [translations, setTranslations] = useState<
    Record<string, TranslationData>
  >({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [dbSupport, setDbSupport] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Extract unique key terms from scene loops (only real Supabase data)
  const allKeyTerms = React.useMemo(() => {
    const uniqueMap = new Map<string, TermItem>();
    if (activeScene && activeScene.loops) {
      for (const loop of activeScene.loops) {
        if (loop.key_terms) {
          for (const kt of loop.key_terms) {
            uniqueMap.set(kt.id, {
              id: kt.id,
              term: kt.term,
              original_word: kt.original_word,
              meaning_or_note: kt.meaning_or_note,
              category: kt.category ?? null,
            });
          }
        }
      }
    }
    return Array.from(uniqueMap.values());
  }, [activeScene]);

  // Load translations and check database capabilities
  useEffect(() => {
    const loadTranslations = async () => {
      setIsDataLoading(true);
      try {
        const supabase = createClient();

        // Check if database table columns exist
        const { error: probeError } = await supabase
          .from("project_key_term_translations")
          .select("back_translation, notes")
          .limit(1);

        const hasDbSupport = !probeError;
        setDbSupport(hasDbSupport);

        // Fetch translations
        const { data, error } = await supabase
          .from("project_key_term_translations")
          .select("*")
          .eq("project_id", projectId);

        if (error) throw error;

        const transMap: Record<string, TranslationData> = {};
        for (const row of data || []) {
          transMap[row.key_term_id] = {
            id: row.id,
            translated_text: row.translated_text || "",
            recorded_audio_url: row.recorded_audio_url || "",
            back_translation: hasDbSupport
              ? row.back_translation || ""
              : localStorage.getItem(
                  `back_trans_${projectId}_${row.key_term_id}`,
                ) || "",
            notes: hasDbSupport
              ? row.notes || ""
              : localStorage.getItem(`notes_${projectId}_${row.key_term_id}`) ||
                "",
          };
        }

        setTranslations(transMap);
      } catch (e) {
        console.error("Gagal memuat terjemahan:", e);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (projectId) {
      loadTranslations();
    }
  }, [projectId]);

  // Build filtered categories list — only from real Supabase data, grouped by category field
  const categoriesWithTerms: CategoryItem[] = React.useMemo(() => {
    const filteredTerms = allKeyTerms.filter((kt) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        kt.term.toLowerCase().includes(q) ||
        (kt.original_word && kt.original_word.toLowerCase().includes(q)) ||
        (kt.meaning_or_note && kt.meaning_or_note.toLowerCase().includes(q))
      );
    });

    // Group by category; uncategorized goes to "Belum Dikategorikan"
    const groupMap = new Map<string, TermItem[]>();
    for (const kt of filteredTerms) {
      const groupName = kt.category?.trim() || "Belum Dikategorikan";
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(kt);
    }

    // Sort groups: named categories alphabetically first, "Belum Dikategorikan" last
    const entries = Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === "Belum Dikategorikan") return 1;
      if (b === "Belum Dikategorikan") return -1;
      return a.localeCompare(b);
    });

    return entries.map(([name, terms]) => ({
      name,
      terms: terms.sort((a, b) => a.term.localeCompare(b.term)),
    }));
  }, [allKeyTerms, searchQuery]);

  // Derive the active selected term
  const activeTerm =
    selectedTerm ||
    categoriesWithTerms.find((c) => c.terms.length > 0)?.terms[0] ||
    null;

  // Save changes callback from child component
  const handleSaveTranslation = async (fields: Partial<TranslationData>) => {
    if (!activeTerm) return;

    setSavingStates((prev) => ({ ...prev, [activeTerm.id]: true }));
    try {
      const supabase = createClient();
      const existing = translations[activeTerm.id];

      const updateData: {
        updated_at: string;
        translated_text?: string | null;
        back_translation?: string | null;
        notes?: string | null;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (fields.translated_text !== undefined) {
        updateData.translated_text = fields.translated_text || null;
      }

      if (dbSupport) {
        if (fields.back_translation !== undefined)
          updateData.back_translation = fields.back_translation || null;
        if (fields.notes !== undefined) updateData.notes = fields.notes || null;
      } else {
        if (fields.back_translation !== undefined) {
          localStorage.setItem(
            `back_trans_${projectId}_${activeTerm.id}`,
            fields.back_translation,
          );
        }
        if (fields.notes !== undefined) {
          localStorage.setItem(
            `notes_${projectId}_${activeTerm.id}`,
            fields.notes,
          );
        }
      }

      if (existing?.id) {
        const { error } = await supabase
          .from("project_key_term_translations")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Anda belum login");

        const insertData = {
          project_id: projectId,
          key_term_id: activeTerm.id,
          recorded_by: user.id,
          ...updateData,
        };

        const { data, error } = await supabase
          .from("project_key_term_translations")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTranslations((prev) => ({
            ...prev,
            [activeTerm.id]: {
              ...(prev[activeTerm.id] || {}),
              id: data.id,
            },
          }));
        }
      }

      setTranslations((prev) => ({
        ...prev,
        [activeTerm.id]: {
          ...(prev[activeTerm.id] || {}),
          ...fields,
        },
      }));
    } catch (e) {
      console.error("Gagal menyimpan terjemahan:", e);
    } finally {
      setSavingStates((prev) => ({ ...prev, [activeTerm.id]: false }));
    }
  };

  const isSavingActive = activeTerm ? !!savingStates[activeTerm.id] : false;
  const activeTranslation = activeTerm
    ? translations[activeTerm.id] || null
    : null;

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-background text-foreground border-t border-border">
      {/* Left Column: Sidebar List */}
      <div className="w-[35%] border-r border-border flex flex-col h-full overflow-hidden bg-card/20 select-none">
        {/* Search Container */}
        <div className="p-3 border-b border-border space-y-2 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Categories Tree */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span>Memuat glosarium...</span>
            </div>
          ) : categoriesWithTerms.length === 0 ? (
            <div className="text-center p-6 text-xs text-muted-foreground italic">
              {searchQuery
                ? "Tidak ada kata kunci yang cocok dengan pencarian."
                : "Tidak ada kata kunci yang terhubung ke scene ini."}
            </div>
          ) : (
            categoriesWithTerms.map((cat) => (
              <div key={cat.name} className="mb-4">
                <div className="flex items-center gap-1 px-1.5 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span>{cat.name}</span>
                </div>
                <div className="ml-2.5 border-l border-border/40 pl-2 mt-1 space-y-1.5">
                  {cat.terms.map((t) => {
                    const isSelected = activeTerm?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTerm(t)}
                        className={`relative px-3 py-1.5 text-xs rounded transition-all cursor-pointer flex items-center justify-between group
                          ${
                            isSelected
                              ? "bg-muted font-bold text-amber-500 border border-border/40"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                      >
                        <div className="truncate pr-2">{t.term}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Detail Panel */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 bg-card/5">
        {activeTerm ? (
          <KeyTermDetailPanel
            key={activeTerm.id}
            selectedTerm={activeTerm}
            projectId={projectId}
            initialTranslation={activeTranslation}
            activeScene={activeScene}
            onSaveTranslation={handleSaveTranslation}
            isSaving={isSavingActive}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs select-none italic">
            {allKeyTerms.length === 0
              ? "Belum ada kata kunci yang ditautkan ke scene ini. Silakan tambahkan kata kunci melalui Key Terms Editor."
              : "Pilih kata kunci dari daftar di sebelah kiri untuk melihat detail terjemahan."}
          </div>
        )}
      </div>
    </div>
  );
}

interface KeyTermDetailPanelProps {
  selectedTerm: TermItem;
  projectId: string;
  initialTranslation: TranslationData | null;
  activeScene: Scene | null;
  onSaveTranslation: (fields: Partial<TranslationData>) => Promise<void>;
  isSaving: boolean;
}

function KeyTermDetailPanel({
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
    <div className="space-y-1.5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-foreground flex items-center justify-center gap-2">
          <Tag className="h-5 w-5 text-amber-500 fill-amber-500/10" />
          {selectedTerm.term}
        </h2>
        {selectedTerm.original_word && (
          <p className="text-xs text-muted-foreground flex items-center justify-center italic font-mono">
            ({selectedTerm.original_word})
          </p>
        )}
        {selectedTerm.category && (
          <span className="text-[11px] mt-1.5 inline-block bg-muted border border-border/60 rounded text-muted-foreground font-semibold">
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
