// «Шығармашылық кеңістігі» — gallery walk-through (desktop only).
// Camera moves along -Z through three arches; HTML stays the source of all content.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');
const root = document.documentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const MILK = 0xF5F0E9;
const scene = new THREE.Scene();
scene.background = new THREE.Color(MILK);
scene.fog = new THREE.Fog(MILK, 30, 92);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 160);

// ---------- light ----------
scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xD8CEC4, 2.2));
const sun = new THREE.DirectionalLight(0xFFF9F2, 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
scene.add(sun, sun.target);

// ---------- materials ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...o });
const M = {
  plaster: std(0xF7F3ED, { roughness: 0.97 }),
  wall: std(0xF1ECE6, { roughness: 1 }),
  floor: std(0xE9E1D8, { roughness: 1 }),
  burg: std(0x6B2035, { roughness: 0.82 }),
  rose: std(0xC9A5AA, { roughness: 0.9 }),
  gold: std(0xB79B6C, { roughness: 0.5, metalness: 0.35 }),
  ink: std(0x292326, { roughness: 0.7 }),
};
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#D8BA92'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 110; i++) {
    const y = Math.random() * 512;
    g.strokeStyle = `rgba(${150 + Math.random() * 30 | 0},${104 + Math.random() * 24 | 0},68,${0.06 + Math.random() * 0.14})`;
    g.lineWidth = 0.8 + Math.random() * 2.6;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 70 + i) * 5);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.45, 0.45);
  return t;
}
M.wood = std(0xFFFFFF, { map: woodTexture(), roughness: 0.78 });

const add = (mesh, x = 0, y = 0, z = 0, parent = scene) => {
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
};
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// ---------- shapes ----------
function archPath(w, h, P = THREE.Path) {
  const r = w / 2, p = new P();
  p.moveTo(-r, 0); p.lineTo(r, 0); p.lineTo(r, h - r); p.absarc(0, h - r, r, 0, Math.PI, false); p.lineTo(-r, 0);
  return p;
}
const OPEN_W = 6.4, OPEN_H = 9.4;
function archWall(z, frameMat, depth) {
  const s = new THREE.Shape();
  s.moveTo(-60, 0); s.lineTo(60, 0); s.lineTo(60, 34); s.lineTo(-60, 34); s.closePath();
  s.holes.push(archPath(OPEN_W, OPEN_H));
  add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false }), M.wall), 0, 0, z - 0.4).castShadow = false;
  const f = archPath(OPEN_W + 2.2, OPEN_H + 1.1, THREE.Shape);
  f.holes.push(archPath(OPEN_W, OPEN_H));
  add(new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 48 }), frameMat), 0, 0, z - 0.4).castShadow = false;
}
function lattice(w, h, cols, rows) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const cw = w / cols, ch = h / rows, pts = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = -w / 2 + cw * (i + 0.5), cy = ch * (j + 0.5), rx = cw * 0.34, ry = ch * 0.34;
    const p = new THREE.Path();
    p.moveTo(cx, cy - ry); p.lineTo(cx + rx, cy); p.lineTo(cx, cy + ry); p.lineTo(cx - rx, cy); p.closePath();
    s.holes.push(p); pts.push([cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]);
  }
  for (let i = 1; i < cols; i++) for (let j = 1; j < rows; j++) {
    const p = new THREE.Path(); p.absarc(-w / 2 + cw * i, ch * j, Math.min(cw, ch) * 0.08, 0, Math.PI * 2, true); s.holes.push(p);
  }
  return { shape: s, pts };
}
function latticeMesh(w, h, cols, rows, depth = 0.1) {
  const { shape } = lattice(w, h, cols, rows);
  return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 }), M.wood);
}
function tube(points, r, mat, closed = false) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(32, points.length * 6), r, 8, closed), mat);
  m.castShadow = true; return m;
}
// Kazakh «қошқар мүйіз» (ram-horn) motif, as two mirrored bezier spirals
function ornament(scale = 1) {
  const g = new THREE.Group();
  const horn = (sx) => {
    const path = new THREE.CurvePath();
    const c = (a, b, d, e) => path.add(new THREE.CubicBezierCurve3(V(a[0] * sx, a[1]), V(b[0] * sx, b[1]), V(d[0] * sx, d[1]), V(e[0] * sx, e[1])));
    c([0, 0], [0, 1.2], [1.3, 1.55], [1.62, 0.92]);
    c([1.62, 0.92], [1.88, 0.4], [1.4, 0.02], [1.04, 0.3]);
    c([1.04, 0.3], [0.8, 0.5], [0.95, 0.82], [1.22, 0.74]);
    return new THREE.Mesh(new THREE.TubeGeometry(path, 120, 0.04, 8), M.gold);
  };
  g.add(horn(1), horn(-1));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0, 0), V(0, -0.9)), 4, 0.04, 8), M.gold));
  const dia = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 4), M.gold);
  dia.position.y = -1.12; g.add(dia);
  g.scale.setScalar(scale);
  return g;
}
// animated music line: displacement in the vertex shader
const waveMats = [];
function wave(len, color, phase, amp, r = 0.03) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 });
  mat.userData.t = { value: 0 };
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = mat.userData.t;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float e = 1.0 - pow(abs(position.x) / ${(len / 2).toFixed(2)}, 2.0);
       transformed.y += sin(position.x * 2.8 + uTime * 1.1 + ${phase.toFixed(2)}) * ${amp.toFixed(2)} * e;
       transformed.z += cos(position.x * 1.7 + uTime * 0.7 + ${phase.toFixed(2)}) * ${(amp * 0.35).toFixed(2)} * e;`);
  };
  waveMats.push(mat);
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(-len / 2, 0), V(len / 2, 0)), 220, r, 8), mat);
}

// ---------- architecture ----------
const ARCH = [0, -40, -84];
add(new THREE.Mesh(new THREE.PlaneGeometry(240, 260), M.floor), 0, 0, -70).rotation.x = -Math.PI / 2;
archWall(ARCH[0], M.burg, 5.2);   // deep burgundy portal (hero)
archWall(ARCH[1], M.rose, 1.6);   // dusty-rose arch
archWall(ARCH[2], M.plaster, 1.2); // plaster arch with gold trim
{
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI * i / 40; pts.push(V(Math.cos(a) * (OPEN_W / 2 + 0.06), OPEN_H - OPEN_W / 2 + Math.sin(a) * (OPEN_W / 2 + 0.06), 0)); }
  const trim = tube([V(OPEN_W / 2 + 0.06, 0), ...pts, V(-OPEN_W / 2 - 0.06, 0)], 0.05, M.gold);
  trim.position.z = ARCH[2] + 0.85; scene.add(trim);
}
add(new THREE.Mesh(new THREE.BoxGeometry(120, 34, 0.8), M.wall), 0, 17, -134);

// ---------- hall 0: entrance ----------
const g0 = new THREE.Group(); scene.add(g0);
add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 1.3), M.plaster), 5.4, 0.85, 7, g0);
add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 1.45), M.plaster), 5.4, 1.74, 7, g0);
add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 32), M.plaster), 5.4, 2.4, 7, g0);
add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.plaster), 3.3, 0, 11.5, g0);
{ const p = latticeMesh(1.9, 2.8, 3, 5, 0.09); add(p, 6.9, 0, 2.1, g0); p.rotation.set(-0.12, -0.3, 0); }
{ const o = ornament(0.85); o.position.set(6.3, 7.4, ARCH[0] + 0.45); scene.add(o); }
// glimpse into the next hall through the arch
add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 3.6, 40), M.plaster), -1.7, 1.8, -10, g0);
add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), M.plaster), -1.7, 3.72, -10, g0);
add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), M.plaster), 1.9, 0.6, -15, g0).rotation.y = 0.5;

// ---------- hall 1: one large plaster vase ----------
{
  const prof = [[0, 0], [0.5, 0], [0.56, 0.08], [0.42, 0.3], [0.48, 0.6], [0.92, 1.2], [1.12, 1.9], [1.02, 2.6], [0.66, 3.1], [0.4, 3.35], [0.36, 3.7], [0.5, 3.86], [0.44, 3.92], [0, 3.92]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 1.9), M.plaster), 2.6, 0.65, -33);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.1, 2.05), M.plaster), 2.6, 1.35, -33);
  add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), M.plaster), 2.6, 1.4, -33);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.07, 0.025, 8, 96), M.gold);
  band.rotation.x = Math.PI / 2; band.position.set(2.6, 1.4 + 2.15, -33); scene.add(band);
  const o = ornament(0.95); o.position.set(6.5, 6.8, ARCH[1] + 1.25); scene.add(o);
}

// ---------- hall 2: three workshops ----------
// a) ГипсArt
{
  const g = new THREE.Group(); g.position.set(1.7, 0, -65); g.rotation.y = -0.35; scene.add(g);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 1.6), M.plaster), 0, 0.275, 0, g);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), M.plaster), -0.75, 0.93, 0.1, g).rotation.y = 0.6;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 24), M.plaster), 0.2, 1.01, -0.1, g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 40, 1, false, 0, Math.PI), M.plaster), 0.95, 1.15, 0.05, g);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 4), M.plaster), -0.1, 0.95, 0.5, g).rotation.y = 0.3;
}
// b) vector contour -> wooden laser-cut panel
const laser = new THREE.Group(); laser.position.set(1.4, 0, -73); laser.rotation.y = -0.6; scene.add(laser);
const LW = 2.2, LH = 3.0, LD = 0.14;
{
  add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 0.9), M.plaster), 0, 0.15, 0, laser);
  const { shape, pts } = lattice(LW, LH, 3, 4);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: LD, bevelEnabled: false, curveSegments: 16 });
  geo.translate(0, 0.3, -LD / 2);
  const woodMat = M.wood.clone(); woodMat.transparent = true;
  laser.userData.woodMat = woodMat;
  laser.userData.wood = add(new THREE.Mesh(geo, woodMat), 0, 0, 0, laser);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8A7148, transparent: true });
  const lines = new THREE.Group(); lines.position.set(0, 0.3, LD / 2 + 0.02); laser.add(lines);
  [shape, ...shape.holes].forEach((p) => lines.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p.getPoints(24)), lineMat)));
  const hMat = new THREE.MeshBasicMaterial({ color: 0x292326, transparent: true });
  const handles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), hMat, pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach(([x, y], i) => handles.setMatrixAt(i, m4.makeTranslation(x, y, 0.01)));
  lines.add(handles);
  laser.userData.lineMat = lineMat; laser.userData.hMat = hMat;
}
// c) music — the burgundy accent niche
{
  const g = new THREE.Group(); g.position.set(5.6, 0, -82); g.rotation.y = -0.3; scene.add(g);
  const niche = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5.2, 64, 1, true, Math.PI / 2, Math.PI), std(0x6B2035, { side: THREE.DoubleSide, roughness: 0.85 }));
  add(niche, 0, 2.6, 0, g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.12, 64, 1, false, Math.PI / 2, Math.PI), M.burg), 0, 5.26, 0, g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.7, 48), M.plaster), 0, 0.35, -0.6, g);
  [[0xF5F0E9, 0, 0.42, 0.04], [0xC9A5AA, 1.6, 0.3, 0.03], [0xB79B6C, 3.1, 0.55, 0.025]].forEach(([c, ph, a, r], i) => {
    const w = wave(2.8, c, ph, a, r); w.position.set(0, 2.5 + i * 0.12, -0.5 + i * 0.15); w.castShadow = false; g.add(w);
  });
}

// ---------- hall 3: final composition (plaster + wood + music line) ----------
{
  const g = new THREE.Group(); g.position.set(1.9, 0, -119); g.rotation.y = -0.25; scene.add(g);
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.45, 72), M.plaster), 0, 0.225, 0, g);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.78, 64, 32), M.plaster), -0.75, 1.23, 0.35, g);
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.09, 16, 120), M.wood), 0.45, 1.95, -0.2, g);
  ring.rotation.y = 0.5;
  const lp = latticeMesh(1.5, 2.3, 3, 4, 0.08); add(lp, 0.9, 0.45, -1.2, g); lp.rotation.y = -0.2;
  [[0x6B2035, 0, 0.36], [0xC9A5AA, 2.1, 0.28], [0xB79B6C, 4, 0.46]].forEach(([c, ph, a], i) => {
    const w = wave(4.2, c, ph, a, 0.03); w.position.set(0, 3.7 + i * 0.1, 0.2 * i); w.castShadow = false; g.add(w);
  });
  const o = ornament(1.1); o.position.set(3.2, 7.2, -133.5); scene.add(o);
}

// ---------- scroll -> camera ----------
const STOPS = [{ z: 32, d: 0 }, { z: -17, d: 5 }, { z: -50, d: 10 }, { z: -97, d: 11 }];
const ids = ['basty', 'seminar', 'sheberlik', 'bagdarlama'];
let anchors = [];
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
function measure() {
  const vh = innerHeight, top = (el) => el.getBoundingClientRect().top + scrollY;
  const maxY = document.documentElement.scrollHeight - vh;
  anchors = ids.map((id, i) => {
    const el = document.getElementById(id);
    if (i === 0) return { s: 0, e: 0, ...STOPS[0] };
    const s = top(el) - 0.3 * vh;
    const endEl = i === 3 ? document.getElementById('natije') : el;
    const e = i === 3 ? maxY : top(endEl) + endEl.offsetHeight - 0.8 * vh;
    return { s, e: Math.max(s, e), ...STOPS[i] };
  });
}
function camZ(y) {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    if (y < a.s) {
      const p = anchors[i - 1], span = Math.max(1, a.s - p.e);
      return THREE.MathUtils.lerp(p.z - p.d, a.z, smooth(clamp01((y - p.e) / span)));
    }
    if (y <= a.e) return a.z - a.d * ((y - a.s) / Math.max(1, a.e - a.s));
  }
  const l = anchors[anchors.length - 1]; return l.z - l.d;
}

let shift = -1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  shift = -1; // re-applied in frame()
  measure();
}
addEventListener('resize', resize);
new ResizeObserver(measure).observe(document.body);
document.fonts && document.fonts.ready.then(measure);
resize();

let mx = 0, my = 0, px = 0, py = 0, z = camZ(scrollY);
addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

const clock = new THREE.Clock();
let first = true;
function frame() {
  requestAnimationFrame(frame);
  if (innerWidth < 900 || !root.classList.contains('deep')) return;
  const t = clock.getElapsedTime();
  const target = camZ(scrollY);
  z += (target - z) * 0.12; // light easing, scroll stays native
  px += (mx * 0.5 - px) * 0.04; py += (-my * 0.3 - py) * 0.04;
  // vanishing point shifted right (text keeps the left); stronger on the entrance screen
  const sh = 0.12 + 0.08 * smooth(clamp01((z + 8) / 18));
  if (Math.abs(sh - shift) > 1e-4) { shift = sh; camera.setViewOffset(innerWidth, innerHeight, -innerWidth * sh, 0, innerWidth, innerHeight); camera.updateProjectionMatrix(); }
  camera.position.set(px, 3.4 + py, z);
  camera.lookAt(px * 0.4, 4.0, z - 20);
  sun.position.set(9, 17, z + 8); sun.target.position.set(2, 0, z - 12);
  // laser exhibit: vector contour becomes a wooden part as you approach
  const k = smooth(clamp01((-51 - z) / 9));
  laser.userData.wood.scale.z = 0.02 + 0.98 * k;
  laser.userData.wood.visible = k > 0.01;
  laser.userData.woodMat.opacity = Math.min(1, k * 1.6);
  laser.userData.woodMat.depthWrite = k > 0.6;
  laser.userData.lineMat.opacity = 1 - k * 0.85;
  laser.userData.hMat.opacity = 1 - k;
  waveMats.forEach((m) => (m.userData.t.value = t));
  renderer.render(scene, camera);
  if (first) { first = false; canvas.classList.add('on'); }
}
frame();
