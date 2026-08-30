import { useState } from "react";
import { cn } from "../../components/ui/utils";
import { useAuth } from "../../contexts/AuthContext";
import { ScanGuru } from "../guru/ScanGuru";
import { ScanSiswa } from "../siswa/ScanSiswa";

export function ScanAbsensi() {
  const { user } = useAuth();
  const bisaScanGuru = user?.role === "kepala_sekolah" || user?.role === "tu";

  const [tab, setTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scan Presensi</h2>
        <p className="text-muted-foreground">
          {tab === "siswa" || !bisaScanGuru
            ? "Scan QR Code siswa untuk presensi masuk dan pulang"
            : "Presensi untuk Guru & Kepala Sekolah. Status Hadir/Terlambat dihitung otomatis berdasarkan jadwal mengajar."}
        </p>
      </div>

      {bisaScanGuru && (
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setTab("siswa")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
              tab === "siswa"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Scan Siswa
          </button>
          <button
            onClick={() => setTab("guru")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
              tab === "guru"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Scan Guru & Kepala Sekolah
          </button>
        </div>
      )}

      {!bisaScanGuru || tab === "siswa" ? <ScanSiswa /> : <ScanGuru />}
    </div>
  );
}
