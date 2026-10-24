// Draws an ad as the people scrolling will see it: the listing photo, the line on the image,
// the agent's brand. One renderer for the preview, the download and the brand page, so
// what the agent approves is exactly what runs. Feed is 1080x1350 (4:5), story 1080x1920.
(function () {
  const MARK_PLUM = new Path2D("M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z");
  const MARK_GOLD = new Path2D("M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z");
  const images = new Map();
  let fontsReady = null;

  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (!images.has(src)) {
      images.set(src, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }));
    }
    return images.get(src);
  }

  function loadFonts() {
    if (!fontsReady) {
      fontsReady = Promise.all([
        document.fonts.load('700 80px "Inter Tight"'),
        document.fonts.load('400 40px "Inter Tight"'),
        document.fonts.load('400 80px "Instrument Serif"'),
        document.fonts.load('italic 400 80px "Instrument Serif"'),
      ]).catch(() => null);
    }
    return fontsReady;
  }

  function hexRgb(hex) {
    const h = (hex || "#1F2A36").replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgba = (hex, a) => `rgba(${hexRgb(hex).join(",")},${a})`;
  function isDark(hex) {
    const [r, g, b] = hexRgb(hex).map((v) => v / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.55;
  }

  function cover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  function wrap(ctx, text, maxWidth, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = kept[maxLines - 1].replace(/[,.]?$/, "…");
      return kept;
    }
    return lines;
  }

  // Shrinks the type until the line fits in the lines allowed.
  function fitText(ctx, text, font, size, maxWidth, maxLines, min) {
    let s = size;
    while (s > min) {
      ctx.font = font(s);
      const lines = wrap(ctx, text, maxWidth, 99);
      if (lines.length <= maxLines) return { size: s, lines };
      s -= 4;
    }
    ctx.font = font(min);
    return { size: min, lines: wrap(ctx, text, maxWidth, maxLines) };
  }

  // Fine grain, made once per size and reused.
  const grains = new Map();
  function grain(ctx, w, h, amount) {
    const key = `${w}x${h}`;
    if (!grains.has(key)) {
      const g = ctx.createImageData(w, h);
      for (let i = 0; i < g.data.length; i += 4) {
        const v = Math.random() * 255;
        g.data[i] = g.data[i + 1] = g.data[i + 2] = v;
        g.data[i + 3] = amount;
      }
      const off = document.createElement("canvas");
      off.width = w; off.height = h;
      off.getContext("2d").putImageData(g, 0, 0);
      grains.set(key, off);
    }
    const off = grains.get(key);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  function footer(ctx, W, y, brand, ink, logo) {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.92;
    ctx.font = '700 30px "Inter Tight"';
    ctx.textBaseline = "alphabetic";
    const name = brand.agent_name || brand.business || "";
    const sub = brand.agent_name && brand.business ? brand.business : "";
    let x = 72;
    if (logo) {
      const h = 64, w = Math.min(200, (logo.width / logo.height) * h);
      ctx.drawImage(logo, x, y - 48, w, h);
      x += w + 22;
    }
    ctx.fillText(name, x, y);
    if (sub) {
      ctx.globalAlpha = 0.7;
      ctx.font = '400 26px "Inter Tight"';
      ctx.fillText(sub, x, y + 34);
    }
    ctx.restore();
  }

  function watermark(ctx, W, H) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.fillStyle = "rgba(20,8,10,0.28)";
    ctx.fillRect(-W / 2, -92, W, 184);
    ctx.globalAlpha = 0.9;
    const s = 1.25;
    ctx.save();
    ctx.translate(-250, -76);
    ctx.scale(s, s);
    ctx.fillStyle = "#B79DC2";
    ctx.fill(MARK_PLUM);
    ctx.fillStyle = "#D7AE62";
    ctx.fill(MARK_GOLD);
    ctx.restore();
    ctx.fillStyle = "#F4EBDD";
    ctx.font = '700 104px "Inter Tight"';
    ctx.textBaseline = "middle";
    ctx.fillText("Hopkins", -100, 4);
    ctx.font = '700 22px "Inter Tight"';
    ctx.globalAlpha = 0.85;
    ctx.fillText("PREVIEW · FREE PLAN", -96, 70);
    ctx.restore();
  }

  async function render(canvas, opts) {
    const { ad, brand = {}, format = "feed", photo, logo, watermark: wm } = opts;
    await loadFonts();
    const [img, logoImg] = await Promise.all([loadImage(photo), loadImage(logo)]);
    const W = 1080, H = format === "story" ? 1920 : 1350;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const primary = brand.primary || "#1F2A36";
    const accent = brand.accent || "#C8A96A";
    const classic = brand.font === "classic";
    const big = (s) => (classic ? `400 ${s}px "Instrument Serif"` : `700 ${s}px "Inter Tight"`);
    const light = "#FBF8F3";
    const onPrimary = isDark(primary) ? light : "#1A1A1A";
    const story = format === "story";
    // Instagram covers the top and bottom of a story with its own buttons; keep text clear.
    const safeTop = story ? 250 : 0;
    const safeBottom = story ? 330 : 0;
    const letter = classic ? -0.5 : -3;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, W, H);
    if (!img) {
      // No photo yet: a soft light in the brand colour instead of a flat block.
      const glow = ctx.createRadialGradient(W * 0.7, H * 0.25, 40, W * 0.7, H * 0.25, W * 0.9);
      glow.addColorStop(0, isDark(primary) ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }

    const pattern = ad.pattern;
    const kicker = (ad.kicker || "").toUpperCase();

    const drawLines = (lines, x, y, size, color, lh = 0.98) => {
      ctx.fillStyle = color;
      ctx.letterSpacing = `${letter}px`;
      lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
      ctx.letterSpacing = "0px";
    };

    if (pattern === "feature") {
      // Photo on top, a solid block in the brand colour with the one detail.
      const split = story ? 1180 : 860;
      if (img) cover(ctx, img, 0, 0, W, split);
      ctx.fillStyle = primary;
      ctx.fillRect(0, split, W, H - split);
      ctx.fillStyle = accent;
      ctx.fillRect(72, split + 64, 72, 8);
      ctx.font = '700 28px "Inter Tight"';
      ctx.fillStyle = accent;
      ctx.letterSpacing = "3px";
      ctx.fillText(kicker, 168, split + 76);
      ctx.letterSpacing = "0px";
      const t = fitText(ctx, ad.overlay, big, story ? 100 : 92, W - 144, 3, 52);
      ctx.textBaseline = "alphabetic";
      ctx.font = big(t.size);
      drawLines(t.lines, 72, split + 110 + t.size * 0.9, t.size, onPrimary);
      footer(ctx, W, H - 64 - safeBottom * 0.6, brand, onPrimary, logoImg);
    } else if (pattern === "facts") {
      // Photo full bleed, a card in the brand colour with the price as the big number.
      if (img) cover(ctx, img, 0, 0, W, H);
      const cardH = 430;
      const cy = H - cardH - 64 - safeBottom;
      ctx.fillStyle = rgba(primary, 0.94);
      roundRect(ctx, 56, cy, W - 112, cardH, 28);
      ctx.fill();
      ctx.textBaseline = "alphabetic";
      ctx.font = big(classic ? 84 : 72);
      drawLines([ad.overlay], 104, cy + 112, 72, onPrimary);
      const price = opts.price || "";
      if (price) {
        ctx.font = big(classic ? 150 : 132);
        drawLines([price], 100, cy + 262, 132, accent);
      }
      ctx.font = '400 34px "Inter Tight"';
      ctx.fillStyle = onPrimary;
      ctx.globalAlpha = 0.9;
      ctx.fillText([kicker && kicker.toLowerCase() !== (ad.overlay || "").toLowerCase() ? ad.kicker : "", opts.place].filter(Boolean).join("  ·  "), 104, cy + 340);
      ctx.globalAlpha = 1;
      ctx.font = '700 28px "Inter Tight"';
      ctx.fillStyle = onPrimary;
      ctx.globalAlpha = 0.75;
      ctx.fillText(brand.agent_name || brand.business || "", 104, cy + cardH - 40);
      ctx.globalAlpha = 1;
      if (logoImg) {
        const h = 56, w = Math.min(180, (logoImg.width / logoImg.height) * h);
        ctx.drawImage(logoImg, W - 104 - w, cy + cardH - 40 - h + 12, w, h);
      }
    } else {
      // The life: photo full bleed, the line large over a fade into the brand colour.
      if (img) cover(ctx, img, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, H * 0.32, 0, H);
      g.addColorStop(0, rgba(primary, 0));
      g.addColorStop(0.55, rgba(primary, 0.78));
      g.addColorStop(1, rgba(primary, 0.97));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const t = fitText(ctx, ad.overlay, big, story ? 128 : 116, W - 144, 3, 60);
      const bottom = H - 190 - safeBottom;
      const top = bottom - (t.lines.length - 1) * t.size * 0.98;
      ctx.font = '700 28px "Inter Tight"';
      ctx.fillStyle = accent;
      ctx.letterSpacing = "3px";
      ctx.fillText(kicker, 72, top - t.size - 6);
      ctx.letterSpacing = "0px";
      ctx.font = big(t.size);
      drawLines(t.lines, 72, top, t.size, light);
      footer(ctx, W, H - 72 - safeBottom, brand, light, logoImg);
    }

    if (!img) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = onPrimary;
      ctx.font = '400 30px "Inter Tight"';
      ctx.fillText("Your photo goes here", 72, 120 + safeTop);
      ctx.restore();
    }
    grain(ctx, W, H, 14);
    if (wm) watermark(ctx, W, H);
    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.Creative = { render, loadImage };
})();
