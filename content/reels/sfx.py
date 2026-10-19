"""Mixes a reel's sound effects under its voiceover.
Reads rN.wav (from vo.py) and rN.sfx.json (written by rec.mjs from the reel's R.sfx), writes
rN.mix.wav at 48 kHz. Interface sounds in sfx/ are Kenney's Interface Sounds (CC0, kenney.nl);
the hits and whooshes are synthesised here. Usage: python3 sfx.py r3"""
import json, os, sys
import numpy as np, soundfile as sf

REEL = sys.argv[1]
SR = 48000
here = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)

def resample(x, sr):
    return x if sr == SR else np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)

def load(name, speed=1.0):
    x, sr = sf.read(os.path.join(here, "sfx", name + ".ogg"), always_2d=True)
    x = resample(x.mean(axis=1), sr * speed)
    return x / (np.abs(x).max() + 1e-9)

def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))

def whoosh(dur=.45, lo=400, hi=5000, peak=.7):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = band(rng.standard_normal(n), lo, hi)
    x *= np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) * 9))
    return x / (np.abs(x).max() + 1e-9), peak * dur  # sound and where its loudest point sits

def hit(f0=90, dur=.55):
    n = int(dur * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f0 * t - 30 * t * t)) * np.exp(-t * 9)
    snap = band(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 60) * .5
    x = body + snap
    return x / np.abs(x).max()

# name -> list of (sound, gain, offset in seconds); a whoosh is placed so its peak lands on the cue
def build(name):
    if name == "hit": return [(hit(), 1, 0), (load("click_002"), .5, 0)]
    if name == "stamp": return [(hit(70, .7), 1, 0), (load("drop_004", .9), .6, 0)]
    if name == "whoosh": w, pk = whoosh(); return [(w, 1, -pk)]
    if name == "pop": return [(load("pluck_002", 1.1), 1, 0)]
    if name == "pop2": return [(load("drop_002", 1.2), 1, 0)]
    if name == "tick": return [(load("tick_002"), 1, 0)]
    if name == "ding": return [(load("glass_001"), 1, 0)]
    if name == "select": return [(load("select_002"), 1, 0)]
    raise SystemExit("unknown sound " + name)

GAIN = {"hit": .55, "stamp": .6, "whoosh": .22, "pop": .32, "pop2": .3, "tick": .2, "ding": .25, "select": .3}

voice, vsr = sf.read(os.path.join(here, REEL + ".wav"), always_2d=True)
voice = resample(voice.mean(axis=1), vsr)
out = np.zeros(len(voice) + SR)
out[:len(voice)] += voice / (np.abs(voice).max() + 1e-9) * .8
for fx in json.load(open(os.path.join(here, REEL + ".sfx.json"))):
    for snd, g, off in build(fx["s"]):
        i = int((fx["t"] + off) * SR)
        if i < 0: snd, i = snd[-i:], 0
        n = min(len(snd), len(out) - i)
        if n > 0: out[i:i + n] += snd[:n] * g * GAIN[fx["s"]] * fx.get("g", 1)
out = out[:len(voice) + int(.5 * SR)]
out /= max(1, np.abs(out).max() / .95)
sf.write(os.path.join(here, REEL + ".mix.wav"), out.astype(np.float32), SR)
print("mixed", REEL, len(json.load(open(os.path.join(here, REEL + ".sfx.json")))), "sounds")
