import { useState, useRef } from "react";
import { Square, Save, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveKeyTermTranslation, getCloudinaryUploadParamsKeyTerms } from "../../actions";
import { KeyTerm } from "../WorkspaceClient";
import { renderFormattedText } from "@/utils/text-formatting";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { cn } from "@/lib/utils";
import { LineRecordingModal } from "../../../scenes/[sceneId]/loops/[loopId]/components/audio-editor/LineRecordingModal";

interface KeyTermCardProps {
  term: KeyTerm;
  projectId: string;
}

export function KeyTermCard({ term, projectId }: KeyTermCardProps) {
  // Local state for this specific key term translation
  const [text, setText] = useState(term.translation?.translated_text || "");
  const [url, setUrl] = useState<string | null>(
    term.translation?.key_term_audio_url || null,
  );
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSettings = useAudioSettings();

  const handleSaveRecordingBlob = async (blob: Blob) => {
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
        term.id,
        "kt"
      );

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

      // 4. Save to Database
      await saveKeyTermTranslation(projectId, term.id, text, secureUrl);
      setUrl(secureUrl);
    } catch (err) {
      console.error("Gagal menyimpan rekaman:", err);
      alert(
        "Gagal menyimpan rekaman: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSavingAudio(false);
      setIsRecordingModalOpen(false);
    }
  };

  const togglePlayAudio = (audioUrl: string) => {
    if (audioRef.current) {
      if (playingAudioId === term.id) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudioId(term.id);
        audioRef.current.onended = () => setPlayingAudioId(null);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setPlayingAudioId(term.id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  const saveTermTranslation = async () => {
    setIsSaving(true);
    try {
      await saveKeyTermTranslation(projectId, term.id, text, url);
      alert("Terjemahan kata kunci berhasil disimpan!");
    } catch (err) {
      alert(
        "Gagal menyimpan kata kunci: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-3.5 space-y-3 hover:border-primary/20 transition-all bg-card/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-foreground">{term.term}</h4>
          {term.original_word && (
            <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono mt-0.5 inline-block">
              Bahasa Asal: {term.original_word}
            </span>
          )}
        </div>
      </div>
      {term.meaning_or_note && (
        <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-line">
          Definisi: {renderFormattedText(term.meaning_or_note)}
        </p>
      )}

      <div className="border-t pt-3 space-y-2.5">
        {/* Text Translation Input */}
        <div className="space-y-1">
          <Label
            htmlFor={`t-text-${term.id}`}
            className="text-[11px] font-semibold text-muted-foreground uppercase"
          >
            Ejaan Terjemahan Lokal
          </Label>
          <Input
            id={`t-text-${term.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik ejaan/kata terjemahan lokal..."
            className="h-8.5 text-xs bg-background/50"
          />
        </div>

        {/* Oral Audio Translation */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Rekaman Suara Pelafalan
          </Label>
          <div className="flex items-center gap-2">
            {/* Red Record Button */}
            <button
              type="button"
              onClick={() => setIsRecordingModalOpen(true)}
              disabled={isSavingAudio}
              className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 group shrink-0 mt-0.5 disabled:opacity-50 disabled:scale-100"
              title="Rekam Pelafalan Kata Kunci"
            >
              <span className="w-2 h-2 rounded-full bg-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Play/Stop Button */}
            {url && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full border shrink-0 mt-0.5 transition-colors cursor-pointer",
                  playingAudioId === term.id
                    ? "text-rose-500 border-rose-950/40 hover:bg-rose-950/20 bg-background/40 hover:text-rose-400"
                    : "text-emerald-500 border-emerald-950/40 hover:bg-emerald-950/20 bg-background/40 hover:text-emerald-400",
                )}
                onClick={() => togglePlayAudio(url)}
                title={
                  playingAudioId === term.id
                    ? "Hentikan Pemutaran"
                    : "Putar Pelafalan Kata Kunci"
                }
              >
                {playingAudioId === term.id ? (
                  <Square className="h-2.5 w-2.5 fill-current" />
                ) : (
                  <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Save Key Term Translation Button */}
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={saveTermTranslation}
            disabled={isSaving || isSavingAudio || isRecordingModalOpen}
            className="h-8 font-semibold text-xs gap-1 px-3 border border-border"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan Kata Kunci
          </Button>
        </div>
      </div>

      {isRecordingModalOpen && (
        <LineRecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => setIsRecordingModalOpen(false)}
          onSave={handleSaveRecordingBlob}
          durationMs={3000}
          audioSettings={audioSettings}
        />
      )}
    </div>
  );
}
