import { useState } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
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

interface Kelas {
  id: string;
  namaKelas: string;
  tingkatKelas: string;
  waliKelas: string;
  jumlahSiswa: number;
}

const dummyKelas: Kelas[] = [
  {
    id: "1",
    namaKelas: "XII IPA 1",
    tingkatKelas: "XII",
    waliKelas: "Drs. Ahmad Hidayat",
    jumlahSiswa: 32,
  },
  {
    id: "2",
    namaKelas: "XII IPA 2",
    tingkatKelas: "XII",
    waliKelas: "Sri Wahyuni, S.Pd",
    jumlahSiswa: 30,
  },
  {
    id: "3",
    namaKelas: "XI IPA 1",
    tingkatKelas: "XI",
    waliKelas: "Budi Santoso, M.Pd",
    jumlahSiswa: 28,
  },
  {
    id: "4",
    namaKelas: "XI IPA 2",
    tingkatKelas: "XI",
    waliKelas: "Siti Nurhaliza, S.Pd",
    jumlahSiswa: 29,
  },
  {
    id: "5",
    namaKelas: "X IPS 1",
    tingkatKelas: "X",
    waliKelas: "Hendra Wijaya, S.Pd",
    jumlahSiswa: 31,
  },
];

export function ManajemenKelas() {
  const [kelasList, setKelasList] = useState<Kelas[]>(dummyKelas);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [detailKelas, setDetailKelas] = useState<Kelas | null>(null);
  const [formData, setFormData] = useState<Partial<Kelas>>({});

  const handleAddKelas = () => {
    if (formData.namaKelas && formData.tingkatKelas && formData.waliKelas) {
      const newKelas: Kelas = {
        id: Date.now().toString(),
        namaKelas: formData.namaKelas,
        tingkatKelas: formData.tingkatKelas,
        waliKelas: formData.waliKelas,
        jumlahSiswa: formData.jumlahSiswa || 0,
      };
      setKelasList([...kelasList, newKelas]);
      setFormData({});
      setIsAddDialogOpen(false);
    }
  };

  const handleEditKelas = () => {
    if (
      editingKelas &&
      formData.namaKelas &&
      formData.tingkatKelas &&
      formData.waliKelas
    ) {
      setKelasList(
        kelasList.map((k) =>
          k.id === editingKelas.id
            ? {
                ...k,
                namaKelas: formData.namaKelas!,
                tingkatKelas: formData.tingkatKelas!,
                waliKelas: formData.waliKelas!,
                jumlahSiswa: formData.jumlahSiswa || 0,
              }
            : k,
        ),
      );
      setEditingKelas(null);
      setFormData({});
    }
  };

  const handleDeleteKelas = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus kelas ini?")) {
      setKelasList(kelasList.filter((k) => k.id !== id));
    }
  };

  const openEditDialog = (kelas: Kelas) => {
    setEditingKelas(kelas);
    setFormData(kelas);
  };

  const closeDialog = () => {
    setEditingKelas(null);
    setDetailKelas(null);
    setFormData({});
    setIsAddDialogOpen(false);
  };

  const totalSiswa = kelasList.reduce(
    (acc, kelas) => acc + kelas.jumlahSiswa,
    0,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Manajemen Kelas
          </h2>
          <p className="text-muted-foreground">
            Kelola data kelas dan wali kelas
          </p>
        </div>

        <Dialog
          open={isAddDialogOpen || editingKelas !== null}
          onOpenChange={closeDialog}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Tambah Kelas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingKelas ? "Edit Data Kelas" : "Tambah Kelas Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
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
                <Button
                  onClick={editingKelas ? handleEditKelas : handleAddKelas}
                >
                  {editingKelas ? "Simpan Perubahan" : "Tambah Kelas"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDeleteKelas(kelas.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {kelasList.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Belum ada data kelas. Silakan tambah kelas baru.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
