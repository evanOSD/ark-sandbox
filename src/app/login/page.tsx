import { LoginForm } from "./LoginForm";
import pkg from "../../../package.json"; // Mengimpor package.json secara dinamis
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const resolvedParams = await searchParams;

  // Memformat nama aplikasi agar terlihat premium untuk display (ark-sandbox -> ARK Sandbox)
  const appName = pkg.name === "ark-sandbox" ? "ARK Sandbox" : pkg.name;
  const appVersion = pkg.version;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Floating Theme Toggler */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle isCollapsed={true} />
      </div>

      {/* Pola Grid Halus Modern (Tetap di-lock agar tidak ikut terseleksi) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] select-none pointer-events-none" />

      {/* Ambient Lighting Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8000ms] select-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms] select-none" />

      <LoginForm
        message={resolvedParams?.message}
        appName={appName}
        appVersion={appVersion}
      />
    </div>
  );
}
