import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface RekapPdfOptions {
    title: string;
    subtitleLines: string[];
    head: string[];
    body: (string | number)[][];
    filename: string;
    orientation?: "landscape" | "portrait";
}

export function downloadRekapPdf({
    title,
    subtitleLines,
    head,
    body,
    filename,
    orientation = "landscape",
}: RekapPdfOptions): void {
    const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: "a4",
    });

    const marginLeft = 14;
    let cursorY = 15;

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, marginLeft, cursorY);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    cursorY += 6;
    subtitleLines.forEach((line) => {
        pdf.text(line, marginLeft, cursorY);
        cursorY += 5;
    });

    autoTable(pdf, {
        head: [head],
        body,
        startY: cursorY + 2,
        margin: { left: marginLeft, right: marginLeft },
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: "middle",
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
    });

    const totalPages = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(
            `Halaman ${i} dari ${totalPages}`,
            pageWidth - marginLeft,
            pageHeight - 8,
            { align: "right" },
        );
    }

    pdf.save(filename);
}
