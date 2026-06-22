import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CreateProjectClient, ProjectTemplate, ProjectUser } from "./CreateProjectClient";

export default async function CreateProjectPage() {
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

  // Fetch active templates
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, description")
    .order("created_at", { ascending: false });

  // Fetch users
  const { data: users } = await supabase
    .from("users")
    .select("id, username, email, role")
    .order("username", { ascending: true });

  return (
    <CreateProjectClient
      templates={(templates || []) as ProjectTemplate[]}
      users={(users || []) as ProjectUser[]}
    />
  );
}
