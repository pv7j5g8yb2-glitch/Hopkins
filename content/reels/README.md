# Hopkins reels

Animated explainer reels for @gethopkins, built as HTML and rendered frame by frame to MP4.

* `engine.js`: background, word by word captions, scene helpers, line icons, the line art house, end card.
* `r1.html` to `r5.html`: one reel each. The script is the list of caption phrases at the top.
  `[words]` boxes a phrase, `_word_` makes it the serif accent, `^word` makes a timing cue.
* Stills to check a reel: `node stills.mjs r1.html out_dir auto 24`
* Render to video: `node rec.mjs r1.html out.mp4` (needs Playwright with Chromium, and ffmpeg; the
  path to ffmpeg is set at the bottom of `rec.mjs`).
