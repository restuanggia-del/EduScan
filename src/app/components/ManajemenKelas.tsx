import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";

interface Kelas {
  id: string;
  namaKelas: string;
  tingkatKelas: string;
  waliKelas: string;
  jumlahSiswa: number;
}

export function ManajemenKelas() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Kelas>>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchKelas();
  }, []);

  const fetchKelas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kelas")
      .select("*")
      .order("nama_kelas", { ascending: true });

    if (error) {
      console.error("Error fetching kelas:", error.message);
    } else if (data) {
      setKelasList(
        data.map((k) => ({
          id: k.id,
          namaKelas: k.nama_kelas,
          tingkatKelas: k.tingkat_kelas,
          waliKelas: k.wali_kelas,
          jumlahSiswa: k.jumlah_siswa || 0,
        })),
      );
    }
    setLoading(false);
  };

  const handleAddKelas = async () => {
    setErrorMsg("");
    if (formData.namaKelas && formData.tingkatKelas && formData.waliKelas) {
      const { error } = await supabase.from("kelas").insert({
        nama_kelas: formData.namaKelas,
        tingkat_kelas: formData.tingkatKelas,
        wali_kelas: formData.waliKelas,
        jumlah_siswa: formData.jumlahSiswa || 0,
      });

      if (error) {
        setErrorMsg("Gagal menambah kelas: " + error.message);
      } else {
        await fetchKelas();
        setFormData({});
        setIsAddDialogOpen(false);
        toast.success("Kelas berhasil ditambahkan!");
      }
    }
  };

  const handleEditKelas = async () => {
    setErrorMsg("");
    if (
      editingKelas &&
      formData.namaKelas &&
      formData.tingkatKelas &&
      formData.waliKelas
    ) {
      const { error } = await supabase
        .from("kelas")
        .update({
          nama_kelas: formData.namaKelas,
          tingkat_kelas: formData.tingkatKelas,
          wali_kelas: formData.waliKelas,
          jumlah_siswa: formData.jumlahSiswa || 0,
        })
        .eq("id", editingKelas.id);

      if (error) {
        setErrorMsg("Gagal mengupdate kelas: " + error.message);
      } else {
        await fetchKelas();
        setEditingKelas(null);
        setFormData({});
        toast.success("Data kelas berhasil diperbarui!");
      }
    }
  };

  const handleDeleteKelas = async () => {
    if (!deletingId) return;
    const { error } = await supabase
      .from("kelas")
      .delete()
      .eq("id", deletingId);

    if (error) {
      toast.error("Gagal menghapus kelas: " + error.message);
    } else {
      await fetchKelas();
      toast.success("Kelas berhasil dihapus!");
    }
    setDeletingId(null);
  };

  const openEditDialog = (kelas: Kelas) => {
    setEditingKelas(kelas);
    setFormData(kelas);
    setErrorMsg("");
  };

  const closeDialog = () => {
    setEditingKelas(null);
    setFormData({});
    setIsAddDialogOpen(false);
    setErrorMsg("");
  };

  const totalSiswa = kelasList.reduce((acc, k) => acc + k.jumlahSiswa, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Manajemen Kelas
          </h2>
          <p className="text-muted-foreground">
            Kelola data kelas dan wali kelas
          </p>
        </div>

        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Tambah Kelas
        </button>
      </div>

      {/* Dialog Tambah / Edit */}
      <Dialog
        open={isAddDialogOpen || editingKelas !== null}
        onOpenChange={closeDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKelas ? "Edit Data Kelas" : "Tambah Kelas Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingKelas
                ? "Ubah data kelas yang dipilih."
                : "Isi form berikut untuk menambah kelas baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {errorMsg && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-md">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="namaKelas">Nama Kelas *</Label>
              <Input
                id="namaKelas"
                value={formData.namaKelas || ""}
                onChange={(e) =>
                  setFormData({ ...formData, namaKelas: e.target.value })
                }
                placeholder="Contoh: XII IPA 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tingkatKelas">Tingkat Kelas *</Label>
              <Input
                id="tingkatKelas"
                value={formData.tingkatKelas || ""}
                onChange={(e) =>
                  setFormData({ ...formData, tingkatKelas: e.target.value })
                }
                placeholder="Contoh: X, XI, XII"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waliKelas">Wali Kelas *</Label>
              <Input
                id="waliKelas"
                value={formData.waliKelas || ""}
                onChange={(e) =>
                  setFormData({ ...formData, waliKelas: e.target.value })
                }
                placeholder="Masukkan nama wali kelas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlahSiswa">Jumlah Siswa</Label>
              <Input
                id="jumlahSiswa"
                type="number"
                value={formData.jumlahSiswa || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    jumlahSiswa: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={closeDialog}>
                Batal
              </Button>
              <Button onClick={editingKelas ? handleEditKelas : handleAddKelas}>
                {editingKelas ? "Simpan Perubahan" : "Tambah Kelas"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Kelas</p>
                <p className="text-3xl font-bold mt-2">{kelasList.length}</p>
              </div>
              <div className="bg-primary/10 text-primary w-12 h-12 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Siswa</p>
                <p className="text-3xl font-bold mt-2">{totalSiswa}</p>
              </div>
              <div className="bg-secondary/10 text-secondary w-12 h-12 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Rata-rata Siswa/Kelas
                </p>
                <p className="text-3xl font-bold mt-2">
                  {kelasList.length > 0
                    ? Math.round(totalSiswa / kelasList.length)
                    : 0}
                </p>
              </div>
              <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List Kelas */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Memuat data kelas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kelasList.map((kelas) => (
            <Card key={kelas.id}>
              <CardHeader>
                <CardTitle>{kelas.namaKelas}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tingkat</p>
                  <p className="font-medium">{kelas.tingkatKelas}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wali Kelas</p>
                  <p className="font-medium">{kelas.waliKelas}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Siswa</p>
                  <p className="font-medium">{kelas.jumlahSiswa} siswa</p>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(kelas)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <button
                    onClick={() => setDeletingId(kelas.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 border border-input px-3 py-1.5 rounded-md text-sm hover:bg-muted"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Hapus
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && kelasList.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Belum ada data kelas. Silakan tambah kelas baru.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deletingId !== null}
        onOpenChange={() => setDeletingId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Kelas</DialogTitle>
            <DialogDescription>
              Apakah kamu yakin ingin menghapus kelas ini? Data yang dihapus
              tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setDeletingId(null)}
              className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteKelas}
              className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90"
            >
              Hapus
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
