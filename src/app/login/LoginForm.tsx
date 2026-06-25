"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Loader2, Lock, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { login } from "./actions";

interface LoginFormProps {
  message?: string;
  appName?: string;
  appVersion?: string;
}

export function LoginForm({
  message,
  appName = "ARK Kit",
  appVersion = "0.1.0",
}: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoggingIn, startLoginTransition] = useTransition();

  const isEmail = identifier.includes("@");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "supabase-oauth-success") {
        router.push("/dashboard");
        router.refresh();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEmail) return;

    const formData = new FormData(e.currentTarget);
    startLoginTransition(async () => {
      await login(formData);
    });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/login/success`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("Google sign in error:", error);
        router.push(`/login?message=${encodeURIComponent(error.message)}`);
        return;
      }

      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        window.open(
          data.url,
          "supabase-oauth",
          `width=${width},height=${height},left=${left},top=${top},popup=true`,
        );
      }
    } catch (err) {
      console.error("Popup initiation failed:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98, y: 15 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45)] rounded-3xl overflow-hidden grid md:grid-cols-12 min-h-[560px]"
    >
      {/* PANEL KIRI (Estetika Audio) */}
      <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8 flex-col justify-between relative overflow-hidden border-r border-zinc-800/20">
        {/* Ornamen Grid Panel Kiri */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px] select-none pointer-events-none" />
        <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl pointer-events-none select-none" />

        {/* Header Kiri */}
        <div className="relative z-10 flex items-center gap-2 select-none">
          <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-bold tracking-widest text-zinc-400 select-text">
            Audio Recording Web-based App
          </span>
        </div>

        {/* Visualisasi Gelombang Audio / Waveform Bouncing */}
        <div className="relative z-10 my-auto py-6 space-y-6">
          <div className="flex items-end gap-1 h-14 px-1 opacity-75 select-none">
            {[
              0.4, 0.75, 0.95, 0.5, 0.25, 0.85, 0.6, 0.9, 0.45, 0.7, 0.3, 0.8,
              0.55, 0.2, 0.65,
            ].map((val, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary via-indigo-400 to-white rounded-full"
                animate={{
                  height: [
                    `${val * 100}%`,
                    `${Math.max(15, (1 - val) * 100)}%`,
                    `${val * 100}%`,
                  ],
                }}
                transition={{
                  duration: 1.6 + (i % 4) * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-white leading-tight select-text">
              Perekaman & Penerjemahan Audio Tersinkronisasi.
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium select-text">
              Platform digital terintegrasi untuk manajemen produksi audio, alur
              kerja sulih suara, dan lokalisasi bahasa secara kolaboratif.
            </p>
          </div>
        </div>

        {/* Footer Kiri - SEKARANG DINAMIS MENGIKUTI PACKAGE.JSON */}
        <div className="relative z-10 text-[10px] text-zinc-500 font-semibold tracking-wider uppercase flex items-center gap-1.5 select-text">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse select-none" />{" "}
          {appName} v{appVersion}
        </div>
      </div>

      {/* PANEL KANAN (Formulir Login Modern) */}
      <div className="col-span-12 md:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-zinc-50/40 dark:bg-zinc-900/10">
        {/* BRAND LOGO CONTAINER */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center mb-4"
        >
          <div className="relative h-20 w-48 flex items-center justify-center select-none">
            <Image
              src="/logo/logo-ark-main-transparent.svg"
              alt="ARK Logo"
              fill
              priority
              className="object-contain dark:invert"
            />
          </div>
          <p className="text-[16px] font-extrabold uppercase tracking-widest text-foreground mt-2 hidden md:block select-text">
            Audio Recording Kit
          </p>
        </motion.div>

        {/* Formulir Login */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5 text-center md:text-left hidden md:block">
            <motion.h2
              variants={itemVariants}
              className="text-xl font-bold tracking-tight text-foreground select-text"
            >
              Masuk ke Akun Anda
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-xs text-muted-foreground font-medium select-text"
            >
              Masukkan kredensial Anda atau gunakan otorisasi cepat Google untuk
              mengakses workspace.
            </motion.p>
          </div>

          <div className="space-y-4">
            {/* Banner Gagal Info */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 text-xs font-semibold text-red-500 bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/15 text-center md:text-left flex items-center gap-2 select-text"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 select-none" />
                  <span className="flex-1 text-left select-text">
                    {message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Username/Email */}
            <motion.div variants={itemVariants} className="space-y-1.5 group">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="usernameOrEmail"
                  className="text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide select-text"
                >
                  Username atau Email
                </Label>
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors select-none" />
                <Input
                  id="usernameOrEmail"
                  name="usernameOrEmail"
                  type="text"
                  placeholder="Masukkan email atau username"
                  required
                  autoComplete="username email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 h-10.5 rounded-xl focus:bg-background transition-all focus:ring-4 focus:ring-primary/10 text-sm font-medium placeholder:text-muted-foreground/30 shadow-xs select-text"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/50 font-medium min-h-[14px] select-text">
                {isEmail
                  ? "⚡ Deteksi otomatis: Format email terikat pada tombol Google OAuth di bawah."
                  : identifier.length > 0
                    ? "🔒 Akun lokal terdeteksi. Silakan isi kata sandi."
                    : "Gunakan data kredensial terdaftar Anda."}
              </p>
            </motion.div>

            {/* Input Password Otomatis Muncul Mulus */}
            <AnimatePresence initial={false}>
              {!isEmail && (
                <motion.div
                  variants={itemVariants}
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="space-y-1.5 overflow-hidden group"
                >
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide select-text"
                    >
                      Password
                    </Label>
                    <Link
                      href="#"
                      className="text-[11px] text-muted-foreground/60 hover:text-primary font-medium transition-colors select-text"
                    >
                      Lupa password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors select-none" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required={!isEmail}
                      autoComplete="current-password"
                      className="pl-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 h-10.5 rounded-xl focus:bg-background transition-all focus:ring-4 focus:ring-primary/10 text-sm shadow-xs select-text"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sektor Tombol & Aksi */}
          <motion.div variants={itemVariants} className="space-y-4 pt-2">
            <AnimatePresence>
              {!isEmail && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full select-none"
                >
                  <Button
                    className="w-full font-bold h-10.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-all shadow-md active:scale-[0.995] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    type="submit"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Memverifikasi Sesi...
                      </>
                    ) : (
                      "Masuk ke Workspace"
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider Antarmuka Modern */}
            <div className="relative w-full py-0.5 select-none">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200 dark:border-zinc-800/80" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-widest">
                <span className="bg-zinc-50 dark:bg-zinc-950 px-3 text-muted-foreground/50 rounded-md py-0.5 border border-zinc-200/50 dark:border-zinc-800/30 select-text">
                  {isEmail ? "Otorisasi Tunggal" : "Atau Metode Alternatif"}
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              variant={isEmail ? "default" : "outline"}
              className={`w-full h-10.5 rounded-xl gap-2.5 font-bold transition-all duration-200 text-sm cursor-pointer shadow-xs select-none ${
                isEmail
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/10 scale-[1.01] active:scale-[0.99]"
                  : "bg-white dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-[0.995]"
              }`}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.49 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Masuk dengan Google
            </Button>
          </motion.div>

          {/* Sektor Footer */}
          <motion.p
            variants={itemVariants}
            className="text-xs text-center text-muted-foreground/80 font-medium pt-2 select-text"
          >
            Belum memiliki akun?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline font-bold transition-all select-text"
            >
              Hubungi Admin Proyek
            </Link>
          </motion.p>
        </form>
      </div>
    </motion.div>
  );
}
