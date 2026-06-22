import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EditSceneClient } from "./EditSceneClient";

interface PageProps {
  params: Promise<{ templateId: string; sceneId: string }>;
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

  // Fetch scene details
  const { data: scene } = await supabase
    .from("template_scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("template_id", templateId)
    .maybeSingle();

  if (!scene) {
    redirect(`/templates/${templateId}`);
  }

  return <EditSceneClient scene={scene} templateId={templateId} />;
}
