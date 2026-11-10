import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Combat tab UX convergence: the template contract (order, one library, no retired partials, no lost operation) and the view models that feed it, run
// against the REAL Combat Loadout Preview. No calculation is made here: every number is read back from the production resolvers the preview wraps.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { callAll() {}, on() {}, once() {} };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = { combat: null, user: { targets: { first: () => null } }, settings: { get: () => false } };

const P = 'templates/actors/character/v2-concept/partials/';
const read = (f) => fs.readFileSync(f, 'utf8');
const tab = read(`${P}tabs/combat-tab.hbs`);
const includes = [...tab.matchAll(/\{\{> "systems\/foundryvtt-swse\/(templates\/[^"]+)"\}\}/g)].map((m) => m[1]);
const rendered = includes.map((f) => read(f)).join('\n') + '\n' + tab;
const preload = read('scripts/load-templates.js');

// ---------------------------------------------------------------------------------------------------------------------------------------
// A. Template contract
// ---------------------------------------------------------------------------------------------------------------------------------------
test('A1 Active attacks render FIRST, then the action economy strip, then status, then the one library, then advanced', () => {
  assert.deepEqual(includes.map((f) => f.split('/').pop()), ['combat-attacks-panel.hbs', 'action-economy-strip.hbs', 'combat-status-compact.hbs', 'combat-action-library.hbs', 'combat-advanced-reference.hbs']);
  assert.equal(tab.indexOf('combat-attacks-panel.hbs') < tab.indexOf('action-economy-strip.hbs'), true);
  // nothing renders inline above the attacks: the tab is exactly the five includes inside one root
  assert.equal(tab.split('<section').length - 1, 0, 'the tab itself holds no inline panels');
});
test('A2 exactly one action library, one economy strip, one attack section; no duplicate Attack Ledger or lane board', () => {
  for (const [hook, n] of [['data-cal-root', 1], ['data-action-economy-strip', 1], ['data-combat-attacks', 1], ['data-combat-status-compact', 1], ['data-combat-advanced', 1]]) assert.equal(rendered.split(hook).length - 1, n, hook);
  for (const dead of ['data-combat-actions-board', 'data-combat-action-group', 'swse-concept-attack-board', 'swse-concept-action-board', 'swse-concept-combat-command-rail', 'data-action-economy-star', 'swse-concept-action-groups', 'Attack Ledger']) assert.equal(rendered.includes(dead), false, `retired hook ${dead} must not render`);
});
test('A3 the retired partials are gone from disk and from the preload list; every included partial exists and is preloaded', () => {
  for (const f of ['actions-panel', 'attacks-panel', 'combat-actions-panel', 'combat-status-panel', 'effective-defenses-panel', 'action-economy-indicator']) {
    assert.equal(fs.existsSync(`${P}panels/${f}.hbs`), false, `${f}.hbs is retired`);
    assert.equal(preload.includes(`actors/character/v2-concept/partials/panels/${f}.hbs`), false, `${f}.hbs must not be preloaded`);
  }
  for (const f of includes) { assert.ok(fs.existsSync(f), f); assert.ok(preload.includes(f.replace(/^templates\//, 'systems/foundryvtt-swse/templates/')), `${f} is preloaded`); }
  // the shared economy indicator the vehicle sheet renders is untouched
  assert.ok(fs.existsSync('templates/actors/shared/v2-concept/partials/panels/action-economy-indicator.hbs'));
  assert.ok(read('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs').includes('shared/v2-concept/partials/panels/action-economy-indicator.hbs'));
});
test('A4 NO LOSS OF CAPABILITY: every operation the old Combat tab exposed is still reachable (baseline pinned from the pre-change templates)', () => {
  const OLD = ['add-item', 'cmd-levelup', 'new-round', 'open-item', 'rest-second-wind', 'roll-attack', 'roll-initiative', 'roll-unarmed-attack', 'sheet-tab', 'spend-force-point', 'swse-action-economy-undo', 'swse-combat-cover-option', 'swse-combat-defensive-mode', 'swse-combat-toggle-prone', 'swse-v2-use-action', 'use-second-wind'];
  const now = new Set([...rendered.matchAll(/data-action="([^"{}]+)"/g)].map((m) => m[1]));
  assert.deepEqual(OLD.filter((a) => !now.has(a)), [], 'a previously reachable operation was dropped');
  for (const gained of ['toggle-weapon-readiness', 'toggle-activated', 'change-weapon-configuration', 'set-power-source']) assert.ok(now.has(gained), `${gained} is carried on the attack cards`);
  // the editable defense formula inputs / selects survive (cover, stance and prone are reached through the status expand)
  assert.ok(rendered.includes('name="{{part.path}}"'));
  assert.equal(rendered.split('data-action="swse-v2-use-action"').length - 1, 1, 'one use-action template, driven by the one library');
});
test('A5 the attack cards read ONLY the preview-backed view model: no legacy mirror fields (Item attackTotal / damage)', () => {
  const attacks = read(`${P}panels/combat-attacks-panel.hbs`);
  for (const legacy of ['attack.attackTotal', 'attack.damageFormula', 'attack.critRange', 'conceptLayout.combat.attacks', 'conceptLayout.combat.unarmedAttack']) assert.equal(attacks.includes(legacy), false, legacy);
  assert.ok(attacks.includes('conceptLayout.combat.loadout.cards'));
});
test('A6 the library rows use the existing use-action handler, with an explicit name hook, and reference actions are not executable', () => {
  const lib = read(`${P}panels/combat-action-library.hbs`);
  assert.ok(/\{\{#if a\.executable\}\}[\s\S]*data-action="swse-v2-use-action"[\s\S]*data-action-name="\{\{a\.name\}\}"[\s\S]*\{\{else\}\}[\s\S]*Reference only/.test(lib));
  assert.ok(/data-action-id="\{\{a\.key\}\}"[^>]*\{\{#unless a\.canUseNow\}\}disabled/.test(lib), 'an unavailable action stays disabled and says why');
  assert.ok(lib.includes('<details class="swse-cmb__lib" data-cmb-details="library">') && !/<details[^>]*\bopen\b/.test(lib), 'collapsed by default');
});
test('A7 browsing is DOM-only: the tab UI module never touches an actor, document, flag or update', () => {
  const ui = read('scripts/sheets/v2/character-sheet/combat-tab-ui.js');
  const code = ui.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const forbidden of ['.actor', 'setFlag', 'unsetFlag', '.update(', 'updateEmbedded', 'ActorEngine', 'game.', 'ChatMessage']) assert.equal(code.includes(forbidden), false, forbidden);
});
test('A8 the stylesheet is registered and carries no glow or pulsing animation', () => {
  assert.ok(JSON.parse(read('system.json')).styles.includes('styles/sheets/combat-tab.css'));
  const css = read('styles/sheets/combat-tab.css');
  assert.equal(/animation\s*:|@keyframes|box-shadow\s*:[^;]*(?:rgba|color-mix)[^;]*\d+px\s+\d+px\s+\d{2,}px|text-shadow/.test(css), false);
});

// ---------------------------------------------------------------------------------------------------------------------------------------
// B. View models against the real preview
// ---------------------------------------------------------------------------------------------------------------------------------------
const F = await import('./helpers/ready-weapon-fixture.mjs'); await F.installReadinessEnvironment();
const { buildLoadoutPreviews } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/loadout-preview.js');
const { buildCombatLoadout } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-loadout-context.js');
const { buildEquipmentWorkspace, applyLoadoutPreviews } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-context.js');
const { readCombatReadiness } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const hero = (items, type = 'character', extra = {}) => { const a = F.actorOf(items, { type }); a.system = { species: 'Human', size: 'Medium', bab: 5, level: 5, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'advanced-melee', 'lightsabers'], ...extra }; return a; };
const ONE = ['natural-arm-1'], TWO = ['natural-arm-1', 'natural-arm-2'];
const saber = (grip, id = 'w1') => F.readiedWeapon(id, { key: F.SABER_KEY, wielded: grip, appendageIds: grip === 'two-handed' ? TWO : ONE });
const pistol = (id = 'p1', apps = ['natural-arm-2']) => F.readiedWeapon(id, { key: 'weapon-blaster-pistol', wielded: 'one-handed', appendageIds: apps, system: { weaponCategory: 'ranged' } });
const rowOf = (i) => ({ id: i.id, name: i.name, img: '', type: i.type, typeLabel: i.type, quantity: 1, weight: 1, value: 0, tags: [], equipped: false });
async function both(actor, { unarmed = null, attackLocked = false } = {}) {
  const readiness = readCombatReadiness(actor);
  const previews = await buildLoadoutPreviews(actor, { readiness });
  const ws = applyLoadoutPreviews(buildEquipmentWorkspace(actor, { groups: [{ id: 'a', entries: Array.from(actor.items).map(rowOf) }], readiness, isGM: true }), previews);
  // ready views mimic the sheet's derived list: READIED weapons only
  const readyViews = [...previews.values()].filter((p) => p.ready).map((p) => ({ weaponId: p.weaponId, weaponName: p.name }));
  const loadout = buildCombatLoadout({ readyViews, heldViews: new Map(), unarmed, previews, attackLocked });
  return { previews, ws, loadout };
}

test('B1 a two-handed weapon is ONE attack card, readied, with its grip, and the Equipment tab shows the identical numbers', async () => {
  const w = saber('two-handed'); const { loadout, ws } = await both(hero([w]));
  assert.equal(loadout.cards.length, 1, 'not duplicated per hand');
  const c = loadout.cards[0];
  assert.deepEqual([c.toHitLabel, c.damageRangeLabel, c.damageFormula, c.gripLabel, c.stateLabel], ['+8', '10–20', '2d6 + 8', 'Two-handed', 'Readied']);
  const anchor = ws.slots.find((s) => s.occupant?.isAnchor).occupant.preview;
  assert.deepEqual([c.toHitLabel, c.damageRangeLabel, c.damageFormula], [anchor.attackLabel, anchor.damageRangeLabel, anchor.damageFormula], 'Combat tab == Equipment tab');
  assert.equal(c.canRoll, true);
});
test('B2 two separate readied weapons are two independent cards; no dual-weapon attack is inferred', async () => {
  const { loadout } = await both(hero([saber('one-handed', 's1'), pistol('p1')]));
  assert.deepEqual(loadout.cards.map((c) => c.weaponId).sort(), ['p1', 's1']);
  assert.ok(loadout.cards.every((c) => !('dualWield' in c) && c.ready && c.canRoll));
  const alone = (await both(hero([saber('one-handed', 's1')]))).loadout.cards[0];
  assert.equal(loadout.cards.find((c) => c.weaponId === 's1').toHitLabel, alone.toHitLabel, 'holding a second weapon changes nothing');
});
test('B3 a held-but-not-readied weapon is listed AFTER the readied one, marked not drawn, and is not rollable', async () => {
  const held = F.equippedWeapon('h1', { key: F.SABER_KEY });   // EQUIPPED (held), not READIED
  const { loadout } = await both(hero([pistol('p1', ONE), held]));
  assert.deepEqual(loadout.cards.map((c) => c.weaponId), ['p1', 'h1']);
  const h = loadout.cards[1];
  assert.equal(h.ready, false); assert.equal(h.stateLabel, 'Held · not drawn'); assert.equal(h.canRoll, false); assert.match(h.rollDisabledReason, /Draw/);
});
test('B4 Unarmed Strike is last; its range appears only when its formula is plain dice; it rolls unless attacks are locked', async () => {
  const unarmed = { name: 'Unarmed Strike', attackTotal: 8, damageFormula: '1d4 + 3', critMult: 'x2', damageType: 'bludgeoning' };
  const { loadout } = await both(hero([pistol('p1', ONE)]), { unarmed });
  const u = loadout.cards.at(-1);
  assert.deepEqual([u.kind, u.toHitLabel, u.damageRangeLabel, u.canRoll], ['unarmed', '+8', '4–7', true]);
  const locked = (await both(hero([pistol('p1', ONE)]), { unarmed, attackLocked: true })).loadout;
  assert.ok(locked.cards.every((c) => c.canRoll === false) && locked.cards.every((c) => /locked/.test(c.rollDisabledReason)));
  const odd = buildCombatLoadout({ unarmed: { name: 'Strike', attackTotal: 2, damageFormula: 'Varies' } }).cards[0];
  assert.equal(odd.damageRangeLabel, '—');
});
test('B5 an unresolved preview is an explicit unavailable state: NO Item formula, no bonus, not rollable', () => {
  const legacy = { weaponId: 'l1', weaponName: 'Homebrew', attackTotal: 99, damageFormula: '9d9', critMult: 'x2' };   // what the stale mirror would have shown
  const { cards } = buildCombatLoadout({ readyViews: [legacy], previews: new Map([['l1', { weaponId: 'l1', name: 'Homebrew', ready: true, calculationStatus: 'unresolved', explanation: 'This weapon has no certified canonical identity, so no attack can be previewed.' }]]) });
  const c = cards[0];
  assert.deepEqual([c.toHitLabel, c.damageRangeLabel, c.damageFormula, c.unavailable, c.canRoll], ['—', '—', '', true, false]);
  assert.match(c.unavailableReason, /no certified canonical identity/);
  const none = buildCombatLoadout({ readyViews: [legacy], previews: new Map() }).cards[0];
  assert.deepEqual([none.toHitLabel, none.damageFormula, none.canRoll], ['—', '', false], 'no preview at all: never the legacy numbers');
});
test('B6 a multi-profile weapon names the shown profile and says other modes exist', async () => {
  const lance = F.readiedWeapon('s2', { key: 'weapon-siang-lance', wielded: 'two-handed', appendageIds: TWO, system: { weaponCategory: 'ranged' } });
  const c = (await both(hero([lance]))).loadout.cards[0];
  assert.match(c.profileNote, /Ranged shot/); assert.match(c.profileNote, /\+1 mode/);
});
test('B7 NPC statblock-flat attack keeps its published totals (preview-backed card)', async () => {
  const w = F.readiedWeapon('n1', { key: 'weapon-blaster-pistol', wielded: 'one-handed', appendageIds: ONE, system: { weaponCategory: 'ranged' }, flags: { swse: { npc: { useFlat: true, flatAttackBonus: 7, flatDamageFormula: '2d6+3' } } } });
  const npc = hero([w], 'npc', { bab: 0, level: 3, npcProfile: { mode: 'play', sourceAuthority: 'statblock' } });
  const c = (await both(npc)).loadout.cards[0];
  assert.deepEqual([c.toHitLabel, c.damageFormula, c.damageRangeLabel], ['+7', '2d6+3', '5–15']);
});
test('B8 the card numbers equal what the real rollAttack / rollDamage produce for the same actor, weapon, profile and grip', async () => {
  const formulas = []; let posted = [];
  const stub = async (f) => { formulas.push(String(f)); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  RollEngine.safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  ActionEconomyConsumption.spend = async () => ({ allowed: true, committed: true, rollback: async () => {} });
  const tgt = { id: 't1', name: 'D', type: 'npc', flags: { swse: {} }, effects: [], items: [], getFlag() {}, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } };
  for (const w of [saber('two-handed'), saber('one-handed'), pistol('p9', ONE)]) {
    const A = hero([w]); const card = (await both(A)).loadout.cards[0];
    formulas.length = 0; posted = [];
    assert.ok(await rollAttack(A, w, { target: tgt, suppressChat: false }));
    const atk = Number(Function(`return ${formulas[0].replace(/^\s*1d20/, '0')}`)());
    const ctx = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    formulas.length = 0;
    await rollDamage(A, w, { suppressChat: true, target: tgt, combatContext: ctx, workflowContext: ctx });
    assert.equal(card.toHitLabel, atk >= 0 ? `+${atk}` : `${atk}`, 'to hit');
    assert.equal(card.damageFormula.replace(/\s/g, ''), formulas[0].replace(/\s/g, ''), 'damage formula');
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------
// C. Action library view model + browse logic
// ---------------------------------------------------------------------------------------------------------------------------------------
const { buildCombatActionLibrary, orderEconomySteps, LIBRARY_CATEGORIES } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-action-library-context.js');
const { matchesAction, compareActions, defaultCombatTabState } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-tab-ui.js');
const act = (o) => ({ key: 'k', name: 'N', laneKey: 'standard', cost: 1, executable: true, canUseNow: true, sourceName: 'S', description: 'd', itemId: '', ...o });
const groups = [
  { key: 'standard', items: [act({ key: 'a', name: 'Aim' }), act({ key: 'f', name: 'Fire', canUseNow: false, unavailableReason: 'Standard action unavailable' }), act({ key: 'r', name: 'Recall', executable: false })] },
  { key: 'swift', items: [act({ key: 'a', name: 'Aim', laneKey: 'swift' })] },
  { key: 'reaction', items: [act({ key: 'b', name: 'Block', laneKey: 'reaction' })] },
  { key: 'free', items: [act({ key: 'x', name: 'Speak', laneKey: 'free', cost: 0 })] }
];
test('C1 seven categories in the required order, All last, counts correct, every action listed exactly once', () => {
  const lib = buildCombatActionLibrary(groups);
  assert.deepEqual(lib.categories.map((c) => c.label), ['Standard', 'Move', 'Swift', 'Full-round', 'Reaction', 'Free', 'All']);
  assert.equal(lib.categories.at(-1).key, 'all');
  assert.deepEqual(Object.fromEntries(lib.categories.map((c) => [c.key, c.count])), { standard: 3, move: 0, swift: 1, 'full-round': 0, reaction: 1, free: 1, all: 6 });
  assert.equal(lib.items.length, 6); assert.equal(lib.total, 6);
  assert.equal(new Set(lib.items.map((i) => `${i.key}|${i.laneKey}`)).size, 6, 'Aim is two distinct actions (standard and swift), each once');
});
test('C2 only the default category is visible at first; availability is honest (usable / unavailable with reason / reference)', () => {
  const lib = buildCombatActionLibrary(groups);
  assert.deepEqual(lib.items.filter((i) => i.visible).map((i) => i.laneKey), ['standard', 'standard', 'standard']);
  const by = Object.fromEntries(lib.items.filter((i) => i.laneKey === 'standard').map((i) => [i.name, i]));
  assert.deepEqual([by.Aim.availability, by.Fire.availability, by.Recall.availability], ['available', 'unavailable', 'reference']);
  assert.equal(by.Fire.reason, 'Standard action unavailable'); assert.equal(by.Fire.canUseNow, false);
  assert.match(by.Recall.reason, /cannot be used from the sheet/); assert.equal(by.Recall.executable, false);
  assert.equal(by.Aim.reason, '');
});
test('C3 search / availability filter / category are pure functions of the descriptors (browsing changes nothing)', () => {
  const lib = buildCombatActionLibrary(groups);
  const d = lib.items.map((i) => ({ lane: i.laneKey, avail: i.availability, search: i.searchText, name: i.name, source: i.sourceName, cost: i.costLabel }));
  const st = (o) => ({ ...defaultCombatTabState(), ...o });
  assert.equal(d.filter((x) => matchesAction(x, st({ tab: 'all' }))).length, 6);
  assert.deepEqual(d.filter((x) => matchesAction(x, st({ tab: 'all', query: 'aim' }))).map((x) => x.lane).sort(), ['standard', 'swift']);
  assert.equal(d.filter((x) => matchesAction(x, st({ tab: 'all', avail: 'reference' }))).length, 1);
  assert.equal(d.filter((x) => matchesAction(x, st({ tab: 'standard', avail: 'unavailable' }))).length, 1);
  assert.equal(d.filter((x) => matchesAction(x, st({ tab: 'move' }))).length, 0, 'an empty category shows nothing');
  const snapshot = JSON.stringify(groups); buildCombatActionLibrary(groups); assert.equal(JSON.stringify(groups), snapshot, 'the source rows are never mutated');
});
test('C4 sort by name / source / cost / availability, ascending and descending (descending is the exact reverse)', () => {
  const rows = [{ name: 'B', source: 'x', cost: '2', avail: 'unavailable' }, { name: 'A', source: 'z', cost: '1', avail: 'reference' }, { name: 'C', source: 'y', cost: '', avail: 'available' }];
  const order = (sort, dir) => [...rows].sort((a, b) => compareActions(a, b, { sort, dir })).map((r) => r.name).join('');
  assert.equal(order('name', 'asc'), 'ABC'); assert.equal(order('name', 'desc'), 'CBA');
  assert.equal(order('source', 'asc'), 'BCA'); assert.equal(order('cost', 'asc'), 'ABC', 'rows with no cost sort last'); assert.equal(order('availability', 'asc'), 'CBA');
  assert.equal(order('cost', 'desc'), 'CBA');
});
test('C5 reset returns every control to its default; the economy steps read Standard, Move, Swift, Full-round, Reaction, Free', () => {
  const s = defaultCombatTabState();
  assert.deepEqual([s.tab, s.query, s.avail, s.sort, s.dir, s.expanded.size], ['standard', '', 'all', 'name', 'asc', 0]);
  assert.deepEqual(orderEconomySteps([{ key: 'free' }, { key: 'full-round' }, { key: 'swift' }, { key: 'reaction' }, { key: 'move' }, { key: 'standard' }]).map((x) => x.key), ['standard', 'move', 'swift', 'full-round', 'reaction', 'free']);
  assert.deepEqual(LIBRARY_CATEGORIES.map((c) => c.key).at(-1), 'all');
});
