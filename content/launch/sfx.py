"""Sound design for the launch film: whooshes on camera moves, clicks on taps, pops on cards,
typing ticks, a thump and shimmer on the logo, and the spoken "Get Hopkins." (Kokoro).
Writes launch.wav. Music gets added in Instagram on top."""
import numpy as np, soundfile as sf
SR, D = 48000, 38.0
rng = np.random.default_rng(7)
out = np.zeros(int(SR * D))

def put(x, at, gain=1.0):
    i = int(at * SR); n = min(len(x), len(out) - i); out[i:i + n] += x[:n] * gain

def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))

def whoosh(dur=.55, lo=250, hi=2600):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = band(rng.standard_normal(n), lo, hi); env = np.sin(np.pi * t ** .7) ** 2
    return x / (np.abs(x).max() + 1e-9) * env

def click():
    n = int(.04 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2100 * t) * .6 + band(rng.standard_normal(n), 2000, 9000) * .6) * np.exp(-t * 140)

def pop():
    n = int(.09 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (520 * t + 1800 * t * t)) * np.exp(-t * 45)

def tick():
    n = int(.012 * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 3000, 10000) * np.exp(-t * 600)

def thump():
    n = int(.6 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (70 * t - 20 * t * t)) * np.exp(-t * 7)

def shimmer(dur=1.1):
    n = int(dur * SR); t = np.arange(n) / SR; env = np.sin(np.pi * t / dur) ** 2
    return sum(np.sin(2 * np.pi * f * t) * (1 + .3 * np.sin(2 * np.pi * 7 * t)) for f in (1175, 1568, 2349)) / 3 * env

for at in (1.7, 6.2, 7.45, 8.3, 9.2, 10.25, 11.0, 13.4, 15.45, 22.95, 26.9):
    put(whoosh(), at - .2, .28)
put(whoosh(.9, 120, 1200), 31.1, .3)
for at in (1.5, 9.85, 20.55) + tuple(17 + k + .36 for k in range(6)):
    put(click(), at, .35)
for at in (3.2, 3.37, 3.54, 10.1, 10.25, 12.62, 13.0) + tuple(17 + k + .45 for k in range(6)):
    put(pop(), at, .22)
for a, b in [(.25, 1.2)] + [(17 + k, 17 + k + .32) for k in range(6)]:
    for at in np.arange(a, b, .055): put(tick(), at + rng.uniform(0, .015), .12)
for at in np.arange(23.4, 24.6, .09): put(tick(), at, .08)
put(thump(), 31.88, .5); put(shimmer(), 31.75, .1)

# voice sign off as the name lands
from kokoro import KPipeline
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
v = np.concatenate([r.audio.numpy() for r in pipe("Get Hopkins.", voice="af_heart", speed=1.0)])
idx = np.where(np.abs(v) > .02)[0]; v = v[max(0, idx[0] - 600):idx[-1] + 2400]
v = np.interp(np.arange(0, len(v), 24000 / SR), np.arange(len(v)), v)
put(v / np.abs(v).max(), 33.1, .7)

out = out / max(1, np.abs(out).max() / .89)
sf.write("launch.wav", out.astype(np.float32), SR)
print("ok", len(out) / SR)
