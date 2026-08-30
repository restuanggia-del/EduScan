import { useState } from "react";
import { AlertTriangle, Zap, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { supabase } from "../../services/supabaseClient";
import { toast } from "sonner";

interface BelumAbsenGuru {
  user_id: string;
  guru_id: string | null;
  nama: string;
  role: "guru" | "kepala_sekolah";
}

type StatusManual = "izin" | "sakit" | "alfa" | "ts";

interface ReviewRow extends BelumAbsenGuru {
  checked: boolean;
  manualStatus: StatusManual;
  keterangan: string;
}

const MANUAL_OPTIONS: { value: StatusManual; label: string }[] = [
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alfa", label: "Alfa" },
  { value: "ts", label: "TS" },
];

export function DaruratGuru() {
  const [tipe, setTipe] = useState<"proaktif" | "reaktif">("proaktif");
  const [jamMulai, setJamMulai] = useState("07:00");
  const [jamSelesai, setJamSelesai] = useState("08:00");

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleTampilkanDaftar = async () => {
    if (tipe === "proaktif" && (!jamMulai || !jamSelesai)) {
      toast.error("Isi rentang jam terlebih dahulu.");
      return;
    }

    setLoadingList(true);
    setHasLoadedOnce(true);

    const { data, error } = await supabase.rpc("get_belum_absen_guru", {
      p_user_ids: null,
    });

    setLoadingList(false);

    if (error) {
      toast.error("Gagal memuat daftar: " + error.message);
      return;
    }

    const newRows: ReviewRow[] = (data || []).map((d: BelumAbsenGuru) => ({
      ...d,
      checked: true,
      manualStatus: "alfa",
      keterangan: "",
    }));
    setRows(newRows);
  };

  const toggleRow = (userId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.user_id === userId ? { ...r, checked: !r.checked } : r,
      ),
    );
  };

  const updateManualStatus = (userId: string, status: StatusManual) => {
    setRows((prev) =>
      prev.map((r) =>
        r.user_id === userId ? { ...r, manualStatus: status } : r,
      ),
    );
  };

  const updateKeterangan = (userId: string, keterangan: string) => {
    setRows((prev) =>
      prev.map((r) => (r.user_id === userId ? { ...r, keterangan } : r)),
    );
  };

  const hadirRows = rows.filter((r) => r.checked);
  const manualRows = rows.filter((r) => !r.checked);

  const handleKonfirmasi = async () => {
    if (rows.length === 0) return;

    setSubmitting(true);

    const sumberInput =
      tipe === "proaktif" ? "darurat_massal" : "darurat_selesaikan";
    const keterangan =
      tipe === "proaktif"
        ? `Input massal — mati lampu ${jamMulai}-${jamSelesai}`
        : "Diselesaikan otomatis — mati lampu";

    if (hadirRows.length > 0) {
      const { error } = await supabase.rpc("submit_hadir_massal_guru", {
        p_user_ids: hadirRows.map((r) => r.user_id),
        p_keterangan: keterangan,
        p_sumber_input: sumberInput,
      });

      if (error) {
        toast.error("Gagal menyimpan data Hadir massal: " + error.message);
        setSubmitting(false);
        return;
      }
    }

    for (const r of manualRows) {
      const { error } = await supabase.from("absensi_guru").insert({
        guru_id: r.guru_id,
        user_id: r.user_id,
        peran: r.role,
        status: r.manualStatus,
        keterangan: r.keterangan || r.manualStatus,
        sumber_input: "manual",
      });
      if (error) {
        toast.error(`Gagal menyimpan ${r.nama}: ${error.message}`);
      }
    }

    setSubmitting(false);
    toast.success(
      `Selesai — ${hadirRows.length} Hadir, ${manualRows.length} manual.`,
    );
    setRows([]);
    setHasLoadedOnce(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-300 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Zap className="w-5 h-5" />
            Mode Darurat — Mati Lampu / Gangguan Teknis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tidak ada notifikasi WA yang dikirim untuk presensi guru/kepala
            sekolah — hasil hanya masuk ke rekap internal.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setTipe("proaktif");
                setRows([]);
                setHasLoadedOnce(false);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                tipe === "proaktif"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-input hover:bg-muted",
              )}
            >
              Proaktif — Set Massal per Rentang Jam
            </button>
            <button
              onClick={() => {
                setTipe("reaktif");
                setRows([]);
                setHasLoadedOnce(false);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                tipe === "reaktif"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-input hover:bg-muted",
              )}
            >
              Reaktif — Selesaikan Presensi
            </button>
          </div>

          {tipe === "proaktif" && (
            <div className="flex gap-4 items-end">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className="border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={jamSelesai}
                  onChange={(e) => setJamSelesai(e.target.value)}
                  className="border border-input rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleTampilkanDaftar}
            disabled={loadingList}
            className="cursor-pointer"
          >
            {loadingList ? "Memuat..." : "Tampilkan Daftar"}
          </Button>
        </CardContent>
      </Card>

      {hasLoadedOnce && (
        <Card>
          <CardHeader>
            <CardTitle>
              Review Daftar ({hadirRows.length} akan ditandai Hadir
              {manualRows.length > 0 && `, ${manualRows.length} manual`})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {rows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Semua guru/KS sudah tercatat presensi hari ini.
              </div>
            )}

            {rows.map((r) => (
              <div key={r.user_id} className="border rounded-lg p-2.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRow(r.user_id)}
                    className="cursor-pointer flex-shrink-0"
                  >
                    {r.checked ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <span className="text-sm font-medium flex-1">
                    {r.nama}{" "}
                    {r.role === "kepala_sekolah" && (
                      <Badge variant="secondary" className="ml-1">
                        Kepala Sekolah
                      </Badge>
                    )}
                  </span>
                  {r.checked ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Hadir
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                      Dikecualikan
                    </span>
                  )}
                </div>

                {!r.checked && (
                  <div className="mt-2 ml-8 flex flex-wrap items-center gap-2">
                    {MANUAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateManualStatus(r.user_id, opt.value)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                          r.manualStatus === opt.value
                            ? "bg-secondary text-secondary-foreground border-secondary"
                            : "border-input hover:bg-muted",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <input
                      placeholder={
                        r.manualStatus === "alfa"
                          ? "Keterangan (opsional)"
                          : "Keterangan (wajib diisi)"
                      }
                      value={r.keterangan}
                      onChange={(e) =>
                        updateKeterangan(r.user_id, e.target.value)
                      }
                      className="flex-1 min-w-[160px] border border-input rounded-md px-2 py-1 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}

            {rows.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t mt-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Data yang sudah dikonfirmasi tidak bisa diubah lagi.
                </p>
                <Button
                  onClick={handleKonfirmasi}
                  disabled={
                    submitting ||
                    manualRows.some(
                      (r) => r.manualStatus !== "alfa" && !r.keterangan.trim(),
                    )
                  }
                  className="cursor-pointer"
                >
                  {submitting
                    ? "Menyimpan..."
                    : `Konfirmasi (${hadirRows.length} Hadir)`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
