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
