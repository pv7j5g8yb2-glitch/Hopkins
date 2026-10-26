"""Voiceover for a reel: reads the caption phrases, speaks them with Kokoro (free, Apache 2.0),
writes rN.wav and rN.timing.js so every caption word lands on the spoken word.
Usage: python3 vo.py r1 [voice] [speed]

Each sentence is spoken in one go so it keeps a natural flow, trimmed by its actual sound, and
followed by the same short pause, so the rhythm stays even. The caption times then come from
forced alignment (wav2vec2, matching the script letter by letter against the audio), which is
far more exact than the voice model's own word times."""
import json, re, subprocess, sys
import numpy as np, soundfile as sf, torch
from kokoro import KPipeline
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

reel = sys.argv[1]
VOICE = sys.argv[2] if len(sys.argv) > 2 else "af_heart"
SPEED = float(sys.argv[3]) if len(sys.argv) > 3 else 1.1
SR = 24000
LEAD, GAP, TAIL = .25, .24, .35
AHEAD = .08   # captions start a beat before the word, so it is fully on screen as it is said

# How words are said when the default reading is wrong. Captions keep the written form.
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def words_for(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + words_for(n % 100))
    return words_for(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + words_for(n % 1000))
def year(m):
    y = int(m.group(0)); return words_for(y // 100) + " hundred" if y % 100 == 0 else words_for(y // 100) + " " + words_for(y % 100)
FIXES = [
    (r"\b1[1-9]\d\d\b", year),            # 1900 is "nineteen hundred", 1923 "nineteen twenty three"
    (r"\bChatGPT\b", "Chat G P T"),
    (r"\bA/B\b", "A B"),
    (r"\bHUD\b", "H U D"),
    (r"\bCRM\b", "C R M"),
    (r"(\d)%", r"\1 percent"),
]
def spoken(text):
    for pat, rep in FIXES: text = re.sub(pat, rep, text)
    return text

sp = json.loads(subprocess.check_output(["node", "spoken.mjs", reel + ".html"]))
phrases = sp["phrases"]
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

# group phrases into sentences so the voice keeps its natural flow
groups, cur = [], []
for i, ph in enumerate(phrases):
    cur.append(i)
    if re.search(r"[.?!:]$", ph["toks"][-1]) or ph["pause"] is not None or i == len(phrases) - 1:
        groups.append(cur); cur = []

def speak(text):
    audio = np.concatenate([r.audio.numpy() for r in pipe(text, voice=VOICE, speed=SPEED)])
    # trim by the actual sound, keeping a breath of lead in and a short tail
    hop = int(.01 * SR); env = np.array([np.abs(audio[i:i + hop]).max() for i in range(0, len(audio), hop)])
    on = np.where(env > .02)[0]
    a, b = max(0, on[0] * hop - int(.03 * SR)), min(len(audio), (on[-1] + 1) * hop + int(.06 * SR))
    return audio[a:b].astype(np.float32)

# forced alignment: the script, letter by letter, against what the model hears
proc = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
asr = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h").eval()
VOCAB = proc.tokenizer.get_vocab()
def letters(word):
    w = re.sub(r"\d+", lambda m: " " + words_for(int(m.group(0))) + " ", word).upper()
    return [c for c in re.sub(r"[^A-Z' ]", "", w).replace(" ", "|").strip("|") if c in VOCAB]
def align(clip, words):
    """start and end time (s) of each word in a clip"""
    x = np.interp(np.arange(0, len(clip), SR / 16000), np.arange(len(clip)), clip)
    x = proc(x, sampling_rate=16000, return_tensors="pt").input_values
    with torch.no_grad(): em = torch.log_softmax(asr(x).logits[0], -1).numpy()
    toks, owner = [], []
    for wi, w in enumerate(words):
        ls = letters(w) or ["|"]
        if toks: toks.append(VOCAB["|"]); owner.append(-1)
        for c in ls: toks.append(VOCAB[c]); owner.append(wi)
    T, N, blank = em.shape[0], len(toks), VOCAB["<pad>"]
    tr = np.full((T + 1, N + 1), -np.inf); tr[0, 0] = 0
    for t in range(T):   # each frame either stays on a token (or blank) or moves to the next token
        stay = tr[t, :] + em[t, blank]
        move = np.full(N + 1, -np.inf); move[1:] = tr[t, :-1] + em[t, toks]
        tr[t + 1] = np.maximum(stay, move)
    j, span = N, {}
    for t in range(T, 0, -1):
        if j > 0 and tr[t - 1, j - 1] + em[t - 1, toks[j - 1]] >= tr[t - 1, j] + em[t - 1, blank]:
            j -= 1; w = owner[j]
            if w >= 0: span[w] = (t - 1, span.get(w, (t - 1, t - 1))[1])
    fr = len(clip) / SR / T
    out = [(span[w][0] * fr, (span[w][1] + 1) * fr) if w in span else None for w in range(len(words))]
    # each clip is trimmed to its sound, so its first word starts right at the top
    if out and out[0]: out[0] = (min(out[0][0], .04), out[0][1])
    return out

track, t0 = [np.zeros(int(LEAD * SR), np.float32)], LEAD
timing = [{"w": [], "last": 0} for _ in phrases]
for g in groups:
    words, owner = [], []          # spoken words, and the (phrase, token) each belongs to
    for i in g:
        ph = phrases[i]
        if ph["say"]:
            for w in spoken(ph["say"]).split(): words.append(w); owner.append((i, None))
        else:
            for k, tok in enumerate(ph["toks"]):
                for w in spoken(tok).split(): words.append(w); owner.append((i, k))
    clip = speak(" ".join(words))
    times = align(clip, words)
    # a word the aligner couldn't place takes its neighbour's time
    for n in range(len(times)):
        if times[n] is None: times[n] = next((times[m] for m in list(range(n - 1, -1, -1)) + list(range(n + 1, len(times))) if times[m]), (0, len(clip) / SR))
    seen = set()
    for (i, k), (s, e), w in zip(owner, times, words):
        s, e = t0 + s - AHEAD, t0 + e
        if k is None: timing[i].setdefault("say", []).append((s, e, w))
        elif (i, k) not in seen: seen.add((i, k)); timing[i]["w"].append(s)
        timing[i]["last"] = max(timing[i]["last"], e)
    track.append(clip); t0 += len(clip) / SR
    last = phrases[g[-1]]
    gap = last["pause"] if last["pause"] is not None else GAP
    track.append(np.zeros(int(gap * SR), np.float32)); t0 += gap
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
for i, tm in enumerate(timing):   # spoken differently from the caption: match the words that agree
    if "say" in tm:
        said, j, tm["w"] = tm["say"], 0, []
        for tok in phrases[i]["toks"]:
            first = norm(tok.split()[0])
            hit = next((m for m in range(j, len(said)) if norm(said[m][2]) == first), None)
            if hit is None: hit = min(j, len(said) - 1)
            tm["w"].append(said[hit][0]); j = hit + 1

out = []
for i, tm in enumerate(timing):
    e = timing[i + 1]["w"][0] - .02 if i + 1 < len(timing) else tm["last"] + TAIL
    out.append({"s": round(tm["w"][0], 3), "e": round(e, 3), "w": [round(x, 3) for x in tm["w"]]})
# launch and promo reels (signoff:true) end with the voice saying "Get Hopkins." over the end card;
# teaching reels end silent on "Follow @gethopkins"
if sp["signoff"]:
    OUTRO_AT = out[-1]["e"] + sp["tail"] + .6
    track.append(np.zeros(max(0, int((OUTRO_AT - t0) * SR)), np.float32)); track.append(speak("Get Hopkins."))
else:
    track.append(np.zeros(int(TAIL * SR), np.float32))
sf.write(reel + ".wav", np.concatenate(track), SR)
with open(reel + ".timing.js", "w") as f:
    f.write("window.TIMING=" + json.dumps({"voice": VOICE, "speed": SPEED, "text": sp["text"], "phrases": out}) + ";\n")
print(f"{reel}: {t0:.1f}s spoken, {sum(len(' '.join(p['toks']).split()) for p in phrases) / t0 * 60:.0f} wpm, voice {VOICE} at {SPEED}")
