import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProjectClient, Scene, Project, KeyTerm } from "./ProjectClient";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

interface RawRecording {
  id: string;
  template_loop_id: string;
  recorded_audio_url: string;
  status: "pending" | "recorded" | "approved";
  translated_text: string | null;
  created_at: string;
  recorded_by_user: { username: string } | null;
}

interface RawKeyTerm {
  id: string;
  term: string;
  original_word: string | null;
}

interface RawLoopKeyTerm {
  key_terms: RawKeyTerm | null;
}

interface RawTemplateLoop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  script_text_1: string | null;
  script_text_2: string | null;
  script_text_3: string | null;
  script_text_4: string | null;
  loop_key_terms: RawLoopKeyTerm[] | null;
}

interface RawScene {
  id: string;
  name: string;
  sequence_number: number;
  template_loops: RawTemplateLoop[] | null;
}

type TemplateJoin = {
  name: string;
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

export default async function ProjectDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { projectId } = resolvedParams;
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

  // Check assignment if user is not admin
  if (!isAdmin) {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!assignment) {
      // User is not assigned to this project
      redirect("/dashboard");
    }
  }

  // Fetch project details
  const { data: rawProject } = await supabase
    .from("projects")
    .select(
      "id, name, description, template_id, templates(name, video_url, audio_url_1, audio_label_1, audio_url_2, audio_label_2, audio_url_3, audio_label_3, audio_url_4, audio_label_4, mne_audio_url)",
    )
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
  const audio_sources: Array<{ name: string; url: string }> = [];
  if (t) {
    if (t.audio_url_1) {
      audio_sources.push({ name: t.audio_label_1 || "TB", url: t.audio_url_1 });
    }
    if (t.audio_url_2) {
      audio_sources.push({
        name: t.audio_label_2 || "BIMK",
        url: t.audio_url_2,
      });
    }
    if (t.audio_url_3) {
      audio_sources.push({
        name: t.audio_label_3 || "Audio 3",
        url: t.audio_url_3,
      });
    }
    if (t.audio_url_4) {
      audio_sources.push({
        name: t.audio_label_4 || "Audio 4",
        url: t.audio_url_4,
      });
    }
  }

  const project = {
    ...rawProject,
    templates: t
      ? {
          name: t.name,
          video_url: t.video_url,
          audio_url: t.audio_url_1 || null,
          audio_sources,
          mne_audio_url: t.mne_audio_url || null,
        }
      : null,
  };

  // Fetch all recordings for this project
  const { data: recordings } = await supabase
    .from("recordings")
    .select(
      "id, template_loop_id, recorded_audio_url, status, translated_text, created_at, recorded_by_user:users(username)",
    )
    .eq("project_id", projectId);

  // Fetch scenes, loops and key terms for the linked template
  const { data: rawScenes } = await supabase
    .from("template_scenes")
    .select(
      `
      id,
      name,
      sequence_number,
      template_loops (
        id,
        name,
        sequence_number,
        start_time_ms,
        end_time_ms,
        script_text_1,
        script_text_2,
        script_text_3,
        script_text_4,
        loop_key_terms (
          key_terms (
            id,
            term,
            original_word
          )
        )
      )
    `,
    )
    .eq("template_id", project.template_id);

  // Merge loops and recordings in JS
  const formattedScenes: Scene[] = (
    (rawScenes as unknown as RawScene[]) || []
  ).map((scene: RawScene) => ({
    id: scene.id,
    name: scene.name,
    sequence_number: scene.sequence_number,
    loops: (scene.template_loops || []).map((loop: RawTemplateLoop) => {
      const rec = ((recordings as unknown as RawRecording[]) || []).find(
        (r) => r.template_loop_id === loop.id,
      );
      return {
        id: loop.id,
        name: loop.name,
        sequence_number: loop.sequence_number,
        start_time_ms: loop.start_time_ms,
        end_time_ms: loop.end_time_ms,
        script_text_1: loop.script_text_1,
        script_text_2: loop.script_text_2,
        script_text_3: loop.script_text_3,
        script_text_4: loop.script_text_4,
        key_terms: (loop.loop_key_terms || [])
          .map((lkt: RawLoopKeyTerm) => lkt.key_terms)
          .filter(Boolean) as unknown as KeyTerm[],
        recording: rec
          ? {
              id: rec.id,
              recorded_audio_url: rec.recorded_audio_url,
              status: rec.status,
              translated_text: rec.translated_text,
              recorded_by_user: rec.recorded_by_user,
              created_at: rec.created_at,
            }
          : null,
      };
    }),
  }));

  return (
    <ProjectClient
      project={project as unknown as Project}
      scenes={formattedScenes}
      isAdmin={isAdmin}
    />
  );
}
