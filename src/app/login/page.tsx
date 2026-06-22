import { login, signInWithGoogle } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
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
            Audio Recording for the Kingdom
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
              <Label htmlFor="usernameOrEmail">Username atau Email</Label>
              <Input 
                id="usernameOrEmail" 
                name="usernameOrEmail" 
                type="text" 
                placeholder="Masukkan username atau email" 
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
            <Button className="w-full font-semibold" formAction={login} type="submit">
              Sign In
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-1">
              Belum memiliki akun?{" "}
              <Link href="/signup" className="text-primary hover:underline font-semibold">
                Daftar di sini
              </Link>
            </p>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-850" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground backdrop-blur-sm">
                  Atau
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full bg-background/50 border-white/10 hover:bg-zinc-900 transition-colors gap-2" 
              formAction={signInWithGoogle} 
              type="submit"
            >
              <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Masuk dengan Google
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
