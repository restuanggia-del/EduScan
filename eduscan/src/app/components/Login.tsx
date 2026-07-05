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

export function Login({ onRegisterClick }: { onRegisterClick?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
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
            <CardTitle>Masuk ke Akun</CardTitle>
            <CardDescription>
              Masukkan email dan password kamu. Akun Guru dibuat oleh Kepala
              Sekolah / TU melalui menu Data Guru.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="nama@guru.eduscan.id"
              />
            </div>

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
                  placeholder="Masukkan password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>

            {onRegisterClick && (
              <p className="text-center text-sm text-muted-foreground">
                Kepala Sekolah atau TU belum punya akun?{" "}
                <button
                  onClick={onRegisterClick}
                  className="text-primary font-medium hover:underline cursor-pointer"
                >
                  Daftar di sini
                </button>
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 EduScan v1.0
        </p>
      </div>
    </div>
  );
}
