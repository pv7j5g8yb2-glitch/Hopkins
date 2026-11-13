import fs from "node:fs";
import path from "node:path";

export const MAX_PAGES = 90;

/** Renders each page of a PDF to a JPEG in outDir (p-01.jpg ...). Pure JavaScript, no system tools. */
export async function renderPdf(data: Uint8Array, outDir: string, start = 1): Promise<number> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false } as any);
  const doc = await task.promise;
  const n = Math.max(0, Math.min(doc.numPages, MAX_PAGES - (start - 1)));
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    // About 820 px wide: legible for the model at roughly half the tokens of a full size page.
    const vp = page.getViewport({ scale: Math.min(1.4, 820 / base.width) });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport: vp, canvas: canvas as any }).promise;
    fs.writeFileSync(path.join(outDir, `p-${String(start + i - 1).padStart(2, "0")}.jpg`), canvas.toBuffer("image/jpeg", 70));
    page.cleanup();
  }
  await task.destroy();
  return n;
}
