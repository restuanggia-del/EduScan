import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  CheckCircle,
  Clock,
  School,
  Search,
  UserX,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "./ui/utils";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { DaruratSiswa } from "./DaruratSiswa";

interface AbsensiRecord {
  id: string;
  studentId: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto?: string;
  jamMasuk?: string;
  jamPulang?: string;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "alfa" | "pulang";
  tanggal: string;
}

interface Siswa {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto_url?: string;
  no_wa?: string;
}

const buildTemplates = (settingsData: any) => ({
  templateMasuk: settingsData?.template_masuk || "",
  templateTerlambat: settingsData?.template_terlambat || "",
  templatePulang: settingsData?.template_pulang || "",
  templateIzin: settingsData?.template_izin || "",
  templateSakit: settingsData?.template_sakit || "",
  templateAlfa: settingsData?.template_alfa || "",
});

export function ScanSiswa() {
  const [mode, setMode] = useState<"masuk" | "pulang">("masuk");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<AbsensiRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AbsensiRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [showDarurat, setShowDarurat] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [allSiswa, setAllSiswa] = useState<Siswa[]>([]);
  const [filteredSiswa, setFilteredSiswa] = useState<Siswa[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTodayAbsensi();
    fetchAllSiswa();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (!showManual && !showDarurat) {
      barcodeInputRef.current?.focus();
    }
  }, [showManual, showDarurat, mode, showSuccess, errorMessage]);

  useEffect(() => {
    const search = manualSearch.trim().toLowerCase();

    if (!selectedKelas) {
      setFilteredSiswa([]);
      return;
    }

    setFilteredSiswa(
      allSiswa.filter((s) => {
        const matchesKelas = s.kelas === selectedKelas;
        const matchesSearch =
          !search ||
          s.nama.toLowerCase().includes(search) ||
          s.nisn.includes(search) ||
          s.kelas.toLowerCase().includes(search);

        return matchesKelas && matchesSearch;
      }),
    );
  }, [manualSearch, allSiswa, selectedKelas]);

  const fetchAllSiswa = async () => {
    const { data } = await supabase
      .from("siswa")
      .select("id, nama, nisn, kelas, foto_url, no_wa")
      .order("nama");
    if (data) setAllSiswa(data);
  };

  const fetchTodayAbsensi = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("absensi_siswa")
      .select("*, siswa(nama, nisn, kelas, foto_url)")
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false });

    if (error) {
      console.error("Error fetching presensi:", error.message);
      return;
    }

    if (data) {
      const seen = new Map();
      (data as any[]).forEach((a) => {
        const key = a.siswa_id;
        const jam = (() => {
          const d = new Date(a.waktu_scan);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        })();
        if (!seen.has(key)) {
          seen.set(key, {
            id: a.id,
            studentId: a.siswa_id,
            nama: a.siswa?.nama || "",
            nisn: a.siswa?.nisn || "",
            kelas: a.siswa?.kelas || "",
            foto: a.siswa?.foto_url,
            jamMasuk: a.status !== "pulang" ? jam : undefined,
            jamPulang: a.status === "pulang" ? jam : undefined,
            status: a.status,
            tanggal: a.tanggal,
          });
        } else {
          const existing = seen.get(key);
          if (a.status === "pulang" && !existing.jamPulang) {
            existing.jamPulang = jam;
            existing.status = "pulang";
          } else if (a.status !== "pulang" && !existing.jamMasuk) {
            existing.jamMasuk = jam;
          }
        }
      });

      const records: AbsensiRecord[] = [];
      seen.forEach((v) => records.push(v));
      setTodayRecords(records);
    }
  };

  const playSuccessSound = () => {
    try {
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
    } catch {}
  };

  const getCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const toMenit = (jam: string) => {
    const [h, m] = jam.split(":").map(Number);
    return h * 60 + m;
  };

  const HARI_MAP = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu",
  ];
  const getHariIni = () => HARI_MAP[new Date().getDay()];

  const DEFAULT_JADWAL = {
    jam_masuk: "07:30",
    jam_pulang: "14:30",
    batas_terlambat_menit: 0,
  };

  const fetchJadwalHariIni = async () => {
    const hari = getHariIni();
    const { data, error } = await supabase
      .from("jadwal_sekolah")
      .select("jam_masuk, jam_pulang, batas_terlambat_menit")
      .eq("hari", hari)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_JADWAL;
    }

    return {
      jam_masuk: String(data.jam_masuk).slice(0, 5),
      jam_pulang: String(data.jam_pulang).slice(0, 5),
      batas_terlambat_menit: data.batas_terlambat_menit ?? 0,
    };
  };

  const sendWhatsAppNotification = async (
    noWA: string,
    nama: string,
    jam: string,
    type: "masuk" | "pulang" | "terlambat" | "izin" | "sakit" | "alfa",
    namaSekolah: string,
    token: string,
    notifSettings: {
      notifMasuk: boolean;
      notifPulang: boolean;
      notifTerlambat: boolean;
    },
    templates: {
      templateMasuk: string;
      templateTerlambat: string;
      templatePulang: string;
      templateIzin: string;
      templateSakit: string;
      templateAlfa: string;
    },
  ) => {
    if (!token) return;

    if (type === "masuk" && !notifSettings.notifMasuk) return;
    if (type === "pulang" && !notifSettings.notifPulang) return;
    if (type === "terlambat" && !notifSettings.notifTerlambat) return;

    let nomor = noWA.replace(/\s+/g, "");
    if (nomor.startsWith("0")) nomor = "62" + nomor.slice(1);
    else if (nomor.startsWith("+")) nomor = nomor.slice(1);

    const templateMap: Record<string, string> = {
      masuk: templates.templateMasuk,
      terlambat: templates.templateTerlambat,
      pulang: templates.templatePulang,
      izin: templates.templateIzin,
      sakit: templates.templateSakit,
      alfa: templates.templateAlfa,
    };

    const message = (templateMap[type] || "")
      .replace(/\[nama\]/gi, nama)
      .replace(/\[jam\]/gi, jam);

    if (!message.trim()) return;

    try {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ target: nomor, message }),
      });
    } catch (err) {
      console.error("Gagal kirim WA:", err);
    }
  };

  const handleManualAbsensi = async (
    siswa: Siswa,
    status: "hadir" | "izin" | "sakit" | "alfa",
  ) => {
    setManualLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("absensi_siswa")
      .select("status")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", today);

    const sudahAbsen = existing && existing.length > 0;
    if (sudahAbsen) {
      toast.error(`${siswa.nama} sudah tercatat presensi hari ini!`);
      setManualLoading(false);
      return;
    }

    const { error } = await supabase.from("absensi_siswa").insert({
      siswa_id: siswa.id,
      tanggal: today,
      status,
      keterangan:
        status === "hadir" ? "Input manual - kartu ketinggalan" : status,
    });

    if (error) {
      toast.error("Gagal mencatat presensi: " + error.message);
    } else {
      toast.success(
        status === "hadir"
          ? `${siswa.nama} dicatat HADIR (input manual)!`
          : `${siswa.nama} dicatat ${status.toUpperCase()}!`,
      );
      playSuccessSound();

      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (settingsData?.whatsapp_enabled && siswa.no_wa) {
        const templates = buildTemplates(settingsData);

        await sendWhatsAppNotification(
          siswa.no_wa,
          siswa.nama,
          getCurrentTime(),
          status === "hadir" ? "masuk" : status,
          settingsData.nama_sekolah,
          settingsData.whatsapp_token,
          {
            notifMasuk: settingsData.notif_masuk,
            notifPulang: settingsData.notif_pulang,
            notifTerlambat: settingsData.notif_terlambat,
          },
          templates,
        );
      }

      await fetchTodayAbsensi();
    }
    setManualLoading(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const data = JSON.parse(decodedText);

      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      const jadwalHariIni = await fetchJadwalHariIni();
      const jamMasukJadwal = jadwalHariIni.jam_masuk;
      const jamBatasPulang = jadwalHariIni.jam_pulang;
      const batasTerlambatMenit = jadwalHariIni.batas_terlambat_menit;
      const whatsappEnabled = settingsData?.whatsapp_enabled || false;
      const whatsappToken = settingsData?.whatsapp_token || "";
      const namaSekolah = settingsData?.nama_sekolah || "Sekolah";
      const notifSettings = {
        notifMasuk: settingsData?.notif_masuk ?? true,
        notifPulang: settingsData?.notif_pulang ?? true,
        notifTerlambat: settingsData?.notif_terlambat ?? true,
      };

      const templates = buildTemplates(settingsData);

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
      const jamSekarang = getCurrentTime();
      const menitSekarang = toMenit(jamSekarang);

      const { data: existing } = await supabase
        .from("absensi_siswa")
        .select("status")
        .eq("siswa_id", siswa.id)
        .eq("tanggal", today);

      const sudahMasuk = existing?.some(
        (a) => a.status === "hadir" || a.status === "terlambat",
      );
      const sudahPulang = existing?.some((a) => a.status === "pulang");

      if (mode === "masuk") {
        if (sudahMasuk) {
          setErrorMessage(`${siswa.nama} sudah presensi masuk hari ini!`);
          return;
        }

        const menitJamMasuk = toMenit(jamMasukJadwal);
        const menitBatasTerlambat = menitJamMasuk + batasTerlambatMenit;

        if (menitSekarang > menitJamMasuk + 120) {
          setErrorMessage(
            `Tidak bisa presensi masuk! Sudah melewati batas waktu toleransi (${jamMasukJadwal} WIB + 2 jam).`,
          );
          return;
        }

        const status =
          menitSekarang > menitBatasTerlambat ? "terlambat" : "hadir";

        const { error } = await supabase.from("absensi_siswa").insert({
          siswa_id: siswa.id,
          tanggal: today,
          status,
          keterangan: "",
        });

        if (error) {
          setErrorMessage("Gagal mencatat presensi, silakan coba lagi.");
          return;
        }

        const newRecord: AbsensiRecord = {
          id: Date.now().toString(),
          studentId: siswa.id,
          nama: siswa.nama,
          nisn: siswa.nisn,
          kelas: siswa.kelas,
          foto: siswa.foto_url,
          jamMasuk: jamSekarang,
          status,
          tanggal: today,
        };

        setLastScan(newRecord);
        setShowSuccess(true);
        playSuccessSound();
        toast.success(`${siswa.nama} berhasil presensi masuk!`);

        if (whatsappEnabled && siswa.no_wa) {
          await sendWhatsAppNotification(
            siswa.no_wa,
            siswa.nama,
            jamSekarang,
            status === "terlambat" ? "terlambat" : "masuk",
            namaSekolah,
            whatsappToken,
            notifSettings,
            templates,
          );
        }

        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        if (!sudahMasuk) {
          setErrorMessage(`${siswa.nama} belum presensi masuk hari ini!`);
          return;
        }
        if (sudahPulang) {
          setErrorMessage(`${siswa.nama} sudah presensi pulang hari ini!`);
          return;
        }

        const menitBatasPulang = toMenit(jamBatasPulang);
        if (menitSekarang < menitBatasPulang) {
          setErrorMessage(
            `Belum bisa presensi pulang! Jam pulang mulai ${jamBatasPulang} WIB. Sekarang baru ${jamSekarang} WIB.`,
          );
          return;
        }

        const { error } = await supabase.from("absensi_siswa").insert({
          siswa_id: siswa.id,
          tanggal: today,
          status: "pulang",
          keterangan: "",
        });

        if (error) {
          setErrorMessage("Gagal mencatat presensi, silakan coba lagi.");
          return;
        }

        const updatedRecord: AbsensiRecord = {
          id: Date.now().toString(),
          studentId: siswa.id,
          nama: siswa.nama,
          nisn: siswa.nisn,
          kelas: siswa.kelas,
          foto: siswa.foto_url,
          jamPulang: jamSekarang,
          status: "pulang",
          tanggal: today,
        };

        setLastScan(updatedRecord);
        setShowSuccess(true);
        playSuccessSound();
        toast.success(`${siswa.nama} berhasil presensi pulang!`);

        if (whatsappEnabled && siswa.no_wa) {
          await sendWhatsAppNotification(
            siswa.no_wa,
            siswa.nama,
            jamSekarang,
            "pulang",
            namaSekolah,
            whatsappToken,
            notifSettings,
            templates,
          );
        }

        setTimeout(() => setShowSuccess(false), 5000);
      }

      setErrorMessage("");
      await fetchTodayAbsensi();
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("Format QR code tidak valid!");
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3000);
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

  const isSudahAbsen = (siswaId: string) =>
    todayRecords.some((r) => r.studentId === siswaId);

  const totalHadir = todayRecords.filter((r) => r.status === "hadir").length;
  const totalTerlambat = todayRecords.filter(
    (r) => r.status === "terlambat",
  ).length;
  const totalIzin = todayRecords.filter((r) => r.status === "izin").length;
  const totalSakit = todayRecords.filter((r) => r.status === "sakit").length;
  const totalAlfa = todayRecords.filter((r) => r.status === "alfa").length;
  const totalPulang = todayRecords.filter((r) => r.jamPulang).length;

  const statusColor: Record<string, string> = {
    hadir: "bg-primary/10 text-primary",
    terlambat: "bg-amber-100 text-amber-700",
    izin: "bg-blue-100 text-blue-700",
    sakit: "bg-green-100 text-green-700",
    alfa: "bg-destructive/10 text-destructive",
    pulang: "bg-secondary/10 text-secondary",
  };

  const statusLabel: Record<string, string> = {
    hadir: "Tepat Waktu",
    terlambat: "Terlambat",
    izin: "Izin",
    sakit: "Sakit",
    alfa: "Alfa",
    pulang: "Pulang",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scan Presensi</h2>
        <p className="text-muted-foreground">
          Scan QR Code siswa untuk presensi masuk dan pulang
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowManual(false);
                setShowDarurat(false);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                !showManual && !showDarurat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted",
              )}
            >
              📷 Scan QR Code
            </button>
            <button
              onClick={() => {
                setShowManual(true);
                setShowDarurat(false);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                showManual
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted",
              )}
            >
              <UserX className="w-4 h-4 inline mr-1" />
              Input Manual (Hadir/Izin/Sakit/Alfa)
            </button>
            <button
              onClick={() => {
                setShowManual(false);
                setShowDarurat(true);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                showDarurat
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-input hover:bg-muted",
              )}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Mode Darurat
            </button>
          </div>

          {!showManual && !showDarurat && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mode Presensi</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === "masuk" ? "default" : "outline"}
                      onClick={() => {
                        setMode("masuk");
                        setErrorMessage("");
                      }}
                      className="cursor-pointer"
                    >
                      Presensi Masuk
                    </Button>
                    <Button
                      variant={mode === "pulang" ? "default" : "outline"}
                      onClick={() => {
                        setMode("pulang");
                        setErrorMessage("");
                      }}
                      className="cursor-pointer"
                    >
                      Presensi Pulang
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    🔌 Scan pakai Alat Barcode/QR Scanner (USB)
                  </label>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    autoFocus
                    autoComplete="off"
                    placeholder="Klik di sini lalu tembak barcode/QR..."
                    className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    onBlur={() => {
                      if (!showManual && !showDarurat) {
                        setTimeout(() => barcodeInputRef.current?.focus(), 150);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        e.currentTarget.value = "";
                        if (value) handleScanSuccess(value);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pastikan kursor selalu ada di kolom ini sebelum menembakkan
                    scanner. Kolom ini otomatis fokus kembali secara berkala.
                  </p>
                </div>

                {!scanning && (
                  <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Kamera belum aktif
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mode:{" "}
                        {mode === "masuk"
                          ? "Presensi Masuk"
                          : "Presensi Pulang"}
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
                    <Button
                      className="w-full cursor-pointer"
                      onClick={startScanning}
                    >
                      <Camera className="w-4 h-4" />
                      Mulai Scan
                    </Button>
                  ) : (
                    <Button
                      className="w-full cursor-pointer"
                      variant="destructive"
                      onClick={stopScanning}
                    >
                      <CameraOff className="w-4 h-4" />
                      Stop Scan
                    </Button>
                  )}
                </div>

                {errorMessage && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm font-medium">
                    ⚠️ {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showManual && (
            <Card>
              <CardHeader>
                <CardTitle>Input Manual Kehadiran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_280px] md:items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Filter Kelas
                    </label>
                    <Select
                      value={selectedKelas}
                      onValueChange={(value) => setSelectedKelas(value)}
                    >
                      <SelectTrigger className="bg-muted border border-input hover:bg-muted/80">
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(allSiswa.map((s) => s.kelas)))
                          .sort()
                          .map((kelas) => (
                            <SelectItem key={kelas} value={kelas}>
                              {kelas}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, NISN, atau kelas..."
                      className="pl-10 h-9"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredSiswa.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Tidak ada siswa ditemukan
                    </p>
                  )}
                  {filteredSiswa.map((siswa) => {
                    const sudahAbsen = isSudahAbsen(siswa.id);
                    const recordSiswa = todayRecords.find(
                      (r) => r.studentId === siswa.id,
                    );

                    return (
                      <div
                        key={siswa.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          sudahAbsen
                            ? "bg-muted/50 opacity-70"
                            : "bg-background",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                            {siswa.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{siswa.nama}</p>
                            <p className="text-xs text-muted-foreground">
                              {siswa.nisn} • {siswa.kelas}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {sudahAbsen ? (
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                statusColor[recordSiswa?.status || "hadir"],
                              )}
                            >
                              {statusLabel[recordSiswa?.status || "hadir"]}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleManualAbsensi(siswa, "hadir")
                                }
                                disabled={manualLoading}
                                className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                              >
                                Hadir
                              </button>
                              <button
                                onClick={() =>
                                  handleManualAbsensi(siswa, "izin")
                                }
                                disabled={manualLoading}
                                className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                              >
                                Izin
                              </button>
                              <button
                                onClick={() =>
                                  handleManualAbsensi(siswa, "sakit")
                                }
                                disabled={manualLoading}
                                className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer"
                              >
                                Sakit
                              </button>
                              <button
                                onClick={() =>
                                  handleManualAbsensi(siswa, "alfa")
                                }
                                disabled={manualLoading}
                                className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors cursor-pointer"
                              >
                                Alfa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {showDarurat && <DaruratSiswa />}

          {showSuccess && lastScan && !showManual && !showDarurat && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary mb-4">
                      ✓ Presensi Berhasil
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistik Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Hadir",
                  value: totalHadir,
                  color: "bg-primary/10 text-primary",
                },
                {
                  label: "Terlambat",
                  value: totalTerlambat,
                  color: "bg-amber-100 text-amber-700",
                },
                {
                  label: "Izin",
                  value: totalIzin,
                  color: "bg-blue-100 text-blue-700",
                },
                {
                  label: "Sakit",
                  value: totalSakit,
                  color: "bg-green-100 text-green-700",
                },
                {
                  label: "Alfa",
                  value: totalAlfa,
                  color: "bg-destructive/10 text-destructive",
                },
                {
                  label: "Sudah Pulang",
                  value: totalPulang,
                  color: "bg-secondary/10 text-secondary",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    stat.color,
                  )}
                >
                  <span className="text-sm font-medium">{stat.label}</span>
                  <span className="font-bold text-lg">{stat.value}</span>
                </div>
              ))}
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
                  <p className="font-medium">Mode Saat Ini</p>
                  <p className="text-muted-foreground">
                    {showDarurat
                      ? "⚡ Mode Darurat"
                      : showManual
                        ? "📝 Input Manual"
                        : mode === "masuk"
                          ? "🟢 Presensi Masuk"
                          : "🔵 Presensi Pulang"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <School className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Jam Sekarang</p>
                  <p className="text-muted-foreground">
                    {getCurrentTime()} WIB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Presensi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "No",
                    "Nama",
                    "Kelas",
                    "Jam Masuk",
                    "Jam Pulang",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
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
                          statusColor[record.status],
                        )}
                      >
                        {statusLabel[record.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {todayRecords.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Belum ada presensi hari ini
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
