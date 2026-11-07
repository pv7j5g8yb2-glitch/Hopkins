// The opening moment (Ismael, 2026-10-31): only when Hopkins is opened fresh in a tab, after sign
// in (the app page is only served to people signed in), never again in that tab, so coming back to
// it or Safari restoring it goes straight in. Loaded in the head, before anything is drawn. At the
// end the lockup glides into the header's logo, so the splash hands over to the app.
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
  function target() {
    var c = document.querySelectorAll(".mtop .logo .mk, .brand .mk");
    for (var i = 0; i < c.length; i++) { var r = c[i].getBoundingClientRect(); if (r.width && r.top >= 0) return r; }
    return null;
  }
  function end() {
    if (done) return;
    done = true;
    var stage = document.querySelector(".sp-stage"), mark = document.querySelector(".sp-mark"), t = target();
    if (stage && mark && t && !calm) {
      var m = mark.getBoundingClientRect(), s = stage.getBoundingClientRect();
      var k = t.width / m.width;
      // Scale about the mark's corner, then move that corner onto the logo's.
      stage.style.transformOrigin = (m.left - s.left) + "px " + (m.top - s.top) + "px";
      var base = getComputedStyle(stage).transform;
      stage.classList.add("fly");
      stage.style.transform = "translate(" + (t.left - m.left) + "px," + (t.top - m.top) + "px) " + (base === "none" ? "" : base) + " scale(" + k + ")";
      setTimeout(function () { stage.classList.add("gone"); }, 380);
    }
    root.classList.add("splash-out");
    setTimeout(function () { root.classList.remove("splashing", "splash-out", "splash-calm"); }, 720);
  }
  setTimeout(end, calm ? 700 : 2000);
  // A tap goes straight in.
  window.addEventListener("pointerdown", end, { once: true, capture: true });
})();
