/**
 * Shared harness for the talent-progression policy tests (canonical class-based vs Talent Wiki).
 *
 * TEST SCOPE: unit / integration-with-stubs. The REAL code runs: HouseRuleService, FeatRulesAdapter,
 * TalentCadenceEngine, buildLevelUpEntitlementManifest, ActiveStepComputer talent applicability and the
 * TalentStep tree-pool authority, over the real packs/classes.db and packs/talent_trees.db.
 * Only game.settings (stub store) and browser globals are stubbed. NOT covered: Foundry V13 rendering.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem() { return null; }, setItem() {}, removeItem() {} };
const fnd = globalThis.foundry ?? (globalThis.foundry = {});
fnd.applications = fnd.applications ?? {};
fnd.applications.api = fnd.applications.api ?? { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (Base) => Base };

const store = {};
const gameObj = globalThis.game ?? (globalThis.game = {});
gameObj.settings = { get: (ns, key) => store[key], set: async (ns, key, v) => { store[key] = v; }, settings: { has: () => true } };
export const setRule = (key, value) => { store[key] = value; };
export const resetRules = () => { for (const k of Object.keys(store)) delete store[k]; };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

export const ALL_TREES = fs.readFileSync(path.join(ROOT, 'packs/talent_trees.db'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)).map(t => ({ id: t._id, name: t.name }));

export const { buildLevelUpEntitlementManifest } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-entitlement-manifest.js');
export const { ActiveStepComputer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/active-step-computer.js');
export const { GeneralTalentStep, ClassTalentStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js');
export const { TalentCadenceEngine } = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-cadence-engine.js');
const { resolveClassModel } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js');

export const classModel = (name) => resolveClassModel({ name, id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });

let seq = 0;
/** Actor owning the given class levels, e.g. { Jedi: 1, Soldier: 2 }. `feats` are owned feat names. */
export function actorOf(classLevels = {}, { feats = [] } = {}) {
  const items = Object.entries(classLevels).map(([name, level]) => ({
    id: `c${++seq}`, type: 'class', name,
    system: { level, classId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }, flags: { swse: {} },
  }));
  for (const name of feats) items.push({ id: `f${++seq}`, type: 'feat', name, system: {}, flags: { swse: {} } });
  const level = Object.values(classLevels).reduce((sum, n) => sum + n, 0);
  return { id: `a${++seq}`, name: 'Hero', type: 'character', flags: { swse: {} }, items, system: { level } };
}

/** Progression session that is advancing (or creating) the actor in `className`. */
export function sessionFor(className, mode = 'levelup') {
  const model = classModel(className);
  const selection = { id: model?.id || className.toLowerCase(), name: className };
  return { mode, draftSelections: { class: selection, feats: [], talents: [] }, getSelection: (key) => (key === 'class' ? selection : null) };
}

/** Talent awards for advancing `actor` one level in `className`. */
export function levelUpAward(actor, className) {
  const session = sessionFor(className, 'levelup');
  const m = buildLevelUpEntitlementManifest(actor, session);
  const asc = new ActiveStepComputer();
  return {
    heroic: Number(m?.heroicTalent?.count || 0),
    class: Number(m?.choices?.talentChoices || 0),
    generalStep: asc._hasTalentChoices('general-talent', actor, session, 'levelup'),
    classStep: asc._hasTalentChoices('class-talent', actor, session, 'levelup'),
    manifest: m,
  };
}

/** Talent steps that chargen opens for a new level-1 character in `className`. */
export function chargenSteps(className) {
  const session = sessionFor(className, 'chargen');
  const actor = actorOf({});
  const asc = new ActiveStepComputer();
  return {
    generalStep: asc._hasTalentChoices('general-talent', actor, session, 'chargen'),
    classStep: asc._hasTalentChoices('class-talent', actor, session, 'chargen'),
  };
}

/** Talent tree names a step offers while `actor` advances in `className`. */
export async function treePool(kind, actor, className, mode = 'levelup') {
  const StepClass = kind === 'general' ? GeneralTalentStep : ClassTalentStep;
  const step = new StepClass({ stepId: kind === 'general' ? 'general-talent' : 'class-talent' });
  const shell = { actor, progressionSession: sessionFor(className, mode) };
  const trees = await step._getAvailableTrees(shell, ALL_TREES);
  return trees.map(t => t.name).sort();
}

/**
 * Walk a build order (array of class names, one entry per level) and count talent awards.
 * Level 1 uses chargen step applicability; later levels use the level-up manifest.
 */
export function walkBuild(order = []) {
  const owned = {};
  const events = [];
  order.forEach((className, index) => {
    if (index === 0) {
      const c = chargenSteps(className);
      events.push({ level: 1, className, classLevel: 1, heroic: c.generalStep ? 1 : 0, class: c.classStep ? 1 : 0 });
    } else {
      const a = levelUpAward(actorOf(owned), className);
      events.push({ level: index + 1, className, classLevel: (owned[className] || 0) + 1, heroic: a.generalStep ? a.heroic : 0, class: a.classStep ? a.class : 0 });
    }
    owned[className] = (owned[className] || 0) + 1;
  });
  const total = events.reduce((sum, e) => sum + e.heroic + e.class, 0);
  return { events, total };
}
