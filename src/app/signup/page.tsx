import { signup } from "../login/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
      {/* Ornamen Background modern */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md z-10 bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader className="space-y-2 items-center text-center">
          <CardTitle className="text-4xl font-black tracking-tighter text-primary">ARK</CardTitle>
          <CardDescription>
            Audio Recording for the Kingdom - Buat Akun Baru
          </CardDescription>
        </CardHeader>
        <form>
          <CardContent className="space-y-4">
            {resolvedParams?.message && (
              <div className="p-3 text-sm text-center text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
                {resolvedParams.message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="nama@email.com" 
                required 
                className="bg-background/50 border-white/20 focus:bg-background transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                name="username" 
                type="text" 
                placeholder="Masukkan username Anda" 
                required 
                className="bg-background/50 border-white/20 focus:bg-background transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••"
                required 
                className="bg-background/50 border-white/20 focus:bg-background transition-colors" 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full font-semibold" formAction={signup} type="submit">
              Daftar Akun
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-1">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Masuk di sini
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
