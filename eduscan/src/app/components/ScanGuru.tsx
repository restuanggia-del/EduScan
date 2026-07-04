import { useState, useEffect } from "react";
import { Search, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { DaruratGuru } from "./DaruratGuru";

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
  peran: "guru" | "kepala_sekolah";
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
  const [showDarurat, setShowDarurat] = useState(false);
  const [search, setSearch] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecords, setTodayRecords] = useState<
    { key: string; status: string; jam: string; jenis: "masuk" | "pulang" }[]
  >([]);

  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [pendingMode, setPendingMode] = useState<"masuk" | "pulang">("masuk");
  const [manualStatus, setManualStatus] = useState<StatusGuru>("hadir");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTargets();
    fetchTodayRecords();
  }, []);

  const fetchTargets = async () => {
    setLoading(true);

    const { data: guruData } = await supabase
      .from("guru")
      .select("id, nama, nip, user_id")
      .order("nama");

    const { data: ksData } = await supabase
      .from("users")
      .select("id, nama, email")
      .eq("role", "kepala_sekolah");

    const guruTargets: Target[] = (guruData || []).map((g) => ({
      key: g.id,
      nama: g.nama,
      nip_email: g.nip || "-",
      peran: "guru",
      guru_id: g.id,
      user_id: g.user_id,
    }));

    const ksTargets: Target[] = (ksData || []).map((u) => ({
      key: u.id,
      nama: u.nama,
      nip_email: u.email,
      peran: "kepala_sekolah",
      guru_id: null,
      user_id: u.id,
    }));

    setTargets([...ksTargets, ...guruTargets]);
    setLoading(false);
  };

  const fetchTodayRecords = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("absensi_guru")
      .select("*")
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false });

    if (error) {
      console.error("Gagal memuat absensi guru hari ini:", error.message);
      return;
    }

    const records = (data || []).map((a) => {
      const d = new Date(a.waktu_scan);
      const jam = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`;
      return {
        key: a.guru_id || a.user_id,
        status: a.status,
        jam,
        jenis: a.status === "pulang" ? ("pulang" as const) : ("masuk" as const),
      };
    });
    setTodayRecords(records);
  };

  const sudahAbsen = (key: string, jenis: "masuk" | "pulang") =>
    todayRecords.some((r) => r.key === key && r.jenis === jenis);

  const filteredTargets = targets.filter(
    (t) =>
      t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.nip_email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAbsenMasukClick = async (target: Target) => {
    if (sudahAbsen(target.key, "masuk")) {
      toast.error(`${target.nama} sudah absen masuk hari ini!`);
      return;
    }

    if (target.peran === "kepala_sekolah") {
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
      toast.error(`${target.nama} belum absen masuk hari ini!`);
      return;
    }
    if (sudahAbsen(target.key, "pulang")) {
      toast.error(`${target.nama} sudah absen pulang hari ini!`);
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
    const today = new Date().toISOString().split("T")[0];

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
      toast.error("Gagal mencatat absensi: " + error.message);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Scan Absensi Guru
          </h2>
          <p className="text-muted-foreground">
            Absensi untuk Guru & Kepala Sekolah. Status Hadir/Terlambat dihitung
            otomatis berdasarkan jadwal mengajar.
          </p>
        </div>
        <Button
          variant={showDarurat ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            showDarurat && "bg-amber-500 hover:bg-amber-600 border-amber-500",
          )}
          onClick={() => setShowDarurat((v) => !v)}
        >
          <Zap className="w-4 h-4 mr-1" />
          {showDarurat ? "Tutup Mode Darurat" : "Mode Darurat"}
        </Button>
      </div>

      {showDarurat ? (
        <DaruratGuru />
      ) : (
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
                  const pulangDone = sudahAbsen(t.key, "pulang");
                  return (
                    <div
                      key={t.key}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {t.nama}{" "}
                          {t.peran === "kepala_sekolah" && (
                            <Badge variant="secondary" className="ml-1">
                              Kepala Sekolah
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.nip_email}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={masukDone ? "outline" : "default"}
                          disabled={masukDone}
                          className="cursor-pointer"
                          onClick={() => handleAbsenMasukClick(t)}
                        >
                          {masukDone ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" /> Masuk
                            </>
                          ) : (
                            "Absen Masuk"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant={pulangDone ? "outline" : "secondary"}
                          disabled={pulangDone || !masukDone}
                          className="cursor-pointer"
                          onClick={() => handleAbsenPulangClick(t)}
                        >
                          {pulangDone ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" /> Pulang
                            </>
                          ) : (
                            "Absen Pulang"
                          )}
                        </Button>
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
      )}

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
              {pendingTarget?.peran === "kepala_sekolah"
                ? "Kepala Sekolah tidak punya jadwal otomatis. Pilih status absensi secara manual."
                : `${pendingTarget?.nama} tidak ada jadwal mengajar hari ini. Pilih status absensi secara manual.`}
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
            {submitting ? "Menyimpan..." : "Simpan Absensi"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
