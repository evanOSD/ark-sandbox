"use client";

import { useMemo, useEffect } from "react";
import { BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Project, Loop } from "../WorkspaceClient";
import { AudioSourceTabs } from "./audio-editor/AudioSourceTabs";
import { AudioSettingsPopover } from "./audio-editor/AudioSettingsPopover";
import { ScriptDisplay } from "./audio-editor/ScriptDisplay";
import { ReferenceWaveform } from "./audio-editor/ReferenceWaveform";
import { RecordingWaveform } from "./audio-editor/RecordingWaveform";
import { RecordingControls } from "./audio-editor/RecordingControls";
import { UnsavedBanner } from "./audio-editor/UnsavedBanner";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { useAudioEditorState } from "@/hooks/useAudioEditorState";

interface AudioEditorProps {
  project: Project;
  loop: Loop;
  existingRecordingUrl: string | null;
  isKeyTermsOpen: boolean;
  onToggleKeyTerms: () => void;
  isLogsOpen: boolean;
  onToggleLogs: () => void;
  onRefAudioStatusChange?: (
    loaded: boolean,
    sliced: boolean,
    hasUnsaved: boolean,
    recordedUrl: string | null
  ) => void;
  onUploadStatusChange?: (step: string) => void;
}

export default function AudioEditor({
  project,
  loop,
  existingRecordingUrl,
  isKeyTermsOpen,
  onToggleKeyTerms,
  isLogsOpen,
  onToggleLogs,
  onRefAudioStatusChange,
  onUploadStatusChange,
}: AudioEditorProps) {
  // ── Hooks ──────────────────────────────────────────────────────────────────
  const audioSettings = useAudioSettings();

  const { isUploading, uploadStep, handleUploadRecording } = useCloudinaryUpload({
    projectId: project.id,
    loopId: loop.id,
  });

  const editor = useAudioEditorState({
    projectId: project.id,
    loopId: loop.id,
    loopBoundary: {
      start_time_ms: loop.start_time_ms,
      end_time_ms: loop.end_time_ms,
    },
    projectTemplate: {
      audio_url: project.templates.audio_url,
      audio_sources: project.templates.audio_sources ?? undefined,
    },
    existingRecordingUrl,
    audioSettings,
  });

  useEffect(() => {
    onRefAudioStatusChange?.(
      editor.isRefAudioLoaded,
      editor.isRefAudioSliced,
      editor.recordedBlob !== null,
      editor.recordedUrl
    );
  }, [
    editor.isRefAudioLoaded,
    editor.isRefAudioSliced,
    editor.recordedBlob,
    editor.recordedUrl,
    onRefAudioStatusChange,
  ]);

  useEffect(() => {
    onUploadStatusChange?.(uploadStep);
  }, [uploadStep, onUploadStatusChange]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isUnsavedLocal = editor.recordedBlob !== null;
  const loopDurationMs = loop.end_time_ms - loop.start_time_ms;

  const audioSources = useMemo(
    () => project.templates.audio_sources || [],
    [project.templates.audio_sources],
  );
  const currentScriptText =
    audioSources[editor.activeTabIdx]?.script_text || "";

  return (
    <div className="w-full h-full bg-background flex flex-col relative overflow-hidden text-foreground">
      {editor.isRecording && (
        <div className="absolute inset-0 bg-red-500/5 border border-red-500/10 animate-pulse pointer-events-none z-10" />
      )}

      {/* ── Top bar: source tabs + action buttons ── */}
      <div className="border-b border-border p-2 flex flex-row items-center justify-between shrink-0 bg-muted/10">
        <AudioSourceTabs
          audioSources={editor.audioSources}
          activeTabIdx={editor.activeTabIdx}
          onTabChange={editor.handleTabChange}
        />

        {isUnsavedLocal && <UnsavedBanner />}

        <div className="flex items-center gap-2">
          <Button
            variant={isKeyTermsOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleKeyTerms}
            className={`w-fit cursor-pointer h-8 text-xs font-semibold m-0 transition-colors ${
              isKeyTermsOpen
                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                : "text-foreground"
            }`}
          >
            <BookOpen
              className={`w-3.5 h-3.5 mr-1.5 ${
                isKeyTermsOpen ? "text-white" : "text-indigo-500"
              }`}
            />{" "}
            Kamus Kata Kunci
          </Button>
          <AudioSettingsPopover
            isRecording={editor.isRecording}
            noiseSuppression={audioSettings.noiseSuppression}
            autoGainControl={audioSettings.autoGainControl}
            echoCancellation={audioSettings.echoCancellation}
            onToggleNoiseSuppression={audioSettings.toggleNoiseSuppression}
            onToggleAutoGainControl={audioSettings.toggleAutoGainControl}
            onToggleEchoCancellation={audioSettings.toggleEchoCancellation}
          />
          <Button
            variant={isLogsOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleLogs}
            className={`w-fit cursor-pointer h-8 text-xs font-semibold m-0 transition-colors ${
              isLogsOpen
                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                : "text-foreground"
            }`}
          >
            <FileText
              className={`w-3.5 h-3.5 mr-1.5 ${
                isLogsOpen ? "text-white" : "text-indigo-500"
              }`}
            />{" "}
            Logs
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border space-y-1 bg-muted/5 shrink-0">
          {/* Script + reference audio controls */}
          <ScriptDisplay
            scriptText={currentScriptText}
            sourceName={audioSources[editor.activeTabIdx]?.name || "Default"}
          />

          {/* Waveforms */}
          <div className="space-y-2">
            <ReferenceWaveform
              containerRef={editor.refContainerRef}
              durationMs={loopDurationMs}
              isRefPlaying={editor.isRefPlaying}
              onToggleRefPlay={editor.toggleRefPlay}
              onStopRefPlay={editor.stopRefPlay}
            />
            <div className="border-t border-border mx-4" />
            <RecordingWaveform
              containerRef={editor.recContainerRef}
              isRecording={editor.isRecording}
              recordingTimeMs={editor.recordingTimeMs}
              recCursorTime={editor.recCursorTime}
              loopDurationMs={loopDurationMs}
            />

            {/* Edit + record controls */}
            <RecordingControls
              recordedUrl={editor.recordedUrl}
              isRecPlaying={editor.isRecPlaying}
              onToggleRecPlay={editor.toggleRecPlay}
              onStopRecPlay={editor.stopRecPlay}
              selectedRegion={editor.selectedRegion}
              onTrim={editor.handleTrim}
              onMuteSelection={editor.handleMuteSelection}
              onDeleteSelection={editor.handleDeleteSelection}
              onNormalize={editor.handleNormalize}
              onClearSelection={editor.handleClearSelection}
              onDiscardRecording={editor.handleDiscardRecording}
              isRecording={editor.isRecording}
              isPaused={editor.isPaused}
              recordingTimeMs={editor.recordingProgressTimeMs}
              loopDurationMs={editor.activeLoopDurationMs}
              isUploading={isUploading}
              recordedDuration={editor.recordedDuration}
              onStartRecording={editor.startRecording}
              onPauseRecording={editor.pauseRecording}
              onResumeRecording={editor.resumeRecording}
              onStopRecording={editor.stopRecording}
              onUploadRecording={() =>
                handleUploadRecording(editor.recordedBlob)
              }
            />
          </div>
        </div>

        {/* Footer area */}
        <div className="p-5 space-y-2 flex-1 overflow-y-auto"></div>
      </div>
    </div>
  );
}
