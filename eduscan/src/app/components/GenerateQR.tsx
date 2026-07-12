import { useState, useEffect, useRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { printElement } from "../../lib/printWindow";
import { downloadCardsPdf } from "../../lib/exportPdf";

interface Student {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto?: string;
}

const CARDS_PER_PAGE = 4;

function chunkStudents(students: Student[], size: number): Student[][] {
  const pages: Student[][] = [];
  for (let i = 0; i < students.length; i += size) {
    pages.push(students.slice(i, i + size));
  }
  return pages;
}

interface StudentCardProps {
  student: Student;
}

function StudentCard({ student }: StudentCardProps) {
  const qrData = JSON.stringify({
    id: student.id,
    nisn: student.nisn,
    nama: student.nama,
    kelas: student.kelas,
  });

  return (
    <div className="qr-card bg-white rounded-lg border-2 border-primary overflow-hidden w-[300px]">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <School className="w-6 h-6 text-white" />
          <h3 className="text-white font-bold text-lg">SMK MMT</h3>
        </div>
        <p className="text-white/90 text-xs">Penawar Aji</p>
      </div>

      <div className="qr-card-body p-4 space-y-3">
        <div className="flex justify-center mb-3">
          {student.foto ? (
            <img
              src={student.foto}
              alt={student.nama}
              className="qr-card-photo w-24 h-24 rounded-lg object-cover border-2 border-primary"
            />
          ) : (
            <div className="qr-card-photo w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-primary">
              <School className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nama:</span>
            <p className="font-bold text-foreground">{student.nama}</p>
          </div>
          <div>
            <span className="text-muted-foreground">NISN:</span>
            <p className="font-bold text-foreground">{student.nisn}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Kelas:</span>
            <p className="font-bold text-foreground">{student.kelas}</p>
          </div>
        </div>

        <div className="qr-card-qr flex justify-center pt-3 border-t">
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={qrData} size={120} level="H" />
          </div>
        </div>

        <div className="text-center pt-2 border-t">
          <p className="qr-card-id text-xs text-muted-foreground">
            ID: {student.id}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GenerateQR() {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("siswa")
      .select("id, nama, nisn, kelas, foto_url")
      .order("kelas", { ascending: true });

    if (error) {
      console.error("Error fetching siswa:", error.message);
    } else if (data) {
      const mapped: Student[] = data.map((s) => ({
        id: s.id,
        nama: s.nama,
        nisn: s.nisn,
        kelas: s.kelas,
        foto: s.foto_url,
      }));
      setAllStudents(mapped);

      const uniqueKelas = [...new Set(mapped.map((s) => s.kelas))].sort();
      setKelasList(uniqueKelas);
    }

    setLoading(false);
  };

  const handleGenerateSingle = (student: Student) => {
    setSelectedStudents([student]);
  };

  const handleGenerateByKelas = () => {
    if (selectedKelas) {
      const filtered = allStudents.filter((s) => s.kelas === selectedKelas);
      setSelectedStudents(filtered);
    }
  };

  const handleGenerateAll = () => {
    setSelectedStudents(allStudents);
    setSelectedKelas("");
  };

  const handlePrint = () => {
    printElement(printRef.current, "Kartu QR Presensi Siswa - EduScan");
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const namaFile = `kartu-qr-${selectedKelas ? selectedKelas.replace(/\s+/g, "-") : "semua-siswa"}.pdf`;
      await downloadCardsPdf(printRef.current, namaFile, "landscape");
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      const pesan = err instanceof Error ? err.message : String(err);
      alert(`Gagal membuat PDF: ${pesan}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const displayedStudents = selectedKelas
    ? allStudents.filter((s) => s.kelas === selectedKelas)
    : allStudents;

  const printPages = useMemo(
    () => chunkStudents(selectedStudents, CARDS_PER_PAGE),
    [selectedStudents],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Generate Kartu QR Code
        </h2>
        <p className="text-muted-foreground">
          Generate dan cetak kartu siswa dengan QR Code
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <Card>
          <CardHeader>
            <CardTitle>Cetak Per Kelas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Kelas</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    {kelas}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full cursor-pointer"
              onClick={handleGenerateByKelas}
              disabled={!selectedKelas}
            >
              <Printer className="w-4 h-4" />
              Generate Kelas {selectedKelas}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cetak Semua Kartu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate kartu untuk seluruh siswa ({allStudents.length} siswa)
            </p>
            <Button
              className="w-full cursor-pointer"
              onClick={handleGenerateAll}
              disabled={loading}
            >
              <Printer className="w-4 h-4" />
              Generate Semua Kartu
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Info Generate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Siswa:</span>
                <span className="font-bold">{allStudents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Kelas:</span>
                <span className="font-bold">{kelasList.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dipilih:</span>
                <span className="font-bold">{selectedStudents.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Daftar Siswa</CardTitle>
              {selectedKelas && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                  Kelas: {selectedKelas}
                  <button
                    type="button"
                    onClick={() => setSelectedKelas("")}
                    className="cursor-pointer font-bold"
                    aria-label="Hapus filter kelas"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            {selectedStudents.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="cursor-pointer">
                  <Printer className="w-4 h-4" />
                  Cetak
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {downloadingPdf ? "Membuat PDF..." : "Download PDF"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Memuat data siswa...</p>
            </div>
          ) : allStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Belum ada data siswa. Tambah siswa di menu Data Siswa.
              </p>
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Tidak ada siswa di kelas {selectedKelas}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{student.nisn}</td>
                      <td className="py-3 px-4 font-medium">{student.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.kelas}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSingle(student)}
                          className="cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          Generate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudents.length > 0 && (
        <Card>
          <CardHeader className="no-print">
            <CardTitle>
              Preview Kartu ({selectedStudents.length} kartu,{" "}
              {printPages.length} halaman saat dicetak)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="print-area">
              <div className="print-header">
                <h3 className="font-bold text-lg">Kartu QR Presensi Siswa</h3>
                <p className="text-sm">
                  {selectedKelas ? `Kelas: ${selectedKelas}` : "Semua Kelas"}{" "}
                  &middot; {selectedStudents.length} siswa &middot; Dicetak:{" "}
                  {new Date().toLocaleDateString("id-ID")}
                </p>
              </div>
              {printPages.map((pageStudents, pageIndex, allPages) => (
                <div
                  key={pageIndex}
                  className={
                    "print-qr-page" +
                    (pageIndex < allPages.length - 1
                      ? " print-qr-page-break"
                      : "")
                  }
                >
                  <div className="print-qr-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pageStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex justify-center print-qr-card"
                      >
                        <StudentCard student={student} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
