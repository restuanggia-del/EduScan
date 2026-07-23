import { useEffect, useState } from "react";
import {
  UserX,
  Clock,
  Heart,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { cn } from "./ui/utils";

interface StatGuruHarian {
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alfa: number;
  ts: number;
}

interface RecentActivityGuru {
  nama: string;
  peran: string;
  jam: string;
  status: string;
}

interface ChartData {
  label: string;
  hadir: number;
}

export function DashboardGuru() {
  const [statGuruHarian, setStatGuruHarian] = useState<StatGuruHarian>({
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alfa: 0,
    ts: 0,
  });
  const [recentActivityGuru, setRecentActivityGuru] = useState<
    RecentActivityGuru[]
  >([]);
  const [weeklyDataGuru, setWeeklyDataGuru] = useState<ChartData[]>([]);
  const [monthlyDataGuru, setMonthlyDataGuru] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("absensi-realtime-guru")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "absensi_guru" },
        () => fetchDashboardData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    await Promise.all([
      fetchStatGuruHarian(today),
      fetchRecentActivityGuru(),
      fetchWeeklyDataGuru(),
      fetchMonthlyDataGuru(),
    ]);

    setLoading(false);
  };

  const fetchStatGuruHarian = async (today: string) => {
    const { data } = await supabase
      .from("absensi_guru")
      .select("status")
      .eq("tanggal", today);

    if (data) {
      setStatGuruHarian({
        hadir: data.filter((a) => a.status === "hadir").length,
        terlambat: data.filter((a) => a.status === "terlambat").length,
        izin: data.filter((a) => a.status === "izin").length,
        sakit: data.filter((a) => a.status === "sakit").length,
        alfa: data.filter((a) => a.status === "alfa").length,
        ts: data.filter((a) => a.status === "ts").length,
      });
    }
  };

  const fetchRecentActivityGuru = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("absensi_guru")
      .select(
        "status, waktu_scan, peran, guru:guru_id(nama), user:user_id(nama)",
      )
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false })
      .limit(10);

    if (data) {
      setRecentActivityGuru(
        (data as any[]).map((a) => ({
          nama: a.guru?.nama || a.user?.nama || "-",
          peran: a.peran === "kepala_sekolah" ? "Kepala Sekolah" : "Guru",
          jam: new Date(a.waktu_scan).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status:
            a.status === "hadir"
              ? "Masuk"
              : a.status === "terlambat"
                ? "Terlambat"
                : a.status === "pulang"
                  ? "Pulang"
                  : a.status === "ts"
                    ? "TS"
                    : a.status,
        })),
      );
    }
  };

  const fetchWeeklyDataGuru = async () => {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result: ChartData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = days[date.getDay()];

      const { data } = await supabase
        .from("absensi_guru")
        .select("id")
        .eq("tanggal", dateStr)
        .in("status", ["hadir", "terlambat"]);

      result.push({ label: dayLabel, hadir: data?.length || 0 });
    }

    setWeeklyDataGuru(result);
  };

  const fetchMonthlyDataGuru = async () => {
    const bulanNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const result: ChartData[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      const start = new Date(year, month, 1).toISOString().split("T")[0];
      const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data } = await supabase
        .from("absensi_guru")
        .select("id")
        .gte("tanggal", start)
        .lte("tanggal", end)
        .in("status", ["hadir", "terlambat"]);

      result.push({ label: bulanNames[month], hadir: data?.length || 0 });
    }

    setMonthlyDataGuru(result);
  };

  const statsGuru = [
    {
      title: "Hadir",
      value: statGuruHarian.hadir,
      icon: UserCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Terlambat",
      value: statGuruHarian.terlambat,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Izin",
      value: statGuruHarian.izin,
      icon: Heart,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Sakit",
      value: statGuruHarian.sakit,
      icon: Heart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Alfa",
      value: statGuruHarian.alfa,
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "TS",
      value: statGuruHarian.ts,
      icon: XCircle,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Kehadiran Guru Hari Ini
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {statsGuru.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {loading ? "-" : stat.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        stat.bgColor,
                        stat.color,
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Grafik Kehadiran Guru
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kehadiran Guru 7 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyDataGuru}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="hadir" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kehadiran Guru Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyDataGuru}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hadir"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ fill: "#F59E0B", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Aktivitas Absensi Guru Terbaru</CardTitle>
            <div className="flex items-center gap-2 text-sm text-primary">
              <TrendingUp className="w-4 h-4" />
              <span>Live</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              Memuat data...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Peran
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Jam
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivityGuru.map((activity, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-medium">{activity.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {activity.peran}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {activity.jam}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            activity.status === "Masuk"
                              ? "bg-primary/10 text-primary"
                              : activity.status === "Terlambat"
                                ? "bg-amber-100 text-amber-700"
                                : activity.status === "Pulang"
                                  ? "bg-secondary/10 text-secondary"
                                  : activity.status === "TS"
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-muted text-muted-foreground",
                          )}
                        >
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {recentActivityGuru.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Belum ada aktivitas absensi guru hari ini
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
