import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Pre-attack modal / CombatOptionResolver convergence.
// The modal must present what the SELECTED attack form (profile / configuration / mode / payload) permits, through the same authorities the
// production attack uses. Real certified weapons from the canonical registry and real feat records from packs/feats.db; nothing is faked at the
// consumer. Cases already proven elsewhere are listed in docs/audits/combat-tab-ux-convergence.md and are not repeated here.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const RC = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const { buildAttackForms, attackFormSelection } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-form-options.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const ATTACKS = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
globalThis.document = globalThis.document ?? { createElement: () => { let t = ''; return { set textContent(v) { t = String(v); }, get innerHTML() { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); } }; } };


const pack = (f) => fs.readFileSync(`packs/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const FEATS = pack('feats.db'); const TALENTS = pack('talents.db');
const ownedFeat = (name, extra = {}) => { const d = FEATS.find((x) => x.name === name); assert.ok(d, `pack feat ${name}`); return { id: `f-${name}`, type: 'feat', name, system: { ...d.system, ...(extra.system ?? {}) }, flags: d.flags ?? {} }; };
const ownedTalent = (name) => { const d = TALENTS.find((x) => x.name === name); assert.ok(d, `pack talent ${name}`); return { id: `t-${name}`, type: 'talent', name, system: d.system, flags: d.flags ?? {} }; };
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
const actorWith = (owned = []) => ({ id: 'a1', type: 'character', name: 'T', items: col(owned), flags: {}, effects: [], getFlag() {}, getRollData() { return {}; },
  system: { bab: 6, level: 6, species: 'Human', size: 'medium', attributes: { str: { base: 14 }, dex: { base: 14 }, con: { base: 10 }, int: { base: 10 }, wis: { base: 10 }, cha: { base: 10 } }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } } });
const canon = (identityKey, system = {}) => ({ id: `w-${identityKey}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey } } }, system });
const formOf = (w, value) => { const info = buildAttackForms(w, {}, { actor: null }); const f = info.forms.find((x) => x.value === value); assert.ok(f, `${value} on ${w.flags.swse.canonicalWeapon.identityKey}`); return f; };
const ids = (options, state) => options.filter((o) => !state || o.state === state).map((o) => o.id).sort();

const POWER_SET_NAMES = ['Power Attack', 'Rapid Strike', 'Flurry', 'Rapid Shot', 'Careful Shot', 'Burst Fire', 'Deadeye', 'Powerful Charge', 'Charging Fire'];
const POWER_SET = POWER_SET_NAMES.map((n) => ownedFeat(n));
const NO_CHARGING_FIRE = () => actorWith(POWER_SET_NAMES.filter((n) => n !== 'Charging Fire').map((n) => ownedFeat(n)));

// ===== A. the selected form is threaded into option discovery (reproduced defect) ======================================================================
test('A1 (defect) the Energy Lance plasma-bolt form is autofire-capable: Burst Fire is offered when the selected form is threaded, and the model does so', async () => {
  const lance = canon('unmapped::Energy Lance');
  const bolt = formOf(lance, 'plasma-bolt');
  const actor = actorWith(POWER_SET);
  // the resolver itself: without the selection it evaluates the DEFAULT (melee) form and hides Burst Fire; with it, Burst Fire is available
  const without = CombatOptionResolver.getAttackOptionsWithState(actor, lance, { attackType: 'ranged' });
  const withSel = CombatOptionResolver.getAttackOptionsWithState(actor, lance, { attackType: 'ranged', ...attackFormSelection(bolt) });
  assert.equal(ids(without).includes('burstFire'), false, 'reproduction: the omitted selection falls back to the default form');
  assert.equal(ids(withSel, 'available').includes('burstFire'), true);
  // the modal model for that selected form must agree with the selected-form answer
  const m = await RC.buildRollConfigModel({ actor, rollType: 'attack', weapon: lance, ...attackFormSelection(bolt) });
  assert.equal(ids(m.combatOptions, 'available').includes('burstFire'), true, 'model options are discovered for the selected form');
});

test('A2 (defect) the modal Autofire capability is the canonical selected-form answer, not an Item-field guess', async () => {
  const lance = canon('unmapped::Energy Lance');
  const actor = actorWith(POWER_SET);
  const bolt = await RC.buildRollConfigModel({ actor, rollType: 'attack', weapon: lance, ...attackFormSelection(formOf(lance, 'plasma-bolt')) });
  const melee = await RC.buildRollConfigModel({ actor, rollType: 'attack', weapon: lance, ...attackFormSelection(formOf(lance, 'melee')) });
  assert.equal(bolt.supportsAutofire, true, 'the certified plasma-bolt form can autofire');
  assert.equal(melee.supportsAutofire, false, 'the melee form cannot');
  const pistol = await RC.buildRollConfigModel({ actor, rollType: 'attack', weapon: canon('weapon-blaster-pistol') });
  assert.equal(pistol.supportsAutofire, false);
});

// ===== B. the live seam: every control and option follows the selected form ===============================================================================
const live = (weapon, formValue, extra = {}) => { const f = formOf(weapon, formValue); return { melee: f.branch === 'melee', selection: attackFormSelection(f), ...extra }; };

test('B1 Siang Lance ranged -> bayonet -> ranged: contexts, options and autofire follow the selected form and restore', () => {
  assert.equal(typeof RC.deriveAttackModalState, 'function', 'the live recompute seam exists');
  const lance = canon('weapon-siang-lance');
  const actor = NO_CHARGING_FIRE();
  const ranged = RC.deriveAttackModalState(actor, lance, live(lance, 'ranged'));
  assert.deepEqual(ranged.contexts, { aim: true, charge: false, flanking: false });
  assert.equal(ids(ranged.options, 'available').includes('rapidShot'), true);
  assert.equal(ids(ranged.options).includes('powerAttack'), false);
  const bayonet = RC.deriveAttackModalState(actor, lance, live(lance, 'bayonet-aao'));
  assert.deepEqual(bayonet.contexts, { aim: false, charge: true, flanking: true });
  assert.equal(ids(bayonet.options).includes('rapidShot'), false, 'ranged-only option leaves with the profile');
  assert.equal(ids(bayonet.options, 'available').includes('powerAttack'), true);
  const back = RC.deriveAttackModalState(actor, lance, live(lance, 'ranged'));
  assert.deepEqual(back.contexts, ranged.contexts); assert.deepEqual(ids(back.options), ids(ranged.options), 'switching back restores the same options');
});

test('B2 Electropole melee <-> thrown, and a profile with zero options', () => {
  const pole = canon('weapon-gungan-electropole');
  const actor = NO_CHARGING_FIRE();
  const melee = RC.deriveAttackModalState(actor, pole, live(pole, 'melee'));
  const thrown = RC.deriveAttackModalState(actor, pole, live(pole, 'thrown'));
  assert.deepEqual(melee.contexts, { aim: false, charge: true, flanking: true });
  assert.deepEqual(thrown.contexts, { aim: true, charge: false, flanking: false });
  assert.equal(ids(thrown.options).includes('powerAttack'), false);
  const bare = RC.deriveAttackModalState(actorWith([]), pole, live(pole, 'thrown'));
  assert.deepEqual(bare.options, [], 'an actor with no options: an empty list, not an error');
  const again = RC.deriveAttackModalState(actor, pole, live(pole, 'melee'));
  assert.equal(ids(again.options).length > 0, true, 'options reappear after an empty profile');
});

test('B3 Charging Fire: a ranged Charge context exists only for an owner, and never carries the ordinary melee Charge', () => {
  const pistol = canon('weapon-blaster-pistol');
  const owner = RC.deriveAttackModalState(actorWith([ownedFeat('Charging Fire')]), pistol, { melee: false, selection: {} });
  const none = RC.deriveAttackModalState(actorWith([]), pistol, { melee: false, selection: {} });
  assert.equal(owner.contexts.charge, true); assert.equal(owner.contexts.aim, true);
  assert.equal(none.contexts.charge, false); assert.equal(none.contexts.aim, true);
  const melee = RC.deriveAttackModalState(actorWith([]), canon('lightsaber-chassis-archaic-lightsaber'), { melee: true, selection: {} });
  assert.deepEqual(melee.contexts, { aim: false, charge: true, flanking: true });
});

test('B4 Burst Fire: not offered without the feat; offered (gated on Autofire) only for an autofire-capable selected form; selected state follows', () => {
  const lance = canon('unmapped::Energy Lance');
  const noFeat = RC.deriveAttackModalState(actorWith([]), lance, live(lance, 'plasma-bolt'));
  assert.equal(ids(noFeat.options).includes('burstFire'), false);
  const feat = actorWith([ownedFeat('Burst Fire')]);
  const bolt = RC.deriveAttackModalState(feat, lance, live(lance, 'plasma-bolt'));
  assert.equal(ids(bolt.options, 'available').includes('burstFire'), true);
  const melee = RC.deriveAttackModalState(feat, lance, live(lance, 'melee'));
  assert.equal(ids(melee.options).includes('burstFire'), false, 'a form that cannot autofire never offers Burst Fire');
  assert.equal(bolt.autofire.supported, true); assert.equal(melee.autofire.supported, false);
  assert.match(melee.autofire.reason, /autofire/i);
  // a pistol (ranged, no autofire): owning the feat does not make it selectable
  const pistol = canon('weapon-blaster-pistol');
  const p = RC.deriveAttackModalState(feat, pistol, { melee: false, selection: {} });
  assert.equal(ids(p.options, 'available').includes('burstFire'), false);
});

test('B5 Aim-gated options are shown disabled WITH their reason until Aim is declared, then selectable; Aim never changes eligibility of unowned options', () => {
  const pistol = canon('weapon-blaster-pistol');
  const a = actorWith([ownedFeat('Careful Shot'), ownedFeat('Deadeye')]);
  const idle = RC.deriveAttackModalState(a, pistol, { melee: false, selection: {} });
  const careful = idle.options.find((o) => o.id === 'carefulShot');
  assert.equal(careful.state, 'disabled'); assert.match(careful.reason, /Aim/i);
  const aimed = RC.deriveAttackModalState(a, pistol, { melee: false, selection: {}, aim: true });
  assert.equal(aimed.options.find((o) => o.id === 'carefulShot').state, 'available');
  assert.equal(ids(aimed.options).includes('powerAttack'), false);
});

test('B6 an illegal stale selection is reported and rendered unselected: a profile change cannot carry a hidden checked option into the roll', () => {
  const lance = canon('weapon-siang-lance');
  const a = actorWith(POWER_SET);
  // Rapid Shot was ticked on the ranged form, then the player switched to the bayonet
  const st = RC.deriveAttackModalState(a, lance, live(lance, 'bayonet-aao', { combatOptions: { rapidShot: true, powerAttack: 3 } }));
  assert.deepEqual(st.staleOptionIds, ['rapidShot']);
  assert.equal(st.options.some((o) => o.id === 'rapidShot'), false);
  const pa = st.options.find((o) => o.id === 'powerAttack');
  assert.equal(pa.state, 'available'); assert.equal(Number(pa.value), 3, 'a still-legal selection is preserved');
  // an option that is owned but momentarily gated renders unselected (a disabled input never submits)
  const gated = RC.deriveAttackModalState(actorWith([ownedFeat('Careful Shot')]), canon('weapon-blaster-pistol'), { melee: false, selection: {}, combatOptions: { carefulShot: true } });
  assert.equal(gated.options.find((o) => o.id === 'carefulShot').checked, false);
  assert.deepEqual(gated.staleOptionIds, ['carefulShot']);
});

// ===== C. the DOM seam: stable mount points, rebuilt controls ===============================================================================================
function fakeForm(initial = {}) {
  const nodes = {
    '[data-rcd-attack-options]': { innerHTML: '<h5>old</h5>', hidden: false },
    '[data-rcd-attack-context]': { innerHTML: '', hidden: false },
    '[name="attackOptions.autofire"]': { checked: initial.autofire === true, disabled: false },
    '[data-rcd-autofire-note]': { textContent: '' },
    '[name="aiming"]': initial.aiming === undefined ? null : { checked: initial.aiming },
    '[name="charging"]': initial.charging === undefined ? null : { checked: initial.charging },
    '[name="flanking"]': initial.flanking === undefined ? null : { checked: initial.flanking }
  };
  return { nodes, querySelector: (s) => nodes[s] ?? null, querySelectorAll: () => [] };
}

test('C1 the option panel keeps its mount point: empty -> populated -> empty -> populated never destroys it', () => {
  const form = fakeForm();
  const a = actorWith(POWER_SET);
  const pole = canon('weapon-gungan-electropole');
  const sequence = [actorWith([]), a, actorWith([]), a];
  for (const actor of sequence) {
    RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, pole, live(pole, 'melee')), { actor });
    assert.ok(form.querySelector('[data-rcd-attack-options]'), 'mount point still present');
  }
  assert.equal(form.nodes['[data-rcd-attack-options]'].hidden, false);
  assert.match(form.nodes['[data-rcd-attack-options]'].innerHTML, /Power Attack/);
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actorWith([]), pole, live(pole, 'melee')), { actor: actorWith([]) });
  assert.equal(form.nodes['[data-rcd-attack-options]'].hidden, true);
  assert.equal(form.nodes['[data-rcd-attack-options]'].innerHTML, '');
});

test('C2 context controls are rebuilt from the selected form and keep the player\'s still-relevant declarations', () => {
  const lance = canon('weapon-siang-lance'); const actor = actorWith([]);
  const form = fakeForm({ aiming: true });
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, lance, live(lance, 'ranged', { aim: true })), { actor, previous: { aiming: true } });
  assert.match(form.nodes['[data-rcd-attack-context]'].innerHTML, /name="aiming"[^>]*checked/);
  assert.doesNotMatch(form.nodes['[data-rcd-attack-context]'].innerHTML, /name="charging"|name="flanking"/);
  // switch to the bayonet: Aim leaves (and is not carried), Charge and Flanking appear unchecked
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, lance, live(lance, 'bayonet-aao')), { actor, previous: { aiming: true } });
  const html = form.nodes['[data-rcd-attack-context]'].innerHTML;
  assert.doesNotMatch(html, /name="aiming"/); assert.match(html, /name="charging"/); assert.match(html, /name="flanking"/);
  assert.doesNotMatch(html, /checked/);
  // switch back: Aim returns, unchecked (the old declaration belonged to the previous form's context)
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, lance, live(lance, 'ranged')), { actor, previous: {} });
  assert.match(form.nodes['[data-rcd-attack-context]'].innerHTML, /name="aiming"/);
});

test('C3 the Autofire control follows the selected form: unsupported -> disabled and cleared, with the reason', () => {
  const lance = canon('unmapped::Energy Lance'); const actor = actorWith([]);
  const form = fakeForm({ autofire: true });
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, lance, live(lance, 'melee')), { actor });
  assert.equal(form.nodes['[name="attackOptions.autofire"]'].disabled, true);
  assert.equal(form.nodes['[name="attackOptions.autofire"]'].checked, false, 'an unsupported Autofire declaration cannot be submitted');
  assert.match(form.nodes['[data-rcd-autofire-note]'].textContent, /cannot|unavailable/i);
  RC.applyAttackModalState(form, RC.deriveAttackModalState(actor, lance, live(lance, 'plasma-bolt')), { actor });
  assert.equal(form.nodes['[name="attackOptions.autofire"]'].disabled, false);
});

// ===== D. the shipped template and wiring use the seam ========================================================================================================
test('D1 the modal keeps the mount points and the wiring recomputes through the seam (no inline duplicate logic)', () => {
  const src = fs.readFileSync('scripts/rolls/roll-config.js', 'utf8');
  assert.match(src, /data-rcd-attack-options/); assert.match(src, /data-rcd-attack-context/); assert.match(src, /data-rcd-autofire-note/);
  assert.equal(/container\.remove\(\)/.test(src), false, 'the option panel mount point is never removed');
  assert.equal(/function weaponSupportsAutofire\(weapon = \{\}\)/.test(src), false, 'the local Item-field autofire check is gone (the canonical classifier is used)');
  assert.match(src, /deriveAttackModalState\(/); assert.match(src, /applyAttackModalState\(/);
});

// ===== E. production parity: what the modal offers is what the roll accepts ==================================================================================
test('E1 the options the modal offers for the selected form are exactly the options the roll resolver applies', async () => {
  const lance = canon('weapon-siang-lance'); const actor = actorWith(POWER_SET);
  for (const value of ['ranged', 'bayonet-aao']) {
    const f = formOf(lance, value); const sel = attackFormSelection(f);
    const st = RC.deriveAttackModalState(actor, lance, { melee: f.branch === 'melee', selection: sel });
    const ctx = { attackType: f.branch, ...sel };
    const roll = CombatOptionResolver.getAvailableAttackOptions(actor, lance, ctx).map((o) => o.id).sort();
    assert.deepEqual(ids(st.options, 'available').filter((id) => !['carefulShot', 'deadeye', 'chargingFire', 'powerfulCharge', 'burstFire'].includes(id)), roll.filter((id) => !['carefulShot', 'deadeye', 'chargingFire', 'powerfulCharge', 'burstFire'].includes(id)), `${value}: modal == roll resolver (context-gated options aside)`);
  }
});

// ===== F. ammunition: a read-only presentation of the production preflight ===============================================================================
test('F1 the modal ammunition status is the production preflight on the selected form and the chosen option; opening or changing the dialog spends nothing', async () => {
  const { previewAmmoPreflight } = ATTACKS;
  globalThis.game = globalThis.game ?? {};
  const prior = globalThis.game.settings;
  globalThis.game.settings = { get: (_sys, key) => (key === 'trackBlasterCharges' ? true : undefined) };
  try {
    const mk = (current) => canon('unmapped::Energy Lance', { ammunition: { current, max: 20 } });
    const bolt = attackFormSelection(formOf(mk(20), 'plasma-bolt'));
    const burst = { combatOptions: { burstFire: true }, attackOptions: {} };
    const low = mk(3); const full = mk(12);
    const none = previewAmmoPreflight(actorWith([ownedFeat('Burst Fire')]), low, { attackType: 'ranged', ...bolt, ...burst });
    assert.equal(none.ok, false); assert.equal(none.amount, 5, 'Burst Fire uses the five-shot cost'); assert.equal(none.current, 3); assert.equal(none.deficit, 2);
    const fine = previewAmmoPreflight(actorWith([ownedFeat('Burst Fire')]), full, { attackType: 'ranged', ...bolt, ...burst });
    assert.equal(fine.ok, true); assert.equal(fine.amount, 5);
    assert.equal(low.system.ammunition.current, 3, 'previewing never spends'); assert.equal(full.system.ammunition.current, 12);
    // a melee form of the same weapon draws no ammunition
    const melee = previewAmmoPreflight(actorWith([]), full, { attackType: 'melee', ...attackFormSelection(formOf(full, 'melee')) });
    assert.notEqual(melee.tracked, true);
  } finally { globalThis.game.settings = prior; }
});

test('F2 the dialog shows the status without blocking: a shortfall is explained, an untracked weapon shows nothing', () => {
  const form = fakeForm(); form.nodes['[data-rcd-ammo-status]'] = { textContent: '', hidden: true };
  const st = RC.deriveAttackModalState(actorWith([]), canon('weapon-blaster-pistol'), { melee: false, selection: {} });
  RC.applyAttackModalState(form, st, { actor: actorWith([]), ammo: { ok: false, tracked: true, amount: 5, current: 3, max: 20, deficit: 2, message: 'x' }, parts: ['ammo'] });
  assert.match(form.nodes['[data-rcd-ammo-status]'].textContent, /3\/20/); assert.match(form.nodes['[data-rcd-ammo-status]'].textContent, /needs? 5/i); assert.match(form.nodes['[data-rcd-ammo-status]'].textContent, /refused|nothing is spent/i);
  assert.equal(form.nodes['[data-rcd-ammo-status]'].hidden, false);
  RC.applyAttackModalState(form, st, { actor: actorWith([]), ammo: { ok: true, tracked: true, amount: 1, current: 12, max: 20 }, parts: ['ammo'] });
  assert.match(form.nodes['[data-rcd-ammo-status]'].textContent, /12\/20/);
  RC.applyAttackModalState(form, st, { actor: actorWith([]), ammo: { ok: true, tracked: false, skipped: true, amount: 0 }, parts: ['ammo'] });
  assert.equal(form.nodes['[data-rcd-ammo-status]'].hidden, true);
});

test('F3 an installed modification reaches the modal ammunition status; an uninstalled / deactivated / development-off one grants nothing (no duplicate calculator)', async () => {
  globalThis.CONFIG ??= { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
  globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
  const P = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-install-service.js');
  const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
  const data = await P.loadModificationData({ fetchText: async (p) => fs.readFileSync(p, 'utf8') });
  store.setVerifiedModificationData(data);
  globalThis.game = globalThis.game ?? {};
  const prior = globalThis.game.settings;
  let dev = true;
  globalThis.game.settings = { get: (_sys, key) => (key === 'trackBlasterCharges' ? true : key === 'modificationV2DevelopmentMode' ? dev : undefined) };
  try {
    const iec = (state = 'installed') => ({ instanceId: 'i1', typedDefinitionId: 'kotor-accessory-improved-energy-cell::weapon', domain: 'weapon', state, basis: 'DEVELOPMENT_GM_POLICY', provisional: true });
    const rifle = (instances) => { const w = canon('weapon-blaster-rifle', { ammunition: { current: 8, max: 10 } }); w.flags['foundryvtt-swse'] = { customization: { installedUpgrades: instances } }; return w; };
    const status = (w) => ATTACKS.previewAmmoPreflight(actorWith([]), w, { attackType: 'ranged' });
    assert.equal(status(rifle([iec()])).max, 20, 'installed: the certified capacity doubling is visible in the dialog status');
    assert.equal(status(rifle([])).max, 10, 'not installed: nothing');
    assert.equal(status(rifle([iec('deactivated')])).max, 10, 'deactivated: nothing');
    dev = false;
    assert.equal(status(rifle([iec()])).max, 10, 'development setting off: nothing');
  } finally { globalThis.game.settings = prior; }
});

// ===== G. Aim / Charge: declarations versus completed actions (documented boundary) ==============================================================================
test('G1 the dialog Aim / Charge boxes are DECLARATIONS: a declared Aim suppresses the production auto-spend; selecting Careful Shot without it makes the roll pay for Aim', async () => {
  const { prepareCoreAttackOptionRollContext } = await import('/systems/foundryvtt-swse/scripts/engine/feats/core-attack-option-action-economy.js');
  const undeclared = prepareCoreAttackOptionRollContext({ combatOptions: { carefulShot: true } });
  assert.equal(undeclared.swseAutoPrerequisites.aim, true, 'not declared: the roll will spend the Aim prerequisite (fails closed if unaffordable)');
  const declared = prepareCoreAttackOptionRollContext({ combatOptions: { carefulShot: true }, aim: true });
  assert.equal(declared.swseAutoPrerequisites.aim, false, 'declared: trusted (GM-adjudicated), nothing is spent');
  const charge = prepareCoreAttackOptionRollContext({ combatOptions: { powerfulCharge: true } });
  assert.equal(charge.swseAutoPrerequisites.charge, true);
  assert.equal(prepareCoreAttackOptionRollContext({ combatOptions: { powerfulCharge: true }, charge: true }).swseAutoPrerequisites.charge, false);
  // the dialog's gating (B5) keeps Careful Shot disabled until Aim is declared: that boundary is recorded as MODAL-001 in the rules register
});

test('G2 the Aim / Charging controls say what they are: a declaration that the setup action was already taken, not a spend', () => {
  const html = RC.contextControlsHtml({ aim: true, charge: true, flanking: true }, actorWith([]), {});
  assert.match(html, /already/i); assert.match(html, /does not spend|not spent|no action is spent/i);
});
