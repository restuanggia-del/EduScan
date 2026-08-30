import { useState } from "react";
import { cn } from "../../components/ui/utils";
import { DashboardSiswa } from "./DashboardSiswa";
import { DashboardGuru } from "./DashboardGuru";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">
          Statistik kehadiran {activeTab === "siswa" ? "siswa" : "guru"} hari
          ini
        </p>
      </div>

      <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1">
        <button
          onClick={() => setActiveTab("siswa")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
            activeTab === "siswa"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Dashboard Siswa
        </button>
        <button
          onClick={() => setActiveTab("guru")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
            activeTab === "guru"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Dashboard Guru
        </button>
      </div>

      {activeTab === "siswa" ? <DashboardSiswa /> : <DashboardGuru />}
    </div>
  );
}
