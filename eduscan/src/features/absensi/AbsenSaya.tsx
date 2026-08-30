import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2, LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../services/supabaseClient";

const HARI_MAP = [
  "minggu",
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
];

type Jadwal = { jam_masuk: string; jam_pulang: string | null } | null;
type AbsensiHariIni = { status: string; waktu_scan: string }[];

export function AbsenSaya() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState<{ id: string; nama: string } | null>(null);
  const [jadwal, setJadwal] = useState<Jadwal>(null);
  const [absensiHariIni, setAbsensiHariIni] = useState<AbsensiHariIni>([]);
  const [now, setNow] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<"masuk" | "pulang" | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);

    if (!user?.id) {
      setLoadError("Sesi login tidak ditemukan. Silakan login ulang.");
      setLoading(false);
      return;
    }

    const { data: guruData, error: guruError } = await supabase
      .from("guru")
      .select("id, nama")
      .eq("user_id", user.id)
      .single();

    if (guruError || !guruData) {
      setLoadError("Data guru tidak ditemukan untuk akun ini.");
      setLoading(false);
      return;
    }
    setGuru(guruData);

    const hariIni = HARI_MAP[new Date().getDay()];
    const { data: jadwalData } = await supabase
      .from("jadwal_guru")
      .select("jam_masuk, jam_pulang")
      .eq("guru_id", guruData.id)
      .eq("hari", hariIni)
      .maybeSingle();
    setJadwal(jadwalData);

    const today = new Date().toISOString().slice(0, 10);
    const { data: absensiData } = await supabase
      .from("absensi_guru")
      .select("status, waktu_scan")
      .eq("guru_id", guruData.id)
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: true });
    setAbsensiHariIni(absensiData || []);

    setLoading(false);
  }

  async function handleAbsen(tipe: "masuk" | "pulang") {
    setActionLoading(tipe);

    const { data, error } = await supabase.functions.invoke(
      "absen-mandiri-guru",
      {
        body: { tipe },
      },
    );

    if (error) {
      toast.error(error.message || "Gagal melakukan presensi.");
      setActionLoading(null);
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      setActionLoading(null);
      return;
    }

    toast.success(
      tipe === "masuk"
        ? "Presensi masuk berhasil dicatat"
        : "Presensi pulang berhasil dicatat",
    );
    await loadData();
    setActionLoading(null);
  }

  const sudahMasuk = absensiHariIni.some(
    (a) => a.status === "hadir" || a.status === "terlambat",
  );
  const sudahPulang = absensiHariIni.some((a) => a.status === "pulang");

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      hadir: { label: "Hadir", className: "bg-green-100 text-green-700" },
      terlambat: {
        label: "Terlambat",
        className: "bg-amber-100 text-amber-700",
      },
      pulang: { label: "Pulang", className: "bg-blue-100 text-blue-700" },
    };
    const item = map[status] || {
      label: status,
      className: "bg-gray-100 text-gray-700",
    };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (loadError && !guru) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card>
          <CardContent className="pt-6 text-center text-red-600">
            {loadError}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-6 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Presensi Saya</h1>
        <p className="text-muted-foreground">
          Halo, {guru?.nama}. Silakan lakukan presensi mandiri di bawah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            {now.toLocaleTimeString("id-ID")}
          </CardTitle>
          <CardDescription>
            {now.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jadwal ? (
            <p className="text-sm text-muted-foreground">
              Jadwal masuk hari ini:{" "}
              <span className="font-medium text-foreground">
                {jadwal.jam_masuk}
              </span>
            </p>
          ) : (
            <p className="text-sm text-amber-600">
              Tidak ada jadwal mengajar terdaftar untuk hari ini.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className="h-16 text-base"
          disabled={sudahMasuk || !jadwal || actionLoading !== null}
          onClick={() => handleAbsen("masuk")}
        >
          {actionLoading === "masuk" ? (
            <Loader2 className="animate-spin w-5 h-5 mr-2" />
          ) : (
            <LogIn className="w-5 h-5 mr-2" />
          )}
          {sudahMasuk ? "Sudah Presensi Masuk" : "Presensi Masuk"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-16 text-base"
          disabled={sudahPulang || !sudahMasuk || actionLoading !== null}
          onClick={() => handleAbsen("pulang")}
        >
          {actionLoading === "pulang" ? (
            <Loader2 className="animate-spin w-5 h-5 mr-2" />
          ) : (
            <LogOut className="w-5 h-5 mr-2" />
          )}
          {sudahPulang ? "Sudah Presensi Pulang" : "Presensi Pulang"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Presensi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {absensiHariIni.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada presensi hari ini.
            </p>
          ) : (
            <ul className="space-y-2">
              {absensiHariIni.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {new Date(a.waktu_scan).toLocaleTimeString("id-ID")}
                  </span>
                  {statusBadge(a.status)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
