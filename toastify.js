/*!
 * Toastify v1.0.0 — lightweight, dependency-free toast notifications
 * Designed & built by Edin
 *
 * Usage:
 *   Toastify.success('Saved!');
 *   Toastify.show({ type: 'info', title: 'Heads up', message: 'Hello', position: 'bottom-left' });
 *   Toastify.configure({ position: 'top-center', duration: 5000, theme: 'dark' });
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.Toastify = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

  const POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  const POSITION_ALIASES = { top: 'top-center', bottom: 'bottom-center', 'top-middle': 'top-center', 'bottom-middle': 'bottom-center' };
  const TYPES = ['default', 'success', 'error', 'warning', 'info', 'loading'];
  const ANIMATIONS = ['slide', 'fade', 'zoom', 'bounce'];
  const THEMES = ['light', 'dark', 'colored', 'auto'];

  const DEFAULTS = {
    // Placement
    position: 'top-right',   // top-left | top-center | top-right | bottom-left | bottom-center | bottom-right
    newestOnTop: null,       // null = auto (true for top positions, false for bottom)
    maxToasts: 5,            // max visible per position; oldest is dismissed first

    // Content
    type: 'default',         // default | success | error | warning | info | loading
    title: '',
    message: '',
    html: false,             // treat message as HTML (only use with trusted content)
    icon: null,              // custom icon: HTML string or DOM Node; false hides it
    showIcon: true,
    actions: [],             // [{ label, onClick(toast, event), primary, closeOnClick, className }]

    // Behaviour
    duration: 4000,          // ms; 0 or Infinity = stays until dismissed
    closable: true,          // show close (×) button
    closeOnClick: false,     // click anywhere on the toast to dismiss
    pauseOnHover: true,
    pauseOnFocusLoss: true,  // pause while the browser tab/window is not focused
    showProgress: true,
    draggable: true,         // swipe/drag horizontally to dismiss
    dragThreshold: 80,       // px needed to dismiss via drag

    // Look
    theme: 'light',          // light | dark | colored | auto (follows OS)
    animation: 'slide',      // slide | fade | zoom | bounce
    className: '',           // extra class(es) on the toast element

    // Layout (applies to containers, set via configure)
    width: 360,
    offset: 16,              // distance from the screen edge
    gap: 12,                 // space between toasts
    zIndex: 9999,
    nonce: null,             // CSP nonce for the injected <style>

    // Accessibility
    ariaLive: null,          // null = auto ('assertive' for error/warning, else 'polite')
    closeLabel: 'Close notification',

    // Callbacks
    onOpen: null,            // (toast) => {}
    onClose: null,           // (toast) => {}
    onClick: null            // (toast, event) => {}
  };

  // Per-type overrides applied before user options
  const TYPE_DEFAULTS = {
    loading: { duration: 0, closable: false, showProgress: false, draggable: false }
  };

  const svg = (d) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

  const ICONS = {
    default: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    success: svg('<path d="M20 6 9 17l-5-5"/>'),
    error: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    warning: svg('<path d="M12 7v6M12 17h.01"/>'),
    info: svg('<path d="M12 11v6M12 7h.01"/>'),
    loading: '<span class="tl-spinner"></span>'
  };
  const CLOSE_ICON = svg('<path d="M18 6 6 18M6 6l12 12"/>');

  const CSS = `
.tl-container{position:fixed;z-index:var(--tl-z,9999);display:flex;flex-direction:column;width:var(--tl-width,360px);max-width:calc(100vw - 2 * var(--tl-offset,16px));pointer-events:none;box-sizing:border-box}
.tl-container[data-position^="top"]{top:calc(var(--tl-offset,16px) - var(--tl-gap,12px) / 2)}
.tl-container[data-position^="bottom"]{bottom:calc(var(--tl-offset,16px) - var(--tl-gap,12px) / 2)}
.tl-container[data-position$="left"]{left:var(--tl-offset,16px);--tl-fx:-110%;--tl-fy:0px}
.tl-container[data-position$="right"]{right:var(--tl-offset,16px);--tl-fx:110%;--tl-fy:0px}
.tl-container[data-position$="center"]{left:50%;transform:translateX(-50%);--tl-fx:0px}
.tl-container[data-position="top-center"]{--tl-fy:-130%}
.tl-container[data-position="bottom-center"]{--tl-fy:130%}
.tl-item{padding:calc(var(--tl-gap,12px) / 2) 0;box-sizing:border-box}
.tl-item.tl-collapse{overflow:hidden;padding-top:0;padding-bottom:0;transition:height .22s ease,padding .22s ease}
.tl-toast{--tl-accent:#6b7280;--tl-bg:#fff;--tl-fg:#111827;--tl-muted:#4b5563;--tl-border:rgba(17,24,39,.09);--tl-shadow:0 12px 32px -12px rgba(17,24,39,.28),0 4px 10px -6px rgba(17,24,39,.12);
  position:relative;pointer-events:auto;display:flex;align-items:flex-start;gap:12px;padding:14px 12px 14px 14px;background:var(--tl-bg);color:var(--tl-fg);border:1px solid var(--tl-border);border-radius:12px;box-shadow:var(--tl-shadow);overflow:hidden;box-sizing:border-box;
  font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;text-align:left;touch-action:pan-y}
.tl-toast *{box-sizing:border-box}
.tl-toast[data-type="success"]{--tl-accent:#16a34a}
.tl-toast[data-type="error"]{--tl-accent:#dc2626}
.tl-toast[data-type="warning"]{--tl-accent:#d97706}
.tl-toast[data-type="info"]{--tl-accent:#2563eb}
.tl-toast[data-type="loading"]{--tl-accent:#6b7280}
.tl-toast[data-theme="dark"]{--tl-bg:#18181b;--tl-fg:#f4f4f5;--tl-muted:#a1a1aa;--tl-border:rgba(255,255,255,.09);--tl-shadow:0 12px 32px -12px rgba(0,0,0,.7)}
@media (prefers-color-scheme:dark){.tl-toast[data-theme="auto"]{--tl-bg:#18181b;--tl-fg:#f4f4f5;--tl-muted:#a1a1aa;--tl-border:rgba(255,255,255,.09);--tl-shadow:0 12px 32px -12px rgba(0,0,0,.7)}}
.tl-toast[data-theme="colored"]{--tl-bg:var(--tl-accent);--tl-fg:#fff;--tl-muted:rgba(255,255,255,.88);--tl-border:transparent}
.tl-toast[data-theme="colored"][data-type="default"],.tl-toast[data-theme="colored"][data-type="loading"]{--tl-accent:#374151}
.tl-icon{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:var(--tl-accent);background:color-mix(in srgb,var(--tl-accent) 14%,transparent)}
.tl-toast[data-theme="colored"] .tl-icon{color:#fff;background:rgba(255,255,255,.2)}
.tl-icon svg{width:16px;height:16px;display:block}
.tl-body{flex:1;min-width:0;padding-top:3px}
.tl-title{font-weight:600;margin:0 0 2px}
.tl-message{color:var(--tl-muted);overflow-wrap:anywhere}
.tl-message.tl-solo{color:var(--tl-fg)}
.tl-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.tl-action{font:inherit;font-size:13px;font-weight:600;line-height:1;padding:7px 11px;border-radius:8px;border:1px solid var(--tl-border);background:transparent;color:var(--tl-fg);cursor:pointer}
.tl-action:hover{background:color-mix(in srgb,var(--tl-fg) 7%,transparent)}
.tl-action.tl-primary{background:var(--tl-accent);color:#fff;border-color:transparent}
.tl-toast[data-theme="colored"] .tl-action{border-color:rgba(255,255,255,.4)}
.tl-toast[data-theme="colored"] .tl-action.tl-primary{background:#fff;color:var(--tl-accent)}
.tl-close{flex:none;width:26px;height:26px;margin:-2px -2px 0 0;display:grid;place-items:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--tl-muted);cursor:pointer;opacity:.75}
.tl-close:hover{opacity:1;background:color-mix(in srgb,var(--tl-fg) 8%,transparent)}
.tl-close svg{width:15px;height:15px}
.tl-action:focus-visible,.tl-close:focus-visible{outline:2px solid var(--tl-accent);outline-offset:2px}
.tl-toast[data-theme="colored"] .tl-close:focus-visible,.tl-toast[data-theme="colored"] .tl-action:focus-visible{outline-color:#fff}
.tl-progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--tl-accent);opacity:.85;transform-origin:left center;animation:tl-progress linear forwards}
.tl-toast[data-theme="colored"] .tl-progress{background:rgba(255,255,255,.6)}
.tl-spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:tl-spin .7s linear infinite}
.tl-toast.tl-enter,.tl-toast.tl-exit{animation-duration:.35s;animation-fill-mode:both;animation-timing-function:cubic-bezier(.21,1.02,.73,1)}
.tl-toast.tl-exit{animation-direction:reverse;animation-duration:.25s;animation-timing-function:ease-in}
.tl-toast[data-anim="slide"].tl-enter,.tl-toast[data-anim="slide"].tl-exit,.tl-toast[data-anim="bounce"].tl-exit{animation-name:tl-slide}
.tl-toast[data-anim="fade"].tl-enter,.tl-toast[data-anim="fade"].tl-exit{animation-name:tl-fade}
.tl-toast[data-anim="zoom"].tl-enter,.tl-toast[data-anim="zoom"].tl-exit{animation-name:tl-zoom}
.tl-toast[data-anim="bounce"].tl-enter{animation-name:tl-bounce;animation-duration:.55s;animation-timing-function:ease-out}
@keyframes tl-slide{from{opacity:0;transform:translate(var(--tl-fx,0px),var(--tl-fy,0px))}to{opacity:1;transform:none}}
@keyframes tl-fade{from{opacity:0}to{opacity:1}}
@keyframes tl-zoom{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes tl-bounce{0%{opacity:0;transform:translate(var(--tl-fx,0px),var(--tl-fy,0px))}60%{opacity:1;transform:translate(calc(var(--tl-fx,0px) * -.05),calc(var(--tl-fy,0px) * -.08))}80%{transform:translate(calc(var(--tl-fx,0px) * .02),calc(var(--tl-fy,0px) * .03))}100%{opacity:1;transform:none}}
@keyframes tl-progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes tl-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.tl-toast.tl-enter,.tl-toast.tl-exit{animation-name:tl-fade!important;animation-duration:.15s!important}.tl-item.tl-collapse{transition:none}}
@media (max-width:480px){.tl-container{width:auto;max-width:none;left:8px!important;right:8px!important;transform:none!important}.tl-container[data-position$="center"]{--tl-fx:0px}}
`;

  // ---------------------------------------------------------------- state
  let config = assign({}, DEFAULTS);
  const containers = {};
  const toasts = new Map();
  let seq = 0;
  let globalBound = false;

  // ---------------------------------------------------------------- utils
  function assign(target) {
    for (let i = 1; i < arguments.length; i++) {
      const src = arguments[i];
      if (!src) continue;
      for (const k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k) && src[k] !== undefined) target[k] = src[k];
      }
    }
    return target;
  }
  const px = (v) => (typeof v === 'number' ? v + 'px' : String(v));
  const div = (cls) => { const d = document.createElement('div'); d.className = cls; return d; };
  const warn = (msg) => { if (typeof console !== 'undefined') console.warn('[Toastify] ' + msg); };
  const safe = (fn, ...args) => { try { return fn(...args); } catch (e) { if (typeof console !== 'undefined') console.error('[Toastify] callback error', e); } };
  const hasDuration = (o) => typeof o.duration === 'number' && o.duration > 0 && isFinite(o.duration);
  const isNode = (v) => typeof Node !== 'undefined' && v instanceof Node;

  function normalize(input) {
    if (input == null) return {};
    if (typeof input === 'string' || typeof input === 'number' || isNode(input)) return { message: input };
    return assign({}, input);
  }

  function resolve(o) {
    if (POSITION_ALIASES[o.position]) o.position = POSITION_ALIASES[o.position];
    if (POSITIONS.indexOf(o.position) < 0) { warn('Unknown position "' + o.position + '", using "top-right".'); o.position = 'top-right'; }
    if (TYPES.indexOf(o.type) < 0) o.type = 'default';
    if (ANIMATIONS.indexOf(o.animation) < 0) o.animation = 'slide';
    if (THEMES.indexOf(o.theme) < 0) o.theme = 'light';
    if (o.newestOnTop == null) o.newestOnTop = o.position.indexOf('top') === 0;
    return o;
  }

  function buildOptions(userOpts) {
    const type = userOpts.type || config.type;
    return resolve(assign({}, config, TYPE_DEFAULTS[type], userOpts));
  }

  function onEnd(node, type, ms, cb) {
    let done = false;
    const timer = setTimeout(fin, ms);
    function fin(e) {
      if (e && e.target !== node) return;   // ignore bubbling from children
      if (done) return;
      done = true;
      node.removeEventListener(type, fin);
      clearTimeout(timer);
      cb();
    }
    node.addEventListener(type, fin);
  }

  // ---------------------------------------------------------------- DOM setup
  function injectStyles() {
    if (document.getElementById('tl-styles')) return;
    const s = document.createElement('style');
    s.id = 'tl-styles';
    if (config.nonce) s.setAttribute('nonce', config.nonce);
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function applyLayout(c) {
    c.style.setProperty('--tl-offset', px(config.offset));
    c.style.setProperty('--tl-gap', px(config.gap));
    c.style.setProperty('--tl-width', px(config.width));
    c.style.setProperty('--tl-z', String(config.zIndex));
  }

  function getContainer(pos) {
    let c = containers[pos];
    if (c && c.isConnected) return c;
    c = document.createElement('section');
    c.className = 'tl-container';
    c.setAttribute('data-position', pos);
    c.setAttribute('aria-label', 'Notifications');
    applyLayout(c);
    document.body.appendChild(c);
    containers[pos] = c;
    return c;
  }

  function bindGlobal() {
    if (globalBound) return;
    globalBound = true;
    window.addEventListener('blur', () => toasts.forEach((t) => { if (t.opts.pauseOnFocusLoss) pause(t, 'blur'); }));
    window.addEventListener('focus', () => toasts.forEach((t) => resume(t, 'blur')));
  }

  // ---------------------------------------------------------------- timers
  function isPaused(t) { for (const k in t.pauses) if (t.pauses[k]) return true; return false; }

  function run(t) {
    if (t.closing || t.timer || !hasDuration(t.opts)) return;
    t.startedAt = Date.now();
    t.timer = setTimeout(() => { t.timer = null; dismiss(t.id); }, Math.max(0, t.remaining));
    if (t.bar) t.bar.style.animationPlayState = 'running';
  }

  function pause(t, reason) {
    t.pauses[reason] = true;
    if (t.timer) {
      clearTimeout(t.timer);
      t.timer = null;
      t.remaining -= Date.now() - t.startedAt;
    }
    if (t.bar) t.bar.style.animationPlayState = 'paused';
  }

  function resume(t, reason) {
    delete t.pauses[reason];
    if (!isPaused(t)) run(t);
  }

  function resetTimer(t) {
    clearTimeout(t.timer);
    t.timer = null;
    if (!hasDuration(t.opts)) return;
    t.remaining = t.opts.duration;
    if (isPaused(t)) { if (t.bar) t.bar.style.animationPlayState = 'paused'; }
    else run(t);
  }

  // ---------------------------------------------------------------- rendering
  function render(t) {
    const o = t.opts;
    const el = t.el;
    const state = ['tl-enter', 'tl-exit'].filter((c) => el.classList.contains(c));
    el.className = ['tl-toast'].concat(state, o.className ? String(o.className).split(/\s+/).filter(Boolean) : []).join(' ');
    el.setAttribute('data-type', o.type);
    el.setAttribute('data-theme', o.theme);
    el.setAttribute('data-anim', o.animation);
    el.setAttribute('data-id', t.id);

    const urgent = o.type === 'error' || o.type === 'warning';
    el.setAttribute('role', urgent ? 'alert' : 'status');
    el.setAttribute('aria-live', o.ariaLive || (urgent ? 'assertive' : 'polite'));
    el.setAttribute('aria-atomic', 'true');

    el.innerHTML = '';

    // Icon
    if (o.showIcon && o.icon !== false) {
      const icon = o.icon != null ? o.icon : ICONS[o.type];
      if (icon) {
        const ic = div('tl-icon');
        ic.setAttribute('aria-hidden', 'true');
        if (isNode(icon)) ic.appendChild(icon); else ic.innerHTML = String(icon);
        el.appendChild(ic);
      }
    }

    // Body
    const body = div('tl-body');
    if (o.title) {
      const ti = div('tl-title');
      ti.textContent = String(o.title);
      body.appendChild(ti);
    }
    if (o.message !== '' && o.message != null) {
      const m = div('tl-message' + (o.title ? '' : ' tl-solo'));
      if (isNode(o.message)) m.appendChild(o.message);
      else if (o.html) m.innerHTML = String(o.message);
      else m.textContent = String(o.message);
      body.appendChild(m);
    }
    if (o.actions && o.actions.length) {
      const acts = div('tl-actions');
      o.actions.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tl-action' + (a.primary ? ' tl-primary' : '') + (a.className ? ' ' + a.className : '');
        b.textContent = a.label;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof a.onClick === 'function') safe(a.onClick, handle(t), e);
          if (a.closeOnClick !== false) dismiss(t.id);
        });
        acts.appendChild(b);
      });
      body.appendChild(acts);
    }
    el.appendChild(body);

    // Close button
    if (o.closable) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tl-close';
      btn.setAttribute('aria-label', o.closeLabel);
      btn.innerHTML = CLOSE_ICON;
      btn.addEventListener('click', (e) => { e.stopPropagation(); dismiss(t.id); });
      el.appendChild(btn);
    }

    // Progress bar
    t.bar = null;
    if (o.showProgress && hasDuration(o)) {
      const bar = div('tl-progress');
      bar.style.animationDuration = o.duration + 'ms';
      el.appendChild(bar);
      t.bar = bar;
    }
  }

  function bindToast(t) {
    const el = t.el;

    el.addEventListener('mouseenter', () => { if (t.opts.pauseOnHover) pause(t, 'hover'); });
    el.addEventListener('mouseleave', () => resume(t, 'hover'));
    el.addEventListener('focusin', () => pause(t, 'focus'));
    el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) resume(t, 'focus'); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && t.opts.closable) dismiss(t.id); });

    el.addEventListener('click', (e) => {
      if (t.justDragged || t.closing) return;
      if (typeof t.opts.onClick === 'function') safe(t.opts.onClick, handle(t), e);
      if (t.opts.closeOnClick) dismiss(t.id);
    });

    // Swipe / drag to dismiss
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (!t.opts.draggable || t.closing || e.button !== 0) return;
      if (e.target.closest('button,a,input,textarea,select,[contenteditable]')) return;
      drag = { x: e.clientX, dx: 0, id: e.pointerId, moved: false };
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(drag.dx) > 4) {
        drag.moved = true;
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        el.classList.remove('tl-enter');
        el.style.transition = 'none';
        el.style.userSelect = 'none';
        pause(t, 'drag');
      }
      if (drag.moved) {
        el.style.transform = 'translateX(' + drag.dx + 'px)';
        el.style.opacity = String(Math.max(0.2, 1 - Math.abs(drag.dx) / (el.offsetWidth || 300)));
      }
    });
    const endDrag = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      t.justDragged = true;
      setTimeout(() => { t.justDragged = false; }, 0);
      el.style.userSelect = '';
      if (Math.abs(d.dx) >= t.opts.dragThreshold) {
        t.swipe = d.dx > 0 ? 1 : -1;
        dismiss(t.id);
      } else {
        el.style.transition = 'transform .2s ease, opacity .2s ease';
        el.style.transform = '';
        el.style.opacity = '';
        resume(t, 'drag');
      }
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  function handle(t) {
    if (!t.handle) {
      t.handle = {
        id: t.id,
        element: t.el,
        update: (opts) => update(t.id, opts),
        dismiss: () => dismiss(t.id),
        isActive: () => toasts.get(t.id) === t && !t.closing
      };
    }
    return t.handle;
  }

  function enforceLimit(pos, max) {
    if (!max || max < 1 || !isFinite(max)) return;
    const list = [];
    toasts.forEach((t) => { if (t.opts.position === pos && !t.closing) list.push(t); });
    list.sort((a, b) => a.seq - b.seq);
    while (list.length > max) dismiss(list.shift().id);
  }

  function place(t) {
    const c = getContainer(t.opts.position);
    if (t.opts.newestOnTop) c.insertBefore(t.item, c.firstChild);
    else c.appendChild(t.item);
  }

  // ---------------------------------------------------------------- public API
  function show(input) {
    if (!hasDOM) return null;
    const userOpts = normalize(input);

    if (userOpts.id != null) {
      const existing = toasts.get(String(userOpts.id));
      if (existing && !existing.closing) return update(existing.id, userOpts);
    }

    injectStyles();
    bindGlobal();

    const id = userOpts.id != null ? String(userOpts.id) : 'toast-' + (seq + 1);
    const t = {
      id,
      seq: ++seq,
      userOpts,
      opts: buildOptions(userOpts),
      pauses: {},
      timer: null,
      remaining: 0,
      startedAt: 0,
      closing: false
    };

    t.item = div('tl-item');
    t.el = div('tl-toast tl-enter');
    t.item.appendChild(t.el);

    render(t);
    bindToast(t);
    place(t);
    toasts.set(id, t);

    onEnd(t.el, 'animationend', 800, () => { if (!t.closing) t.el.classList.remove('tl-enter'); });
    resetTimer(t);
    enforceLimit(t.opts.position, t.opts.maxToasts);
    if (typeof t.opts.onOpen === 'function') safe(t.opts.onOpen, handle(t));
    return handle(t);
  }

  function update(id, opts) {
    const t = toasts.get(String(id));
    if (!t || t.closing) return null;
    const prevPos = t.opts.position;
    t.userOpts = assign({}, t.userOpts, normalize(opts));
    t.opts = buildOptions(t.userOpts);
    render(t);
    if (t.opts.position !== prevPos) place(t);
    resetTimer(t);
    return handle(t);
  }

  function dismiss(id) {
    const t = toasts.get(String(id));
    if (!t || t.closing) return;
    t.closing = true;
    clearTimeout(t.timer);
    t.timer = null;

    const el = t.el;
    const item = t.item;
    el.style.pointerEvents = 'none';

    const collapse = () => {
      item.style.height = item.offsetHeight + 'px';
      void item.offsetHeight; // force reflow
      item.classList.add('tl-collapse');
      item.style.height = '0px';
      onEnd(item, 'transitionend', 320, () => remove(t));
    };

    if (t.swipe) {
      el.style.transition = 'transform .2s ease, opacity .2s ease';
      el.style.transform = 'translateX(' + t.swipe * 120 + '%)';
      el.style.opacity = '0';
      onEnd(el, 'transitionend', 260, collapse);
    } else {
      el.classList.remove('tl-enter');
      void el.offsetWidth; // restart animation
      el.classList.add('tl-exit');
      onEnd(el, 'animationend', 400, collapse);
    }
  }

  function remove(t) {
    if (t.item.parentNode) t.item.parentNode.removeChild(t.item);
    if (toasts.get(t.id) === t) toasts.delete(t.id);
    if (typeof t.opts.onClose === 'function') safe(t.opts.onClose, handle(t));
  }

  function dismissAll(position) {
    if (position && POSITION_ALIASES[position]) position = POSITION_ALIASES[position];
    Array.from(toasts.values()).forEach((t) => {
      if (!position || t.opts.position === position) dismiss(t.id);
    });
  }

  function promise(p, msgs, opts) {
    msgs = msgs || {};
    const pick = (m, v, fallback) => {
      if (typeof m === 'function') m = m(v);
      return m == null ? fallback : m;
    };
    const h = show(assign({}, opts, normalize(msgs.loading != null ? msgs.loading : 'Loading…'), { type: 'loading' }));
    const pr = new Promise((res) => res(typeof p === 'function' ? p() : p));
    pr.then(
      (v) => { if (h) update(h.id, assign({ title: '' }, normalize(pick(msgs.success, v, 'Done')), { type: 'success' })); },
      (err) => { if (h) update(h.id, assign({ title: '' }, normalize(pick(msgs.error, err, 'Something went wrong')), { type: 'error' })); }
    );
    return pr;
  }

  function configure(opts) {
    assign(config, opts);
    resolve(config);
    if (opts && !('newestOnTop' in opts)) config.newestOnTop = DEFAULTS.newestOnTop;
    if (hasDOM) Object.keys(containers).forEach((k) => applyLayout(containers[k]));
    return api;
  }

  function reset() {
    config = assign({}, DEFAULTS);
    if (hasDOM) Object.keys(containers).forEach((k) => applyLayout(containers[k]));
    return api;
  }

  function destroy() {
    toasts.forEach((t) => clearTimeout(t.timer));
    toasts.clear();
    Object.keys(containers).forEach((k) => {
      const c = containers[k];
      if (c && c.parentNode) c.parentNode.removeChild(c);
      delete containers[k];
    });
    if (hasDOM) {
      const s = document.getElementById('tl-styles');
      if (s) s.parentNode.removeChild(s);
    }
  }

  const typed = (type) => (msg, opts) => show(assign(normalize(msg), opts, { type }));

  const api = {
    version: VERSION,
    positions: POSITIONS.slice(),
    types: TYPES.slice(),
    show,
    success: typed('success'),
    error: typed('error'),
    warning: typed('warning'),
    info: typed('info'),
    loading: typed('loading'),
    promise,
    update,
    dismiss,
    dismissAll,
    configure,
    getConfig: () => assign({}, config),
    reset,
    destroy,
    isActive: (id) => { const t = toasts.get(String(id)); return !!t && !t.closing; },
    count: (position) => {
      let n = 0;
      toasts.forEach((t) => { if (!t.closing && (!position || t.opts.position === position)) n++; });
      return n;
    }
  };

  return api;
});
