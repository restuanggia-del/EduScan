import { useState } from "react";
import { cn } from "../../components/ui/utils";
import { GenerateSiswa } from "../siswa/GenerateSiswa";
import { GenerateGuru } from "../guru/GenerateGuru";

export function GenerateQR() {
  const [activeTab, setActiveTab] = useState<"siswa" | "guru">("siswa");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Generate Kartu QR Code
        </h2>
        <p className="text-muted-foreground">
          Generate dan cetak kartu siswa, guru, dan kepala sekolah/TU dengan QR
          Code
        </p>
      </div>

      <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1 no-print">
        <button
          onClick={() => setActiveTab("siswa")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
            activeTab === "siswa"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Siswa
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
          Guru & Kepala Sekolah/TU
        </button>
      </div>

      {activeTab === "siswa" ? <GenerateSiswa /> : <GenerateGuru />}
    </div>
  );
}
