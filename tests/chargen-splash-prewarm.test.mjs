import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('scripts/apps/progression-framework/shell/chargen-splash-preloader.js');
const intro = read('scripts/apps/progression-framework/steps/intro-step.js');
const species = read('scripts/apps/progression-framework/steps/species-step.js');
const profile = read('scripts/apps/progression-framework/steps/galactic-profile-step.js');
const shellSrc = read('scripts/apps/progression-framework/shell/progression-shell.js');

function setup() {
  const counts = { templates: 0, registry: 0, background: 0, nextStep: 0, mentor: 0, classes: 0 };
  const context = {
    console,
    loadTemplates: async paths => {
      counts.templates += 1;
      assert.ok(paths.some(p => p.includes('species-work-surface.hbs')));
      assert.ok(paths.some(p => p.includes('attribute-work-surface.hbs')));
    },
    __testClassRegistry: async () => ({
      ClassesRegistry: {
        isInitialized() { return false; },
        async initialize() { counts.classes += 1; return true; },
      },
    }),
    __testPreloader: async () => ({

      dataPreloader: {
        async preload(options) {
          counts.registry += 1;
          assert.deepEqual(Array.from(options.priority), ['classes', 'skills']);
          assert.deepEqual(Array.from(options.background), ['feats', 'talents', 'forcePowers']);
        },
        async waitForAll() { counts.background += 1; },
      },
    }),
  };
  context.globalThis = context;
  // Only replace the engine's module-specifier import so tests do not need
  // a Foundry runtime. The real production control flow is evaluated as-is.
  const executable = src
    .replace(/export (function|const|class) /g, '$1 ')
    .replace("import('/systems/foundryvtt-swse/scripts/core/data-preloader.js')", 'globalThis.__testPreloader()')
    .replace("import('/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js')", 'globalThis.__testClassRegistry()');
  assert.notEqual(executable, src, 'Production module must remain testable');
  const api = vm.runInNewContext(executable +
    '\n({ startChargenSplashPreload, consumeSplashMentorGuidance, splashPrewarmStatus })',
    context, { filename: 'chargen-splash-preloader.js' });
  const createShell = () => {
    const shell = {
      mode: 'chargen',
      currentStepIndex: 0,
      steps: [{ stepId: 'intro' }, { stepId: 'species' }],
      progressionSession: { draftSelections: { species: null } },
    };
    shell.stepPlugins = new Map([['species', {
      async preload() { counts.nextStep += 1; },
      getMentorContext() { counts.mentor += 1; return 'Species await your decision.'; },
    }]]);
    return shell;
  };
  return { api, counts, createShell };
}

// All asynchronous jobs run exactly once, even if AfterRender fires repeatedly.
{
  const { api, counts, createShell } = setup();
  const shell = createShell();
  const first = api.startChargenSplashPreload(shell);
  const second = api.startChargenSplashPreload(shell);
  assert.strictEqual(first, second, 'Double render should join the same preload');
  await first;
  assert.deepEqual(counts, { templates: 1, registry: 1, background: 1, nextStep: 1, mentor: 1, classes: 1 });
  assert.equal(api.splashPrewarmStatus(shell).completed, true);
  assert.equal(api.consumeSplashMentorGuidance(shell, 'species'), 'Species await your decision.');
  assert.equal(api.consumeSplashMentorGuidance(shell, 'species'), null, 'Line must be consumed once');
}

// Galactic Profile replaces Species as the next step in profile-picker mode.
// It must warm its template registry, not enter the step or choose a profile.
{
  const { api, counts, createShell } = setup();
  const shell = createShell();
  shell.steps = [{ stepId: 'intro' }, { stepId: 'profile-class' }];
  let entered = 0;
  shell.stepPlugins = new Map([['profile-class', {
    async preload() { counts.nextStep += 1; },
    async onStepEnter() { entered += 1; },
    getMentorContext() { counts.mentor += 1; return 'Choose your future.'; },
  }]]);
  await api.startChargenSplashPreload(shell);
  assert.equal(counts.nextStep, 1);
  assert.equal(entered, 0, 'Prewarm must never enter the next step');
  assert.equal(api.consumeSplashMentorGuidance(shell, 'profile-class'), 'Choose your future.');
}

// A changed draft must invalidate the prepared line, not present stale advice.
{
  const { api, createShell } = setup();
  const shell = createShell();
  await api.startChargenSplashPreload(shell);
  shell.progressionSession.draftSelections.species = { id: 'human' };
  assert.equal(api.consumeSplashMentorGuidance(shell, 'species'), null);
}

// Neither level-up nor a skipped/finished splash runs an obsolete warmup.
{
  const { api, counts, createShell } = setup();
  const shell = createShell();
  shell.mode = 'levelup';
  assert.equal((await api.startChargenSplashPreload(shell)).skipped, true);
  shell.mode = 'chargen';
  shell.currentStepIndex = 1;
  assert.equal((await api.startChargenSplashPreload(shell)).skipped, true);
  assert.deepEqual(counts, { templates: 0, registry: 0, background: 0, nextStep: 0, mentor: 0, classes: 0 });
}

// No loading delay, pending preload gate, second registry, or navigation side
// effect is permitted in the splash orchestration.
assert.doesNotMatch(src, /await\s+shell\._activateStep|\.commitSelection\(|\.requestRender\(/);
assert.match(intro, /this\.startIntroSequence\(shell\);[\s\S]*requestAnimationFrame\(\(\) => setTimeout\(startPrewarm, 0\)\)/);
assert.match(species, /async onStepEnter\(shell\)[\s\S]*?await this\.preload\(\)/);
assert.match(species, /preload\(\)\s*\{[\s\S]*?this\._preloadPromise/);
assert.match(profile, /async onStepEnter\(shell\)[\s\S]*?await this\.preload\(shell\)/);
assert.match(shellSrc, /consumeSplashMentorGuidance\(this, stepId\)/);
assert.ok(shellSrc.indexOf('this._presentStepPluginGuidance(plugin, descriptor?.stepId)') <
  shellSrc.indexOf('this.requestMentorRecommendation('),
  'Mentor introduction must precede automatic recommendation work');

console.log('chargen-splash-prewarm: all assertions passed');
