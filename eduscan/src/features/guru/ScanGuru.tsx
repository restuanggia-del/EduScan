import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Search,
  AlertTriangle,
  Zap,
  Camera,
  CameraOff,
  UserX,
  Clock,
  School,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { supabase } from "../../services/supabaseClient";
import { toast } from "sonner";
import { DaruratGuru } from "./DaruratGuru";
import { getTodayLocal } from "../../lib/dateUtils";

type StatusGuru =
  | "hadir"
  | "terlambat"
  | "izin"
  | "sakit"
  | "alfa"
  | "pulang"
  | "ts";

interface Target {
  key: string;
  nama: string;
  nip_email: string;
  nip: string | null;
  peran: "guru" | "kepala_sekolah" | "tu";
  guru_id: string | null;
  user_id: string | null;
}

const STATUS_OPTIONS: { value: StatusGuru; label: string }[] = [
  { value: "hadir", label: "Hadir" },
  { value: "terlambat", label: "Terlambat" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alfa", label: "Alfa" },
  { value: "ts", label: "TS (Tugas Sekolah)" },
];

const statusLabel: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
  ts: "TS",
};

const statusColor: Record<string, string> = {
  hadir: "bg-primary/10 text-primary",
  terlambat: "bg-amber-100 text-amber-700",
  izin: "bg-blue-100 text-blue-700",
  sakit: "bg-green-100 text-green-700",
  alfa: "bg-destructive/10 text-destructive",
  pulang: "bg-secondary/10 text-secondary",
  ts: "bg-purple-100 text-purple-700",
};

export function ScanGuru() {
  const [modeAktif, setModeAktif] = useState<"qr" | "manual" | "darurat">("qr");
  const [search, setSearch] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState<
    {
      key: string;
      nama: string;
      peran: "guru" | "kepala_sekolah" | "tu";
      status: string;
      jam: string;
      jenis: "masuk" | "pulang";
    }[]
  >([]);

  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [pendingMode, setPendingMode] = useState<"masuk" | "pulang">("masuk");
  const [manualStatus, setManualStatus] = useState<StatusGuru>("hadir");
  const [submitting, setSubmitting] = useState(false);

  const [qrMode, setQrMode] = useState<"masuk" | "pulang">("masuk");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTargets();
    fetchTodayRecords();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (modeAktif === "qr") {
      barcodeInputRef.current?.focus();
    }
  }, [modeAktif, qrMode, scanError]);

  const fetchTargets = async () => {
    setLoading(true);

    const { data: guruData } = await supabase
      .from("guru")
      .select("id, nama, nip, user_id")
      .order("nama");

    const { data: ksData } = await supabase
      .from("users")
      .select("id, nama, email, role, nip")
      .in("role", ["kepala_sekolah", "tu"]);

    const guruTargets: Target[] = (guruData || []).map((g) => ({
      key: g.id,
      nama: g.nama,
      nip_email: g.nip || "-",
      nip: g.nip || null,
      peran: "guru",
      guru_id: g.id,
      user_id: g.user_id,
    }));

    const ksTargets: Target[] = (ksData || []).map((u) => ({
      key: u.id,
      nama: u.nama,
      nip_email: u.nip || u.email,
      nip: u.nip || null,
      peran: u.role === "kepala_sekolah" ? "kepala_sekolah" : "tu",
      guru_id: null,
      user_id: u.id,
    }));

    setTargets([...ksTargets, ...guruTargets]);
    setLoading(false);
  };

  const fetchTodayRecords = async () => {
    const today = getTodayLocal();
    const { data, error } = await supabase
      .from("absensi_guru")
      .select("*, guru(nama), users(nama)")
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false });

    if (error) {
      console.error("Gagal memuat presensi guru hari ini:", error.message);
      return;
    }

    const records = (data || []).map((a: any) => {
      const d = new Date(a.waktu_scan);
      const jam = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`;
      return {
        key: a.guru_id || a.user_id,
        nama: a.guru?.nama || a.users?.nama || "-",
        peran: a.peran as "guru" | "kepala_sekolah" | "tu",
        status: a.status,
        jam,
        jenis: a.status === "pulang" ? ("pulang" as const) : ("masuk" as const),
      };
    });
    setTodayRecords(records);
  };

  const riwayatRows = (() => {
    const map = new Map<
      string,
      {
        key: string;
        nama: string;
        peran: "guru" | "kepala_sekolah" | "tu";
        jamMasuk?: string;
        jamPulang?: string;
        status?: string;
      }
    >();

    [...todayRecords].reverse().forEach((r) => {
      const existing = map.get(r.key) || {
        key: r.key,
        nama: r.nama,
        peran: r.peran,
      };
      if (r.jenis === "masuk") {
        existing.jamMasuk = r.jam;
        existing.status = r.status;
      } else {
        existing.jamPulang = r.jam;
      }
      map.set(r.key, existing);
    });

    return Array.from(map.values()).sort((a, b) =>
      (a.jamMasuk || a.jamPulang || "").localeCompare(
        b.jamMasuk || b.jamPulang || "",
      ),
    );
  })();

  const sudahAbsen = (key: string, jenis: "masuk" | "pulang") =>
    todayRecords.some((r) => r.key === key && r.jenis === jenis);

  const filteredTargets = targets.filter(
    (t) =>
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.nip_email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAbsenMasukClick = async (target: Target) => {
    if (sudahAbsen(target.key, "masuk")) {
      toast.error(`${target.nama} sudah presensi masuk hari ini!`);
      return;
    }

    if (target.peran === "kepala_sekolah" || target.peran === "tu") {
      setPendingTarget(target);
      setPendingMode("masuk");
      setManualStatus("hadir");
      return;
    }

    const { data: status, error } = await supabase.rpc(
      "hitung_status_absensi_guru",
      { p_guru_id: target.guru_id, p_waktu_scan: new Date().toISOString() },
    );

    if (error) {
      toast.error("Gagal menghitung status: " + error.message);
      return;
    }

    if (status === "tidak_terjadwal") {
      setPendingTarget(target);
      setPendingMode("masuk");
      setManualStatus("hadir");
      toast.warning(
        `${target.nama} tidak ada jadwal hari ini — pilih status manual.`,
      );
      return;
    }

    await saveAbsensi(target, "masuk", status as StatusGuru);
  };

  const handleAbsenPulangClick = async (target: Target) => {
    if (!sudahAbsen(target.key, "masuk")) {
      toast.error(`${target.nama} belum presensi masuk hari ini!`);
      return;
    }
    if (sudahAbsen(target.key, "pulang")) {
      toast.error(`${target.nama} sudah presensi pulang hari ini!`);
      return;
    }
    await saveAbsensi(target, "pulang", "pulang");
  };

  const saveAbsensi = async (
    target: Target,
    mode: "masuk" | "pulang",
    status: StatusGuru | "pulang",
  ) => {
    setSubmitting(true);
    const today = getTodayLocal();

    const { error } = await supabase.from("absensi_guru").insert({
      guru_id: target.guru_id,
      user_id: target.user_id,
      peran: target.peran,
      tanggal: today,
      status,
      keterangan: "",
    });

    setSubmitting(false);

    if (error) {
      toast.error("Gagal mencatat presensi: " + error.message);
      return;
    }

    toast.success(
      `${target.nama} berhasil dicatat ${mode === "masuk" ? "masuk" : "pulang"} (${status.toUpperCase()})!`,
    );
    setPendingTarget(null);
    fetchTodayRecords();
  };

  const handleConfirmManual = () => {
    if (!pendingTarget) return;
    saveAbsensi(pendingTarget, pendingMode, manualStatus);
  };

  const handleGuruScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setScanError("");

    try {
      const nip = decodedText.trim();
      const target = targets.find((t) => t.nip && t.nip === nip);

      if (!target) {
        setScanError("NIP tidak ditemukan di database!");
        return;
      }

      if (qrMode === "masuk") {
        await handleAbsenMasukClick(target);
      } else {
        await handleAbsenPulangClick(target);
      }
    } catch (err) {
      console.error("Error scan guru:", err);
      setScanError("Format QR code tidak valid!");
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3000);
    }
  };

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-guru");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleGuruScanSuccess,
        undefined,
      );
      setScanning(true);
      setScanError("");
    } catch {
      setScanError(
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

  const getCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const totalHadir = riwayatRows.filter((r) => r.status === "hadir").length;
  const totalTerlambat = riwayatRows.filter(
    (r) => r.status === "terlambat",
  ).length;
  const totalIzin = riwayatRows.filter((r) => r.status === "izin").length;
  const totalSakit = riwayatRows.filter((r) => r.status === "sakit").length;
  const totalAlfa = riwayatRows.filter((r) => r.status === "alfa").length;
  const totalTS = riwayatRows.filter((r) => r.status === "ts").length;
  const totalPulang = riwayatRows.filter((r) => r.jamPulang).length;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setModeAktif("qr")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                modeAktif === "qr"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted",
              )}
            >
              📷 Scan QR Code
            </button>
            <button
              onClick={() => setModeAktif("manual")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                modeAktif === "manual"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted",
              )}
            >
              <UserX className="w-4 h-4 inline mr-1" />
              Input Manual (Hadir/Terlambat/Izin/Sakit/Alfa/TS)
            </button>
            <button
              onClick={() => setModeAktif("darurat")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                modeAktif === "darurat"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-input hover:bg-muted",
              )}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Mode Darurat
            </button>
          </div>

          {modeAktif === "qr" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scan QR Code (NIP)</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={qrMode === "masuk" ? "default" : "outline"}
                      onClick={() => {
                        setQrMode("masuk");
                        setScanError("");
                      }}
                      className="cursor-pointer"
                    >
                      Presensi Masuk
                    </Button>
                    <Button
                      size="sm"
                      variant={qrMode === "pulang" ? "default" : "outline"}
                      onClick={() => {
                        setQrMode("pulang");
                        setScanError("");
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
                    placeholder="Klik di sini lalu tembak barcode/QR (NIP)..."
                    className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    onBlur={() => {
                      if (modeAktif === "qr") {
                        setTimeout(() => barcodeInputRef.current?.focus(), 150);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        e.currentTarget.value = "";
                        if (value) handleGuruScanSuccess(value);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pastikan kursor selalu ada di kolom ini sebelum menembakkan
                    scanner. Kolom ini otomatis fokus kembali secara berkala.
                  </p>
                </div>

                {!scanning && (
                  <div className="w-full h-[350px] rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Kamera belum aktif
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mode:{" "}
                        {qrMode === "masuk"
                          ? "Presensi Masuk"
                          : "Presensi Pulang"}
                      </p>
                    </div>
                  </div>
                )}

                <div
                  id="qr-reader-guru"
                  className="w-full rounded-lg overflow-hidden"
                />

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

                {scanError && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm font-medium">
                    ⚠️ {scanError}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {modeAktif === "darurat" ? (
            <DaruratGuru />
          ) : modeAktif === "manual" ? (
            <Card>
              <CardHeader>
                <CardTitle>Cari Guru / Kepala Sekolah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Cari nama atau NIP/email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {loading ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    Memuat...
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {filteredTargets.map((t) => {
                      const masukDone = sudahAbsen(t.key, "masuk");
                      const recordMasuk = todayRecords.find(
                        (r) => r.key === t.key && r.jenis === "masuk",
                      );
                      return (
                        <div
                          key={t.key}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            masukDone
                              ? "bg-muted/50 opacity-70"
                              : "bg-background",
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {t.nama}{" "}
                              {t.peran === "kepala_sekolah" && (
                                <Badge variant="secondary" className="ml-1">
                                  Kepala Sekolah
                                </Badge>
                              )}
                              {t.peran === "tu" && (
                                <Badge variant="secondary" className="ml-1">
                                  TU
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.nip_email}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {masukDone ? (
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-medium",
                                  statusColor[recordMasuk?.status || "hadir"],
                                )}
                              >
                                {statusLabel[recordMasuk?.status || "hadir"]}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    saveAbsensi(t, "masuk", "hadir")
                                  }
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                                >
                                  Hadir
                                </button>
                                <button
                                  onClick={() =>
                                    saveAbsensi(t, "masuk", "terlambat")
                                  }
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors cursor-pointer"
                                >
                                  Terlambat
                                </button>
                                <button
                                  onClick={() =>
                                    saveAbsensi(t, "masuk", "izin")
                                  }
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                  Izin
                                </button>
                                <button
                                  onClick={() =>
                                    saveAbsensi(t, "masuk", "sakit")
                                  }
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer"
                                >
                                  Sakit
                                </button>
                                <button
                                  onClick={() =>
                                    saveAbsensi(t, "masuk", "alfa")
                                  }
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors cursor-pointer"
                                >
                                  Alfa
                                </button>
                                <button
                                  onClick={() => saveAbsensi(t, "masuk", "ts")}
                                  disabled={submitting}
                                  className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition-colors cursor-pointer"
                                >
                                  TS
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredTargets.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-6">
                        Tidak ada data ditemukan.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
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
                  label: "TS",
                  value: totalTS,
                  color: "bg-purple-100 text-purple-700",
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
                    {modeAktif === "darurat"
                      ? "⚡ Mode Darurat"
                      : modeAktif === "manual"
                        ? "📝 Input Manual"
                        : qrMode === "masuk"
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
                    "Peran",
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
                {riwayatRows.map((row, index) => (
                  <tr
                    key={row.key}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{row.nama}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.peran === "kepala_sekolah"
                        ? "Kepala Sekolah"
                        : row.peran === "tu"
                          ? "TU"
                          : "Guru"}
                    </td>
                    <td className="py-3 px-4">{row.jamMasuk || "-"}</td>
                    <td className="py-3 px-4">{row.jamPulang || "-"}</td>
                    <td className="py-3 px-4">
                      {row.status ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            statusColor[row.status],
                          )}
                        >
                          {statusLabel[row.status] || row.status}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {riwayatRows.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Belum ada presensi hari ini
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingTarget}
        onOpenChange={(open) => !open && setPendingTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pilih Status Manual
            </DialogTitle>
            <DialogDescription>
              {pendingTarget?.peran === "kepala_sekolah" ||
              pendingTarget?.peran === "tu"
                ? "Kepala Sekolah/TU tidak punya jadwal otomatis. Pilih status presensi secara manual."
                : `${pendingTarget?.nama} tidak ada jadwal mengajar hari ini. Pilih status presensi secara manual.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setManualStatus(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm border transition-colors cursor-pointer",
                  manualStatus === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleConfirmManual}
            disabled={submitting}
            className="w-full cursor-pointer"
          >
            {submitting ? "Menyimpan..." : "Simpan Presensi"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
