# Hopkins reels

Animated explainer reels for @gethopkins, built as HTML and rendered frame by frame to MP4.

* `engine.js`: background, word by word captions, scene helpers, line icons, the line art house, end card.
* `r1.html` to `r5.html`: one reel each. The script is the list of caption phrases at the top.
  `[words]` boxes a phrase, `_word_` makes it the serif accent, `^word` makes a timing cue.
* Stills to check a reel: `node stills.mjs r1.html out_dir auto 24`
* Render to video: `node rec.mjs r1.html out.mp4` (needs Playwright with Chromium, and ffmpeg; the
  path to ffmpeg is set at the bottom of `rec.mjs`).

## Voiceover

* `python3 vo.py r1` speaks the caption phrases with Kokoro (free, open source, Apache 2.0; needs
  `pip install kokoro soundfile` and `espeak-ng`). It writes `r1.wav` and `r1.timing.js`, and the
  captions and every scene cue then follow the voice word by word. Default voice `af_heart` at
  speed 1.2, about 180 words a minute. Other voices: `python3 vo.py r1 am_michael 1.2`.
* A phrase can be spoken differently from how it's shown: `{t:"[#perfectforfamilies] says...",
  say:"Hashtag perfect for families says..."}`.
* Change a script, run `vo.py` again. A stale timing file is ignored and the reel falls back to
  the old reading pace, with a warning in the console.
* `rec.mjs` adds the voice to the video when `rN.wav` exists, levelled to -14 LUFS.
