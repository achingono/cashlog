import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface PFSExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function PFSExportButton({ targetRef, fileName = "personal-financial-statement" }: Readonly<PFSExportButtonProps>) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!targetRef.current) return;

    setExporting(true);
    let exportContainer: HTMLDivElement | null = null;
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      const sourceNode = targetRef.current;
      exportContainer = document.createElement("div");
      exportContainer.style.position = "fixed";
      exportContainer.style.left = "-99999px";
      exportContainer.style.top = "0";
      exportContainer.style.width = `${Math.max(1024, sourceNode.scrollWidth)}px`;
      exportContainer.style.pointerEvents = "none";
      exportContainer.style.opacity = "1";

      const clone = sourceNode.cloneNode(true) as HTMLDivElement;
      clone.style.width = "100%";
      clone.style.maxWidth = "none";
      clone.style.overflow = "visible";
      exportContainer.appendChild(clone);
      document.body.appendChild(exportContainer);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pageHeightPx = Math.floor(((pdfHeight - margin * 2) * imgWidth) / contentWidth);
      let page = 0;
      let renderedHeight = 0;

      while (renderedHeight < imgHeight) {
        const sliceCanvas = document.createElement("canvas");
        const sliceHeight = Math.min(pageHeightPx, imgHeight - renderedHeight);
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sliceHeight;
        const context = sliceCanvas.getContext("2d");
        if (!context) {
          throw new Error("Failed to initialize PDF export canvas context");
        }
        context.drawImage(
          canvas,
          0,
          renderedHeight,
          imgWidth,
          sliceHeight,
          0,
          0,
          imgWidth,
          sliceHeight,
        );

        if (page > 0) pdf.addPage();
        const pageImage = sliceCanvas.toDataURL("image/png");
        const pageHeightMm = (sliceHeight * contentWidth) / imgWidth;
        pdf.addImage(pageImage, "PNG", margin, margin, contentWidth, pageHeightMm);

        renderedHeight += sliceHeight;
        page += 1;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      if (exportContainer) {
        exportContainer.remove();
      }
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
      ) : (
        <><Download className="h-4 w-4 mr-2" />Export PDF</>
      )}
    </Button>
  );
}
