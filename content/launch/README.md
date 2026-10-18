# Hopkins launch film

A motion graphics film of the Hopkins product: the desktop app and the phone app in 3D space,
a real user session (cursor, typing, taps), real listing photos, and a flat logo end card.

* `film.html`: the whole film. Every scene and camera move is a function of time in `render(T)`.
* `img/`: the eight listing photos (not in git, the repo is public). Names the film expects:
  `oak-front, oak-dusk, oak-side, oak-patio, oak-living, oak-kitchen` (one home), `palm`, `loft`.
* `sfx2.py`: sound design on the same clock. Interface sounds from Kenney Interface Sounds (CC0,
  kenney.nl), synthesised whooshes and hits, and the spoken "Get Hopkins." Writes `film.wav`.
* Render: `python3 sfx2.py <kenney Audio dir>`, then `node rec.mjs out.mp4 film.wav`.
  Frames render at 90 fps across 4 browsers and blend into 30 fps with real motion blur.
  Stills: `node rec.mjs --stills out_dir 2.5 9.8 33`.

It shows planned features, so the end card says "Coming soon" and every number is labelled as an
example.
