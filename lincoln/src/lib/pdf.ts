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

export type FileKind = "pdf" | "jpeg" | "png" | "webp" | "heic";

/** Identifies a file by its first bytes, never by its name. */
export function fileKind(b: Uint8Array): FileKind | null {
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (s(0, 4) === "%PDF") return "pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "png";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "webp";
  if (s(4, 4) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(s(8, 4))) return "heic";
  return null;
}

/**
 * Turns photos and scans into pages: HEIC is converted, the camera's rotation is applied by the
 * decoder, and each image is resized so the longest side is at most 1600 pixels.
 */
export async function renderImages(images: Uint8Array[], outDir: string, start = 1): Promise<number> {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const raw of images) {
    if (start - 1 + n >= MAX_PAGES) break;
    let data = Buffer.from(raw);
    if (fileKind(raw) === "heic") {
      const convert = (await import("heic-convert")).default as (o: { buffer: Buffer; format: "JPEG"; quality: number }) => Promise<ArrayBuffer>;
      data = Buffer.from(await convert({ buffer: data, format: "JPEG", quality: 0.9 }));
    }
    const img = await loadImage(data);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    n++;
    fs.writeFileSync(path.join(outDir, `p-${String(start - 1 + n).padStart(2, "0")}.jpg`), canvas.toBuffer("image/jpeg", 82));
  }
  return n;
}

/** Renders a mixed set of PDFs and images, in order, as consecutive pages. Returns pages added. */
export async function renderFiles(files: Uint8Array[], outDir: string, start = 1): Promise<number> {
  let added = 0;
  for (const f of files) {
    const k = fileKind(f);
    if (k === "pdf") added += await renderPdf(f, outDir, start + added);
    else if (k) added += await renderImages([f], outDir, start + added);
  }
  return added;
}
