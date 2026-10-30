/* Saturday Signature v1.0.3: behaviour for the toggles, tips and sheets.
   No dependencies. Load with <script src="saturday/js/saturday.js" defer></script>.
   Public API: window.Saturday.setTheme('auto' | 'light' | 'dark'), .getTheme(), .init(root)

   Events (bubble from the control):
     sat-change  detail: { checked }  on .sat-switch
     sat-change  detail: { value }    on .sat-seg (value = data-value or text of the chosen button)
     sat-change  detail: { pressed }  on .sat-chip
     sat-theme   detail: { theme, resolved } on document */
(function () {
  'use strict';
  var KEY = 'sat-theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function read() { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: theme still applies for this page */ } }
  function resolved(theme) { return theme === 'auto' ? (media && media.matches ? 'dark' : 'light') : theme; }

  function syncMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = getComputedStyle(root).getPropertyValue('--sat-theme-color').trim() || '';
  }

  function apply(theme) {
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-sat-theme]').forEach(function (b) {
      var on = b.getAttribute('data-sat-theme') === theme;
      if (b.getAttribute('role') === 'radio') { b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('[data-sat-theme-cycle]').forEach(function (b) {
      b.setAttribute('aria-label', 'Theme: ' + theme + '. Change theme');
      b.title = 'Theme: ' + theme;
    });
    syncMeta();
    document.dispatchEvent(new CustomEvent('sat-theme', { detail: { theme: theme, resolved: resolved(theme) } }));
  }

  function setTheme(theme) { if (['auto', 'light', 'dark'].indexOf(theme) < 0) theme = 'auto'; write(theme); apply(theme); }
  function getTheme() { return read(); }

  var CYCLE = { auto: 'light', light: 'dark', dark: 'auto' };

  function emit(el, detail) { el.dispatchEvent(new CustomEvent('sat-change', { bubbles: true, detail: detail })); }

  function selectSeg(group, btn, focus) {
    group.querySelectorAll('[role="radio"]').forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    if (btn.hasAttribute('data-sat-theme')) setTheme(btn.getAttribute('data-sat-theme'));
    else emit(group, { value: btn.getAttribute('data-value') || btn.textContent.trim() });
  }

  function closeTips(except) {
    document.querySelectorAll('.sat-tip.is-open').forEach(function (t) {
      if (t !== except) { t.classList.remove('is-open'); var b = t.querySelector('.sat-tip-btn'); if (b) b.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Centre an open tip under its button, then pull it inside the viewport (8px margin).
  // Sets a plain pixel `left` with no transform, so the tip never widens the page's scroll area.
  function placeTip(tip) {
    var body = tip.querySelector('.sat-tip-body');
    if (!body) return;
    body.style.left = '0px';
    body.style.transform = 'none';
    var w = body.getBoundingClientRect().width;
    if (!w) return;
    var t = tip.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var left = t.left + t.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, vw - 8 - w));
    body.style.left = (left - t.left) + 'px';
  }

  function init(scope) {
    scope = scope || document;
    // Segmented controls: roving tabindex so Tab enters once and arrows move.
    scope.querySelectorAll('.sat-seg').forEach(function (g) {
      var items = g.querySelectorAll('[role="radio"]');
      var any = false;
      items.forEach(function (b) { var on = b.getAttribute('aria-checked') === 'true'; b.tabIndex = on ? 0 : -1; any = any || on; });
      if (!any && items[0]) items[0].tabIndex = 0;
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var sw = t.closest('.sat-switch');
    var row = !sw && t.closest('.sat-switch-row');
    if (row && !t.closest('a, button, input')) sw = row.querySelector('.sat-switch');
    if (sw) {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      emit(sw, { checked: on });
      return;
    }
    var seg = t.closest('.sat-seg [role="radio"]');
    if (seg) { selectSeg(seg.closest('.sat-seg'), seg, false); return; }
    var chip = t.closest('.sat-chip');
    if (chip) {
      var p = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(p));
      emit(chip, { pressed: p });
      return;
    }
    var cyc = t.closest('[data-sat-theme-cycle]');
    if (cyc) { setTheme(CYCLE[read()] || 'auto'); return; }
    var themeBtn = t.closest('[data-sat-theme]');
    if (themeBtn) { setTheme(themeBtn.getAttribute('data-sat-theme')); return; }

    var tipBtn = t.closest('.sat-tip-btn');
    if (tipBtn) {
      var tip = tipBtn.closest('.sat-tip');
      var open = !tip.classList.contains('is-open');
      closeTips(tip);
      tip.classList.toggle('is-open', open);
      tipBtn.setAttribute('aria-expanded', String(open));
      if (open) placeTip(tip);
      return;
    }
    if (!t.closest('.sat-tip')) closeTips(null);

    var opener = t.closest('[data-sat-open]');
    if (opener) {
      var dlg = document.getElementById(opener.getAttribute('data-sat-open'));
      if (dlg && dlg.showModal) dlg.showModal();
      return;
    }
    var closer = t.closest('[data-sat-close]');
    if (closer) { var d = closer.closest('dialog'); if (d) d.close(); return; }
    // Click on the dialog backdrop closes it.
    if (t.tagName === 'DIALOG' && t.classList.contains('sat-sheet')) {
      var r = t.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) t.close();
    }
  });

  document.addEventListener('mouseover', function (e) {
    var tip = e.target.closest && e.target.closest('.sat-tip');
    if (tip) placeTip(tip);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeTips(null);
    var btn = e.target.closest && e.target.closest('.sat-seg [role="radio"]');
    if (!btn) return;
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    e.preventDefault();
    var g = btn.closest('.sat-seg');
    var items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]'));
    var i = items.indexOf(btn), k = keys[e.key];
    var next = k === 'first' ? items[0] : k === 'last' ? items[items.length - 1] : items[(i + k + items.length) % items.length];
    selectSeg(g, next, true);
  });

  if (media) {
    var onOs = function () { if (read() === 'auto') apply('auto'); };
    if (media.addEventListener) media.addEventListener('change', onOs); else if (media.addListener) media.addListener(onOs);
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(read()); });

  window.Saturday = { setTheme: setTheme, getTheme: getTheme, init: init, version: '1.0.3' };

  apply(read());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); apply(read()); });
  else init();
})();
