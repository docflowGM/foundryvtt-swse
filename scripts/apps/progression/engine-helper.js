/**
 * scripts/apps/progression/engine-helper.js
 * Non-invasive wrapper: if the engine exists and has a finalize/commit method,
 * wrap it to emit a 'swse:progression:completed' hook after success.
 *
 * This uses duck-typing and is safe to include; it checks presence before patching.
 */
(function(){
  try {
    const tryPatch = (engine) => {
      if (!engine || engine._swsePatchedForCompletion) return;
      const candidates = ['finalize','commit','apply','complete'];
      for (const name of candidates) {
        if (typeof engine[name] === 'function') {
          const orig = engine[name].bind(engine);
          engine[name] = async function(...args) {
            const res = await orig(...args);
            try {
              Hooks.call('swse:progression:completed', { actor: engine.actor || null, level: engine.level || null, mode: engine.mode || 'chargen' });
            } catch(e) { console.warn('SWSE | engine-helper: failed to emit completed hook', e); }
            return res;
          };
          engine._swsePatchedForCompletion = true;
          console.log(`SWSE | engine-helper: patched engine.${name} to emit swse:progression:completed`);
          break;
        }
      }
    };

    // Attempt patch on world ready
    Hooks.on('ready', () => {
      try {
        const engine = (game && game.swse && game.swse.progression) ? game.swse.progression : null;
        if (engine) tryPatch(engine);
      } catch(e){}
    });

    // Also patch if engine is later created
    Hooks.on('swse:progression:created', (engine) => tryPatch(engine));
  } catch(e) { console.warn('SWSE | engine-helper loaded with error', e); }
})();
