import { useState, useEffect } from "react";
import { Download, FileText, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { cn } from "./ui/utils";

interface RekapGuruData {
  key: string;
  nama: string;
  nip: string;
  peran: "guru_biasa" | "wali_kelas" | "kepala_sekolah" | "tu";
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alfa: number;
  ts: number;
  total: number;
}

const peranLabel: Record<string, string> = {
  kepala_sekolah: "Kepala Sekolah (KS)",
  tu: "TU",
  guru_biasa: "Guru Biasa",
  wali_kelas: "Guru Wali Kelas",
};

type FilterType = "harian" | "mingguan" | "bulanan" | "semester" | "tahunan";

export function RekapGuru() {
  const [filterType, setFilterType] = useState<FilterType>("harian");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [rekapData, setRekapData] = useState<RekapGuruData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRekap();
  }, [filterType, selectedDate]);

  const getDateRange = () => {
    const date = new Date(selectedDate);

    if (filterType === "harian") {
      return { start: selectedDate, end: selectedDate };
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
    setLoading(true);
    const { start, end } = getDateRange();

    const { error: rpcError } = await supabase.rpc("fn_generate_rekap_guru", {
      p_jenis_periode: filterType,
      p_periode_awal: start,
      p_periode_akhir: end,
    });

    if (rpcError) {
      console.error("Gagal generate rekap guru:", rpcError.message);
    }

    const { data, error } = await supabase
      .from("rekap_absensi_guru")
      .select("*, guru(nama), users(nama)")
      .eq("jenis_periode", filterType)
      .eq("periode_awal", start)
      .eq("periode_akhir", end);

    if (error) {
      console.error("Gagal memuat rekap guru:", error.message);
      setRekapData([]);
      setLoading(false);
      return;
    }

    const rows: RekapGuruData[] = (data || []).map((r: any) => ({
      key: r.guru_id || r.user_id,
      nama: r.guru?.nama || r.users?.nama || "-",
      nip: r.nip || "-",
      peran: r.peran,
      hadir: r.hadir,
      terlambat: r.terlambat,
      izin: r.izin,
      sakit: r.sakit,
      alfa: r.alfa,
      ts: r.ts,
      total: r.total,
    }));

    rows.sort((a, b) => a.nama.localeCompare(b.nama));
    setRekapData(rows);
    setLoading(false);
  };

  const filteredRekap = rekapData.filter(
    (r) =>
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nip.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalHadir = rekapData.reduce((acc, r) => acc + r.hadir, 0);
  const totalTerlambat = rekapData.reduce((acc, r) => acc + r.terlambat, 0);
  const totalIzin = rekapData.reduce((acc, r) => acc + r.izin, 0);
  const totalSakit = rekapData.reduce((acc, r) => acc + r.sakit, 0);
  const totalAlfa = rekapData.reduce((acc, r) => acc + r.alfa, 0);
  const totalTs = rekapData.reduce((acc, r) => acc + r.ts, 0);

  const handleExportExcel = () => {
    const { start, end } = getDateRange();
    const headers = [
      "No",
      "NIP",
      "Nama",
      "Peran",
      "Hadir",
      "Terlambat",
      "Izin",
      "Sakit",
      "Alfa",
      "TS",
      "Total",
    ];
    const rows = filteredRekap.map((r, i) => [
      i + 1,
      r.nip,
      r.nama,
      peranLabel[r.peran] || r.peran,
      r.hadir,
      r.terlambat,
      r.izin,
      r.sakit,
      r.alfa,
      r.ts,
      r.total,
    ]);

    const csvContent = [
      `Rekap Presensi Guru & Kepala Sekolah - EduScan`,
      `Periode: ${start} s/d ${end}`,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-presensi-guru-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Rekap Presensi Guru & Kepala Sekolah
          </h2>
          <p className="text-muted-foreground">
            Laporan kehadiran guru & KS berdasarkan periode
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

      <Card>
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

            <div className="space-y-2 max-w-xs">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
            value: totalTs,
            color: "bg-purple-100 text-purple-700",
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Rekap Guru & KS</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP..."
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
            <div className="overflow-x-auto print-area">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      NIP
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Peran
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-purple-600">
                      TS
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRekap.map((r, index) => (
                    <tr
                      key={r.key}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{r.nip}</td>
                      <td className="py-3 px-4 font-medium">{r.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {peranLabel[r.peran] || r.peran}
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
                      <td className="py-3 px-4 text-center">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-sm font-medium">
                          {r.ts}
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
