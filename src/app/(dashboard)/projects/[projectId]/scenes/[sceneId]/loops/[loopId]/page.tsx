import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { WorkspaceClient, Project, Loop, KeyTerm } from "./WorkspaceClient";

interface PageProps {
  params: Promise<{
    projectId: string;
    sceneId: string;
    loopId: string;
  }>;
}

interface RawKeyTerm {
  id: string;
  term: string;
  original_word: string | null;
  meaning_or_note: string | null;
}

interface RawLoopKeyTerm {
  key_terms: RawKeyTerm | null;
}

interface RawTranslation {
  key_term_id: string;
  id: string;
  translated_text: string | null;
  recorded_audio_url: string | null;
}

type TemplateJoin = {
  video_url: string | null;
  audio_url_1: string | null;
  audio_label_1: string | null;
  audio_url_2: string | null;
  audio_label_2: string | null;
  audio_url_3: string | null;
  audio_label_3: string | null;
  audio_url_4: string | null;
  audio_label_4: string | null;
  mne_audio_url: string | null;
};

export default async function LoopWorkspacePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { projectId, sceneId, loopId } = resolvedParams;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get current user role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  // Check project assignment if user is not admin
  if (!isAdmin) {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!assignment) {
      redirect("/dashboard");
    }
  }

  // Fetch loop details belonging to this scene first to get script texts
  const { data: loop } = await supabase
    .from("template_loops")
    .select("id, name, sequence_number, start_time_ms, end_time_ms, script_text_1, script_text_2, script_text_3, script_text_4")
    .eq("id", loopId)
    .eq("scene_id", sceneId)
    .maybeSingle();

  if (!loop) {
    redirect(`/projects/${projectId}`);
  }

  // Fetch project & template details
  const { data: rawProject } = await supabase
    .from("projects")
    .select("id, name, template_id, templates(video_url, audio_url_1, audio_label_1, audio_url_2, audio_label_2, audio_url_3, audio_label_3, audio_url_4, audio_label_4, mne_audio_url)")
    .eq("id", projectId)
    .maybeSingle();

  if (!rawProject) {
    redirect("/projects");
  }

  // Supabase joins can return either a single object or an array depending on relationship metadata.
  const templatesRaw = rawProject.templates as unknown as
    | TemplateJoin
    | TemplateJoin[]
    | null;
  const t = Array.isArray(templatesRaw) ? templatesRaw[0] : templatesRaw;
  const audio_sources: Array<{ name: string; url: string; script_text: string | null }> = [];
  if (t) {
    if (t.audio_url_1) {
      audio_sources.push({ name: t.audio_label_1 || "TB", url: t.audio_url_1, script_text: loop.script_text_1 });
    }
    if (t.audio_url_2) {
      audio_sources.push({ name: t.audio_label_2 || "BIMK", url: t.audio_url_2, script_text: loop.script_text_2 });
    }
    if (t.audio_url_3) {
      audio_sources.push({ name: t.audio_label_3 || "Audio 3", url: t.audio_url_3, script_text: loop.script_text_3 });
    }
    if (t.audio_url_4) {
      audio_sources.push({ name: t.audio_label_4 || "Audio 4", url: t.audio_url_4, script_text: loop.script_text_4 });
    }
  }

  const project = {
    ...rawProject,
    templates: t ? {
      video_url: t.video_url,
      audio_url: t.audio_url_1 || null,
      audio_sources,
      mne_audio_url: t.mne_audio_url || null,
    } : null
  };

  // Verify that the scene belongs to this project's template
  const { data: scene } = await supabase
    .from("template_scenes")
    .select("id, template_id")
    .eq("id", sceneId)
    .eq("template_id", project.template_id)
    .maybeSingle();

  if (!scene) {
    redirect(`/projects/${projectId}`);
  }

  // Fetch key terms for this loop
  const { data: loopKeyTerms } = await supabase
    .from("loop_key_terms")
    .select("key_terms(id, term, original_word, meaning_or_note)")
    .eq("template_loop_id", loopId);

  const rawLoopKeyTerms = (loopKeyTerms || []) as unknown as RawLoopKeyTerm[];
  const keyTermIds = rawLoopKeyTerms.map((lkt) => lkt.key_terms?.id).filter(Boolean) as string[];

  // Fetch existing translations for these key terms in this project
  let translations: RawTranslation[] = [];
  if (keyTermIds.length > 0) {
    const { data: transData } = await supabase
      .from("project_key_term_translations")
      .select("key_term_id, id, translated_text, recorded_audio_url")
      .eq("project_id", projectId)
      .in("key_term_id", keyTermIds);
    translations = (transData || []) as unknown as RawTranslation[];
  }

  // Map key terms together with their translations
  const formattedKeyTerms = rawLoopKeyTerms
    .map((lkt) => {
      const term = lkt.key_terms;
      if (!term) return null;

      const trans = translations.find((t) => t.key_term_id === term.id);
      return {
        id: term.id,
        term: term.term,
        original_word: term.original_word,
        meaning_or_note: term.meaning_or_note,
        translation: trans
          ? {
              id: trans.id,
              translated_text: trans.translated_text,
              recorded_audio_url: trans.recorded_audio_url,
            }
          : null,
      };
    })
    .filter(Boolean);

  // Fetch existing main recording for this loop in this project
  const { data: recording } = await supabase
    .from("recordings")
    .select("recorded_audio_url, translated_text")
    .eq("project_id", projectId)
    .eq("template_loop_id", loopId)
    .maybeSingle();

  const formattedLoop = {
    id: loop.id,
    name: loop.name,
    sequence_number: loop.sequence_number,
    start_time_ms: loop.start_time_ms,
    end_time_ms: loop.end_time_ms,
    script_text_1: loop.script_text_1,
    script_text_2: loop.script_text_2,
    script_text_3: loop.script_text_3,
    script_text_4: loop.script_text_4,
    key_terms: formattedKeyTerms as unknown as KeyTerm[],
  };

  return (
    <WorkspaceClient
      project={project as unknown as Project}
      loop={formattedLoop as unknown as Loop}
      existingRecordingUrl={recording?.recorded_audio_url || null}
    />
  );
}
