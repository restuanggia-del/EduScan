import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { DataSiswa } from "./components/DataSiswa";
import { ManajemenKelas } from "./components/ManajemenKelas";
import { GenerateQR } from "./components/GenerateQR";
import { ScanAbsensi } from "./components/ScanAbsensi";
import { Pengaturan } from "./components/Pengaturan";
import { Toaster } from "sonner";
import { RekapAbsensi } from "./components/RekapAbsensi";
import { useAuth } from "../lib/AuthContext";
import { Login } from "./components/Login";

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  const renderPage = () => {
    const role = user?.role;

    const restricted: Record<string, string[]> = {
      kelas: ["kepala_sekolah", "tu"],
      guru: ["kepala_sekolah", "tu"],
      qr: ["kepala_sekolah", "tu"],
      pengaturan: ["kepala_sekolah"],
    };

    if (
      restricted[currentPage] &&
      role &&
      !restricted[currentPage].includes(role)
    ) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-6xl">🚫</div>
          <h2 className="text-2xl font-bold">Akses Ditolak</h2>
          <p className="text-muted-foreground text-center">
            Kamu tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <button
            onClick={() => setCurrentPage("dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "siswa":
        return <DataSiswa searchQuery={searchQuery} />;
      case "kelas":
        return <ManajemenKelas />;
      case "guru":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-6xl">🚧</div>
            <h2 className="text-2xl font-bold">Data Guru</h2>
            <p className="text-muted-foreground text-center">
              Halaman ini sedang dalam pengembangan (Tahap 3 berikutnya).
            </p>
          </div>
        );
      case "qr":
        return <GenerateQR />;
      case "scan":
        return <ScanAbsensi />;
      case "rekap":
        return <RekapAbsensi />;
      case "pengaturan":
        return <Pengaturan />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="size-full flex bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onSearch={setSearchQuery} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
