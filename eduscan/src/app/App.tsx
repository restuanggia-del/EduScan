import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { DataSiswa } from "./components/DataSiswa";
import { ManajemenKelas } from "./components/ManajemenKelas";
import { DataGuru } from "./components/DataGuru";
import { GenerateQR } from "./components/GenerateQR";
import { ScanAbsensi } from "./components/ScanAbsensi";
import { Pengaturan } from "./components/Pengaturan";
import { Toaster } from "sonner";
import { RekapAbsensi } from "./components/RekapAbsensi";
import { AbsenSaya } from "./components/AbsenSaya";
import { useAuth, getEffectiveRole } from "../lib/AuthContext";
import { Login } from "./components/Login";
import { Register } from "./components/Register";

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return authMode === "login" ? (
      <Login onRegisterClick={() => setAuthMode("register")} />
    ) : (
      <Register onBack={() => setAuthMode("login")} />
    );
  }

  const renderPage = () => {
    const effectiveRole = getEffectiveRole(user);

    const restricted: Record<string, string[]> = {
      kelas: ["kepala_sekolah", "tu"],
      guru: ["kepala_sekolah", "tu"],
      qr: ["kepala_sekolah", "tu"],
      pengaturan: ["kepala_sekolah"],
      siswa: ["kepala_sekolah", "tu", "guru_wali_kelas"],
      scan: ["kepala_sekolah", "tu", "guru_wali_kelas"],
      rekap: ["kepala_sekolah", "tu", "guru_wali_kelas"],
      "absen-saya": ["guru_biasa", "guru_wali_kelas"],
    };

    if (
      restricted[currentPage] &&
      effectiveRole &&
      !restricted[currentPage].includes(effectiveRole)
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
        return <DataGuru />;
      case "qr":
        return <GenerateQR />;
      case "scan":
        return <ScanAbsensi />;
      case "rekap":
        return <RekapAbsensi />;
      case "pengaturan":
        return <Pengaturan />;
      case "absen-saya":
        return <AbsenSaya />;
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
