import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsClient, Project } from "./ProjectsClient";

interface RawProject {
  id: string;
  name: string;
  description: string | null;
  template_id: string;
  created_at: string;
  templates: { name: string } | { name: string }[] | null;
}

export default async function ProjectsPage() {
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

  let rawProjects: RawProject[] = [];

  if (isAdmin) {
    // Admin fetches everything
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description, template_id, created_at, templates(name)")
      .order("created_at", { ascending: false });

    rawProjects = (projects || []) as unknown as RawProject[];
  } else {
    // Normal translator user only fetches assigned projects
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", user.id);

    const projectIds = assignments?.map((a) => a.project_id) || [];

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, description, template_id, created_at, templates(name)")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      rawProjects = (projects || []) as unknown as RawProject[];
    }
  }

  // Fetch scene, loop, and recording stats for in-memory mapping
  // 1. Fetch scenes
  const { data: allScenes } = await supabase
    .from("template_scenes")
    .select("id, template_id");

  // 2. Fetch loops
  const { data: allLoops } = await supabase
    .from("template_loops")
    .select("id, scene_id");

  // 3. Fetch recordings
  const { data: allRecordings } = await supabase
    .from("recordings")
    .select("id, project_id, template_loop_id");

  // 4. Fetch assignments with users
  const { data: allAssignments } = await supabase
    .from("project_assignments")
    .select("project_id, users(username)");

  // Build assignments mapping
  const assignmentsMap = new Map<string, string[]>();
  const typedAssignments = (allAssignments || []) as unknown as Array<{
    project_id: string;
    users: { username: string } | null;
  }>;

  typedAssignments.forEach((a) => {
    if (!a.project_id) return;
    const username = a.users?.username;
    if (username) {
      const current = assignmentsMap.get(a.project_id) || [];
      current.push(username);
      assignmentsMap.set(a.project_id, current);
    }
  });

  // Build mapping structures
  const sceneToTemplateMap = new Map<string, string>();
  (allScenes || []).forEach((s) => {
    sceneToTemplateMap.set(s.id, s.template_id);
  });

  // Map raw projects into Project props with stats
  const projectsData: Project[] = rawProjects.map((p) => {
    const template = Array.isArray(p.templates)
      ? p.templates[0] || null
      : p.templates || null;

    const projectScenes = (allScenes || []).filter((s) => s.template_id === p.template_id);
    const scenesTotal = projectScenes.length;

    let scenesCompleted = 0;
    projectScenes.forEach((scene) => {
      const sceneLoops = (allLoops || []).filter((l) => l.scene_id === scene.id);
      if (sceneLoops.length === 0) return; // 0 loops scene is not counted as completed

      const allRecorded = sceneLoops.every((loop) =>
        (allRecordings || []).some((r) => r.project_id === p.id && r.template_loop_id === loop.id)
      );

      if (allRecorded) {
        scenesCompleted++;
      }
    });

    const projectLoops = (allLoops || []).filter((l) =>
      projectScenes.some((s) => s.id === l.scene_id)
    );
    const loopsTotal = projectLoops.length;

    const loopsCompleted = projectLoops.filter((loop) =>
      (allRecordings || []).some((r) => r.project_id === p.id && r.template_loop_id === loop.id)
    ).length;

    const assignedUsers = assignmentsMap.get(p.id) || [];

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      template_id: p.template_id,
      created_at: p.created_at,
      templates: template,
      scenesCompleted,
      scenesTotal,
      loopsCompleted,
      loopsTotal,
      assignedUsers,
    };
  });

  return (
    <ProjectsClient
      initialProjects={projectsData}
      isAdmin={isAdmin}
    />
  );
}
