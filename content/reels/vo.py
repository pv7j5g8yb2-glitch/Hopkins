"""Voiceover for a reel: reads the caption phrases, speaks them with Kokoro (free, Apache 2.0),
writes rN.wav and rN.timing.js so every caption word lands on the spoken word.
Usage: python3 vo.py r1 [voice] [speed]"""
import json, re, subprocess, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

reel = sys.argv[1]
VOICE = sys.argv[2] if len(sys.argv) > 2 else "af_heart"
SPEED = float(sys.argv[3]) if len(sys.argv) > 3 else 1.2
SR = 24000
LEAD, GAP_SENT, GAP_SPLIT, TAIL = .25, .26, .06, .35

sp = json.loads(subprocess.check_output(["node", "spoken.mjs", reel + ".html"]))
phrases = sp["phrases"]
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

# group phrases into sentences so the voice keeps its natural flow
groups, cur = [], []
for i, ph in enumerate(phrases):
    cur.append(i)
    last = ph["toks"][-1]
    if re.search(r"[.?!:]$", last) or ph["pause"] is not None or i == len(phrases) - 1:
        groups.append(cur); cur = []

def speak(text):
    """audio and [(char offset, start, end)] for each spoken word"""
    audio, words, off, pos = [], [], 0.0, 0
    for r in pipe(text, voice=VOICE, speed=SPEED):
        a = r.audio.numpy()
        for tk in r.tokens:
            j = text.find(tk.text, pos)
            if j < 0: continue
            pos = j + len(tk.text)
            if tk.start_ts is not None and re.search(r"\w", tk.text):
                words.append((j, off + tk.start_ts, off + tk.end_ts))
        audio.append(a); off += len(a) / SR
    return np.concatenate(audio), words

track = [np.zeros(int(LEAD * SR), np.float32)]
t0 = LEAD
timing = [None] * len(phrases)
for g in groups:
    text, spans = "", []          # spans: (phrase, token, start char, end char)
    for i in g:
        ph = phrases[i]
        if ph["say"]:
            a = len(text); text += ph["say"] + " "
            spans.append((i, None, a, len(text) - 1))
        else:
            for k, tok in enumerate(ph["toks"]):
                a = len(text); text += tok + " "
                spans.append((i, k, a, len(text) - 1))
    text = text.strip()
    audio, words = speak(text)
    cut0 = max(0.0, words[0][1] - .04); cut1 = min(len(audio) / SR, words[-1][2] + .1)
    clip = audio[int(cut0 * SR):int(cut1 * SR)]
    def at(c0, c1):
        hit = [w for w in words if c0 <= w[0] < c1]
        w = hit[0] if hit else min(words, key=lambda w: abs(w[0] - c0))
        return t0 + w[1] - cut0, t0 + (hit[-1] if hit else w)[2] - cut0
    for i, k, c0, c1 in spans:
        s, e = at(c0, c1)
        if timing[i] is None: timing[i] = {"w": [], "last": 0}
        if k is None:   # spoken override: spread the caption words across the phrase
            n = len(phrases[i]["toks"]); timing[i]["w"] = [s + (e - s) * q / n for q in range(n)]
        else: timing[i]["w"].append(s)
        timing[i]["last"] = max(timing[i]["last"], e)
    track.append(clip); t0 += len(clip) / SR
    last = phrases[g[-1]]
    gap = last["pause"] if last["pause"] is not None else (GAP_SENT if re.search(r"[.?!:]$", last["toks"][-1]) else GAP_SPLIT)
    track.append(np.zeros(int(gap * SR), np.float32)); t0 += gap

out = []
for i, tm in enumerate(timing):
    s = tm["w"][0]
    e = timing[i + 1]["w"][0] - .02 if i + 1 < len(timing) else tm["last"] + TAIL
    out.append({"s": round(s, 3), "e": round(e, 3), "w": [round(x, 3) for x in tm["w"]]})
# sign off over the end card, the same words on every reel
OUTRO, OUTRO_AT = "Get Hopkins.", out[-1]["e"] + sp["tail"] + .6
oa, ow = speak(OUTRO)
oa = oa[int(max(0, ow[0][1] - .03) * SR):int((ow[-1][2] + .25) * SR)]
track.append(np.zeros(max(0, int((OUTRO_AT - t0) * SR)), np.float32)); track.append(oa)
sf.write(reel + ".wav", np.concatenate(track), SR)
with open(reel + ".timing.js", "w") as f:
    f.write("window.TIMING=" + json.dumps({"voice": VOICE, "speed": SPEED, "text": sp["text"], "phrases": out}) + ";\n")
n = sum(len(p["toks"]) for p in phrases)
print(f"{reel}: {t0:.1f}s spoken, {sum(len(' '.join(p['toks']).split()) for p in phrases) / t0 * 60:.0f} wpm, voice {VOICE} at {SPEED}")
