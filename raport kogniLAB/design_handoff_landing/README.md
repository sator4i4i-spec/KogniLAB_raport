# Handoff: kogniLAB — Landing strony interaktywnego raportu (FOMO / EEG)

> **TL;DR dla developera:** To są **referencje projektowe stworzone w HTML** — działające prototypy pokazujące docelowy wygląd i zachowanie, a nie kod produkcyjny do skopiowania 1:1. Zadanie: **odtworzyć ten design w docelowym środowisku** (np. Next.js/React, Astro, Vue, SvelteKit), używając jego komponentów i konwencji. Jeśli środowiska jeszcze nie ma — załóż projekt w najwygodniejszym frameworku (rekomendacja niżej) i zaimplementuj design tam.

---

## 1. Overview

Pierwsza sekcja („landing") interaktywnego raportu z badania naukowego:
**„Neuronalne i behawioralne korelaty zjawiska FOMO (Fear of Missing Out) — badanie przy użyciu EEG"** (autor: D. Satora-Izquierdo, kognitywistyka, UMK × UW, 2025/2026).

Landing ma w 15 sekund przekazać czytelnikowi czym jest projekt i co z niego wynika. Zawiera:
- nagłówek (tytuł + dyscyplina + autor + rok),
- jednozdaniowy podtytuł,
- **animowane tło: ciągła fala EEG** (canvas) z akcentowym kanałem imitującym potencjał wywołany P300,
- **hook**: statystyka „69%" (odsetek młodych z FOMO),
- **pasek nawigacji** z 11 kotwicami do sekcji raportu (sticky, ze scrollspy),
- **streszczenie**: TL;DR („w 15 sekund": pytanie / metoda / hipoteza) + rozwijany pełny abstrakt,
- **przełącznik języka PL/EN** (cała treść dwujęzyczna),
- **tryb edycji („ołówek")**: inline-editing treści z autozapisem do localStorage, eksport do samodzielnego HTML, reset.

## 2. About the Design Files

Pliki w tym pakiecie to **prototypy w czystym HTML/CSS/JS (vanilla, bez frameworka i bez build-stepu)**. Traktuj je jako wierną specyfikację wyglądu i zachowania. Opisane niżej interakcje należy odtworzyć w docelowej aplikacji jej własnymi wzorcami (komponenty, routing, i18n, state) — nie wgrywać tych plików jako produkt.

## 3. Fidelity

**High-fidelity (hifi).** Finalne kolory, typografia, odstępy, animacje i interakcje. Odtwórz UI pixel-perfect, korzystając z bibliotek docelowego repo. Wartości (hex, rozmiary, easingi) podane w sekcji „Design Tokens".

## 4. Dostępne warianty (dwie wersje wizualne tego samego landingu)

| Wariant | Plik | Charakter | Tło hero | Układ |
|---|---|---|---|---|
| **A** | `variant-a.html` | Jasny, klasyczny akademicki | białe, niebieskie linie EEG | wyrównany do lewej |
| **B** | `variant-b.html` | Granatowy, mocny „editorial" | ciemny granat, żółto-niebieskie linie EEG | wyśrodkowany |

Oba dzielą **ten sam JS** (`eeg.js`, `report.js`); różnią się wyłącznie HTML + CSS (osadzony `<style>` w każdym pliku). Wariant wykrywany jest przez `document.body.getAttribute('data-variant')` (`"a"` / `"b"`).

## 5. Layout — sekcja po sekcji

Globalny kontener: `max-width: 1180px`, wyśrodkowany, padding poziomy `28px`.

### 5.1 Nav (sticky top, `z-index:40`)
- Flex w jednej linii: **brand** (logo „kogniLAB" — koło z żółtą kropką, narysowane CSS-em) · **lista linków** (poziomy scroll z maską gradientową po bokach) · **przełącznik PL/EN**.
- Backdrop blur (`backdrop-filter: blur(10–12px)`), dolny border 1px.
- Linki: numer `01`–`11` (mono, akcent) + etykieta. Stan `.is-active` ustawiany przez scrollspy (IntersectionObserver, `rootMargin: -45% 0px -50% 0px`).
- 11 kotwic: `#01-landing`, `#02-wprowadzenie`, `#03-cel-i-hipotezy`, `#04-metodologia`, `#05-wyniki`, `#06-budzet`, `#07-zespol`, `#08-harmonogram`, `#09-glossary`, `#10-bibliografia`, `#11-tworzenie-raportu`. (W tym pliku realnie istnieje tylko `#01-landing` + `#abstract`; reszta to docelowe sekcje raportu.)

### 5.2 Hero (`#01-landing`, `position:relative; overflow:hidden`)
Warstwy (od spodu): `<canvas id="eeg">` (absolutnie, `inset:0`, `z-index:0`) → `.hero__fade` (gradient maskujący, `z-index:1`) → `.hero__inner` (treść, `z-index:2`, padding pionowy ~70px).
Kolejność treści:
1. **eyebrow** — pigułka „Projekt badawczy · Kognitywistyka · 2025/2026" (mono, uppercase, żółta kropka).
2. **h1.title** — serif, `clamp(34–62px)` (A) / `clamp(36–70px)` (B), `line-height` 1.03 (A) / 1.08 (B). Słowo „FOMO" wyróżnione (A: żółte podkreślenie `::after`; B: żółty kolor).
3. **subtitle** — serif, `clamp(18–23px)`, kolor stonowany.
4. **meta** — rząd par „klucz/wartość": Autor · Dyscyplina · Ośrodki (UMK · UW) · Metoda (EEG 64-ch · P300 · FAA), rozdzielone pionowymi kreskami.
5. **hook** — patrz 5.3.
6. **scrollcue** — „Przewiń do streszczenia" + animowana kreska (`@keyframes slide`).

### 5.3 Hook „69%"
- A: karta (białe tło `.94` alpha, border, radius 18px, lewy żółty pasek `::before` 5px, miękki cień). Grid `auto 1fr`.
- B: bez karty — pas między dwiema poziomymi liniami, gigantyczna żółta liczba `clamp(86–160px)` z poświatą `text-shadow`.
- Treść: **69**`%` + zdanie + źródło `Bartosiak i in., 2025 · PLOS ONE` (mono, drobne).

### 5.4 Abstract (`#abstract`)
- Nagłówek sekcji: numer `00` + „Streszczenie/Abstract" + pozioma linia.
- Grid 2 kolumny `1.05fr / 1.35fr` (≤880px → 1 kolumna).
- Lewa: **TL;DR** „W 15 sekund" — 3 kafelki (ikona SVG + tytuł + opis): Pytanie / Metoda / Hipoteza.
- Prawa: **lead** (zawsze widoczny) + **`.abs-more`** (rozwijany; animacja `max-height` 0 → `scrollHeight`, `transition .5s cubic-bezier(.4,0,.2,1)`), przycisk **„Czytaj pełny abstrakt / Zwiń"** (`aria-expanded`), rząd tagów (FOMO, EEG·64-ch, P300, FAA, CPT, N=40).

## 6. Interactions & Behavior

1. **PL/EN** — `report.js` ustawia `data-lang` na `<html>`; CSS pokazuje/ukrywa `.lang-pl` / `.lang-en`. Stan w `localStorage['kognilab-lang']`. W docelowej apce: zastąp natywnym i18n (np. `next-intl`, `vue-i18n`), trzymając dwa komplety stringów.
2. **Rozwijany abstrakt** — toggle `max-height`, przełącza też etykietę przycisku i obraca chevron (`rotate(180deg)`).
3. **Scrollspy** — IntersectionObserver podświetla aktywny link. W SPA z routerem rozważ użycie obserwatora sekcji lub gotowego hooka.
4. **Animacja EEG** — `eeg.js`, opisana w sekcji 8. Respektuje `prefers-reduced-motion` (renderuje statyczną klatkę).
5. **Tryb edycji („ołówek")** — opisany w sekcji 9.

## 7. State Management

- `lang`: `'pl' | 'en'` (persist).
- `abstractExpanded`: `boolean`.
- `activeSection`: id (`'01-landing'…`) ze scrollspy.
- `editing`: `boolean` (tryb ołówka).
- edytowane treści: mapa `key → innerHTML`, persist w `localStorage` pod prefiksem `kognilab-edit:<variant>:`.

## 8. Animacja EEG (`eeg.js`)

- Czyste Canvas 2D, DPR-aware (`min(devicePixelRatio, 2)`), resize-aware (debounce 120ms).
- **7 kanałów** (poziome ślady) rozłożonych na wysokości. Każdy: pozycja `y` (ułamek), amplituda, częstotliwość bazowa, faza, prędkość.
- Sygnał = suma kilku sinusów (alfa/beta + szybki ripple) → wygląda jak realny EEG.
- **Kanał akcentowy** (4. ślad): co `period ≈ 4.6 s` dostaje ostry dodatni „garb" Gaussowski — imitacja **potencjału wywołanego P300**; rysowany kolorem `--gold`, w B z `shadowBlur`.
- **Playhead**: pionowa linia z gradientowym „ogonem" przesuwająca się w prawo (~70 px/s).
- Kolory czyta z CSS vars (`--umk-blue`, `--gold`); jasność/alpha zależne od `data-variant` (a=jasny, b=ciemny).
- W React: opakuj w komponent `<EegBackground variant="a|b" />` z `useRef`+`useEffect`, `requestAnimationFrame`, cleanup na unmount.

## 9. Tryb edycji („ołówek", w `report.js`)

- Lista selektorów `SEL[]` wyznacza edytowalne elementy; dla elementów z dziećmi `.lang-pl/.lang-en` rejestruje osobne klucze `_pl` / `_en`.
- Każdy element dostaje `data-ek` (unikalny klucz) i `contenteditable` w trybie edycji; `input` → zapis `innerHTML` do localStorage. Przy starcie odtwarza zapisane treści.
- **FAB** prawy-dolny: przycisk „Edytuj/Gotowe" (ikona ołówka↔check) + panel: **Pobierz HTML** (klonuje DOM, usuwa UI edycji + `contenteditable` + `data-ek`, **inline'uje zewnętrzne `<script src>` przez fetch**, pobiera samodzielny plik) oraz **Resetuj zmiany** (czyści klucze `localStorage` i przeładowuje).
- Outline edycji: dashed na `[data-ek]`, hover/focus podświetlenie żółte. Ukryte w `@media print`.
- **Uwaga przy porcie:** w produkcji inline-editing zwykle nie jest potrzebny — to udogodnienie prototypu dla autora. Jeśli ma zostać, oprzyj go na realnym CMS/edytorze, a nie na `contenteditable`+localStorage.

## 10. Design Tokens

**Kolory**
| Token | Hex | Użycie |
|---|---|---|
| UMK blue | `#034EA1` | primary, linki, akcent |
| UMK blue deep | `#022F63` / `#04203F` (navy) | tła B, hover |
| Gold | `#FFCD00` | akcent, „FOMO", P300, 69% |
| Gold deep | `#E0A900` | akcent na jasnym |
| Ink | `#13233B` | tekst główny (jasny motyw) |
| Ink soft | `#43566F` | tekst stonowany |
| Paper | `#FFFFFF` / `#F4F7FB` / `#EAF0F8` | tła jasne |
| Line | `#D9E2EE` / `#E2E8F1` | bordery |
| Dark text | `#EAF1FB` / soft `#A9C2E2` | tekst na granacie (B) |

**Typografia** (Google Fonts)
- Serif (nagłówki/abstrakt): **Source Serif 4** (400–700, italic).
- Sans (UI/body): **IBM Plex Sans** (400–700).
- Mono (etykiety/numery): **IBM Plex Mono** (400–600).
- Skala nagłówka: `clamp(34px,5.4vw,62px)` (A) / `clamp(36px,5.8vw,70px)` (B).

**Spacing / radius / cień**
- Kontener `max-width:1180px`, padding poziomy `28px`.
- Radius: karty `14–18px`, pigułki `100px`, drobne `7–9px`.
- Cień kart: `0 18px 44px -28px rgba(3,78,161,.35)`.
- Easing rozwijania: `cubic-bezier(.4,0,.2,1)`, `.5s`.

**Breakpointy**
- `≤880px`: abstrakt → 1 kolumna. (Pełnej wersji mobilnej nawigacji jeszcze nie ma — patrz „Do dokończenia".)

## 11. Assets

- **Brak plików graficznych.** Logo „kogniLAB" narysowane czystym CSS (koło + żółta kropka). Ikony TL;DR i przyciski to inline SVG (stroke).
- **Logo UMK/UW celowo NIE zostało użyte** (prawa autorskie). Jeśli macie oficjalne znaki uczelni — podmieńcie marker w nav.
- Fonty ładowane z Google Fonts (`<link>` w `<head>`).

## 12. Files (w tym pakiecie)

| Plik | Zawartość |
|---|---|
| `variant-a.html` | Wariant A (jasny) — pełny HTML + osadzony `<style>` |
| `variant-b.html` | Wariant B (granatowy) — pełny HTML + osadzony `<style>` |
| `eeg.js` | Animacja tła EEG (Canvas 2D) — wspólna |
| `report.js` | Język PL/EN, rozwijany abstrakt, scrollspy, tryb edycji — wspólna |

Każdy `variant-*.html` ładuje oba skrypty na końcu `<body>` (`<script src="eeg.js">`, `<script src="report.js">`).

## 13. Rekomendacja portu (jeśli brak istniejącego repo)

- **Astro** lub **Next.js (App Router)** — landing/treść statyczna, dobre SEO.
- i18n: `next-intl` / `astro-i18n`. Komponenty: `<Nav>`, `<Hero>`, `<EegBackground>`, `<Hook>`, `<Abstract>`.
- Animację EEG przenieś 1:1 do `<canvas>` w komponencie klienckim (`requestAnimationFrame` + cleanup).
- CSS: zachowaj zmienne z sekcji 10 jako tokeny (CSS variables / Tailwind theme).

## 14. Do dokończenia (poza zakresem tego landingu)

- Sekcje `02`–`11` raportu (na razie tylko `01-landing` + `#abstract`).
- Responsywna nawigacja mobilna (hamburger) — obecnie pasek scrolluje się poziomo.
- Realny system edycji treści, jeśli ma być produkcyjny.
