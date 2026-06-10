/* ===========================================================================
   Czepek EEG — renderer 3D (canvas) + interakcje
   =========================================================================== */
(function () {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');

  /* ---- stan ---- */
  const LS = 'eeg_cap_state_v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();
  const state = {
    yaw:  saved.yaw  ?? -0.55,
    pitch:saved.pitch?? -0.62,
    showLabels: saved.showLabels ?? false,
    showGrid:   saved.showGrid   ?? true,
    showAnalytical: saved.showAnalytical ?? true,
    region: saved.region ?? null,        // aktywny filtr płata
    selected: saved.selected ?? null,    // nazwa wybranej elektrody
    accent: saved.accent ?? '#2563eb',
    dotScale: saved.dotScale ?? 1,
  };
  // cele animacji obrotu
  let targetYaw = state.yaw, targetPitch = state.pitch, animating = false;

  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        yaw: state.yaw, pitch: state.pitch, showLabels: state.showLabels,
        showGrid: state.showGrid, showAnalytical: state.showAnalytical,
        region: state.region, selected: state.selected, accent: state.accent,
        dotScale: state.dotScale,
      }));
    } catch (e) {}
  }

  /* ---- geometria / projekcja ---- */
  let W = 0, H = 0, CX = 0, CY = 0, R = 0, DPR = 1;
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2; CY = H / 2 + H * 0.02;
    R = Math.min(W, H) * 0.37;
  }

  // obrót: pitch (oś X = prawo) potem yaw (oś Z = góra). Kamera patrzy wzdłuż -Y.
  function project(v, yaw, pitch) {
    // rotX(pitch)
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    let y1 = v.y * cp - v.z * sp;
    let z1 = v.y * sp + v.z * cp;
    let x1 = v.x;
    // rotZ(yaw)
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    let x2 = x1 * cy - y1 * sy;
    let y2 = x1 * sy + y1 * cy;
    let z2 = z1;
    return {
      sx: CX + x2 * R,
      sy: CY - z2 * R,
      depth: y2,        // większe = bliżej kamery (przód)
      cam: { x: x2, y: y2, z: z2 },
    };
  }

  /* ---- rysowanie głowy ---- */
  function drawHead() {
    // miękki cień pod głową
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(CX, CY + R * 1.02, R * 0.78, R * 0.16, 0, 0, Math.PI * 2);
    const sh = ctx.createRadialGradient(CX, CY + R * 1.02, 0, CX, CY + R * 1.02, R * 0.8);
    sh.addColorStop(0, 'rgba(15,23,42,0.16)');
    sh.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.fillStyle = sh;
    ctx.fill();
    ctx.restore();

    // sfera skóry głowy
    const lg = ctx.createRadialGradient(
      CX - R * 0.38, CY - R * 0.42, R * 0.1,
      CX, CY, R * 1.08
    );
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(0.45, '#eef2f7');
    lg.addColorStop(0.8, '#d7dee8');
    lg.addColorStop(1, '#bcc6d4');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.stroke();

    // delikatne refleksy konturu (terminator)
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();
    const rim = ctx.createRadialGradient(CX, CY, R * 0.7, CX, CY, R);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(1, 'rgba(100,116,139,0.18)');
    ctx.fillStyle = rim;
    ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    ctx.restore();
  }

  // znaczniki anatomiczne: nos i uszy (rysowane, gdy zwrócone do kamery)
  const NOSE = { x: 0, y: 0.96, z: 0.30 };
  const EAR_L = { x: -1.0, y: -0.02, z: -0.05 };
  const EAR_R = { x: 1.0, y: -0.02, z: -0.05 };

  function drawMarkers() {
    const nose = project(NOSE, state.yaw, state.pitch);
    if (nose.depth > 0.15) {
      const dir = Math.atan2(nose.sy - CY, nose.sx - CX);
      const len = R * 0.12, wro = R * 0.07;
      const tipX = nose.sx + Math.cos(dir) * len;
      const tipY = nose.sy + Math.sin(dir) * len;
      const bx = nose.sx, by = nose.sy;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(dir + Math.PI / 2) * wro, by + Math.sin(dir + Math.PI / 2) * wro);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx + Math.cos(dir - Math.PI / 2) * wro, by + Math.sin(dir - Math.PI / 2) * wro);
      ctx.closePath();
      ctx.fillStyle = '#cdd6e2';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,116,139,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    [EAR_L, EAR_R].forEach(E => {
      const p = project(E, state.yaw, state.pitch);
      if (p.depth > -0.1) {
        ctx.save();
        ctx.translate(p.sx, p.sy);
        const ang = Math.atan2(p.sy - CY, p.sx - CX);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 0.06, R * 0.11, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#cdd6e2';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,116,139,0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  /* ---- logika podświetlenia ---- */
  function isDimmed(e) {
    if (state.region && e.region !== state.region) return true;
    return false;
  }

  function drawGrid() {
    if (!state.showGrid) return;
    ctx.lineCap = 'round';
    for (const [a, b] of EEG_EDGES) {
      const pa = project(a.vec, state.yaw, state.pitch);
      const pb = project(b.vec, state.yaw, state.pitch);
      const md = (pa.depth + pb.depth) / 2;
      if (md < -0.45) continue;                       // ukryj tylne segmenty
      const dim = isDimmed(a) && isDimmed(b);
      let alpha = (md + 0.45) / 1.1;                  // głębia → przezroczystość
      alpha = Math.max(0.05, Math.min(0.5, alpha));
      if (dim) alpha *= 0.3;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.strokeStyle = `rgba(120,134,153,${alpha})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  /* ---- rysowanie elektrod ---- */
  let hovered = null;
  let screenCache = [];   // {e, sx, sy, depth, r}

  function drawElectrodes(t) {
    // projekcja + sort od tyłu do przodu
    const items = EEG_ELECTRODES.map(e => {
      const p = project(e.vec, state.yaw, state.pitch);
      return { e, ...p };
    }).sort((m, n) => m.depth - n.depth);

    screenCache = [];
    const baseR = R * 0.052 * state.dotScale;

    for (const it of items) {
      const { e, sx, sy, depth } = it;
      const back = depth < -0.2;                       // tył głowy
      const reg = EEG_REGIONS[e.region];
      const dim = isDimmed(e);
      const sel = state.selected === e.name;
      const hov = hovered === e.name;
      // skala wg głębi (perspektywa miękka)
      const ds = 0.82 + 0.18 * ((depth + 1) / 2);
      let rad = baseR * ds * (hov || sel ? 1.28 : 1);

      let alpha = back ? 0.18 : 1;
      if (dim) alpha *= 0.28;

      screenCache.push({ e, sx, sy, depth, r: rad, back });

      // halo analitycznych
      if (e.analytical && state.showAnalytical && !dim) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 520 + e.Lsigned);
        const hr = rad + 6 + pulse * 5;
        ctx.beginPath();
        ctx.arc(sx, sy, hr, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(state.accent, (0.5 - 0.32 * pulse) * (back ? 0.4 : 1));
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // halo elektrod badania
      const study = EEG_STUDY[e.name];
      if (study && !dim) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 600 + (e.Lsigned || 0));
        const hr = rad + 7 + pulse * 4;
        const sc = STUDY_COLORS[study.role];
        ctx.beginPath();
        ctx.arc(sx, sy, hr, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(sc, (0.7 - 0.3 * pulse) * (back ? 0.35 : 1));
        ctx.lineWidth = 2.8;
        ctx.stroke();
      }

      // pierścień zewnętrzny / cień
      ctx.beginPath();
      ctx.arc(sx, sy, rad + 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(15,23,42,${0.12 * alpha})`;
      ctx.fill();

      // korpus elektrody
      const studyFill = study ? STUDY_COLORS[study.role] : null;
      const fill = dim ? '#9aa6b5' : (studyFill || reg.color);
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fillStyle = hexA(fill, alpha);
      ctx.fill();
      // obwódka
      ctx.lineWidth = sel ? 3 : (e.analytical && state.showAnalytical && !dim ? 2.4 : 1.4);
      ctx.strokeStyle = sel
        ? '#0f172a'
        : (e.analytical && state.showAnalytical && !dim ? hexA('#0f172a', 0.85 * alpha) : hexA('#ffffff', 0.9 * alpha));
      ctx.stroke();

      // refleks
      if (!back) {
        ctx.beginPath();
        ctx.arc(sx - rad * 0.3, sy - rad * 0.32, rad * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha})`;
        ctx.fill();
      }

      // etykiety
      const isStudy = !!EEG_STUDY[e.name];
      const showLab = (state.showLabels || sel || hov || (e.analytical && state.showAnalytical) || isStudy) && !back && !(dim && !sel && !hov);
      if (showLab) {
        ctx.font = `600 ${Math.max(9, rad * 1.05)}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const ly = sy - rad - 4;
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,255,255,${0.92 * alpha})`;
        ctx.strokeText(e.name, sx, ly);
        ctx.fillStyle = hexA(sel || hov ? '#0f172a' : '#334155', alpha);
        ctx.fillText(e.name, sx, ly);
      }
    }
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ---- pętla ---- */
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    // animacja obrotu do celu
    if (animating) {
      state.yaw += (targetYaw - state.yaw) * 0.12;
      state.pitch += (targetPitch - state.pitch) * 0.12;
      if (Math.abs(targetYaw - state.yaw) < 0.001 && Math.abs(targetPitch - state.pitch) < 0.001) {
        state.yaw = targetYaw; state.pitch = targetPitch; animating = false; save();
      }
    }
    drawHead();
    drawGrid();
    drawMarkers();
    drawElectrodes(t);
    requestAnimationFrame(frame);
  }

  /* ---- interakcje wskaźnika ---- */
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  canvas.addEventListener('pointerdown', e => {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    animating = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      state.yaw += dx * 0.008;
      state.pitch += dy * 0.008;
      state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
      lastX = e.clientX; lastY = e.clientY;
      hideTooltip();
    } else {
      pickHover(mx, my);
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (dragging && moved < 5) {
      const rect = canvas.getBoundingClientRect();
      pickClick(e.clientX - rect.left, e.clientY - rect.top);
    }
    if (dragging) save();
    dragging = false;
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; hideTooltip(); });

  function nearest(mx, my) {
    let best = null, bestD = 1e9;
    for (const s of screenCache) {
      if (s.back) continue;
      const d = (s.sx - mx) ** 2 + (s.sy - my) ** 2;
      const rr = (s.r + 7) ** 2;
      if (d < rr && d < bestD) { bestD = d; best = s; }
    }
    return best;
  }
  function pickHover(mx, my) {
    const s = nearest(mx, my);
    const name = s ? s.e.name : null;
    if (name !== hovered) { hovered = name; }
    if (s) showTooltip(s, mx, my); else hideTooltip();
    canvas.style.cursor = s ? 'pointer' : 'grab';
  }
  function pickClick(mx, my) {
    const s = nearest(mx, my);
    selectElectrode(s ? s.e.name : null);
  }

  function showTooltip(s, mx, my) {
    const e = s.e, reg = EEG_REGIONS[e.region];
    tooltip.innerHTML =
      `<span class="tt-name">${e.name}</span>` +
      `<span class="tt-reg"><i style="background:${reg.color}"></i>${reg.label}</span>`;
    tooltip.style.opacity = '1';
    const tx = Math.min(W - 140, mx + 16), ty = Math.max(8, my - 10);
    tooltip.style.transform = `translate(${tx}px, ${ty}px)`;
  }
  function hideTooltip() { tooltip.style.opacity = '0'; }

  /* ---- panel szczegółów ---- */
  function selectElectrode(name) {
    state.selected = name;
    renderDetail();
    save();
  }
  window.eegSelect = selectElectrode;

  function renderDetail() {
    const panel = document.getElementById('detail');
    const e = EEG_ELECTRODES.find(x => x.name === state.selected);
    if (!e) {
      panel.innerHTML = `
        <div class="detail-empty">
          <p class="muted">Kliknij elektrodę na modelu, aby zobaczyć szczegóły. Przeciągnij, aby obrócić głowę.</p>
          <div class="quick">
            <span class="quick-lbl">Elektrody analityczne</span>
            <div class="quick-chips">
              ${Object.keys(EEG_STUDY).map(n => {
                const c = STUDY_COLORS[EEG_STUDY[n].role];
                return `<button class="chip-an" onclick="eegSelect('${n}')" style="color:${c};background:${c}18;border-color:${c}55">${n}</button>`;
              }).join('')}
            </div>
          </div>
        </div>`;
      return;
    }
    const reg = EEG_REGIONS[e.region];
    const sideTxt = e.side === 'mid' ? 'linia środkowa' : (e.side === 'left' ? 'półkula lewa' : 'półkula prawa');
    panel.innerHTML = `
      <div class="detail-head">
        <div class="d-name">${e.name}</div>
        ${e.analytical ? '<span class="d-flag">analityczna</span>' : ''}
      </div>
      <div class="d-region" style="--rc:${reg.color}">
        <i></i><span>${reg.label}</span><em>${sideTxt}</em>
      </div>
      <div class="d-block">
        <span class="d-lbl">Funkcja</span>
        <p>${reg.fn}</p>
      </div>
      ${e.note ? `<div class="d-block d-note"><span class="d-lbl">Znaczenie analityczne</span><p>${e.note}</p></div>` : ''}
      ${EEG_STUDY[e.name] ? (() => {
        const s = EEG_STUDY[e.name];
        const c = STUDY_COLORS[s.role];
        return `<div class="d-block d-note" style="background:${hexA(c,0.07)};border-color:${hexA(c,0.35)};border-left:3px solid ${c}">
          <span class="d-lbl" style="color:${c}">${s.label}</span>
          <p>${s.note}</p>
        </div>`;
      })() : ''}
      <div class="d-meta">
        <div><span>Rząd</span><b>${e.row}</b></div>
        <div><span>Układ</span><b>10-10</b></div>
        <div><span>Strona</span><b>${e.side === 'mid' ? 'środ.' : (e.side === 'left' ? 'lewa' : 'prawa')}</b></div>
      </div>`;
  }

  /* ---- legenda / filtry / przyciski ---- */
  function buildLegend() {
    const wrap = document.getElementById('legend');
    const counts = {};
    EEG_ELECTRODES.forEach(e => counts[e.region] = (counts[e.region] || 0) + 1);
    wrap.innerHTML = Object.values(EEG_REGIONS).map(rg => `
      <button class="leg-item ${state.region === rg.id ? 'active' : ''}" data-region="${rg.id}">
        <i style="background:${rg.color}"></i>
        <span>${rg.label}</span>
        <em>${counts[rg.id] || 0}</em>
      </button>`).join('') +
      `<button class="leg-item leg-all ${!state.region ? 'active' : ''}" data-region="">
        <span>Pokaż wszystkie</span><em>${EEG_ELECTRODES.length}</em>
      </button>`;
    wrap.querySelectorAll('.leg-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.dataset.region || null;
        state.region = (state.region === rid) ? null : rid;
        buildLegend(); save();
      });
    });
  }

  function bindToggles() {
    const map = [
      ['tg-labels', 'showLabels'],
      ['tg-grid', 'showGrid'],
      ['tg-analytical', 'showAnalytical'],
    ];
    map.forEach(([id, key]) => {
      const el = document.getElementById(id);
      el.classList.toggle('on', state[key]);
      el.setAttribute('aria-pressed', state[key]);
      el.addEventListener('click', () => {
        state[key] = !state[key];
        el.classList.toggle('on', state[key]);
        el.setAttribute('aria-pressed', state[key]);
        save();
      });
    });
    // widoki
    const views = {
      'v-top':   { yaw: 0, pitch: -1.4 },
      'v-front': { yaw: 0, pitch: 0 },
      'v-left':  { yaw: -Math.PI / 2, pitch: 0 },
      'v-right': { yaw:  Math.PI / 2, pitch: 0 },
      'v-back':  { yaw:  Math.PI, pitch: 0 },
      'v-iso':   { yaw: -0.55, pitch: -0.62 },
    };
    Object.entries(views).forEach(([id, v]) => {
      document.getElementById(id).addEventListener('click', () => {
        targetYaw = v.yaw; targetPitch = v.pitch; animating = true;
      });
    });
  }

  /* ---- start ---- */
  function init() {
    resize();
    buildLegend();
    bindToggles();
    renderDetail();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }
  init();

  // ekspozycja dla panelu Tweaks
  window.eegState = state;
  window.eegApi = {
    setAccent(c) { state.accent = c; document.documentElement.style.setProperty('--accent', c); save(); },
    setDotScale(s) { state.dotScale = s; save(); },
    rebuildLegend: buildLegend,
  };
})();
