/* Continuous multi-channel EEG background — kogniLAB
   Reads theme colors from CSS vars; adapts to light/dark via data-variant. */
(function () {
  const canvas = document.getElementById('eeg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  const cs = getComputedStyle(document.body);
  const variant = document.body.getAttribute('data-variant') || 'a';
  const dark = variant === 'b';

  const blue = (cs.getPropertyValue('--umk-blue') || '#034EA1').trim();
  const gold = (cs.getPropertyValue('--gold') || '#FFCD00').trim();
  const lineCol = dark ? 'rgba(160,202,255,0.42)' : 'rgba(3,78,161,0.30)';
  const lineColFaint = dark ? 'rgba(160,202,255,0.22)' : 'rgba(3,78,161,0.16)';
  const accent = gold;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  // channel definitions: label position fraction, amplitude, base freq, phase, speed, accent?
  const CH = [
    { y: 0.14, amp: 13, f: 0.9, ph: 0.0, sp: 1.05, acc: false },
    { y: 0.27, amp: 18, f: 1.3, ph: 1.7, sp: 0.85, acc: false },
    { y: 0.40, amp: 15, f: 1.05, ph: 3.1, sp: 1.25, acc: false },
    { y: 0.53, amp: 22, f: 0.75, ph: 0.6, sp: 0.7, acc: true },   // accent (key stimulus channel, with P300 bumps)
    { y: 0.66, amp: 16, f: 1.5, ph: 2.2, sp: 1.0, acc: false },
    { y: 0.79, amp: 19, f: 1.0, ph: 4.0, sp: 0.9, acc: false },
    { y: 0.91, amp: 12, f: 1.7, ph: 1.1, sp: 1.15, acc: false },
  ];

  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(360, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // pseudo-random but smooth noise via layered sines
  function eegVal(x, t, ch) {
    const k = x * 0.012;
    let v = 0;
    v += Math.sin(k * ch.f + t * ch.sp + ch.ph) * 0.55;
    v += Math.sin(k * ch.f * 2.3 + t * ch.sp * 1.6 + ch.ph * 1.7) * 0.28;
    v += Math.sin(k * ch.f * 4.7 + t * ch.sp * 0.6) * 0.13;
    v += Math.sin(k * 11.0 + t * 3.0 + ch.ph) * 0.06; // fast beta ripple
    // periodic P300-like evoked bump on accent channel
    if (ch.acc) {
      const period = 4.6;
      const local = ((t * ch.sp + x * 0.0009) % period + period) % period;
      const center = 1.4;
      const d = local - center;
      v += Math.exp(-(d * d) / 0.06) * 1.5; // sharp positive deflection
    }
    return v * ch.amp;
  }

  let t0 = performance.now();
  function frame(now) {
    const t = reduce ? 2.0 : (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);

    const step = 4;
    for (let ci = 0; ci < CH.length; ci++) {
      const ch = CH[ci];
      const baseY = H * ch.y;
      ctx.beginPath();
      for (let x = -2; x <= W + 2; x += step) {
        const y = baseY - eegVal(x, t, ch);
        if (x === -2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (ch.acc) {
        ctx.strokeStyle = accent;
        ctx.globalAlpha = dark ? 0.85 : 0.7;
        ctx.lineWidth = 1.7;
        ctx.shadowColor = accent;
        ctx.shadowBlur = dark ? 8 : 0;
      } else {
        ctx.strokeStyle = ci % 2 ? lineColFaint : lineCol;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.3;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // moving scan playhead
    if (!reduce) {
      const px = ((t * 70) % (W + 120)) - 60;
      const grad = ctx.createLinearGradient(px - 50, 0, px + 10, 0);
      grad.addColorStop(0, 'rgba(255,205,0,0)');
      grad.addColorStop(1, dark ? 'rgba(255,205,0,0.18)' : 'rgba(255,205,0,0.13)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - 50, 0, 60, H);
      ctx.strokeStyle = dark ? 'rgba(255,205,0,0.45)' : 'rgba(224,169,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }

    if (!reduce) requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { resize(); if (reduce) requestAnimationFrame(frame); }, 120); });
})();
