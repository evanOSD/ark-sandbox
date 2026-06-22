"use client";

import { useState } from "react";
import { Settings, User, Mail, Shield, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface SettingsClientProps {
  profile: UserProfile;
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const [username, setUsername] = useState(profile.username);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile(username);
      alert("Profil berhasil diperbarui!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" /> Pengaturan Akun
        </h1>
        <p className="text-muted-foreground mt-1">
          Perbarui informasi profil Anda dan kelola preferensi akun.
        </p>
      </div>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profil Pengguna</CardTitle>
          <CardDescription>
            Ubah nama tampilan Anda di aplikasi. Informasi email dan peran bersifat tetap.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="s-username" className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" /> Nama Pengguna
              </Label>
              <Input
                id="s-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan nama pengguna..."
                required
                className="max-w-md"
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-4 h-4" /> Alamat Email (Tetap)
              </Label>
              <Input
                value={profile.email}
                disabled
                className="max-w-md bg-muted/50 cursor-not-allowed border-muted"
              />
            </div>

            {/* Role (Read Only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="w-4 h-4" /> Peran Akun (Role)
              </Label>
              <Input
                value={profile.role === "admin" ? "Administrator" : "Translator (User)"}
                disabled
                className="max-w-md bg-muted/50 cursor-not-allowed border-muted capitalize"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 p-4 flex justify-end">
            <Button type="submit" disabled={isLoading} className="font-semibold gap-1.5">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Perubahan
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
