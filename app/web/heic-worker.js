// Opens an iPhone HEIC photo off the main thread with libheif (WebAssembly), resizes it to the
// size the app keeps photos at, and sends back a JPEG, so the page stays smooth while it works.
importScripts("/static/libheif-1.23.5.js");
// libheif fills in the object it's given and says when it's ready.
const ready = new Promise((resolve) => {
  const lib = { locateFile: () => "/static/libheif-1.23.5.wasm", onRuntimeInitialized: () => resolve(lib) };
  libheif(lib);
});
self.onmessage = async ({ data: { id, buffer, short, long, quality } }) => {
  try {
    const lib = await ready;
    const [image] = new lib.HeifDecoder().decode(new Uint8Array(buffer));
    if (!image) throw new Error("no image");
    const width = image.get_width(), height = image.get_height();
    const pixels = await new Promise((resolve, reject) =>
      image.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, (d) => (d ? resolve(d.data) : reject(new Error("decode failed")))));
    image.free?.();
    const full = await createImageBitmap(new ImageData(pixels, width, height));
    const s = Math.min(1, short / Math.min(width, height), long / Math.max(width, height));
    const c = new OffscreenCanvas(Math.round(width * s), Math.round(height * s));
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(full, 0, 0, c.width, c.height);
    full.close();
    self.postMessage({ id, blob: await c.convertToBlob({ type: "image/jpeg", quality }) });
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
