import ExcelJS from "exceljs";

export interface RekapExcelOptions {
    title: string;
    subtitleLines: string[];
    head: string[];
    body: (string | number)[][];
    filename: string;
    sheetName?: string;
}

export async function downloadRekapExcel({
    title,
    subtitleLines,
    head,
    body,
    filename,
    sheetName = "Rekap",
}: RekapExcelOptions): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "EduScan";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);
    const colCount = head.length;

    const thinGrey = { style: "thin" as const, color: { argb: "FFE5E7EB" } };
    const thinBorderGrey = { style: "thin" as const, color: { argb: "FFCBD5E1" } };

    const titleRow = sheet.addRow([title]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, colCount);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.height = 22;

    subtitleLines.forEach((line) => {
        const row = sheet.addRow([line]);
        sheet.mergeCells(row.number, 1, row.number, colCount);
        row.getCell(1).font = {
            italic: true,
            size: 10,
            color: { argb: "FF555555" },
        };
    });

    sheet.addRow([]);

    const headerRow = sheet.addRow(head);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF2563EB" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
            top: thinBorderGrey,
            left: thinBorderGrey,
            bottom: thinBorderGrey,
            right: thinBorderGrey,
        };
    });

    body.forEach((rowData, idx) => {
        const row = sheet.addRow(rowData);
        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: thinGrey,
                left: thinGrey,
                bottom: thinGrey,
                right: thinGrey,
            };
            if (isEven) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF5F7FA" },
                };
            }
            if (typeof rowData[colNumber - 1] === "number") {
                cell.alignment = { horizontal: "center" };
            }
        });
    });

    for (let i = 1; i <= colCount; i++) {
        const headerText = head[i - 1] ? String(head[i - 1]) : "";
        let maxLen = headerText.length;
        body.forEach((rowData) => {
            const value = rowData[i - 1];
            const len = value !== undefined && value !== null ? String(value).length : 0;
            if (len > maxLen) maxLen = len;
        });
        sheet.getColumn(i).width = Math.min(Math.max(maxLen + 4, 10), 40);
    }

    sheet.views = [{ state: "frozen", ySplit: headerRow.number }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
