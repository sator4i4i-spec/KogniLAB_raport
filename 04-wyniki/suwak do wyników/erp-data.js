/* erp-data.js — Symulowany model danych ERP (P300) dla badania FOMO.
   Krzywe grand-average generowane jako suma komponentów (N100, P200, P300, slow wave)
   z deterministycznym, ziarnistym szumem — żeby wyglądały jak realne uśrednienia EEG.
   Wszystkie wartości w μV; oś czasu w ms (od -200 do 800). */
(function () {
  'use strict';

  const T_MIN = -200;
  const T_MAX = 800;
  const DT = 2;            // krok próbkowania (ms) -> 501 próbek
  const N_PER_GROUP = 20;  // liczebność grupy (z dokumentu: N=40, 20+20)

  // --- deterministyczny pseudolosowy szum (hash -> [-1,1]) ---
  function hash(x) {
    let h = Math.sin(x * 127.1 + 311.7) * 43758.5453;
    return (h - Math.floor(h)) * 2 - 1;
  }
  // gładki szum: interpolacja między punktami hash
  function smoothNoise(t, seed) {
    const s = (t + 1000) * 0.06 + seed * 17.3;
    const i = Math.floor(s);
    const f = s - i;
    const u = f * f * (3 - 2 * f);
    return hash(i + seed) * (1 - u) + hash(i + 1 + seed) * u;
  }

  function gauss(t, center, amp, width) {
    const d = (t - center) / width;
    return amp * Math.exp(-0.5 * d * d);
  }

  /* Szczytowa amplituda P300 (μV) wg bodźca / grupy / bloku.
     Powiadomienie: High-FOMO wysoka i stabilna; Low-FOMO umiarkowana, malejąca (habituacja).
     Ton / Natura: brak różnic grupowych — efekt specyficzny dla znaczenia powiadomienia. */
  const P300_AMP = {
    powiadomienie: {
      High: [12.0, 11.6, 11.1],
      Low:  [7.2, 5.6, 4.3],
    },
    ton: {
      High: [4.2, 3.8, 3.4],
      Low:  [4.0, 3.7, 3.3],
    },
    natura: {
      High: [3.1, 3.0, 2.9],
      Low:  [3.0, 2.9, 2.8],
    },
  };

  // Pz daje nieco wyższy P300 niż Cz (klasyczna topografia ciemieniowa).
  const CHANNEL_SCALE = { Pz: 1.0, Cz: 0.86 };

  // międzyosobnicze SD amplitudy okna (μV) — do d Cohena
  const GROUP_SD = { High: 3.0, Low: 2.7 };

  function p300Amp(stimulus, group, block, channel) {
    const base = P300_AMP[stimulus][group][block - 1];
    return base * CHANNEL_SCALE[channel];
  }

  // pojedyncza próbka krzywej grand-average
  function sample(t, p300, seed) {
    if (t < -50) {
      // okres bazowy: ~0 z drobnym szumem
      return smoothNoise(t, seed) * 0.35;
    }
    let v = 0;
    v += gauss(t, 95, -2.4, 32);                 // N100 (negatywny)
    v += gauss(t, 195, 2.6, 38);                 // P200
    // P300: szczyt nieco później dla mniejszych amplitud (habituacja przesuwa latencję)
    const peakCenter = 360 + (12 - p300) * 6;
    v += gauss(t, peakCenter, p300, 78);         // P300
    v += gauss(t, 540, p300 * 0.18 + 0.6, 150);  // slow wave / tail
    v += smoothNoise(t, seed) * 0.4;             // ziarnisty szum
    return v;
  }

  // SEM(t) — rośnie tam, gdzie sygnał większy
  function semAt(t, p300, seed) {
    const env = Math.abs(gauss(t, 360, p300, 90)) * 0.12 + 0.45;
    return env * (1 + smoothNoise(t, seed + 91) * 0.12);
  }

  // Zwraca tablicę próbek {t, v, sem} dla danej konfiguracji
  function curve(stimulus, group, block, channel) {
    const p300 = p300Amp(stimulus, group, block, channel);
    const seed = (group === 'High' ? 3 : 11) + block * 5 + (channel === 'Pz' ? 0 : 23)
               + ({ powiadomienie: 0, ton: 50, natura: 100 })[stimulus];
    const out = [];
    for (let t = T_MIN; t <= T_MAX; t += DT) {
      out.push({ t, v: sample(t, p300, seed), sem: semAt(t, p300, seed) });
    }
    return out;
  }

  // średnia amplituda w oknie [a,b] ms dla krzywej
  function windowMean(curveData, a, b) {
    let sum = 0, n = 0;
    for (const p of curveData) {
      if (p.t >= a && p.t <= b) { sum += p.v; n++; }
    }
    return n ? sum / n : 0;
  }

  // szczyt P300 (maksimum) w oknie 250–550 ms
  function peak(curveData) {
    let best = { t: 0, v: -Infinity };
    for (const p of curveData) {
      if (p.t >= 250 && p.t <= 560 && p.v > best.v) best = p;
    }
    return best;
  }

  // d Cohena z różnicy średnich okna i połączonego SD
  function cohensD(meanHigh, meanLow) {
    const sH = GROUP_SD.High, sL = GROUP_SD.Low;
    const pooled = Math.sqrt((sH * sH + sL * sL) / 2);
    return (meanHigh - meanLow) / pooled;
  }

  function effectLabel(d) {
    const a = Math.abs(d);
    if (a < 0.2) return 'brak / znikomy';
    if (a < 0.5) return 'mały';
    if (a < 0.8) return 'średni';
    return 'duży';
  }

  window.ERP = {
    T_MIN, T_MAX, DT, N_PER_GROUP, GROUP_SD,
    curve, windowMean, peak, cohensD, effectLabel, p300Amp,
  };
})();
