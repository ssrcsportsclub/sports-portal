/**
 * Renders a DOM element to a paginated A4 PDF.
 *
 * jspdf and html2canvas are imported on demand so they stay out of the
 * initial bundle. Page breaks snap to `[data-pdf-section]` blocks (kept whole
 * when they fit on a page) and, optionally, to table-row boundaries.
 */

const OKLCH_PROPS = [
  "color",
  "background-color",
  "border-color",
  "box-shadow",
  "background-image",
];

/** html2canvas cannot parse Tailwind v4's oklch/oklab colours. */
const stripModernColors = (documentClone: Document) => {
  const elements = documentClone.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    const style = window.getComputedStyle(el);
    for (const prop of OKLCH_PROPS) {
      const val = style.getPropertyValue(prop);
      if (val && (val.includes("oklch") || val.includes("oklab"))) {
        el.style.setProperty(prop, "transparent", "important");
      }
    }
    if (
      el.style.cssText.includes("oklch") ||
      el.style.cssText.includes("oklab")
    ) {
      el.style.cssText = el.style.cssText
        .replace(/oklch\([^)]+\)/g, "rgba(0,0,0,0.1)")
        .replace(/oklab\([^)]+\)/g, "rgba(0,0,0,0.1)");
    }
  }
};

export const exportElementToPdf = async (
  container: HTMLElement,
  fileName: string,
  { snapToRows = false }: { snapToRows?: boolean } = {},
) => {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const originalStyle = container.style.cssText;
  container.style.height = "auto";
  container.style.overflow = "visible";

  const containerTop = container.getBoundingClientRect().top;
  const containerScrollWidth = container.scrollWidth;
  const rowBottomsDom = snapToRows
    ? Array.from(container.querySelectorAll("tr")).map(
        (row) => row.getBoundingClientRect().bottom - containerTop,
      )
    : [];
  const sectionRectsDom = Array.from(
    container.querySelectorAll("[data-pdf-section]"),
  ).map((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top - containerTop, bottom: rect.bottom - containerTop };
  });

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: containerScrollWidth,
      onclone: stripModernColors,
    });
  } finally {
    container.style.cssText = originalStyle;
  }

  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "l" : "p",
    unit: "pt",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const pageMargin = 24;
  const usableWidth = pdfWidth - pageMargin * 2;
  const usableHeight = pdfHeight - pageMargin * 2;

  const widthScale = usableWidth / canvas.width;
  const imgWidth = usableWidth;
  const imgHeight = canvas.height * widthScale;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  // DOM px → canvas px → PDF pt
  const domToPdfScale = (canvas.width / containerScrollWidth) * widthScale;
  const rowBottomsPdf = rowBottomsDom.map((y) => y * domToPdfScale);
  const sectionRectsPdf = sectionRectsDom.map(({ top, bottom }) => ({
    top: top * domToPdfScale,
    bottom: bottom * domToPdfScale,
  }));

  const pageStarts: number[] = [0];
  let currentStart = 0;
  const minGap = 12;
  while (currentStart + usableHeight < imgHeight) {
    const nominalBreak = currentStart + usableHeight;

    // Push a section that would be split (and fits on one page) to the next page.
    const overflowingSection = sectionRectsPdf.find(
      ({ top, bottom }) =>
        top < nominalBreak &&
        bottom > nominalBreak &&
        bottom - top <= usableHeight,
    );

    let smartBreak = nominalBreak;
    if (overflowingSection) {
      smartBreak = overflowingSection.top;
    } else {
      // Otherwise break after the last full row that fits.
      const rowsBeforeBreak = rowBottomsPdf.filter(
        (y) => y > currentStart + minGap && y <= nominalBreak,
      );
      if (rowsBeforeBreak.length)
        smartBreak = rowsBeforeBreak[rowsBeforeBreak.length - 1];
    }

    // Always make forward progress.
    if (smartBreak <= currentStart + minGap) smartBreak = nominalBreak;

    pageStarts.push(smartBreak);
    currentStart = smartBreak;
  }

  pageStarts.forEach((start, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "JPEG",
      pageMargin,
      pageMargin - start,
      imgWidth,
      imgHeight,
    );

    // Mask the previous page's tail bleeding into the top margin...
    pdf.setFillColor(255, 255, 255);
    if (i > 0) pdf.rect(0, 0, pdfWidth, pageMargin, "F");

    // ...and whatever belongs to the next page.
    const next = pageStarts[i + 1];
    if (next !== undefined) {
      const visibleHeight = next - start;
      pdf.rect(
        0,
        pageMargin + visibleHeight,
        pdfWidth,
        pdfHeight - (pageMargin + visibleHeight),
        "F",
      );
    }
  });

  pdf.save(fileName);
};

/**
 * Resolves after the browser has painted pending React updates. Background
 * tabs pause requestAnimationFrame, so a timer guarantees we never hang.
 */
export const nextPaint = () =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 150);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      }),
    );
  });
