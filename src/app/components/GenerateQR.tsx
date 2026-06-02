import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";

interface Student {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto?: string;
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
    <div className="bg-white rounded-lg border-2 border-primary overflow-hidden w-[300px]">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <School className="w-6 h-6 text-white" />
          <h3 className="text-white font-bold text-lg">SMA Negeri 1</h3>
        </div>
        <p className="text-white/90 text-xs">Bandar Lampung</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-center mb-3">
          {student.foto ? (
            <img
              src={student.foto}
              alt={student.nama}
              className="w-24 h-24 rounded-lg object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-primary">
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

        <div className="flex justify-center pt-3 border-t">
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={qrData} size={120} level="H" />
          </div>
        </div>

        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">ID: {student.id}</p>
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
  const printRef = useRef<HTMLDivElement>(null);

  // ✅ Fetch siswa dan kelas dari Supabase
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

      // Ambil daftar kelas unik dari data siswa
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
  };

  const handlePrint = () => {
    window.print();
  };

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

      {/* Kartu Aksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              className="w-full"
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
              className="w-full"
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

      {/* Tabel Daftar Siswa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Siswa</CardTitle>
            {selectedStudents.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                  Cetak
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Download className="w-4 h-4" />
                  Download PDF
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
                  {allStudents.map((student, index) => (
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

      {/* Preview Kartu */}
      {selectedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview Kartu ({selectedStudents.length} kartu)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={printRef}
              className="print-area grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {selectedStudents.map((student) => (
                <div key={student.id} className="flex justify-center">
                  <StudentCard student={student} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
