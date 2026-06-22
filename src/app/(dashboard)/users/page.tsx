import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UsersClient, UserRecord } from "./UsersClient";

export default async function UsersPage() {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get current user role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle(); // Use maybeSingle to prevent exceptions if no row is returned

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    // Only admin can access user management
    redirect("/dashboard");
  }

  // Fetch all users
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  return <UsersClient initialUsers={(users || []) as unknown as UserRecord[]} currentUserId={user.id} />;
}
