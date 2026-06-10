/* erp-chart.jsx — Kanwa wykresu ERP: siatka, osie, krzywe grup, pasmo SEM,
   znacznik bodźca (0 ms), adnotacja szczytu P300 oraz przeciągalne/rozciągalne
   okno pomiarowe. Animuje morfing krzywych przy zmianie warunku. */
(function () {
  'use strict';
  const { useRef, useEffect } = React;

  // Geometria (px w przestrzeni CSS)
  const M = { top: 34, right: 26, bottom: 56, left: 64 };
  const Y_MIN = -5, Y_MAX = 16; // μV — stałe, by oś nie skakała

  function lerp(a, b, k) { return a + (b - a) * k; }

  function ERPChart(props) {
    const { stimulus, block, channel, win, onWindowChange,
            colors, showSEM, convention, height = 460 } = props;
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    // wyświetlane krzywe (morfują), cele i geometria w refach
    const stateRef = useRef({ disp: null, geom: null });
    const dragRef = useRef(null);

    // cele krzywych dla bieżącego warunku
    function targets() {
      return {
        High: window.ERP.curve(stimulus, 'High', block, channel),
        Low: window.ERP.curve(stimulus, 'Low', block, channel),
      };
    }

    // mapowania
    function makeGeom(cssW) {
      const x0 = M.left, x1 = cssW - M.right;
      const y0 = M.top, y1 = height - M.bottom;
      const tx = (t) => x0 + (t - window.ERP.T_MIN) / (window.ERP.T_MAX - window.ERP.T_MIN) * (x1 - x0);
      const yv = (v) => {
        const vv = convention === 'neg' ? -v : v;
        return y1 - (vv - Y_MIN) / (Y_MAX - Y_MIN) * (y1 - y0);
      };
      const xt = (px) => window.ERP.T_MIN + (px - x0) / (x1 - x0) * (window.ERP.T_MAX - window.ERP.T_MIN);
      return { x0, x1, y0, y1, tx, yv, xt, cssW };
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const cssW = wrapRef.current.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = cssW + 'px';
        canvas.style.height = height + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, height);

      const g = makeGeom(cssW);
      stateRef.current.geom = g;
      const disp = stateRef.current.disp;

      // tło obszaru wykresu
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0);

      // --- siatka ---
      ctx.lineWidth = 1;
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.textBaseline = 'middle';
      // poziome (μV)
      for (let v = Y_MIN; v <= Y_MAX; v += 1) {
        const major = v % 5 === 0;
        if (!major && (Y_MAX - Y_MIN) > 16) continue;
        const py = g.yv(v);
        ctx.strokeStyle = v === 0 ? '#c9c9c2' : (major ? '#e7e7e0' : '#f2f2ec');
        ctx.beginPath(); ctx.moveTo(g.x0, py); ctx.lineTo(g.x1, py); ctx.stroke();
        if (major) {
          ctx.fillStyle = '#8a8a82';
          ctx.textAlign = 'right';
          ctx.fillText(String(v), g.x0 - 9, py);
        }
      }
      // pionowe (ms)
      for (let t = window.ERP.T_MIN; t <= window.ERP.T_MAX; t += 100) {
        const px = g.tx(t);
        const major = t % 200 === 0;
        ctx.strokeStyle = major ? '#e7e7e0' : '#f2f2ec';
        ctx.beginPath(); ctx.moveTo(px, g.y0); ctx.lineTo(px, g.y1); ctx.stroke();
        if (major) {
          ctx.fillStyle = '#8a8a82';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(t), px, g.y1 + 8);
          ctx.textBaseline = 'middle';
        }
      }

      // --- okno pomiarowe (zacienione) ---
      const wx0 = g.tx(win.a), wx1 = g.tx(win.b);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(wx0, g.y0, wx1 - wx0, g.y1 - g.y0);
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(wx0, g.y0); ctx.lineTo(wx0, g.y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx1, g.y0); ctx.lineTo(wx1, g.y1); ctx.stroke();
      ctx.setLineDash([]);
      // uchwyty krawędzi
      ctx.fillStyle = 'rgba(79, 70, 229, 0.9)';
      [wx0, wx1].forEach((x) => {
        ctx.fillRect(x - 2.5, (g.y0 + g.y1) / 2 - 16, 5, 32);
      });

      // --- znacznik bodźca (0 ms) ---
      const zx = g.tx(0);
      ctx.strokeStyle = '#3a3a36';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(zx, g.y0); ctx.lineTo(zx, g.y1); ctx.stroke();
      ctx.setLineDash([]);

      if (!disp) return;

      // --- pasma SEM ---
      if (showSEM) {
        [['Low', colors.low], ['High', colors.high]].forEach(([grp, col]) => {
          const c = disp[grp];
          ctx.beginPath();
          for (let i = 0; i < c.length; i++) {
            const p = c[i];
            const px = g.tx(p.t), py = g.yv(p.v + p.sem);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          for (let i = c.length - 1; i >= 0; i--) {
            const p = c[i];
            ctx.lineTo(g.tx(p.t), g.yv(p.v - p.sem));
          }
          ctx.closePath();
          ctx.fillStyle = hexA(col, 0.13);
          ctx.fill();
        });
      }

      // --- krzywe ---
      [['Low', colors.low], ['High', colors.high]].forEach(([grp, col]) => {
        const c = disp[grp];
        ctx.beginPath();
        for (let i = 0; i < c.length; i++) {
          const p = c[i];
          const px = g.tx(p.t), py = g.yv(p.v);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.stroke();
      });

      // --- adnotacja szczytu P300 (High-FOMO) ---
      const pk = window.ERP.peak(disp.High);
      const ppx = g.tx(pk.t), ppy = g.yv(pk.v);
      ctx.fillStyle = colors.high;
      ctx.beginPath(); ctx.arc(ppx, ppy, 3.4, 0, Math.PI * 2); ctx.fill();
      // strzałka + etykieta nad szczytem
      const labY = Math.max(ppy - 46, g.y0 + 12);
      ctx.strokeStyle = colors.high;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ppx, ppy - 6); ctx.lineTo(ppx, labY + 14); ctx.stroke();
      // grot
      ctx.beginPath(); ctx.moveTo(ppx, ppy - 6); ctx.lineTo(ppx - 3.5, ppy - 12);
      ctx.lineTo(ppx + 3.5, ppy - 12); ctx.closePath(); ctx.fillStyle = colors.high; ctx.fill();
      ctx.font = '600 12px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.high;
      ctx.fillText('P300', ppx, labY);
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#5a5a54';
      ctx.fillText(pk.v.toFixed(1) + ' μV · ' + Math.round(pk.t) + ' ms', ppx, labY + 13);

      // oś dolna / strzałka osi czasu
      ctx.strokeStyle = '#3a3a36';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(g.x0, g.y1); ctx.lineTo(g.x1, g.y1); ctx.stroke();
    }

    function hexA(hex, a) {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${gg},${b},${a})`;
    }

    // morfowanie krzywych do celu
    useEffect(() => {
      const tg = targets();
      const from = stateRef.current.disp;
      if (!from) { stateRef.current.disp = tg; draw(); return; }
      const start = performance.now();
      const DUR = 420;
      cancelAnimationFrame(animRef.current);
      const fromSnap = { High: from.High.map(p => ({ ...p })), Low: from.Low.map(p => ({ ...p })) };
      function step(now) {
        const k = Math.min(1, (now - start) / DUR);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const cur = {};
        ['High', 'Low'].forEach(grp => {
          cur[grp] = tg[grp].map((p, i) => ({
            t: p.t,
            v: lerp(fromSnap[grp][i].v, p.v, e),
            sem: lerp(fromSnap[grp][i].sem, p.sem, e),
          }));
        });
        stateRef.current.disp = cur;
        draw();
        if (k < 1) animRef.current = requestAnimationFrame(step);
      }
      animRef.current = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animRef.current);
      // eslint-disable-next-line
    }, [stimulus, block, channel]);

    // redraw przy zmianie okna / stylu
    useEffect(() => { draw(); /* eslint-disable-next-line */ }, [win.a, win.b, colors.high, colors.low, showSEM, convention]);

    // responsywność
    useEffect(() => {
      const ro = new ResizeObserver(() => draw());
      ro.observe(wrapRef.current);
      return () => ro.disconnect();
      // eslint-disable-next-line
    }, []);

    // --- przeciąganie okna ---
    function pointerT(e) {
      const g = stateRef.current.geom;
      const rect = canvasRef.current.getBoundingClientRect();
      return g.xt(e.clientX - rect.left);
    }
    function onDown(e) {
      const g = stateRef.current.geom;
      if (!g) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const wx0 = g.tx(win.a), wx1 = g.tx(win.b);
      let mode = null;
      if (Math.abs(px - wx0) < 9) mode = 'a';
      else if (Math.abs(px - wx1) < 9) mode = 'b';
      else if (px > wx0 && px < wx1) mode = 'move';
      else return;
      dragRef.current = { mode, startT: pointerT(e), a0: win.a, b0: win.b };
      e.target.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      const g = stateRef.current.geom;
      if (!g) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      // kursor hover
      const wx0 = g.tx(win.a), wx1 = g.tx(win.b);
      if (!dragRef.current) {
        const near = Math.abs(px - wx0) < 9 || Math.abs(px - wx1) < 9;
        const inside = px > wx0 && px < wx1;
        canvasRef.current.style.cursor = near ? 'ew-resize' : (inside ? 'grab' : 'default');
        return;
      }
      const d = dragRef.current;
      const t = pointerT(e);
      const clamp = (x) => Math.max(window.ERP.T_MIN, Math.min(window.ERP.T_MAX, x));
      const snap = (x) => Math.round(x / 10) * 10;
      if (d.mode === 'a') {
        onWindowChange({ a: snap(clamp(Math.min(t, d.b0 - 20))), b: d.b0 });
      } else if (d.mode === 'b') {
        onWindowChange({ a: d.a0, b: snap(clamp(Math.max(t, d.a0 + 20))) });
      } else {
        const dt = t - d.startT;
        let na = d.a0 + dt, nb = d.b0 + dt;
        if (na < window.ERP.T_MIN) { nb += window.ERP.T_MIN - na; na = window.ERP.T_MIN; }
        if (nb > window.ERP.T_MAX) { na -= nb - window.ERP.T_MAX; nb = window.ERP.T_MAX; }
        onWindowChange({ a: snap(na), b: snap(nb) });
      }
    }
    function onUp(e) {
      if (dragRef.current) { dragRef.current = null; canvasRef.current.style.cursor = 'grab'; }
    }

    return (
      <div ref={wrapRef} style={{ width: '100%', position: 'relative', userSelect: 'none', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{ display: 'block', borderRadius: 6 }}
        />
      </div>
    );
  }

  window.ERPChart = ERPChart;
})();
