"use client";

import type {
  AudioEditorStateOptions,
  AudioEditorState,
} from "./useAudioEditorState.types";
import { useAudioEditorReference } from "./useAudioEditorReference";
import { useAudioEditorRecording } from "./useAudioEditorRecording";
import { useAudioEditorEdits } from "./useAudioEditorEdits";

/**
 * The main orchestrator hook for AudioEditor.
 * Composes reference audio state, user recording state, and audio editing operations.
 */
export function useAudioEditorState({
  projectId,
  loopId,
  loopBoundary,
  projectTemplate,
  existingRecordingUrl,
  audioSettings,
}: AudioEditorStateOptions): AudioEditorState {
  // 1. Reference Audio Hook
  const ref = useAudioEditorReference({
    projectTemplate,
    loopBoundary,
  });

  // 2. Recording Audio Hook (passes ref.refWavesurfer to handle pause during recording)
  const rec = useAudioEditorRecording({
    projectId,
    loopId,
    loopBoundary,
    existingRecordingUrl,
    audioSettings,
    refWavesurfer: ref.refWavesurfer,
  });

  // 3. Audio Edit Actions Hook
  const edits = useAudioEditorEdits({
    projectId,
    loopId,
    recWavesurfer: rec.recWavesurfer,
    selectedRegion: rec.selectedRegion,
    setSelectedRegion: rec.setSelectedRegion,
    recRegionsPlugin: rec.recRegionsPlugin,
    setRecordedBlob: rec.setRecordedBlob,
    setRecordedUrl: rec.setRecordedUrl,
    recordedUrl: rec.recordedUrl,
  });

  // 4. Combine all states and actions for the component consumption
  return {
    // Refs
    refContainerRef: ref.refContainerRef,
    recContainerRef: rec.recContainerRef,

    // Reference State & Actions
    audioSources: ref.audioSources,
    activeTabIdx: ref.activeTabIdx,
    isRefPlaying: ref.isRefPlaying,
    isRefAudioLoaded: ref.isRefAudioLoaded,
    isRefAudioSliced: ref.isRefAudioSliced,
    handleTabChange: ref.handleTabChange,
    toggleRefPlay: ref.toggleRefPlay,
    stopRefPlay: ref.stopRefPlay,

    // Recording State & Actions
    isRecording: rec.isRecording,
    isPaused: rec.isPaused,
    isRecPlaying: rec.isRecPlaying,
    recordedBlob: rec.recordedBlob,
    recordedUrl: rec.recordedUrl,
    selectedRegion: rec.selectedRegion,
    recCursorTime: rec.recCursorTime,
    recordedDuration: rec.recordedDuration,
    recordingTimeMs: rec.recordingTimeMs,
    recordingProgressTimeMs: rec.recordingProgressTimeMs,
    activeLoopDurationMs: rec.activeLoopDurationMs,
    startRecording: rec.startRecording,
    stopRecording: rec.stopRecording,
    pauseRecording: rec.pauseRecording,
    resumeRecording: rec.resumeRecording,
    toggleRecPlay: rec.toggleRecPlay,
    stopRecPlay: rec.stopRecPlay,
    handleDiscardRecording: rec.handleDiscardRecording,

    // Edit Actions
    handleTrim: edits.handleTrim,
    handleMuteSelection: edits.handleMuteSelection,
    handleDeleteSelection: edits.handleDeleteSelection,
    handleClearSelection: edits.handleClearSelection,
    handleNormalize: edits.handleNormalize,
  };
}
