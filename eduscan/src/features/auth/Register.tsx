import { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { toast } from "sonner";
import { School } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export function Register({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    email: "",
    nip: "",
    role: "tu" as "kepala_sekolah" | "tu",
    password: "",
    passwordKonfirmasi: "",
  });
  const [done, setDone] = useState<"" | "need_confirm" | "success">("");

  const handleRegister = async () => {
    const { nama, email, password, passwordKonfirmasi, role, nip } = form;

    if (!nama.trim() || !email.trim() || !password) {
      toast.error("Nama, email, dan password harus diisi!");
      return;
    }
    if (password !== passwordKonfirmasi) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter!");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nama: nama.trim(),
          role,
          nip: nip.trim() || null,
          self_register: true,
        },
      },
    });

    if (error) {
      toast.error("Gagal mendaftar: " + error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      toast.success("Pendaftaran berhasil!");
      setDone("success");
    } else {
      setDone("need_confirm");
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
            Sistem Presensi Sekolah Berbasis QR Code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Akun</CardTitle>
            <CardDescription>
              Halaman ini khusus untuk pendaftaran akun{" "}
              <strong>Kepala Sekolah</strong> atau <strong>TU</strong>. Akun
              Guru tidak bisa daftar sendiri di sini — hubungi Kepala Sekolah /
              TU untuk dibuatkan akun lewat menu Data Guru.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {done === "need_confirm" ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3">
                  Pendaftaran berhasil! Silakan cek email{" "}
                  <strong>{form.email}</strong> untuk konfirmasi akun sebelum
                  bisa masuk.
                </div>
                <button
                  onClick={onBack}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            ) : done === "success" ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-md p-3">
                  Pendaftaran berhasil! Akun kamu sudah aktif.
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reg-nama">Nama Lengkap</Label>
                  <Input
                    id="reg-nama"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="nama@sekolah.id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-nip">NUPTK (opsional)</Label>
                  <Input
                    id="reg-nip"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    placeholder="Nomor Unik Pendidik dan Tenaga Kependidikan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Daftar sebagai</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        role: v as "kepala_sekolah" | "tu",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kepala_sekolah">
                        Kepala Sekolah
                      </SelectItem>
                      <SelectItem value="tu">TU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password-konfirmasi">
                    Konfirmasi Password
                  </Label>
                  <Input
                    id="reg-password-konfirmasi"
                    type="password"
                    value={form.passwordKonfirmasi}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        passwordKonfirmasi: e.target.value,
                      })
                    }
                    placeholder="Ulangi password"
                  />
                </div>

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Memproses..." : "Daftar"}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <button
                    onClick={onBack}
                    className="text-primary font-medium hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              </>
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
