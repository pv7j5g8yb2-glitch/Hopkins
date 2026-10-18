"""Sound design for film.html, timed to the same clock as the film.
Interface sounds: Kenney Interface Sounds (CC0, kenney.nl). Whooshes and low hits are
synthesised. The sign off is Kokoro. Usage: python3 sfx2.py <kenney Audio dir> -> film.wav"""
import math, sys, glob, os
import numpy as np, soundfile as sf

KEN = sys.argv[1] if len(sys.argv) > 1 else "kenney/Audio"
SR, D = 48000, 46.0
rng = np.random.default_rng(11)
L = np.zeros(int(SR * D)); R = np.zeros(int(SR * D))

def load(name):
    x, sr = sf.read(os.path.join(KEN, name + ".ogg"), always_2d=True)
    x = x.mean(axis=1)
    if sr != SR: x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)
    return x / (np.abs(x).max() + 1e-9)

def speed(x, f):  # shift pitch and length together, for variety on repeated sounds
    return np.interp(np.arange(0, len(x), f), np.arange(len(x)), x)

def put(x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(L) or i < 0: return
    n = min(len(x), len(L) - i)
    L[i:i + n] += x[:n] * gain * (1 - max(0, pan)); R[i:i + n] += x[:n] * gain * (1 + min(0, pan))

def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))

def whoosh(dur=.7, lo=200, hi=3000, peak=.6):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = np.zeros(n)
    for k in range(6):  # a sweeping band of noise, like air moving past
        seg = band(rng.standard_normal(n), lo * (1 + k * .5), hi * (.4 + k * .15))
        x += seg * np.exp(-((t - peak) ** 2) / (.02 + k * .01))
    env = np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) * 7))
    x = x * env
    return x / (np.abs(x).max() + 1e-9)

def hit(f0=95, dur=.9):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f0 * t - 12 * t * t)) * np.exp(-t * 5.5) + .25 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t * 9)
    return x / np.abs(x).max()

S = {k: load(k) for k in ["click_001", "click_002", "click_003", "click_004", "click_005", "select_001", "select_002", "select_003",
     "tick_002", "tick_004", "pluck_001", "pluck_002", "drop_001", "drop_002", "drop_003", "drop_004", "switch_002", "switch_005",
     "maximize_003", "maximize_008", "confirmation_001", "confirmation_002", "glass_001", "glass_003", "glass_005", "glass_006",
     "scroll_001", "scroll_002", "open_001", "minimize_003"]}

# ---- the film's clock (mirrors film.html) ----
def rnd(i):
    x = math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - math.floor(x)
def key_times(a, txt, cps):
    s, out = a, []
    for i, ch in enumerate(txt):
        s += (1 / cps) * (.55 + .9 * rnd(i + len(txt))) + (.02 if ch == " " else 0) + (.08 if ch in ".," else 0)
        out.append(s)
    return out
MSG1 = "New listing, 14 Oak Street. Ads for it, $600 over two weeks."
MSG3 = "Make B's first line shorter."
ASKS = ["Open house Saturday, 2 to 4.", "Just sold on Palm Court. Make a post.", "Which version won last week?",
        "Keep it to $1,500 a month.", "Pause the Oak Street ads.", "Write it in our brand voice."]
K1 = key_times(3.0, MSG1, 36); TE1 = K1[-1]; SEND1 = TE1 + .3
K3 = key_times(10.75, MSG3, 30); TE3 = K3[-1]; SEND3 = TE3 + .12
SH = .6; sd = SEND1 + .7 + 4 * .38
keys = [f"click_00{i}" for i in range(1, 6)]
def typing(times, gain):
    for i, at in enumerate(times):
        put(speed(S[keys[i % 5]], 1.25 + .35 * rnd(i * 3)), at, gain * (.7 + .3 * rnd(i)), pan=-.15 + .3 * rnd(i + 7))

# opening: photos drift in, then drop into the composer
put(whoosh(2.4, 120, 1400, .75), 0.0, .16)
for i in range(6): put(speed(S[f"drop_00{i % 4 + 1}"], 1.1 + .08 * i), 2.7 + i * .11, .28, pan=-.4 + i * .16)
typing(K1, .09)
put(S["select_001"], SEND1 - .02, .35); put(whoosh(1.2, 150, 2600, .45), SEND1 + .1, .3)
for i in range(4): put(S["tick_002"], SEND1 + .7 + i * .38 + .32, .22)
for i in range(3): put(speed(S["pluck_001"], 1 + .12 * i), sd + .2 + i * .12, .2)
put(whoosh(.8, 300, 3500, .5), 7.75, .12)
put(S["click_002"], 8.85, .3); put(S["switch_002"], 8.92, .16)
put(whoosh(.7, 300, 3500, .5), 9.2, .1)
put(S["click_003"], 10.02, .3); put(S["maximize_003"], 10.06, .2)
put(S["click_001"], 10.46, .25); typing(K3, .09)
put(S["select_002"], SEND3 - .04, .35); put(S["pluck_002"], SEND3 + .5, .2); put(S["glass_001"], SEND3 + .62, .14)
# to the phone (everything from here runs SH later)
put(whoosh(1.0, 150, 2400, .5), 13.1, .3, pan=.2)
P = lambda t: t + SH
put(S["confirmation_001"], P(13.35), .32)
put(S["click_004"], P(14.4), .3); put(S["maximize_008"], P(14.55), .22)
for a in (15.35, 15.95, 16.55): put(whoosh(.45, 600, 5000, .4), P(a), .1); put(S["scroll_001"], P(a + .1), .14)
put(S["select_003"], P(17.15), .35); put(S["confirmation_002"], P(17.75), .32)
put(S["open_001"], P(17.95), .18); put(whoosh(1.0, 400, 5000, .35), P(18.05), .18)
put(S["glass_003"], P(18.95), .32)
# back to the desktop, leads
put(whoosh(.9, 150, 2400, .45), 19.75, .25, pan=-.2)
put(S["pluck_001"], 19.95, .2); put(S["click_002"], 20.55, .3)
for i in range(6): put(S["tick_004"], 20.4 + i * .12, .1)
# capabilities
put(whoosh(1.0, 150, 2600, .5), P(21.55), .28)
for j, txt in enumerate(ASKS):
    a = 22.4 + j * 1.35; kt = key_times(a, txt, 64); typing([P(x) for x in kt], .06)
    put(S["select_001"], P(kt[-1] + .08), .26); put(speed(S["pluck_002"], .9 + .06 * j), P(kt[-1] + .2), .2); put(whoosh(.5, 500, 4000, .4), P(kt[-1] + .15), .06)
for i in range(3): put(S["tick_002"], P(25.3 + i * .1), .12)
put(S["scroll_002"], P(26.75), .18); put(S["scroll_002"], P(27.05), .14)
put(S["switch_005"], P(28.15), .3)
put(whoosh(.9, 150, 2400, .5), P(30.35), .25)
# report
for k in range(14): put(speed(S["tick_004"], 1 + k * .03), P(30.9 + k * .085), .05)
put(S["glass_005"], P(31.1), .1); put(S["pluck_002"], P(32.4), .22)
# finale and logo
put(whoosh(1.8, 90, 1800, .3), P(34.5), .35)
for i in range(9): put(S["tick_002"], P(34.6 + i * .05), .05)
put(hit(110, .8), P(36.1), .22); put(hit(82, 1.0), P(36.55), .26)
put(whoosh(1.0, 100, 1200, .7), P(38.3), .16)
put(hit(70, 1.4), P(39.1), .3); put(S["glass_006"], P(39.35), .14)
put(whoosh(.7, 400, 3000, .45), P(40.1), .1); put(S["pluck_001"], P(41.3), .16)

# spoken sign off as the name lands (launch film rule)
from kokoro import KPipeline
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
v = np.concatenate([r.audio.numpy() for r in pipe("Get Hopkins.", voice="af_heart", speed=1.0)])
idx = np.where(np.abs(v) > .02)[0]; v = v[max(0, idx[0] - 600):idx[-1] + 2400]
v = np.interp(np.arange(0, len(v), 24000 / SR), np.arange(len(v)), v)
put(v / np.abs(v).max(), P(40.45), .62)

out = np.stack([L, R], axis=1)
out = out / max(1, np.abs(out).max() / .9)
sf.write("film.wav", out.astype(np.float32), SR)
print("ok", D)
