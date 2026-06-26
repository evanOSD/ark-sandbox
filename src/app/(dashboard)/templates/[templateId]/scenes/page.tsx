import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ManageScenesClient } from "./ManageScenesClient";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function ManageScenesPage({ params }: PageProps) {
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

  // Fetch template info
  const { data: template } = await supabase
    .from("templates")
    .select("id, name")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    redirect("/templates");
  }

  // Fetch scenes with their loops count
  const { data: scenes } = await supabase
    .from("template_scenes")
    .select(
      `
      id,
      name,
      sequence_number,
      template_loops (id)
    `,
    )
    .eq("template_id", templateId)
    .order("sequence_number", { ascending: true });

  const formattedScenes = (scenes || []).map((s) => ({
    id: s.id,
    name: s.name,
    sequence_number: s.sequence_number,
    loopCount: s.template_loops?.length || 0,
  }));

  return (
    <ManageScenesClient
      key={JSON.stringify(formattedScenes)}
      templateId={templateId}
      templateName={template.name}
      initialScenes={formattedScenes}
    />
  );
}
