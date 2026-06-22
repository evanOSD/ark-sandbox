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
    .select("*")
    .order("created_at", { ascending: false });

  const templatesData: Template[] = (templates || []).map((t) => ({
    ...t,
    audio_url: t.audio_url_1 || null,
  }));

  return (
    <TemplatesClient
      initialTemplates={templatesData}
      isAdmin={isAdmin}
    />
  );
}
