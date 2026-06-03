import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, CheckCircle, Clock, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";

interface AbsensiRecord {
  id: string;
  studentId: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto?: string;
  jamMasuk?: string;
  jamPulang?: string;
  status: "hadir" | "terlambat" | "pulang";
  tanggal: string;
}

interface Settings {
  jamBatasMasuk: string;
  whatsappEnabled: boolean;
  whatsappToken: string;
  notifMasuk: boolean;
  notifPulang: boolean;
  notifTerlambat: boolean;
  namaSekolah: string;
}

export function ScanAbsensi() {
  const [mode, setMode] = useState<"masuk" | "pulang">("masuk");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<AbsensiRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AbsensiRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [settings, setSettings] = useState<Settings>({
    jamBatasMasuk: "07:30",
    whatsappEnabled: false,
    whatsappToken: "",
    notifMasuk: true,
    notifPulang: true,
    notifTerlambat: true,
    namaSekolah: "SMA Negeri 1",
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchTodayAbsensi();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (data) {
      setSettings({
        jamBatasMasuk: data.jam_batas_masuk,
        whatsappEnabled: data.whatsapp_enabled,
        whatsappToken: data.whatsapp_token || "",
        notifMasuk: data.notif_masuk,
        notifPulang: data.notif_pulang,
        notifTerlambat: data.notif_terlambat,
        namaSekolah: data.nama_sekolah,
      });
    }
  };

  const fetchTodayAbsensi = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("absensi")
      .select("*, siswa(nama, nisn, kelas, foto_url)")
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false });

    if (error) {
      console.error("Error fetching absensi:", error.message);
      return;
    }

    if (data) {
      const records: AbsensiRecord[] = [];
      const seen = new Map();

      data.forEach((a) => {
        const key = a.siswa_id;
        if (!seen.has(key)) {
          seen.set(key, {
            id: a.id,
            studentId: a.siswa_id,
            nama: a.siswa?.nama || "",
            nisn: a.siswa?.nisn || "",
            kelas: a.siswa?.kelas || "",
            foto: a.siswa?.foto_url,
            jamMasuk:
              a.status !== "pulang"
                ? new Date(a.waktu_scan).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined,
            jamPulang:
              a.status === "pulang"
                ? new Date(a.waktu_scan).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined,
            status: a.status,
            tanggal: a.tanggal,
          });
        } else {
          const existing = seen.get(key);
          if (a.status === "pulang") {
            existing.jamPulang = new Date(a.waktu_scan).toLocaleTimeString(
              "id-ID",
              { hour: "2-digit", minute: "2-digit" },
            );
            existing.status = "pulang";
          } else if (!existing.jamMasuk) {
            existing.jamMasuk = new Date(a.waktu_scan).toLocaleTimeString(
              "id-ID",
              { hour: "2-digit", minute: "2-digit" },
            );
          }
        }
      });

      seen.forEach((v) => records.push(v));
      setTodayRecords(records);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isLate = (jamMasuk: string) => {
    const [h, m] = jamMasuk.split(":").map(Number);
    const [hb, mb] = settings.jamBatasMasuk.split(":").map(Number);
    return h * 60 + m > hb * 60 + mb;
  };

  const sendWhatsAppNotification = async (
    noWA: string,
    nama: string,
    jam: string,
    type: "masuk" | "pulang" | "terlambat",
  ) => {
    if (!settings.whatsappEnabled || !settings.whatsappToken) return;
    if (type === "masuk" && !settings.notifMasuk) return;
    if (type === "pulang" && !settings.notifPulang) return;
    if (type === "terlambat" && !settings.notifTerlambat) return;

    let message = "";
    if (type === "masuk") {
      message = `Ananda ${nama} telah hadir di sekolah pada pukul ${jam} WIB.\n\n${settings.namaSekolah}`;
    } else if (type === "terlambat") {
      message = `Ananda ${nama} terlambat masuk sekolah.\n\nJam Masuk:\n${jam} WIB\n\n${settings.namaSekolah}`;
    } else {
      message = `Ananda ${nama} telah meninggalkan sekolah pada pukul ${jam} WIB.\n\n${settings.namaSekolah}`;
    }

    try {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: settings.whatsappToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: noWA, message }),
      });
    } catch (err) {
      console.error("Gagal kirim WA:", err);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);

      const { data: siswa, error: siswaError } = await supabase
        .from("siswa")
        .select("id, nama, nisn, kelas, foto_url, no_wa")
        .eq("id", data.id)
        .single();

      if (siswaError || !siswa) {
        setErrorMessage("Siswa tidak ditemukan di database!");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("absensi")
        .select("*")
        .eq("siswa_id", siswa.id)
        .eq("tanggal", today);

      const sudahMasuk = existing?.some(
        (a) => a.status === "hadir" || a.status === "terlambat",
      );
      const sudahPulang = existing?.some((a) => a.status === "pulang");

      if (mode === "masuk") {
        if (sudahMasuk) {
          setErrorMessage(`${siswa.nama} sudah absen masuk hari ini!`);
          return;
        }

        const jamMasuk = getCurrentTime();
        const status = isLate(jamMasuk) ? "terlambat" : "hadir";

        const { error } = await supabase.from("absensi").insert({
          siswa_id: siswa.id,
          tanggal: today,
          status,
          keterangan: "",
        });

        if (error) {
          setErrorMessage("Gagal menyimpan absensi: " + error.message);
          return;
        }

        const newRecord: AbsensiRecord = {
          id: Date.now().toString(),
          studentId: siswa.id,
          nama: siswa.nama,
          nisn: siswa.nisn,
          kelas: siswa.kelas,
          foto: siswa.foto_url,
          jamMasuk,
          status,
          tanggal: today,
        };

        setLastScan(newRecord);
        setShowSuccess(true);
        playSuccessSound();
        toast.success(`${siswa.nama} berhasil absen masuk!`);

        if (siswa.no_wa) {
          await sendWhatsAppNotification(
            siswa.no_wa,
            siswa.nama,
            jamMasuk,
            status === "terlambat" ? "terlambat" : "masuk",
          );
        }

        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        if (!sudahMasuk) {
          setErrorMessage(`${siswa.nama} belum absen masuk!`);
          return;
        }
        if (sudahPulang) {
          setErrorMessage(`${siswa.nama} sudah absen pulang hari ini!`);
          return;
        }

        const jamPulang = getCurrentTime();

        const { error } = await supabase.from("absensi").insert({
          siswa_id: siswa.id,
          tanggal: today,
          status: "pulang",
          keterangan: "",
        });

        if (error) {
          setErrorMessage("Gagal menyimpan absensi: " + error.message);
          return;
        }

        const updatedRecord: AbsensiRecord = {
          id: Date.now().toString(),
          studentId: siswa.id,
          nama: siswa.nama,
          nisn: siswa.nisn,
          kelas: siswa.kelas,
          foto: siswa.foto_url,
          jamPulang,
          status: "pulang",
          tanggal: today,
        };

        setLastScan(updatedRecord);
        setShowSuccess(true);
        playSuccessSound();
        toast.success(`${siswa.nama} berhasil absen pulang!`);

        if (siswa.no_wa) {
          await sendWhatsAppNotification(
            siswa.no_wa,
            siswa.nama,
            jamPulang,
            "pulang",
          );
        }

        setTimeout(() => setShowSuccess(false), 5000);
      }

      setErrorMessage("");
      await fetchTodayAbsensi();
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("Format QR code tidak valid!");
    }
  };

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        undefined,
      );
      setScanning(true);
      setErrorMessage("");
    } catch {
      setErrorMessage(
        "Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.",
      );
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scan Absensi</h2>
        <p className="text-muted-foreground">
          Scan QR Code siswa untuk absensi masuk dan pulang
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mode Absensi</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "masuk" ? "default" : "outline"}
                    onClick={() => setMode("masuk")}
                  >
                    Absen Masuk
                  </Button>
                  <Button
                    variant={mode === "pulang" ? "default" : "outline"}
                    onClick={() => setMode("pulang")}
                  >
                    Absen Pulang
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!scanning && (
                  <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Kamera belum aktif
                      </p>
                    </div>
                  </div>
                )}

                <div
                  id="qr-reader"
                  ref={qrReaderRef}
                  className="w-full rounded-lg overflow-hidden"
                />

                <div className="flex gap-2">
                  {!scanning ? (
                    <Button className="w-full" onClick={startScanning}>
                      <Camera className="w-4 h-4" />
                      Mulai Scan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={stopScanning}
                    >
                      <CameraOff className="w-4 h-4" />
                      Stop Scan
                    </Button>
                  )}
                </div>

                {errorMessage && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                    {errorMessage}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showSuccess && lastScan && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary mb-4">
                      ✓ Absensi Berhasil
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nama:</p>
                        <p className="font-bold">{lastScan.nama}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Kelas:</p>
                        <p className="font-bold">{lastScan.kelas}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {mode === "masuk" ? "Jam Masuk:" : "Jam Pulang:"}
                        </p>
                        <p className="font-bold text-lg">
                          {mode === "masuk"
                            ? lastScan.jamMasuk
                            : lastScan.jamPulang}{" "}
                          WIB
                        </p>
                      </div>
                      {mode === "masuk" && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status:
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                              lastScan.status === "hadir"
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {lastScan.status === "hadir"
                              ? "Tepat Waktu"
                              : "Terlambat"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {lastScan.foto && (
                    <img
                      src={lastScan.foto}
                      alt={lastScan.nama}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar kanan */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistik Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm">Total Hadir</span>
                <span className="font-bold text-lg">
                  {todayRecords.filter((r) => r.status === "hadir").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-100 rounded-lg">
                <span className="text-sm">Terlambat</span>
                <span className="font-bold text-lg">
                  {todayRecords.filter((r) => r.status === "terlambat").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                <span className="text-sm">Sudah Pulang</span>
                <span className="font-bold text-lg">
                  {todayRecords.filter((r) => r.jamPulang).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Batas Waktu Masuk</p>
                  <p className="text-muted-foreground">
                    {settings.jamBatasMasuk} WIB
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <School className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Mode Saat Ini</p>
                  <p className="text-muted-foreground">
                    {mode === "masuk" ? "Absen Masuk" : "Absen Pulang"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5",
                    settings.whatsappEnabled ? "bg-green-500" : "bg-gray-400",
                  )}
                />
                <div>
                  <p className="font-medium">Notifikasi WA</p>
                  <p className="text-muted-foreground">
                    {settings.whatsappEnabled ? "Aktif" : "Nonaktif"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabel riwayat */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Absensi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    No
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Nama
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Kelas
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Jam Masuk
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Jam Pulang
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{record.nama}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {record.kelas}
                    </td>
                    <td className="py-3 px-4">{record.jamMasuk || "-"}</td>
                    <td className="py-3 px-4">{record.jamPulang || "-"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          record.status === "hadir"
                            ? "bg-primary/10 text-primary"
                            : record.status === "terlambat"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-secondary/10 text-secondary",
                        )}
                      >
                        {record.status === "hadir"
                          ? "Tepat Waktu"
                          : record.status === "terlambat"
                            ? "Terlambat"
                            : "Pulang"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todayRecords.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Belum ada absensi hari ini
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
