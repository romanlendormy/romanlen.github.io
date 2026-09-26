/* Roman Lendormy — portfolio animations.
   The drawing code is plain Canvas 2D (no 3D library). A tiny shim below replaces the design-tool runtime. */
(function () {
'use strict';

class DCLogic {
  constructor() { this.state = {}; this.props = {}; }
  setState(patch) { Object.assign(this.state, patch); if (this._onState) this._onState(); }
}

class Component extends DCLogic {

  componentDidMount() {
    this.ax = 0.62; this.ay = 0; this.tax = 0.62; this.tay = 0; this.hover = false;
    this.seed = 3; this.initIdx = 0; this.resetBall(); this.initMinis();
    const tick = () => { this.raf = requestAnimationFrame(tick); this.draw(); };
    tick();
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); clearInterval(this._cci); }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  // peaks-type landscape on [-2.3, 2.3]^2; world coords u = x / K. Adam optimizes the true function.
  H(x, y) { return 3 * (1 - x) ** 2 * Math.exp(-x * x - (y + 1) ** 2) - 10 * (x / 5 - x ** 3 - y ** 5) * Math.exp(-x * x - y * y) - Math.exp(-((x + 1) ** 2) - y * y) / 3; }
  f(u, v) { const K = 2.3 / 3.2; return this.H(u * K, v * K) * 0.1; }
  gradH(u, v) { const K = 2.3 / 3.2, x = u * K, y = v * K, e = 1e-5; return [K * (this.H(x + e, y) - this.H(x - e, y)) / (2 * e), K * (this.H(x, y + e) - this.H(x, y - e)) / (2 * e)]; }
  resetBall() {
    const K = 2.3 / 3.2, inits = [[1, -1], [-2.1, 1.3], [0.8, 0.9], [-0.4, -2.1], [-0.8, -0.2], [1.6, -2.1], [0.2, 1], [-2.1, -0.9]].map((q) => [q[0] / K, q[1] / K]);
    const p = inits[this.initIdx % inits.length]; this.initIdx++; this.steps = 0; this.hold = 0;
    this.O = [{ key: 'adam', p: p.slice(), m: [0, 0], s: [0, 0], t: 0, trail: [], col: '#D4F25C' }];
  }
  gauss() { const u = this.rnd() || 1e-9; return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * this.rnd()); }
  grad(x, z) { const e = 1e-3; return [(this.f(x + e, z) - this.f(x - e, z)) / (2 * e), (this.f(x, z + e) - this.f(x, z - e)) / (2 * e)]; }
  proj(x, y, z) {
    const ca = Math.cos(this.ay), sa = Math.sin(this.ay), cb = Math.cos(this.ax), sb = Math.sin(this.ax);
    let X = x * ca - z * sa, Z = x * sa + z * ca;
    let Y = y * cb - Z * sb; Z = y * sb + Z * cb;
    const d = 9 / (9 + Z);
    return [this.cx + X * this.S * d, this.cy - Y * this.S * d, Z];
  }
  draw() {
    this.drawMinis();
    const c = this.cv; if (!c) return;
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    this.frame = (this.frame || 0) + 1; if (!this.hover) this.tay = 0.45 * Math.sin(this.frame * 0.004);
    this.ax += (this.tax - this.ax) * 0.06; this.ay += (this.tay - this.ay) * 0.06;
    this.cx = w < 760 ? w * 0.5 : w * 0.38; this.cy = h * 0.55; this.S = Math.min(h * 0.175, w * 0.105);
    const N = 46, L = 3.2;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= N; i++) {
        let prev = null;
        for (let j = 0; j <= N; j++) {
          const u = -L + 2 * L * (pass ? j : i) / N, v = -L + 2 * L * (pass ? i : j) / N;
          const p = this.proj(u, this.f(u, v) * 1.4, v);
          if (prev) {
            const a = Math.max(0.05, Math.min(0.6, 0.42 - p[2] * 0.1));
            g.strokeStyle = 'rgba(22,24,29,' + a + ')'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(p[0], p[1]); g.stroke();
          }
          prev = p;
        }
      }
    }
    const st = this.state || {};
    if (this._init !== (st.init || 0)) { this._init = st.init || 0; if (this._init) this.resetBall(); }
    if (this.steps < 360) {
      this.steps++;
      for (const o of this.O) {
        const g0 = this.gradH(o.p[0], o.p[1]);
        { o.t++; o.m = o.m.map((m, i) => 0.9 * m + 0.1 * g0[i]); o.s = o.s.map((v, i) => 0.999 * v + 0.001 * g0[i] * g0[i]);
          o.p = o.p.map((q, i) => q - (0.03 / (2.3 / 3.2)) * (o.m[i] / (1 - Math.pow(0.9, o.t))) / (Math.sqrt(o.s[i] / (1 - Math.pow(0.999, o.t))) + 1e-8)); }
        o.p = o.p.map((q) => Math.max(-L, Math.min(L, q)));
        o.trail.push(o.p.slice()); if (o.trail.length > 220) o.trail.shift();
      }
    } else if (++this.hold > 150) this.resetBall();
    if (this.frame % 10 === 0 && this.onStep) this.onStep(this.steps);
    for (const o of this.O) {
      const pts = o.trail.map((t) => this.proj(t[0], this.f(t[0], t[1]) * 1.4 + 0.03, t[1]));
      if (o.key === 'adam') { g.strokeStyle = '#16181D'; g.lineWidth = 5; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
      g.strokeStyle = o.col; g.lineWidth = 3;
      g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
      const b = this.proj(o.p[0], this.f(o.p[0], o.p[1]) * 1.4 + 0.05, o.p[1]);
      g.fillStyle = o.col; g.strokeStyle = '#16181D'; g.lineWidth = 2; g.beginPath(); g.arc(b[0], b[1], 7, 0, 7); g.fill(); g.stroke();
    }
    const s0 = this.O[0].trail[0];
    if (s0) { const p = this.proj(s0[0], this.f(s0[0], s0[1]) * 1.4 + 0.05, s0[1]); g.font = '12px IBM Plex Mono, monospace'; g.fillStyle = '#16181D'; g.fillText('θ₀', p[0] + 10, p[1] - 10); }
  }
  initMinis() {
    this.hv = {}; this.hvT = {}; this.zx = 0;
    const mk = (src) => { const im = new Image(); im.src = src; return im; };
    this.imSketch = mk('assets/img/shoe-sketch.jpg');
    this.imGen = [mk('assets/img/shoe-generated.jpg')];
    this.off = document.createElement('canvas');
    let s = 21; this.mr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const g = () => (this.mr() + this.mr() + this.mr() - 1.5);
    this.cloud = [];
    for (let k = 0; k < 150; k++) { const a = k % 2; this.cloud.push({ x: (a ? 48 : -48) + g() * 70, y: (a ? -10 : 12) + g() * 46, a }); }
    this.tweetPt = { x: 58, y: -16 };
    this.blastReset();
  }
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  prep(cv) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return null;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return [g, w, h];
  }
  hint(g, w, h, on) { if (on || this.touch) return; g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.textAlign = 'right'; g.fillText('hover ▶', w - 12, h - 10); g.textAlign = 'left'; }
  drawMinis() {
    if (!this.hv) return; const now = performance.now();
    if (this.cvCC) this.miniCC(now);
    if (this.cvShoe) this.miniShoe(now);
    if (this.cvBlast) this.miniBlast(now);
    if (this.cvX) this.miniX(now);
    if (this.cvFit) this.miniFit(now);
    if (this.cvCart) this.miniCart(now);
  }
  fitRect(im, x, y, S) { const r = im.naturalWidth / im.naturalHeight; return r > 1 ? [x, y + (S - S / r) / 2, S, S / r] : [x + (S - S * r) / 2, y, S * r, S]; }

  shoePrep(S) {
    const sk = this.imSketch, gens = this.imGen;
    if (!(sk.complete && sk.naturalWidth && gens.every((im) => im.complete && im.naturalWidth))) return null;
    if (this.sp && this.sp.S === S) return this.sp;
    const c = document.createElement('canvas'); c.width = S; c.height = S; const x = c.getContext('2d', { willReadFrequently: true });
    const grab = (im, pad, keep) => {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, S, S); x.drawImage(im, ...this.fitRect(im, pad, pad, S - 2 * pad));
      const d = x.getImageData(0, 0, S, S).data, out = [];
      for (let yy = 0; yy < S; yy += 2) for (let xx = 0; xx < S; xx += 2) { const k = (yy * S + xx) * 4, r = d[k], g = d[k + 1], b = d[k + 2]; if (keep(r, g, b)) out.push([xx, yy, 'rgb(' + r + ',' + g + ',' + b + ')']); }
      return out;
    };
    const skp = grab(sk, 14, (r, g, b) => r + g + b < 450);
    const gp = gens.map((im) => grab(im, 8, (r, g, b) => r + g + b < 700));
    const N = 1600; let s0 = 5; const rnd = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
    const gz = () => { const u = rnd() || 1e-9; return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()); };
    const pick = (arr) => arr.length ? arr[Math.floor(rnd() * arr.length)] : [S / 2 + gz() * 20, S / 2 + gz() * 20, '#16181D'];
    const P = [];
    for (let i = 0; i < N; i++) P.push({ s: pick(skp), n: [S / 2 + gz() * S * 0.2, S / 2 + gz() * S * 0.2], g: gp.map((a) => pick(a)) });
    this.sp = { S, P };
    return this.sp;
  }
  ccBuild() {
    const T = { r: { x: 180, y: 40, c: ['a', 'b'], rad: 16 }, a: { x: 100, y: 120, c: ['c', 'd'], rad: 14 }, b: { x: 260, y: 120, c: ['e', 'f'], rad: 14 },
      c: { x: 60, y: 200, k: 'x', rad: 12 }, d: { x: 140, y: 200, c: ['g', 'h'], rad: 12 }, e: { x: 220, y: 200, k: 'x', rad: 12 }, f: { x: 300, y: 200, c: ['i', 'j'], rad: 12 },
      g: { x: 115, y: 280, k: 'x', rad: 10 }, h: { x: 165, y: 280, k: 'inc', rad: 11 }, i: { x: 280, y: 280, k: 'x', rad: 10 }, j: { x: 325, y: 280, k: 'x', rad: 10 } };
    const segs = [], par = {};
    const walk = (id) => { for (const ch of (T[id].c || [])) { par[ch] = id; segs.push({ f: id, t: ch, down: true, d: 380, pause: 240 }); walk(ch); segs.push({ f: ch, t: id, down: false, d: 240, pause: 40 }); } };
    walk('r');
    let acc = 600; for (const s of segs) { s.a = acc; s.e = acc + s.d; acc = s.e + s.pause; }
    this.ccT = T; this.ccSegs = segs; this.ccPar = par; this.ccEnd = acc;
  }
  miniCC(now) {
    const R = this.prep(this.cvCC); if (!R) return; const [g, w, h] = R;
    if (!this.ccT) this.ccBuild();
    const narrow = w < 560, T = this.ccT, sc = narrow ? Math.min(1.18, (w - 24) / 300) : 1.18, ox = narrow ? w / 2 - 192 * sc : w - 330 * sc - 24, oy = narrow ? 96 : 14;
    const P = (id) => [ox + T[id].x * sc, oy + T[id].y * sc];
    const t = this.hv.cc ? now - this.hvT.cc : -1;
    const stack = ['r'], explored = {}, reached = { r: 0 };
    let cur = null, last = { id: 'r', at: 0 }, wentUp = false;
    if (t >= 0) for (const s of this.ccSegs) {
      if (t >= s.e) { if (s.down) { explored[s.t] = 1; reached[s.t] = s.e; stack.push(s.t); last = { id: s.t, at: s.e }; wentUp = false; } else { stack.pop(); wentUp = true; } }
      else { if (t >= s.a) cur = { s, u: (t - s.a) / s.d }; break; }
    }
    const done = t >= this.ccEnd - 40, sm = (u) => u * u * (3 - 2 * u);
    const line = (a, b, col, lw, dash) => { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]); };
    for (const id in this.ccPar) line(P(this.ccPar[id]), P(id), explored[id] ? '#6B6E78' : '#2E3139', 1.5);
    if (done) {
      g.lineDashOffset = -now / 40;
      [['r', 'a'], ['a', 'd'], ['d', 'h']].forEach(([a, b]) => line(P(a), P(b), '#C8F05A', 2.5, [6, 6]));
      g.lineDashOffset = 0;
    } else if (t >= 0) {
      for (let i = 1; i < stack.length; i++) {
        const isLast = i === stack.length - 1;
        if (isLast && cur && !cur.s.down) { const a = P(stack[i - 1]), b = P(stack[i]), u = sm(cur.u); line(a, [b[0] + (a[0] - b[0]) * u, b[1] + (a[1] - b[1]) * u], '#C8F05A', 2.5); }
        else line(P(stack[i - 1]), P(stack[i]), '#C8F05A', 2.5);
      }
      if (cur && cur.s.down) { const a = P(cur.s.f), b = P(cur.s.t), u = sm(cur.u); line(a, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], '#C8F05A', 2.5); }
    }
    for (const id in T) {
      const n = T[id], p = P(id), seen = reached[id] != null && t >= 0, r = n.rad;
      let fill = '#16181D', stroke = '#3A3D47', lw = 1.5;
      if (seen) { stroke = n.k === 'x' ? '#55585F' : '#ECEAE3'; lw = 2; }
      if (seen && n.k === 'inc') { fill = '#C8F05A'; stroke = '#C8F05A'; }
      if (done && (id === 'r' || id === 'a' || id === 'd')) stroke = '#C8F05A';
      const age = seen ? t - reached[id] : 1e9;
      if (age < 450) { const k = age / 450; g.strokeStyle = 'rgba(122,167,255,' + (1 - k) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], r + 4 + k * 10, 0, 7); g.stroke(); }
      const pr = n.k === 'inc' && seen ? r + Math.sin(now / 260) * 1.5 : r;
      g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.arc(p[0], p[1], pr, 0, 7); g.fill(); g.stroke();
      if (seen && n.k === 'x') { g.font = '13px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.textAlign = 'center'; g.fillText('×', p[0], p[1] + 4.5); g.textAlign = 'left'; }
    }
    let head = null;
    if (t >= 0 && !done) { if (cur) { const a = P(cur.s.f), b = P(cur.s.t), u = sm(cur.u); head = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } else head = P(stack[stack.length - 1]); }
    if (head) { g.fillStyle = '#C8F05A'; g.beginPath(); g.arc(head[0], head[1], 4, 0, 7); g.fill(); }
    const bx = 16, by = 24, bw = 150, bh = 58, lastAge = t - last.at;
    const pk = t >= 0 && !done && lastAge >= 0 && lastAge < 450 ? 1 - lastAge / 450 : 0, bs = 1;
    g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(bs, bs); g.translate(-(bx + bw / 2), -(by + bh / 2));
    g.fillStyle = pk ? 'rgba(122,167,255,' + (0.16 * pk) + ')' : '#16181D'; g.strokeStyle = '#7AA7FF'; g.lineWidth = 1.5 + 1.5 * pk;
    g.fillStyle = '#16181D'; this.rr(g, bx, by, bw, bh, 10); g.fill();
    if (pk) { g.fillStyle = 'rgba(122,167,255,' + (0.18 * pk) + ')'; this.rr(g, bx, by, bw, bh, 10); g.fill(); }
    this.rr(g, bx, by, bw, bh, 10); g.stroke();
    g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.fillText('bound at each node', bx + 12, by + 20);
    g.font = '14px IBM Plex Mono, monospace'; g.fillStyle = '#7AA7FF'; g.fillText('λ̂ = GNN(G)', bx + 12, by + 42);
    g.restore();
    const nv = t < 0 ? 0 : Object.keys(reached).length;
    let status = this.touch ? 'plays when in view' : 'hover to run the search';
    if (t >= 0) {
      if (done) status = 'search complete · incumbent is optimal';
      else if ((cur && !cur.s.down) || (!cur && wentUp)) status = 'backtracking…';
      else if (cur && cur.s.down) status = 'branching…';
      else status = last.id === 'r' ? 'root: bound from λ̂ = GNN(G)' : T[last.id].k === 'x' ? 'pruned by the Lagrangian bound' : T[last.id].k === 'inc' ? 'new incumbent found' : 'bound computed · branching';
    }
    g.font = '12px IBM Plex Mono, monospace'; g.fillStyle = '#C8F05A'; g.fillText('→ ' + status, 16, narrow ? h - 34 : h - 14);
    g.fillStyle = '#9A9AA3'; g.textAlign = narrow ? 'left' : 'right'; g.fillText(nv + ' / 11 nodes', narrow ? 16 : w - 16, h - 14); g.textAlign = 'left';
  }
  miniShoe(now) {
    const R = this.prep(this.cvShoe); if (!R) return; const [g, w, h] = R;
    const t = this.hv.shoe ? (now - this.hvT.shoe) / 1000 : -1;
    const S = Math.floor(Math.min(w, h) - 8), x0 = (w - S) / 2, y0 = (h - S) / 2, v = 0;
    g.fillStyle = '#FFFFFF'; this.rr(g, x0, y0, S, S, 14); g.fill();
    const sp = this.shoePrep(S);
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
    let li = 0;
    if (sp) {
      g.save(); this.rr(g, x0, y0, S, S, 14); g.clip();
      if (t < 0.7) { g.drawImage(this.imSketch, ...this.fitRect(this.imSketch, x0 + 14, y0 + 14, S - 28)); li = 0; }
      else if (t < 3.9) {
        let a, b, u, col = false;
        if (t < 1.8) { u = ease((t - 0.7) / 1.1); a = 's'; b = 'n'; li = 1; }
        else if (t < 2.4) { u = 0; a = 'n'; b = 'n'; li = 2; }
        else { u = ease((t - 2.4) / 1.5); a = 'n'; b = 'g'; col = true; li = 3; }
        const jit = li === 2 ? 1.6 : 0;
        for (const p of sp.P) {
          const A = a === 's' ? p.s : a === 'n' ? p.n : p.g[v], B = b === 's' ? p.s : b === 'n' ? p.n : p.g[v];
          const px = A[0] + (B[0] - A[0]) * u + (Math.random() - 0.5) * jit, py = A[1] + (B[1] - A[1]) * u + (Math.random() - 0.5) * jit;
          g.fillStyle = col && u > 0.35 ? p.g[v][2] : '#16181D';
          g.globalAlpha = col && u > 0.35 ? 0.9 : 0.75; g.fillRect(x0 + px - 1.2, y0 + py - 1.2, 2.4, 2.4);
        }
        g.globalAlpha = 1;
      } else {
        const u = Math.min(1, (t - 3.9) / 0.6), gen = this.imGen[v];
        if (u < 1) for (const p of sp.P) { g.fillStyle = p.g[v][2]; g.globalAlpha = 0.9 * (1 - u); g.fillRect(x0 + p.g[v][0] - 1.2, y0 + p.g[v][1] - 1.2, 2.4, 2.4); }
        g.globalAlpha = u; g.drawImage(gen, ...this.fitRect(gen, x0 + 8, y0 + 8, S - 16)); g.globalAlpha = 1; li = 4;
      }
      g.restore();
    }
    this.hint(g, w, h, t >= 0);
  }

  blastReset() {
    this.bcols = ['#5B6BFF', '#C8F05A', '#7AA7FF', '#F2F0EA'];
    this.shapes = [[[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 1], [0, 2], [1, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1]]];
    const keep = this.bs ? this.bs.lines : 0;
    this.bs = { board: new Array(64).fill(null), q: [], phase: 'idle', t0: 0, lines: keep, mv: null, flash: [], pending: 0 };
    const pre = ['........', '........', '........', '...##...', '#..##..#', '##.###.#', '##.####.', '###.####'].join('');
    pre.split('').forEach((ch, i) => { if (ch === '#') this.bs.board[i] = this.bcols[Math.floor(this.mr() * 4)]; });
    for (let i = 0; i < 4; i++) this.bs.q.push(this.newPiece());
  }
  newPiece() { return { sh: this.shapes[Math.floor(this.mr() * this.shapes.length)], c: this.bcols[Math.floor(this.mr() * 4)] }; }
  fullLines(b) {
    const cells = new Set(); let n = 0;
    for (let i = 0; i < 8; i++) { let rf = true, cf = true;
      for (let j = 0; j < 8; j++) { if (!b[i * 8 + j]) rf = false; if (!b[j * 8 + i]) cf = false; }
      if (rf) { n++; for (let j = 0; j < 8; j++) cells.add(i * 8 + j); }
      if (cf) { n++; for (let j = 0; j < 8; j++) cells.add(j * 8 + i); } }
    return { n, cells: [...cells] };
  }
  bestPlace(b, sh) {
    let best = null;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (!sh.every(([dr, dc]) => r + dr < 8 && c + dc < 8 && !b[(r + dr) * 8 + c + dc])) continue;
      const nb = b.slice(); sh.forEach(([dr, dc]) => { nb[(r + dr) * 8 + c + dc] = 1; });
      let adj = 0;
      sh.forEach(([dr, dc]) => { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, d]) => { const y = r + dr + a, x = c + dc + d; if (y < 0 || y > 7 || x < 0 || x > 7 || nb[y * 8 + x]) adj++; }); });
      const sc = this.fullLines(nb).n * 20 + adj + r * 0.1;
      if (!best || sc > best.sc) best = { r, c, sc };
    }
    return best;
  }
  miniBlast(now) {
    const R = this.prep(this.cvBlast); if (!R) return; const [g, w, h] = R; let bs = this.bs;
    const cs = 16, gp = 2, ox = 16, oy = (h - (8 * cs + 7 * gp)) / 2, tx = ox + 8 * (cs + gp) + 26;
    const cell = (r, c) => [ox + c * (cs + gp), oy + r * (cs + gp)];
    if (this.hv.blast) {
      const dt = now - bs.t0;
      if (bs.phase === 'idle' && dt > 260) {
        const p = bs.q[0], pl = this.bestPlace(bs.board, p.sh);
        if (!pl) { this.blastReset(); this.bs.t0 = now; bs = this.bs; }
        else { bs.mv = { p, pl, from: [tx, oy] }; bs.q.shift(); bs.q.push(this.newPiece()); bs.phase = 'move'; bs.t0 = now; }
      } else if (bs.phase === 'move' && dt > 440) {
        const { p, pl } = bs.mv; p.sh.forEach(([dr, dc]) => { bs.board[(pl.r + dr) * 8 + pl.c + dc] = p.c; }); bs.mv = null;
        const fl = this.fullLines(bs.board); bs.flash = fl.cells; bs.pending = fl.n;
        bs.phase = fl.n ? 'flash' : 'idle'; bs.t0 = now;
      } else if (bs.phase === 'flash' && dt > 380) {
        bs.flash.forEach((i) => { bs.board[i] = null; }); bs.lines += bs.pending; bs.flash = []; bs.pending = 0; bs.phase = 'idle'; bs.t0 = now;
      }
    }
    const blink = Math.floor(now / 90) % 2;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const i = r * 8 + c, v = bs.board[i], [x, y] = cell(r, c), fl = bs.flash.indexOf(i) >= 0;
      g.fillStyle = fl ? (blink ? '#FFFFFF' : v) : (v || '#2A2D36'); this.rr(g, x, y, cs, cs, 3); g.fill();
    }
    if (bs.mv) {
      const u0 = Math.min(1, (now - bs.t0) / 440), u = u0 < 0.5 ? 2 * u0 * u0 : 1 - Math.pow(-2 * u0 + 2, 2) / 2;
      const [txp, typ] = cell(bs.mv.pl.r, bs.mv.pl.c), fx = bs.mv.from[0], fy = bs.mv.from[1];
      const k = 0.6 + 0.4 * u, bx = fx + (txp - fx) * u, by = fy + (typ - fy) * u - Math.sin(Math.PI * u) * 18;
      g.strokeStyle = bs.mv.p.c; g.setLineDash([3, 3]); g.lineWidth = 1;
      bs.mv.p.sh.forEach(([dr, dc]) => { const [x, y] = cell(bs.mv.pl.r + dr, bs.mv.pl.c + dc); this.rr(g, x + 0.5, y + 0.5, cs - 1, cs - 1, 3); g.stroke(); });
      g.setLineDash([]); g.fillStyle = bs.mv.p.c;
      bs.mv.p.sh.forEach(([dr, dc]) => { this.rr(g, bx + dc * (cs + gp) * k, by + dr * (cs + gp) * k, cs * k, cs * k, 3); g.fill(); });
    }
    g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.fillText('next', tx, oy - 2 + 10);
    bs.q.slice(0, 3).forEach((p, qi) => {
      const px = tx, py = oy + 20 + qi * 42, m = 9;
      g.fillStyle = p.c; g.globalAlpha = qi === 0 ? 1 : 0.55;
      p.sh.forEach(([dr, dc]) => { this.rr(g, px + dc * (m + 1.5), py + dr * (m + 1.5), m, m, 2); g.fill(); });
      g.globalAlpha = 1;
    });
    g.fillStyle = '#C8F05A'; if (w - tx >= 130) g.fillText('lines ' + bs.lines, tx + 70, oy + 10); else g.fillText('lines ' + bs.lines, tx, h - 10);
    this.hint(g, w, h, this.hv.blast);
  }

  miniX(now) {
    const R = this.prep(this.cvX); if (!R) return; const [g, w, h] = R;
    this.zx += ((this.hv.x ? 1 : 0) - this.zx) * 0.04;
    const zx = this.zx, e = zx < 0.5 ? 2 * zx * zx : 1 - Math.pow(-2 * zx + 2, 2) / 2;
    const Z0 = 14, z = Z0 + (1 - Z0) * e, P = this.tweetPt, cam = { x: P.x * (1 - e), y: P.y * (1 - e) };
    const sx = (q) => w / 2 + (q.x - cam.x) * z * 0.95, sy = (q) => h / 2 + (q.y - cam.y) * z * 0.95;
    g.globalAlpha = 0.2 + 0.8 * e;
    for (const q of this.cloud) {
      const x = sx(q), y = sy(q); if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
      g.fillStyle = q.a ? '#C8F05A' : '#7AA7FF'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    const cx = sx(P), cy = sy(P), sc = z / Z0;
    if (sc > 0.1) {
      const cw = 270 * sc, ch = 112 * sc, a = Math.min(1, (sc - 0.1) / 0.3);
      g.globalAlpha = a; g.fillStyle = '#FFFFFF'; this.rr(g, cx - cw / 2, cy - ch / 2, cw, ch, 12 * sc); g.fill();
      if (sc > 0.4) {
        const L = cx - cw / 2 + 14 * sc, T = cy - ch / 2 + 14 * sc;
        g.fillStyle = '#7AA7FF'; g.beginPath(); g.arc(L + 12 * sc, T + 12 * sc, 12 * sc, 0, 7); g.fill();
        g.fillStyle = '#16181D'; g.font = '600 ' + (12.5 * sc) + 'px Manrope, sans-serif'; g.fillText('@user_4821', L + 32 * sc, T + 10 * sc);
        g.fillStyle = '#5B5D66'; g.font = (10.5 * sc) + 'px IBM Plex Mono, monospace'; g.fillText('illustrative tweet', L + 32 * sc, T + 24 * sc);
        g.fillStyle = '#16181D'; g.font = (13 * sc) + 'px Manrope, sans-serif';
        g.fillText('Nouvelle vidéo en ligne ! Merci pour', L, T + 48 * sc); g.fillText('les 10k abonnés, lien en bio.', L, T + 66 * sc);
      }
      g.globalAlpha = 1;
    }
    if (e > 0.55) {
      const a = Math.min(1, (e - 0.55) / 0.3); g.globalAlpha = a;
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.stroke();
      g.fillStyle = '#C8F05A'; g.beginPath(); g.arc(cx, cy, 3.5, 0, 7); g.fill();
      g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#ECEAE3'; const lab = 'this tweet → influencer', lw = g.measureText(lab).width; if (cx + 12 + lw > w - 8) { g.textAlign = 'right'; g.fillText(lab, cx - 12, cy + 16); g.textAlign = 'left'; } else g.fillText(lab, cx + 12, cy - 8);
      g.fillStyle = '#C8F05A'; g.font = '26px IBM Plex Mono, monospace'; g.textAlign = 'right'; g.fillText('84.2%', w - 12, 32); g.textAlign = 'left';
      g.font = '10px IBM Plex Mono, monospace'; g.fillStyle = '#C8F05A'; g.fillText('● influencer', 12, h - 12);
      g.fillStyle = '#7AA7FF'; g.fillText('● observer', 100, h - 12); g.fillStyle = '#9A9AA3'; g.fillText('· schematic', 172, h - 12);
      g.globalAlpha = 1;
    }
    this.hint(g, w, h, this.hv.x);
  }

  prodIcon(g, kind, cx, cy, size) {
    const P = {
      apple: ['M12 7C8 5 4 8 5 13C6 18 9 21 12 19C15 21 18 18 19 13C20 8 16 5 12 7Z', 'M12 7L13 3', '*M13 4C15 2 18 3 18 5C16 6 14 6 13 4Z'],
      carrot: ['M3.5 20.5C5 15 9.5 10 13.5 8C16 6.8 18.5 9 17 11.5C14.5 15.5 9.5 19.5 3.5 20.5Z', 'M15 7.5L15.5 2.5M15.5 7.8L20 4M16.5 9L21.5 8.5', 'M9 14.5L11 16M7 17.5L8.5 18.5'],
      fish: ['M3 12C7 6 15 6 19 12C15 18 7 18 3 12Z', 'M19 12L23 8L23 16Z', '*M9 10.5a1.3 1.3 0 1 0 0.01 0Z'],
      meat: ['M14.2 14.2C12 15.2 8.4 14.4 5.8 11.9C3.2 9.4 2.6 5.9 4.6 4.1C6.6 2.3 10.4 3.1 13 5.7C15.6 8.3 16 11.9 14.2 14.2Z', 'M14.2 14.2L17.6 17.6', 'M19.4 17.1a1.6 1.6 0 1 1 0.01 0ZM17.1 19.4a1.6 1.6 0 1 1 0.01 0Z', 'M6.4 6.4C7.4 5.6 8.9 5.6 10.2 6.3'],
      bread: ['M3 15C3 8 21 8 21 15L21 19L3 19Z', 'M8 10L10 14M12 9.5L14 13.5M16 10L17.5 13'],
      milk: ['M7 8L10 4L15 4L17 8L17 21L7 21Z', 'M7 8L17 8', 'M9.5 12L14.5 12L14.5 17L9.5 17Z'],
      cheese: ['M3 10L17 5L21 10Z', 'M3 10L21 10L21 19L3 19Z', 'M8 14.2a1.5 1.5 0 1 0 0.01 0ZM14 15.8a1.2 1.2 0 1 0 0.01 0ZM17.6 12.8a0.9 0.9 0 1 0 0.01 0Z'],
      egg: ['M12 3C17 3 19 11 19 14C19 18 16 21 12 21C8 21 5 18 5 14C5 11 7 3 12 3Z', 'M9 9C9.5 7.5 10.5 6.5 11.5 6'],
      grapes: ['M9 9a2.3 2.3 0 1 0 0.01 0ZM14 9a2.3 2.3 0 1 0 0.01 0ZM6.5 13a2.3 2.3 0 1 0 0.01 0ZM11.5 13a2.3 2.3 0 1 0 0.01 0ZM16.5 13a2.3 2.3 0 1 0 0.01 0ZM9 17a2.3 2.3 0 1 0 0.01 0ZM14 17a2.3 2.3 0 1 0 0.01 0Z', 'M12 6.5L13 3L16 2'],
      banana: ['M3 14.5C6.5 20.5 15 21 19.6 14.6C21.4 12 21.9 8.6 21.1 5.4L18.6 5.2C18.4 8.9 16.8 11.6 14 13C10.8 14.6 6.8 14.3 4.2 12.6Z', 'M21.1 5.4L21.4 3L19 2.8L18.6 5.2', 'M6.8 16.2C10.4 17.6 14.8 17 17.6 13.6']
    }[kind];
    if (!P || typeof Path2D === 'undefined') return;
    const k = size / 24;
    g.save(); g.translate(cx - 12 * k, cy - 12 * k); g.scale(k, k);
    g.strokeStyle = '#16181D'; g.fillStyle = '#16181D'; g.lineWidth = 1.8; g.lineJoin = 'round'; g.lineCap = 'round';
    P.forEach((d) => { if (d[0] === '*') g.fill(new Path2D(d.slice(1))); else g.stroke(new Path2D(d)); });
    g.restore();
  }
  miniCart(now) {
    const R = this.prep(this.cvCart); if (!R) return; const [g, w, h] = R;
    const t = this.hv.cart ? (now - this.hvT.cart) / 1000 : -1;
    const items = [['apple', '#C8F05A'], ['carrot', '#F2F0EA'], ['fish', '#7AA7FF'], ['meat', '#F2F0EA'], ['bread', '#C8F05A'], ['milk', '#7AA7FF'], ['cheese', '#F2F0EA'], ['egg', '#7AA7FF'], ['grapes', '#C8F05A'], ['banana', '#F2F0EA']];
    const hits = [0, 3, 6], ts = 30, gp = 6, gx = w - 5 * (ts + gp) - 10, gy = h / 2 - ts - gp / 2 + 8;
    const tile = (i) => [gx + (i % 5) * (ts + gp), gy + Math.floor(i / 5) * (ts + gp)];
    const fillT = (i) => 0.25 + i * 0.12, hitT = 1.7, hitAt = (i) => hitT + hits.indexOf(i) * 0.4;
    g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.fillText('top-10 recommendations', gx, gy - 14);
    items.forEach(([lab, col], i) => {
      const [x, y] = tile(i), shown = t >= fillT(i), isHit = hits.indexOf(i) >= 0 && t >= hitAt(i);
      g.fillStyle = '#1D2027'; this.rr(g, x, y, ts, ts, 6); g.fill();
      if (shown) {
        const a = Math.min(1, (t - fillT(i)) / 0.2), k = 0.6 + 0.4 * a;
        g.globalAlpha = a; g.fillStyle = col; this.rr(g, x + ts * (1 - k) / 2, y + ts * (1 - k) / 2, ts * k, ts * k, 6); g.fill();
        this.prodIcon(g, lab, x + ts / 2, y + ts / 2, ts * 0.66 * k);
        g.globalAlpha = 1;
      }
      g.font = '9px IBM Plex Mono, monospace'; g.fillStyle = '#6B6E78'; g.fillText('' + (i + 1), x + 2, y - 2);
      if (isHit) { const p = Math.min(1, (t - hitAt(i)) / 0.25); g.strokeStyle = 'rgba(200,240,90,' + p + ')'; g.lineWidth = 2.5; this.rr(g, x - 3, y - 3, ts + 6, ts + 6, 8); g.stroke(); }
    });
    const cx = 34, cw = Math.max(90, Math.min(160, gx - 70)), ch = 62, cy = h / 2 - 26;
    g.strokeStyle = '#ECEAE3'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 22, cy - 14); g.lineTo(cx - 6, cy - 14); g.lineTo(cx + 6, cy + ch); g.lineTo(cx + cw - 10, cy + ch); g.lineTo(cx + cw, cy + 4); g.lineTo(cx - 2, cy + 4); g.stroke();
    g.lineWidth = 1; g.strokeStyle = '#4A4D57';
    for (let k = 1; k < 4; k++) { const yy = cy + 4 + k * (ch - 4) / 4; g.beginPath(); g.moveTo(cx + 1 + k * 1.2, yy); g.lineTo(cx + cw - 2 - k * 2.4, yy); g.stroke(); }
    for (let k = 1; k < 5; k++) { const xx = cx + k * cw / 5; g.beginPath(); g.moveTo(xx, cy + 4); g.lineTo(xx + 2, cy + ch); g.stroke(); }
    g.strokeStyle = '#ECEAE3'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + 6, cy + ch); g.lineTo(cx + 2, cy + ch + 14); g.lineTo(cx + cw - 6, cy + ch + 14); g.stroke();
    g.fillStyle = '#ECEAE3'; [cx + 16, cx + cw - 20].forEach((x) => { g.beginPath(); g.arc(x, cy + ch + 22, 6, 0, 7); g.fill(); });
    hits.forEach((i, k) => {
      const t0 = hitAt(i) + 0.15; if (t < t0) return;
      const u0 = Math.min(1, (t - t0) / 0.7), u = u0 < 0.5 ? 2 * u0 * u0 : 1 - Math.pow(-2 * u0 + 2, 2) / 2;
      const [sx0, sy0] = tile(i), sx = sx0 + ts / 2, sy = sy0 + ts / 2, ex = cx + cw * 0.25 + k * cw * 0.25, ey = cy + ch - 16 - (k % 2) * 5;
      const x = sx + (ex - sx) * u, y = sy + (ey - sy) * u - Math.sin(Math.PI * u) * 44, sz = 22;
      g.fillStyle = items[i][1]; g.strokeStyle = '#16181D'; g.lineWidth = 1.5; this.rr(g, x - sz / 2, y - sz / 2, sz, sz, 5); g.fill(); g.stroke();
      this.prodIcon(g, items[i][0], x, y, sz * 0.72);
    });
    if (t >= hitT + 1.8) { g.font = '11px IBM Plex Mono, monospace'; g.fillStyle = '#C8F05A'; g.fillText('3 of the top 10 bought', gx, gy + 2 * (ts + gp) + 14); }
    this.hint(g, w, h, t >= 0);
  }
  miniFit(now) {
    const R = this.prep(this.cvFit); if (!R) return; const [g, w, h] = R;
    const per = 1.7, t = this.hv.fit ? (now - this.hvT.fit) / 1000 : 0, active = this.hv.fit && t < 4 * per;
    const reps = this.hv.fit ? Math.min(4, Math.floor(t / per)) : 0;
    const ph = active ? (1 - Math.cos(2 * Math.PI * t / per)) / 2 : 0;
    const floor = h - 26, T = [22, floor], L = 150, hsUp = 64, hsDn = 24, hs = hsUp + (hsDn - hsUp) * ph;
    const sa = hs / L, ca = Math.sqrt(1 - sa * sa), S = [T[0] + L * ca, T[1] - L * sa];
    const Sup = T[0] + L * Math.sqrt(1 - (hsUp / L) ** 2), H = [Sup + 2, floor];
    const dir = [ca, -sa], up = [-sa, -ca];
    const at = (k) => [T[0] + (S[0] - T[0]) * k, T[1] + (S[1] - T[1]) * k];
    const hip = at(0.52), knee = at(0.27), head = [S[0] + dir[0] * 17 + up[0] * 5, S[1] + dir[1] * 17 + up[1] * 5];
    const a = 36, b = 36, dx = H[0] - S[0], dy = H[1] - S[1], d = Math.min(a + b - 0.01, Math.hypot(dx, dy)), th = Math.atan2(dy, dx);
    const phi = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const e1 = [S[0] + a * Math.cos(th + phi), S[1] + a * Math.sin(th + phi)], e2 = [S[0] + a * Math.cos(th - phi), S[1] + a * Math.sin(th - phi)];
    const E = e1[0] < e2[0] ? e1 : e2;
    const v1 = [S[0] - E[0], S[1] - E[1]], v2 = [H[0] - E[0], H[1] - E[1]];
    const elbow = Math.round(Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))) * 180 / Math.PI);
    g.strokeStyle = '#3A3D47'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, floor + 1); g.lineTo(200, floor + 1); g.stroke();
    g.strokeStyle = '#C8F05A'; g.lineWidth = 3.5; g.lineCap = 'round';
    const seg = (p, q) => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
    seg(T, knee); seg(knee, hip); seg(hip, S); seg(S, E); seg(E, H); seg(S, [S[0] + dir[0] * 8, S[1] + dir[1] * 8]);
    g.beginPath(); g.arc(head[0], head[1], 9, 0, 7); g.stroke();
    g.fillStyle = '#FFFFFF'; [T, knee, hip, S, E, H].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 3, 0, 7); g.fill(); });
    const px = 222, scores = ['1.00', '1.00', '1.00', '0.77'];
    g.font = '12px IBM Plex Mono, monospace'; g.fillStyle = '#9A9AA3'; g.fillText('push-up', px, 26);
    g.fillStyle = '#ECEAE3'; g.fillText('elbow ' + elbow + '°', px, 44);
    scores.forEach((sv, i) => { const y = 70 + i * 18; g.fillStyle = '#9A9AA3'; g.fillText('rep ' + (i + 1), px, y);
      g.fillStyle = i < reps ? (i === 3 ? '#7AA7FF' : '#ECEAE3') : '#4A4D57'; g.fillText(i < reps ? sv : '—', px + 70, y); });
    g.strokeStyle = '#3A3D47'; g.beginPath(); g.moveTo(px, 136); g.lineTo(w - 14, 136); g.stroke();
    g.fillStyle = '#9A9AA3'; g.fillText('avg', px, 154); g.fillStyle = reps >= 4 ? '#C8F05A' : '#4A4D57'; g.fillText(reps >= 4 ? '0.94' : '—', px + 70, 154);
    this.hint(g, w, h, this.hv.fit);
  }

  renderVals() {
    if (!this._ref) {
      this._ref = (el) => { this.cv = el; };
      this._move = (ev) => { const r = ev.currentTarget.getBoundingClientRect(); const mx = (ev.clientX - r.left) / r.width, my = (ev.clientY - r.top) / r.height; this.hover = true; this.tay = (mx - 0.5) * 1.4; this.tax = 0.35 + my * 0.55; };
      this._leave = () => { this.hover = false; };
      this._jump = (ev) => { const id = (ev.currentTarget.getAttribute('href') || '').slice(1), el = id && document.getElementById(id); if (!el) return; ev.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      this.onStep = (n) => { const b = Math.min(360, Math.round(n / 10) * 10); if ((this.state || {}).optStep !== b) this.setState({ optStep: b }); };
      const mkref = (k) => (el) => { this[k] = el; };
      this._refs = { cc: mkref('cvCC'), shoe: mkref('cvShoe'), blast: mkref('cvBlast'), x: mkref('cvX'), fit: mkref('cvFit'), cart: mkref('cvCart') };
      this._hvh = {};
      ['cc', 'shoe', 'blast', 'x', 'fit', 'cart'].forEach((k) => {
        this._hvh[k] = {
          on: () => { if (!this.hv) return; this.hv[k] = true; this.hvT[k] = performance.now(); if (k === 'blast') this.bs.t0 = performance.now(); },
          off: () => { if (this.hv) this.hv[k] = false; }
        };
      });
      this._ccOn = () => {
        clearInterval(this._cci); this.setState({ bb: 0 });
        this._cci = setInterval(() => { const s = (this.state || {}).bb || 0; if (s < 12) this.setState({ bb: s + 1 }); else clearInterval(this._cci); }, 420);
      };
      this._ccOff = () => { clearInterval(this._cci); this.setState({ bb: -1 }); };
      this._tree = [
        { id: 'r', x: 180, y: 40, r: 16, p: null, v: 1 },
        { id: 'a', x: 100, y: 120, r: 14, p: 'r', v: 2 },
        { id: 'c', x: 60, y: 200, r: 12, p: 'a', v: 3, k: 'x' },
        { id: 'd', x: 140, y: 200, r: 12, p: 'a', v: 4 },
        { id: 'g', x: 115, y: 280, r: 10, p: 'd', v: 5, k: 'x' },
        { id: 'h', x: 165, y: 280, r: 11, p: 'd', v: 6, k: 'inc' },
        { id: 'b', x: 260, y: 120, r: 14, p: 'r', v: 7 },
        { id: 'e', x: 220, y: 200, r: 12, p: 'b', v: 8, k: 'x' },
        { id: 'f', x: 300, y: 200, r: 12, p: 'b', v: 9 },
        { id: 'i', x: 280, y: 280, r: 10, p: 'f', v: 10, k: 'x' },
        { id: 'j', x: 325, y: 280, r: 10, p: 'f', v: 11, k: 'x' }
      ];
    }
    const st = this.state || {}, v = st.v || 0, step = st.bb == null ? -1 : st.bb;
    const pos = {}; this._tree.forEach((n) => { pos[n.id] = n; });
    const path = { r: 1, a: 1, d: 1, h: 1 }, done = step >= 12, incFound = step >= 6;
    const ccNodes = this._tree.map((n) => {
      const seen = step >= n.v, cur = step === n.v;
      let fill = '#16181D', stroke = '#3A3D47', sw = 1.5, mark = '';
      if (seen) { stroke = '#ECEAE3'; sw = 2; }
      if (seen && n.k === 'x') { stroke = '#55585F'; mark = '×'; }
      if (seen && n.k === 'inc') { fill = '#C8F05A'; stroke = '#C8F05A'; }
      if (done && path[n.id] && n.k !== 'inc') stroke = '#C8F05A';
      if (cur) { stroke = n.k === 'x' ? '#9A9AA3' : '#C8F05A'; sw = 3; }
      return { x: n.x, y: n.y, r: cur ? n.r + 3 : n.r, fill, stroke, sw, mark, mx: n.x - 3.5, my: n.y + 4, cls: n.k === 'inc' && seen ? 'pulse' : '' };
    });
    const ccEdges = this._tree.filter((n) => n.p).map((n) => { const p = pos[n.p], seen = step >= n.v;
      return { x1: p.x, y1: p.y, x2: n.x, y2: n.y, c: done && path[n.id] ? '#C8F05A' : seen ? '#9A9AA3' : '#2E3139', w: done && path[n.id] ? 2.5 : 1.5, cls: done && path[n.id] ? 'dash' : '' }; });
    const cur = this._tree.find((n) => n.v === step);
    const status = step < 0 ? 'hover to run the search' : done ? 'search complete · incumbent is optimal' : step === 0 ? 'starting…' : cur && cur.id === 'r' ? 'root: bound from λ̂ = GNN(G)' : cur && cur.k === 'x' ? 'pruned by the Lagrangian bound' : cur && cur.k === 'inc' ? 'new incumbent found' : 'branching…';
    const H = this._hvh;
    return {
      cvRef: this._ref, onMove: this._move, onLeave: this._leave, smoothJump: this._jump,
      newInit: () => this.setState({ init: (st.init || 0) + 1 }), optStep: st.optStep || 0,
      shoeLabel: 'variation ' + (v % 2 + 1) + '/2', resample: () => { if (this.hv && this.hv.shoe) this.hvT.shoe = performance.now() - 1800; this.setState({ v: v + 1 }); },
      cvCCRef: this._refs.cc, hvCCOn: H.cc.on, hvCCOff: H.cc.off,
      cvShoeRef: this._refs.shoe, cvBlastRef: this._refs.blast, cvXRef: this._refs.x, cvFitRef: this._refs.fit,
      hvShoeOn: H.shoe.on, hvShoeOff: H.shoe.off, hvBlastOn: H.blast.on, hvBlastOff: H.blast.off,
      hvXOn: H.x.on, hvXOff: H.x.off, hvFitOn: H.fit.on, hvFitOff: H.fit.off, cvCartRef: this._refs.cart, hvCartOn: H.cart.on, hvCartOff: H.cart.off,
      ccOn: this._ccOn, ccOff: this._ccOff, ccNodes, ccEdges, ccStatus: status,
      ccCount: (step < 0 ? 0 : Math.min(11, step)) + ' / 11 nodes' + (incFound ? ' · incumbent ★' : '')
    };
  }

}


// ---------- e-mail obfuscation: the address is only assembled in the browser ----------
function decodeMail() {
  document.querySelectorAll('.js-mail').forEach(function (a) {
    var addr = a.dataset.u + '@' + a.dataset.d;
    a.href = 'mailto:' + addr;
    if (a.dataset.show === 'addr') a.textContent = addr + (a.dataset.suffix || '');
  });
  document.querySelectorAll('.js-mail-text').forEach(function (s) { s.textContent = s.dataset.u + '@' + s.dataset.d; });
}

function boot() {
  decodeMail();
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(hover: none)').matches;
  var c = new Component();
  c.touch = touch;
  var rv = function () { return c.renderVals(); };
  var r = rv();
  var byId = function (id) { return document.getElementById(id); };
  r.cvRef(byId('hero-cv')); r.cvCCRef(byId('cc-cv')); r.cvShoeRef(byId('shoe-cv'));
  r.cvBlastRef(byId('blast-cv')); r.cvCartRef(byId('cart-cv')); r.cvXRef(byId('x-cv')); r.cvFitRef(byId('fit-cv'));

  var hero = byId('top');
  hero.addEventListener('mousemove', r.onMove);
  if (reduced) c.hover = true; else hero.addEventListener('mouseleave', r.onLeave);

  var step = byId('opt-step');
  c._onState = function () { step.textContent = c.state.optStep || 0; };
  byId('new-init').addEventListener('click', function () { rv().newInit(); });

  var cards = [['card-cc', 'CC'], ['card-shoe', 'Shoe'], ['card-blast', 'Blast'], ['card-cart', 'Cart'], ['card-x', 'X'], ['card-fit', 'Fit']];
  cards.forEach(function (pair) {
    var el = byId(pair[0]), on = r['hv' + pair[1] + 'On'], off = r['hv' + pair[1] + 'Off'];
    el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off);
    el.addEventListener('focusin', on); el.addEventListener('focusout', off);
  });
  // Touch screens have no hover: play each figure when its card is mostly on screen.
  if (touch && !reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var card = e.target.closest('.card'), pair = card && cards.find(function (p) { return p[0] === card.id; });
        if (!pair) return;
        (e.isIntersecting ? r['hv' + pair[1] + 'On'] : r['hv' + pair[1] + 'Off'])();
      });
    }, { threshold: 0.6 });
    cards.forEach(function (pair) { io.observe(byId(pair[0]).querySelector('canvas')); });
  }
  c.componentDidMount();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
