import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";

interface Student {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  alamat: string;
  namaOrtu: string;
  noWA: string;
  foto?: string;
}

const dummyStudents: Student[] = [
  {
    id: "1",
    nama: "Ahmad Fauzi",
    nisn: "1234567890",
    kelas: "XII IPA 1",
    alamat: "Jl. Raya No. 123, Bandar Lampung",
    namaOrtu: "Bapak Ahmad",
    noWA: "081234567890",
  },
  {
    id: "2",
    nama: "Siti Nurhaliza",
    nisn: "1234567891",
    kelas: "XI IPA 2",
    alamat: "Jl. Merdeka No. 45, Bandar Lampung",
    namaOrtu: "Ibu Siti",
    noWA: "081234567891",
  },
  {
    id: "3",
    nama: "Budi Santoso",
    nisn: "1234567892",
    kelas: "X IPS 1",
    alamat: "Jl. Sudirman No. 78, Bandar Lampung",
    namaOrtu: "Bapak Budi",
    noWA: "081234567892",
  },
];

export function DataSiswa() {
  const [students, setStudents] = useState<Student[]>(dummyStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});

  const filteredStudents = students.filter(
    (student) =>
      student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery) ||
      student.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddStudent = () => {
    if (formData.nama && formData.nisn && formData.kelas) {
      const newStudent: Student = {
        id: Date.now().toString(),
        nama: formData.nama,
        nisn: formData.nisn,
        kelas: formData.kelas,
        alamat: formData.alamat || "",
        namaOrtu: formData.namaOrtu || "",
        noWA: formData.noWA || "",
      };
      setStudents([...students, newStudent]);
      setFormData({});
      setIsAddDialogOpen(false);
    }
  };

  const handleEditStudent = () => {
    if (editingStudent && formData.nama && formData.nisn && formData.kelas) {
      setStudents(
        students.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                nama: formData.nama!,
                nisn: formData.nisn!,
                kelas: formData.kelas!,
                alamat: formData.alamat || "",
                namaOrtu: formData.namaOrtu || "",
                noWA: formData.noWA || "",
              }
            : s
        )
      );
      setEditingStudent(null);
      setFormData({});
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus siswa ini?")) {
      setStudents(students.filter((s) => s.id !== id));
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
  };

  const closeDialog = () => {
    setEditingStudent(null);
    setFormData({});
    setIsAddDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Master Data Siswa</h2>
          <p className="text-muted-foreground">Kelola data siswa dan informasi orang tua</p>
        </div>

        <Dialog open={isAddDialogOpen || editingStudent !== null} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Foto Siswa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    {formData.foto ? (
                      <img src={formData.foto} alt="Foto" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4" />
                    Upload Foto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap *</Label>
                  <Input
                    id="nama"
                    value={formData.nama || ""}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN *</Label>
                  <Input
                    id="nisn"
                    value={formData.nisn || ""}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Masukkan NISN"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas *</Label>
                <Input
                  id="kelas"
                  value={formData.kelas || ""}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                  placeholder="Contoh: XII IPA 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat || ""}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Masukkan alamat lengkap"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Data Orang Tua / Wali</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="namaOrtu">Nama Orang Tua / Wali</Label>
                    <Input
                      id="namaOrtu"
                      value={formData.namaOrtu || ""}
                      onChange={(e) => setFormData({ ...formData, namaOrtu: e.target.value })}
                      placeholder="Masukkan nama orang tua"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="noWA">Nomor WhatsApp</Label>
                    <Input
                      id="noWA"
                      value={formData.noWA || ""}
                      onChange={(e) => setFormData({ ...formData, noWA: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button onClick={editingStudent ? handleEditStudent : handleAddStudent}>
                  {editingStudent ? "Simpan Perubahan" : "Tambah Siswa"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Siswa</CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama, NISN, atau kelas..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">NISN</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Kelas</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Orang Tua</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">No. WhatsApp</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-4">{student.nisn}</td>
                    <td className="py-3 px-4 font-medium">{student.nama}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.kelas}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.namaOrtu}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.noWA}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(student)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Tidak ada data siswa ditemukan</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
