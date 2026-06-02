import { Home, Users, QrCode, FileText, Settings, BarChart3 } from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "siswa", label: "Data Siswa", icon: Users },
    { id: "kelas", label: "Manajemen Kelas", icon: BarChart3 },
    { id: "qr", label: "Generate QR", icon: QrCode },
    { id: "rekap", label: "Rekap Absensi", icon: FileText },
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-border flex flex-col">
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
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          © 2026 EduScan v1.0
        </div>
      </div>
    </div>
  );
}
