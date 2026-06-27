import { Region } from "wavesurfer.js/dist/plugins/regions.js";
import type { AudioSettings } from "./useAudioSettings";

// ─── Types shared with WorkspaceClient ───────────────────────────────────────
export interface AudioSource {
  url: string;
  name: string;
  script_text?: string | null;
}

export interface LoopBoundary {
  start_time_ms: number;
  end_time_ms: number;
}

export interface ProjectTemplate {
  audio_url: string | null;
  audio_sources?: AudioSource[];
}

export interface AudioEditorStateOptions {
  projectId: string;
  loopId: string;
  loopBoundary: LoopBoundary;
  projectTemplate: ProjectTemplate;
  existingRecordingUrl: string | null;
  audioSettings: AudioSettings;
}

export interface AudioEditorState {
  // Container refs (attach to waveform container divs)
  refContainerRef: React.RefObject<HTMLDivElement | null>;
  recContainerRef: React.RefObject<HTMLDivElement | null>;

  // Reference audio state
  audioSources: AudioSource[];
  activeTabIdx: number;
  isRefPlaying: boolean;
  isRefAudioLoaded: boolean;
  isRefAudioSliced: boolean;
  handleTabChange: (idx: number) => void;
  toggleRefPlay: () => void;
  stopRefPlay: () => void;

  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  isRecPlaying: boolean;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  selectedRegion: Region | null;
  recCursorTime: number;
  recordedDuration: number;
  actualRecordedDuration: number;
  recordingTimeMs: number;
  recordingProgressTimeMs: number;
  activeLoopDurationMs: number;

  // Recording actions
  setRecordedBlob: (blob: Blob | null) => void;
  setRecordedUrl: (url: string | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  toggleRecPlay: () => void;
  stopRecPlay: () => void;

  // Audio edit actions
  handleTrim: () => Promise<void>;
  handleMuteSelection: () => Promise<void>;
  handleDeleteSelection: () => Promise<void>;
  handleClearSelection: () => void;
  handleNormalize: () => Promise<void>;
  handleDiscardRecording: () => Promise<void>;
}
