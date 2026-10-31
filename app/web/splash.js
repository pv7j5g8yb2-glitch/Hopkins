// The opening moment (Ismael, 2026-10-31): only when Hopkins is opened fresh in a tab, after sign
// in (the app page is only served to people signed in), never again in that tab, so coming back to
// it or Safari restoring it goes straight in. Loaded in the head, before anything is drawn.
(function () {
  var root = document.documentElement;
  try {
    if (sessionStorage.getItem("hpk-opened")) return;
    sessionStorage.setItem("hpk-opened", "1");
  } catch (e) { return; }
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("splashing");
  if (calm) root.classList.add("splash-calm");
  var done = false;
  function end() {
    if (done) return;
    done = true;
    root.classList.add("splash-out");
    setTimeout(function () { root.classList.remove("splashing", "splash-out", "splash-calm"); }, 520);
  }
  setTimeout(end, calm ? 700 : 2050);
  // A tap goes straight in.
  window.addEventListener("pointerdown", end, { once: true, capture: true });
})();
