import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user details from public.users table
  let { data: dbUser } = await supabase
    .from("users")
    .select("username, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";

  if (!dbUser) {
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "user";
    const email = user.email || "";
    const role = isEvan ? "admin" : "user";

    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        username,
        email,
        role,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("CRITICAL: FAILED TO INSERT USER PROFILE:", insertError);
    } else {
      console.log("SUCCESSFULLY INSERTED USER PROFILE:", email);
    }
    
    dbUser = insertedUser;
  } else if (isEvan && dbUser.role !== "admin") {
    // Force role to admin for evan@osdindonesia.com
    const { data: updatedUser } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", user.id)
      .select()
      .single();
    
    dbUser = updatedUser;
  }

  const role = isEvan ? "admin" : (dbUser?.role || "user");
  const username = dbUser?.username || user.email?.split("@")[0] || "User";

  // Read sidebar state preference from cookies
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value || "expanded";

  return (
    <DashboardLayoutClient role={role} username={username} initialState={sidebarState}>
      {children}
    </DashboardLayoutClient>
  );
}
