/* app.jsx — Układ, sterowanie warunkami, panel statystyk (Δ, d Cohena) i Tweaks. */
(function () {
  'use strict';
  const { useState, useMemo } = React;

  const STIM = [
    { id: 'powiadomienie', label: 'Powiadomienie', sub: 'bodziec kluczowy' },
    { id: 'ton', label: 'Ton neutralny', sub: 'kontrola dźwięku' },
    { id: 'natura', label: 'Natura', sub: 'kontrola' },
  ];

  const PALETTES = {
    'Crimson / Blue': { high: '#d6294a', low: '#2b6cb0' },
    'Amber / Teal': { high: '#d97706', low: '#0e8a86' },
    'Magenta / Slate': { high: '#be185d', low: '#475569' },
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "Crimson / Blue",
    "showSEM": true,
    "convention": "pos"
  }/*EDITMODE-END*/;

  // segmentowany przełącznik
  function Segmented({ label, options, value, onChange }) {
    return (
      <div className="seg-group">
        <div className="seg-label">{label}</div>
        <div className="seg" role="tablist">
          {options.map((o) => (
            <button
              key={o.id}
              role="tab"
              aria-selected={value === o.id}
              className={'seg-btn' + (value === o.id ? ' is-active' : '')}
              onClick={() => onChange(o.id)}
            >
              <span className="seg-btn-main">{o.label}</span>
              {o.sub && <span className="seg-btn-sub">{o.sub}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function StatTile({ label, value, unit, tone, hint }) {
    return (
      <div className={'tile' + (tone ? ' tile--' + tone : '')}>
        <div className="tile-label">{label}</div>
        <div className="tile-value">
          {value}{unit && <span className="tile-unit">{unit}</span>}
        </div>
        {hint && <div className="tile-hint">{hint}</div>}
      </div>
    );
  }

  const INTERP = {
    powiadomienie: 'H2 — u grupy High-FOMO amplituda P300 pozostaje wysoka i stabilna we wszystkich blokach (brak wygaszania reakcji orientacyjnej), podczas gdy u Low-FOMO systematycznie maleje — klasyczna habituacja.',
    ton: 'Bodziec neutralny — brak istotnej różnicy między grupami. Efekt jest specyficzny dla semantycznego znaczenia powiadomienia, nie dla dźwięku per se.',
    natura: 'Bodziec kontrolny (natura) — amplitudy niskie i porównywalne w obu grupach. Potwierdza specyficzność efektu dla bodźca kluczowego.',
  };

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [stimulus, setStimulus] = useState('powiadomienie');
    const [block, setBlock] = useState(1);
    const [channel, setChannel] = useState('Pz');
    const [win, setWin] = useState({ a: 300, b: 500 });

    const colors = PALETTES[t.palette] || PALETTES['Crimson / Blue'];

    // statystyki z krzywych docelowych (stabilne, niezależne od animacji)
    const stats = useMemo(() => {
      const cHigh = window.ERP.curve(stimulus, 'High', block, channel);
      const cLow = window.ERP.curve(stimulus, 'Low', block, channel);
      const mH = window.ERP.windowMean(cHigh, win.a, win.b);
      const mL = window.ERP.windowMean(cLow, win.a, win.b);
      const diff = mH - mL;
      const d = window.ERP.cohensD(mH, mL);
      return { mH, mL, diff, d, label: window.ERP.effectLabel(d) };
    }, [stimulus, block, channel, win.a, win.b]);

    const isP300win = win.a >= 280 && win.b <= 520 && (win.b - win.a) >= 120;

    return (
      <div className="page" style={{ '--c-high': colors.high, '--c-low': colors.low }}>
        <div className="sheet">
          <header className="head">
            <div className="eyebrow">04 · Oczekiwane wyniki — komponent P300 (ERP)</div>
            <h1>Reakcja orientacyjna na powiadomienie</h1>
            <p className="dek">
              Symulowane uśrednienie ERP (grand average) z elektrod ciemieniowo-centralnych.
              Porównanie amplitudy <b style={{ color: colors.high }}>P300</b> między grupami
              <b> High-FOMO</b> i <b>Low-FOMO</b>. Przeciągnij zacienione okno pomiarowe,
              aby wyznaczyć średnią amplitudę w dowolnym przedziale czasowym.
            </p>
            <div className="meta">
              <span><i>Kanał</i> {channel}</span>
              <span><i>Okno analizy</i> 300–500 ms</span>
              <span><i>Próba</i> N = 40 (2 × 20)</span>
              <span><i>Bodziec</i> {STIM.find(s => s.id === stimulus).label}</span>
            </div>
          </header>

          <div className="controls">
            <Segmented label="Bodziec" value={stimulus} onChange={setStimulus}
              options={STIM.map(s => ({ id: s.id, label: s.label, sub: s.sub }))} />
            <Segmented label="Blok powtórzeń · habituacja" value={block} onChange={setBlock}
              options={[{ id: 1, label: 'Blok 1' }, { id: 2, label: 'Blok 2' }, { id: 3, label: 'Blok 3' }]} />
            <Segmented label="Elektroda" value={channel} onChange={setChannel}
              options={[{ id: 'Pz', label: 'Pz' }, { id: 'Cz', label: 'Cz' }]} />
          </div>

          <div className="legend">
            <span className="lg"><i style={{ background: colors.high }}></i>High-FOMO <em>n = 20</em></span>
            <span className="lg"><i style={{ background: colors.low }}></i>Low-FOMO <em>n = 20</em></span>
            <span className="lg lg--band"><i></i>±1 SEM</span>
            <span className="lg lg--win"><i></i>okno pomiarowe</span>
          </div>

          <div className="chart-wrap">
            <div className="y-axis-label">Amplituda&nbsp;(μV){t.convention === 'neg' ? ' · − w górę' : ''}</div>
            <div className="chart-inner">
              <ERPChart
                stimulus={stimulus} block={block} channel={channel}
                win={win} onWindowChange={setWin}
                colors={colors} showSEM={t.showSEM} convention={t.convention}
                height={460}
              />
              <div className="x-axis-label">Czas od emisji bodźca (ms) — 0 ms = bodziec</div>
            </div>
          </div>

          <div className="winbar">
            <span className="winbar-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7L4 11l4 4M16 7l4 4-4 4M4 11h16"/></svg>
              Przeciągnij okno, by je przesunąć · złap krawędź, by zmienić szerokość
            </span>
            <button className="reset-btn" onClick={() => setWin({ a: 300, b: 500 })}>
              Okno P300 (300–500 ms)
            </button>
          </div>

          <div className="stats">
            <StatTile label="Okno pomiarowe" value={`${Math.round(win.a)}–${Math.round(win.b)}`} unit="ms"
              hint={isP300win ? 'pokrywa P300' : 'poza standardowym oknem'} />
            <StatTile label="Średnia High-FOMO" value={stats.mH.toFixed(2)} unit="μV" tone="high" />
            <StatTile label="Średnia Low-FOMO" value={stats.mL.toFixed(2)} unit="μV" tone="low" />
            <StatTile label="Różnica Δ" value={(stats.diff >= 0 ? '+' : '') + stats.diff.toFixed(2)} unit="μV" />
            <StatTile label="d Cohena" value={stats.d.toFixed(2)} tone="accent" hint={`efekt: ${stats.label}`} />
          </div>

          <p className="interp">
            <b>Interpretacja.</b> {INTERP[stimulus]}
          </p>
          <p className="foot">
            Dane symulowane na potrzeby wizualizacji oczekiwanego wzorca (schemat kierunkowy wg Tabeli 1).
            Wartości amplitud i d Cohena nie pochodzą z pomiaru. Konwencja: dodatnia amplituda w górę,
            baseline −200–0 ms. Test hipotezy H2: mieszana ANOVA Grupa × Bodziec × Blok.
          </p>
        </div>

        <TweaksPanel>
          <TweakSection label="Krzywe" />
          <TweakSelect label="Paleta grup" value={t.palette}
            options={Object.keys(PALETTES)}
            onChange={(v) => setTweak('palette', v)} />
          <TweakToggle label="Pasmo ±1 SEM" value={t.showSEM}
            onChange={(v) => setTweak('showSEM', v)} />
          <TweakSection label="Oś amplitudy" />
          <TweakRadio label="Konwencja" value={t.convention}
            options={[{ value: 'pos', label: '+ w górę' }, { value: 'neg', label: '− w górę' }]}
            onChange={(v) => setTweak('convention', v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
