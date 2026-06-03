import { useEffect, useState } from "react";
import { Users, UserX, Clock, Heart, TrendingUp } from "lucide-react";
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

interface StatHarian {
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alfa: number;
}

interface RecentActivity {
  nama: string;
  kelas: string;
  jam: string;
  status: string;
}

interface ChartData {
  label: string;
  hadir: number;
}

export function Dashboard() {
  const [statHarian, setStatHarian] = useState<StatHarian>({
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
    alfa: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("absensi-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "absensi" },
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
      fetchStatHarian(today),
      fetchRecentActivity(),
      fetchWeeklyData(),
      fetchMonthlyData(),
    ]);

    setLoading(false);
  };

  const fetchStatHarian = async (today: string) => {
    const { data } = await supabase
      .from("absensi")
      .select("status")
      .eq("tanggal", today);

    if (data) {
      setStatHarian({
        hadir: data.filter((a) => a.status === "hadir").length,
        terlambat: data.filter((a) => a.status === "terlambat").length,
        izin: data.filter((a) => a.status === "izin").length,
        sakit: data.filter((a) => a.status === "sakit").length,
        alfa: data.filter((a) => a.status === "alfa").length,
      });
    }
  };

  const fetchRecentActivity = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("absensi")
      .select("status, waktu_scan, siswa(nama, kelas)")
      .eq("tanggal", today)
      .order("waktu_scan", { ascending: false })
      .limit(10);

    if (data) {
      setRecentActivity(
        (data as any[]).map((a) => ({
          nama: a.siswa?.nama || "-",
          kelas: a.siswa?.kelas || "-",
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
                  : a.status,
        })),
      );
    }
  };

  const fetchWeeklyData = async () => {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result: ChartData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = days[date.getDay()];

      const { data } = await supabase
        .from("absensi")
        .select("id")
        .eq("tanggal", dateStr)
        .in("status", ["hadir", "terlambat"]);

      result.push({ label: dayLabel, hadir: data?.length || 0 });
    }

    setWeeklyData(result);
  };

  const fetchMonthlyData = async () => {
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
        .from("absensi")
        .select("id")
        .gte("tanggal", start)
        .lte("tanggal", end)
        .in("status", ["hadir", "terlambat"]);

      result.push({ label: bulanNames[month], hadir: data?.length || 0 });
    }

    setMonthlyData(result);
  };

  const stats = [
    {
      title: "Hadir",
      value: statHarian.hadir,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Terlambat",
      value: statHarian.terlambat,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Izin",
      value: statHarian.izin,
      icon: Heart,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Sakit",
      value: statHarian.sakit,
      icon: Heart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Alfa",
      value: statHarian.alfa,
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">
          Statistik kehadiran siswa hari ini
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kehadiran 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
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
                <Bar dataKey="hadir" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kehadiran Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
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
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: "#06B6D4", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Aktivitas Terbaru */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Aktivitas Absensi Terbaru</CardTitle>
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
                      Kelas
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
                  {recentActivity.map((activity, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-medium">{activity.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {activity.kelas}
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

              {recentActivity.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Belum ada aktivitas absensi hari ini
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
