import { useState, useEffect, useRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, School, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { supabase } from "../../lib/supabaseClient";
import { downloadCardsPdf, openCardsPdfForPrint } from "../../lib/exportPdf";

interface Staff {
  key: string;
  nama: string;
  nip: string | null;
  peran: "guru" | "kepala_sekolah" | "tu";
  foto?: string;
}

const CARDS_PER_PAGE = 4;

function chunkStudents<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

interface StaffCardProps {
  staff: Staff;
}

const peranLabel: Record<Staff["peran"], string> = {
  guru: "Guru",
  kepala_sekolah: "Kepala Sekolah",
  tu: "TU",
};

function StaffCard({ staff }: StaffCardProps) {
  return (
    <div className="qr-card bg-white rounded-lg border-2 border-primary overflow-hidden w-[300px]">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <School className="w-6 h-6 text-white" />
          <h3 className="text-white font-bold text-lg">SMK MMT</h3>
        </div>
        <p className="text-white/90 text-xs">Penawar Aji</p>
      </div>

      <div className="qr-card-body p-4 space-y-3">
        <div className="flex justify-center mb-3">
          {staff.foto ? (
            <img
              src={staff.foto}
              alt={staff.nama}
              className="qr-card-photo w-24 h-24 rounded-lg object-cover border-2 border-primary"
            />
          ) : (
            <div className="qr-card-photo w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-primary">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nama:</span>
            <p className="font-bold text-foreground">{staff.nama}</p>
          </div>
          <div>
            <span className="text-muted-foreground">NUPTK:</span>
            <p className="font-bold text-foreground">{staff.nip || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Peran:</span>
            <p className="font-bold text-foreground">
              {peranLabel[staff.peran]}
            </p>
          </div>
        </div>

        <div className="qr-card-qr flex justify-center pt-3 border-t">
          <div className="bg-white p-2 rounded-lg">
            {staff.nip ? (
              <QRCodeSVG value={staff.nip} size={120} level="H" />
            ) : (
              <div className="w-[120px] h-[120px] flex items-center justify-center text-xs text-center text-muted-foreground px-2">
                NIP belum diisi
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GenerateGuru() {
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [selectedPeran, setSelectedPeran] = useState<
    "" | "guru" | "kepala_sekolah_tu"
  >("");
  const [selectedStaff, setSelectedStaff] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const staffPrintRef = useRef<HTMLDivElement>(null);
  const [downloadingStaffPdf, setDownloadingStaffPdf] = useState(false);
  const [preparingStaffPrint, setPreparingStaffPrint] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    setLoadingStaff(true);

    const { data: guruData, error: guruError } = await supabase
      .from("guru")
      .select("id, nama, nip, foto_url")
      .order("nama");

    const { data: ksData, error: ksError } = await supabase
      .from("users")
      .select("id, nama, nip, role")
      .in("role", ["kepala_sekolah", "tu"])
      .order("nama");

    if (guruError) console.error("Error fetching guru:", guruError.message);
    if (ksError) console.error("Error fetching users:", ksError.message);

    const guruStaff: Staff[] = (guruData || []).map((g) => ({
      key: g.id,
      nama: g.nama,
      nip: g.nip,
      peran: "guru",
      foto: g.foto_url,
    }));

    const ksStaff: Staff[] = (ksData || []).map((u) => ({
      key: u.id,
      nama: u.nama,
      nip: u.nip,
      peran: u.role === "kepala_sekolah" ? "kepala_sekolah" : "tu",
    }));

    setAllStaff([...ksStaff, ...guruStaff]);
    setLoadingStaff(false);
  };

  const handleGenerateStaffSingle = (staff: Staff) => {
    setSelectedStaff([staff]);
  };

  const handleGenerateStaffByPeran = () => {
    if (selectedPeran === "guru") {
      setSelectedStaff(allStaff.filter((s) => s.peran === "guru"));
    } else if (selectedPeran === "kepala_sekolah_tu") {
      setSelectedStaff(
        allStaff.filter(
          (s) => s.peran === "kepala_sekolah" || s.peran === "tu",
        ),
      );
    }
  };

  const handleGenerateStaffAll = () => {
    setSelectedStaff(allStaff);
    setSelectedPeran("");
  };

  const handlePrintStaff = async () => {
    if (!staffPrintRef.current) return;
    setPreparingStaffPrint(true);
    try {
      await openCardsPdfForPrint(staffPrintRef.current, "landscape");
    } catch (err) {
      console.error("Gagal menyiapkan PDF untuk dicetak:", err);
      const pesan = err instanceof Error ? err.message : String(err);
      alert(`Gagal menyiapkan PDF untuk dicetak: ${pesan}`);
    } finally {
      setPreparingStaffPrint(false);
    }
  };

  const handleDownloadStaffPdf = async () => {
    if (!staffPrintRef.current) return;
    setDownloadingStaffPdf(true);
    try {
      const namaFile = `kartu-qr-${selectedPeran || "guru-kepsek-tu"}.pdf`;
      await downloadCardsPdf(staffPrintRef.current, namaFile, "landscape");
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      const pesan = err instanceof Error ? err.message : String(err);
      alert(`Gagal membuat PDF: ${pesan}`);
    } finally {
      setDownloadingStaffPdf(false);
    }
  };

  const displayedStaff =
    selectedPeran === "guru"
      ? allStaff.filter((s) => s.peran === "guru")
      : selectedPeran === "kepala_sekolah_tu"
        ? allStaff.filter(
            (s) => s.peran === "kepala_sekolah" || s.peran === "tu",
          )
        : allStaff;

  const staffPrintPages = useMemo(
    () => chunkStudents(selectedStaff, CARDS_PER_PAGE),
    [selectedStaff],
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <Card>
          <CardHeader>
            <CardTitle>Cetak Per Peran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Peran</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPeran}
                onChange={(e) =>
                  setSelectedPeran(
                    e.target.value as "" | "guru" | "kepala_sekolah_tu",
                  )
                }
              >
                <option value="">Pilih Peran</option>
                <option value="guru">Guru</option>
                <option value="kepala_sekolah_tu">Kepala Sekolah & TU</option>
              </select>
            </div>
            <Button
              className="w-full cursor-pointer"
              onClick={handleGenerateStaffByPeran}
              disabled={!selectedPeran}
            >
              <Printer className="w-4 h-4" />
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cetak Semua Kartu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate kartu untuk seluruh guru & kepala sekolah/TU (
              {allStaff.length} orang)
            </p>
            <Button
              className="w-full cursor-pointer"
              onClick={handleGenerateStaffAll}
              disabled={loadingStaff}
            >
              <Printer className="w-4 h-4" />
              Generate Semua Kartu
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Info Generate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Guru & Kepsek/TU:
                </span>
                <span className="font-bold">{allStaff.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dipilih:</span>
                <span className="font-bold">{selectedStaff.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Guru & Kepala Sekolah/TU</CardTitle>
            {selectedStaff.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handlePrintStaff}
                  disabled={preparingStaffPrint}
                  className="cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  {preparingStaffPrint ? "Menyiapkan PDF..." : "Cetak"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadStaffPdf}
                  disabled={downloadingStaffPdf}
                  className="cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {downloadingStaffPdf ? "Membuat PDF..." : "Download PDF"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingStaff ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : displayedStaff.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Belum ada data guru/kepala sekolah/TU.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      NIP
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Peran
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStaff.map((staff, index) => (
                    <tr
                      key={staff.key}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{staff.nip || "-"}</td>
                      <td className="py-3 px-4 font-medium">{staff.nama}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {peranLabel[staff.peran]}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateStaffSingle(staff)}
                          disabled={!staff.nip}
                          className="cursor-pointer"
                          title={
                            !staff.nip
                              ? "Lengkapi NIP dulu di Data Guru"
                              : undefined
                          }
                        >
                          <Printer className="w-4 h-4" />
                          Generate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStaff.length > 0 && (
        <Card>
          <CardHeader className="no-print">
            <CardTitle>
              Preview Kartu ({selectedStaff.length} kartu,{" "}
              {staffPrintPages.length} halaman saat dicetak)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={staffPrintRef} className="print-area">
              <div className="print-header">
                <h3 className="font-bold text-lg">
                  Kartu QR Presensi Guru & Kepala Sekolah/TU
                </h3>
                <p className="text-sm">
                  {selectedPeran === "guru"
                    ? "Guru"
                    : selectedPeran === "kepala_sekolah_tu"
                      ? "Kepala Sekolah & TU"
                      : "Semua"}{" "}
                  &middot; {selectedStaff.length} orang &middot; Dicetak:{" "}
                  {new Date().toLocaleDateString("id-ID")}
                </p>
              </div>
              {staffPrintPages.map((pageStaff, pageIndex, allPages) => (
                <div
                  key={pageIndex}
                  className={
                    "print-qr-page" +
                    (pageIndex < allPages.length - 1
                      ? " print-qr-page-break"
                      : "")
                  }
                >
                  <div className="print-qr-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pageStaff.map((staff) => (
                      <div
                        key={staff.key}
                        className="flex justify-center print-qr-card"
                      >
                        <StaffCard staff={staff} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
