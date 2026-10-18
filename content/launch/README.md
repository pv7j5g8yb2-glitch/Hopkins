# Hopkins launch film

A motion graphics film of the Hopkins interface, rendered frame by frame from HTML and three.js.

* `launch.html`: the whole film. Scenes, camera moves and timings live in `render(t)`.
* `three3d.js`: the 3D parts. The Rise mark as two pebbles, the clay icons, the house images.
* `sfx.py`: sound design plus the spoken "Get Hopkins." Writes `launch.wav`.
* Render: `npm install`, `python3 sfx.py`, then `node rec.mjs out.mp4 launch.wav`.
  Stills: `node rec.mjs --stills out_dir 2.5 9.8 33`.

It shows planned features, so the end card says "Coming soon" and every number is labelled as an
example.
