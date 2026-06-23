import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TemplatesClient, Template } from "./TemplatesClient";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user details
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

  const { data: templates } = await supabase
    .from("templates")
    .select("*, template_scenes(id, template_loops(id))")
    .order("created_at", { ascending: false });

  const templatesData: Template[] = (templates || []).map((t: Record<string, unknown>) => {
    const scenes = (t.template_scenes as Record<string, unknown>[]) || [];
    const total_scenes = scenes.length;
    const total_loops = scenes.reduce((acc: number, scene: Record<string, unknown>) => acc + ((scene.template_loops as unknown[])?.length || 0), 0);
    return {
      ...(t as unknown as Template),
      audio_url: (t as { audio_url_1?: string }).audio_url_1 || null,
      total_scenes,
      total_loops,
    };
  });

  return (
    <TemplatesClient
      initialTemplates={templatesData}
      isAdmin={isAdmin}
    />
  );
}
