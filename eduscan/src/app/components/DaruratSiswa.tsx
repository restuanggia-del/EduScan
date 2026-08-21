import { useState, useEffect } from "react";
import { AlertTriangle, Zap, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface BelumAbsenSiswa {
  siswa_id: string;
  nama: string;
  kelas_id: string;
  nama_kelas: string;
  no_wa: string | null;
}

type StatusManual = "izin" | "sakit" | "alfa";

interface ReviewRow extends BelumAbsenSiswa {
  checked: boolean;
  manualStatus: StatusManual;
  keterangan: string;
}

const MANUAL_OPTIONS: { value: StatusManual; label: string }[] = [
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alfa", label: "Alfa" },
];

export function DaruratSiswa() {
  const [tipe, setTipe] = useState<"proaktif" | "reaktif">("proaktif");
  const [jamMulai, setJamMulai] = useState("07:00");
  const [jamSelesai, setJamSelesai] = useState("08:00");

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    fetchKelas();
  }, []);

  const fetchKelas = async () => {
    const { data } = await supabase
      .from("kelas")
      .select("id, nama_kelas")
      .order("nama_kelas");
    if (data) setKelasList(data);
  };

  const toggleKelas = (id: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const isSemuaKelasDipilih = selectedKelasIds.length === 0;

  const handleTampilkanDaftar = async () => {
    if (tipe === "proaktif" && (!jamMulai || !jamSelesai)) {
      toast.error("Isi rentang jam terlebih dahulu.");
      return;
    }

    setLoadingList(true);
    setHasLoadedOnce(true);

    const { data, error } = await supabase.rpc("get_belum_absen_siswa", {
      p_kelas_ids: isSemuaKelasDipilih ? null : selectedKelasIds,
    });

    setLoadingList(false);

    if (error) {
      toast.error("Gagal memuat daftar: " + error.message);
      return;
    }

    const newRows: ReviewRow[] = (data || []).map((d: BelumAbsenSiswa) => ({
      ...d,
      checked: true,
      manualStatus: "alfa",
      keterangan: "",
    }));
    setRows(newRows);
  };

  const toggleRow = (siswaId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.siswa_id === siswaId ? { ...r, checked: !r.checked } : r,
      ),
    );
  };

  const updateManualStatus = (siswaId: string, status: StatusManual) => {
    setRows((prev) =>
      prev.map((r) =>
        r.siswa_id === siswaId ? { ...r, manualStatus: status } : r,
      ),
    );
  };

  const updateKeterangan = (siswaId: string, keterangan: string) => {
    setRows((prev) =>
      prev.map((r) => (r.siswa_id === siswaId ? { ...r, keterangan } : r)),
    );
  };

  const hadirRows = rows.filter((r) => r.checked);
  const manualRows = rows.filter((r) => !r.checked);

  const groupedByKelas = rows.reduce<Record<string, ReviewRow[]>>((acc, r) => {
    const key = r.nama_kelas || "Tanpa Kelas";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

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
      const { error } = await supabase.rpc("submit_hadir_massal_siswa", {
        p_siswa_ids: hadirRows.map((r) => r.siswa_id),
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
      const { error } = await supabase.from("absensi_siswa").insert({
        siswa_id: r.siswa_id,
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
      `Data tersimpan — ${hadirRows.length} siswa Hadir, ${manualRows.length} siswa manual. Akan otomatis muncul di rekap grup WhatsApp kelas masing-masing.`,
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

          <div>
            <label className="text-sm font-medium block mb-2">
              Kelas (kosongkan = semua kelas)
            </label>
            <div className="flex flex-wrap gap-2">
              {kelasList.map((k) => (
                <button
                  key={k.id}
                  onClick={() => toggleKelas(k.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                    selectedKelasIds.includes(k.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted",
                  )}
                >
                  {k.nama_kelas}
                </button>
              ))}
            </div>
          </div>

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
              {manualRows.length > 0 &&
                `, ${manualRows.length} manual (Izin/Sakit/Alfa)`}
              )
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {rows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Semua siswa di cakupan ini sudah tercatat presensi hari ini.
              </div>
            )}

            {Object.entries(groupedByKelas).map(([namaKelas, kelasRows]) => (
              <div key={namaKelas}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  {namaKelas} ({kelasRows.filter((r) => r.checked).length} dari{" "}
                  {kelasRows.length} Hadir)
                </h4>
                <div className="space-y-1">
                  {kelasRows.map((r) => (
                    <div key={r.siswa_id} className="border rounded-lg p-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleRow(r.siswa_id)}
                          className="cursor-pointer flex-shrink-0"
                        >
                          {r.checked ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-sm font-medium flex-1">
                          {r.nama}
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
                              onClick={() =>
                                updateManualStatus(r.siswa_id, opt.value)
                              }
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
                              updateKeterangan(r.siswa_id, e.target.value)
                            }
                            className="flex-1 min-w-[160px] border border-input rounded-md px-2 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {rows.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
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
