// Laplace interactive product preview. Recorded data: NREL PVDAQ 9069 (via surya-devta), one day.
(async () => {
  const G = await (await fetch('assets/gv.json')).json();
  const $ = id => document.getElementById(id);
  const app = $('lx');
  const N = G.inv.length, T = G.T, NT = T.length / 5, PEAK = 0.72, CAP = 32, H0 = 5.5, H1 = 19.25;
  const byInv = [...Array(N)].map(() => []); for (let k = 0; k < NT; k++) byInv[T[k * 5 + 4]].push(k);
  const S = { h: 10.25, playing: true, speed: 1, tab: 'overview', faults: {}, wos: [], woNext: 1047, sel: -1, hover: -1, faultMode: false, price: 50, scrub: false };
  const lerp = (a, i) => { const j = Math.floor(i), f = i - j; return (a[j] || 0) * (1 - f) + (a[j + 1] || 0) * f; };
  const fmt = (x, d = 1) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = x => '$' + Math.round(x).toLocaleString('en-US');
  const clock = h => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  // effective (with simulated faults) inverter output at 15-min index j
  const actAt = (i, j) => (S.faults[i] !== undefined && j / 4 >= S.faults[i]) ? 0 : (G.act[i][Math.floor(j)] || 0) * (1 - (j % 1)) + (G.act[i][Math.floor(j) + 1] || 0) * (j % 1);
  const modAt = (i, j) => lerp(G.mod[i], j);
  const plant5 = idx => { let a = G.t5.act[idx]; for (const i in S.faults) if (idx / 12 >= S.faults[i]) a -= lerp(G.act[i], idx / 3); return Math.max(0, a); };
  function invDay(i, upto = S.h) { let a = 0, m = 0; for (let j = 0; j <= upto * 4; j++) { a += actAt(i, j) / 4; m += G.mod[i][j] / 4; } return { a, m, lost: Math.max(0, m - a) }; }
  function lostAll(upto = S.h) { let l = 0; for (let i = 0; i < N; i++) for (let j = 0; j <= upto * 4; j++) l += Math.max(0, G.mod[i][j] - actAt(i, j)) / 4; return l; }
  function findings() {
    const out = [];
    for (let i = 0; i < N; i++) {
      const d = invDay(i), m = modAt(i, S.h * 4), a = actAt(i, S.h * 4), r = m > 0.05 ? a / m : null;
      const live = r !== null && r < 0.88;
      if (d.lost > 0.3 || live || S.faults[i] !== undefined) out.push({ i, r, live, lost: d.lost, sim: S.faults[i] !== undefined });
    }
    return out.sort((x, y) => y.lost - x.lost);
  }
  // ---------- canvases
  let DPR = 1;
  function fit(c) { const r = c.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1); c.width = Math.max(1, r.width * DPR); c.height = Math.max(1, r.height * DPR); const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [x, r.width, r.height]; }
  // map projection
  const map = $('lxMap'); let M = [1, 0, 0, 1, 0, 0], Mi = M, MW = 0, MH = 0;
  function project() {
    const r = map.getBoundingClientRect(); MW = r.width; MH = r.height;
    const th = -0.62, k = 0.56, c = Math.cos(th), s = Math.sin(th), A = [c, s * k, -s, c * k];
    const pts = G.boundary.map(([x, y]) => [A[0] * x + A[2] * y, A[1] * x + A[3] * y]), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const sw = Math.max(...xs) - Math.min(...xs), sh = Math.max(...ys) - Math.min(...ys), bx = .06 * MW, bw = .88 * MW, by = .07 * MH, bh = .7 * MH;
    const sc = Math.min(bw / sw, bh / sh), ox = bx + (bw - sc * sw) / 2 - sc * Math.min(...xs), oy = by + (bh - sc * sh) / 2 - sc * Math.min(...ys);
    M = [A[0] * sc, A[1] * sc, A[2] * sc, A[3] * sc, ox, oy]; const det = M[0] * M[3] - M[1] * M[2]; Mi = [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det];
  }
  const P = (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const off = document.createElement('canvas'), oc = off.getContext('2d');
  const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], j) => { const [p, q] = P(x, y); j ? c.lineTo(p, q) : c.moveTo(p, q); }); c.closePath(); };
  const cent = pts => { let x = 0, y = 0; pts.forEach(p => { x += p[0]; y += p[1]; }); return [x / pts.length, y / pts.length]; };
  function drawMap(now) {
    const [ctx, w, h] = fit(map); off.width = map.width; off.height = map.height;
    const j = S.h * 4;
    for (let i = 0; i < N; i++) {
      const I = Math.max(0, Math.min(1, actAt(i, j) / PEAK));
      oc.setTransform(DPR * M[0], DPR * M[1], DPR * M[2], DPR * M[3], DPR * M[4], DPR * M[5]);
      oc.fillStyle = `rgba(63,63,63,${0.10 + 0.82 * Math.pow(I, 0.8)})`;
      for (const k of byInv[i]) { const o = k * 5; oc.fillRect(T[o] / 10, T[o + 1] / 10, T[o + 2] / 10, T[o + 3] / 10); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = .3; ctx.drawImage(off, 0, 2 * DPR); ctx.globalAlpha = 1;
    ctx.filter = `blur(${8 * DPR}px)`; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0; ctx.drawImage(off, 0, 0);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(off, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    poly(ctx, G.boundary); ctx.strokeStyle = 'rgba(25,25,25,.28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(25,25,25,.07)'; ctx.lineWidth = .6; for (const k in G.invAreas) { poly(ctx, G.invAreas[k]); ctx.stroke(); }
    const [sx, sy] = P(...G.sub); ctx.fillStyle = '#191919'; ctx.fillRect(sx - 3, sy - 3, 6, 6);
    const t = now / 1000, live = [];
    const F = findings();
    F.forEach(f => {
      const id = G.inv[f.i], pts = G.invAreas[id]; if (!pts) return;
      if (!(f.live || f.sim || S.sel === f.i || S.hover === f.i)) return;
      poly(ctx, pts); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = (f.live || f.sim) ? '#c24b12' : '#191919'; ctx.lineWidth = (S.sel === f.i || S.hover === f.i) ? 1.9 : 1.2; ctx.stroke(); ctx.setLineDash([]);
      poly(ctx, pts); ctx.fillStyle = 'rgba(25,25,25,.06)'; ctx.fill();
      if (f.live || f.sim) { const [cx, cy] = P(...cent(pts)); live.push({ id, r: f.r, cx, cy, sim: f.sim }); }
    });
    [S.sel, S.hover].forEach(i => { if (i < 0 || F.some(f => f.i === i)) return; const pts = G.invAreas[G.inv[i]]; poly(ctx, pts); ctx.strokeStyle = '#191919'; ctx.lineWidth = 1.6; ctx.stroke(); });
    const cl = []; live.forEach(e => { const c = cl.find(c => Math.hypot(c.cx - e.cx, c.cy - e.cy) < 90 && c.sim === e.sim); if (c) { c.m.push(e); c.cx = (c.cx * (c.m.length - 1) + e.cx) / c.m.length; } else cl.push({ cx: e.cx, cy: e.cy, sim: e.sim, m: [e] }); });
    const base = Math.max(...G.boundary.map(p => P(...p)[1])) + 30;
    cl.sort((a, b) => a.cx - b.cx).forEach((c, k) => {
      const offl = c.m.every(e => e.r !== null && e.r < 0.02);
      const lab = `${c.m.length > 1 ? 'Inverters ' + c.m.map(e => e.id).join(', ') : 'Inverter ' + c.m[0].id}  ·  ${c.sim ? 'simulated fault' : offl ? 'offline' : Math.round(Math.min(...c.m.map(e => e.r ?? 1)) * 100) + '% of physics'}`;
      ctx.font = '500 12px Geist, system-ui'; const tw = ctx.measureText(lab).width + 20, ly = Math.min(h - 18, base + k * 30), lx = Math.max(10, Math.min(w - tw - 10, c.cx - tw / 2));
      ctx.strokeStyle = 'rgba(25,25,25,.5)'; ctx.lineWidth = 1;
      c.m.forEach(e => { const ex = Math.max(lx + 10, Math.min(lx + tw - 10, e.cx)); ctx.beginPath(); ctx.moveTo(e.cx, e.cy); ctx.lineTo(e.cx, ly - 19); ctx.lineTo(ex, ly - 19); ctx.lineTo(ex, ly - 12); ctx.stroke(); ctx.beginPath(); ctx.arc(e.cx, e.cy, 2.6, 0, 7); ctx.fillStyle = '#191919'; ctx.fill(); });
      ctx.fillStyle = c.sim ? '#191919' : '#ffffff'; ctx.beginPath(); ctx.roundRect(lx, ly - 12, tw, 24, 12); ctx.fill(); ctx.strokeStyle = '#191919'; ctx.stroke();
      ctx.fillStyle = c.sim ? '#ffffff' : '#191919'; ctx.fillText(lab, lx + 10, ly + 4);
    });
    if (S.faultMode) { ctx.font = '500 12px Geist, system-ui'; ctx.fillStyle = 'rgba(25,25,25,.85)'; ctx.fillText('Click any inverter block to trip it at ' + clock(S.h), 16, 22); }
  }
  // timeline (overview)
  const tl = $('lxTl');
  function drawTl() {
    const [x, w, h] = fit(tl), pl = 8, pr = 44, X = hr => pl + (hr - H0) / (H1 - H0) * (w - pl - pr), Y = v => h - 22 - (v / 34) * (h - 36);
    x.font = '11px Geist, system-ui'; x.fillStyle = 'rgba(25,25,25,.38)'; x.strokeStyle = 'rgba(25,25,25,.07)'; x.lineWidth = 1;
    for (let v = 10; v <= 30; v += 10) { x.beginPath(); x.moveTo(pl, Y(v)); x.lineTo(w - pr, Y(v)); x.stroke(); x.fillText(v + ' MW', w - pr + 8, Y(v) + 4); }
    for (let H = 6; H <= 19; H += 2) x.fillText(String(H).padStart(2, '0') + ':00', X(H) - 14, h - 4);
    const i0 = Math.floor(H0 * 12), i1 = Math.ceil(H1 * 12), ic = S.h * 12, Mo = G.t5.mod;
    x.save(); x.beginPath(); for (let i = i0; i <= i1; i++) { const X_ = X(i / 12); i === i0 ? x.moveTo(X_, Y(Mo[i])) : x.lineTo(X_, Y(Mo[i])); } for (let i = i1; i >= i0; i--) x.lineTo(X(i / 12), Y(Math.min(plant5(i), Mo[i]))); x.closePath(); x.clip();
    x.strokeStyle = 'rgba(25,25,25,.3)'; for (let k = -h; k < w; k += 5) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); } x.restore();
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(25,25,25,.85)'); g.addColorStop(1, 'rgba(25,25,25,.06)');
    x.beginPath(); x.moveTo(X(i0 / 12), Y(0)); for (let i = i0; i <= Math.min(i1, ic); i++) x.lineTo(X(i / 12), Y(plant5(i))); x.lineTo(X(Math.min(i1, ic) / 12), Y(0)); x.closePath(); x.fillStyle = g; x.fill();
    x.setLineDash([4, 3]); x.beginPath(); for (let i = i0; i <= i1; i++) { const X_ = X(i / 12); i === i0 ? x.moveTo(X_, Y(Mo[i])) : x.lineTo(X_, Y(Mo[i])); } x.strokeStyle = '#191919'; x.lineWidth = 1.1; x.stroke(); x.setLineDash([]);
    const px = X(S.h); x.beginPath(); x.moveTo(px, 4); x.lineTo(px, h - 22); x.strokeStyle = '#191919'; x.lineWidth = 1; x.stroke();
    x.beginPath(); x.arc(px, Y(plant5(ic)), 4, 0, 7); x.fillStyle = '#191919'; x.fill();
    x.font = '500 11px Geist, system-ui'; const lab = clock(S.h); const lw = x.measureText(lab).width + 12; x.fillStyle = '#191919'; x.beginPath(); x.roundRect(Math.min(w - pr - lw, Math.max(0, px - lw / 2)), 0, lw, 18, 9); x.fill(); x.fillStyle = '#ffffff'; x.fillText(lab, Math.min(w - pr - lw, Math.max(0, px - lw / 2)) + 6, 13);
  }
  // heatmap (inverters tab)
  const hm = $('lxHm');
  function drawHm() {
    const [x, w, h] = fit(hm), j0 = H0 * 4, j1 = H1 * 4, pl = 54, pt = 6, pb = 24, cw = (w - pl - 6) / (j1 - j0), ch = (h - pt - pb) / N, jc = S.h * 4;
    x.font = '11px Geist, system-ui';
    for (let i = 0; i < N; i++) {
      const y = pt + i * ch; x.fillStyle = (S.hover === i || S.sel === i) ? '#191919' : 'rgba(25,25,25,.4)'; if (i % 2 === 0 || S.hover === i || S.sel === i) x.fillText('INV ' + G.inv[i], 0, y + ch * .75);
      for (let j = j0; j < j1; j++) {
        const X_ = pl + (j - j0) * cw, m = G.mod[i][j]; if (m < 0.03) continue; const r = Math.min(1.05, actAt(i, j) / m);
        if (j > jc) { x.fillStyle = 'rgba(25,25,25,.035)'; x.fillRect(X_, y, cw - 1, ch - 1); continue; }
        if (r < 0.02) { x.strokeStyle = 'rgba(25,25,25,.5)'; x.lineWidth = .7; x.strokeRect(X_ + .4, y + .4, cw - 1.8, ch - 1.8); }
        else { x.fillStyle = `rgba(25,25,25,${Math.max(.06, Math.pow(r, 4) * .92)})`; x.fillRect(X_, y, cw - 1, ch - 1); }
      }
      if (S.hover === i || S.sel === i) { x.strokeStyle = '#191919'; x.lineWidth = 1; x.strokeRect(pl - 2, y - 1, w - pl - 4, ch + 1); }
    }
    x.fillStyle = 'rgba(25,25,25,.38)'; for (let H = 6; H <= 19; H += 1) x.fillText(String(H).padStart(2, '0'), pl + (H * 4 - j0) * cw - 6, h - 6);
    const px = pl + (jc - j0) * cw; x.beginPath(); x.moveTo(px, pt - 4); x.lineTo(px, h - pb + 2); x.strokeStyle = '#191919'; x.stroke();
  }
  // schedule tab
  const sc = $('lxSch');
  function drawSch() {
    const [x, w, h] = fit(sc), j0 = H0 * 4, j1 = H1 * 4, pl = 8, pr = 44, bw = (w - pl - pr) / (j1 - j0), Y = v => h - 24 - (v / 34) * (h - 40), jc = S.h * 4;
    x.font = '11px Geist, system-ui'; x.fillStyle = 'rgba(25,25,25,.38)'; x.strokeStyle = 'rgba(25,25,25,.07)';
    for (let v = 10; v <= 30; v += 10) { x.beginPath(); x.moveTo(pl, Y(v)); x.lineTo(w - pr, Y(v)); x.stroke(); x.fillText(v + ' MW', w - pr + 8, Y(v) + 4); }
    for (let H = 6; H <= 19; H += 2) x.fillText(String(H).padStart(2, '0') + ':00', pl + (H * 4 - j0) * bw - 14, h - 6);
    let out = 0;
    for (let j = j0; j < j1; j++) {
      const D = G.dsm.da[j]; let A = G.dsm.act[j]; for (const i in S.faults) if (j / 4 >= S.faults[i]) A -= G.act[i][j];
      const dev = (A - D) / CAP; const bad = Math.abs(dev) > 0.1; if (j <= jc && bad) out++;
      const X_ = pl + (j - j0) * bw;
      x.strokeStyle = 'rgba(25,25,25,.18)'; x.strokeRect(X_ + 1.5, Y(D * 1.1 + 0) , bw - 3, Math.max(0, Y(D * 0.9) - Y(D * 1.1)));
      if (j <= jc) { x.fillStyle = bad ? '#191919' : 'rgba(25,25,25,.45)'; x.fillRect(X_ + 2, Y(A), bw - 4, h - 24 - Y(A)); }
    }
    x.setLineDash([1, 3]); x.beginPath(); for (let j = j0; j <= j1; j++) { const X_ = pl + (j - j0) * bw + bw / 2; j === j0 ? x.moveTo(X_, Y(G.dsm.da[j])) : x.lineTo(X_, Y(G.dsm.da[j])); } x.strokeStyle = '#191919'; x.lineWidth = 1.2; x.stroke(); x.setLineDash([]);
    $('lxSchOut').textContent = out; $('lxSchBlk').textContent = Math.min(96, Math.floor(jc) + 1);
  }
  // drawer chart
  const dc = $('lxDrC');
  function drawDr() {
    if (S.sel < 0) return; const i = S.sel; const [x, w, h] = fit(dc), j0 = H0 * 4, j1 = H1 * 4, X = j => (j - j0) / (j1 - j0) * w, Y = v => h - 18 - (v / 0.8) * (h - 26), jc = S.h * 4;
    x.font = '10.5px Geist, system-ui'; x.fillStyle = 'rgba(25,25,25,.38)'; for (let H = 6; H <= 18; H += 4) x.fillText(String(H).padStart(2, '0') + ':00', X(H * 4) - 14, h - 3);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(25,25,25,.8)'); g.addColorStop(1, 'rgba(25,25,25,.05)');
    x.beginPath(); x.moveTo(X(j0), Y(0)); for (let j = j0; j <= Math.min(j1, jc); j += .5) x.lineTo(X(j), Y(actAt(i, j))); x.lineTo(X(Math.min(j1, jc)), Y(0)); x.fillStyle = g; x.fill();
    x.setLineDash([4, 3]); x.beginPath(); for (let j = j0; j <= j1; j++) j === j0 ? x.moveTo(X(j), Y(G.mod[i][j])) : x.lineTo(X(j), Y(G.mod[i][j])); x.strokeStyle = '#191919'; x.stroke(); x.setLineDash([]);
  }
  // ---------- DOM updates
  const tabs = [...app.querySelectorAll('[data-tab]')], views = [...app.querySelectorAll('[data-view]')];
  function setTab(t) { S.tab = t; tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === t)); views.forEach(v => v.hidden = v.dataset.view !== t);
    const slot = app.querySelector(`[data-mapslot="${t}"]`); if (slot && map.parentNode !== slot) slot.appendChild(map);
    S.faultMode = t === 'whatif'; const fb = $('lxFault'); if (fb) { fb.classList.toggle('on', S.faultMode); fb.textContent = S.faultMode ? 'Trip mode on' : 'Trip mode off'; }
    if (window.lxLenis) lxLenis.scrollTo(0, { immediate: true }); else app.querySelector('.main').scrollTop = 0;
    requestAnimationFrame(() => { project(); frame(performance.now()); if (t === 'health') drawHealth(); }); }
  tabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  function hud() {
    let now = 0, ex = 0; const j = S.h * 4; for (let i = 0; i < N; i++) { now += actAt(i, j); ex += modAt(i, j); }
    const ic = Math.floor(S.h * 12); let eA = 0, eM = 0; for (let i = 0; i <= ic; i++) { eA += plant5(i) / 12; eM += G.t5.mod[i] / 12; }
    const lost = lostAll();
    $('lxClock').textContent = clock(S.h); $('kN').textContent = fmt(now, 1); $('kNs').textContent = Math.round(now / CAP * 100) + '% of 32 MW capacity';
    $('kE').textContent = fmt(ex, 1); $('kR').textContent = eM > 0 ? fmt(eA / eM * 100, 1) : '0.0'; $('kRs').textContent = fmt(eA, 1) + ' of ' + fmt(eM, 1) + ' MWh expected';
    $('kL').textContent = usd(lost * S.price); $('kLs').textContent = fmt(lost, 1) + ' MWh at $' + S.price + '/MWh';
    const F = findings(); renderAttention(F); renderLosses(); renderAlarms(); renderWhatif(); renderStrings(); $('lxBadge').textContent = F.filter(f => f.live || f.sim).length || '';
    if (S.sel >= 0) renderDrawer();
  }
  function renderAttention(F) {
    const ul = $('lxAtt'); const top = F.slice(0, 6);
    const html = top.map(f => `<li data-i="${f.i}" class="${S.sel === f.i ? 'sel' : ''}"><div><b>Inverter ${G.inv[f.i]}</b><span>${f.sim ? 'Simulated fault' : f.r === null ? 'Night' : f.r < 0.02 ? 'Offline' : f.live ? Math.round(f.r * 100) + '% of physics' : 'Recovered'}</span></div><em>${usd(f.lost * S.price)}</em></li>`).join('') || '<li class="empty">Every inverter is within 12% of physics.</li>';
    if (ul._h !== html) { ul._h = html; ul.innerHTML = html;
    ul.querySelectorAll('li[data-i]').forEach(li => { const i = +li.dataset.i; li.onclick = () => select(i); li.onmouseenter = () => S.hover = i; li.onmouseleave = () => S.hover = -1; }); }
    const off = F.filter(f => f.live && f.r !== null && f.r < 0.02 && !f.sim);
    const act = $('lxAct'); let ah;
    if (off.length > 1) ah = `<p>Send a crew to control room 10. Inverters ${off.map(f => G.inv[f.i]).join(', ')} are offline while physics expects full output.</p><button data-wo="${off.map(f => f.i).join(',')}">Create work order</button>`;
    else if (F[0] && (F[0].live || F[0].sim)) ah = `<p>Inspect inverter ${G.inv[F[0].i]}. It is ${F[0].sim ? 'tripped' : 'running below what physics expects for this sunlight'}.</p><button data-wo="${F[0].i}">Create work order</button>`;
    else ah = `<p>Nothing needs a crew right now. Laplace keeps watching.</p>`;
    if (act._h !== ah) { act._h = ah; act.innerHTML = ah; const b = act.querySelector('button'); if (b) b.onclick = () => createWO(b.dataset.wo.split(',').map(Number)); }
  }
  function renderLosses() {
    if (S.tab !== 'losses') return;
    const rows = []; for (let i = 0; i < N; i++) { const d = invDay(i); rows.push({ i, ...d, r: d.m > 0 ? d.a / d.m : 1 }); }
    rows.sort((a, b) => b.lost - a.lost);
    const tot = rows.reduce((s, r) => s + r.lost, 0), off = rows.filter(r => r.r < 0.6).reduce((s, r) => s + r.lost, 0);
    $('lsTot').textContent = usd(tot * S.price); $('lsMwh').textContent = fmt(tot, 2) + ' MWh';
    $('lsOff').textContent = usd(off * S.price); $('lsRest').textContent = usd((tot - off) * S.price);
    const rh = rows.slice(0, 12).map(r => `<tr data-i="${r.i}"><td>Inverter ${G.inv[r.i]}</td><td>${fmt(r.a, 2)}</td><td>${fmt(r.m, 2)}</td><td><span class="bar"><i style="width:${Math.round(Math.min(1, r.r) * 100)}%"></i></span>${Math.round(r.r * 100)}%</td><td>${usd(r.lost * S.price)}</td></tr>`).join('');
    const tb = $('lsRows'); if (tb._h !== rh) { tb._h = rh; tb.innerHTML = rh; tb.querySelectorAll('tr').forEach(tr => tr.onclick = () => select(+tr.dataset.i)); }
  }
  function renderWOs() {
    const ul = $('lxWo'); const open = S.wos.filter(w => w.status !== 'Resolved').length; $('woCount').textContent = S.wos.length ? open + ' open of ' + S.wos.length : ''; $('lxWoB').textContent = open || '';
    ul.innerHTML = S.wos.length ? S.wos.map((w, k) => `<li><div><b>WO-${w.id}</b><span>${w.title}</span><small>${w.at} · ${w.value}${w.crew ? ' · ' + w.crew : ''}</small></div><button data-k="${k}">${w.status}</button></li>`).join('') : '<li class="empty">No work orders yet. Create one from Overview or from any inverter.</li>';
    ul.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const w = S.wos[+b.dataset.k]; w.status = w.status === 'Open' ? 'Assigned' : w.status === 'Assigned' ? 'Resolved' : 'Open'; if (w.status === 'Assigned' && !w.crew) w.crew = CREWS[S.wos.indexOf(w) % 2].name; renderWOs(); renderCrew(); });
  }
  function createWO(ids) {
    const title = ids.length > 1 ? `Inverters ${ids.map(i => G.inv[i]).join(', ')} offline` : `Inverter ${G.inv[ids[0]]} ${S.faults[ids[0]] !== undefined ? 'tripped' : 'below physics'}`;
    const value = usd(ids.reduce((s, i) => s + invDay(i).lost, 0) * S.price) + ' lost so far';
    S.wos.unshift({ id: S.woNext++, title, at: '29 Sep ' + clock(S.h), value, status: 'Open' }); renderWOs(); toast(`Work order created: ${title}`);
  }
  function toast(msg) { const t = $('lxToast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600); }
  // drawer
  function select(i) { S.sel = i; $('lxDr').classList.add('on'); renderDrawer(); }
  $('lxDrX').onclick = () => { S.sel = -1; $('lxDr').classList.remove('on'); };
  function renderDrawer() {
    const i = S.sel, d = invDay(i), m = modAt(i, S.h * 4), a = actAt(i, S.h * 4), r = m > 0.05 ? a / m : null;
    $('drT').textContent = 'Inverter ' + G.inv[i]; $('drS').textContent = S.faults[i] !== undefined ? 'Simulated fault since ' + clock(S.faults[i]) : r === null ? 'Night' : r < 0.02 ? 'Offline' : r < 0.88 ? 'Below physics' : 'Healthy';
    $('drNow').textContent = fmt(a * 1000, 0) + ' kW'; $('drPh').textContent = r === null ? 'n/a' : Math.round(r * 100) + '%'; $('drE').textContent = fmt(d.a, 2) + ' / ' + fmt(d.m, 2) + ' MWh'; $('drL').textContent = usd(d.lost * S.price);
    $('drFault').textContent = S.faults[i] !== undefined ? 'Clear simulated fault' : 'Simulate a fault here';
    drawDr();
  }
  $('drWo').onclick = () => createWO([S.sel]);
  $('drFault').onclick = () => { const i = S.sel; if (S.faults[i] !== undefined) delete S.faults[i]; else { S.faults[i] = S.h; toast(`Inverter ${G.inv[i]} tripped at ${clock(S.h)}. Laplace flagged it on the next scan.`); } renderDrawer(); };
  // map interaction
  const tip = $('lxTip');
  function pip(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function hit(e) { const r = map.getBoundingClientRect(), X = e.clientX - r.left - M[4], Y = e.clientY - r.top - M[5], x = Mi[0] * X + Mi[2] * Y, y = Mi[1] * X + Mi[3] * Y; for (const k in G.invAreas) if (pip(x, y, G.invAreas[k])) return G.inv.indexOf(k); return -1; }
  map.addEventListener('mousemove', e => {
    S.hover = hit(e); map.style.cursor = S.hover >= 0 ? (S.faultMode ? 'crosshair' : 'pointer') : 'default';
    if (S.hover < 0) { tip.style.opacity = 0; return; }
    const i = S.hover, m = modAt(i, S.h * 4), a = actAt(i, S.h * 4), r = m > 0.05 ? a / m : null, ar = app.getBoundingClientRect();
    tip.innerHTML = `<b>Inverter ${G.inv[i]}</b><span>${fmt(a * 1000, 0)} kW · ${r === null ? 'night' : Math.round(r * 100) + '% of physics'}</span><small>${S.faultMode ? 'Click to trip it' : 'Click for details'}</small>`;
    tip.style.left = (e.clientX - ar.left + 14) + 'px'; tip.style.top = (e.clientY - ar.top + 14) + 'px'; tip.style.opacity = 1;
  });
  map.addEventListener('mouseleave', () => { S.hover = -1; tip.style.opacity = 0; });
  map.addEventListener('click', e => {
    const i = hit(e); if (i < 0) return;
    if (S.faultMode) { S.faults[i] = S.h; toast(`Inverter ${G.inv[i]} tripped at ${clock(S.h)}. Laplace flagged it on the next scan.`); select(i); }
    else select(i);
  });
  $('lxFault').onclick = () => { S.faultMode = !S.faultMode; $('lxFault').classList.toggle('on', S.faultMode); $('lxFault').textContent = S.faultMode ? 'Trip mode on' : 'Trip mode off'; };
  $('lxReset').onclick = () => { S.faults = {}; S.sel = -1; $('lxDr').classList.remove('on'); toast('Simulated faults cleared.'); };
  hm.addEventListener('mousemove', e => { const r = hm.getBoundingClientRect(), ch = (r.height - 30) / N; const i = Math.floor((e.clientY - r.top - 6) / ch); S.hover = i >= 0 && i < N ? i : -1; });
  hm.addEventListener('mouseleave', () => S.hover = -1); hm.addEventListener('click', () => { if (S.hover >= 0) { S.strInv = S.hover; select(S.hover); } });
  // playback
  const setH = (c, e, pl = 8, pr = 44) => { const r = c.getBoundingClientRect(); S.h = H0 + Math.max(0, Math.min(1, (e.clientX - r.left - pl) / (r.width - pl - pr))) * (H1 - H0); };
  [[tl, 8, 44], [sc, 8, 44]].forEach(([c, pl, pr]) => { c.style.cursor = 'ew-resize'; c.addEventListener('pointerdown', e => { S.scrub = true; setH(c, e, pl, pr); c.setPointerCapture(e.pointerId); }); c.addEventListener('pointermove', e => { if (S.scrub) setH(c, e, pl, pr); }); c.addEventListener('pointerup', () => S.scrub = false); });
  const pb = $('lxPlay'); const setPlay = p => { S.playing = p; pb.innerHTML = p ? '<svg viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.6" height="9" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" fill="currentColor"/></svg>' : '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>'; };
  pb.onclick = () => setPlay(!S.playing); setPlay(true);
  app.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { S.speed = +b.dataset.speed; app.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b)); });
  app.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { S.h = +b.dataset.jump; setPlay(false); if (b.dataset.sel) select(G.inv.indexOf(b.dataset.sel)); });
  $('lsPrice').addEventListener('input', e => { S.price = Math.max(0, +e.target.value || 0); });
  // ---------- alarms
  function firstBad(i) { let f = -1, l = -1; for (let j = H0 * 4; j <= S.h * 4; j++) { const m = G.mod[i][j]; if (m > 0.05 && actAt(i, j) / m < 0.88) { if (f < 0) f = j; l = j; } } return [f, l]; }
  function renderAlarms() {
    if (S.tab !== 'alarms') return; const rows = [];
    for (let i = 0; i < N; i++) { const [f, l] = firstBad(i); if (f < 0) continue; const d = invDay(i); const active = l >= Math.floor(S.h * 4) - 1;
      rows.push(`<tr data-i="${i}"><td>Inverter ${G.inv[i]}</td><td><span class="pill ${active ? 'solid' : ''}">${S.faults[i] !== undefined ? 'Simulated' : active ? 'Active' : 'Cleared'}</span></td><td>${clock(f / 4)}</td><td>${Math.round((l - f + 1) * 15)} min</td><td>${usd(d.lost * S.price)}</td></tr>`); }
    const h = rows.join('') || '<tr><td colspan="5" style="color:rgba(25,25,25,.5)">No alarms yet today.</td></tr>'; const tb = $('alRows'); if (tb._h !== h) { tb._h = h; tb.innerHTML = h; tb.querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = () => select(+tr.dataset.i)); }
  }
  // ---------- what-if
  function renderWhatif() {
    if (S.tab !== 'whatif') return; const ks = Object.keys(S.faults).map(Number);
    const h = ks.length ? ks.map(i => `<li data-i="${i}"><div><b>Inverter ${G.inv[i]}</b><span>Tripped at ${clock(S.faults[i])}</span></div><em>${usd(invDay(i).lost * S.price)}</em></li>`).join('') : '<li class="empty">No simulated faults yet.</li>';
    const ul = $('wiList'); if (ul._h !== h) { ul._h = h; ul.innerHTML = h; ul.querySelectorAll('li[data-i]').forEach(li => li.onclick = () => select(+li.dataset.i)); }
  }
  // ---------- strings (illustrative: inverter ratio with seeded per-string spread)
  const rnd = s => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const WEAK = { '12': [[3, 2, .62]], '21': [[5, 7, .71]], '27': [[1, 4, .55], [1, 5, .58]] };
  S.strInv = 11;
  function renderStrings() {
    if (S.tab !== 'inverters') return; const i = S.strInv, id = G.inv[i], m = modAt(i, S.h * 4), r = m > 0.05 ? actAt(i, S.h * 4) / m : 0;
    $('stT').textContent = 'Strings · inverter ' + id; let h = '';
    for (let c = 1; c <= 7; c++) { h += `<div class="r"><span>SCB ${id}.${String(c).padStart(2, '0')}</span>`;
      for (let k = 1; k <= 9; k++) { let v = r * (0.97 + 0.06 * rnd(i * 100 + c * 10 + k)); (WEAK[id] || []).forEach(([cc, kk, f]) => { if (cc === c && kk === k) v = r * f; }); const lo = r > 0.2 && v / r < 0.8;
        h += `<div class="c ${lo ? 'lo' : ''}" style="background:rgba(25,25,25,${Math.max(.06, Math.min(1, v) * .9)})">${r < 0.02 ? '0' : (8.2 * v * (0.3 + 0.7 * Math.min(1, m / PEAK))).toFixed(1)}A</div>`; }
      h += '</div>'; }
    const g = $('stGrid'); if (g._h !== h) { g._h = h; g.innerHTML = h; }
  }
  // ---------- O&M (illustrative crews and spares)
  const CREWS = [{ name: 'Crew 1', who: 'A. Rivera, S. Okafor · north block' }, { name: 'Crew 2', who: 'M. Chen, L. Duarte · blocks C and D' }, { name: 'Crew 3', who: 'Off shift until 18:00' }];
  function renderCrew() { $('crew').innerHTML = CREWS.map(c => { const n = S.wos.filter(w => w.crew === c.name && w.status === 'Assigned').length; return `<li><div><b>${c.name}</b><small>${c.who}</small></div><span class="pill ${n ? 'solid' : ''}">${n ? n + ' assigned' : c.name === 'Crew 3' ? 'Off' : 'Available'}</span></li>`; }).join(''); }
  $('spares').innerHTML = [['IGBT power module', 4, 2], ['String fuse, 15 A', 120, 50], ['MC4 connector pair', 340, 100], ['Inverter cooling fan', 3, 4], ['Surge protection device', 8, 4], ['Combiner box breaker', 6, 4]].map(([p, o, mn]) => `<tr><td>${p}</td><td>${o}</td><td>${mn}</td><td><span class="pill ${o < mn ? 'solid' : ''}">${o < mn ? 'Reorder' : 'OK'}</span></td></tr>`).join('');
  // ---------- long-term health (illustrative)
  const hl = $('lxHl');
  function drawHealth() {
    const [x, w, h] = fit(hl), n = 60, pl = 8, pr = 44, X = k => pl + k / (n - 1) * (w - pl - pr), Y = v => h - 22 - (v - 0.70) / 0.16 * (h - 36);
    x.font = '11px Geist, system-ui'; x.fillStyle = 'rgba(25,25,25,.38)'; x.strokeStyle = 'rgba(25,25,25,.07)';
    for (let v = .72; v <= .86; v += .04) { x.beginPath(); x.moveTo(pl, Y(v)); x.lineTo(w - pr, Y(v)); x.stroke(); x.fillText(Math.round(v * 100) + '%', w - pr + 8, Y(v) + 4); }
    for (let yr = 0; yr < 5; yr++) x.fillText(String(2022 + yr), X(yr * 12) , h - 4);
    const pr_ = k => 0.835 * Math.pow(1 - 0.0052, k / 12) - 0.03 * ((k % 4) / 4) + 0.006 * Math.sin(k * 1.7);
    x.beginPath(); for (let k = 0; k < n; k++) k ? x.lineTo(X(k), Y(pr_(k))) : x.moveTo(X(k), Y(pr_(k))); x.strokeStyle = '#191919'; x.lineWidth = 1.4; x.stroke();
    for (let k = 0; k < n; k++) { x.beginPath(); x.arc(X(k), Y(pr_(k)), 2.2, 0, 7); x.fillStyle = '#191919'; x.fill(); }
    x.setLineDash([5, 4]); x.beginPath(); x.moveTo(X(0), Y(0.835)); x.lineTo(X(n - 1), Y(0.835 * Math.pow(1 - 0.0052, (n - 1) / 12))); x.strokeStyle = 'rgba(25,25,25,.6)'; x.lineWidth = 1; x.stroke(); x.setLineDash([]);
  }
  // ---------- reports (illustrative)
  const REPS = [['Daily generation', '29 Sep 2026', 'Asset manager'], ['Monthly performance', 'Sep 2026', 'Lenders'], ['Schedule deviation settlement', 'Week 39', 'Grid operator'], ['PPA invoice', 'Sep 2026', 'Offtaker'], ['Availability and downtime', 'Q3 2026', 'O&M contractor']];
  $('reps').innerHTML = REPS.map(([r, p, f], k) => `<tr><td>${r}</td><td>${p}</td><td>${f}</td><td style="text-align:right"><button class="pri" data-r="${k}">Generate</button></td></tr>`).join('');
  $('reps').querySelectorAll('button').forEach(b => b.onclick = () => { if (b.textContent === 'Generate') { b.textContent = 'Preparing…'; setTimeout(() => { b.textContent = 'Download'; toast(REPS[+b.dataset.r][0] + ' report is ready.'); }, 900); } else toast('Preview only. In the product this downloads a PDF.'); });
  // loop
  let vis = true; new IntersectionObserver(es => es.forEach(e => vis = e.isIntersecting), { threshold: .05 }).observe(app);
  function frame(now) {
    if (['overview', 'map', 'whatif'].includes(S.tab)) drawMap(now);
    if (S.tab === 'overview') drawTl();
    if (S.tab === 'inverters') drawHm();
    if (S.tab === 'schedule') drawSch();
    hud();
  }
  let prev = performance.now(), hold = 0, lastHud = 0;
  window.lxSet = h => { S.h = h; setPlay(false); frame(performance.now()); };
  window.lxTab = t => setTab(t); window.lxSel = id => select(G.inv.indexOf(id)); window.lxFault = (id, h) => { S.faults[G.inv.indexOf(id)] = h; frame(performance.now()); };
  function loop(now) {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (vis) { if (S.playing && !S.scrub) { if (S.h >= H1) { hold += dt; if (hold > 1.5) { S.h = H0; hold = 0; } } else S.h = Math.min(H1, S.h + dt * S.speed * (H1 - H0) / 60); } frame(now); }
    requestAnimationFrame(loop);
  }
  S.wos = [
    { id: 1046, title: 'Inverter 03 insulation resistance check', at: '29 Sep 09:40', value: 'Raised by Laplace', status: 'Open' },
    { id: 1045, title: 'Combiner 12.03 string 2 low current', at: '29 Sep 09:05', value: '$14 lost so far', status: 'Open' },
    { id: 1044, title: 'String fuse 27.01.04 blown', at: '29 Sep 08:10', value: '$22 lost so far', status: 'Assigned', crew: 'Crew 1' },
    { id: 1043, title: 'Module cleaning, blocks C and D', at: '29 Sep 06:30', value: 'Scheduled, soiling 2.1%', status: 'Assigned', crew: 'Crew 2' },
    { id: 1042, title: 'Inverter 14 cooling fan replaced', at: '28 Sep 15:40', value: '$61 recovered', status: 'Resolved', crew: 'Crew 2' },
    { id: 1041, title: 'Vegetation clearing, east fence line', at: '27 Sep 11:20', value: 'Shading risk', status: 'Resolved', crew: 'Crew 1' },
    { id: 1040, title: 'Surge device replaced, combiner 31.06', at: '26 Sep 14:05', value: '$38 recovered', status: 'Resolved', crew: 'Crew 1' }];
  // inertial scrolling inside the app
  if (window.Lenis) { const w = app.querySelector('.main'); window.lxLenis = new Lenis({ wrapper: w, content: w.querySelector('.mc'), smoothWheel: true, lerp: 0.09, wheelMultiplier: 0.9 }); const raf = t => { lxLenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  const initialView = new URLSearchParams(location.search).get('view');
  if (tabs.some(tab => tab.dataset.tab === initialView)) setTab(initialView);
  project(); renderWOs(); renderCrew(); addEventListener('resize', () => { project(); }); requestAnimationFrame(loop);
})();
