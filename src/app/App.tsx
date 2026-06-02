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

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

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
