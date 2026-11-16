// «Шығармашылық кеңістігі» — museum walk built from the original design images.
// Each stop shows its original 01–15 picture untouched (plain <img>, no filters/WebGL).
// Transition = limited illusion of walking through a doorway: the current picture zooms
// toward the chosen opening (zoom centre = opening, not screen centre) while the next
// picture is revealed inside that opening through a mask cut from the same image;
// the near jamb stays in front and leaves the frame, the next picture settles exactly.
(function () {
  'use strict';
  const IW = 1672, IH = 941;
  // image-pixel data measured on the originals: door = opening to walk through,
  // zone = quiet wall for text, niche = recess for a future portrait (PNG, not used yet)
  const S = [
    { id: '01', door: [1000, 265, 1425, 746], zone: [70, 120, 680, 700] },
    { id: '02', door: [745, 195, 1195, 655], zone: [70, 130, 700, 640] },
    { id: '03', door: [30, 240, 222, 790], zone: [330, 130, 1080, 620], niche: [1130, 180, 1470, 740], dark: true },
    { id: '04', door: [810, 300, 980, 690], zone: [1110, 250, 1620, 700], niche: [84, 190, 388, 740] },
    { id: '05', door: [1490, 250, 1672, 700], zone: [50, 150, 880, 560], niche: [1170, 310, 1370, 690] },
    { id: '06', door: [1340, 240, 1570, 700], zone: [420, 140, 1150, 520], niche: [68, 200, 334, 730] },
    { id: '07', door: [545, 380, 665, 640], zone: [40, 120, 560, 700], niche: [1300, 170, 1580, 740] },
    { id: '08', door: [1420, 350, 1610, 650], zone: [400, 140, 900, 600], niche: [88, 230, 348, 740] },
    { id: '09', door: [0, 200, 200, 700], zone: [215, 110, 590, 640], niche: [1244, 170, 1496, 720] },
    { id: '10', door: [470, 240, 718, 690], zone: [840, 110, 1300, 600], niche: [68, 240, 290, 700] },
    { id: '11', door: [410, 230, 660, 650], zone: [30, 120, 420, 660], niche: [1300, 220, 1530, 700] },
    { id: '12', door: [1210, 290, 1530, 740], zone: [640, 150, 1100, 560], niche: [64, 280, 244, 760] },
    { id: '13', door: [1370, 230, 1610, 700], zone: [170, 90, 1300, 820] },
    { id: '14', door: [590, 225, 1110, 690], zone: [40, 130, 560, 640], niche: [1344, 140, 1638, 680], dark: true },
    { id: '15', zone: [40, 120, 640, 700] },
  ];
  const N = S.length;
  const root = document.documentElement;
  const mode = ['check', 'compare', 'flat'].find((m) => root.classList.contains(m)) || 'walk';
  const stops = [...document.querySelectorAll('.stop')];
  const stage = document.getElementById('stage');
  const src = (i) => `img/${S[i].id}.jpg`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const c01 = (v) => clamp(v, 0, 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);

  // ---------- flat mode: original images + text, normal page ----------
  if (mode === 'flat') {
    stops.forEach((el, i) => { const im = new Image(); im.src = src(i); im.alt = ''; im.loading = i ? 'lazy' : 'eager'; im.width = IW; im.height = IH; el.prepend(im); });
    return;
  }

  // ---------- layers ----------
  function holeMask(d) {
    const [x0, y0, x1, y1] = d, w = x1 - x0, fy = Math.min(IH, y1 + 130);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IW} ${IH}" preserveAspectRatio="none"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${IW}" height="${IH}"><rect width="${IW}" height="${IH}" fill="#fff"/><rect x="${x0}" y="${y0}" width="${w}" height="${y1 - y0}" fill="#000"/><path d="M${x0 + 6} ${y1 - 4}H${x1 - 6}L${x1 + w * 0.22} ${fy}H${x0 - w * 0.22}Z" fill="#000" filter="url(#b)"/></mask></defs><rect width="${IW}" height="${IH}" mask="url(#m)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  const L = S.map((s, i) => {
    const mk = (cls) => { const d = document.createElement('div'); d.className = 'lay ' + cls; const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; d.appendChild(im); stage.appendChild(d); return d; };
    const bg = mk('bg'), fr = s.door ? mk('fr') : null;
    if (fr) { const m = holeMask(s.door); fr.style.webkitMaskImage = m; fr.style.maskImage = m; }
    const D = s.door ? [(s.door[0] + s.door[2]) / 2, clamp(470, s.door[1] + 40, s.door[3] - 60)] : [IW / 2, IH * 0.48];
    return { bg, fr, D, loaded: false };
  });
  function load(i) {
    if (i < 0 || i >= N || L[i].loaded) return;
    L[i].loaded = true;
    [L[i].bg, L[i].fr].forEach((d) => { if (d) d.firstChild.src = src(i); });
  }
  const ready = (i) => { const im = L[i].bg.firstChild; return im.complete && im.naturalWidth > 0; };

  // ---------- geometry ----------
  let W = innerWidth, H = innerHeight, phone = false, k0 = 1, SEG = 1;
  const focusOf = (i) => {
    if (!phone) return [IW / 2, IH / 2];
    const s = S[i], r = s.niche || s.door; return [r ? (r[0] + r[2]) / 2 : IW / 2, IH / 2];
  };
  function base(i, fx, fy, contain) {
    const k = contain ? Math.min(W / IW, H / IH) : Math.max(W / IW, H / IH);
    const w = IW * k, h = IH * k;
    const ox = contain ? (W - w) / 2 : clamp(W / 2 - fx * k, W - w, 0);
    const oy = contain ? (H - h) / 2 : clamp(H / 2 - fy * k, H - h, 0);
    return { k, w, h, ox, oy };
  }
  // zoom needed so that the opening (incl. feathered floor) covers the whole screen
  function zoomFor(i, b) {
    const d = S[i].door; if (!d) return 1;
    const [Dx, Dy] = L[i].D, sl = -b.ox / b.k, sr = (W - b.ox) / b.k, st = -b.oy / b.k, sb = (H - b.oy) / b.k;
    const need = Math.max((Dx - sl) / Math.max(1, Dx - d[0]), (sr - Dx) / Math.max(1, d[2] - Dx), (Dy - st) / Math.max(1, Dy - d[1]), (sb - Dy) / Math.max(1, Math.min(IH, d[3] + 110) - Dy));
    return clamp(need * 1.06, 1.5, 9);
  }
  function put(lay, b, s, Ox, Oy, tx = 0, ty = 0) {
    lay.style.width = b.w + 'px'; lay.style.height = b.h + 'px';
    lay.style.transform = `translate(${(b.ox + Ox * b.k * (1 - s) + tx).toFixed(2)}px,${(b.oy + Oy * b.k * (1 - s) + ty).toFixed(2)}px) scale(${s.toFixed(5)})`;
  }
  let shown = [];
  function show(list) { // list: [lay, z, opacity]
    shown.forEach((l) => { if (!list.some((x) => x[0] === l)) l.style.visibility = 'hidden'; });
    list.forEach(([l, z, o]) => { l.style.visibility = 'visible'; l.style.zIndex = z; l.style.opacity = o; });
    shown = list.map((x) => x[0]);
  }

  // one frame of the walk: stop i fixed, or transition i → i+1 at t (0..1)
  function scene(i, t, contain) {
    const fA = focusOf(i), bA = base(i, fA[0], fA[1], contain);
    load(i); load(i + 1); load(i + 2); load(i - 1);
    if (t <= 0 || i >= N - 1) { put(L[i].bg, bA, 1, 0, 0); show([[L[i].bg, 1, 1]]); return bA; }
    const A = L[i], B = L[i + 1], [Dx, Dy] = A.D;
    // phones: pan toward the opening first, so the zoom centre is on screen
    let b = bA;
    if (phone) { const bD = base(i, Dx, IH / 2, contain), m = smooth(c01(t * 2.2)); b = { ...bA, ox: bA.ox + (bD.ox - bA.ox) * m }; }
    const Z = zoomFor(i, b), e = inOut(t), sA = Math.pow(Z, e);
    put(A.bg, b, sA, Dx, Dy); put(A.fr, b, sA, Dx, Dy);
    const okB = ready(i + 1);
    const oB = okB ? smooth(c01((t - 0.04) / 0.3)) : 0;
    const fB = focusOf(i + 1), bB = base(i + 1, fB[0], fB[1], contain);
    const eB = outCubic(t), sB = 1 + 0.18 * (1 - eB);
    const F = [IW / 2, IH * 0.48];
    const lat = ((b.ox + Dx * b.k) - (bB.ox + F[0] * bB.k)) * 0.1 * (1 - eB); // small lateral drift toward the opening
    put(B.bg, bB, sB, F[0], F[1], lat, 0);
    const oFr = 1 - smooth(c01((t - 0.8) / 0.2));
    const list = [[B.bg, 2, oB.toFixed(3)], [A.fr, 3, oFr.toFixed(3)]];
    if (oB < 1) list.unshift([A.bg, 1, 1]);
    show(list);
    return bA;
  }

  // ---------- text layer ----------
  function placeText() {
    stops.forEach((el, i) => {
      if (phone) { el.style.cssText = `left:16px;right:16px;top:${H + 14}px;bottom:auto;width:auto;--k:.8`; return; }
      const f = focusOf(i), b = base(i, f[0], f[1], false), z = S[i].zone;
      const left = clamp(b.ox + z[0] * b.k, 20, W - 200), width = Math.min(W - left - 20, (z[2] - z[0]) * b.k);
      let kk = clamp(b.k, 0.62, 1.15);
      el.style.cssText = `left:${left}px;width:${width}px;top:0;--k:${kk.toFixed(3)}`;
      // shrink type until the longest Kazakh word fits its wall (never spills onto the portal)
      const hd = el.querySelector('h1,h2');
      for (let n = 0; n < 12 && hd && hd.scrollWidth > hd.clientWidth + 1; n++) { kk *= 0.94; el.style.setProperty('--k', kk.toFixed(3)); }
      const zt = b.oy + z[1] * b.k, zh = (z[3] - z[1]) * b.k, h = el.offsetHeight;
      el.style.top = Math.max(76, zt + Math.max(0, (zh - h) / 2)) + 'px';
    });
  }

  // ---------- check / compare modes ----------
  if (mode === 'check' || mode === 'compare') {
    const q = new URLSearchParams(location.search), tools = document.getElementById('tools');
    let cur = clamp((parseInt(q.get(mode), 10) || 1) - 1, 0, N - 1), tt = 0, cx = 0.5;
    tools.hidden = false;
    tools.innerHTML = `<select aria-label="Кадр">${S.map((s, i) => `<option value="${i}">${s.id}</option>`).join('')}</select>` +
      (mode === 'check' ? `<label>өту <input type="range" min="0" max="1" step="0.01" value="0"></label><span class="tv">0.00</span>` : `<label>Оригинал / Сцена <input type="range" min="0" max="1" step="0.005" value="0.5"></label>`);
    const sel = tools.querySelector('select'), rng = tools.querySelector('input'), tv = tools.querySelector('.tv');
    let orig, split;
    if (mode === 'compare') { orig = document.createElement('img'); orig.className = 'orig'; orig.alt = ''; stage.appendChild(orig); split = document.createElement('div'); split.className = 'split'; stage.appendChild(split); }
    const draw = () => {
      W = innerWidth; H = innerHeight; phone = false; sel.value = cur;
      const b = scene(cur, mode === 'check' ? tt : 0, true);
      if (orig) {
        orig.src = `orig/${S[cur].id}.png`;
        Object.assign(orig.style, { left: b.ox + 'px', top: b.oy + 'px', width: b.w + 'px', height: b.h + 'px', clipPath: `inset(0 ${((1 - cx) * 100).toFixed(2)}% 0 0)` });
        split.style.left = (b.ox + b.w * cx - 1) + 'px';
      }
      if (tv) tv.textContent = tt.toFixed(2);
    };
    sel.addEventListener('change', () => { cur = +sel.value; tt = 0; rng.value = mode === 'check' ? 0 : rng.value; draw(); });
    rng.addEventListener('input', () => { if (mode === 'check') tt = +rng.value; else cx = +rng.value; draw(); });
    addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { cur = Math.min(N - 1, cur + 1); tt = 0; draw(); } if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); tt = 0; draw(); } });
    addEventListener('resize', draw);
    const im = L[cur].bg.firstChild; load(cur); im.addEventListener('load', draw); draw();
    window.__draw = (i, t) => { cur = i; tt = t; draw(); };
    return;
  }

  // ---------- walk mode ----------
  const track = document.getElementById('track');
  function layout() {
    W = innerWidth; phone = W < 761; H = phone ? Math.round(innerHeight * 0.5) : innerHeight;
    stage.style.height = phone ? H + 'px' : '';
    SEG = Math.round(innerHeight * 2.2);
    track.style.height = SEG * (N - 1) + innerHeight + 'px';
    placeText();
  }
  layout();
  addEventListener('resize', () => { layout(); render(sy, true); });
  document.fonts && document.fonts.ready.then(placeText);

  const countEl = document.querySelector('.count b'), prev = document.querySelector('.prev'), next = document.querySelector('.next'), hint = document.querySelector('.hint');
  const navLinks = [...document.querySelectorAll('nav a')];
  const sections = [0, 2, 5, 12, 14];
  let current = -1;
  const pos = (y) => { const s = clamp(y / SEG, 0, N - 1), k = Math.min(N - 2, Math.floor(s)); return { k, p: s - k }; };
  const curAt = (y) => { const { k, p } = pos(y); return p < 0.6 ? k : k + 1; };

  function render(y) {
    const { k, p } = pos(y);
    scene(k, c01((p - 0.6) / 0.37), false);
    stops.forEach((el, i) => {
      let o = 0, dy = 0;
      if (i === k) { const t = c01((p - 0.55) / 0.15); o = 1 - t; dy = -12 * t; }
      if (i === k + 1) { const t = c01((p - 0.95) / 0.05); o = Math.max(o, t); dy = 8 * (1 - t); }
      el.style.opacity = o.toFixed(3); el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      el.style.transform = `translateY(${dy.toFixed(1)}px)`;
      el.setAttribute('aria-hidden', o > 0.5 ? 'false' : 'true');
    });
    const c = p < 0.6 ? k : k + 1;
    if (c !== current) {
      current = c; countEl.textContent = S[c].id;
      prev.disabled = c === 0; next.disabled = c === N - 1;
      document.body.classList.toggle('tone-dark', !!S[c].dark);
      let sec = 0; sections.forEach((s, j) => { if (c >= s) sec = j; });
      navLinks.forEach((a, j) => a.classList.toggle('on', j === sec));
    }
    hint.style.opacity = k === 0 && p < 0.3 ? 1 : 0;
  }

  const veil = document.getElementById('veil');
  let sy = scrollY, snap = false;
  function goTo(i) {
    i = clamp(i, 0, N - 1);
    if (Math.abs(i - curAt(scrollY)) <= 1) { scrollTo({ top: i * SEG, behavior: 'smooth' }); return; }
    load(i); veil.classList.add('on'); // far jump: short fade instead of flying through every room
    setTimeout(() => { scrollTo({ top: i * SEG, behavior: 'instant' }); snap = true; render(i * SEG); setTimeout(() => veil.classList.remove('on'), 140); }, 290);
  }
  prev.addEventListener('click', () => goTo(curAt(scrollY) - 1));
  next.addEventListener('click', () => goTo(curAt(scrollY) + 1));
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(+a.dataset.go); }));
  addEventListener('keydown', (e) => { if (e.target.closest('input,select,textarea')) return; if (e.key === 'ArrowRight') goTo(curAt(scrollY) + 1); if (e.key === 'ArrowLeft') goTo(curAt(scrollY) - 1); });

  render(sy);
  (function loop() {
    requestAnimationFrame(loop);
    const y = scrollY;
    if (snap) { sy = y; snap = false; } else { sy += (y - sy) * 0.15; if (Math.abs(y - sy) < 0.5) sy = y; }
    render(sy);
  })();
  window.__render = (y) => { sy = y; render(y); };
})();
