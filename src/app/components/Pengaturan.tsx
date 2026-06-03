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
    namaSekolah: "SMA Negeri 1 Bandar Lampung",
    jamBatasMasuk: "07:30",
    jamBatasPulang: "15:00",
    whatsappEnabled: true,
    whatsappToken: "",
    notifMasuk: true,
    notifPulang: true,
    notifTerlambat: true,
  });

  const [testNumber, setTestNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch settings dari Supabase
  useEffect(() => {
    fetchSettings();
  }, []);

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
        jamBatasMasuk: data.jam_batas_masuk,
        jamBatasPulang: data.jam_batas_pulang,
        whatsappEnabled: data.whatsapp_enabled,
        whatsappToken: data.whatsapp_token || "",
        notifMasuk: data.notif_masuk,
        notifPulang: data.notif_pulang,
        notifTerlambat: data.notif_terlambat,
      });
    }
    setLoading(false);
  };

  // ✅ Simpan settings ke Supabase
  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({
        nama_sekolah: settings.namaSekolah,
        jam_batas_masuk: settings.jamBatasMasuk,
        jam_batas_pulang: settings.jamBatasPulang,
        whatsapp_enabled: settings.whatsappEnabled,
        whatsapp_token: settings.whatsappToken,
        notif_masuk: settings.notifMasuk,
        notif_pulang: settings.notifPulang,
        notif_terlambat: settings.notifTerlambat,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      toast.error("Gagal menyimpan pengaturan: " + error.message);
    } else {
      toast.success("Pengaturan berhasil disimpan!");
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
          <TabsTrigger value="absensi" className="cursor-pointer">
            <Clock className="w-4 h-4 mr-2" />
            Absensi
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* Tab Umum */}
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

        {/* Tab Absensi */}
        <TabsContent value="absensi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jam Operasional</CardTitle>
              <CardDescription>
                Atur waktu batas absensi masuk dan pulang
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jamBatasMasuk">Jam Batas Masuk</Label>
                  <Input
                    id="jamBatasMasuk"
                    type="time"
                    value={settings.jamBatasMasuk}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jamBatasMasuk: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Siswa yang datang setelah jam ini akan dianggap terlambat
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jamBatasPulang">Jam Batas Pulang</Label>
                  <Input
                    id="jamBatasPulang"
                    type="time"
                    value={settings.jamBatasPulang}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        jamBatasPulang: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Jam pulang normal siswa
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aturan Absensi</CardTitle>
              <CardDescription>
                Konfigurasi aturan validasi absensi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Cegah Absen Masuk Ganda",
                  desc: "Siswa tidak bisa absen masuk dua kali dalam sehari",
                },
                {
                  label: "Cegah Absen Pulang Ganda",
                  desc: "Siswa tidak bisa absen pulang dua kali dalam sehari",
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

        {/* Tab WhatsApp */}
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
                  desc: "Dikirim saat siswa berhasil absen masuk",
                },
                {
                  key: "notifPulang",
                  label: "Notifikasi Pulang Sekolah",
                  desc: "Dikirim saat siswa berhasil absen pulang",
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
              <CardDescription>Preview template pesan WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Template Masuk Tepat Waktu",
                  msg: `Siswa [Nama Siswa] telah hadir di sekolah pada pukul [Jam] WIB.\n\n${settings.namaSekolah}`,
                },
                {
                  label: "Template Terlambat",
                  msg: `Siswa [Nama Siswa] terlambat masuk sekolah.\n\nJam Masuk:\n[Jam] WIB\n\n${settings.namaSekolah}`,
                },
                {
                  label: "Template Pulang",
                  msg: `Siswa [Nama Siswa] telah meninggalkan sekolah pada pukul [Jam] WIB.\n\n${settings.namaSekolah}`,
                },
              ].map((t) => (
                <div key={t.label} className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.label}
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm whitespace-pre-line">{t.msg}</p>
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
