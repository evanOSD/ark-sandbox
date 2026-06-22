import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient, UserProfile } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get current user details
  let { data: dbUser } = await supabase
    .from("users")
    .select("id, username, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";

  if (!dbUser && isEvan) {
    dbUser = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "admin",
      email: user.email || "",
      role: "admin",
    };
  }

  if (!dbUser) {
    redirect("/dashboard");
  }

  return <SettingsClient profile={dbUser as unknown as UserProfile} />;
}
