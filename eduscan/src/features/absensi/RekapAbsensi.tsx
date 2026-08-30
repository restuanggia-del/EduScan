import { useState } from "react";
import { cn } from "../../components/ui/utils";
import { useAuth } from "../../contexts/AuthContext";
import { RekapSiswa } from "../siswa/RekapSiswa";
import { RekapGuru } from "../guru/RekapGuru";

export function RekapAbsensi() {
  const { user } = useAuth();
  const bisaLihatRekapGuru =
    user?.role === "kepala_sekolah" || user?.role === "tu";

  const [tab, setTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {tab === "siswa" || !bisaLihatRekapGuru
            ? "Rekap Presensi"
            : "Rekap Presensi Guru & Kepala Sekolah"}
        </h2>
        <p className="text-muted-foreground">
          {tab === "siswa" || !bisaLihatRekapGuru
            ? "Laporan kehadiran siswa berdasarkan periode"
            : "Laporan kehadiran guru & KS berdasarkan periode"}
        </p>
      </div>

      {bisaLihatRekapGuru && (
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1 no-print">
          <button
            onClick={() => setTab("siswa")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
              tab === "siswa"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Rekap Siswa
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
            Rekap Guru & Kepala Sekolah
          </button>
        </div>
      )}

      {!bisaLihatRekapGuru || tab === "siswa" ? <RekapSiswa /> : <RekapGuru />}
    </div>
  );
}
