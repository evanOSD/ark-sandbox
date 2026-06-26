import { useState, useEffect } from "react";
import { Mic, Square, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WavRecorder } from "@/lib/wav-recorder";
import { saveRecording } from "../../actions";
import {
  saveLocalRecording,
  getLocalRecording,
  clearLocalRecording,
} from "@/lib/indexeddb";

interface VoiceRecorderProps {
  projectId: string;
  loopId: string;
  existingRecordingUrl: string | null;
  onRecordStart?: () => void;
}

export function VoiceRecorder({
  projectId,
  loopId,
  existingRecordingUrl,
  onRecordStart,
}: VoiceRecorderProps) {
  // Main Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(
    existingRecordingUrl,
  );
  const [recorderInstance, setRecorderInstance] = useState<WavRecorder | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Load temp recording from IndexedDB on mount
  useEffect(() => {
    async function loadTempRecording() {
      const tempBlob = await getLocalRecording(projectId, loopId);
      if (tempBlob) {
        setRecordedBlob(tempBlob);
        setRecordedUrl(URL.createObjectURL(tempBlob));
      }
    }
    loadTempRecording();
  }, [projectId, loopId]);

  // Start Main Loop Recording
  const startMainRecording = async () => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      setRecorderInstance(recorder);
      setIsRecording(true);
      setRecordedBlob(null);

      // Trigger callback to pause playback
      if (onRecordStart) {
        onRecordStart();
      }
    } catch (err) {
      alert(
        "Gagal mengakses mikrofon: " +
          (err instanceof Error ? err.message : err),
      );
    }
  };

  // Stop Main Loop Recording
  const stopMainRecording = async () => {
    if (!recorderInstance) return;
    const blob = recorderInstance.stop();
    setRecordedBlob(blob);
    setRecordedUrl(URL.createObjectURL(blob));
    setIsRecording(false);
    setRecorderInstance(null);

    // Save to IndexedDB locally
    await saveLocalRecording(projectId, loopId, blob);
  };

  // Submit main audio recording
  const handleSubmitRecording = async () => {
    if (!recordedBlob) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append(
        "audio",
        new File([recordedBlob], "recording.wav", { type: "audio/wav" }),
      );
      await saveRecording(projectId, loopId, formData);

      // Clear from IndexedDB on successful upload
      await clearLocalRecording(projectId, loopId);

      alert("Rekaman berhasil dikirim!");
    } catch (err) {
      alert(
        "Gagal menyimpan rekaman: " +
          (err instanceof Error ? err.message : err),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isUnsavedLocal = recordedBlob !== null;

  return (
    <Card className="border-primary/20 shadow-lg relative overflow-hidden">
      {/* Background highlights */}
      {isRecording && (
        <div className="absolute inset-0 bg-red-500/5 border border-red-500/20 animate-pulse pointer-events-none" />
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" /> Perekam Terjemahan Suara
        </CardTitle>
        <CardDescription>
          Rekam suara terjemahan lisan Anda untuk putaran ini. Format keluaran
          PCM WAV 16-bit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unsaved local recording warning */}
        {isUnsavedLocal && (
          <div className="bg-amber-500/10 text-amber-500 text-xs px-3 py-2 rounded-lg border border-amber-500/20 text-center font-medium animate-pulse">
            Ada rekaman belum terkirim yang tersimpan di browser Anda.
          </div>
        )}

        {/* Voice waveform/indicator placeholder */}
        <div className="border rounded-xl p-8 bg-muted/30 flex flex-col items-center justify-center relative min-h-[140px] text-center border-dashed">
          {isRecording ? (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-red-500 text-foreground rounded-full flex items-center justify-center animate-ping mx-auto duration-1000">
                <Mic className="w-6 h-6" />
              </div>
              <div className="font-semibold text-red-500 text-sm animate-pulse">
                Sedang Merekam Suara...
              </div>
              <div className="text-xs text-muted-foreground">
                Bicaralah dengan jelas dekat mikrofon Anda
              </div>
            </div>
          ) : recordedUrl ? (
            <div className="space-y-3 w-full">
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full border border-green-500/20">
                Hasil Rekaman Tersedia
              </span>
              <audio src={recordedUrl} controls className="w-full mx-auto" />
              {recordedBlob && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Ukuran File: {(recordedBlob.size / 1024).toFixed(1)} KB |
                  Format: WAV (PCM)
                </p>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground space-y-1">
              <Mic className="w-8 h-8 mx-auto stroke-[1.2] mb-1 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Siap Merekam
              </p>
              <p className="text-xs">
                Klik tombol &quot;Mulai Rekam&quot; di bawah
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t bg-muted/10 p-4">
        {isRecording ? (
          <Button
            variant="destructive"
            className="w-full font-semibold gap-2 h-10 shadow-sm"
            onClick={stopMainRecording}
          >
            <Square className="w-4 h-4 fill-white" /> Selesai Perekaman
          </Button>
        ) : (
          <Button
            className="w-full font-semibold gap-2 h-10 bg-red-600 hover:bg-red-700 text-foreground shadow-sm"
            onClick={startMainRecording}
          >
            <Mic className="w-4 h-4" /> Mulai Rekam
          </Button>
        )}

        {recordedBlob && (
          <div className="flex gap-2 w-full">
            <Button
              className="w-full font-semibold gap-2 h-10"
              onClick={handleSubmitRecording}
              disabled={isSaving || isRecording}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Simpan Rekaman
            </Button>
            <Button
              variant="outline"
              className="w-full font-semibold gap-2 h-10"
              onClick={async () => {
                if (confirm("Buang rekaman sementara ini?")) {
                  await clearLocalRecording(projectId, loopId);
                  setRecordedBlob(null);
                  setRecordedUrl(existingRecordingUrl);
                }
              }}
              disabled={isSaving || isRecording}
            >
              Buang
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
