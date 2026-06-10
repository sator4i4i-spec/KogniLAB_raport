/* kogniLAB — language toggle, abstract expand, scrollspy */
(function () {
  const root = document.documentElement;

  /* ---- Language PL/EN (persisted) ---- */
  const KEY = 'kognilab-lang';
  const saved = localStorage.getItem(KEY);
  if (saved === 'en' || saved === 'pl') setLang(saved, false);

  function setLang(lang, store = true) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    document.querySelectorAll('.langtog button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    if (store) localStorage.setItem(KEY, lang);
  }
  document.querySelectorAll('.langtog button').forEach(b => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });

  /* ---- Abstract expand/collapse ---- */
  const toggle = document.getElementById('absToggle');
  const more = document.getElementById('absMore');
  if (toggle && more) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      more.setAttribute('aria-hidden', String(open));
      more.style.maxHeight = open ? '0px' : more.scrollHeight + 'px';
      const txt = toggle.querySelector('.abs-toggle__txt');
      if (txt) {
        const pl = open ? 'Czytaj pełny abstrakt' : 'Zwiń abstrakt';
        const en = open ? 'Read full abstract' : 'Collapse abstract';
        txt.innerHTML = `<span class="lang-pl">${pl}</span><span class="lang-en">${en}</span>`;
      }
    });
    // keep height correct on resize when open
    window.addEventListener('resize', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') more.style.maxHeight = more.scrollHeight + 'px';
    });
  }

  /* ---- Scrollspy for nav (only sections present on page) ---- */
  const links = [...document.querySelectorAll('.nav__link')];
  const map = new Map();
  links.forEach(l => {
    const id = l.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) map.set(el, l);
  });
  if (map.size) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('is-active'));
          map.get(e.target)?.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    map.forEach((_, el) => io.observe(el));
  }
})();

/* =====================================================================
   EDIT MODE — pencil toggle, inline editing, autosave, export, reset
   ===================================================================== */
(function () {
  const root = document.documentElement;
  const variant = document.body.getAttribute('data-variant') || 'a';
  const NS = 'kognilab-edit:' + variant + ':';

  /* ---- which text is editable ---- */
  const SEL = [
    '.eyebrow', '.discipline-tag', 'h1.title', '.subtitle',
    '.meta__item .v', '.hook__num', '.hook__body p', '.hook__body .src',
    '.sec-head h2', '.tldr__label', '.tldr__item h3', '.tldr__item p',
    '.abs-full__lead', '.abs-more p', '.abs-tag'
  ];

  const items = []; // {el, key}
  function register(el, key) {
    if (el.dataset.ek) return;            // avoid double-register
    el.dataset.ek = key;
    const saved = localStorage.getItem(NS + key);
    if (saved != null) el.innerHTML = saved;   // restore baked/saved text
    el.addEventListener('input', () => {
      localStorage.setItem(NS + key, el.innerHTML);
    });
    items.push({ el, key });
  }
  function consider(el, baseKey) {
    const langs = el.querySelectorAll(':scope > .lang-pl, :scope > .lang-en');
    if (langs.length) {
      langs.forEach(s => register(s, baseKey + '_' + (s.classList.contains('lang-pl') ? 'pl' : 'en')));
    } else {
      register(el, baseKey);
    }
  }
  SEL.forEach((sel, si) => {
    document.querySelectorAll(sel).forEach((el, i) => consider(el, si + '-' + i));
  });

  /* ---- styles for edit mode ---- */
  const style = document.createElement('style');
  style.setAttribute('data-edit-ui', '');
  style.textContent = `
    html.editing [data-ek]{outline:1px dashed rgba(3,78,161,.45);outline-offset:3px;border-radius:3px;cursor:text;transition:background .15s,outline-color .15s}
    html.editing [data-ek]:hover{outline-color:rgba(3,78,161,.9);background:rgba(255,205,0,.10)}
    html.editing [data-ek]:focus{outline:2px solid #034EA1;background:rgba(255,205,0,.16)}
    body[data-variant="b"] html.editing [data-ek],
    html.editing body[data-variant="b"] [data-ek]{outline-color:rgba(255,205,0,.5)}
    .ed-fab{position:fixed;right:22px;bottom:22px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:"IBM Plex Sans",system-ui,sans-serif}
    .ed-btn{display:flex;align-items:center;gap:9px;border:none;cursor:pointer;border-radius:100px;
      font-family:inherit;font-size:13px;font-weight:600;padding:11px 16px;box-shadow:0 10px 30px -10px rgba(3,30,70,.55);transition:.16s;color:#fff;background:#034EA1}
    .ed-btn:hover{transform:translateY(-1px);box-shadow:0 14px 34px -10px rgba(3,30,70,.6)}
    .ed-btn svg{width:17px;height:17px}
    .ed-btn.is-on{background:#1f8a5b}
    .ed-panel{display:none;flex-direction:column;gap:4px;background:#fff;border:1px solid #d9e2ee;border-radius:14px;padding:8px;box-shadow:0 18px 50px -16px rgba(3,30,70,.45);min-width:208px}
    .ed-panel.open{display:flex}
    .ed-panel__hint{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.04em;color:#64748b;padding:6px 10px 8px;line-height:1.5}
    .ed-act{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;width:100%;text-align:left;
      font-family:inherit;font-size:13px;font-weight:500;color:#13233b;padding:9px 11px;border-radius:9px;transition:.13s}
    .ed-act:hover{background:#f1f5fb}
    .ed-act svg{width:16px;height:16px;color:#034EA1;flex-shrink:0}
    .ed-act.danger{color:#b4321f}.ed-act.danger svg{color:#b4321f}
    @media print{.ed-fab{display:none}}
  `;
  document.head.appendChild(style);

  /* ---- floating control ---- */
  const isPL = () => (root.getAttribute('data-lang') || 'pl') !== 'en';
  const fab = document.createElement('div');
  fab.className = 'ed-fab';
  fab.setAttribute('data-edit-ui', '');
  fab.innerHTML = `
    <div class="ed-panel" id="edPanel">
      <button class="ed-act" data-act="download">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>
        <span class="ed-lbl-download"></span>
      </button>
      <button class="ed-act danger" data-act="reset">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/></svg>
        <span class="ed-lbl-reset"></span>
      </button>
      <div class="ed-panel__hint ed-hint"></div>
    </div>
    <button class="ed-btn" id="edToggle" aria-pressed="false">
      <svg class="ic-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      <svg class="ic-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" style="display:none"><path d="M20 6 9 17l-5-5"/></svg>
      <span class="ed-lbl-toggle"></span>
    </button>`;
  document.body.appendChild(fab);

  const toggleBtn = fab.querySelector('#edToggle');
  const panel = fab.querySelector('#edPanel');
  const icEdit = fab.querySelector('.ic-edit');
  const icDone = fab.querySelector('.ic-done');

  function labels() {
    const pl = isPL();
    fab.querySelector('.ed-lbl-toggle').textContent = editing ? (pl ? 'Gotowe' : 'Done') : (pl ? 'Edytuj' : 'Edit');
    fab.querySelector('.ed-lbl-download').textContent = pl ? 'Pobierz HTML' : 'Download HTML';
    fab.querySelector('.ed-lbl-reset').textContent = pl ? 'Resetuj zmiany' : 'Reset changes';
    fab.querySelector('.ed-hint').textContent = pl
      ? 'Kliknij dowolny tekst, aby go zmienić. Zmiany zapisują się same.'
      : 'Click any text to change it. Changes save automatically.';
  }

  let editing = false;
  function setEditing(on) {
    editing = on;
    root.classList.toggle('editing', on);
    toggleBtn.classList.toggle('is-on', on);
    toggleBtn.setAttribute('aria-pressed', String(on));
    icEdit.style.display = on ? 'none' : '';
    icDone.style.display = on ? '' : 'none';
    panel.classList.toggle('open', on);
    items.forEach(({ el }) => { el.contentEditable = on ? 'true' : 'false'; });
    labels();
  }

  toggleBtn.addEventListener('click', () => setEditing(!editing));

  // language change relabels the button
  document.querySelectorAll('.langtog button').forEach(b =>
    b.addEventListener('click', () => setTimeout(labels, 0)));

  /* ---- reset ---- */
  fab.querySelector('[data-act="reset"]').addEventListener('click', () => {
    const msg = isPL() ? 'Cofnąć wszystkie zmiany w treści?' : 'Discard all text edits?';
    if (!confirm(msg)) return;
    Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
    location.reload();
  });

  /* ---- export current page (with edits baked in) ---- */
  fab.querySelector('[data-act="download"]').addEventListener('click', async () => {
    const clone = document.documentElement.cloneNode(true);
    clone.classList.remove('editing');
    clone.removeAttribute('data-lang');
    clone.querySelectorAll('[data-edit-ui]').forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-ek]').forEach(n => n.removeAttribute('data-ek'));
    // inline external scripts so the file works standalone
    const externs = [...clone.querySelectorAll('script[src]')];
    for (const s of externs) {
      try {
        const code = await (await fetch(s.getAttribute('src'))).text();
        const inl = document.createElement('script');
        inl.textContent = code;
        s.replaceWith(inl);
      } catch (e) { /* keep external ref if fetch fails */ }
    }
    const html = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kogniLAB-landing-' + variant + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  labels();
})();
