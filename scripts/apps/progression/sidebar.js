/**
 * scripts/apps/progression/sidebar.js
 * SWSEProgressionSidebar v2 - defensive mounting, partial updates, disconnect, keyboard improvements
 */
export class SWSEProgressionSidebar {
  constructor() {
    // Defensive single-instance
    if (window.SWSE_PROG_SIDEBAR) {
      console.warn("SWSE Sidebar: instance already present; returning existing instance.");
      return window.SWSE_PROG_SIDEBAR;
    }
    this.root = document.querySelector('.swse-prog-sidebar');
    this._steps = [];
    this._boundRefresh = this.refresh.bind(this);
    this._init();
    window.SWSE_PROG_SIDEBAR = this;
  }

  _init() {
    if (!this.root) {
      console.warn("SWSE Sidebar: mount element missing; the template should be rendered by an app or engine-autoload.");
      // listen for future initialization signals
      Hooks.once('swse:progression:init', () => {
        this.root = document.querySelector('.swse-prog-sidebar');
        if (this.root) this._bindEvents();
        this.refresh();
      });
      return;
    }
    this._bindEvents();
    this.refresh();
    Hooks.on('swse:progression:updated', this._boundRefresh);
    Hooks.once('ready', this._boundRefresh);
  }

  _bindEvents() {
    if (!this.root) return;
    // Mouse click navigation
    this.root.addEventListener('click', (ev) => {
      const step = ev.target.closest('.swse-prog-step');
      if (!step) return;
      const id = step.dataset.stepId;
      if (!id) return;
      const locked = step.classList.contains('locked');
      const current = step.classList.contains('current');
      const completed = step.classList.contains('completed');
      if (locked && !completed && !current) {
        step.classList.add('swse-wiggle');
        setTimeout(()=>step.classList.remove('swse-wiggle'),400);
        ui.notifications?.warn("That step is locked.");
        return;
      }
      Hooks.call('swse:sidebar:navigate', id);
    }, { capture: true });

    const btn = this.root.querySelector('.btn-collapse');
    if (btn) btn.addEventListener('click', () => {
      this.root.classList.toggle('collapsed');
    });

    // keyboard navigation & accessibility
    this.root.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const items = Array.from(this.root.querySelectorAll('.swse-prog-step'));
        if (!items.length) return;
        let idx = items.findIndex(i => i === document.activeElement);
        if (idx < 0) idx = 0;
        let next = idx;
        if (ev.key === 'ArrowDown') next = Math.min(items.length - 1, idx + 1);
        if (ev.key === 'ArrowUp') next = Math.max(0, idx - 1);
        items[next]?.focus();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        document.activeElement?.click();
      }
    });
  }

  refresh() {
    const steps = this._getEngineSteps();
    // compute progress percent
    const total = steps.length || 1;
    const completed = steps.filter(s => s.completed).length;
    const progress = Math.round((completed / total) * 100);
    this._steps = steps;
    this._renderOrUpdateSteps(steps, progress);
  }

  disconnect() {
    Hooks.off('swse:progression:updated', this._boundRefresh);
    if (this.root && this.root.parentElement) this.root.parentElement.removeChild(this.root);
    if (window.SWSE_PROG_SIDEBAR === this) delete window.SWSE_PROG_SIDEBAR;
  }

  _getEngineSteps() {
    try {
      const engine = (game && game.swse && game.swse.progression) ? game.swse.progression : null;
      if (engine) {
        if (typeof engine.getSteps === 'function') {
          const s = engine.getSteps();
          // ensure shape
          return Array.isArray(s) ? s : [];
        }
        if (Array.isArray(engine.steps)) return engine.steps;
      }
    } catch(e) { console.warn("SWSE Sidebar: engine query failed", e); }
    // fallback steps
    return [
      { id:'species', label:'Species', subtitle:'Choose species', icon:'glyph-species', locked:false, completed:false, current:false },
      { id:'class', label:'Class', subtitle:'Choose a class', icon:'glyph-class', locked:false, completed:false, current:false },
      { id:'attributes', label:'Attributes', subtitle:'Set your stats', icon:'glyph-attributes', locked:false, completed:true, current:true },
      { id:'skills', label:'Skills', subtitle:'Pick skills', icon:'glyph-skills', locked:true, completed:false, current:false },
      { id:'feats', label:'Feats', subtitle:'Choose feats', icon:'glyph-feats', locked:true, completed:false, current:false },
      { id:'summary', label:'Summary', subtitle:'Finish', icon:'glyph-summary', locked:true, completed:false, current:false }
    ];
  }

  _renderOrUpdateSteps(steps, progressPercent) {
    const container = this.root?.querySelector('.swse-prog-steps');
    if (!container) return;
    // if structure changed (different length or ids), rebuild conservatively
    const existing = Array.from(container.querySelectorAll('.swse-prog-step'));
    const existingIds = existing.map(e => e.dataset.stepId);
    const newIds = steps.map(s => s.id);
    const structureMismatch = existingIds.length !== newIds.length || existingIds.some((id, i) => id !== newIds[i]);
    if (structureMismatch) {
      // full render
      container.innerHTML = '';
      for (const s of steps) {
        const el = document.createElement('div');
        el.className = `swse-prog-step ${s.current ? 'current' : ''} ${s.completed ? 'completed' : ''} ${s.locked ? 'locked' : ''}`;
        el.dataset.stepId = s.id;
        el.tabIndex = 0;
        el.setAttribute('role','listitem');
        el.setAttribute('aria-pressed', !!s.current);
        if (s.current) el.setAttribute('aria-selected','true');

        const icon = document.createElement('div');
        icon.className = 'swse-prog-step-icon';
        if (s.icon) {
          icon.innerHTML = `<i class="${s.icon}" aria-hidden="true"></i>`;
        } else {
          icon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>`;
        }

        const info = document.createElement('div'); info.className='swse-prog-step-info';
        const label = document.createElement('div'); label.className='swse-prog-step-label'; label.innerText = s.label;
        const sub = document.createElement('div'); sub.className='swse-prog-step-sub'; sub.innerText = s.subtitle || '';
        info.appendChild(label); info.appendChild(sub);

        const state = document.createElement('div'); state.className='swse-prog-step-state';
        state.innerHTML = s.completed ? '<span class="tick">✔</span>' : (s.locked ? '<span class="padlock">🔒</span>' : '');

        el.appendChild(icon);
        el.appendChild(info);
        el.appendChild(state);
        container.appendChild(el);
      }
    } else {
      // partial update: update classes, labels, and state only
      for (let i=0;i<steps.length;i++) {
        const s = steps[i];
        const el = existing[i];
        el.classList.toggle('current', !!s.current);
        el.classList.toggle('completed', !!s.completed);
        el.classList.toggle('locked', !!s.locked);
        el.setAttribute('aria-pressed', !!s.current);
        if (s.current) el.setAttribute('aria-selected','true');
        else el.removeAttribute('aria-selected');
        const lab = el.querySelector('.swse-prog-step-label');
        if (lab && lab.innerText !== s.label) lab.innerText = s.label;
        const sub = el.querySelector('.swse-prog-step-sub');
        if (sub && sub.innerText !== (s.subtitle || '')) sub.innerText = s.subtitle || '';
        const state = el.querySelector('.swse-prog-step-state');
        if (state) state.innerHTML = s.completed ? '<span class="tick">✔</span>' : (s.locked ? '<span class="padlock">🔒</span>' : '');
        const icon = el.querySelector('.swse-prog-step-icon');
        if (icon) {
          if (s.icon) icon.innerHTML = `<i class="${s.icon}" aria-hidden="true"></i>`;
        }
      }
    }

    // update progress fill
    const bar = this.root.querySelector('.swse-prog-bar-fill');
    if (bar) bar.style.width = `${progressPercent}%`;

    // ensure current is visible
    const current = container.querySelector('.swse-prog-step.current');
    if (current) current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// Auto init: if a sidebar template exists in the DOM, attach controller
Hooks.once('ready', () => {
  try {
    const root = document.querySelector('.swse-prog-sidebar');
    if (root && !window.SWSE_PROG_SIDEBAR) {
      window.SWSE_PROG_SIDEBAR = new SWSEProgressionSidebar();
      console.log("SWSE Sidebar initialized");
    }
  } catch(e) { console.warn(e); }
});
