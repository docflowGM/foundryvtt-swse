/**
 * scripts/apps/progression/engine-autoload.js
 * Integrates progression engine lifecycle with UI templates and sidebar controller.
 *
 * Listens for:
 *  - swse:progression:created (engine instance available)
 *  - swse:progression:stepChanged (engine signals step updates)
 *  - swse:progression:completed (engine signals completion => auto-close windows)
 *
 * This file is intentionally defensive and non-invasive.
 */
(async function () {
  try {
    await loadTemplates([
      'systems/foundryvtt-swse/templates/apps/progression/sidebar.hbs',
      'systems/foundryvtt-swse/templates/apps/progression/attribute-method.hbs',
      'systems/foundryvtt-swse/templates/apps/chargen/ability-rolling.hbs'
    ]);
  } catch(e) { console.warn("SWSE | engine-autoload: template preload failed", e); }

  Hooks.on('swse:progression:created', async (engine) => {
    try {
      // render sidebar if missing
      if (!document.querySelector('.swse-prog-sidebar')) {
        try {
          const steps = (typeof engine.getSteps === 'function') ? engine.getSteps() : (engine.steps || []);
          const progress = (Array.isArray(steps) && steps.length) ? Math.round((steps.filter(s=>s.completed).length / steps.length)*100) : 0;
          const html = await renderTemplate('systems/foundryvtt-swse/templates/apps/progression/sidebar.hbs', { steps, progress });
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          document.body.appendChild(wrapper.firstElementChild);
        } catch(e) { console.warn("SWSE | engine-autoload: sidebar render failed", e); }
      }

      // import and init the controller if available
      import('./scripts/apps/progression/sidebar.js').then(mod => {
        if (!window.SWSE_PROG_SIDEBAR) {
          window.SWSE_PROG_SIDEBAR = new mod.SWSEProgressionSidebar();
        }
        Hooks.call('swse:progression:init', engine);
        Hooks.call('swse:progression:updated');
      }).catch(e => console.warn('SWSE | engine-autoload: sidebar import failed', e));
    } catch(e) { console.warn("SWSE | engine-autoload error", e); }
  });

  // Mirror engine step-change into UI update hook if engine emits custom event
  Hooks.on('swse:progression:stepChanged', () => Hooks.call('swse:progression:updated'));

  // Auto-close any SWSE progression UI windows when progression completes
  Hooks.on('swse:progression:completed', ({ actor, level, mode } = {}) => {
    try {
      for (const appId in ui.windows) {
        const app = ui.windows[appId];
        if (!app) continue;
        const name = app.constructor?.name || '';
        const title = (app?.title || '').toString();
        const likelyProgression = name.toLowerCase().includes('progress') || name.toLowerCase().includes('chargen') ||
                                 /progression|chargen|level up|character creation/i.test(title);
        if (likelyProgression && typeof app.close === 'function') {
          try { app.close(); } catch(_) {}
        }
      }
      // disconnect sidebar if present
      if (window.SWSE_PROG_SIDEBAR && typeof window.SWSE_PROG_SIDEBAR.disconnect === 'function') {
        try { window.SWSE_PROG_SIDEBAR.disconnect(); } catch(_) {}
      }
      ui.notifications?.info("Progression complete.");
    } catch(e) { console.warn("SWSE | engine-autoload: completion handling failed", e); }
  });

  // Defensive: if the engine exists already on load, trigger created
  try {
    const engine = (game && game.swse && game.swse.progression) ? game.swse.progression : null;
    if (engine) Hooks.call('swse:progression:created', engine);
  } catch(e){}
})();
