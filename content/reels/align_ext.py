"""Use a recorded or generated voiceover (not Kokoro) for a reel: tightens long silences, then forced
aligns the reel's caption script against it and writes rN.wav and rN.timing.js, like vo.py does.
Usage: python3 align_ext.py r17 path/to/voice.wav [max_gap_seconds]"""
import json, re, subprocess, sys
import numpy as np, soundfile as sf, torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

reel, src = sys.argv[1], sys.argv[2]
MAXGAP = float(sys.argv[3]) if len(sys.argv) > 3 else .3
SR, LEAD, AHEAD, TAIL = 24000, .2, .08, .35

audio, sr = sf.read(src, dtype="float32")
if audio.ndim > 1: audio = audio.mean(1)
if sr != SR: audio = np.interp(np.arange(0, len(audio), sr / SR), np.arange(len(audio)), audio).astype(np.float32)

# tighten silences: any quiet stretch longer than MAXGAP is cut down to MAXGAP
hop = int(.01 * SR); env = np.array([np.abs(audio[i:i + hop]).max() for i in range(0, len(audio), hop)])
loud = env > .015; out, i, n = [], 0, len(env)
first, last = np.where(loud)[0][[0, -1]]
i = first
while i <= last:
    if loud[i]: out.append(audio[i * hop:(i + 1) * hop]); i += 1; continue
    j = i
    while j <= last and not loud[j]: j += 1
    k = min(j - i, int(MAXGAP / .01))
    out.append(audio[i * hop:(i + k) * hop]); i = j
clip = np.concatenate([np.zeros(int(LEAD * SR), np.float32)] + out)

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def words_for(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + words_for(n % 100))
proc = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
asr = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h").eval()
VOCAB = proc.tokenizer.get_vocab()
def letters(word):
    w = re.sub(r"\d+", lambda m: " " + words_for(int(m.group(0))) + " ", word).upper()
    return [c for c in re.sub(r"[^A-Z' ]", "", w).replace(" ", "|").strip("|") if c in VOCAB]

sp = json.loads(subprocess.check_output(["node", "spoken.mjs", reel + ".html"]))
phrases = sp["phrases"]
words, owner = [], []
for i, ph in enumerate(phrases):
    for k, tok in enumerate(ph["toks"]):
        for w in tok.split(): words.append(w); owner.append((i, k))

x = np.interp(np.arange(0, len(clip), SR / 16000), np.arange(len(clip)), clip)
x = proc(x, sampling_rate=16000, return_tensors="pt").input_values
with torch.no_grad(): em = torch.log_softmax(asr(x).logits[0], -1).numpy()
toks, own = [], []
for wi, w in enumerate(words):
    ls = letters(w) or ["|"]
    if toks: toks.append(VOCAB["|"]); own.append(-1)
    for c in ls: toks.append(VOCAB[c]); own.append(wi)
T, N, blank = em.shape[0], len(toks), VOCAB["<pad>"]
tr = np.full((T + 1, N + 1), -np.inf); tr[0, 0] = 0
for t in range(T):
    stay = tr[t, :] + em[t, blank]
    move = np.full(N + 1, -np.inf); move[1:] = tr[t, :-1] + em[t, toks]
    tr[t + 1] = np.maximum(stay, move)
j, span = N, {}
for t in range(T, 0, -1):
    if j > 0 and tr[t - 1, j - 1] + em[t - 1, toks[j - 1]] >= tr[t - 1, j] + em[t - 1, blank]:
        j -= 1; w = own[j]
        if w >= 0: span[w] = (t - 1, span.get(w, (t - 1, t - 1))[1])
fr = len(clip) / SR / T
times = [((span[w][0]) * fr, (span[w][1] + 1) * fr) if w in span else None for w in range(len(words))]
for n in range(len(times)):
    if times[n] is None: times[n] = next(times[m] for m in list(range(n - 1, -1, -1)) + list(range(n + 1, len(times))) if times[m])

timing = [{"w": [], "last": 0} for _ in phrases]; seen = set()
for (i, k), (s, e) in zip(owner, times):
    if (i, k) not in seen: seen.add((i, k)); timing[i]["w"].append(s - AHEAD)
    timing[i]["last"] = max(timing[i]["last"], e)
res = []
for i, tm in enumerate(timing):
    e = timing[i + 1]["w"][0] - .02 if i + 1 < len(timing) else tm["last"] + TAIL
    res.append({"s": round(tm["w"][0], 3), "e": round(e, 3), "w": [round(v, 3) for v in tm["w"]]})
sf.write(reel + ".wav", np.concatenate([clip, np.zeros(int(TAIL * SR), np.float32)]), SR)
with open(reel + ".timing.js", "w") as f:
    f.write("window.TIMING=" + json.dumps({"voice": "external", "speed": 1, "text": sp["text"], "phrases": res}) + ";\n")
print(f"{reel}: {len(clip) / SR:.1f}s voice after tightening, {len(words) / (len(clip) / SR) * 60:.0f} wpm")
