import { useState } from "react";
import { cn } from "./ui/utils";
import { useAuth } from "../../lib/AuthContext";
import { ScanGuru } from "./ScanGuru";
import { ScanSiswa } from "./ScanSiswa";

export function ScanAbsensi() {
  const { user } = useAuth();
  const bisaScanGuru = user?.role === "kepala_sekolah" || user?.role === "tu";

  const [tab, setTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="flex flex-col h-full">
      {bisaScanGuru && (
        <div className="px-6 pt-6">
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setTab("siswa")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                tab === "siswa"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Scan Siswa
            </button>
            <button
              onClick={() => setTab("guru")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                tab === "guru"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Scan Guru & Kepala Sekolah
            </button>
          </div>
        </div>
      )}

      {!bisaScanGuru || tab === "siswa" ? <ScanSiswa /> : <ScanGuru />}
    </div>
  );
}
