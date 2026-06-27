export interface KeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  translation?: {
    id: string;
    translated_text: string | null;
    recorded_audio_url: string | null;
  } | null;
}

export interface Loop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  script_text_1?: string | null;
  script_text_2?: string | null;
  script_text_3?: string | null;
  script_text_4?: string | null;
  key_terms: KeyTerm[];
}

export interface Template {
  id: string;
  video_url: string | null;
  audio_url: string | null;
  audio_sources?: Array<{ name: string; url: string; script_text: string | null }> | null;
  mne_audio_url?: string | null;
}

export interface Project {
  id: string;
  name: string;
  template_id: string;
  templates: Template;
}

export interface WorkspaceClientProps {
  project: Project;
  loop: Loop;
  existingRecordingUrl: string | null;
  isModal?: boolean;
  onClose?: () => void;
}
