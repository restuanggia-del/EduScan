import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface Student {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  foto?: string;
}

const dummyStudents: Student[] = [
  { id: "1", nama: "Ahmad Fauzi", nisn: "1234567890", kelas: "XII IPA 1" },
  { id: "2", nama: "Siti Nurhaliza", nisn: "1234567891", kelas: "XI IPA 2" },
  { id: "3", nama: "Budi Santoso", nisn: "1234567892", kelas: "X IPS 1" },
  { id: "4", nama: "Dewi Lestari", nisn: "1234567893", kelas: "XII IPS 2" },
  { id: "5", nama: "Andi Wijaya", nisn: "1234567894", kelas: "XI IPA 1" },
];

const kelasList = [
  "XII IPA 1",
  "XII IPA 2",
  "XI IPA 1",
  "XI IPA 2",
  "X IPS 1",
  "X IPS 2",
];

interface StudentCardProps {
  student: Student;
  showPrintButtons?: boolean;
}

function StudentCard({ student, showPrintButtons = false }: StudentCardProps) {
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
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [previewMode, setPreviewMode] = useState<"single" | "kelas" | "all">(
    "single",
  );
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerateSingle = (student: Student) => {
    setSelectedStudents([student]);
    setPreviewMode("single");
  };

  const handleGenerateByKelas = () => {
    if (selectedKelas) {
      const studentsInKelas = dummyStudents.filter(
        (s) => s.kelas === selectedKelas,
      );
      setSelectedStudents(studentsInKelas);
      setPreviewMode("kelas");
    }
  };

  const handleGenerateAll = () => {
    setSelectedStudents(dummyStudents);
    setPreviewMode("all");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    handlePrint();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cetak Per Kelas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Kelas</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-input-background px-3 text-sm"
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
              Generate kartu untuk seluruh siswa ({dummyStudents.length} siswa)
            </p>

            <Button className="w-full" onClick={handleGenerateAll}>
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
                <span className="font-bold">{dummyStudents.length}</span>
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
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            )}
          </div>
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
                {dummyStudents.map((student, index) => (
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
        </CardContent>
      </Card>

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
