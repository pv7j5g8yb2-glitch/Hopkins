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
  const lum = (hex) => {
    const [r, g, b] = hexRgb(hex).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // A label colour too close to its background (gold on cream) is darkened or lightened just
  // enough to read, the way bronze stands in for gold on cream.
  function readableOn(col, bg, min = 2.2) {
    if (contrast(col, bg) >= min) return col;
    const to = isDark(bg) ? 255 : 0;
    const c = hexRgb(col);
    for (let t = 0.1; t <= 1; t += 0.1) {
      const m = "#" + c.map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, "0")).join("");
      if (contrast(m, bg) >= min) return m;
    }
    return isDark(bg) ? "#FFFFFF" : "#111111";
  }

  // Fills the box with the photo, cropping what doesn't fit; fy picks which part stays in view
  // (0 the top, 0.5 the middle, 1 the bottom).
  function cover(ctx, img, x, y, w, h, fy = 0.5) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * fy, iw, ih);
    ctx.restore();
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

  // Every ad can carry its own look in ad.style, set from the chat or the Style sheet:
  //   bg      the colour of the fade, block, card or frame (default: the brand colour)
  //   accent  the small label and the price (default: the brand accent)
  //   text    the big line (default: light or dark, whichever reads on the background)
  //   font    "modern" (Inter Tight bold) or "classic" (Instrument Serif)
  //   layout  "fade" (photo full, fades into the colour at the bottom), "top" (the same from
  //           the top), "split" (photo above, solid block below), "card" (photo full, a card
  //           with the price), "frame" (photo framed in the colour, text below)
  //   size    0.7 to 1.4 times the usual text size
  //   align   "left" or "center"
  //   focus   which part of the photo stays in view: "top", "center" or "bottom"
  //   fade    "light", "normal" or "strong"
  // With no style the three versions keep their own layouts (fade, split, card).
  const LAYOUT_FOR = { life: "fade", feature: "split", facts: "card" };
  const HEX = /^#[0-9a-f]{6}$/i;

  async function render(canvas, opts) {
    const { ad, brand = {}, format = "feed", photo, logo, face, watermark: wm } = opts;
    const st = ad.style || {};
    await loadFonts();
    const [img, logoImg, faceImg] = await Promise.all([loadImage(photo), loadImage(logo), st.face === "on" ? loadImage(face) : null]);
    const W = 1080, H = format === "story" ? 1920 : 1350;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const primary = HEX.test(st.bg || "") ? st.bg : brand.primary || "#1F2A36";
    const accent = readableOn(HEX.test(st.accent || "") ? st.accent : brand.accent || "#C8A96A", primary);
    const classic = (st.font || brand.font) === "classic";
    const scale = Math.min(1.4, Math.max(0.7, Number(st.size) || 1));
    const big = (s) => (classic ? `400 ${Math.round(s)}px "Instrument Serif"` : `700 ${Math.round(s)}px "Inter Tight"`);
    const light = "#FBF8F3";
    const onPrimary = HEX.test(st.text || "") ? st.text : isDark(primary) ? light : "#1A1A1A";
    const onPhoto = HEX.test(st.text || "") ? st.text : light;
    const story = format === "story";
    // Instagram covers the top and bottom of a story with its own buttons; keep text clear.
    const safeTop = story ? 250 : 0;
    const safeBottom = story ? 330 : 0;
    const letter = classic ? -0.5 : -3;
    const layout = ["fade", "top", "split", "card", "frame"].includes(st.layout) ? st.layout : LAYOUT_FOR[ad.pattern] || "fade";
    const center = st.align === "center";
    const focus = st.focus === "top" ? 0 : st.focus === "bottom" ? 1 : 0.5;
    const fade = st.fade === "light" ? 0.62 : st.fade === "strong" ? 1.18 : 1;
    const X = center ? W / 2 : 72;

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

    const kicker = (ad.kicker || "").toUpperCase();
    const photoAt = (x, y, w, h) => { if (img) cover(ctx, img, x, y, w, h, focus); };
    const drawLines = (lines, x, y, size, color, lh = 0.98) => {
      ctx.fillStyle = color;
      ctx.letterSpacing = `${letter}px`;
      lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
      ctx.letterSpacing = "0px";
    };
    const label = (text, x, y, withBar) => {
      if (!text) return;
      ctx.font = '700 28px "Inter Tight"';
      ctx.fillStyle = accent;
      ctx.letterSpacing = "3px";
      if (withBar && !center) {
        ctx.fillRect(x, y - 12, 72, 8);
        ctx.fillText(text, x + 96, y);
      } else ctx.fillText(text, x, y);
      ctx.letterSpacing = "0px";
    };
    const fadeTo = (y0, y1, a0, aMid, a1) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, rgba(primary, Math.min(1, a0 * fade)));
      g.addColorStop(0.55, rgba(primary, Math.min(1, aMid * fade)));
      g.addColorStop(1, rgba(primary, Math.min(1, a1 * fade)));
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
    };
    ctx.textAlign = center ? "center" : "left";
    ctx.textBaseline = "alphabetic";

    if (layout === "split" || layout === "frame") {
      // Photo above (framed in the colour for "frame"), a solid block below with the line.
      const split = story ? 1180 : 860;
      if (layout === "frame") photoAt(48, 48 + safeTop * 0.4, W - 96, split - 48 - safeTop * 0.4);
      else photoAt(0, 0, W, split);
      label(kicker, X, split + 76, true);
      const t = fitText(ctx, ad.overlay, big, (story ? 100 : 92) * scale, W - 144, 3, 52 * scale);
      ctx.font = big(t.size);
      drawLines(t.lines, X, split + 110 + t.size * 0.9, t.size, onPrimary);
      ctx.textAlign = "left";
      footer(ctx, W, H - 64 - safeBottom * 0.6, brand, onPrimary, logoImg);
    } else if (layout === "card") {
      // Photo full bleed, a card in the colour with the price as the big number.
      photoAt(0, 0, W, H);
      const cardH = 430;
      const cy = H - cardH - 64 - safeBottom;
      ctx.fillStyle = rgba(primary, 0.94);
      roundRect(ctx, 56, cy, W - 112, cardH, 28);
      ctx.fill();
      const cx = center ? W / 2 : 104;
      ctx.font = big((classic ? 84 : 72) * scale);
      drawLines([ad.overlay], cx, cy + 112, 72 * scale, onPrimary);
      const price = opts.price || "";
      if (price) {
        ctx.font = big((classic ? 150 : 132) * scale);
        drawLines([price], center ? cx : 100, cy + 262, 132, accent);
      }
      ctx.font = '400 34px "Inter Tight"';
      ctx.fillStyle = onPrimary;
      ctx.globalAlpha = 0.9;
      const small = kicker && kicker.toLowerCase() !== (ad.overlay || "").toLowerCase() ? ad.kicker : "";
      const place = opts.place && !small.toLowerCase().includes(String(opts.place).toLowerCase()) ? opts.place : "";
      ctx.fillText([small, place].filter(Boolean).join("  ·  "), cx, cy + 340);
      ctx.globalAlpha = 1;
      ctx.font = '700 28px "Inter Tight"';
      ctx.globalAlpha = 0.75;
      ctx.fillText(brand.agent_name || brand.business || "", cx, cy + cardH - 40);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      if (logoImg) {
        const h = 56, w = Math.min(180, (logoImg.width / logoImg.height) * h);
        ctx.drawImage(logoImg, W - 104 - w, cy + cardH - 40 - h + 12, w, h);
      }
    } else if (layout === "top") {
      // Photo full bleed, the line large at the top over a fade from the colour.
      photoAt(0, 0, W, H);
      fadeTo(0, H * 0.62, 0.97, 0.7, 0);
      fadeTo(H * 0.78, H, 0, 0.35, 0.75);
      const t = fitText(ctx, ad.overlay, big, (story ? 128 : 116) * scale, W - 144, 3, 60 * scale);
      const top = 150 + safeTop + t.size * 0.85;
      label(kicker, X, top - t.size - 6);
      ctx.font = big(t.size);
      drawLines(t.lines, X, top, t.size, onPhoto);
      ctx.textAlign = "left";
      footer(ctx, W, H - 72 - safeBottom, brand, light, logoImg);
    } else {
      // Fade: photo full bleed, the line large over a fade into the colour at the bottom.
      photoAt(0, 0, W, H);
      fadeTo(H * 0.32, H, 0, 0.78, 0.97);
      const t = fitText(ctx, ad.overlay, big, (story ? 128 : 116) * scale, W - 144, 3, 60 * scale);
      const bottom = H - 190 - safeBottom;
      const top = bottom - (t.lines.length - 1) * t.size * 0.98;
      label(kicker, X, top - t.size - 6);
      ctx.font = big(t.size);
      drawLines(t.lines, X, top, t.size, onPhoto);
      ctx.textAlign = "left";
      footer(ctx, W, H - 72 - safeBottom, brand, light, logoImg);
    }

    ctx.textAlign = "left";
    if (!img) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = onPrimary;
      ctx.font = '400 30px "Inter Tight"';
      // The Top layout puts its words at the top, so the note goes lower down there.
      ctx.fillText("Your photo goes here", 72, layout === "top" ? H * 0.62 : 120 + safeTop);
      ctx.restore();
    }
    if (faceImg) {
      // The agent's own photo, a round crop in the bottom right corner.
      const r = 64, cx = W - 72 - r, cy = H - 72 - safeBottom - 24;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = light;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const s = Math.max((r * 2) / faceImg.width, (r * 2) / faceImg.height);
      ctx.drawImage(faceImg, cx - (faceImg.width * s) / 2, cy - (faceImg.height * s) / 2, faceImg.width * s, faceImg.height * s);
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

  window.Creative = { render, loadImage, LAYOUT_FOR };
})();
