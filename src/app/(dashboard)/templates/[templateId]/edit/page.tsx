import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EditTemplateClient } from "./EditTemplateClient";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
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

  return <EditTemplateClient template={formattedTemplate} />;
}
