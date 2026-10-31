"""The Hopkins field: a blue dusk, one warm house shape moving through it, behind reeded glass.
python3 field.py out.png [rib_px] [seed]"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# python3 field.py out [rib] [seed] [W H cx warm dark]: the app uses a phone (1179x2556) and a
# laptop (2400x1500) version, the house placed right of the content and quieter than the mockup.
out = sys.argv[1]
RIB = int(sys.argv[2]) if len(sys.argv) > 2 else 26
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 3
W, H = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1179, 2556)
CX = float(sys.argv[6]) if len(sys.argv) > 6 else 600 / 1179
WARM = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
DARK = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
K = H / 2556
rng = np.random.default_rng(SEED)

def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255

def vgrad(stops):
    ys = np.linspace(0, 1, H)
    col = np.zeros((H, 3), np.float32)
    pos = [p for p, _ in stops]
    for c in range(3):
        col[:, c] = np.interp(ys, pos, [hexc(h)[c] for _, h in stops])
    return np.repeat(col[:, None, :], W, axis=1)

# The sky: a clear evening blue, lighter through the middle.
a = vgrad([(0, "#0F3A73"), (0.30, "#1B5694"), (0.55, "#20609F"), (0.80, "#174A86"), (1, "#0C2B5C")])

def blob(points, blur):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(blur))).astype(np.float32)[..., None] / 255

def paint(a, mask, colour, k=1.0):
    return a * (1 - mask * k) + colour * mask * k

# A house, gable up, a little right of centre: warm on its lit side, deep blue on its shadow side.
cx, top, eave, base, half = int(CX * W), int(700 * K), int(1080 * K), int(2150 * K), int(330 * max(K, W / 1179 * .55))
house = [(cx - half, eave), (cx, top), (cx + half, eave), (cx + half, base), (cx - half, base)]
warm = vgrad([(0, "#E9967A"), (0.30, "#E2766C"), (0.45, "#D85772"), (0.58, "#C23B7C"), (0.75, "#8F2F7E"), (1, "#2E2770")])
a = paint(a, blob(house, int(40 * K) + 1), warm, WARM)
d = lambda v: int(v * K)
shadow_side = [(cx + d(40), top + d(60)), (cx + half + d(40), eave + d(20)), (cx + half + d(60), base), (cx + d(60), base)]
a = paint(a, blob(shadow_side, d(60) + 1), hexc("#0A1E52"), 0.85)
glow = [(cx - half - d(120), eave + d(200)), (cx - d(40), eave + d(120)), (cx - d(60), base - d(150)), (cx - half - d(160), base - d(260))]
a = paint(a, blob(glow, d(140) + 1), hexc("#F2B494"), 0.22 * WARM)

def box_x(a, r, shift=0):
    c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r), (0, 0)), mode="edge"), axis=1)
    b = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return np.roll(b, shift, axis=1) if shift else b

def box_y(a, r):
    c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0), (0, 0)), mode="edge"), axis=0)
    return (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)

# Speed: each band of rows slides by its own amount, like a long exposure of something passing.
n = np.cumsum(rng.normal(0, 1, H // 8 + 2))
n = np.interp(np.arange(H), np.arange(len(n)) * 8, n)
n = (n - n.mean()) / (n.std() + 1e-6)
fine = np.repeat(rng.normal(0, 1, H // 3 + 1), 3)[:H]
shift = (n * 80 * K + fine * 7 * K).astype(int)
for y in range(H):
    a[y] = np.roll(a[y], shift[y], axis=0)

# Movement: smeared to the left with a soft trail, uneven from row to row like a long exposure.
trail = box_x(a, d(190) + 1, -d(120))
for _ in range(2):
    trail = box_x(trail, d(60) + 1)
rows = np.clip(np.cumsum(rng.normal(0, 0.02, H)) * 0.6 + 0.55, 0.35, 0.8)[:, None, None]
a = a * (1 - rows) + trail * rows
a = box_x(a, d(26) + 1)
a = box_y(a, d(9) + 1)
a = a * DARK

# Reeded glass: each rib a small cylinder lens, mirrored and magnified, lit from the left.
xs = np.arange(W)
t = (xs % RIB) / RIB
centre = xs - (xs % RIB) + RIB / 2
sample = np.clip((centre + (0.5 - t) * RIB * 1.25).round().astype(int), 0, W - 1)
g = a[:, sample, :]
shade = 1 + 0.06 * (0.5 - t) + 0.13 * np.exp(-((t - 0.04) / 0.03) ** 2) - 0.08 * np.exp(-((t - 0.97) / 0.035) ** 2)
g = g * shade[None, :, None]

# Reading veil at the bottom, and grain.
yy = np.linspace(0, 1, H)[:, None, None]
g = g * (1 - 0.22 * np.clip((yy - 0.62) / 0.38, 0, 1) ** 1.3)
g = g + rng.normal(0, 0.018, g.shape).astype(np.float32)
Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8)).save(out, optimize=True)
print(out)
