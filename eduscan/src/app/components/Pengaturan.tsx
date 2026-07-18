import { useState, useEffect } from "react";
import { Save, MessageSquare, Bell, Clock, School, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";

export function Pengaturan() {
  const [settings, setSettings] = useState({
    namaSekolah: "SMK MMT Penawar Aji",
    whatsappEnabled: true,
    whatsappToken: "",
    notifMasuk: true,
    notifPulang: true,
    notifTerlambat: true,

    templateMasuk:
      "Ananda [nama] telah hadir di sekolah pada pukul [jam] WIB.\n\nSMK MMT Penawar Aji",
    templateTerlambat:
      "Ananda [nama] terlambat masuk sekolah pada pukul [jam] WIB\n\nSMK MMT Penawar Aji",
    templatePulang:
      "Ananda [nama] telah meninggalkan sekolah pada pukul [jam] WIB.\n\nSMK MMT Penawar Aji",
    templateIzin:
      "Ananda [nama] tidak hadir hari ini dengan keterangan Izin.\n\nSMK MMT Penawar Aji",
    templateSakit:
      "Ananda [nama] tidak hadir hari ini dengan keterangan Sakit.\n\nSMK MMT Penawar Aji",
    templateAlfa:
      "Ananda [nama] tidak hadir hari ini tanpa keterangan (Alfa).\n\nSMK MMT Penawar Aji",
  });

  const [testNumber, setTestNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const HARI_LIST: { key: string; label: string }[] = [
    { key: "senin", label: "Senin" },
    { key: "selasa", label: "Selasa" },
    { key: "rabu", label: "Rabu" },
    { key: "kamis", label: "Kamis" },
    { key: "jumat", label: "Jumat" },
  ];
  const [jadwalSekolah, setJadwalSekolah] = useState<
    Record<
      string,
      { jam_masuk: string; jam_pulang: string; batas_terlambat_menit: number }
    >
  >({});
  const [isSavingJadwal, setIsSavingJadwal] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchJadwalSekolah();
  }, []);

  const fetchJadwalSekolah = async () => {
    const { data, error } = await supabase
      .from("jadwal_sekolah")
      .select("hari, jam_masuk, jam_pulang, batas_terlambat_menit");

    if (error) {
      console.error("Error fetching jadwal_sekolah:", error.message);
      return;
    }

    const mapped: typeof jadwalSekolah = {};
    (data || []).forEach((row: any) => {
      mapped[row.hari] = {
        jam_masuk: String(row.jam_masuk).slice(0, 5),
        jam_pulang: String(row.jam_pulang).slice(0, 5),
        batas_terlambat_menit: row.batas_terlambat_menit ?? 0,
      };
    });
    setJadwalSekolah(mapped);
  };

  const handleSaveJadwalSekolah = async () => {
    setIsSavingJadwal(true);

    const rows = HARI_LIST.map(({ key }) => ({
      hari: key,
      jam_masuk: jadwalSekolah[key]?.jam_masuk || "07:30",
      jam_pulang:
        jadwalSekolah[key]?.jam_pulang || (key === "jumat" ? "11:20" : "14:30"),
      batas_terlambat_menit: jadwalSekolah[key]?.batas_terlambat_menit ?? 0,
    }));

    const { error } = await supabase
      .from("jadwal_sekolah")
      .upsert(rows, { onConflict: "hari" });

    if (error) {
      toast.error("Gagal menyimpan jadwal sekolah: " + error.message);
    } else {
      toast.success("Jadwal sekolah berhasil disimpan!");
    }
    setIsSavingJadwal(false);
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching settings:", error.message);
    } else if (data) {
      setSettings({
        namaSekolah: data.nama_sekolah,
        whatsappEnabled: data.whatsapp_enabled,
        whatsappToken: data.whatsapp_token || "",
        notifMasuk: data.notif_masuk,
        notifPulang: data.notif_pulang,
        notifTerlambat: data.notif_terlambat,

        templateMasuk: data.template_masuk || "",
        templateTerlambat: data.template_terlambat || "",
        templatePulang: data.template_pulang || "",
        templateIzin: data.template_izin || "",
        templateSakit: data.template_sakit || "",
        templateAlfa: data.template_alfa || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from("settings")
      .update({
        nama_sekolah: settings.namaSekolah,
        whatsapp_enabled: settings.whatsappEnabled,
        whatsapp_token: settings.whatsappToken,
        notif_masuk: settings.notifMasuk,
        notif_pulang: settings.notifPulang,
        notif_terlambat: settings.notifTerlambat,
        updated_at: new Date().toISOString(),

        template_masuk: settings.templateMasuk,
        template_terlambat: settings.templateTerlambat,
        template_pulang: settings.templatePulang,
        template_izin: settings.templateIzin,
        template_sakit: settings.templateSakit,
        template_alfa: settings.templateAlfa,
      })
      .eq("id", 1)
      .select();

    if (error) {
      toast.error("Gagal menyimpan pengaturan: " + error.message);
      console.error("Update settings error:", error);
    } else if (!data || data.length === 0) {
      toast.error(
        "Pengaturan TIDAK tersimpan ke database. Kemungkinan besar RLS policy pada tabel 'settings' tidak mengizinkan role akun ini melakukan UPDATE.",
      );
      console.warn(
        "Update settings: 0 rows affected. Cek RLS policy pada tabel public.settings untuk role akun yang sedang login.",
      );
    } else {
      toast.success("Pengaturan berhasil disimpan!");
      const saved = data[0];
      setSettings({
        namaSekolah: saved.nama_sekolah,
        whatsappEnabled: saved.whatsapp_enabled,
        whatsappToken: saved.whatsapp_token || "",
        notifMasuk: saved.notif_masuk,
        notifPulang: saved.notif_pulang,
        notifTerlambat: saved.notif_terlambat,
        templateMasuk: saved.template_masuk || "",
        templateTerlambat: saved.template_terlambat || "",
        templatePulang: saved.template_pulang || "",
        templateIzin: saved.template_izin || "",
        templateSakit: saved.template_sakit || "",
        templateAlfa: saved.template_alfa || "",
      });
    }
    setIsSaving(false);
  };

  const handleTestWhatsApp = async () => {
    if (!testNumber) {
      toast.error("Masukkan nomor WhatsApp terlebih dahulu");
      return;
    }
    if (!settings.whatsappToken) {
      toast.error("Masukkan Fonnte API Token terlebih dahulu");
      return;
    }

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: settings.whatsappToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: testNumber,
          message: `*Test Notifikasi EduScan*\n\nNotifikasi WhatsApp berhasil dikonfigurasi!\n\n${settings.namaSekolah}`,
        }),
      });

      const result = await response.json();
      if (result.status) {
        toast.success("Pesan test berhasil dikirim ke " + testNumber);
      } else {
        toast.error("Gagal kirim: " + (result.reason || "Unknown error"));
      }
    } catch {
      toast.error("Gagal menghubungi Fonnte API");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pengaturan</h2>
        <p className="text-muted-foreground">
          Kelola pengaturan sistem dan notifikasi
        </p>
      </div>

      <Tabs defaultValue="umum" className="space-y-6">
        <TabsList>
          <TabsTrigger value="umum" className="cursor-pointer">
            <School className="w-4 h-4 mr-2" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="presensi" className="cursor-pointer">
            <Clock className="w-4 h-4 mr-2" />
            Presensi
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="umum" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Sekolah</CardTitle>
              <CardDescription>
                Pengaturan informasi dasar sekolah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="namaSekolah">Nama Sekolah</Label>
                <Input
                  id="namaSekolah"
                  value={settings.namaSekolah}
                  onChange={(e) =>
                    setSettings({ ...settings, namaSekolah: e.target.value })
                  }
                  placeholder="Nama sekolah"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presensi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jam Operasional</CardTitle>
              <CardDescription>
                Atur jam masuk dan jam pulang sekolah untuk tiap hari (Senin s/d
                Jumat). Jumat biasanya pulang lebih awal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {HARI_LIST.map(({ key, label }) => {
                  const row = jadwalSekolah[key] || {
                    jam_masuk: "07:30",
                    jam_pulang: key === "jumat" ? "11:20" : "14:30",
                    batas_terlambat_menit: 0,
                  };
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_1fr] gap-3 items-end p-3 border rounded-lg"
                    >
                      <p className="font-medium text-sm">{label}</p>
                      <div className="space-y-1">
                        <Label className="text-xs">Jam Masuk</Label>
                        <Input
                          type="time"
                          value={row.jam_masuk}
                          onChange={(e) =>
                            setJadwalSekolah({
                              ...jadwalSekolah,
                              [key]: { ...row, jam_masuk: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Jam Pulang</Label>
                        <Input
                          type="time"
                          value={row.jam_pulang}
                          onChange={(e) =>
                            setJadwalSekolah({
                              ...jadwalSekolah,
                              [key]: { ...row, jam_pulang: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Toleransi Terlambat (menit)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.batas_terlambat_menit}
                          onChange={(e) =>
                            setJadwalSekolah({
                              ...jadwalSekolah,
                              [key]: {
                                ...row,
                                batas_terlambat_menit:
                                  Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveJadwalSekolah}
                  disabled={isSavingJadwal}
                  className="cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSavingJadwal ? "Menyimpan..." : "Simpan Jadwal Sekolah"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aturan Presensi</CardTitle>
              <CardDescription>
                Konfigurasi aturan validasi presensi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Cegah Presensi Masuk Ganda",
                  desc: "Siswa tidak bisa presensi masuk dua kali dalam sehari",
                },
                {
                  label: "Cegah Presensi Pulang Ganda",
                  desc: "Siswa tidak bisa presensi pulang dua kali dalam sehari",
                },
                {
                  label: "Deteksi Keterlambatan Otomatis",
                  desc: "Sistem otomatis menandai siswa terlambat berdasarkan jam batas",
                },
              ].map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rule.label}</p>
                    <p className="text-sm text-muted-foreground">{rule.desc}</p>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Aktif
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi WhatsApp Gateway</CardTitle>
              <CardDescription>
                Integrasi dengan Fonnte untuk notifikasi WhatsApp otomatis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Status WhatsApp Gateway</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.whatsappEnabled ? "Aktif" : "Nonaktif"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.whatsappEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, whatsappEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappToken">Fonnte API Token</Label>
                <Input
                  id="whatsappToken"
                  type="password"
                  value={settings.whatsappToken}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappToken: e.target.value })
                  }
                  placeholder="Masukkan token API Fonnte"
                />
                <p className="text-xs text-muted-foreground">
                  Dapatkan token API dari{" "}
                  <a
                    href="https://fonnte.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    fonnte.com
                  </a>
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-medium">Test Notifikasi</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nomor WhatsApp (contoh: 6281234567890)"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                  <Button
                    onClick={handleTestWhatsApp}
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Kirim Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jenis Notifikasi</CardTitle>
              <CardDescription>
                Pilih notifikasi yang akan dikirim ke orang tua
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "notifMasuk",
                  label: "Notifikasi Masuk Sekolah",
                  desc: "Dikirim saat siswa berhasil presensi masuk",
                },
                {
                  key: "notifPulang",
                  label: "Notifikasi Pulang Sekolah",
                  desc: "Dikirim saat siswa berhasil presensi pulang",
                },
                {
                  key: "notifTerlambat",
                  label: "Notifikasi Keterlambatan",
                  desc: "Dikirim saat siswa terlambat masuk sekolah",
                },
              ].map((notif) => (
                <div
                  key={notif.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{notif.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {notif.desc}
                    </p>
                  </div>
                  <Switch
                    checked={
                      settings[notif.key as keyof typeof settings] as boolean
                    }
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, [notif.key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Notifikasi</CardTitle>
              <CardDescription>
                Edit template pesan WhatsApp yang akan dikirim ke orang tua.
                Gunakan{" "}
                <code className="bg-muted px-1 rounded text-xs">[nama]</code>{" "}
                untuk nama siswa dan{" "}
                <code className="bg-muted px-1 rounded text-xs">[jam]</code>{" "}
                untuk jam presensi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "templateMasuk", label: "Template Masuk Tepat Waktu" },
                { key: "templateTerlambat", label: "Template Terlambat" },
                { key: "templatePulang", label: "Template Pulang" },
                { key: "templateIzin", label: "Template Izin" },
                { key: "templateSakit", label: "Template Sakit" },
                { key: "templateAlfa", label: "Template Alfa" },
              ].map((t) => (
                <div key={t.key} className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.label}
                  </p>
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-white resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={
                      (settings[t.key as keyof typeof settings] as string) || ""
                    }
                    onChange={(e) =>
                      setSettings({ ...settings, [t.key]: e.target.value })
                    }
                  />
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-medium mb-1">
                      Preview:
                    </p>
                    <p className="text-sm whitespace-pre-line text-green-900">
                      {(
                        (settings[t.key as keyof typeof settings] as string) ||
                        ""
                      )
                        .replace("[nama]", "Restu Anggia")
                        .replace("[jam]", "07:25")}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
