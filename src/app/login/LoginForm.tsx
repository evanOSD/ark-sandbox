"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { login } from "./actions";

interface LoginFormProps {
  message?: string;
}

export function LoginForm({ message }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Detect if user is typing an email (contains @)
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
          `width=${width},height=${height},left=${left},top=${top},popup=true`
        );
      }
    } catch (err) {
      console.error("Popup initiation failed:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md z-10 bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl">
      <CardHeader className="space-y-2 items-center text-center">
        <CardTitle className="text-4xl font-black tracking-tighter text-primary">
          ARK
        </CardTitle>
        <CardDescription>Audio Recording Kit</CardDescription>
      </CardHeader>

      <form>
        <CardContent className="space-y-4">
          {/* Error / info message */}
          {message && (
            <div className="p-3 text-sm text-center text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
              {message}
            </div>
          )}

          {/* Username or Email field */}
          <div className="space-y-2">
            <Label htmlFor="usernameOrEmail">Username atau Email</Label>
            <Input
              id="usernameOrEmail"
              name="usernameOrEmail"
              type="text"
              placeholder="Masukkan username atau email"
              required
              autoComplete="username email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="bg-background/50 border-white/20 focus:bg-background transition-colors"
            />
            {/* Hint label that changes based on input */}
            <p className="text-[11px] text-muted-foreground leading-tight">
              {isEmail
                ? "Email terdeteksi — gunakan tombol Google di bawah untuk masuk tanpa password."
                : identifier.length > 0
                  ? "Masukkan password untuk melanjutkan."
                  : "Ketik username atau email kamu."}
            </p>
          </div>

          {/* Password field — only shown when NOT an email */}
          <div
            className={`space-y-2 overflow-hidden transition-all duration-300 ${
              isEmail ? "max-h-0 opacity-0 pointer-events-none" : "max-h-40 opacity-100"
            }`}
          >
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required={!isEmail}
              autoComplete="current-password"
              className="bg-background/50 border-white/20 focus:bg-background transition-colors"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {/* Username/password sign-in — hidden when email is detected */}
          <div
            className={`w-full overflow-hidden transition-all duration-300 ${
              isEmail ? "max-h-0 opacity-0 pointer-events-none" : "max-h-20 opacity-100"
            }`}
          >
            <Button
              className="w-full font-semibold"
              formAction={login}
              type="submit"
              disabled={isEmail}
            >
              Sign In
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Belum memiliki akun?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline font-semibold"
            >
              Daftar di sini
            </Link>
          </p>

          {/* Divider */}
          <div className="relative w-full my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground backdrop-blur-sm">
                {isEmail ? "Masuk dengan" : "Atau"}
              </span>
            </div>
          </div>

          {/* Google sign-in — always visible, highlighted when email is detected */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            variant={isEmail ? "default" : "outline"}
            className={`w-full gap-2 transition-all duration-300 ${
              isEmail
                ? "bg-white hover:bg-zinc-100 text-zinc-900 border-transparent shadow-md scale-[1.02]"
                : "bg-background/50 border-white/10 hover:bg-zinc-900"
            }`}
          >
            {/* Google "G" logo SVG */}
            <svg
              className="h-4 w-4 shrink-0"
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
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Masuk dengan Google
          </Button>

          {/* Contextual helper text for email users */}
          {isEmail && (
            <p className="text-[11px] text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300">
              Akun Google akan otomatis terhubung saat pertama kali masuk.
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
