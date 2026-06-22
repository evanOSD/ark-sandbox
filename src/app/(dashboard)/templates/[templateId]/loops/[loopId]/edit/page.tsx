import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { formatMsToTimecode } from "@/lib/timecode";
import { EditLoopClient } from "./EditLoopClient";

interface PageProps {
  params: Promise<{ templateId: string; loopId: string }>;
}

export default async function EditLoopPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { templateId, loopId } = resolvedParams;
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

  // Fetch loop details
  const { data: loop } = await supabase
    .from("template_loops")
    .select("id, name, sequence_number, start_time_ms, end_time_ms")
    .eq("id", loopId)
    .maybeSingle();

  if (!loop) {
    redirect(`/templates/${templateId}`);
  }

  const loopFormatted = {
    id: loop.id,
    name: loop.name,
    sequence_number: loop.sequence_number,
    startTimecode: formatMsToTimecode(loop.start_time_ms),
    endTimecode: formatMsToTimecode(loop.end_time_ms),
  };

  return <EditLoopClient loop={loopFormatted} templateId={templateId} />;
}
