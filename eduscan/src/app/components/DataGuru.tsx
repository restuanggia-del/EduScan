import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Copy, Check } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "sonner";

interface Guru {
  id: string;
  nama: string;
  nip: string | null;
  mata_pelajaran: string | null;
  role_guru: "biasa" | "wali_kelas";
  kelas_id: string | null;
  user_id: string | null;
  no_wa: string | null;
  email?: string | null;
}

interface KelasOption {
  id: string;
  nama_kelas: string;
}

const HARI_LIST = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
];

type JadwalForm = Record<
  string,
  { aktif: boolean; jam_masuk: string; jam_pulang: string }
>;

function defaultJadwalForm(): JadwalForm {
  const obj: JadwalForm = {};
  HARI_LIST.forEach((h) => {
    obj[h.key] = { aktif: false, jam_masuk: "07:00", jam_pulang: "14:00" };
  });
  return obj;
}

export function DataGuru() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    nama: "",
    nip: "",
    mata_pelajaran: "",
    no_wa: "",
    role_guru: "biasa" as "biasa" | "wali_kelas",
    kelas_id: "",
  });
  const [jadwalForm, setJadwalForm] = useState<JadwalForm>(defaultJadwalForm());

  const [akunBaru, setAkunBaru] = useState<{
    email: string;
    password_default: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGuru();
    fetchKelasOptions();
  }, []);

  const fetchKelasOptions = async () => {
    const { data, error } = await supabase
      .from("kelas")
      .select("id, nama_kelas");
    if (!error && data) setKelasOptions(data);
  };

  const fetchGuru = async () => {
    setLoading(true);
    const { data: guruData, error } = await supabase
      .from("guru")
      .select("*")
      .order("nama", { ascending: true });

    if (error) {
      toast.error("Gagal memuat data guru: " + error.message);
      setLoading(false);
      return;
    }

    const userIds = (guruData || [])
      .map((g) => g.user_id)
      .filter((id): id is string => !!id);

    let emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds);
      if (usersData) {
        emailMap = Object.fromEntries(usersData.map((u) => [u.id, u.email]));
      }
    }

    const merged = (guruData || []).map((g) => ({
      ...g,
      email: g.user_id ? emailMap[g.user_id] : null,
    }));

    setGuruList(merged);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      nama: "",
      nip: "",
      mata_pelajaran: "",
      no_wa: "",
      role_guru: "biasa",
      kelas_id: "",
    });
    setJadwalForm(defaultJadwalForm());
    setErrorMsg("");
    setEditingGuru(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = async (guru: Guru) => {
    setEditingGuru(guru);
    setFormData({
      nama: guru.nama,
      nip: guru.nip || "",
      mata_pelajaran: guru.mata_pelajaran || "",
      no_wa: guru.no_wa || "",
      role_guru: guru.role_guru,
      kelas_id: guru.kelas_id || "",
    });

    setLoadingJadwal(true);
    setIsAddDialogOpen(true);

    const { data: jadwalData, error } = await supabase
      .from("jadwal_guru")
      .select("hari, jam_masuk, jam_pulang")
      .eq("guru_id", guru.id);

    if (error) {
      toast.error("Gagal memuat jadwal mengajar: " + error.message);
      setJadwalForm(defaultJadwalForm());
      setLoadingJadwal(false);
      return;
    }

    const newJadwalForm = defaultJadwalForm();
    (jadwalData || []).forEach((j) => {
      if (newJadwalForm[j.hari]) {
        newJadwalForm[j.hari] = {
          aktif: true,
          jam_masuk: j.jam_masuk,
          jam_pulang: j.jam_pulang || "14:00",
        };
      }
    });
    setJadwalForm(newJadwalForm);
    setLoadingJadwal(false);
  };

  const jadwalToArray = () =>
    HARI_LIST.filter((h) => jadwalForm[h.key].aktif).map((h) => ({
      hari: h.key,
      jam_masuk: jadwalForm[h.key].jam_masuk,
      jam_pulang: jadwalForm[h.key].jam_pulang,
    }));

  const handleSubmit = async () => {
    setErrorMsg("");

    if (!formData.nama.trim()) {
      setErrorMsg("Nama wajib diisi.");
      return;
    }
    if (formData.role_guru === "wali_kelas" && !formData.kelas_id) {
      setErrorMsg("Kelas wajib dipilih untuk Guru Wali Kelas.");
      return;
    }
    if (formData.role_guru === "wali_kelas" && !formData.nip.trim()) {
      setErrorMsg("NIP wajib diisi (dipakai sebagai password default akun).");
      return;
    }

    setSubmitting(true);

    try {
      if (editingGuru) {
        const { error: updateError } = await supabase
          .from("guru")
          .update({
            nama: formData.nama,
            nip: formData.nip || null,
            mata_pelajaran: formData.mata_pelajaran || null,
            no_wa: formData.no_wa || null,
          })
          .eq("id", editingGuru.id);

        if (updateError) throw updateError;

        await supabase
          .from("jadwal_guru")
          .delete()
          .eq("guru_id", editingGuru.id);
        const jadwalArr = jadwalToArray();
        if (jadwalArr.length > 0) {
          const { error: jadwalError } = await supabase
            .from("jadwal_guru")
            .insert(jadwalArr.map((j) => ({ ...j, guru_id: editingGuru.id })));
          if (jadwalError) throw jadwalError;
        }

        toast.success("Data guru berhasil diperbarui!");
        setIsAddDialogOpen(false);
        resetForm();
        fetchGuru();
      } else {
        const { data, error } = await supabase.functions.invoke(
          "create-akun-guru",
          {
            body: {
              nama: formData.nama,
              nip: formData.nip || null,
              mata_pelajaran: formData.mata_pelajaran || null,
              no_wa: formData.no_wa || null,
              role_guru: formData.role_guru,
              kelas_id:
                formData.role_guru === "wali_kelas"
                  ? formData.kelas_id
                  : undefined,
              jadwal: jadwalToArray(),
            },
          },
        );

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success("Guru berhasil ditambahkan!");

        if (data?.akun) {
          setAkunBaru(data.akun);
        } else {
          setIsAddDialogOpen(false);
          resetForm();
        }
        fetchGuru();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    const { data, error } = await supabase.functions.invoke(
      "delete-akun-guru",
      {
        body: { guru_id: id },
      },
    );

    if (error) {
      toast.error("Gagal menghapus: " + error.message);
    } else if (data?.error) {
      toast.error("Gagal menghapus: " + data.error);
    } else {
      toast.success(
        data?.akun_dihapus
          ? "Data guru & akun login berhasil dihapus."
          : "Data guru dihapus.",
      );
      fetchGuru();
    }
    setDeletingId(null);
  };

  const handleCopyAkun = () => {
    if (!akunBaru) return;
    navigator.clipboard.writeText(
      `Email: ${akunBaru.email}\nPassword: ${akunBaru.password_default}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeAkunDialog = () => {
    setAkunBaru(null);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const getNamaKelas = (kelasId: string | null) =>
    kelasOptions.find((k) => k.id === kelasId)?.nama_kelas || "-";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Guru</h1>
          <p className="text-muted-foreground text-sm">
            Kelola data guru biasa & guru wali kelas
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Guru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Guru</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Memuat...
            </p>
          ) : guruList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Belum ada data guru.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Nama</th>
                    <th className="py-2 pr-4">NIP</th>
                    <th className="py-2 pr-4">Mata Pelajaran</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Kelas Diampu</th>
                    <th className="py-2 pr-4">Email Akun</th>
                    <th className="py-2 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {guruList.map((g) => (
                    <tr key={g.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{g.nama}</td>
                      <td className="py-3 pr-4">{g.nip || "-"}</td>
                      <td className="py-3 pr-4">{g.mata_pelajaran || "-"}</td>
                      <td className="py-3 pr-4">
                        {g.role_guru === "wali_kelas" ? (
                          <Badge>Wali Kelas</Badge>
                        ) : (
                          <Badge variant="secondary">Biasa</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {g.role_guru === "wali_kelas"
                          ? getNamaKelas(g.kelas_id)
                          : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        {g.email ? (
                          <span className="text-xs text-muted-foreground">
                            {g.email}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => handleOpenEdit(g)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer text-destructive"
                            disabled={deletingId === g.id}
                            onClick={() => handleDelete(g.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setIsAddDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuru ? "Edit Data Guru" : "Tambah Guru"}
            </DialogTitle>
            <DialogDescription>
              {editingGuru
                ? "Perbarui data guru. Role tidak bisa diubah di sini."
                : "Isi data guru. Kalau role-nya Wali Kelas, akun login dibuat otomatis."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Masukkan nama guru"
              />
            </div>

            <div className="space-y-2">
              <Label>NIP</Label>
              <Input
                value={formData.nip}
                onChange={(e) =>
                  setFormData({ ...formData, nip: e.target.value })
                }
                placeholder="Masukkan NIP"
              />
              {formData.role_guru === "wali_kelas" && (
                <p className="text-xs text-muted-foreground">
                  NIP dipakai sebagai password default akun guru ini.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Input
                value={formData.mata_pelajaran}
                onChange={(e) =>
                  setFormData({ ...formData, mata_pelajaran: e.target.value })
                }
                placeholder="Contoh: Matematika"
              />
            </div>

            <div className="space-y-2">
              <Label>No. WhatsApp (opsional)</Label>
              <Input
                value={formData.no_wa}
                onChange={(e) =>
                  setFormData({ ...formData, no_wa: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label>Role Guru</Label>
              <Select
                value={formData.role_guru}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    role_guru: v as "biasa" | "wali_kelas",
                  })
                }
                disabled={!!editingGuru}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="biasa">Guru Biasa</SelectItem>
                  <SelectItem value="wali_kelas">Guru Wali Kelas</SelectItem>
                </SelectContent>
              </Select>
              {editingGuru && (
                <p className="text-xs text-muted-foreground">
                  Role tidak bisa diubah lewat form edit. Hapus & tambah ulang
                  jika perlu ganti role.
                </p>
              )}
            </div>

            {formData.role_guru === "wali_kelas" && (
              <div className="space-y-2">
                <Label>Kelas yang Diampu</Label>
                <Select
                  value={formData.kelas_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, kelas_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Jadwal Mengajar (Senin–Jumat)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {loadingJadwal ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Memuat jadwal...
                  </p>
                ) : (
                  HARI_LIST.map((h) => (
                    <div key={h.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={jadwalForm[h.key].aktif}
                        onChange={(e) =>
                          setJadwalForm({
                            ...jadwalForm,
                            [h.key]: {
                              ...jadwalForm[h.key],
                              aktif: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="w-16 text-sm">{h.label}</span>
                      <Input
                        type="time"
                        className="h-8 w-28"
                        disabled={!jadwalForm[h.key].aktif}
                        value={jadwalForm[h.key].jam_masuk}
                        onChange={(e) =>
                          setJadwalForm({
                            ...jadwalForm,
                            [h.key]: {
                              ...jadwalForm[h.key],
                              jam_masuk: e.target.value,
                            },
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">s/d</span>
                      <Input
                        type="time"
                        className="h-8 w-28"
                        disabled={!jadwalForm[h.key].aktif}
                        value={jadwalForm[h.key].jam_pulang}
                        onChange={(e) =>
                          setJadwalForm({
                            ...jadwalForm,
                            [h.key]: {
                              ...jadwalForm[h.key],
                              jam_pulang: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Jadwal ini dipakai untuk menentukan status Hadir/Terlambat
                otomatis saat Scan Absensi Guru.
              </p>
            </div>

            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

            <Button
              onClick={handleSubmit}
              disabled={submitting || loadingJadwal}
              className="w-full cursor-pointer"
            >
              {submitting
                ? "Menyimpan..."
                : editingGuru
                  ? "Simpan Perubahan"
                  : "Tambah Guru"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!akunBaru}
        onOpenChange={(open) => !open && closeAkunDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Akun Berhasil Dibuat 🎉</DialogTitle>
            <DialogDescription>
              Catat atau salin info berikut untuk diberikan ke guru yang
              bersangkutan. Password ini wajib diganti saat login pertama kali.
            </DialogDescription>
          </DialogHeader>
          {akunBaru && (
            <div className="space-y-3">
              <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{akunBaru.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Password:</span>{" "}
                  <span className="font-medium">
                    {akunBaru.password_default}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleCopyAkun}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Disalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> Salin Email & Password
                  </>
                )}
              </Button>
              <Button
                className="w-full cursor-pointer"
                onClick={closeAkunDialog}
              >
                Selesai
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
