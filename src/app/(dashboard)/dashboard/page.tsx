import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Folder,
  Film,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  template_id?: string;
  templates: { name: string } | null;
}

interface RawAssignment {
  project_id: string;
  projects: DashboardProject | null;
}

interface RawScene {
  id: string;
  template_loops: { id: string }[] | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user details
  const { data: dbUser } = await supabase
    .from("users")
    .select("username, role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const role = isEvan ? "admin" : dbUser?.role || "user";
  const username = dbUser?.username || user.email?.split("@")[0] || "User";
  const isAdmin = role === "admin";

  let adminStats = {
    usersCount: 0,
    templatesCount: 0,
    projectsCount: 0,
    reviewCount: 0,
  };

  const userStats = {
    assignedProjectsCount: 0,
    totalLoopsCount: 0,
    recordedCount: 0,
    approvedCount: 0,
  };

  let activeProjects: DashboardProject[] = [];

  if (isAdmin) {
    // 1. Admin Queries
    const { count: uCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    const { count: tCount } = await supabase
      .from("templates")
      .select("*", { count: "exact", head: true });
    const { count: pCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });
    const { count: rCount } = await supabase
      .from("recordings")
      .select("*", { count: "exact", head: true })
      .eq("status", "recorded");

    adminStats = {
      usersCount: uCount || 0,
      templatesCount: tCount || 0,
      projectsCount: pCount || 0,
      reviewCount: rCount || 0,
    };

    // Get active projects for admin overview
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description, templates(name)")
      .order("created_at", { ascending: false })
      .limit(3);

    activeProjects = (projects || []) as unknown as DashboardProject[];
  } else {
    // 2. Translator Queries
    // Get assigned projects
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select(
        "project_id, projects(id, name, description, template_id, templates(name))",
      )
      .eq("user_id", user.id);

    const projectsList = ((assignments as unknown as RawAssignment[]) || [])
      .map((a) => a.projects)
      .filter(Boolean) as DashboardProject[];

    activeProjects = projectsList;
    userStats.assignedProjectsCount = projectsList.length;

    // Get loop statistics for assigned projects
    const templateIds = projectsList.map((p) => p.template_id).filter(Boolean);

    if (templateIds.length > 0) {
      // Get all template loops for these templates
      const { data: scenes } = await supabase
        .from("template_scenes")
        .select("id, template_loops(id)")
        .in("template_id", templateIds);

      const loopIds: string[] = [];
      ((scenes as unknown as RawScene[]) || []).forEach((s) => {
        s.template_loops?.forEach((l) => {
          loopIds.push(l.id);
        });
      });

      userStats.totalLoopsCount = loopIds.length;

      if (loopIds.length > 0) {
        // Query user recordings for these loops
        const { data: userRecs } = await supabase
          .from("recordings")
          .select("status")
          .in("template_loop_id", loopIds)
          .eq("recorded_by", user.id);

        userRecs?.forEach((r) => {
          if (r.status === "approved") {
            userStats.approvedCount++;
          } else if (r.status === "recorded") {
            userStats.recordedCount++;
          }
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-xl border border-primary/20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Halo, {username}!
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Selamat datang kembali di{" "}
            <span className="font-semibold text-foreground">
              ARK (Audio Recording Kit)
            </span>
            .
            {isAdmin
              ? " Panel admin Anda siap untuk memantau kemajuan penerjemahan."
              : " Mari lanjutkan merekam hari ini."}
          </p>
        </div>
        <div className="text-xs font-mono uppercase bg-background border px-3.5 py-1.5 rounded-full text-muted-foreground select-none">
          Role Anda: <span className="text-primary font-bold">{role}</span>
        </div>
      </div>

      {/* Grid Stats */}
      {isAdmin ? (
        /* ADMIN STATS GRID */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Pengguna
              </CardTitle>
              <Users className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{adminStats.usersCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Translator terdaftar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Template Master
              </CardTitle>
              <Film className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {adminStats.templatesCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Blueprint media aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Proyek Aktif
              </CardTitle>
              <Folder className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {adminStats.projectsCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Proyek terdistribusi
              </p>
            </CardContent>
          </Card>

          <Card
            className={
              adminStats.reviewCount > 0
                ? "border-amber-500/40 bg-amber-500/5"
                : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Menunggu Review
              </CardTitle>
              <Clock
                className={`h-4.5 w-4.5 ${adminStats.reviewCount > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-black ${adminStats.reviewCount > 0 ? "text-amber-500" : ""}`}
              >
                {adminStats.reviewCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Rekaman perlu disetujui
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* TRANSLATOR STATS GRID */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tugas Proyek
              </CardTitle>
              <Folder className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {userStats.assignedProjectsCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Telah ditugaskan kepada Anda
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Putaran (Loops)
              </CardTitle>
              <Film className="h-4.5 w-4.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {userStats.totalLoopsCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Total segmen dari tugas proyek
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Menunggu Review
              </CardTitle>
              <Clock className="h-4.5 w-4.5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-500">
                {userStats.recordedCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Telah direkam & dikirim
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Telah Disetujui
              </CardTitle>
              <CheckCircle className="h-4.5 w-4.5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-600 dark:text-green-500">
                {userStats.approvedCount}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Lulus verifikasi admin
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Projects List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Daftar Proyek Anda
            </h2>
            <Link href="/projects">
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold text-xs text-primary gap-1"
              >
                Semua Proyek <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {activeProjects.map((p) => (
              <Card
                key={p.id}
                className="hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                    {p.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-primary/70 uppercase tracking-wider">
                    Template: {p.templates?.name || "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.description || "Tidak ada deskripsi proyek."}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t bg-muted/5 flex justify-end">
                  <Link href={`/projects/${p.id}`} className="mt-2.5">
                    <Button size="sm" className="font-semibold text-xs gap-1">
                      Buka Workspace <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}

            {activeProjects.length === 0 && (
              <Card className="p-8 text-center border-dashed">
                <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-medium">
                  Belum ada proyek terdaftar
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  {isAdmin
                    ? "Anda belum membuat proyek. Silakan ke halaman Proyek & Template untuk memulai."
                    : "Anda belum ditugaskan ke proyek apa pun oleh Admin."}
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Links / Notifications */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Akses Cepat</h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Tautan Navigasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/projects" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs font-semibold gap-2 border-border/60"
                >
                  <Folder className="w-4 h-4 text-primary" /> Kelola Proyek &
                  Template
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/users" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-semibold gap-2 border-border/60"
                  >
                    <Users className="w-4 h-4 text-primary" /> Kelola Pengguna
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick Alert / Action needed */}
          {isAdmin && adminStats.reviewCount > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Tindakan Diperlukan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-700 dark:text-amber-400">
                Ada{" "}
                <span className="font-bold">
                  {adminStats.reviewCount} rekaman
                </span>{" "}
                yang diserahkan oleh translator dan menunggu persetujuan Anda.
                Silakan buka halaman proyek terkait untuk meninjau audio.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
