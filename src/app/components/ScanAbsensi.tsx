import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  CheckCircle,
  Clock,
  School,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

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

const dummyStudents = [
  { id: "1", nama: "Ahmad Fauzi", nisn: "1234567890", kelas: "XII IPA 1" },
  { id: "2", nama: "Siti Nurhaliza", nisn: "1234567891", kelas: "XI IPA 2" },
  { id: "3", nama: "Budi Santoso", nisn: "1234567892", kelas: "X IPS 1" },
  { id: "4", nama: "Dewi Lestari", nisn: "1234567893", kelas: "XII IPS 2" },
  { id: "5", nama: "Andi Wijaya", nisn: "1234567894", kelas: "XI IPA 1" },
];

const JAM_BATAS_MASUK = "07:30";

export function ScanAbsensi() {
  const [mode, setMode] = useState<"masuk" | "pulang">("masuk");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<AbsensiRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [absensiRecords, setAbsensiRecords] = useState<AbsensiRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

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

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString("id-ID");
  };

  const isLate = (jamMasuk: string) => {
    const [hourMasuk, minuteMasuk] = jamMasuk.split(":").map(Number);
    const [hourBatas, minuteBatas] = JAM_BATAS_MASUK.split(":").map(Number);

    const timeMasuk = hourMasuk * 60 + minuteMasuk;
    const timeBatas = hourBatas * 60 + minuteBatas;

    return timeMasuk > timeBatas;
  };

  const sendWhatsAppNotification = async (
    record: AbsensiRecord,
    notifType: "masuk" | "pulang" | "terlambat",
  ) => {
    console.log("Sending WhatsApp notification:", notifType, record);

    let message = "";
    if (notifType === "masuk") {
      message = `Ananda ${record.nama} telah hadir di sekolah pada pukul ${record.jamMasuk} WIB.\n\nSMAN 1 Bandar Lampung`;
    } else if (notifType === "terlambat") {
      message = `Ananda ${record.nama} terlambat masuk sekolah.\n\nJam Masuk:\n${record.jamMasuk} WIB\n\nSMAN 1 Bandar Lampung`;
    } else if (notifType === "pulang") {
      message = `Ananda ${record.nama} telah meninggalkan sekolah pada pukul ${record.jamPulang} WIB.\n\nSMAN 1 Bandar Lampung`;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      const student = dummyStudents.find((s) => s.id === data.id);

      if (!student) {
        setErrorMessage("Siswa tidak ditemukan!");
        return;
      }

      const today = getCurrentDate();
      const existingRecord = absensiRecords.find(
        (r) => r.studentId === data.id && r.tanggal === today,
      );

      if (mode === "masuk") {
        if (existingRecord?.jamMasuk) {
          setErrorMessage("Siswa sudah absen masuk hari ini!");
          return;
        }

        const jamMasuk = getCurrentTime();
        const status = isLate(jamMasuk) ? "terlambat" : "hadir";

        const newRecord: AbsensiRecord = {
          id: Date.now().toString(),
          studentId: data.id,
          nama: student.nama,
          nisn: student.nisn,
          kelas: student.kelas,
          jamMasuk,
          status,
          tanggal: today,
        };

        setAbsensiRecords([...absensiRecords, newRecord]);
        setLastScan(newRecord);
        setShowSuccess(true);
        playSuccessSound();

        sendWhatsAppNotification(
          newRecord,
          status === "terlambat" ? "terlambat" : "masuk",
        );

        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        if (!existingRecord) {
          setErrorMessage("Siswa belum absen masuk!");
          return;
        }

        if (existingRecord.jamPulang) {
          setErrorMessage("Siswa sudah absen pulang hari ini!");
          return;
        }

        const jamPulang = getCurrentTime();
        const updatedRecord = {
          ...existingRecord,
          jamPulang,
          status: "pulang" as const,
        };

        setAbsensiRecords(
          absensiRecords.map((r) =>
            r.id === existingRecord.id ? updatedRecord : r,
          ),
        );
        setLastScan(updatedRecord);
        setShowSuccess(true);
        playSuccessSound();

        sendWhatsAppNotification(updatedRecord, "pulang");

        setTimeout(() => setShowSuccess(false), 5000);
      }

      setErrorMessage("");
    } catch (error) {
      console.error("Error processing QR code:", error);
      setErrorMessage("Format QR code tidak valid!");
    }
  };

  const startScanning = async () => {
    try {
      if (!qrReaderRef.current) return;

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        undefined,
      );

      setScanning(true);
      setErrorMessage("");
    } catch (err) {
      console.error("Error starting scanner:", err);
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
        console.error("Error stopping scanner:", err);
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

  const todayRecords = absensiRecords.filter(
    (r) => r.tanggal === getCurrentDate(),
  );

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
                    onClick={() => {
                      setMode("masuk");
                      if (scanning) {
                        stopScanning().then(() => startScanning());
                      }
                    }}
                  >
                    Absen Masuk
                  </Button>
                  <Button
                    variant={mode === "pulang" ? "default" : "outline"}
                    onClick={() => {
                      setMode("pulang");
                      if (scanning) {
                        stopScanning().then(() => startScanning());
                      }
                    }}
                  >
                    Absen Pulang
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div
                  id="qr-reader"
                  ref={qrReaderRef}
                  className={cn(
                    "w-full rounded-lg overflow-hidden bg-muted",
                    !scanning && "h-[400px] flex items-center justify-center",
                  )}
                >
                  {!scanning && (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Kamera belum aktif
                      </p>
                    </div>
                  )}
                </div>

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
                  <p className="text-muted-foreground">{JAM_BATAS_MASUK} WIB</p>
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
            </CardContent>
          </Card>
        </div>
      </div>

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
