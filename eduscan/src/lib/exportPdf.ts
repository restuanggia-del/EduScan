import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

function waitForImages(root: HTMLElement): Promise<void> {
    const images = Array.from(root.querySelectorAll("img"));
    const pending = images.filter((img) => !img.complete);

    if (pending.length === 0) {
        return Promise.resolve();
    }

    const loadAll = Promise.all(
        pending.map(
            (img) =>
                new Promise<void>((resolve) => {
                    img.addEventListener("load", () => resolve());
                    img.addEventListener("error", () => resolve());
                }),
        ),
    ).then(() => undefined);

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));

    return Promise.race([loadAll, timeout]);
}

async function buildCardsPdf(
    sourceElement: HTMLElement,
    orientation: "landscape" | "portrait",
): Promise<InstanceType<typeof jsPDF>> {
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "-10000px";
    clone.style.margin = "0";
    clone.style.width = orientation === "landscape" ? "1280px" : "820px";
    clone.style.background = "#ffffff";
    document.body.appendChild(clone);

    try {
        const clonedImages = Array.from(clone.querySelectorAll("img"));
        clonedImages.forEach((img) => {
            if (!img.crossOrigin) {
                const src = img.src;
                img.crossOrigin = "anonymous";
                img.src = src;
            }
        });

        await waitForImages(clone);
        await new Promise((resolve) => setTimeout(resolve, 80));

        const pageNodes = Array.from(
            clone.querySelectorAll<HTMLElement>(".print-qr-page"),
        );

        if (pageNodes.length === 0) {
            throw new Error("Tidak ada kartu untuk diproses.");
        }

        const pdf = new jsPDF({
            orientation,
            unit: "mm",
            format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const usableWidth = pageWidth - margin * 2;
        const usableHeight = pageHeight - margin * 2;

        for (let i = 0; i < pageNodes.length; i++) {
            const node = pageNodes[i];

            const canvas = await html2canvas(node, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const imgRatio = canvas.width / canvas.height;

            let renderWidth = usableWidth;
            let renderHeight = renderWidth / imgRatio;

            if (renderHeight > usableHeight) {
                renderHeight = usableHeight;
                renderWidth = renderHeight * imgRatio;
            }

            const x = margin + (usableWidth - renderWidth) / 2;
            const y = margin + (usableHeight - renderHeight) / 2;

            if (i > 0) {
                pdf.addPage();
            }

            pdf.addImage(imgData, "JPEG", x, y, renderWidth, renderHeight);
        }

        return pdf;
    } finally {
        document.body.removeChild(clone);
    }
}

export async function downloadCardsPdf(
    sourceElement: HTMLElement,
    filename: string,
    orientation: "landscape" | "portrait" = "landscape",
): Promise<void> {
    const pdf = await buildCardsPdf(sourceElement, orientation);
    pdf.save(filename);
}

export async function openCardsPdfForPrint(
    sourceElement: HTMLElement,
    orientation: "landscape" | "portrait" = "landscape",
): Promise<void> {
    const newTab = window.open("", "_blank");

    if (!newTab) {
        alert(
            "Popup diblokir oleh browser. Mohon izinkan popup untuk situs ini agar PDF bisa dibuka di tab baru.",
        );
        return;
    }

    newTab.document.write(
        "<title>Menyiapkan PDF...</title><body style='font-family:sans-serif;padding:24px;color:#555'>Menyiapkan PDF, mohon tunggu sebentar...</body>",
    );

    try {
        const pdf = await buildCardsPdf(sourceElement, orientation);
        const blobUrl = pdf.output("bloburl") as unknown as string;
        newTab.location.href = blobUrl;
    } catch (err) {
        newTab.close();
        throw err;
    }
}
