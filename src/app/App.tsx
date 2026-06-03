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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "siswa":
        return <DataSiswa />;
      case "kelas":
        return <ManajemenKelas />;
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
        <Header />

        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
