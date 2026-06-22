"use client";

import { useState } from "react";
import { Users, Trash2, Calendar, Shield, User, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserRole, deleteUser, createUser } from "./actions";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
}

interface UsersClientProps {
  initialUsers: UserRecord[];
  currentUserId: string;
}

export function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);

  // Form states
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    setIsLoading(userId);
    try {
      await updateUserRole(userId, newRole);
      alert("Role pengguna berhasil diperbarui!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui role");
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setIsLoading(userId);
    try {
      await deleteUser(userId);
      alert("Pengguna berhasil dihapus!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pengguna");
    } finally {
      setIsLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) {
      alert("Semua kolom formulir wajib diisi!");
      return;
    }
    setIsCreateLoading(true);
    try {
      await createUser(newUsername, newEmail, newPassword, newRole);
      setIsDialogOpen(false);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      alert("Pengguna baru berhasil didaftarkan!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mendaftarkan pengguna baru");
    } finally {
      setIsCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola peran pengguna (Admin/Translator) dan daftar akun terdaftar.
          </p>
        </div>

        {/* Add User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="font-semibold gap-2">
              <Plus className="h-4 w-4" /> Tambah Pengguna
            </Button>
          } />
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                <DialogDescription>
                  Daftarkan translator atau admin baru langsung ke database.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="u-username">Nama Pengguna (Username)</Label>
                  <Input
                    id="u-username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Masukkan nama pengguna"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-email">Alamat Email</Label>
                  <Input
                    id="u-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-password">Kata Sandi (Password)</Label>
                  <Input
                    id="u-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peran Akun (Role)</Label>
                  <Select
                    value={newRole}
                    onValueChange={(val) => setNewRole(val as "admin" | "user")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Translator (User)</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isCreateLoading}>
                  {isCreateLoading ? "Mendaftarkan..." : "Daftarkan Akun"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User count card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Total Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2.5 pb-4">
            <div className="text-3xl font-black">{initialUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Administrator
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2.5 pb-4">
            <div className="text-3xl font-black text-primary">
              {initialUsers.filter((u) => u.role === "admin").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Translator (User)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2.5 pb-4">
            <div className="text-3xl font-black text-muted-foreground">
              {initialUsers.filter((u) => u.role === "user").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-4">Nama Pengguna</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Tanggal Daftar</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isUserLoading = isLoading === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      {/* Name */}
                      <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                          {u.username.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <span>{u.username}</span>
                          {isSelf && <span className="text-[10px] text-primary font-bold">(Akun Anda)</span>}
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="p-4 text-muted-foreground font-mono text-xs">{u.email}</td>
                      
                      {/* Role drop-down */}
                      <td className="p-4">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
                            <Shield className="w-3.5 h-3.5" /> Administrator
                          </span>
                        ) : (
                          <Select
                            value={u.role}
                            disabled={isUserLoading}
                            onValueChange={(val) => handleRoleChange(u.id, val as "admin" | "user")}
                          >
                            <SelectTrigger className="w-32 h-8.5 text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user" className="text-xs font-medium">
                                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Translator</span>
                              </SelectItem>
                              <SelectItem value="admin" className="text-xs font-medium">
                                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Admin</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      
                      {/* Date */}
                      <td className="p-4 text-muted-foreground text-xs font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(u.created_at).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isUserLoading}
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8"
                          >
                            {isUserLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
