// 3D pieces for the launch film: the Rise mark as two real pebbles, clay style icons, and a
// stylised house rendered into the ad images. Everything is a pure function of time.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const C = { ox: 0x2A0F14, cream: 0xF4EBDD, gold: 0xD7AE62, plum: 0x5B4873, lilac: 0xB79DC2, rose: 0xC3A9A2 };

export function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  return { r, env };
}

const mat = {
  gold: () => new THREE.MeshPhysicalMaterial({ color: C.gold, metalness: .6, roughness: .38, clearcoat: .5, clearcoatRoughness: .3 }),
  plum: () => new THREE.MeshPhysicalMaterial({ color: C.plum, metalness: .1, roughness: .45, clearcoat: .8, clearcoatRoughness: .25 }),
  cream: () => new THREE.MeshPhysicalMaterial({ color: C.cream, metalness: 0, roughness: .5, clearcoat: .7, clearcoatRoughness: .3 }),
  lilac: () => new THREE.MeshPhysicalMaterial({ color: C.lilac, metalness: 0, roughness: .45, clearcoat: .7 }),
};

// a lopsided pebble: a sphere pushed by low frequency waves, never a perfect circle
function pebble(seed, sx, sy, sz) {
  const g = new THREE.SphereGeometry(1, 96, 64), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + .13 * Math.sin(v.x * 2.1 + seed) * Math.cos(v.y * 1.7 - seed * .7) + .07 * Math.sin(v.y * 3.3 + v.x * 1.4 + seed * 2) + .05 * Math.cos(v.x * 4.2 - v.y * 2.5 + seed);
    p.setXYZ(i, v.x * sx * n, v.y * sy * n, v.z * sz * n);
  }
  g.computeVertexNormals(); return g;
}

const bev = { depth: .55, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 6, curveSegments: 24 };
function rr(s, x, y, w, h, r) { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); }
function centred(geo) { geo.computeBoundingBox(); const c = new THREE.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, -c.z); return geo; }

export const icons = {
  bubble() {
    const s = new THREE.Shape(); rr(s, -1, -.6, 2, 1.4, .45);
    const t = new THREE.Shape(); t.moveTo(-.55, -.5); t.lineTo(-.85, -1.05); t.lineTo(-.1, -.55);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(centred(new THREE.ExtrudeGeometry([s, t], bev)), mat.cream()));
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.14, 32, 16), mat.plum()); d.position.set(-.45 + i * .45, .12, .3); g.add(d); }
    return g;
  },
  house() {
    const s = new THREE.Shape(); s.moveTo(-1, -1); s.lineTo(1, -1); s.lineTo(1, .2); s.lineTo(0, 1.1); s.lineTo(-1, .2); s.closePath();
    const h = new THREE.Path(); rr(h, -.28, -1, .56, .9, .2); s.holes.push(h);
    const g = new THREE.Group(); g.add(new THREE.Mesh(centred(new THREE.ExtrudeGeometry(s, bev)), mat.gold())); return g;
  },
  calendar() {
    const s = new THREE.Shape(); rr(s, -1, -1, 2, 1.8, .35);
    const g = new THREE.Group(); g.add(new THREE.Mesh(centred(new THREE.ExtrudeGeometry(s, bev)), mat.cream()));
    const top = new THREE.Shape(); rr(top, -1, .25, 2, .55, .25);
    const tm = new THREE.Mesh(new THREE.ExtrudeGeometry(top, { ...bev, depth: .1 }), mat.plum()); tm.position.set(0, -.12, .22); g.add(tm);
    for (const x of [-.5, .5]) { const r = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .35, 8, 16), mat.gold()); r.position.set(x, .9, .25); g.add(r); }
    for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.32, .26, .1), i === 4 ? mat.gold() : mat.lilac()); d.position.set(-.55 + (i % 3) * .55, -.15 - Math.floor(i / 3) * .42, .32); g.add(d); }
    return g;
  },
  chart() {
    const g = new THREE.Group(), hs = [.9, 1.5, 2.2];
    hs.forEach((h, i) => { const s = new THREE.Shape(); rr(s, -.28, 0, .56, h, .2);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, bev), i === 2 ? mat.gold() : i === 1 ? mat.lilac() : mat.plum()); m.position.set(-.8 + i * .8, -1.1, -.2); g.add(m); });
    return g;
  },
  send() {
    const s = new THREE.Shape(); s.moveTo(-.9, -.9); s.lineTo(1, 0); s.lineTo(-.9, .9); s.lineTo(-.45, 0); s.closePath();
    const g = new THREE.Group(); g.add(new THREE.Mesh(centred(new THREE.ExtrudeGeometry(s, { ...bev, bevelSize: .14 })), mat.gold())); return g;
  },
  check() {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-.9, 0, 0), new THREE.Vector3(-.25, -.6, 0), new THREE.Vector3(1, .75, 0)], false, "catmullrom", .05);
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 64, .22, 24, false), mat.gold()));
    for (const p of [c.getPoint(0), c.getPoint(1)]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), mat.gold()); e.position.copy(p); g.add(e); }
    return g;
  },
  coin() {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .32, 64), mat.gold()); m.rotation.x = Math.PI / 2; g.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .07, 16, 64), mat.cream()); ring.position.z = .2; g.add(ring); return g;
  },
};

// the scene that floats icons over the interface, plus the logo pebbles
export function makeStage(renderer, env, w, h) {
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(30, w / h, .1, 200); cam.position.set(0, 0, 30);
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(-6, 10, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd7ae62, 1.4); rim.position.set(8, -4, -6); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const made = {};
  const add = (name, obj) => { obj.visible = false; scene.add(obj); made[name] = obj; return obj; };
  for (const k of Object.keys(icons)) add(k, icons[k]());
  const plum = add("plum", new THREE.Mesh(pebble(1.3, .8, .6, .34), mat.plum()));
  const gold = add("gold", new THREE.Mesh(pebble(4.1, 1.06, .9, .42), mat.gold()));
  // world units per screen pixel at z=0, so DOM layouts can place 3D things in px
  const unit = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 30 / h;
  const place = (o, px, py, sizePx, rx = 0, ry = 0, rz = 0, z = 0) => {
    o.visible = true; o.position.set((px - w / 2) * unit, (h / 2 - py) * unit, z); o.scale.setScalar(sizePx * unit / 2);
    o.rotation.set(rx, ry, rz);
  };
  const hideAll = () => { for (const o of Object.values(made)) o.visible = false; };
  return { scene, cam, made, place, hideAll, render: () => renderer.render(scene, cam) };
}

// stylised 3D house photos for the ad cards: day, dusk and morning sun
export function renderHouses(renderer, env) {
  const W = 900, H = 640, out = {};
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(28, W / H, .1, 200); cam.position.set(9.5, 4.2, 15); cam.lookAt(0, 1.5, 0);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(-8, 12, 10); sun.castShadow = true; scene.add(sun);
  const amb = new THREE.HemisphereLight(0xffffff, 0x445533, .6); scene.add(amb);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
  const g = new THREE.Group(); scene.add(g);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), M(0x7d9a5c)); ground.rotation.x = -Math.PI / 2; g.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), M(0xd9cdb8)); path.rotation.x = -Math.PI / 2; path.position.set(.3, .01, 4.6); g.add(path);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4.2), M(0xf1e8d8)); body.position.y = 1.5; g.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3.6), M(0xe8dcc8)); wing.position.set(4.3, 1.1, -.2); g.add(wing);
  const roofShape = new THREE.Shape(); roofShape.moveTo(-3.4, 0); roofShape.lineTo(3.4, 0); roofShape.lineTo(0, 2.2); roofShape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 4.8, bevelEnabled: false }), M(0x3d2a2e)); roof.position.set(0, 3, -2.4); g.add(roof);
  const rs2 = new THREE.Shape(); rs2.moveTo(-1.8, 0); rs2.lineTo(1.8, 0); rs2.lineTo(0, 1.3); rs2.closePath();
  const roof2 = new THREE.Mesh(new THREE.ExtrudeGeometry(rs2, { depth: 4, bevelEnabled: false }), M(0x3d2a2e)); roof2.position.set(4.3, 2.2, -2.2); g.add(roof2);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, emissive: 0xffb860, emissiveIntensity: 0 });
  const wins = [];
  for (const [x, y] of [[-1.9, 2.1], [1.9, 2.1], [-1.9, .9], [1.9, .9], [4.3, 1.2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, .9, .1), winMat); m.position.set(x, y, x > 3 ? 1.65 : 2.12); g.add(m); wins.push(m); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.7, .1), M(0x5b4873)); door.position.set(0, .85, 2.13); g.add(door);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(3, .2, 1.4), M(0xcbbda6)); porch.position.set(0, .1, 2.7); g.add(porch);
  for (const [x, z, s] of [[-5.5, 1, 1.4], [-6.6, -2.5, 1.9], [8, -1.5, 1.6], [7.2, 2.6, 1.1]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 1.2), M(0x5a4232)); tr.position.set(x, .6, z); g.add(tr);
    const cr = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16), M(0x557544)); cr.position.set(x, 1.2 + s * .8, z); g.add(cr);
  }
  const sky = { day: [0xbfd8e8, 2.5, 0], dusk: [0x3a2340, .55, 2.6], morning: [0xf3d9b0, 2.1, .35] };
  for (const [k, [col, sunI, glow]] of Object.entries(sky)) {
    scene.background = new THREE.Color(col); sun.intensity = sunI;
    sun.color.set(k === "morning" ? 0xffd9a0 : k === "dusk" ? 0xff9f7a : 0xffffff);
    sun.position.set(k === "morning" ? 12 : -8, k === "morning" ? 5 : 12, 10);
    amb.intensity = k === "dusk" ? .25 : .6; winMat.emissiveIntensity = glow;
    renderer.setSize(W, H, false); renderer.render(scene, cam);
    out[k] = renderer.domElement.toDataURL("image/jpeg", .92);
  }
  return out;
}
