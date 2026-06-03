import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { School, Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

export function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    password: "",
    role: "guru" as "super_admin" | "operator" | "guru",
  });

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error("Email dan password harus diisi!");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      toast.error("Login gagal: " + error.message);
    } else {
      toast.success("Login berhasil!");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!formData.nama || !formData.email || !formData.password) {
      toast.error("Semua field harus diisi!");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password minimal 6 karakter!");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          nama: formData.nama,
          role: formData.role,
        },
      },
    });

    if (error) {
      toast.error("Register gagal: " + error.message);
    } else {
      toast.success("Akun berhasil dibuat! Silakan login.");
      setMode("login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">EduScan</h1>
          <p className="text-muted-foreground text-sm">
            Sistem Absensi Sekolah Berbasis QR Code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Masukkan email dan password kamu"
                : "Daftarkan akun baru untuk mengakses sistem"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field Nama (hanya register) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Masukkan nama lengkap"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@gmail.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Minimal 6 karakter"
                  onKeyDown={(e) =>
                    e.key === "Enter" && mode === "login" && handleLogin()
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Role (hanya register) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as typeof formData.role,
                    })
                  }
                >
                  <option value="guru">Guru</option>
                  <option value="operator">Operator Sekolah</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Pilih role sesuai jabatan kamu di sekolah
                </p>
              </div>
            )}

            {/* Tombol aksi */}
            <button
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>

            {/* Switch mode */}
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-primary font-medium hover:underline"
              >
                {mode === "login" ? "Daftar di sini" : "Masuk di sini"}
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 EduScan v1.0
        </p>
      </div>
    </div>
  );
}
