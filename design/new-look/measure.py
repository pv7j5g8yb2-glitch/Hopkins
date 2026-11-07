import json, glob, sys
import numpy as np
from PIL import Image
def lin(c):
    c = c / 255.0
    return np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def L(rgb):
    l = lin(np.asarray(rgb, dtype=np.float64))
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
fails = []
for jf in sorted(glob.glob(sys.argv[1] + "/*.json")):
    d = json.load(open(jf)); img = np.asarray(Image.open(jf[:-5] + ".png").convert("RGB")).astype(np.float64)
    H, W, _ = img.shape; k = d["dpr"]
    for it in d["items"]:
        m = [float(x) for x in __import__("re").findall(r"[\d.]+", it["color"])]
        fg0 = np.array(m[:3]); a = (m[3] if len(m) > 3 else 1) * it["op"]
        r = it["rect"]; x0, x1 = max(0, int(r["x"] * k)), min(W, int(r["r"] * k) + 1); y0, y1 = max(0, int(r["y"] * k)), min(H, int(r["b"] * k) + 1)
        if x1 <= x0 or y1 <= y0: continue
        reg = img[y0:y1:2, x0:x1:2].reshape(-1, 3)
        lum = L(reg); dark = L(fg0) < 0.3
        order = np.argsort(lum if not dark else -lum)
        bg = reg[order[int(len(order) * 0.95) - (1 if len(order) > 1 else 0)]]
        fg = fg0 * a + bg * (1 - a)
        l1, l2 = sorted([float(L(fg)), float(L(bg))], reverse=True)
        cr = (l1 + 0.05) / (l2 + 0.05)
        large = it["size"] >= 24 or (it["size"] >= 18.66 and it["weight"] >= 600)
        need = 3 if large else 4.5
        if cr < need: fails.append(f'{d["label"]}: {cr:.2f} < {need}  {it["size"]}px "{it["text"]}"')
print("\n".join(fails) or "all text passes"); print(f"{len(fails)} failing")
