// «Шығармашылық кеңістігі» — museum walk built from the original design images.
// Each stop shows its original 01–15 picture untouched (plain <img>, no filters/WebGL).
// Transition = limited illusion of walking through a doorway: the current picture zooms
// toward the chosen opening (zoom centre = opening, not screen centre) while the next
// picture is revealed inside that opening through a mask cut from the same image;
// the near jamb stays in front and leaves the frame, the next picture settles exactly.
(function () {
  'use strict';
  const IW = 1672, IH = 941;
  // image-pixel data measured on the originals:
  // door = opening to walk through · zone = quiet wall for text (desktop) · niche = portrait recess
  // mS / mN = phone crop centre (x) without / with a portrait in the niche
  const S = [
    { id: '01', door: [1000, 265, 1425, 746], zone: [70, 120, 680, 700], mS: 1190 },
    { id: '02', door: [745, 195, 1195, 655], zone: [70, 130, 700, 640], mS: 1080 },
    { id: '03', door: [30, 240, 222, 790], zone: [330, 130, 1080, 620], niche: [1130, 180, 1470, 740], fig: { x: 1298, y: 745, h: 400, sx: 0.35, ca: 0.26 }, mS: 1180, mN: 1250 },
    { id: '04', door: [810, 300, 980, 690], zone: [1110, 320, 1600, 760], niche: [84, 190, 388, 740], fig: { x: 236, y: 745, h: 389, sx: 0.4, ca: 0.26 }, mS: 760, mN: 470 },
    { id: '05', door: [1490, 250, 1672, 700], zone: [50, 270, 740, 600], niche: [1170, 310, 1370, 690], fig: { x: 1268, y: 696, h: 274, sx: 0.9, ca: 0.22 }, mS: 1230, mN: 1300 },
    { id: '06', door: [1340, 240, 1570, 700], zone: [420, 140, 1150, 520], niche: [68, 200, 334, 730], fig: { x: 200, y: 736, h: 377, sx: 0.4, ca: 0.26 }, mS: 1180, mN: 380 },
    { id: '07', door: [545, 380, 665, 640], zone: [40, 120, 560, 700], niche: [1300, 170, 1580, 740], fig: { x: 1438, y: 746, h: 400, sx: 0.55, ca: 0.24 }, mS: 900, mN: 1240 },
    { id: '08', door: [1420, 350, 1610, 650], zone: [400, 140, 900, 600], niche: [88, 230, 348, 740], fig: { x: 218, y: 746, h: 362, sx: 0.4, ca: 0.26 }, mS: 1200, mN: 400 },
    { id: '09', door: [0, 200, 200, 700], zone: [225, 150, 590, 440], niche: [1244, 170, 1496, 720], fig: { x: 1370, y: 726, h: 389, sx: 0.4, ca: 0.26 }, mS: 900, mN: 1200 },
    { id: '10', door: [470, 240, 718, 690], zone: [840, 110, 1300, 600], niche: [68, 240, 290, 700], fig: { x: 178, y: 706, h: 327, sx: 0.75, ca: 0.24 }, mS: 620, mN: 440 },
    { id: '11', door: [410, 230, 660, 650], zone: [30, 120, 420, 660], niche: [1300, 220, 1530, 700], fig: { x: 1414, y: 706, h: 342, sx: 0.3, ca: 0.3 }, mS: 1150, mN: 1250 },
    { id: '12', door: [1210, 290, 1530, 740], zone: [560, 320, 1000, 560], niche: [64, 280, 244, 760], fig: { x: 154, y: 766, h: 342, sx: 0.4, ca: 0.26 }, mS: 1200, mN: 380 },
    { id: '13', door: [1370, 230, 1610, 700], zone: [170, 110, 1300, 690], mS: 1240 },
    { id: '14', door: [590, 225, 1110, 690], zone: [40, 130, 560, 640], niche: [1344, 140, 1638, 680], fig: { x: 1490, y: 686, h: 383, sx: -0.35, ca: 0.28 }, mS: 860, mN: 1250 },
    { id: '15', zone: [40, 120, 640, 700], mS: 1030 },
  ];
  const N = S.length;
  const root = document.documentElement;
  const mode = ['check', 'compare', 'flat'].find((m) => root.classList.contains(m)) || 'walk';
  const stops = [...document.querySelectorAll('.stop')];
  const stage = document.getElementById('stage');
  // phones get a lighter picture set (img/m/, 1200 px wide) — much less to download and decode
  const LIGHT = Math.min(innerWidth, innerHeight) < 761 && !/[?&](check|compare)/.test(location.search);
  const src = (i) => (LIGHT ? 'img/m/' : 'img/') + S[i].id + '.jpg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const c01 = (v) => clamp(v, 0, 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);

  // ---------- header: compact logo + menu button on narrow screens ----------
  const menuBtn = document.querySelector('.menu-btn'), nav = document.getElementById('mainnav');
  const closeMenu = () => { root.classList.remove('menu-open'); menuBtn && menuBtn.setAttribute('aria-expanded', 'false'); };
  if (menuBtn) {
    menuBtn.addEventListener('click', () => { const o = root.classList.toggle('menu-open'); menuBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }
  const setCompact = () => root.classList.toggle('compact', innerWidth < 1024);
  setCompact();

  // ---------- flat mode: original images + text, normal page ----------
  if (mode === 'flat') {
    stops.forEach((el, i) => { const im = new Image(); im.src = src(i); im.alt = ''; im.loading = i ? 'lazy' : 'eager'; im.width = IW; im.height = IH; el.prepend(im); });
    addEventListener('resize', setCompact);
    return;
  }

  // ---------- portraits: separate transparent PNGs standing in the niches ----------
  // Fill ONLY with confirmed matches (stop id → file in people/). Never guessed from faces.
  // confirmed by the user (file names in Desktop\Балжан апай\учителя, 2026-11-17)
  const PEOPLE = { '06': 'makhambetzhanova', '07': 'kuatova', '08': 'kabakova', '09': 'dorzhan', '10': 'izenbaeva', '11': 'myrzagalieva', '03': 'kisikova', '12': 'nysanova' };
  // second figure sharing a niche: file + x shift (image px)
  const EXTRA = { '10': [{ f: 'sansyzbaikyzy', dx: 62 }] };
  const FIRST_DX = { '10': -58 };
  function addPerson(lay, fg, file) {
    const px = (v) => (v / IW * 100) + '%', py = (v) => (v / IH * 100) + '%';
    // the figure box is a square of side h (lay-%): everything inside scales with the picture
    const g = document.createElement('div'); g.className = 'fig';
    Object.assign(g.style, { left: px(fg.x - fg.h / 2), top: py(fg.y - fg.h), width: px(fg.h), height: py(fg.h) });
    // cast shadow: starts at the shoes, lies on the floor plane, fades with distance; direction per scene light
    const cast = document.createElement('div'); cast.className = 'cast';
    const dir = fg.sx < 0 ? -1 : 1;
    Object.assign(cast.style, { left: '50%', top: '100%', width: (75 * Math.abs(fg.sx)) + '%', height: '11%', transform: 'translate(' + (dir < 0 ? '-100%' : '0') + ',-50%) skewX(' + (dir * -32) + 'deg)' });
    cast.style.setProperty('--castA', fg.ca);
    // contact shadow: small, dense, soft-edged, right under the shoes
    const ct = document.createElement('div'); ct.className = 'contact';
    Object.assign(ct.style, { left: '50%', top: '99.2%', width: '30%', height: '4.2%' });
    // ambient occlusion: wider, soft darkening of the niche floor around the shoes
    const ao = document.createElement('div'); ao.className = 'ao';
    Object.assign(ao.style, { left: '50%', top: '99.6%', width: '52%', height: '8.5%' });
    const im = document.createElement('img'); im.alt = ''; im.src = 'people/' + file + '.png?v=2';
    g.append(cast, ao, ct, im); lay.appendChild(g);
  }

  // ---------- layers ----------
  function holeMask(d) {
    const [x0, y0, x1, y1] = d, w = x1 - x0, fy = Math.min(IH, y1 + 130);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IW} ${IH}" preserveAspectRatio="none"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${IW}" height="${IH}"><rect width="${IW}" height="${IH}" fill="#fff"/><rect x="${x0}" y="${y0}" width="${w}" height="${y1 - y0}" fill="#000"/><path d="M${x0 + 6} ${y1 - 4}H${x1 - 6}L${x1 + w * 0.22} ${fy}H${x0 - w * 0.22}Z" fill="#000" filter="url(#b)"/></mask></defs><rect width="${IW}" height="${IH}" mask="url(#m)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  // pictures live in a clip box = the picture area; on phones the zoomed frame must never spill into the text area
  const clipBox = document.createElement('div'); clipBox.id = 'clipbox'; stage.appendChild(clipBox);
  const L = S.map((s) => {
    const mk = (cls) => { const d = document.createElement('div'); d.className = 'lay ' + cls; const im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; d.appendChild(im); clipBox.appendChild(d); return d; };
    const bg = mk('bg'), fr = s.door ? mk('fr') : null;
    if (fr) { const m = holeMask(s.door); fr.style.webkitMaskImage = m; fr.style.maskImage = m; }
    const who = PEOPLE[s.id];
    if (who && s.fig) [bg, fr].forEach((lay) => {
      if (!lay) return;
      addPerson(lay, Object.assign({}, s.fig, { x: s.fig.x + (FIRST_DX[s.id] || 0) }), who);
      (EXTRA[s.id] || []).forEach((e) => addPerson(lay, Object.assign({}, s.fig, { x: s.fig.x + e.dx }), e.f));
    });
    const D = s.door ? [(s.door[0] + s.door[2]) / 2, clamp(470, s.door[1] + 40, s.door[3] - 60)] : [IW / 2, IH * 0.48];
    return { bg, fr, D, loaded: false };
  });
  const fade = document.createElement('div'); fade.className = 'fade'; stage.appendChild(fade);
  function load(i) {
    if (i < 0 || i >= N || L[i].loaded) return;
    L[i].loaded = true;
    L[i].bg.firstChild.addEventListener('load', () => { if (mode === 'walk') { toneStop(i); measureOver(); } }, { once: true });
    [L[i].bg, L[i].fr].forEach((d) => { if (d) d.firstChild.src = src(i); });
  }
  const ready = (i) => { const im = L[i].bg.firstChild; return im.complete && im.naturalWidth > 0; };

  // ---------- geometry ----------
  // W×H = picture area (desktop: whole viewport; phone: top part, text continues below)
  let W = innerWidth, H = innerHeight, VH = innerHeight, phone = false, phoneH = false, SEG = 1;
  const focusOf = (i) => {
    if (!phone) return [IW / 2, IH / 2];
    const s = S[i]; return [(PEOPLE[s.id] && s.mN) || s.mS || IW / 2, IH / 2];
  };
  function base(i, fx, fy, contain) {
    const k = contain ? Math.min(W / IW, H / IH) : Math.max(W / IW, H / IH);
    const w = IW * k, h = IH * k;
    const ox = contain ? (W - w) / 2 : clamp(W / 2 - fx * k, W - w, 0);
    const oy = contain ? (H - h) / 2 : clamp(H / 2 - fy * k, H - h, 0);
    return { k, w, h, ox, oy };
  }
  // zoom needed so that the opening (incl. feathered floor) covers the whole picture area
  function zoomFor(i, b) {
    const d = S[i].door; if (!d) return 1;
    const [Dx, Dy] = L[i].D, sl = -b.ox / b.k, sr = (W - b.ox) / b.k, st = -b.oy / b.k, sb = (H - b.oy) / b.k;
    const need = Math.max((Dx - sl) / Math.max(1, Dx - d[0]), (sr - Dx) / Math.max(1, d[2] - Dx), (Dy - st) / Math.max(1, Dy - d[1]), (sb - Dy) / Math.max(1, Math.min(IH, d[3] + 110) - Dy));
    return clamp(need * 1.06, 1.5, phone ? 5 : 9);
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
    // phone: first pan toward the opening (same direction as desktop), so the zoom centre is in view
    let b = bA;
    if (phone) { const bD = base(i, Dx, IH / 2, contain), m = smooth(c01(t * 2.2)); b = { ...bA, ox: bA.ox + (bD.ox - bA.ox) * m }; }
    const Z = zoomFor(i, b), e = inOut(t), sA = Math.pow(Z, e);
    put(A.bg, b, sA, Dx, Dy); put(A.fr, b, sA, Dx, Dy);
    const okB = ready(i + 1);
    const oB = okB ? smooth(c01((t - 0.04) / 0.3)) : 0;
    const fB = focusOf(i + 1), bB = base(i + 1, fB[0], fB[1], contain);
    const eB = outCubic(t), sB = 1 + (phone ? 0.08 : 0.18) * (1 - eB);
    const F = [phone ? fB[0] : IW / 2, IH * 0.48];
    const lat = ((b.ox + Dx * b.k) - (bB.ox + F[0] * bB.k)) * (phone ? 0.04 : 0.1) * (1 - eB);
    put(B.bg, bB, sB, F[0], F[1], lat, 0);
    const oFr = 1 - smooth(c01((t - 0.8) / 0.2));
    const list = [[B.bg, 2, oB.toFixed(3)], [A.fr, 3, oFr.toFixed(3)]];
    if (oB < 1) list.unshift([A.bg, 1, 1]);
    show(list);
    return bA;
  }

  // ---------- text layer ----------
  const TOP_MIN = 92, BOTTOM_GAP = 72;
  function placeText() {
    stops.forEach((el, i) => {
      if (phone) {
        el.style.cssText = phoneH ? `left:${W + 24}px;width:${innerWidth - W - 48}px;top:76px;--k:1` : `left:22px;right:22px;width:auto;top:${H + 18}px;--k:1`;
        const hd = el.querySelector('h1,h2'); let kk = 1;
        for (let n = 0; n < 4 && hd && hd.scrollWidth > hd.clientWidth + 1; n++) { kk *= 0.97; el.style.setProperty('--k', kk.toFixed(3)); }
        return;
      }
      const f = focusOf(i), b = base(i, f[0], f[1], false), z = S[i].zone;
      const left = clamp(b.ox + z[0] * b.k, 24, W - 240);
      const width = Math.max(S[i].minW || 220, Math.min((z[2] - z[0]) * b.k, W - left - 40)); // ≥40 px from the right edge
      let kk = clamp(b.k, 0.62, 1.15);
      el.style.cssText = `left:${left}px;width:${width}px;top:0;--k:${kk.toFixed(3)}`;
      // shrink the heading only until the longest Kazakh word fits its wall
      const hds = [...el.querySelectorAll('h1,h2,.who')], wide = () => hds.some((hd) => hd.scrollWidth > hd.clientWidth + 1);
      for (let n = 0; n < 12 && wide(); n++) { kk *= 0.95; el.style.setProperty('--k', kk.toFixed(3)); }
      const zt = b.oy + z[1] * b.k, zh = (z[3] - z[1]) * b.k, h = el.offsetHeight;
      let top = zt + Math.max(0, (zh - h) / 2);
      top = Math.max(TOP_MIN, Math.min(top, VH - BOTTOM_GAP - h)); // keep name/role above the controls when it fits
      el.style.top = top + 'px';
    });
    toneAll(); measureOver();
  }
  // text taller than the screen: it scrolls during the reading phase, before the next hall starts
  function measureOver() {
    stops.forEach((el) => { const top = parseFloat(el.style.top) || 0; el._over = Math.max(0, top + el.offsetHeight - (VH - BOTTOM_GAP)); });
  }

  // ---------- per-block text tone (WCAG): sample the original pixels behind each block ----------
  const SW = 418, SH = 235, SM = [], SC = [];
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L_INK = 0.0181, L_LIGHT = 0.947, L_IVORY = 0.874, L_BURG = 0.044;
  const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  function lumMap(i) {
    if (SM[i]) return SM[i];
    const im = L[i].bg.firstChild; if (!(im.complete && im.naturalWidth)) return null;
    const c = document.createElement('canvas'); c.width = SW; c.height = SH;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, SW, SH);
    const d = g.getImageData(0, 0, SW, SH).data, m = new Float32Array(SW * SH);
    for (let p = 0; p < m.length; p++) m[p] = 0.2126 * lin(d[p * 4]) + 0.7152 * lin(d[p * 4 + 1]) + 0.0722 * lin(d[p * 4 + 2]);
    SC[i] = d;
    return (SM[i] = m);
  }
  const blocksOf = (el) => [...el.querySelectorAll(':scope > :not(ol), :scope > ol > li')];
  // luminance samples of a screen rect for picture i placed with base b
  function sampleRect(i, b, r, dy = 0) {
    const m = lumMap(i); if (!m) return null;
    const sc = SW / IW;
    const x0 = clamp(Math.floor((r.left - b.ox) / b.k * sc), 0, SW - 1), x1 = clamp(Math.ceil((r.right - b.ox) / b.k * sc), 0, SW - 1);
    const y0 = clamp(Math.floor((r.top - dy - b.oy) / b.k * sc), 0, SH - 1), y1 = clamp(Math.ceil((r.bottom - dy - b.oy) / b.k * sc), 0, SH - 1);
    const v = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) v.push(m[y * SW + x]);
    v.sort((a, c) => a - c);
    return v;
  }
  // header tone for stop i: ink over a soft ivory gradient, or ivory text over a soft burgundy one
  const headEls = () => [document.querySelector('.brand'), root.classList.contains('compact') ? menuBtn : nav].filter((e) => e && e.offsetWidth);
  function headTone(i, b) {
    const v = []; headEls().forEach((e) => { const s = sampleRect(i, b, e.getBoundingClientRect()); if (s) v.push(...s); });
    if (!v.length) return { t: 'ink', strong: false, c: 0 };
    v.sort((a, c) => a - c);
    // header has no plate: tone by the median of what is behind it (timber beams are striped, so the
    // worst-case contrast there is reported honestly in __audit via c)
    const med = v[Math.floor(v.length * 0.5)];
    const cI = cr(v[Math.floor(v.length * 0.1)], L_INK), cL = cr(v[Math.floor(v.length * 0.9)], L_LIGHT);
    // prefer the colour whose worst case is better; tie-break by the median
    const t = Math.abs(cI - cL) > 0.3 ? (cI > cL ? 'ink' : 'light') : (cr(med, L_INK) >= cr(med, L_LIGHT) ? 'ink' : 'light');
    return { t, strong: false, c: t === 'ink' ? cI : cL };
  }
  function wallColor(i) { // mean colour of the quiet wall → tone of the phone continuation below the picture
    lumMap(i); const d = SC[i]; if (!d) return null;
    const z = S[i].zone, sc = SW / IW; let r = 0, g = 0, bl = 0, n = 0, lm = 0;
    for (let y = Math.floor(z[1] * sc); y < z[3] * sc; y++) for (let x = Math.floor(z[0] * sc); x < z[2] * sc; x++) { const p = (y * SW + x) * 4; r += d[p]; g += d[p + 1]; bl += d[p + 2]; n++; }
    r /= n; g /= n; bl /= n; lm = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
    return { css: `rgb(${r | 0},${g | 0},${bl | 0})`, L: lm };
  }
  function toneStop(i) {
    const el = stops[i], blocks = blocksOf(el);
    const f = focusOf(i), b = base(i, f[0], f[1], false);
    if (!lumMap(i)) return;
    S[i].head = headTone(i, b);
    if (phone) {
      const w = wallColor(i); S[i].wall = w;
      const cI = cr(w.L, L_INK), cL = cr(w.L, L_LIGHT), t = cI >= cL ? 'ink' : 'light';
      blocks.forEach((bk) => { bk.dataset.tone = t; bk.dataset.cr = Math.max(cI, cL).toFixed(1); });
      return;
    }
    const sr = el.getBoundingClientRect(), top0 = parseFloat(el.style.top) || sr.top, dy = sr.top - top0;
    blocks.forEach((bk) => { bk.dataset.tone = ''; });
    blocks.forEach((bk) => {
      const v = sampleRect(i, b, bk.getBoundingClientRect(), dy);
      if (!v || !v.length) { bk.dataset.tone = 'ink'; return; }
      const lo = v[Math.floor(v.length * 0.03)], hi = v[Math.floor(v.length * 0.97)], mean = v.reduce((a, c) => a + c, 0) / v.length;
      const need = /^H[12]$/.test(bk.tagName) ? 3 : 4.5;
      // tone by the darker/brighter tenth of the area (sun stripes on ivory must not force ivory text)
      const cInk = cr(v[Math.floor(v.length * 0.1)], L_INK), cLight = cr(v[Math.floor(v.length * 0.9)], L_LIGHT);
      let t, c;
      // no plates: the better of ink / ivory (text zones are chosen on quiet wall areas, see S[].zone)
      if (cInk >= cLight) { t = 'ink'; c = cInk; } else { t = 'light'; c = cLight; }
      bk.dataset.tone = t; bk.dataset.cr = c.toFixed(1); bk.dataset.need = need;
    });
  }
  const toneAll = () => stops.forEach((_, i) => toneStop(i));

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
    sel.addEventListener('change', () => { cur = +sel.value; tt = 0; if (mode === 'check') rng.value = 0; draw(); });
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
    setCompact();
    VH = innerHeight; phoneH = innerWidth >= 761 && VH < 520; phone = innerWidth < 761 || phoneH;
    // phone portrait: picture keeps its full height (ceiling → floor) on top, text continues below.
    // low landscape: picture on the left, text column on the right — both on the wall tone.
    W = phoneH ? Math.round(innerWidth * 0.56) : innerWidth;
    H = phoneH ? VH : phone ? Math.round(Math.min(VH * 0.5, W * 1.2)) : VH;
    root.style.setProperty('--imgH', H + 'px'); root.style.setProperty('--imgW', W + 'px');
    root.classList.toggle('ph-h', phoneH);
    clipBox.style.width = phoneH ? W + 'px' : '100%'; clipBox.style.height = phone && !phoneH ? H + 'px' : '100%';
    SEG = Math.round(VH * 2.2);
    track.style.height = SEG * (N - 1) + VH + 'px';
    placeText();
    // a long section (programme on a low screen) gets a longer reading phase, so it is read before the walk starts
    const maxOver = Math.max(0, ...stops.map((e) => e._over || 0));
    SEG = Math.round(Math.max(VH * 2.2, maxOver / 0.45));
    track.style.height = SEG * (N - 1) + VH + 'px';
    current = -1;
  }

  const countEl = document.querySelector('.count b'), prev = document.querySelector('.prev'), next = document.querySelector('.next'), hint = document.querySelector('.hint');
  const navLinks = [...document.querySelectorAll('#mainnav a')];
  const sections = [0, 2, 5, 12, 14];
  let current = -1;
  // scroll reminder: on the first room, and again whenever the visitor has not moved for a few seconds
  let firstHint = true, lastMove = performance.now();
  const pos = (y) => { const s = clamp(y / SEG, 0, N - 1), k = Math.min(N - 2, Math.floor(s)); return { k, p: s - k }; };
  const curAt = (y) => { const { k, p } = pos(y); return p < 0.6 ? k : k + 1; };
  function setHead(c) {
    const h = S[c].head || { t: 'ink', strong: false };
    document.body.dataset.head = h.t;
    if (h.strong) document.body.dataset.headstrong = ''; else document.body.removeAttribute('data-headstrong');
    if (phone && S[c].wall) { stage.style.background = S[c].wall.css; fade.style.background = `linear-gradient(to ${phoneH ? 'right' : 'bottom'}, rgba(0,0,0,0), ${S[c].wall.css})`; }
    else { stage.style.background = ''; fade.style.background = 'none'; }
    // the stage slides up while a long section is read; whatever it uncovers gets the same wall tone
    document.body.style.background = phone && S[c].wall ? S[c].wall.css : '';
  }

  function render(y) {
    const { k, p } = pos(y), t = c01((p - 0.6) / 0.37);
    const over = stops[k]._over || 0;
    // long sections are read first (scroll inside the hold phase); the walk starts only after that
    const ty = t <= 0 ? -over * c01(p / 0.5) : -over * (1 - inOut(t));
    stage.style.transform = phone && !phoneH && ty ? `translateY(${ty.toFixed(1)}px)` : '';
    scene(k, t, false);
    stops.forEach((el, i) => {
      let o = 0, dy = 0;
      if (i === k) { const tt = c01((p - 0.55) / 0.15); o = 1 - tt; dy = -12 * tt - over * c01(p / 0.5); }
      if (i === k + 1) { const tt = c01((p - 0.95) / 0.05); o = Math.max(o, tt); dy = 8 * (1 - tt); }
      el.style.opacity = o.toFixed(3); el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      el.style.transform = `translateY(${dy.toFixed(1)}px)`;
      el.setAttribute('aria-hidden', o > 0.5 ? 'false' : 'true');
    });
    const c = p < 0.6 ? k : k + 1;
    if (c !== current) {
      current = c; countEl.textContent = S[c].id;
      prev.disabled = c === 0; next.disabled = c === N - 1;
      setHead(c);
      let sec = 0; sections.forEach((s, j) => { if (c >= s) sec = j; });
      navLinks.forEach((a, j) => a.classList.toggle('on', j === sec));
    }
    firstHint = k === 0 && p < 0.3;
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
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); goTo(+a.dataset.go); }));
  addEventListener('keydown', (e) => { if (e.target.closest('input,select,textarea')) return; if (e.key === 'ArrowRight') goTo(curAt(scrollY) + 1); if (e.key === 'ArrowLeft') goTo(curAt(scrollY) - 1); });

  layout();
  addEventListener('resize', () => { layout(); render(sy); });
  document.fonts && document.fonts.ready.then(() => { placeText(); current = -1; render(sy); });
  const q0 = parseInt(new URLSearchParams(location.search).get('stop'), 10);
  if (q0 >= 1 && q0 <= N) { scrollTo(0, (q0 - 1) * SEG); sy = (q0 - 1) * SEG; load(q0 - 1); }

  render(sy);
  let lastSy = sy, lastAt = 0;
  (function loop() {
    requestAnimationFrame(loop);
    const y = scrollY;
    if (snap) { sy = y; snap = false; } else { sy += (y - sy) * 0.15; if (Math.abs(y - sy) < 0.5) sy = y; }
    // idle: nothing moves → don't redraw 60×/s (saves battery and CPU on phones); refresh ~2×/s for safety
    const now = performance.now();
    if (sy !== lastSy) lastMove = now;
    hint.style.opacity = firstHint || (now - lastMove > 6000 && current < N - 1) ? 1 : 0;
    if (sy === lastSy && now - lastAt < 500) return;
    lastSy = sy; lastAt = now;
    render(sy);
  })();
  window.__render = (y) => { sy = y; render(y); };
  // audit (dev): tone + contrast of every block, header tone, and layout rules for all stops
  window.__audit = async () => {
    for (let i = 0; i < N; i++) load(i);
    if (document.fonts) await document.fonts.ready;
    await Promise.all(L.map((l) => { const im = l.bg.firstChild; return im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 15000); }); }));
    placeText();
    const sw = document.documentElement.scrollWidth;
    const rows = stops.map((el, i) => {
      const bl = blocksOf(el), crs = bl.map((b) => +b.dataset.cr || 0), top = parseFloat(el.style.top);
      const r = el.getBoundingClientRect(), right = phone ? W - 22 : r.left + el.offsetWidth;
      const bad = [];
      if (Math.min(...crs) < 3) bad.push('contrast');
      if ((!phone || phoneH) && innerWidth - (r.left + el.offsetWidth) < 22) bad.push('right');
      if (top + el.offsetHeight - el._over > VH - BOTTOM_GAP + 1) bad.push('bottom');
      if (el._over > SEG * 0.5) bad.push('over>hold');
      const ov = bl.some((b) => b.scrollWidth > b.clientWidth + 1); if (ov) bad.push('hOverflow');
      return `${S[i].id}: min ${Math.min(...crs).toFixed(1)} head ${S[i].head.t}${S[i].head.strong ? '+' : ''} ${S[i].head.c.toFixed(1)} over ${Math.round(el._over)}${bad.length ? ' ✗ ' + bad.join(',') : ' ✓'}`;
    });
    return `W${W} VH${VH} imgH${H} scrollW${sw}\n` + rows.join('\n');
  };
})();
