import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EditSceneClient } from "./EditSceneClient";

interface PageProps {
  params: Promise<{ templateId: string; sceneId: string }>;
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

export default async function EditScenePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { templateId, sceneId } = resolvedParams;
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

  // Fetch scene details with loops and key terms
  const { data: rawScene } = await supabase
    .from("template_scenes")
    .select(`
      id,
      name,
      sequence_number,
      template_id,
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
    .eq("id", sceneId)
    .eq("template_id", templateId)
    .maybeSingle();

  if (!rawScene) {
    redirect(`/templates/${templateId}`);
  }

  const typedRawScene = rawScene as unknown as RawScene;

  // Format nested data for client
  const formattedLoops = (typedRawScene.template_loops || []).map((loop) => ({
    id: loop.id,
    name: loop.name,
    sequence_number: loop.sequence_number,
    start_time_ms: loop.start_time_ms,
    end_time_ms: loop.end_time_ms,
    key_terms: (loop.loop_key_terms || [])
      .map((lkt) => lkt.key_terms)
      .filter(Boolean) as RawKeyTerm[],
  }));

  const formattedScene = {
    id: typedRawScene.id,
    name: typedRawScene.name,
    sequence_number: typedRawScene.sequence_number,
    loops: formattedLoops,
  };

  return <EditSceneClient scene={formattedScene} templateId={templateId} />;
}
