import {
  Home,
  Users,
  QrCode,
  FileText,
  Settings,
  BarChart3,
  Scan,
  Clock,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useAuth, getEffectiveRole } from "../../lib/AuthContext";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const allMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["kepala_sekolah", "tu", "guru_biasa", "guru_wali_kelas"],
  },
  {
    id: "absen-saya",
    label: "Presensi Saya",
    icon: Clock,
    roles: ["guru_biasa", "guru_wali_kelas"],
  },
  {
    id: "kelas",
    label: "Manajemen Kelas",
    icon: BarChart3,
    roles: ["kepala_sekolah", "tu"],
  },
  {
    id: "siswa",
    label: "Data Siswa",
    icon: Users,
    roles: ["kepala_sekolah", "tu", "guru_wali_kelas"],
  },
  {
    id: "guru",
    label: "Data Guru",
    icon: Users,
    roles: ["kepala_sekolah", "tu"],
  },
  {
    id: "qr",
    label: "Generate QR",
    icon: QrCode,
    roles: ["kepala_sekolah", "tu"],
  },
  {
    id: "scan",
    label: "Scan Presensi",
    icon: Scan,
    roles: ["kepala_sekolah", "tu", "guru_biasa", "guru_wali_kelas"],
  },
  {
    id: "rekap",
    label: "Rekap Presensi",
    icon: FileText,
    roles: ["kepala_sekolah", "tu", "guru_wali_kelas"],
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    roles: ["kepala_sekolah"],
  },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const effectiveRole = getEffectiveRole(user); // <-- BARU

  const menuItems = allMenuItems.filter(
    (item) => effectiveRole && item.roles.includes(effectiveRole),
  );

  return (
    <div className="w-64 h-screen flex-shrink-0 bg-white border-r border-border flex flex-col sticky top-0 self-start no-print">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">EduScan</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">© 2026 EduScan v1.0</div>
      </div>
    </div>
  );
}
