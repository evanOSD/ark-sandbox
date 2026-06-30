import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EditProjectClient, ProjectUser, ProjectTemplate } from "./EditProjectClient";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
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

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, template_id, templates(name, audio_label_1, audio_label_2, audio_label_3, audio_label_4)")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    redirect("/projects");
  }

  // Safely fetch show_text_script and allowed_scripts from projects
  let showTextScript = false;
  let allowedScripts = "";
  try {
    const { data: dbProjSetting } = await supabase
      .from("projects")
      .select("show_text_script, allowed_scripts")
      .eq("id", projectId)
      .maybeSingle();

    if (dbProjSetting) {
      if (dbProjSetting.show_text_script !== undefined && dbProjSetting.show_text_script !== null) {
        showTextScript = !!dbProjSetting.show_text_script;
      }
      if (dbProjSetting.allowed_scripts !== undefined && dbProjSetting.allowed_scripts !== null) {
        allowedScripts = String(dbProjSetting.allowed_scripts);
      }
    }
  } catch (err) {
    console.warn("show_text_script or allowed_scripts columns could not be fetched:", err);
  }

  // Get active templates raw join
  const templatesRaw = project.templates as unknown as {
    name: string;
    audio_label_1: string | null;
    audio_label_2: string | null;
    audio_label_3: string | null;
    audio_label_4: string | null;
  } | {
    name: string;
    audio_label_1: string | null;
    audio_label_2: string | null;
    audio_label_3: string | null;
    audio_label_4: string | null;
  }[] | null;
  const t = Array.isArray(templatesRaw) ? templatesRaw[0] : templatesRaw;
  const audioTemplateNames: string[] = [];
  if (t) {
    audioTemplateNames.push(t.audio_label_1 || "TB");
    audioTemplateNames.push(t.audio_label_2 || "BIMK");
    if (t.audio_label_3) audioTemplateNames.push(t.audio_label_3);
    if (t.audio_label_4) audioTemplateNames.push(t.audio_label_4);
  } else {
    audioTemplateNames.push("TB");
    audioTemplateNames.push("BIMK");
  }

  // Fetch all templates
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, description")
    .order("created_at", { ascending: false });

  // Fetch all users
  const { data: users } = await supabase
    .from("users")
    .select("id, username, email, role")
    .order("username", { ascending: true });

  // Fetch assigned user IDs
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId);

  const assignedUserIds = assignments?.map((a) => a.user_id) || [];

  return (
    <EditProjectClient
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        template_id: project.template_id,
        templates: t ? { name: t.name } : null,
        show_text_script: showTextScript,
        allowed_scripts: allowedScripts,
      } as {
        id: string;
        name: string;
        description: string | null;
        template_id: string;
        templates?: { name: string } | null;
        show_text_script?: boolean;
        allowed_scripts?: string;
      }}
      templates={(templates || []) as ProjectTemplate[]}
      users={(users || []) as ProjectUser[]}
      initialAssignedUserIds={assignedUserIds}
      audioTemplateNames={audioTemplateNames}
    />
  );
}
