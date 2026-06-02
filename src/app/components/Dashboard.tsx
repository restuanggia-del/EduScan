import { Users, UserX, Clock, Heart, FileX, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const attendanceData = [
  { day: "Sen", hadir: 245 },
  { day: "Sel", hadir: 238 },
  { day: "Rab", hadir: 250 },
  { day: "Kam", hadir: 242 },
  { day: "Jum", hadir: 235 },
  { day: "Sab", hadir: 248 },
  { day: "Min", hadir: 0 },
];

const monthlyData = [
  { bulan: "Jan", hadir: 4850 },
  { bulan: "Feb", hadir: 4720 },
  { bulan: "Mar", hadir: 4980 },
  { bulan: "Apr", hadir: 4890 },
  { bulan: "Mei", hadir: 4950 },
  { bulan: "Jun", hadir: 5020 },
];

const recentActivity = [
  { nama: "Ahmad Fauzi", kelas: "XII IPA 1", jam: "07:02", status: "Masuk" },
  { nama: "Siti Nurhaliza", kelas: "XI IPA 2", jam: "07:05", status: "Masuk" },
  { nama: "Budi Santoso", kelas: "X IPS 1", jam: "07:15", status: "Terlambat" },
  { nama: "Dewi Lestari", kelas: "XII IPS 2", jam: "07:03", status: "Masuk" },
  { nama: "Andi Wijaya", kelas: "XI IPA 1", jam: "07:08", status: "Masuk" },
];

export function Dashboard() {
  const stats = [
    {
      title: "Hadir",
      value: "248",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Terlambat",
      value: "12",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Izin",
      value: "5",
      icon: Heart,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Sakit",
      value: "3",
      icon: Heart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Alfa",
      value: "2",
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Statistik kehadiran siswa hari ini</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kehadiran 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
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
                <XAxis dataKey="bulan" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hadir"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: '#06B6D4', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Absensi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nama</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Kelas</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Jam</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">{activity.nama}</td>
                    <td className="py-3 px-4 text-muted-foreground">{activity.kelas}</td>
                    <td className="py-3 px-4 text-muted-foreground">{activity.jam}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === "Masuk"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
