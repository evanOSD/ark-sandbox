import { useState } from "react";
import { Mic, Square, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WavRecorder } from "@/lib/wav-recorder";
import { saveKeyTermTranslation } from "../../actions";
import { KeyTerm } from "../WorkspaceClient";
import { renderFormattedText } from "@/utils/text-formatting";

interface KeyTermCardProps {
  term: KeyTerm;
  projectId: string;
}

export function KeyTermCard({ term, projectId }: KeyTermCardProps) {
  // Local state for this specific key term translation
  const [text, setText] = useState(term.translation?.translated_text || "");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(
    term.translation?.recorded_audio_url || null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Key Term Audio Recording Handlers
  const startTermRecording = async () => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setRecorderInstance(recorder);
      setIsRecording(true);
      setBlob(null);
    } catch (err) {
      alert(
        "Gagal mengakses mikrofon: " +
          (err instanceof Error ? err.message : err),
      );
    }
  };

  const stopTermRecording = () => {
    if (!recorderInstance) return;
    const recordedBlob = recorderInstance.stop();
    setBlob(recordedBlob);
    setUrl(URL.createObjectURL(recordedBlob));
    setIsRecording(false);
    setRecorderInstance(null);
  };

  const saveTermTranslation = async () => {
    setIsSaving(true);
    try {
      const file = blob
        ? new File([blob], `term-${term.id}.wav`, { type: "audio/wav" })
        : null;

      await saveKeyTermTranslation(projectId, term.id, text, file);
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
            {isRecording ? (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-3 font-semibold text-xs gap-1"
                onClick={stopTermRecording}
              >
                <Square className="w-3.5 h-3.5 fill-white" /> Stop
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 font-semibold text-xs gap-1 border-primary/20 hover:border-primary/40 text-primary bg-primary/5"
                onClick={startTermRecording}
              >
                <Mic className="w-3.5 h-3.5" /> Rekam Pelafalan
              </Button>
            )}

            {url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const audio = new Audio(url);
                  audio.play();
                }}
              >
                Putar Pelafalan
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
            disabled={isSaving || isRecording}
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
    </div>
  );
}
