// Liquid Glass, the way Apple's works (Ismael, 2026-10-31): refraction, rim, reflection.
//
// Refraction: what's behind the glass is magnified in the middle and bent at the edges, with a
// trace of colour splitting where it bends most. Rim: a thin line of light runs along the edge,
// brightest where it faces the light (top left). Reflection: a glint lies across the glass and
// slides as the glass moves (scrolling, the tab bar's drop travelling).
//
// Browsers can't bend what's behind an element: the SVG filter that would do it isn't supported
// inside backdrop-filter on any iPhone browser (tried 2026-10-24). But what's behind every glass
// panel is the app's own background picture (field-phone.jpg, fixed, cover, top). So each panel
// draws that picture itself, through a lens, with WebGL. One WebGL context draws every panel and
// each panel copies its own pixels into a small canvas behind its contents. Without WebGL the
// panels keep their frosted CSS look.
(function () {
  const phone = window.matchMedia("(max-width: 980px)");
  const SELECTORS = [
    // Only the tab bar is glass (Ismael, 2026-11-01: black cards, "keep navbar liquid").
    ".lg-cap", ".lg-lens",
  ].join(",");
  const SKIP = ".lg-circle, .btn, .cr-slide, .cr-reel";

  const gl_canvas = document.createElement("canvas");
  const gl = gl_canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl) return;

  const VS = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}`;
  const FS = `precision highp float;
varying vec2 v;
uniform sampler2D bg;
uniform vec2 size;      // the panel, in CSS px
uniform vec2 origin;    // its top left on screen, CSS px
uniform vec4 map;       // where the background picture sits on screen: x, y, width, height
uniform float radius, glint, mag, tint, press;
float sd(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.) + length(max(q, 0.)) - r; }
vec3 at(vec2 s){ return texture2D(bg, clamp((s - map.xy) / map.zw, 0.001, .999)).rgb; }
vec3 soft(vec2 s){
  vec3 c = at(s) * .36;
  c += (at(s + vec2(2.5, 0.)) + at(s - vec2(2.5, 0.)) + at(s + vec2(0., 2.5)) + at(s - vec2(0., 2.5))) * .16;
  return c;
}
void main(){
  vec2 c = size * .5;
  vec2 lp = v * size - c;
  float r = min(radius, min(c.x, c.y));
  float d = sd(lp, c, r);
  float alpha = clamp(.5 - d, 0., 1.);
  if (alpha <= 0.) { gl_FragColor = vec4(0.); return; }
  float e = .75;
  vec2 n = normalize(vec2(sd(lp + vec2(e, 0.), c, r) - sd(lp - vec2(e, 0.), c, r), sd(lp + vec2(0., e), c, r) - sd(lp - vec2(0., e), c, r)) + 1e-5);
  // How close to the edge, 0 deep inside to 1 on the rim, over a band that suits the panel's size.
  float band = clamp(min(c.x, c.y) * .9, 6., 26.);
  float t = clamp(1. + d / band, 0., 1.);
  // Refraction: magnified in the middle (sampling closer to the centre), bent at the edges
  // (sampling from further in, the way the curved edge of a lens pulls the picture round).
  float bend = pow(t, 2.4) * band * (1.05 + press * .5);
  vec2 s = origin + c + lp * (mag - press * .06) - n * bend;
  vec2 split = n * bend * .07;
  vec3 col = vec3(soft(s + split).r, soft(s).g, soft(s - split).b);
  // A touch brighter and richer than what's behind, then the blue tint that keeps text readable.
  col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, 1.18) * 1.04;
  col = mix(col, vec3(.06, .06, .065), tint);
  // Rim: a thin line of light on the edge, strongest facing the light (top left), a fainter
  // line opposite, and a soft glow just inside where the glass curves.
  vec2 L = normalize(vec2(-.55, -.85));
  float facing = dot(n, L);
  // (The rim's thin line is drawn crisp by .lens-rim at the screen's full sharpness.)
  float rim = 0.;
  float inner = pow(t, 5.) * .09 * (.6 + .4 * max(facing, 0.));
  // Reflection: a soft diagonal glint lying across the glass, strongest along the edge.
  vec2 u = (lp + c) / size;
  float g = exp(-pow((dot(u, normalize(vec2(1., .55))) - glint) / .075, 2.));
  float glintAmt = g * (.05 + .3 * pow(t, 2.)) * (1. + press);
  vec3 outc = col + vec3(rim + inner + glintAmt);
  gl_FragColor = vec4(outc * alpha, alpha);
}`;
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (err) { return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const k of ["bg", "size", "origin", "map", "radius", "glint", "mag", "tint", "press"]) U[k] = gl.getUniformLocation(prog, k);

  // The background picture, the same one body:before shows.
  const tex = gl.createTexture();
  const img = new Image();
  let pic = null, ready = false;
  function loadPicture() {
    const want = phone.matches ? "/static/field-phone.jpg" : "/static/field-desk.jpg";
    if (pic === want) return;
    pic = want;
    ready = false;
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      document.documentElement.classList.add("lensing");
      // Anything drawn before the picture arrived is drawn again.
      ready = true;
      for (const p of panels.values()) p.key = "";
      dirty = true;
      wake();
    };
    img.src = want;
  }

  // ---------- the panels ----------
  //
  // Speed (Ismael on his iPhone, 2026-10-31: "wtf is this lag"): a panel keeps its own look until
  // its glass has been drawn once (never see-through while it opens), everything about it that
  // doesn't move is read once, nothing is redrawn unless it moved, and the glass is drawn at the
  // screen's CSS size (what's behind is soft anyway); the crisp rim is a separate layer.

  const panels = new Map(); // element -> panel
  function attach(el) {
    if (panels.has(el) || el.closest(SKIP) || el.matches(SKIP)) return;
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    // Glass is never a sharp rectangle.
    let radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (!radius) { el.style.borderRadius = "18px"; el.style.overflow = "hidden"; radius = 18; }
    el.classList.add("lensed");
    const canvas = document.createElement("canvas");
    canvas.className = "lens-c";
    canvas.setAttribute("aria-hidden", "true");
    const rim = document.createElement("i");
    rim.className = "lens-rim";
    rim.setAttribute("aria-hidden", "true");
    el.prepend(canvas, rim);
    const isLens = el.classList.contains("lg-lens");
    panels.set(el, {
      canvas, rim, ctx: canvas.getContext("2d"), key: "", radius, isLens,
      tint: isLens ? 0.08 : el.matches(".pop, .toast") ? 0.62 : 0.4,
      mag: isLens ? 0.8 : 0.9,
    });
  }
  function scan() {
    if (!phone.matches) return;
    for (const el of document.querySelectorAll(SELECTORS)) attach(el);
    for (const [el, p] of panels) {
      if (!el.isConnected) { panels.delete(el); continue; }
      // A panel that rebuilds its contents (the account sheet does, each time it opens) loses its
      // glass layers: they go straight back, and it shows its own look until they're drawn.
      if (p.canvas.parentNode !== el) { el.classList.remove("lens-on"); el.prepend(p.canvas, p.rim); p.key = ""; }
    }
  }
  function detachAll() {
    for (const [el, p] of panels) { p.canvas.remove(); el.querySelector(":scope>.lens-rim")?.remove(); el.classList.remove("lensed", "lens-on"); }
    panels.clear();
    document.documentElement.classList.remove("lensing");
  }

  // ---------- drawing ----------

  function bgMap() {
    // body:before: cover, centred across, from the top.
    const W = window.innerWidth, H = window.innerHeight;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    return [(W - w) / 2, 0, w, h];
  }
  // Draws one panel if it moved; says whether it did.
  function drawPanel(el, p, map, mapKey) {
    if (p.canvas.parentNode !== el) { el.classList.remove("lens-on"); el.prepend(p.canvas, p.rim); p.key = ""; }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < -40 || r.top > window.innerHeight + 40) return false;
    // The drop in the tab bar is scaled while it moves: draw at its own size, place by its centre.
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = r.left + r.width / 2 - w / 2, y = r.top + r.height / 2 - h / 2;
    const press = p.isLens && el.classList.contains("press") ? 1 : 0;
    const key = `${Math.round(x)}|${Math.round(y)}|${w}|${h}|${press}|${mapKey}`;
    if (key === p.key) return false;
    p.key = key;
    const pw = Math.ceil(w), ph = Math.ceil(h);
    if (pw > gl_canvas.width || ph > gl_canvas.height) {
      gl_canvas.width = Math.max(gl_canvas.width, pw, 512);
      gl_canvas.height = Math.max(gl_canvas.height, ph, 512);
    }
    if (p.canvas.width !== pw || p.canvas.height !== ph) { p.canvas.width = pw; p.canvas.height = ph; }
    // Scrolling panels keep their canvas where the panel is.
    if (el.scrollTop) p.canvas.style.transform = `translateY(${el.scrollTop}px)`;
    gl.viewport(0, gl_canvas.height - ph, pw, ph);
    gl.scissor(0, gl_canvas.height - ph, pw, ph);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.size, w, h);
    gl.uniform2f(U.origin, x, y);
    gl.uniform4f(U.map, ...map);
    gl.uniform1f(U.radius, Math.min(p.radius, Math.min(w, h) / 2));
    // The glint's place follows the panel's place on screen, so it slides as the panel moves.
    gl.uniform1f(U.glint, ((x * 0.7 + y * 0.45) / Math.max(window.innerHeight, 1)) % 1.3 - 0.1);
    gl.uniform1f(U.mag, p.mag);
    gl.uniform1f(U.tint, p.tint);
    gl.uniform1f(U.press, press);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    p.ctx.clearRect(0, 0, pw, ph);
    p.ctx.drawImage(gl_canvas, 0, 0, pw, ph, 0, 0, pw, ph);
    // Only now does the panel give up its own look for the glass.
    if (!el.classList.contains("lens-on")) el.classList.add("lens-on");
    return true;
  }

  let dirty = true, running = false, idle = 0;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.SCISSOR_TEST);
  gl.uniform1i(U.bg, 0);
  function frame() {
    if (!phone.matches || !ready) { running = false; return; }
    if (dirty) { scan(); dirty = false; }
    const map = bgMap();
    const mapKey = map.map(Math.round).join(",");
    let moved = false;
    for (const [el, p] of panels) if (drawPanel(el, p, map, mapKey)) moved = true;
    // Keep drawing while anything moves; stop half a second after everything is still.
    idle = moved ? 0 : idle + 1;
    if (idle > 30 || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function wake() {
    idle = 0;
    if (!running && phone.matches && ready) { running = true; requestAnimationFrame(frame); }
  }

  // New elements are looked for only when elements are added; a class change (a sheet opening,
  // a tab pressed) just wakes the drawing. The lens's own canvases never count.
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "childList" && [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1 && !n.classList.contains("lens-c") && !n.classList.contains("lens-rim"))) dirty = true;
    }
    wake();
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  for (const ev of ["scroll", "resize", "pointerdown", "pointerup", "pointermove", "transitionrun", "transitionend", "animationstart", "animationend"]) window.addEventListener(ev, wake, { passive: true, capture: true });
  document.addEventListener("visibilitychange", wake);
  phone.addEventListener("change", () => { if (phone.matches) { loadPicture(); wake(); } else detachAll(); });
  if (phone.matches) loadPicture();
})();
