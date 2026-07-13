import { useState, useEffect, useRef } from "react";
import { Download, FileText, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { cn } from "./ui/utils";
import { printElement } from "../../lib/printWindow";
import { downloadRekapPdf } from "../../lib/exportTablePdf";
import { downloadRekapExcel } from "../../lib/exportExcel";

interface RekapData {
  siswaId: string;
  nama: string;
  nisn: string;
  kelas: string;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alfa: number;
  total: number;
}

type FilterType = "harian" | "mingguan" | "bulanan" | "semester" | "tahunan";

export function RekapSiswa() {
  const { user } = useAuth();
  const isGWK = user?.role === "guru";

  const [filterType, setFilterType] = useState<FilterType>("harian");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedKelas, setSelectedKelas] = useState("");
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [rekapData, setRekapData] = useState<RekapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kelasSendiri, setKelasSendiri] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    fetchRekap();
  }, [filterType, selectedDate, selectedKelas, kelasSendiri]);

  const initData = async () => {
    if (isGWK) {
      const { data: guruRow } = await supabase
        .from("guru")
        .select("kelas_id, kelas:kelas_id(nama_kelas)")
        .eq("user_id", user?.id)
        .single();

      const namaKelasSendiri = (guruRow as any)?.kelas?.nama_kelas || null;
      setKelasSendiri(namaKelasSendiri);
      setSelectedKelas(namaKelasSendiri || "");
    } else {
      fetchKelas();
    }
  };

  useEffect(() => {
    fetchRekap();
  }, [filterType, selectedDate, selectedKelas]);

  const fetchKelas = async () => {
    const { data } = await supabase
      .from("siswa")
      .select("kelas")
      .order("kelas");
    if (data) {
      const unique = [...new Set(data.map((s) => s.kelas))];
      setKelasList(unique);
    }
  };

  const getDateRange = () => {
    const date = new Date(selectedDate);

    if (filterType === "harian") {
      return {
        start: selectedDate,
        end: selectedDate,
      };
    }

    if (filterType === "mingguan") {
      const day = date.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(date);
      monday.setDate(date.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split("T")[0],
        end: sunday.toISOString().split("T")[0],
      };
    }

    if (filterType === "bulanan") {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }

    if (filterType === "semester") {
      const month = date.getMonth();
      const isSem1 = month < 6;
      const start = new Date(date.getFullYear(), isSem1 ? 0 : 6, 1);
      const end = new Date(date.getFullYear(), isSem1 ? 6 : 12, 0);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }

    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const fetchRekap = async () => {
    if (isGWK && !kelasSendiri) return;
    setLoading(true);
    const { start, end } = getDateRange();

    let siswaQuery = supabase.from("siswa").select("id, nama, nisn, kelas");
    if (selectedKelas) siswaQuery = siswaQuery.eq("kelas", selectedKelas);
    const { data: siswaData } = await siswaQuery.order("nama");

    if (!siswaData) {
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("fn_generate_rekap_siswa", {
      p_jenis_periode: filterType,
      p_periode_awal: start,
      p_periode_akhir: end,
    });

    if (rpcError) {
      console.error("Gagal generate rekap siswa:", rpcError.message);
    }

    const siswaIds = siswaData.map((s) => s.id);
    const { data: rekapRows, error } = await supabase
      .from("rekap_absensi_siswa")
      .select("*")
      .eq("jenis_periode", filterType)
      .eq("periode_awal", start)
      .eq("periode_akhir", end)
      .in("siswa_id", siswaIds);

    if (error) {
      console.error("Gagal memuat rekap siswa:", error.message);
    }

    const rekap: RekapData[] = siswaData.map((siswa) => {
      const row = (rekapRows || []).find((r) => r.siswa_id === siswa.id);
      return {
        siswaId: siswa.id,
        nama: siswa.nama,
        nisn: siswa.nisn,
        kelas: siswa.kelas,
        hadir: row?.hadir || 0,
        terlambat: row?.terlambat || 0,
        izin: row?.izin || 0,
        sakit: row?.sakit || 0,
        alfa: row?.alfa || 0,
        total: row?.total || 0,
      };
    });

    setRekapData(rekap);
    setLoading(false);
  };

  const filteredRekap = rekapData.filter(
    (r) =>
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nisn.includes(searchQuery) ||
      r.kelas.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalHadir = rekapData.reduce((acc, r) => acc + r.hadir, 0);
  const totalTerlambat = rekapData.reduce((acc, r) => acc + r.terlambat, 0);
  const totalIzin = rekapData.reduce((acc, r) => acc + r.izin, 0);
  const totalSakit = rekapData.reduce((acc, r) => acc + r.sakit, 0);
  const totalAlfa = rekapData.reduce((acc, r) => acc + r.alfa, 0);

  const handleExportExcel = async () => {
    const { start, end } = getDateRange();

    await downloadRekapExcel({
      title: "Rekap Presensi Siswa - EduScan",
      subtitleLines: [
        `Periode: ${filterLabels[filterType]} (${start} s/d ${end}) \u00b7 Kelas: ${
          selectedKelas || "Semua Kelas"
        } \u00b7 Diunduh: ${new Date().toLocaleDateString("id-ID")}`,
        `Total Hadir: ${totalHadir} \u00b7 Terlambat: ${totalTerlambat} \u00b7 Izin: ${totalIzin} \u00b7 Sakit: ${totalSakit} \u00b7 Alfa: ${totalAlfa}`,
      ],
      head: [
        "No",
        "NISN",
        "Nama",
        "Kelas",
        "Hadir",
        "Terlambat",
        "Izin",
        "Sakit",
        "Alfa",
        "Total",
      ],
      body: filteredRekap.map((r, i) => [
        i + 1,
        r.nisn,
        r.nama,
        r.kelas,
        r.hadir,
        r.terlambat,
        r.izin,
        r.sakit,
        r.alfa,
        r.total,
      ]),
      filename: `rekap-presensi-siswa-${start}-${end}.xlsx`,
      sheetName: "Rekap Siswa",
    });
  };

  const handleExportPDF = () => {
    const { start, end } = getDateRange();

    downloadRekapPdf({
      title: "Rekap Presensi Siswa",
      subtitleLines: [
        `Periode: ${filterLabels[filterType]} (${start} s/d ${end}) \u00b7 Kelas: ${
          selectedKelas || "Semua Kelas"
        } \u00b7 Dicetak: ${new Date().toLocaleDateString("id-ID")}`,
        `Total Hadir: ${totalHadir} \u00b7 Terlambat: ${totalTerlambat} \u00b7 Izin: ${totalIzin} \u00b7 Sakit: ${totalSakit} \u00b7 Alfa: ${totalAlfa}`,
      ],
      head: [
        "No",
        "NISN",
        "Nama",
        "Kelas",
        "Hadir",
        "Terlambat",
        "Izin",
        "Sakit",
        "Alfa",
        "Total",
      ],
      body: filteredRekap.map((r, i) => [
        i + 1,
        r.nisn,
        r.nama,
        r.kelas,
        r.hadir,
        r.terlambat,
        r.izin,
        r.sakit,
        r.alfa,
        r.total,
      ]),
      filename: `rekap-presensi-siswa-${start}-${end}.pdf`,
    });
  };

  const { start, end } = getDateRange();

  const filterLabels: Record<FilterType, string> = {
    harian: "Harian",
    mingguan: "Mingguan",
    bulanan: "Bulanan",
    semester: "Semester",
    tahunan: "Tahunan",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Rekap Presensi</h2>
          <p className="text-muted-foreground">
            Laporan kehadiran siswa berdasarkan periode
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button onClick={handleExportPDF} className="cursor-pointer">
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Periode</Label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    "harian",
                    "mingguan",
                    "bulanan",
                    "semester",
                    "tahunan",
                  ] as FilterType[]
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors cursor-pointer",
                      filterType === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-muted",
                    )}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Acuan</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Periode: {start} s/d {end}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Kelas</Label>
                {isGWK ? (
                  <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm">
                    {kelasSendiri || "Memuat..."}
                  </div>
                ) : (
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                  >
                    <option value="">Semua Kelas</option>
                    {kelasList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                )}
                {isGWK && (
                  <p className="text-xs text-muted-foreground">
                    Guru Wali Kelas hanya bisa melihat rekap kelasnya sendiri.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
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
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={cn("rounded-lg p-3 text-center", stat.color)}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-medium">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="no-print">
          <div className="flex items-center justify-between">
            <CardTitle>Data Rekap Siswa</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NISN, kelas..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Memuat data rekap...</p>
            </div>
          ) : (
            <div ref={printRef} className="overflow-x-auto print-area">
              <div className="print-header">
                <h3 className="font-bold text-lg">Rekap Presensi Siswa</h3>
                <p className="text-sm">
                  Periode: {filterLabels[filterType]} ({start} s/d {end})
                  &middot; Kelas: {selectedKelas || "Semua Kelas"} &middot;
                  Dicetak: {new Date().toLocaleDateString("id-ID")}
                </p>
                <p className="text-sm">
                  Total Hadir: {totalHadir} &middot; Terlambat: {totalTerlambat}{" "}
                  &middot; Izin: {totalIzin} &middot; Sakit: {totalSakit}{" "}
                  &middot; Alfa: {totalAlfa}
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      NISN
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Kelas
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-primary">
                      Hadir
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-amber-600">
                      Terlambat
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">
                      Izin
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-green-600">
                      Sakit
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-destructive">
                      Alfa
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRekap.map((r, index) => (
                    <tr
                      key={r.siswaId}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{r.nisn}</td>
                      <td className="py-3 px-4 font-medium">{r.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {r.kelas}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.hadir}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.terlambat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.izin}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.sakit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.alfa}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRekap.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Tidak ada data presensi pada periode ini
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
