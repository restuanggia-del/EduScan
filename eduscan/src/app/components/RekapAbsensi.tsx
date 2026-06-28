import { useState } from "react";
import { cn } from "./ui/utils";
import { useAuth } from "../../lib/AuthContext";
import { RekapSiswa } from "./RekapSiswa";
import { RekapGuru } from "./RekapGuru";

export function RekapAbsensi() {
  const { user } = useAuth();
  const bisaLihatRekapGuru =
    user?.role === "kepala_sekolah" || user?.role === "tu";

  const [tab, setTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="flex flex-col h-full">
      {bisaLihatRekapGuru && (
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
              Rekap Siswa
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
              Rekap Guru & Kepala Sekolah
            </button>
          </div>
        </div>
      )}

      {!bisaLihatRekapGuru || tab === "siswa" ? <RekapSiswa /> : <RekapGuru />}
    </div>
  );
}
