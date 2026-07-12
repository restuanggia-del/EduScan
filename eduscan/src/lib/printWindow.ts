export function printElement(
    element: HTMLElement | null | undefined,
    documentTitle: string,
) {
    if (!element) {
        alert("Tidak ada konten untuk dicetak.");
        return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
        alert(
            "Popup diblokir oleh browser. Mohon izinkan popup untuk situs ini (klik ikon popup-blocked di address bar) agar bisa mencetak / download PDF.",
        );
        return;
    }

    const styleNodes = Array.from(
        document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
        .map((node) => node.outerHTML)
        .join("\n");

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${documentTitle}</title>
    ${styleNodes}
    <style>
      @page { margin: 12mm; }
      html, body {
        margin: 0;
        padding: 16px;
        background: #ffffff;
      }
    </style>
  </head>
  <body>${element.outerHTML}</body>
</html>`);
    printWindow.document.close();

    printWindow.onload = () => {
        printWindow.focus();

        const images = Array.from(
            printWindow.document.images,
        ) as HTMLImageElement[];

        const pending = images.filter((img) => !img.complete);

        const waitForImages =
            pending.length === 0
                ? Promise.resolve()
                : Promise.all(
                    pending.map(
                        (img) =>
                            new Promise<void>((resolve) => {
                                img.addEventListener("load", () => resolve());
                                img.addEventListener("error", () => resolve());
                            }),
                    ),
                ).then(() => undefined);

        const timeout = new Promise<void>((resolve) =>
            setTimeout(resolve, 4000),
        );

        Promise.race([waitForImages, timeout]).then(() => {
            setTimeout(() => {
                printWindow.print();
            }, 150);
        });
    };
}
