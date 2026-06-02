import { useState } from "react";
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
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const handleTestWhatsApp = () => {
    if (!testNumber) {
      alert("Masukkan nomor WhatsApp terlebih dahulu");
      return;
    }

    const message = `*Test Notifikasi EduScan*\n\nNotifikasi WhatsApp berhasil dikonfigurasi!\n\n${settings.namaSekolah}`;
    console.log("Sending test message to:", testNumber, message);
    alert(`Pesan test akan dikirim ke ${testNumber}`);
  };

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
          <TabsTrigger value="umum">
            <School className="w-4 h-4 mr-2" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="absensi">
            <Clock className="w-4 h-4 mr-2" />
            Absensi
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
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
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Cegah Absen Masuk Ganda</p>
                    <p className="text-sm text-muted-foreground">
                      Siswa tidak bisa absen masuk dua kali dalam sehari
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Aktif
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Cegah Absen Pulang Ganda</p>
                    <p className="text-sm text-muted-foreground">
                      Siswa tidak bisa absen pulang dua kali dalam sehari
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Aktif
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      Deteksi Keterlambatan Otomatis
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sistem otomatis menandai siswa terlambat berdasarkan jam
                      batas
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Aktif
                  </div>
                </div>
              </div>
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
                  <Button onClick={handleTestWhatsApp} variant="outline">
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
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">Notifikasi Masuk Sekolah</p>
                  <p className="text-sm text-muted-foreground">
                    Dikirim saat siswa berhasil absen masuk
                  </p>
                </div>
                <Switch
                  checked={settings.notifMasuk}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifMasuk: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">Notifikasi Pulang Sekolah</p>
                  <p className="text-sm text-muted-foreground">
                    Dikirim saat siswa berhasil absen pulang
                  </p>
                </div>
                <Switch
                  checked={settings.notifPulang}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifPulang: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">Notifikasi Keterlambatan</p>
                  <p className="text-sm text-muted-foreground">
                    Dikirim saat siswa terlambat masuk sekolah
                  </p>
                </div>
                <Switch
                  checked={settings.notifTerlambat}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifTerlambat: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Notifikasi</CardTitle>
              <CardDescription>Preview template pesan WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Template Masuk Tepat Waktu
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm whitespace-pre-line">
                      Ananda [Nama Siswa] telah hadir di sekolah pada pukul
                      [Jam] WIB.
                      {"\n\n"}
                      {settings.namaSekolah}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Template Terlambat
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm whitespace-pre-line">
                      Ananda [Nama Siswa] terlambat masuk sekolah.
                      {"\n\n"}
                      Jam Masuk:{"\n"}
                      [Jam] WIB{"\n\n"}
                      {settings.namaSekolah}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Template Pulang
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm whitespace-pre-line">
                      Ananda [Nama Siswa] telah meninggalkan sekolah pada pukul
                      [Jam] WIB.
                      {"\n\n"}
                      {settings.namaSekolah}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-primary font-medium">
            <Bell className="w-4 h-4" />
            Pengaturan berhasil disimpan!
          </div>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
