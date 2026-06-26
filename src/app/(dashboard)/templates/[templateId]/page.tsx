import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TemplateClient, Scene, KeyTerm } from "./TemplateClient";

interface PageProps {
  params: Promise<{ templateId: string }>;
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

interface RawTemplateLoop {
  id: string;
  name: string;
  sequence_number: number;
  start_time_ms: number;
  end_time_ms: number;
  loop_key_terms: RawLoopKeyTerm[] | null;
}

interface RawScene {
  id: string;
  name: string;
  sequence_number: number;
  template_loops: RawTemplateLoop[] | null;
}

export default async function TemplateDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { templateId } = resolvedParams;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Fetch template details
  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    redirect("/templates");
  }

  // Format template to include audio_sources for client compatibility
  const audio_sources: Array<{ name: string; url: string }> = [];
  if (template.audio_url_1) {
    audio_sources.push({ name: template.audio_label_1 || "TB", url: template.audio_url_1 });
  }
  if (template.audio_url_2) {
    audio_sources.push({ name: template.audio_label_2 || "BIMK", url: template.audio_url_2 });
  }
  if (template.audio_url_3) {
    audio_sources.push({ name: template.audio_label_3 || "Audio 3", url: template.audio_url_3 });
  }
  if (template.audio_url_4) {
    audio_sources.push({ name: template.audio_label_4 || "Audio 4", url: template.audio_url_4 });
  }

  const formattedTemplate = {
    ...template,
    audio_url: template.audio_url_1 || null,
    audio_sources,
  };

  // Fetch scenes with loops and key terms
  const { data: rawScenes } = await supabase
    .from("template_scenes")
    .select(`
      id,
      name,
      sequence_number,
      template_loops (
        id,
        name,
        sequence_number,
        start_time_ms,
        end_time_ms,
        loop_key_terms (
          key_terms (
            id,
            term,
            original_word,
            meaning_or_note
          )
        )
      )
    `)
    .eq("template_id", templateId);

  // Map raw data into clean structure
  const formattedScenes: Scene[] = ((rawScenes as unknown as RawScene[]) || []).map((scene: RawScene) => ({
    id: scene.id,
    name: scene.name,
    sequence_number: scene.sequence_number,
    loops: (scene.template_loops || []).map((loop: RawTemplateLoop) => ({
      id: loop.id,
      name: loop.name,
      sequence_number: loop.sequence_number,
      start_time_ms: loop.start_time_ms,
      end_time_ms: loop.end_time_ms,
      key_terms: (loop.loop_key_terms || [])
        .map((lkt: RawLoopKeyTerm) => lkt.key_terms as KeyTerm)
        .filter(Boolean),
    })),
  }));

  // Fetch projects using this template
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("template_id", templateId);

  return (
    <TemplateClient
      template={formattedTemplate}
      scenes={formattedScenes}
      projects={projects || []}
    />
  );
}
