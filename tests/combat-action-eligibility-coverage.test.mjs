import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Combat Action Eligibility -- coverage and reachability audit.
// Question answered here: can any live path execute a combat action the actor has not unlocked, and does every ACTION SOURCE (not just the
// 49-record compendium) feed the same eligibility verdict? The sheet gate is one boundary; these tests pin the others.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
const notes = { warn: [], error: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const fs = await import('node:fs');
const path = await import('node:path');
const { evaluateCombatActionEligibility: evaluate, authorizeCombatActionExecution: authorize, ELIGIBILITY_STATE: S } = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-action-eligibility.js');
const { AbilityCombatActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/ability-combat-action-resolver.js');
const { CombinedFeatActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combined-feat-action-resolver.js');
const ma = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');

const items = (list) => { const a = [...list]; a.get = (id) => a.find((i) => String(i.id) === String(id)); return a; };
const actor = (list = [], extra = {}) => ({ id: 'a1', type: 'character', name: 'T', items: items(list), system: { skills: {} }, flags: {}, ...extra });
const feat = (id, name, extra = {}) => ({ id, name, type: 'feat', system: { ...(extra.system ?? {}) }, flags: extra.flags ?? {} });
const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; };
const SCRIPTS = walk('scripts');
const read = (p) => fs.readFileSync(p, 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ---- 1. identity-first ownership (no name impersonation) -----------------------------------------------------------------------------------
test('ownership is identity-first: a same-named item with a different canonical identity does not satisfy a feat requirement; a disabled feat does not either', () => {
  const row = { origin: 'catalog', key: 'k', requirements: ['Crush feat'] };
  const impostor = feat('f1', 'Crush', { flags: { swse: { canonicalFeat: { identityKey: 'feat::book::p1::something-else' } } } });
  assert.equal(evaluate(actor([impostor]), row).state, S.LOCKED, 'named Crush but its identity is something else');
  const real = feat('f2', 'Whatever', { flags: { swse: { canonicalFeat: { identityKey: 'feat::book::p1::crush' } } } });
  assert.equal(evaluate(actor([real]), row).state, S.UNLOCKED, 'the identity decides, not the display name');
  const disabled = feat('f3', 'Crush', { system: { disabled: true } });
  assert.equal(evaluate(actor([disabled]), row).state, S.LOCKED);
  assert.equal(evaluate(actor([feat('f4', 'Crush')]), row).state, S.UNLOCKED, 'a legacy item with no canonical identity keeps the name match');
});

// ---- 2. reachability: every path that can run a combat action ------------------------------------------------------------------------------
test('inventory: only the known callers invoke the sheet action runner, the multi-attack router and the full-attack executor', () => {
  const callers = (needle, exclude = []) => SCRIPTS.filter((p) => !exclude.some((e) => p.endsWith(e)) && code(p).includes(needle)).map((p) => p.replace(/\\/g, '/')).sort();
  assert.deepEqual(callers('_runCanonicalCombatAction(', ['character-like-sheet.js']), ['scripts/sheets/v2/character-sheet/combat-ui.js'], 'combat-ui.js calls the sheet runner, which holds the gate');
  assert.deepEqual(callers('executeCombatFeatureMultiattack(', ['combat-feature-handlers.js']), ['scripts/engine/combat/features/combat-feature-legacy-action-bridge.js']);
  assert.deepEqual(callers('FullAttackExecutor.execute(', ['full-attack-executor.js']), ['scripts/sheets/v2/character-like-sheet.js']);
  assert.deepEqual(callers('CombatWorkflowRegistry.getDefault()', ['combat-workflow-registry.js']), ['scripts/sheets/v2/character-like-sheet.js']);
});

test('the sheet gate precedes the workflow registry, and routed (nested) calls do not skip a first-entry gate', () => {
  const src = read('scripts/sheets/v2/character-like-sheet.js');
  const start = src.indexOf('async _runCanonicalCombatAction(');
  const body = src.slice(start, start + 2600);
  assert.ok(body.indexOf('__combatWorkflowRouted !== true') < body.indexOf('authorizeCombatActionExecution('));
  assert.ok(body.indexOf('authorizeCombatActionExecution(') < body.indexOf('CombatWorkflowRegistry.getDefault()'));
  // the only callers that pass __combatWorkflowRouted:true are the registry's own handlers, which are reached only after the gate
  const routed = [...src.matchAll(/__combatWorkflowRouted:\s*true/g)].length;
  assert.ok(routed >= 2);
});

// ---- 3. every alternate multi-attack route -------------------------------------------------------------------------------------------------
test('every multi-attack fallback plan in the codebase is guarded by the shared entitlement answer', () => {
  const sites = [];
  for (const p of SCRIPTS) {
    const src = read(p);
    for (const m of src.matchAll(/=\s*fallbackMultiAttackPlan\(/g)) sites.push({ p: p.replace(/\\/g, '/'), before: src.slice(Math.max(0, m.index - 900), m.index) });
  }
  assert.deepEqual(sites.map((s) => s.p).sort(), ['scripts/engine/combat/features/combat-feature-handlers.js', 'scripts/patches/combat-ui-behavior-hotfix.js']);
  for (const s of sites) assert.match(s.before, /actorEntitledToMultiAttackPackage\(/, `${s.p}: the fallback is only reachable for an entitled actor`);
});

test('the shared multi-attack entitlement answer reuses the authority: Double needs Double Attack for the weapon, Triple needs both', async () => {
  const { weaponItem, installReadinessEnvironment, ownAndReady } = await import('./helpers/ready-weapon-fixture.mjs');
  await installReadinessEnvironment();
  const w = weaponItem('w1');
  const a = actor([w], { system: { species: 'Human', size: 'medium', skills: {} } });
  w.actor = a; ownAndReady(a, w);
  const P = ma.FULL_ATTACK_PACKAGES;
  assert.equal(ma.actorEntitledToMultiAttackPackage(a, P.DOUBLE_ATTACK, w), false);
  assert.equal(ma.actorEntitledToMultiAttackPackage(a, P.TRIPLE_ATTACK, w), false);
  assert.equal(ma.actorEntitledToMultiAttackPackage(a, P.DOUBLE_ATTACK, null), false, 'no weapon: nothing to be entitled with');
  assert.equal(ma.actorEntitledToMultiAttackPackage(a, P.NORMAL, w), true, 'a normal full attack is not a feat package');
});

// ---- 4. the second, independent boundary for grapple-feat actions --------------------------------------------------------------------------
test('the grapple authority itself refuses Pin / Trip / Throw / Crush without the feat, independently of the sheet', async () => {
  const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js');
  const attacker = actor([], { name: 'Organic' }); const target = actor([], { id: 'a2', name: 'Target' });
  notes.warn.length = 0;
  assert.equal(await SWSEGrappling.attemptPin(attacker, target, {}), null);
  assert.equal(await SWSEGrappling.tripGrappledOpponent(attacker, target, {}), null);
  assert.equal(await SWSEGrappling.throwGrappledOpponent(attacker, target, {}), null);
  assert.equal(await SWSEGrappling.crushPinnedOpponent(attacker, target, {}), null);
  assert.ok(notes.warn.filter((m) => /lacks the (Pin|Trip|Throw|Crush) feat/i.test(m)).length >= 4, JSON.stringify(notes.warn));
});

// ---- 5. attack-option features: the math authority only honours options the actor owns ------------------------------------------------------
test('forcing an attack option through the router grants no math: the option resolver only sees options from OWNED abilities', async () => {
  const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
  const weapon = { id: 'w', name: 'Sword', type: 'weapon', system: { weaponCategory: 'melee', attackType: 'melee', damage: '1d8' }, flags: {} };
  const a = actor([weapon]);
  const mods = CombatOptionResolver.collectAttackModifiers(a, weapon, { combatOptions: { powerAttack: 5 }, attackOptions: { powerAttack: true } });
  assert.equal(mods.attackBonus, 0, 'no Power Attack penalty/bonus without the feat');
  assert.equal(mods.damageBonus, 0);
});

// ---- 6. active-state flags are display-only ------------------------------------------------------------------------------------------------
test('tracked active-state flags (Rage, Braced, ...) are consumed only by the Combat Features display modules, never by a math engine', () => {
  const users = SCRIPTS.filter((p) => /combatFeatures\??\.activeStates|activeStates\??\.\[/.test(read(p)) || /getActiveCombatFeatureState/.test(read(p))).map((p) => p.replace(/\\/g, '/')).sort();
  for (const p of users) assert.match(p, /scripts\/(engine\/combat\/features|sheets\/v2\/character-sheet)\//, `${p} must be a features/display module`);
});

// ---- 7. every action SOURCE feeds the eligibility verdict --------------------------------------------------------------------------------
test('every registerAction call in the sheet states its origin (nothing reaches the library without an eligibility basis)', () => {
  const src = read('scripts/sheets/v2/character-like-sheet.js');
  const calls = [...src.matchAll(/registerAction\(grouped,/g)];
  assert.equal(calls.length, 5, 'catalog (compendium), catalog (JSON fallback), actor-item, ability, combined');
  const origins = [...src.matchAll(/origin:\s*'(catalog|actor-item|ability|combined|component)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(origins, ['ability', 'actor-item', 'catalog', 'catalog', 'combined']);
  assert.match(src, /row\.eligibility = evaluateCombatActionEligibility\(this\.actor, row\)/);
});

test('feat/talent catalog (263 entries): an actor that owns nothing receives none of them; owning exactly the required item yields only that item\'s cards, unlocked', () => {
  const catalog = JSON.parse(read('data/feat-combat-actions.json'));
  const bare = actor([]);
  assert.deepEqual(AbilityCombatActionResolver.getActions(bare), []);
  const required = new Map();
  let orphan = [];
  for (const [key, a] of Object.entries(catalog)) {
    if (a.requiredFeat) required.set(`feat|${a.requiredFeat}`, { type: 'feat', name: a.requiredFeat });
    else if (a.requiredTalent) required.set(`talent|${a.requiredTalent}`, { type: 'talent', name: a.requiredTalent });
    else orphan.push(key);
  }
  assert.deepEqual(orphan.sort(), ['defensive-fighting', 'skill-focus', 'total-defense'], 'catalog entries with no required feat/talent are never emitted by the resolver (unreachable, documented)');
  let checked = 0;
  for (const { type, name } of required.values()) {
    const owner = actor([{ id: 'own1', name, type, system: {}, flags: {} }]);
    const cards = AbilityCombatActionResolver.getActions(owner);
    assert.ok(cards.length >= 1, `${type} ${name} yields a card`);
    for (const card of cards) {
      assert.ok(card.key.startsWith('ability:own1:'), 'only the owned item\'s cards');
      const e = evaluate(owner, { ...card, origin: 'ability' });
      assert.equal(e.state, S.UNLOCKED, `${name}: ${e.reason}`);
      assert.equal(authorize(owner, card.key, { abilityRow: (k) => AbilityCombatActionResolver.getActions(owner).find((r) => r.key === k) ?? null }).allowed, card.choiceMissing !== true, `${name} execution`);
    }
    // the same card is NOT executable for an actor that does not own the item (a copied key / stale sheet)
    const stranger = actor([]);
    for (const card of cards) assert.equal(authorize(stranger, card.key, { abilityRow: (k) => AbilityCombatActionResolver.getActions(stranger).find((r) => r.key === k) ?? null }).allowed, false);
    checked += 1;
  }
  assert.ok(checked > 100, `crosswalk covered ${checked} distinct feat/talent requirements`);
});

test('metadata-defined feat cards, combined-feat cards and species abilities follow ownership too', () => {
  const metaFeat = { id: 'm1', name: 'Some Feat', type: 'feat', system: { abilityMeta: { combatActions: [{ id: 'x', name: 'X', actionType: 'swift' }] } }, flags: {} };
  assert.deepEqual(AbilityCombatActionResolver.getActions(actor([])), []);
  assert.equal(AbilityCombatActionResolver.getActions(actor([metaFeat])).length, 1);
  assert.deepEqual(CombinedFeatActionResolver.getActions(actor([])), [], 'no combined card without the feats');
  const owner = actor([feat('q', 'Quick Draw'), feat('d', 'Dual Weapon Mastery I')]);
  const card = CombinedFeatActionResolver.getActions(owner).find((c) => c.key === 'combined:dwm1-quick-draw:draw-two-weapons');
  assert.ok(card);
  assert.equal(evaluate(owner, { ...card, origin: 'combined' }).state, S.UNLOCKED);
  const live = (a) => ({ combinedRow: (k) => CombinedFeatActionResolver.getActions(a).find((c) => c.key === k) ?? null });
  assert.equal(authorize(owner, card.key, live(owner)).allowed, true);
  assert.equal(authorize(actor([]), card.key, live(actor([]))).allowed, false, 'a combined key without the feats is refused');
});

// ---- 8. legitimate actor-granted actions are not rejected -----------------------------------------------------------------------------------
test('actor-granted species/special-ability items stay executable while owned and are refused once removed', () => {
  const sp = { id: 's1', type: 'combat-action', name: 'Species Thing', system: {}, flags: { swse: { isSpeciesAbility: true } } };
  const a = actor([sp]);
  assert.equal(authorize(a, 'item:s1:use', {}).allowed, true);
  a.items.splice(0, 1);
  assert.equal(authorize(a, 'item:s1:use', {}).allowed, false);
});

test('actor-flag-defined combat actions are not an extension interface: nothing in the system writes them, and the only reader is the sheet lookup / a legacy attack executor', () => {
  const writers = SCRIPTS.filter((p) => /(setFlag|updateActor|update)\([^)]*combatActions/.test(read(p)) || /flags\.[\w-]+\.combatActions/.test(read(p))).map((p) => p.replace(/\\/g, '/')).sort();
  assert.deepEqual(writers, [], 'no writer of actor-flag combat actions exists');
  // the legacy executor runs a plain attack roll from such a flag; it grants no feat/talent action and is not reachable from the sheet runner
  assert.equal(read('scripts/sheets/v2/character-like-sheet.js').includes('CombatExecutor.executeAttack'), false);
});
