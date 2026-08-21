import { useState, useEffect } from "react";
import { Save, MessageSquare, Clock, School, Send } from "lucide-react";
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
import { sendWhatsAppMessage } from "../../lib/waGateway";

export function Pengaturan() {
  const [settings, setSettings] = useState({
    namaSekolah: "SMK MMT Penawar Aji",
    whatsappEnabled: true,
    whatsappToken: "",
    notifMasuk: true,
    notifPulang: true,
    notifTerlambat: true,

    templateMasuk: "",
    templateTerlambat: "",
    templatePulang: "",
    templateIzin: "",
    templateSakit: "",
    templateAlfa: "",

    rekapPagiEnabled: true,
    rekapPagiJam: "09:00",
    rekapPulangEnabled: true,
    rekapPulangJam: "15:00",
  });

  const [testGroupId, setTestGroupId] = useState("");
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
        whatsappEnabled: data.whatsapp_enabled ?? true,
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

        rekapPagiEnabled: data.rekap_pagi_enabled ?? true,
        rekapPagiJam: (data.rekap_pagi_jam || "09:00").slice(0, 5),
        rekapPulangEnabled: data.rekap_pulang_enabled ?? true,
        rekapPulangJam: (data.rekap_pulang_jam || "15:00").slice(0, 5),
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

        rekap_pagi_enabled: settings.rekapPagiEnabled,
        rekap_pagi_jam: settings.rekapPagiJam,
        rekap_pulang_enabled: settings.rekapPulangEnabled,
        rekap_pulang_jam: settings.rekapPulangJam,
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
        rekapPagiEnabled: saved.rekap_pagi_enabled,
        rekapPagiJam: (saved.rekap_pagi_jam || "09:00").slice(0, 5),
        rekapPulangEnabled: saved.rekap_pulang_enabled,
        rekapPulangJam: (saved.rekap_pulang_jam || "15:00").slice(0, 5),
      });
    }
    setIsSaving(false);
  };

  const handleTestGroup = async () => {
    if (!testGroupId) {
      toast.error("Masukkan Group ID WhatsApp terlebih dahulu");
      return;
    }
    if (!settings.whatsappToken) {
      toast.error("Masukkan Wablas API Token terlebih dahulu");
      return;
    }

    const result = await sendWhatsAppMessage(
      settings.whatsappToken,
      testGroupId,
      `Test Rekap Presensi EduScan\n\nKoneksi ke grup berhasil dikonfigurasi!\n\n${settings.namaSekolah}`,
    );

    if (result.success) {
      toast.success("Pesan test berhasil dikirim ke grup");
    } else {
      toast.error("Gagal kirim: " + result.message);
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
          <TabsTrigger value="rekap-grup" className="cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-2" />
            Rekap Grup WA
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

        <TabsContent value="rekap-grup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi WhatsApp Gateway</CardTitle>
              <CardDescription>
                Integrasi dengan Wablas untuk kirim rekap presensi otomatis ke
                grup WhatsApp tiap kelas
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
                <Label htmlFor="whatsappToken">Wablas API Token</Label>
                <Input
                  id="whatsappToken"
                  type="password"
                  value={settings.whatsappToken}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappToken: e.target.value })
                  }
                  placeholder="TOKEN.SECRETKEY"
                />
                <p className="text-xs text-muted-foreground">
                  Gabungkan Token dan Secret Key dari dashboard Wablas (Device
                  &gt; Settings) dengan format{" "}
                  <code className="font-mono">TOKEN.SECRETKEY</code>. Dapatkan
                  dari{" "}
                  <a
                    href="https://solo.wablas.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    solo.wablas.com
                  </a>
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-medium">Test Kirim ke Grup</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Group ID (contoh: 12036xxxxxxxxx@g.us)"
                    value={testGroupId}
                    onChange={(e) => setTestGroupId(e.target.value)}
                  />
                  <Button
                    onClick={handleTestGroup}
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Kirim Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Group ID diatur per kelas di menu{" "}
                  <span className="font-medium">Manajemen Kelas</span>. Cara
                  dapatkan Group ID: tanya ke Support Wablas (chat WA 24 jam di
                  dashboard mereka) atau cek dokumentasi solo.wablas.com bagian
                  "Get Group ID".
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jadwal Rekap Otomatis</CardTitle>
              <CardDescription>
                Rekap presensi dikirim otomatis ke grup WhatsApp tiap kelas pada
                jam ini setiap hari. Pengecekan jadwal jalan tiap 5 menit, jadi
                pengiriman bisa mundur maksimal ±5 menit dari jam yang di-set.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rekap Presensi Pagi</p>
                    <p className="text-sm text-muted-foreground">
                      Hadir / Terlambat / Izin / Sakit / Alfa
                    </p>
                  </div>
                  <Switch
                    checked={settings.rekapPagiEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, rekapPagiEnabled: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rekapPagiJam">Jam Kirim Rekap Pagi</Label>
                  <Input
                    id="rekapPagiJam"
                    type="time"
                    value={settings.rekapPagiJam}
                    onChange={(e) =>
                      setSettings({ ...settings, rekapPagiJam: e.target.value })
                    }
                    disabled={!settings.rekapPagiEnabled}
                    className="w-40"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rekap Presensi Pulang</p>
                    <p className="text-sm text-muted-foreground">
                      Daftar siswa yang sudah presensi pulang
                    </p>
                  </div>
                  <Switch
                    checked={settings.rekapPulangEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        rekapPulangEnabled: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rekapPulangJam">Jam Kirim Rekap Pulang</Label>
                  <Input
                    id="rekapPulangJam"
                    type="time"
                    value={settings.rekapPulangJam}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rekapPulangJam: e.target.value,
                      })
                    }
                    disabled={!settings.rekapPulangEnabled}
                    className="w-40"
                  />
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
                Edit template pesan (legacy, tidak dipakai oleh rekap grup —
                cadangan kalau nanti balik ke notifikasi individual). Gunakan{" "}
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
