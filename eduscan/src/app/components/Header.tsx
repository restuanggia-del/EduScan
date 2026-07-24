import { Search, Bell, LogOut, ChevronDown, User, X } from "lucide-react";
import { Input } from "./ui/input";
import { useState, useRef, useEffect } from "react";
import { getEffectiveRole, useAuth } from "../../lib/AuthContext";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { getTodayLocal } from "../../lib/dateUtils";

const roleLabels: Record<string, string> = {
  kepala_sekolah: "Kepala Sekolah",
  tu: "TU",
  guru_biasa: "Guru",
  guru_wali_kelas: "Guru Wali Kelas",
};

export function Header({
  onSearch,
  onNavigate,
}: {
  onSearch?: (q: string) => void;
  onNavigate?: (page: string) => void;
}) {
  const { user, signOut, mustChangePassword, clearMustChangePassword } =
    useAuth();
  const effectiveRole = getEffectiveRole(user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [showProfil, setShowProfil] = useState(false);
  const [profilForm, setProfilForm] = useState({
    nama: user?.nama || "",
    nip: user?.nip || "",
    passwordLama: "",
    passwordBaru: "",
    passwordKonfirmasi: "",
  });
  const [savingProfil, setSavingProfil] = useState(false);

  const [showBell, setShowBell] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; pesan: string; waktu: string; dibaca: boolean }[]
  >([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mustChangePassword) {
      setProfilForm((prev) => ({
        ...prev,
        nama: user?.nama || "",
        nip: user?.nip || "",
      }));
      setShowProfil(true);
    }
  }, [mustChangePassword, user?.nama]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifikasi();

    const channel = supabase
      .channel("notif-absensi")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "absensi" },
        () => {
          fetchNotifikasi();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifikasi = async () => {
    const { data } = await supabase
      .from("absensi_siswa")
      .select("id, status, waktu_scan, siswa(nama, kelas)")
      .order("waktu_scan", { ascending: false })
      .limit(5);

    if (data) {
      const readKey = `eduscan_reads_${user?.id || "guest"}`;
      let readIds: string[] = [];
      try {
        const raw = localStorage.getItem(readKey);
        if (raw) readIds = JSON.parse(raw);
      } catch (e) {}

      setNotifications(
        (data as any[]).map((a) => {
          const jam = (() => {
            const d = new Date(a.waktu_scan);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          })();
          const statusText: Record<string, string> = {
            hadir: "hadir tepat waktu",
            terlambat: "terlambat",
            pulang: "pulang",
            izin: "izin",
            sakit: "sakit",
            alfa: "alfa",
          };
          return {
            id: a.id,
            pesan: `${a.siswa?.nama} (${a.siswa?.kelas}) — ${statusText[a.status] || a.status} jam ${jam}`,
            waktu: jam,
            dibaca: readIds.includes(String(a.id)),
          };
        }),
      );
    }
  };

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success("Berhasil logout!");
  };

  const handleSaveProfil = async () => {
    if (!profilForm.nama.trim()) {
      toast.error("Nama tidak boleh kosong!");
      return;
    }

    if (mustChangePassword && !profilForm.passwordBaru) {
      toast.error("Kamu wajib mengganti password default sebelum melanjutkan!");
      return;
    }

    setSavingProfil(true);

    const { error: nameError } = await supabase
      .from("users")
      .update({
        nama: profilForm.nama,
        ...(effectiveRole === "kepala_sekolah" || effectiveRole === "tu"
          ? { nip: profilForm.nip.trim() || null }
          : {}),
      })
      .eq("id", user?.id);

    if (nameError) {
      toast.error("Gagal update nama: " + nameError.message);
      setSavingProfil(false);
      return;
    }

    if (profilForm.passwordBaru) {
      if (profilForm.passwordBaru !== profilForm.passwordKonfirmasi) {
        toast.error("Konfirmasi password tidak cocok!");
        setSavingProfil(false);
        return;
      }
      if (profilForm.passwordBaru.length < 6) {
        toast.error("Password baru minimal 6 karakter!");
        setSavingProfil(false);
        return;
      }

      const { error: passError } = await supabase.auth.updateUser({
        password: profilForm.passwordBaru,
        data: { must_change_password: false },
      });

      if (passError) {
        toast.error("Gagal update password: " + passError.message);
        setSavingProfil(false);
        return;
      }

      clearMustChangePassword();
    }

    toast.success("Profil berhasil diperbarui!");
    setProfilForm({
      ...profilForm,
      passwordLama: "",
      passwordBaru: "",
      passwordKonfirmasi: "",
    });
    setShowProfil(false);
    setSavingProfil(false);

    setTimeout(() => window.location.reload(), 1000);
  };

  const initials = user?.nama
    ? user.nama
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const unreadCount = notifications.filter((n) => !n.dibaca).length;
  const markAllAsRead = () => {
    setNotifications((prev) => {
      const all = prev.map((notif) => ({ ...notif, dibaca: true }));
      try {
        const readKey = `eduscan_reads_${user?.id || "guest"}`;
        const ids = all.map((n) => String(n.id));
        localStorage.setItem(readKey, JSON.stringify(ids));
      } catch (e) {}
      return all;
    });
  };

  const [searchResults, setSearchResults] = useState<
    {
      type: string;
      label: string;
      sub: string;
      page: string;
    }[]
  >([]);

  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch?.(q);

    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    setShowResults(true);

    const results: {
      type: string;
      label: string;
      sub: string;
      page: string;
    }[] = [];

    const { data: siswaData } = await supabase
      .from("siswa")
      .select("nama, nisn, kelas")
      .or(`nama.ilike.%${q}%,nisn.ilike.%${q}%,kelas.ilike.%${q}%`)
      .limit(4);

    siswaData?.forEach((s) => {
      results.push({
        type: "Siswa",
        label: s.nama,
        sub: `NISN: ${s.nisn} • ${s.kelas}`,
        page: "siswa",
      });
    });

    const { data: kelasData } = await supabase
      .from("kelas")
      .select("nama_kelas, wali_kelas")
      .or(`nama_kelas.ilike.%${q}%,wali_kelas.ilike.%${q}%`)
      .limit(3);

    kelasData?.forEach((k) => {
      results.push({
        type: "Kelas",
        label: k.nama_kelas,
        sub: `Wali Kelas: ${k.wali_kelas}`,
        page: "kelas",
      });
    });

    const today = getTodayLocal();
    const { data: absensiData } = await supabase
      .from("absensi_siswa")
      .select("status, tanggal, siswa(nama, kelas)")
      .eq("tanggal", today)
      .limit(3);

    (absensiData as any[])?.forEach((a) => {
      if (a.siswa?.nama?.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          type: "Presensi",
          label: a.siswa?.nama,
          sub: `${a.status} • ${a.siswa?.kelas} • hari ini`,
          page: "rekap",
        });
      }
    });

    setSearchResults(results);
    setSearchLoading(false);
  };

  const handleSelectResult = (page: string) => {
    onNavigate?.(page);
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-16 bg-white/95 backdrop-blur border-b border-border px-6 flex items-center justify-between no-print">
        <div className="flex-1 max-w-xl" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari siswa, kelas, atau data lainnya..."
              className="pl-10"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />

            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Mencari...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Tidak ada hasil untuk "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectResult(result.page)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0 text-left transition-colors"
                      >
                        <span
                          className={`
                  mt-0.5 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0
                  ${
                    result.type === "Siswa"
                      ? "bg-primary/10 text-primary"
                      : result.type === "Kelas"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-amber-100 text-amber-700"
                  }
                `}
                        >
                          {result.type}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{result.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.sub}
                          </p>
                        </div>
                      </button>
                    ))}
                    <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
                      {searchResults.length} hasil ditemukan — klik untuk buka
                      halaman
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => {
                setShowBell(!showBell);

                if (!showBell) {
                  markAllAsRead();
                }
              }}
              className="p-2 rounded-md hover:bg-muted relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>

            {showBell && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="font-medium text-sm">Aktivitas Terbaru</p>
                  <button onClick={() => setShowBell(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-6">
                      Belum ada aktivitas
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <p className="text-sm">{notif.pesan}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.waktu} WIB
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Menampilkan 5 aktivitas terbaru
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 pl-3 border-l border-border hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors cursor-pointer"
            >
              <div className="text-right">
                <div className="text-sm font-medium">
                  {user?.nama || "User"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {roleLabels[effectiveRole || "guru_biasa"]}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                {initials}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-border rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-sm">{user?.nama}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                    {roleLabels[effectiveRole || "guru_biasa"]}
                  </span>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setProfilForm({
                        ...profilForm,
                        nama: user?.nama || "",
                        nip: user?.nip || "",
                      });
                      setShowProfil(true);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    Edit Profil
                  </button>

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keluar dari EduScan?</DialogTitle>
            <DialogDescription>
              Kamu akan keluar dari akun <strong>{user?.nama}</strong>. Pastikan
              semua pekerjaan sudah tersimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Ya, Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showProfil}
        onOpenChange={(open) => {
          if (!open && mustChangePassword) return;
          setShowProfil(open);
        }}
      >
        <DialogContent
          className={cn("max-w-md", mustChangePassword && "[&>button]:hidden")}
          onInteractOutside={(e) => {
            if (mustChangePassword) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (mustChangePassword) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mustChangePassword ? "Ganti Password Wajib" : "Edit Profil"}
            </DialogTitle>
            <DialogDescription>
              {mustChangePassword
                ? "Ini login pertama kamu. Untuk keamanan, ganti password default sebelum melanjutkan."
                : "Ubah nama tampilan atau password akun kamu."}
            </DialogDescription>
          </DialogHeader>

          {mustChangePassword && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3">
              ⚠️ Kamu wajib mengganti password sebelum bisa menggunakan
              aplikasi.
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email tidak bisa diubah
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                value={profilForm.nama}
                onChange={(e) =>
                  setProfilForm({ ...profilForm, nama: e.target.value })
                }
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {(effectiveRole === "kepala_sekolah" || effectiveRole === "tu") && (
              <div className="space-y-2">
                <Label htmlFor="nip">NUPTK</Label>
                <Input
                  id="nip"
                  value={profilForm.nip}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, nip: e.target.value })
                  }
                  placeholder="Nomor Unik Pendidik dan Tenaga Kependidikan"
                />
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Ganti Password</p>
              <p className="text-xs text-muted-foreground">
                Kosongkan jika tidak ingin ganti password
              </p>

              <div className="space-y-2">
                <Label htmlFor="passwordBaru">Password Baru</Label>
                <Input
                  id="passwordBaru"
                  type="password"
                  value={profilForm.passwordBaru}
                  onChange={(e) =>
                    setProfilForm({
                      ...profilForm,
                      passwordBaru: e.target.value,
                    })
                  }
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordKonfirmasi">
                  Konfirmasi Password Baru
                </Label>
                <Input
                  id="passwordKonfirmasi"
                  type="password"
                  value={profilForm.passwordKonfirmasi}
                  onChange={(e) =>
                    setProfilForm({
                      ...profilForm,
                      passwordKonfirmasi: e.target.value,
                    })
                  }
                  placeholder="Ulangi password baru"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowProfil(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveProfil}
                disabled={savingProfil}
                className="cursor-pointer"
              >
                {savingProfil ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
