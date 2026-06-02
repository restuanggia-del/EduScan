import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { DataSiswa } from "./components/DataSiswa";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "siswa":
        return <DataSiswa />;
      case "kelas":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Manajemen Kelas</h2>
            <p className="text-muted-foreground mt-2">Fitur ini akan segera hadir...</p>
          </div>
        );
      case "qr":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Generate QR Code</h2>
            <p className="text-muted-foreground mt-2">Fitur ini akan segera hadir...</p>
          </div>
        );
      case "rekap":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Rekap Absensi</h2>
            <p className="text-muted-foreground mt-2">Fitur ini akan segera hadir...</p>
          </div>
        );
      case "pengaturan":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Pengaturan</h2>
            <p className="text-muted-foreground mt-2">Fitur ini akan segera hadir...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="size-full flex bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}