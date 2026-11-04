// The Hopkins chat on a phone, in the new look (2026-11-01), for reels from r8 on. Messages
// appear on their cue and push the older ones up, the way the real chat does. Load after engine.js.
(function () {
const CSS = `
.ph{position:absolute;left:150px;top:560px;width:780px;height:1210px;border-radius:72px;background:#0B0B0D;border:12px solid #1c1c20;box-shadow:0 0 0 2px rgba(255,255,255,.08),0 50px 120px rgba(0,0,0,.65);overflow:hidden;opacity:0;color:#fff}
.ph .sb{height:62px;display:flex;justify-content:space-between;align-items:flex-end;padding:0 52px 6px;font-size:24px;font-weight:700}
.ph .hd{height:96px;display:flex;align-items:center;gap:18px;padding:0 34px;border-bottom:1px solid rgba(255,255,255,.1)}
.ph .hd .bk{font-size:40px;opacity:.85;width:24px}
.ph .hd b{display:block;font-size:30px;letter-spacing:-.02em}.ph .hd small{display:block;font-size:20px;color:rgba(255,255,255,.62);margin-top:2px}
.ph .hd .lg{display:flex;align-items:center;gap:12px;font-size:32px;font-weight:700;letter-spacing:-.04em}
.ph .thr{position:absolute;left:30px;right:30px;bottom:150px;display:flex;flex-direction:column}
.ph .it{overflow:hidden;height:0;opacity:0;flex:none}
.ph .in{padding:12px 0}
.ph .me{margin-left:auto;max-width:78%;background:#1E1E21;border-radius:30px;padding:18px 26px;font-size:27px;line-height:1.35;width:max-content}
.ph .hk{display:flex;gap:16px;align-items:flex-start;font-size:27px;line-height:1.42}
.ph .hk svg{flex:none;margin-top:2px}
.ph .hk b{font-weight:700}
.ph .acts{display:flex;gap:12px;margin:16px 0 0 58px}
.ph .acts span{font-size:22px;font-weight:700;padding:13px 24px;border-radius:30px;background:#fff;color:#0B0B0D}
.ph .acts span.d{background:#0B0B0D;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2)}
.ph .think svg{animation:none}
.ph .cp{position:absolute;left:28px;right:28px;bottom:36px;height:86px;border-radius:43px;background:#1E1E21;display:flex;align-items:center;padding:0 16px 0 30px;gap:18px;font-size:26px;color:rgba(255,255,255,.55)}
.ph .cp .pl{font-size:36px;color:#fff;opacity:.85}.ph .cp .tx{flex:1;color:#fff}
.ph .cp .up{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}
.ad{position:relative;border-radius:22px;overflow:hidden;background-size:cover;background-position:center;margin-left:58px}
.ad .pan{position:absolute;left:22px;right:22px;bottom:22px;border-radius:16px;padding:22px 24px}
.ad .k{font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.ad .l{font-family:"Instrument Serif",serif;font-style:italic;font-size:42px;line-height:1.05;margin-top:8px}
.ad .p{font-size:46px;font-weight:700;letter-spacing:-.03em;margin-top:4px}
.ad .a{font-size:15px;font-weight:700;margin-top:12px;opacity:.8}
.slides{display:flex;gap:12px;margin-left:58px}
.sl{flex:none;width:200px;height:250px;border-radius:14px;padding:18px;display:flex;flex-direction:column;justify-content:space-between}
.sl b{font-size:25px;line-height:1.05;letter-spacing:-.02em}.sl small{font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
`;
const MK = (s = 44) => `<svg width="${s}" height="${s}" viewBox="0 0 120 120">${E.SUNMARK}</svg>`;
E.mk = MK;
// One item: me, hk (Hopkins' words), think (the thinking mark), or any html.
const item = (it) => {
  let inner = it.html || "";
  if (it.who === "me") inner = `<div class="me">${it.text}</div>`;
  if (it.who === "hk") inner = `<div class="hk">${MK()}<div>${it.text}</div></div>${it.extra || ""}`;
  if (it.who === "think") inner = `<div class="hk think">${MK()}</div>`;
  return `<div class="it" id="${it.id}"><div class="in">${inner}</div></div>`;
};
// A whole phone: status bar, header (a chat's title, or the Hopkins logo), the messages, the box.
E.phone = (id, { title, sub, logo, items = [], box = "Reply to Hopkins" }) => `<div class="ph" id="${id}">
  <div class="sb"><span>9:41</span><span>●●● ▮</span></div>
  <div class="hd">${logo ? `<span class="lg">${MK(40)}Hopkins</span>` : `<span class="bk">‹</span><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>`}</div>
  <div class="thr">${items.map(item).join("")}</div>
  <div class="cp"><span class="pl">+</span><span class="tx" id="${id}box" data-ph="${box}"><span style="color:rgba(255,255,255,.55)">${box}</span></span><span class="up">↑</span></div></div>`;
// Shows an item from its cue (and hides it again from an optional cue): it opens to its height,
// pushing the older ones up.
E.show = (sel, t, a, b = null) => {
  const el = E.$(sel); if (!el) return 0;
  const k = E.ease(E.P(t, a, a + .35)), q = b == null ? 0 : E.ease(E.P(t, b, b + .25));
  const h = el.firstElementChild.scrollHeight;
  el.style.height = `${h * k * (1 - q)}px`; el.style.opacity = E.clamp(k * 1.6) * (1 - q);
  return k * (1 - q);
};
// Typing into the box: the words appear letter by letter between two times, then it clears.
E.typeBox = (id, t, a, b, text, sent) => {
  const el = E.$(`#${id}box`); if (!el) return;
  if (t < a || t >= sent) { el.innerHTML = `<span style="color:rgba(255,255,255,.55)">${el.dataset.ph}</span>`; return; }
  el.textContent = text.slice(0, Math.round(text.length * E.clamp(E.P(t, a, b))));
};
// A listing ad drawn in HTML, in one of the app's looks.
E.ad = ({ photo, w = 560, kicker, line, price, agent = "Sam Ellery · Ellery Realty", look = "cream" }) => {
  const L = { cream: ["#F4EBDD", "#1A1A1A", "#C0603F"], noir: ["#111111", "#FFFFFF", "#D7AE62"], green: ["#1E3A2B", "#FBF7EE", "#E9C46A"] }[look];
  return `<div class="ad" style="width:${w}px;height:${Math.round(w * 1.25)}px;background-image:url(../../app/demo/photos/${photo}.jpg)">
  <div class="pan" style="background:${L[0]};color:${L[1]}"><div class="k" style="color:${L[2]}">${kicker}</div><div class="l">${line}</div>${price ? `<div class="p" style="color:${L[2]}">${price}</div>` : ""}<div class="a">${agent}</div></div></div>`;
};
const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
})();
