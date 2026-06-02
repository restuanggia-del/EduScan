import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";

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

export function DataSiswa() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("siswa")
      .select("*")
      .order("nama", { ascending: true });

    if (error) {
      console.error("Error fetching siswa:", error.message);
    } else if (data) {
      setStudents(
        data.map((s) => ({
          id: s.id,
          nama: s.nama,
          nisn: s.nisn,
          kelas: s.kelas,
          alamat: s.alamat || "",
          namaOrtu: s.nama_ortu || "",
          noWA: s.no_wa || "",
          foto: s.foto_url,
        })),
      );
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery) ||
      student.kelas.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddStudent = async () => {
    setErrorMsg("");
    if (formData.nama && formData.nisn && formData.kelas) {
      const { error } = await supabase.from("siswa").insert({
        nama: formData.nama,
        nisn: formData.nisn,
        kelas: formData.kelas,
        alamat: formData.alamat || "",
        nama_ortu: formData.namaOrtu || "",
        no_wa: formData.noWA || "",
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("NISN sudah terdaftar, gunakan NISN yang berbeda.");
        } else {
          setErrorMsg("Gagal menambah siswa: " + error.message);
        }
      } else {
        await fetchStudents();
        setFormData({});
        setIsAddDialogOpen(false);
      }
    }
  };

  const handleEditStudent = async () => {
    setErrorMsg("");
    if (editingStudent && formData.nama && formData.nisn && formData.kelas) {
      const { error } = await supabase
        .from("siswa")
        .update({
          nama: formData.nama,
          nisn: formData.nisn,
          kelas: formData.kelas,
          alamat: formData.alamat || "",
          nama_ortu: formData.namaOrtu || "",
          no_wa: formData.noWA || "",
        })
        .eq("id", editingStudent.id);

      if (error) {
        setErrorMsg("Gagal mengupdate siswa: " + error.message);
      } else {
        await fetchStudents();
        setEditingStudent(null);
        setFormData({});
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus siswa ini?")) {
      const { error } = await supabase.from("siswa").delete().eq("id", id);

      if (error) {
        alert("Gagal menghapus siswa: " + error.message);
      } else {
        await fetchStudents();
      }
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    setErrorMsg("");
  };

  const closeDialog = () => {
    setEditingStudent(null);
    setFormData({});
    setIsAddDialogOpen(false);
    setErrorMsg("");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Master Data Siswa
          </h2>
          <p className="text-muted-foreground">
            Kelola data siswa dan informasi orang tua
          </p>
        </div>

        <Dialog
          open={isAddDialogOpen || editingStudent !== null}
          onOpenChange={closeDialog}
        >
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
              {errorMsg && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-md">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <Label>Foto Siswa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    {formData.foto ? (
                      <img
                        src={formData.foto}
                        alt="Foto"
                        className="w-full h-full object-cover rounded-lg"
                      />
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
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN *</Label>
                  <Input
                    id="nisn"
                    value={formData.nisn || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nisn: e.target.value })
                    }
                    placeholder="Masukkan NISN"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas *</Label>
                <Input
                  id="kelas"
                  value={formData.kelas || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas: e.target.value })
                  }
                  placeholder="Contoh: XII IPA 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, alamat: e.target.value })
                  }
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
                      onChange={(e) =>
                        setFormData({ ...formData, namaOrtu: e.target.value })
                      }
                      placeholder="Masukkan nama orang tua"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noWA">Nomor WhatsApp</Label>
                    <Input
                      id="noWA"
                      value={formData.noWA || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, noWA: e.target.value })
                      }
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button
                  onClick={
                    editingStudent ? handleEditStudent : handleAddStudent
                  }
                >
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
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Memuat data siswa...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
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
                      Orang Tua
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      No. WhatsApp
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{student.nisn}</td>
                      <td className="py-3 px-4 font-medium">{student.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.kelas}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.namaOrtu}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.noWA}
                      </td>
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
                  <p className="text-muted-foreground">
                    Tidak ada data siswa ditemukan
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
