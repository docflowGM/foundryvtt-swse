// Step-level checks: the real Foundry step classes driven by a fake shell/session (no Foundry runtime).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { items: [], user: { isGM: true }, settings: { get: () => true, settings: new Map() } } });
globalThis.window = globalThis.window ?? { addEventListener: () => {}, removeEventListener: () => {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = globalThis.document ?? { readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null };
globalThis.HTMLElement = globalThis.HTMLElement ?? class FakeHTMLElement {};
globalThis.Element = globalThis.Element ?? globalThis.HTMLElement;
globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: { ApplicationV2: class ApplicationV2Stub { async close() { return this; } }, HandlebarsApplicationMixin: (Base) => class extends Base {}, DocumentSheetV2: class {}, DialogV2: class {} },
  handlebars: { renderTemplate: async () => '' }, ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};
globalThis.fetch = async (url) => {
  const rel = String(url).replace(/^\/?systems\/foundryvtt-swse\//, '');
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return { ok: false, json: async () => { throw new Error(`404 ${rel}`); } };
  return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
};
const { MentorSurveyStep, MulticlassSurveyStep, PrestigeSurveyStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/mentor-survey-step.js');
const { buildSurveyLedgerPatch } = await import('/systems/foundryvtt-swse/scripts/mentor/mentor-survey-v2/finalization.js');

function fakeShell({ cls, actorClasses = {}, species = null }) {
  const store = {};
  const items = Object.entries(actorClasses).map(([name, level]) => ({ type: 'class', name, id: name, system: { level } }));
  return {
    element: null, actor: { items, system: { skills: {} }, flags: {} },
    renders: [],
    requestRender(o) { this.renders.push(o.reason); },
    progressionSession: {
      sessionId: 'levelup-test-1',
      getSelection: (k) => (k === 'class' ? { name: cls } : k === 'species' ? species : store[k] ?? null),
      commitSelection: (stepId, k, v) => { store[k] = JSON.parse(JSON.stringify(v)); return true; },
      store,
    },
  };
}
const click = (step, shell, action, ds) => step.handleAction(action, { preventDefault() {} }, { dataset: ds }, shell);

test('MC-03 MulticlassSurveyStep runs a real Noble->Jedi session: render data, answers, commit staged in the session only', async () => {
  const shell = fakeShell({ cls: 'Jedi', actorClasses: { Noble: 3 } });
  const step = new MulticlassSurveyStep({ stepId: 'base-class-survey' });
  await step.onStepEnter(shell);
  let d = await step.getStepData({ shell });
  assert.equal(d.phase, 'question'); assert.equal(d.preview, true); assert.equal(d.view.questionId, 'q1'); assert.equal(d.view.options.length, 6);
  assert.equal(d.title, 'What do you want from this new training?');
  assert.deepEqual(Object.keys(shell.progressionSession.store.mentorSurvey.drafts), ['multiclass:jedi']);
  await click(step, shell, 'msurvey-choose', { questionId: 'q1', optionId: d.view.options[0].optionId, seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.view.questionId, 'q3');
  // a duplicate click with the same token changes nothing
  const before = JSON.stringify(shell.progressionSession.store.mentorSurvey);
  await click(step, shell, 'msurvey-choose', { questionId: 'q1', optionId: 'mc.jedi.q1.noble.02', seq: '1' });
  assert.equal(JSON.stringify(shell.progressionSession.store.mentorSurvey), before);
  await click(step, shell, 'msurvey-choose', { questionId: 'q3', optionId: 'mc.q3.swim', seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.view.questionId, 'q4');
  await click(step, shell, 'msurvey-choose', { questionId: 'q4', optionId: d.view.options[0].optionId, seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.view.questionId, 'q5');
  await click(step, shell, 'msurvey-choose', { questionId: 'q5', optionId: d.view.options[0].optionId, seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.phase, 'ready');
  assert.equal(shell.actor.flags['foundryvtt-swse'], undefined, 'nothing is written to the actor by the step');
  assert.deepEqual(step.getSelection(), { selected: [], count: 0, isComplete: false });
  await click(step, shell, 'msurvey-finish', { seq: String(d.seq) });
  assert.equal(step.getSelection().isComplete, true);
  const patch = buildSurveyLedgerPatch({ actor: shell.actor, selection: shell.progressionSession.store.mentorSurvey, transactionId: shell.progressionSession.sessionId, level: 4, completedAt: 'now' });
  const ev = patch['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(ev[0].typed.declaredClassInvestmentDepth, 'swim'); assert.equal(ev[0].scopeId, 'jedi');
  assert.ok(shell.renders.length > 0);
});

test('MC-04/SV-09 step shows the unavailable state (and records nothing) for two prior foundation classes and for non-preview GMs-off', async () => {
  const many = fakeShell({ cls: 'Jedi', actorClasses: { Noble: 2, Scout: 2 } });
  const s1 = new MulticlassSurveyStep({ stepId: 'base-class-survey' }); await s1.onStepEnter(many);
  assert.equal((await s1.getStepData({ shell: many })).phase, 'unavailable');
  assert.equal(many.progressionSession.store.mentorSurvey, undefined, 'no draft is created when the survey does not apply');
  const further = fakeShell({ cls: 'Noble', actorClasses: { Noble: 2, Soldier: 1 } });
  const s2 = new MulticlassSurveyStep({ stepId: 'base-class-survey' }); await s2.onStepEnter(further);
  assert.equal((await s2.getStepData({ shell: further })).phase, 'unavailable', 'a further level in a held class is not a new class');
});

test('SV-13 the L1 and multiclass drafts merge into one session value without overwriting each other', async () => {
  const shell = fakeShell({ cls: 'Jedi', actorClasses: { Noble: 3 }, species: { name: 'Human' } });
  const l1 = new MentorSurveyStep({ stepId: 'l1-survey' }); await l1.onStepEnter(shell);
  const mc = new MulticlassSurveyStep({ stepId: 'base-class-survey' }); await mc.onStepEnter(shell);
  assert.deepEqual(Object.keys(shell.progressionSession.store.mentorSurvey.drafts).sort(), ['l1', 'multiclass:jedi']);
});

test('SV-01/MC-13 multiclass cutover: legacy step/definitions are deleted, node and session wiring use the single mentorSurvey key', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const gone of ['scripts/apps/progression-framework/steps/base-class-survey-step.js', 'scripts/apps/progression-framework/steps/legacy-class-survey-step-base.js', 'scripts/mentor/mentor-survey/base-class-survey-definitions.js']) assert.ok(!fs.existsSync(path.join(ROOT, gone)), gone);
  assert.match(read('scripts/apps/progression-framework/registries/node-descriptor-mapper.js'), /'base-class-survey': MulticlassSurveyStep/);
  assert.match(read('scripts/engine/progression/registries/progression-node-definitions.js'), /nodeId: 'base-class-survey'[\s\S]*?selectionKey: 'mentorSurvey'/);
  const session = read('scripts/apps/progression-framework/shell/progression-session.js');
  assert.ok(!/classSurveys|classSurveyDrafts/.test(session));
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.ok(!/classSurveyResponses|classSurveyBias|classSurveyIntentBiases|progression\.classSurveys/.test(fin), 'legacy class-survey stores are no longer written');
  assert.match(fin, /buildSurveyLedgerPatch\(\{[\s\S]*?selections\.mentorSurvey/);
  assert.match(read('scripts/apps/progression-framework/shell/active-step-computer.js'), /multiclassTrigger/);
  for (const f of ['suggestion-context-builder', 'suggestion-context-adapter', 'build-signals-normalizer']) {
    const p = f === 'suggestion-context-builder' ? 'scripts/engine/progression/suggestion/' : 'scripts/engine/progression/forecast/';
    assert.ok(!/classSurvey(Responses|IntentBiases)|classSurveys/.test(read(`${p}${f}.js`)), f);
  }
});

test('PR-03 PrestigeSurveyStep runs a real Ace Pilot acquisition: pending intro, depth, purposes, commit staged in the session only', async () => {
  const shell = fakeShell({ cls: 'Ace Pilot', actorClasses: { Scout: 6 } });
  const step = new PrestigeSurveyStep({ stepId: 'prestige-survey' });
  await step.onStepEnter(shell);
  let d = await step.getStepData({ shell });
  assert.equal(d.phase, 'question'); assert.equal(d.view.questionId, 'q4'); assert.equal(d.title, 'What does this achievement mean to you?');
  assert.equal(d.questionNumber, 4); assert.equal(d.totalQuestions, 6, 'Q5 second purpose is an inner stage, not a seventh question');
  await click(step, shell, 'msurvey-choose', { questionId: 'q4', optionId: 'pr.q4.swim', seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.view.questionId, 'q5'); assert.equal(d.view.options.length, 7);
  await click(step, shell, 'msurvey-choose', { questionId: 'q5', optionId: 'pr.ace_pilot.q5.calling', seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.view.questionId, 'q5b'); assert.equal(d.questionNumber, 5);
  await click(step, shell, 'msurvey-choose', { questionId: 'q5b', optionId: 'pr.ace_pilot.q5b.decline', seq: String(d.seq) });
  d = await step.getStepData({ shell }); assert.equal(d.phase, 'ready');
  await click(step, shell, 'msurvey-finish', { seq: String(d.seq) });
  const ev = buildSurveyLedgerPatch({ actor: shell.actor, selection: shell.progressionSession.store.mentorSurvey, transactionId: 'levelup-ap', level: 9, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(ev[0].typed, { prestigeClassId: 'ace_pilot', declaredPrestigeDepth: 'swim', primaryPurpose: 'calling', secondaryPurpose: null });
  assert.equal(shell.actor.flags['foundryvtt-swse'], undefined);
});

test('PR-03 a prestige class that is already held, or a foundation class, shows nothing', async () => {
  for (const [cls, owned] of [['Ace Pilot', { 'Ace Pilot': 3 }], ['Jedi', { Noble: 2 }]]) {
    const shell = fakeShell({ cls, actorClasses: owned });
    const step = new PrestigeSurveyStep({ stepId: 'prestige-survey' }); await step.onStepEnter(shell);
    assert.equal((await step.getStepData({ shell })).phase, 'unavailable'); assert.equal(shell.progressionSession.store.mentorSurvey, undefined);
  }
});

test('SV-01/PR-01 prestige cutover: the legacy four-question survey, its pruning arithmetic and every legacy survey module are gone', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/mentor/mentor-survey')), 'legacy scripts/mentor/mentor-survey directory');
  for (const gone of ['scripts/apps/progression-framework/steps/prestige-survey-step.js', 'scripts/mentor/mentor-survey.js', 'scripts/apps/mentor/mentor-survey.js', 'templates/apps/progression-framework/steps/l1-survey-work-surface.hbs']) assert.ok(!fs.existsSync(path.join(ROOT, gone)), gone);
  const all = [];
  (function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = `${d}/${e.name}`; if (e.isDirectory()) walk(rel); else if (/\.(js|mjs)$/.test(e.name)) all.push(rel); } })('scripts');
  const offenders = all.filter((f) => /mergePrestigeBias|pruneWeight|oldIdentityRetention|prestigeWeight|prestigeMeaning|profileReading/.test(read(f)));
  assert.deepEqual(offenders, [], 'no file carries the retired weighted-pruning prestige arithmetic');
  assert.match(read('scripts/apps/progression-framework/registries/node-descriptor-mapper.js'), /'prestige-survey': PrestigeSurveyStep/);
  assert.match(read('scripts/apps/progression-framework/levelup-shell.js'), /PrestigeSurveyStep \} from '\.\/steps\/mentor-survey-step\.js'/);
  assert.match(read('scripts/engine/progression/registries/progression-node-definitions.js'), /nodeId: 'prestige-survey'[\s\S]*?selectionKey: 'mentorSurvey'/);
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.ok(!/prestigeSurveyResponses|progression\.prestigeSurveys|mergedBias/.test(fin), 'legacy prestige stores are no longer written');
  assert.ok(!/prestigeSurvey/.test(read('scripts/apps/progression-framework/shell/progression-session.js')));
  assert.match(read('scripts/apps/progression-framework/shell/active-step-computer.js'), /prestigeTrigger/);
  const sys = JSON.parse(read('system.json')); assert.ok(sys.styles.includes('styles/progression-framework/steps/l1-survey-step.css'), 'shared survey styles still shipped for the V2 template');
});
