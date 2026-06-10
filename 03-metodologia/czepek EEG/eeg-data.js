/* ===========================================================================
   Czepek EEG — dane układu 10-10 (rozszerzony 10-20)
   Współrzędne 3D wyliczane parametrycznie na sferze głowy.
   Konwencja osi:  x = prawo,  y = przód (anterior),  z = góra.  Cz = (0,0,1).
   =========================================================================== */

/* Definicja rzędów (kontury przednio-tylne).
   a  = kąt przednio-tylny od wierzchołka (Cz=0°, dodatni = do przodu), krok 18°.
   ns = numery elektrod od lewej do prawej; 'z' = linia środkowa.
   tname = nadpisanie nazwy dla elektrod skroniowych (FT/T/TP). */
const EEG_ROWS = [
  { row: 'Fp', a:  72, ns: [1, 'z', 2] },
  { row: 'AF', a:  54, ns: [7, 3, 'z', 4, 8] },
  { row: 'F',  a:  36, ns: [7, 5, 3, 1, 'z', 2, 4, 6, 8] },
  { row: 'FC', a:  18, ns: [7, 5, 3, 1, 'z', 2, 4, 6, 8], tname: { 7: 'FT7', 8: 'FT8' } },
  { row: 'C',  a:   0, ns: [7, 5, 3, 1, 'z', 2, 4, 6, 8], tname: { 7: 'T7', 8: 'T8' } },
  { row: 'CP', a: -18, ns: [7, 5, 3, 1, 'z', 2, 4, 6, 8], tname: { 7: 'TP7', 8: 'TP8' } },
  { row: 'P',  a: -36, ns: [7, 5, 3, 1, 'z', 2, 4, 6, 8] },
  { row: 'PO', a: -54, ns: [7, 3, 'z', 4, 8] },
  { row: 'O',  a: -72, ns: [1, 'z', 2] },
];

/* Regiony / płaty mózgu */
const EEG_REGIONS = {
  frontal:   { id: 'frontal',   label: 'Płat czołowy',      color: '#3b6fd4',
    fn: 'Funkcje wykonawcze, planowanie, pamięć robocza, uwaga oraz kontrola ruchu i mowy (okolica Broki po lewej).' },
  parietal:  { id: 'parietal',  label: 'Płat ciemieniowy',  color: '#2da56c',
    fn: 'Integracja czuciowa, percepcja przestrzenna, uwaga oraz koordynacja wzrokowo-ruchowa.' },
  central:   { id: 'central',   label: 'Okolica centralna', color: '#0f9fb0',
    fn: 'Kora ruchowa i czuciowa wzdłuż bruzdy środkowej; planowanie i wykonanie ruchu, rytm sensomotoryczny (mu).' },
  temporal:  { id: 'temporal',  label: 'Płat skroniowy',    color: '#e0892f',
    fn: 'Słuch i przetwarzanie mowy (okolica Wernickego), pamięć, rozpoznawanie obiektów oraz przetwarzanie emocji.' },
  occipital: { id: 'occipital', label: 'Płat potyliczny',   color: '#8466c9',
    fn: 'Przetwarzanie wzrokowe — analiza kształtu, koloru, ruchu i orientacji bodźców.' },
};

/* Elektrody analityczne wyróżnione na życzenie + ich noty */
const EEG_ANALYTICAL = {
  Cz: 'Wierzchołek głowy. Kora ruchowa (reprezentacja kończyn dolnych) i rytm mu; częsty kanał odniesienia oraz miejsce rejestracji składowej P300.',
  Pz: 'Linia środkowa ciemieniowa. Klasyczny punkt rejestracji potencjału poznawczego P300 — uwaga i ocena kontekstu bodźca.',
  F3: 'Lewa grzbietowo-boczna kora przedczołowa. Pamięć robocza i funkcje wykonawcze; jeden z biegunów analizy asymetrii czołowej alfa.',
  F4: 'Prawa grzbietowo-boczna kora przedczołowa. Pamięć robocza i regulacja emocji; drugi biegun analizy asymetrii czołowej alfa.',
};

/* Elektrody klasyfikowane jako skroniowe mimo przynależności do rzędu */
const TEMPORAL_OVERRIDE = new Set(['T7','T8','FT7','FT8','TP7','TP8','P7','P8']);

function regionOf(row, name) {
  if (TEMPORAL_OVERRIDE.has(name)) return 'temporal';
  if (row === 'Fp' || row === 'AF' || row === 'F' || row === 'FC') return 'frontal';
  if (row === 'C') return 'central';
  if (row === 'CP' || row === 'P') return 'parietal';
  return 'occipital'; // PO, O
}

const DEG = Math.PI / 180;

/* Budowa listy elektrod z wektorami 3D na sferze jednostkowej */
function buildElectrodes() {
  const list = [];
  for (let r = 0; r < EEG_ROWS.length; r++) {
    const rowDef = EEG_ROWS[r];
    const a = rowDef.a * DEG;
    const cosA = Math.cos(a), sinA = Math.sin(a);
    rowDef.ns.forEach((n, idx) => {
      let name, Lmag, side;
      if (n === 'z') { name = rowDef.row + 'z'; Lmag = 0; side = 'mid'; }
      else {
        const num = n;
        Lmag = Math.ceil(num / 2) * 18;       // 1/2→18, 3/4→36, 5/6→54, 7/8→72
        side = (num % 2 === 1) ? 'left' : 'right';
        name = (rowDef.tname && rowDef.tname[num]) ? rowDef.tname[num] : rowDef.row + num;
      }
      const Lsigned = (side === 'left' ? -1 : 1) * Lmag;
      const L = Lsigned * DEG;
      const vec = {
        x: cosA * Math.sin(L),   // prawo(+)
        y: sinA,                 // przód(+)
        z: cosA * Math.cos(L),   // góra(+)
      };
      const region = regionOf(rowDef.row, name);
      list.push({
        name, row: rowDef.row, rowIndex: r, n, side,
        Lsigned, a: rowDef.a, vec, region,
        analytical: !!EEG_ANALYTICAL[name],
        note: EEG_ANALYTICAL[name] || null,
      });
    });
  }
  // Dodatkowe 3 elektrody do 64 kanałów (Brain Products actiCAP 64):
  // TP9 i TP10 — okolice wyrostka sutkowatego (mastoid), poniżej TP7/TP8
  // Iz — potyliczna (inion), poniżej Oz
  const extra = [
    { name: 'TP9',  row: 'CP', rowIndex: 5, n: 9,  side: 'left',  Lsigned: -90, a: -30,
      vec: { x: -0.82, y: -0.40, z: -0.41 }, region: 'temporal',
      analytical: false, note: null },
    { name: 'TP10', row: 'CP', rowIndex: 5, n: 10, side: 'right', Lsigned:  90, a: -30,
      vec: { x:  0.82, y: -0.40, z: -0.41 }, region: 'temporal',
      analytical: false, note: null },
    { name: 'Iz',   row: 'O',  rowIndex: 8, n: 'z', side: 'mid',  Lsigned:   0, a: -90,
      vec: { x:  0,    y: -0.98, z: -0.20 }, region: 'occipital',
      analytical: false, note: null },
  ];
  extra.forEach(e => list.push(e));
  return list;
}

/* Krawędzie siatki czepka: połączenia w rzędach i w kolumnach */
function buildEdges(electrodes) {
  const edges = [];
  const byName = {};
  electrodes.forEach(e => { byName[e.name] = e; });

  // krawędzie wewnątrz rzędu (sąsiednie elektrody)
  for (let r = 0; r < EEG_ROWS.length; r++) {
    const rowEls = electrodes.filter(e => e.rowIndex === r);
    for (let i = 0; i < rowEls.length - 1; i++) {
      edges.push([rowEls[i], rowEls[i + 1]]);
    }
  }
  // krawędzie kolumnowe: ta sama pozycja boczna (Lsigned) w sąsiednich rzędach
  const cols = {};
  electrodes.forEach(e => {
    (cols[e.Lsigned] = cols[e.Lsigned] || []).push(e);
  });
  Object.values(cols).forEach(colEls => {
    colEls.sort((p, q) => q.a - p.a); // od przodu do tyłu
    for (let i = 0; i < colEls.length - 1; i++) {
      edges.push([colEls[i], colEls[i + 1]]);
    }
  });
  return edges;
}

const EEG_ELECTRODES = buildElectrodes();
const EEG_EDGES = buildEdges(EEG_ELECTRODES);

/* Elektrody kluczowe dla badania FOMO+EEG */
const STUDY_COLORS = { alpha: '#e03a3a', p300: '#2563eb', both: '#8b5cf6' };
const EEG_STUDY = {
  'F3':  { role: 'alpha', label: 'FAA · alfa lewostronny',
    note: 'Lewa grzbietowo-boczna kora przedczołowa (dlPFC), odpowiada za system motywacji dążenia do celu, zaangażowania. Wiąże się ze złością i frustracją gdy cel jest blokowany.' },
  'FC3': { role: 'alpha', label: 'FAA · alfa lewostronny',
    note: 'Lewa grzbietowo-boczna kora przedczołowa (dlPFC), odpowiada za system motywacji dążenia do celu, zaangażowania. Wiąże się ze złością i frustracją gdy cel jest blokowany.' },
  'Fz':  { role: 'both',  label: 'FAA odniesienie + P300',
    note: 'Przyśrodkowa kora przedczołowa (mPFC) oraz dodatkowa kora ruchowa (SMA), centrum kontroli poznawczej, planowania i hamowania impulsów. Punkt odniesienia dla fali alfa. Miejsce sygnału hamującego dla P300.' },
  'FCz': { role: 'alpha', label: 'FAA · alfa środkowy',
    note: 'Przyśrodkowa kora przedczołowa (mPFC) oraz dodatkowa kora ruchowa (SMA), centrum kontroli poznawczej, planowania i hamowania impulsów. Punkt odniesienia dla fali alfa. Miejsce sygnału hamującego dla P300.' },
  'F4':  { role: 'alpha', label: 'FAA · alfa prawostronny',
    note: 'Prawa grzbietowo-boczna kora przedczołowa, odpowiada za system wycofania i unikania (wiąże się z lękiem i niepokojem).' },
  'FC4': { role: 'alpha', label: 'FAA · alfa prawostronny',
    note: 'Prawa grzbietowo-boczna kora przedczołowa, odpowiada za system wycofania i unikania (wiąże się z lękiem i niepokojem).' },
  'Cz':  { role: 'p300',  label: 'P300',
    note: 'Kora czuciowo-ruchowa (zakręt przedśrodkowy i zaśrodkowy — fizyczne wykonywanie ruchów) oraz głęboko położona przednia kora zakrętu obręczy (ACC — wykrywanie konfliktów).' },
  'Pz':  { role: 'p300',  label: 'P300 · główny punkt rejestracji',
    note: 'Przyśrodkowa kora ciemieniowa (skojarzeniowa). Nadawanie bodźcom znaczenia, orientacja przestrzenna i alokacja zasobów uwagi.' },
};
