export interface KeyTermDB {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  category: string | null;
  created_at: string;
}

export interface CategoryDB {
  id: string;
  name: string;
}

export interface LoopKeyTermDB {
  key_term_id: string;
  template_loop_id: string;
}

export interface TemplateDB {
  id: string;
  name: string;
}

export interface SceneDB {
  id: string;
  name: string;
  template_id: string;
  sequence_number: number;
}

export interface LoopDB {
  id: string;
  name: string;
  sequence_number: number;
  scene_id: string;
}

export interface TranslationData {
  id?: string;
  translated_text?: string;
  key_term_audio_url?: string;
  key_term_bt_audio_url?: string;
  back_translation?: string;
  notes?: string;
}

export interface TermItem {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
  category: string | null;
}

export interface OccurrenceItem {
  id: string;
  name: string;
  scriptText: string;
  isReal: boolean;
  audioUrl?: string | null;
  startTimeMs: number;
  lips: string;
  avatar: string;
  loop?: {
    script_text_1?: string | null;
    script_text_2?: string | null;
    script_text_3?: string | null;
    script_text_4?: string | null;
  };
}

export interface CategoryItem {
  name: string;
  terms: TermItem[];
}

