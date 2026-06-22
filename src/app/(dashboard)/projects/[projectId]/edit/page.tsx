import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EditProjectClient, ProjectUser } from "./EditProjectClient";

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
    .select("id, name, description, template_id, templates(name)")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    redirect("/projects");
  }

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
      project={project as unknown as {
        id: string;
        name: string;
        description: string | null;
        template_id: string;
        templates: { name: string } | null;
      }}
      users={(users || []) as ProjectUser[]}
      initialAssignedUserIds={assignedUserIds}
    />
  );
}
