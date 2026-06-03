import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "../../lib/AuthContext";

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

export function DataSiswa({
  searchQuery: headerSearch = "",
}: {
  searchQuery?: string;
}) {
  const { user } = useAuth();
  const isGuru = user?.role === "guru";
  const [localSearch, setLocalSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [kelasList, setKelasList] = useState<
    { id: string; namaKelas: string }[]
  >([]);

  const activeSearch = headerSearch || localSearch;

  const filteredStudents = students.filter(
    (student) =>
      student.nama.toLowerCase().includes(activeSearch.toLowerCase()) ||
      student.nisn.includes(activeSearch) ||
      student.kelas.toLowerCase().includes(activeSearch.toLowerCase()),
  );

  useEffect(() => {
    fetchStudents();
    fetchKelasList();
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

  const fetchKelasList = async () => {
    const { data } = await supabase
      .from("kelas")
      .select("id, nama_kelas")
      .order("nama_kelas");
    if (data) {
      setKelasList(data.map((k) => ({ id: k.id, namaKelas: k.nama_kelas })));
    }
  };

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
        foto_url: formData.foto || null,
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
        toast.success("Siswa berhasil ditambahkan!");
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
          foto_url: formData.foto || null,
        })
        .eq("id", editingStudent.id);

      if (error) {
        setErrorMsg("Gagal mengupdate siswa: " + error.message);
      } else {
        await fetchStudents();
        setEditingStudent(null);
        setFormData({});
        toast.success("Data siswa berhasil diperbarui!");
      }
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingId) return;
    const { error } = await supabase
      .from("siswa")
      .delete()
      .eq("id", deletingId);
    if (error) {
      toast.error("Gagal menghapus siswa: " + error.message);
    } else {
      await fetchStudents();
      toast.success("Siswa berhasil dihapus!");
    }
    setDeletingId(null);
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("foto-siswa")
      .upload(fileName, file);

    if (error) {
      alert("Gagal upload foto: " + error.message);
    } else {
      const { data } = supabase.storage
        .from("foto-siswa")
        .getPublicUrl(fileName);

      setFormData({ ...formData, foto: data.publicUrl });
    }
    setUploading(false);
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

        {!isGuru && (
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa
          </button>
        )}
        <Dialog
          open={isAddDialogOpen || editingStudent !== null}
          onOpenChange={closeDialog}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingStudent
                  ? "Ubah data siswa yang dipilih."
                  : "Isi form berikut untuk menambah siswa baru."}
              </DialogDescription>
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
                  <label className="inline-flex items-center gap-2 border border-input px-3 py-1.5 rounded-md text-sm hover:bg-muted cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Mengupload..." : "Upload Foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadFoto}
                      disabled={uploading}
                    />
                  </label>
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
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.kelas || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas: e.target.value })
                  }
                >
                  <option value="">Pilih Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.namaKelas}>
                      {k.namaKelas}
                    </option>
                  ))}
                </select>
                {kelasList.length === 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Belum ada kelas. Tambah kelas dulu di menu Manajemen
                    Kelas.
                  </p>
                )}
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
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  onClick={
                    editingStudent ? handleEditStudent : handleAddStudent
                  }
                  className="cursor-pointer"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />

              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Cari nama, NISN, atau kelas..."
                className="pl-10"
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
                      Foto
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
                      Orang Tua
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      No. WhatsApp
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      {isGuru ? "" : "Aksi"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">
                        {student.foto ? (
                          <img
                            src={student.foto}
                            alt={student.nama}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {student.nama.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
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
                        {isGuru ? (
                          <span className="text-xs text-muted-foreground px-2">
                            Hanya lihat
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(student)}
                              className="cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <button
                              onClick={() => setDeletingId(student.id)}
                              className="p-2 rounded-md hover:bg-muted cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        )}
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
      <Dialog
        open={deletingId !== null}
        onOpenChange={() => setDeletingId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Siswa</DialogTitle>
            <DialogDescription>
              Apakah kamu yakin ingin menghapus siswa ini? Data yang dihapus
              tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setDeletingId(null)}
              className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteStudent}
              className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
