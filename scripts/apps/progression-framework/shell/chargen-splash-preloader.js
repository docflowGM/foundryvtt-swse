/**
 * Chargen splash prewarm — one non-blocking pass per progression shell.
 *
 * Reuse the existing dataPreloader and the existing step plugins; this is
 * orchestration only, not a second data registry or suggestion engine.
 * Never commit selections, evaluate future eligibility, or display dialogue.
 * A skipped intro still works because each destination step owns hydration.
 */
const preloads = new WeakMap();

const ROOT = 'systems/foundryvtt-swse/templates/apps/progression-framework/';
const CORE_TEMPLATES = Object.freeze([
  ROOT + 'steps/species-work-surface.hbs',
  ROOT + 'steps/class-work-surface.hbs',
  ROOT + 'steps/attribute-work-surface.hbs',
  ROOT + 'details-panel/empty-state.hbs',
  ROOT + 'details-panel/species-details.hbs',
  ROOT + 'summary-panel/species-summary.hbs',
  ROOT + 'mentor-rail.hbs',
  ROOT + 'utility-bar.hbs',
]);

/** An unchanged draft is required to reuse a prepared mentor introduction. */
export function splashDraftSignature(shell) {
  try {
    return JSON.stringify(shell?.progressionSession?.draftSelections ?? {});
  } catch {
    return null; // Never use a precomputed line if the draft cannot be validated.
  }
}

function getFollowingStep(shell) {
  const index = Number(shell?.currentStepIndex ?? -1);
  const next = Number.isInteger(index) && index >= 0 ? shell?.steps?.[index + 1] : null;
  return next?.stepId ? next : null;
}

async function warmTemplates() {
  // Foundry's shared template loader caches compiled Handlebars templates.
  // Do not fetch/compile them into a competing local cache.
  const loader = globalThis.loadTemplates;
  if (typeof loader === 'function') await loader(CORE_TEMPLATES);
}

async function warmDataAuthorities() {
  const { dataPreloader } = await import('/systems/foundryvtt-swse/scripts/core/data-preloader.js');
  // Species is warmed by SpeciesStep.preload() so both don't initialize the
  // same registry concurrently. Remaining registries use the shared cache.
  await dataPreloader.preload({
    priority: ['classes', 'skills'],
    background: ['feats', 'talents', 'forcePowers'],
    verbose: false,
  });
  await dataPreloader.waitForAll();
}

async function warmSpeciesStep(shell) {
  const species = shell?.stepPlugins?.get?.('species');
  if (typeof species?.preload === 'function') await species.preload();
}

async function warmFollowingMentorLine(shell, state) {
  const next = getFollowingStep(shell);
  if (!next || shell?.steps?.[shell?.currentStepIndex]?.stepId !== 'intro') return;
  const plugin = shell?.stepPlugins?.get?.(next.stepId);
  if (typeof plugin?.getMentorContext !== 'function') return;
  const before = splashDraftSignature(shell);
  if (before == null) return;
  const text = await plugin.getMentorContext(shell);
  const after = splashDraftSignature(shell);
  if (typeof text === 'string' && text.trim()
    && after === before
    && shell?.steps?.[shell?.currentStepIndex]?.stepId === 'intro') {
    state.guidance = { stepId: next.stepId, text, draftSignature: before };
  }
}

/**
 * Start once, after the first intro frame. All tasks are best effort and
 * promise-based; never make the cinematic wait for them. Its Continue action
 * remains independent of any preload job.
 */
export function startChargenSplashPreload(shell) {
  if (!shell || shell.mode !== 'chargen'
    || shell?.steps?.[shell?.currentStepIndex]?.stepId !== 'intro') {
    return Promise.resolve({ skipped: true });
  }

  const existing = preloads.get(shell);
  if (existing) return existing.promise;

  const state = { guidance: null, started: Date.now(), results: null, promise: null };
  preloads.set(shell, state);

  const run = async (name, action) => {
    const started = Date.now();
    try {
      await action();
      return { name, status: 'ready', durationMs: Date.now() - started };
    } catch (error) {
      // Preloading is advisory. Normal step hydration remains authoritative.
      if (globalThis.SWSE_PROGRESS_PREWARM_TRACE === true) {
        console.warn('[ChargenSplashPreloader] Background task failed:', name, error);
      }
      return { name, status: 'failed', durationMs: Date.now() - started };
    }
  };

  state.promise = Promise.all([
    run('species-resources', () => warmSpeciesStep(shell)),
    run('shared-data-authorities', warmDataAuthorities),
    run('handlebars-templates', warmTemplates),
    // The next-step line may be recorded immediately; no UI is mutated.
    run('next-step-mentor-introduction', () => warmFollowingMentorLine(shell, state)),
  ]).then(results => {
    state.results = results;
    if (globalThis.SWSE_PROGRESS_PREWARM_TRACE === true) {
      console.debug('[ChargenSplashPreloader] Completed', {
        elapsedMs: Date.now() - state.started,
        results,
      });
    }
    return { results, elapsedMs: Date.now() - state.started };
  });
  return state.promise;
}

/** Consume only when the step AND committed-draft snapshot still match. */
export function consumeSplashMentorGuidance(shell, stepId) {
  const state = shell && preloads.get(shell);
  const candidate = state?.guidance;
  if (!candidate || candidate.stepId !== stepId) return null;
  state.guidance = null;
  const current = splashDraftSignature(shell);
  return current != null && current === candidate.draftSignature
    ? candidate.text
    : null;
}

/** Read-only diagnostic for source-level tests and debugging. */
export function splashPrewarmStatus(shell) {
  const state = shell && preloads.get(shell);
  return state
    ? { started: state.started, completed: !!state.results,
      results: state.results, hasGuidance: !!state.guidance }
    : null;
}
