// Phase 5B-R (planner ruling 3) -- hybrid condition policy.
//   AUTO        deterministic from structured game state: evaluated, no prompt.
//   PROMPT      real rule condition the runtime cannot observe: asked once, answer kept in the AttackWorkflowContext.
//   UNSUPPORTED temporary migration state only; final certification requires 0.
// Natural-language condition text is NEVER parsed. Every canonical condition value that exists in the frozen authority is
// registered below by EXACT value with a structured predicate; an unregistered value fails the 5B-R verifier and, at runtime,
// resolves to UNSUPPORTED (never silently true/false). Canonical wording is carried only for display in a prompt.

const eq = (key, value) => ({ op: 'eq', key, value });
const neq = (key, value) => ({ op: 'neq', key, value });
const gte = (key, value) => ({ op: 'gte', key, value });
const lt = (key, value) => ({ op: 'lt', key, value });
const has = (key) => ({ op: 'truthy', key });
const not = (p) => ({ op: 'not', p });
const all = (...ps) => ({ op: 'all', ps });
const feat = (name) => ({ op: 'hasFeat', name });
const species = (name) => ({ op: 'speciesIs', name });
const event = (name) => ({ op: 'event', name });
const anyOf = (key, values) => ({ op: 'in', key, values });
const usesAny = (names) => ({ op: 'usesAny', names });
const ask = (promptId) => ({ op: 'prompt', promptId });

// exact-value -> predicate. Keys are JSON.stringify(value).
const T = {};
const add = (value, pred) => { T[JSON.stringify(value)] = pred; };
const addAll = (values, fn) => values.forEach((v) => add(v, fn(v)));

// --- events emitted by the attack/damage workflow (AUTO) ---
addAll(['critical-hit', 'successful-hit', 'on-hit', 'after-hit', 'successful-weapon-hit', 'area-attack-hit', 'area-attack-resolution', 'after-detonation',
  'attack-roll-equals-or-exceeds-both-defenses', 'damage-dealt-and-attack-roll-equals-or-exceeds-defense', 'successful-damage-with-poison-carrying-dart',
  'beginning-of-wielder-turn', 'start-of-grabbed-target-turn-before-actions', 'target-ends-turn-grabbed-or-grappled-by-lightwhip', 'while-target-grabbed-by-this-weapon',
  'while-snared', 'successful-ranged-grab-or-grapple', 'weapon-takes-any-damage', 'weapon-fired', 'swift-action-dial-up', 'end-of-wielder-next-turn', 'after-one-round',
  'proficient-wielder-swift-action-activation', 'attack-of-opportunity'], (v) => event(v));
add('in-place-of-whip-damage', anyOf('profileId', ['whip-pin', 'whip-trip']));
add('darter successfully deals damage', all(event('successful-hit'), eq('payloadId', 'poison')));
add('attack roll beats target Reflex Defense', event('attack-roll-equals-or-exceeds-reflex'));
add('successful hit then secondary attack vs Fortitude Defense succeeds', event('secondary-attack-vs-fortitude-succeeds'));
add('weapon object is struck by lightsaber', event('weapon-struck-by-lightsaber'));
add('target is moved down condition track by this weapon', event('target-moved-down-condition-track-by-weapon'));
add('damage exceeds target damage threshold and moves target at least 1 step down condition track', event('damage-exceeds-threshold-and-moves-condition-track'));
add('attack hits and attack roll also exceeds target Fortitude Defense', event('attack-hit-and-roll-exceeds-fortitude'));
add('grenade attack roll also beats target Fortitude Defense', event('grenade-roll-beats-fortitude'));
add('attack roll equals or exceeds both target Reflex Defense and Fortitude Defense against a living creature', all(event('attack-roll-equals-or-exceeds-both-defenses'), eq('targetType', 'living')));
add('use Rapid Shot or feat with Rapid Shot as prerequisite', usesAny(['Rapid Shot']));
add('target-still-trapped-by-this-electronet', event('target-still-trapped-by-this-weapon'));
add('poison-cured', event('poison-cured'));
add('target-falls-unconscious', event('target-falls-unconscious'));
add('sensor scan for weapons', ask('sensor-scan-for-weapons'));

// --- wielding / configuration / state (AUTO from owned state) ---
add('two-handed', eq('wieldedHands', 2));
add('wielded-one-handed', eq('wieldedHands', 1));
add('mounted-on-rifle', eq('configurationId', 'mounted-on-rifle'));
add('braced', has('braced'));
add('not-braced', not(has('braced')));
add('using-Weapon-Finesse-feat', all(feat('Weapon Finesse'), has('usingWeaponFinesse')));
add('wielder-size-Large-or-larger', gte('actorSizeRank', 4));
add('active-drawn-weapon', has('activeDrawnWeapon'));
add('while worn', eq('equipState', 'worn'));
add({ wieldedHands: 2 }, eq('wieldedHands', 2));
add({ mode: 'double-shot' }, eq('modeId', 'double-shot'));
add('single-shot mode', eq('modeId', 'single-shot'));
add('autofire attack', eq('fireMode', 'autofire'));
add({ wielderSize: 'Medium', mounted: false }, all(eq('actorSize', 'Medium'), not(has('mounted'))));
add({ wielderSize: 'Medium', mounted: true, trainedSkill: 'Ride' }, all(eq('actorSize', 'Medium'), has('mounted'), has('trainedRide')));
add({ description: 'quarterstaff form; has all qualities of a quarterstaff', configurationId: 'quarterstaff' }, eq('configurationId', 'quarterstaff'));
add({ description: 'spear form', configurationId: 'spear' }, eq('configurationId', 'spear'));
add({ description: 'whip form; reach 2 squares', configurationId: 'whip' }, eq('configurationId', 'whip'));
add({ description: 'wielder-has-Long-Haft-Form' }, feat('Long Haft Form'));
add({ description: 'thrown by hand' }, not(has('launcherIdentityKey')));
add({ description: 'hurled by atlatl' }, eq('launcherIdentityKey', 'unmapped::Atlatl'));
add({ description: 'hurled by cesta' }, eq('launcherIdentityKey', 'unmapped::Cesta'));
add('thrown by hand', not(has('launcherIdentityKey')));
add('hurled by atlatl', eq('launcherIdentityKey', 'unmapped::Atlatl'));
add('hurled by cesta', eq('launcherIdentityKey', 'unmapped::Cesta'));
add('two-handed-and-forgo-double-strength-bonus', all(eq('wieldedHands', 2), ask('forgo-double-strength-bonus-to-damage')));
add('forgo-double-strength-bonus-to-damage', ask('forgo-double-strength-bonus-to-damage'));
add('proficient-wielder', has('proficient'));
add('Trip', feat('Trip'));

// --- attack / target state (AUTO) ---
add('wielder Strength below 15', lt('actorStr', 15));
add('not-aimed-at-target-immediately-before-attack', not(has('aimedBeforeAttack')));
add({ type: 'aimed-before-attack' }, has('aimedBeforeAttack'));
add('successive-Block-checks-in-same-round', gte('blockChecksThisRound', 2));
add('all-Block-checks', eq('reactionType', 'block'));
add('all-Deflect-checks', eq('reactionType', 'deflect'));
add('attack-of-opportunity-and-wielded-one-handed', all(event('attack-of-opportunity'), eq('wieldedHands', 1)));
add('against-attacks-from-adjacent-targets-while-extended', all(eq('distance', 'adjacent'), eq('configurationId', 'extended')));
add('wielder uses Double Attack, Triple Attack, or Rapid Shot', usesAny(['Double Attack', 'Triple Attack', 'Rapid Shot']));
add('while using Double Attack, Triple Attack or Rapid Strike', usesAny(['Double Attack', 'Triple Attack', 'Rapid Strike']));
add({ usesAny: ['Double Attack', 'Triple Attack', 'Rapid Shot'] }, usesAny(['Double Attack', 'Triple Attack', 'Rapid Shot']));
add('target at unmodified point-blank range', eq('rangeBand', 'pointBlank'));
add({ targetSize: 'smaller-than-Huge' }, lt('targetSizeRank', 6));
add('target smaller than Huge', lt('targetSizeRank', 6));
add({ targetCategory: 'selected type' }, anyOf('targetType', '$selectedTypes'));
add({ type: 'distance', equals: 'adjacent' }, eq('distance', 'adjacent'));
add({ type: 'distance', notEquals: 'adjacent' }, neq('distance', 'adjacent'));
add({ type: 'quantity-held-one-hand', minimum: 2 }, gte('quantityHeldOneHand', 2));
add({ type: 'payload-fired-by-this-launcher', payloadFamily: 'grenade' }, eq('payloadFamily', 'grenade'));
for (const band of ['pointBlank', 'short', 'medium', 'long']) add({ type: 'range-band', equals: band }, eq('rangeBand', band));
add('enemy-at-up-to-short-range', all(eq('targetDisposition', 'hostile'), anyOf('rangeBand', ['pointBlank', 'short'])));
add('character-at-range', all(eq('targetType', 'character'), neq('distance', 'adjacent')));

// --- real conditions the runtime cannot reliably observe (PROMPT) ---
add('whenever-beneficial', ask('treat-as-smaller-size-when-beneficial'));
add('host-rifle-stock-folded', ask('host-rifle-stock-folded'));
add('handle-is-phrik-laced', ask('handle-is-phrik-laced'));
add('stationary-unattended-object', ask('target-is-stationary-unattended-object'));
add('target is an unattended object', ask('target-is-unattended-object'));
add({ minimumOperators: 2, roles: ['stabilizer', 'trigger-operator'] }, ask('crew-operators-present'));
add({ environment: 'underwater' }, ask('underwater'));
add({ environment: 'not-underwater' }, not(ask('underwater')));

// --- proficiency-rule conditions (species + group; structured via 4H overrides) ---
add('wielder is Gamorrean', species('Gamorrean'));
add('wielder is a Wookiee', species('Wookiee'));
add('wielder is a Wookiee with Weapon Proficiency (rifles)', all(species('Wookiee'), { op: 'hasProficiencyGroup', group: 'rifles' }));
add('wielder is Gungan and has Weapon Proficiency (simple weapons)', all(species('Gungan'), { op: 'hasProficiencyGroup', group: 'simple' }));
add('wielder is Massassi', species('Massassi'));
add('wielder proficient with Sith sword', { op: 'hasProficiencyGroup', group: 'simple' });
add('wielder is Squib', species('Squib'));
add('wielder is Verpine', species('Verpine'));

// activation-requirement `type` values (structured requirement objects)
export const REQUIREMENT_TYPES = Object.freeze({
  feat: 'AUTO', action: 'AUTO', wielding: 'AUTO', configuration: 'AUTO', proficiency: 'AUTO', 'usage-limit': 'AUTO', choice: 'PROMPT', operators: 'PROMPT', target: 'AUTO', 'target-rule': 'AUTO',
});

export function policyFor(value) {
  const pred = T[JSON.stringify(value)];
  if (!pred) return { policy: 'UNSUPPORTED', predicate: null };
  return { policy: containsPrompt(pred) ? 'PROMPT' : 'AUTO', predicate: pred };
}
const containsPrompt = (p) => p.op === 'prompt' || (p.ps ?? (p.p ? [p.p] : [])).some(containsPrompt);
export const registeredConditionCount = () => Object.keys(T).length;
export const registeredConditionKeys = () => Object.keys(T).sort();

const sizeRank = { Fine: 0, Diminutive: 1, Tiny: 2, Small: 3, Medium: 4, Large: 5, Huge: 6, Gargantuan: 7, Colossal: 8 };
export const SIZE_RANK = Object.freeze(sizeRank);

/**
 * Evaluate one canonical condition against a structured context.
 * @returns {{policy:'AUTO'|'PROMPT'|'UNSUPPORTED', value:boolean|null, pending:Array<{promptId:string,text:string}>}}
 * AUTO nodes whose context key is absent degrade to a pending PROMPT (never a silent true/false). A prompt answer is read from ctx.answers[promptId].
 */
export function evaluateCondition(value, ctx = {}) {
  const { policy, predicate } = policyFor(value);
  if (policy === 'UNSUPPORTED') return { policy, value: null, pending: [] };
  const pending = [];
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const ask1 = (promptId) => { const a = ctx.answers?.[promptId]; if (typeof a === 'boolean') return a; if (!pending.some((x) => x.promptId === promptId)) pending.push({ promptId, text }); return null; };
  const need = (key) => { if (ctx[key] === undefined) { ask1(`context:${key}`); return false; } return true; };
  const ev = (p) => {
    switch (p.op) {
      case 'eq': return need(p.key) ? ctx[p.key] === p.value : null;
      case 'neq': return need(p.key) ? ctx[p.key] !== p.value : null;
      case 'gte': return need(p.key) ? Number(ctx[p.key]) >= p.value : null;
      case 'lt': return need(p.key) ? Number(ctx[p.key]) < p.value : null;
      case 'truthy': return ctx[p.key] === undefined ? false : !!ctx[p.key];
      case 'in': { if (!need(p.key)) return null; const vals = p.values === '$selectedTypes' ? (ctx.selectedTypes ?? []) : p.values; return vals.includes(ctx[p.key]); }
      case 'not': { const r = ev(p.p); return r === null ? null : !r; }
      case 'all': { let unknown = false; for (const q of p.ps) { const r = ev(q); if (r === false) return false; if (r === null) unknown = true; } return unknown ? null : true; }
      case 'hasFeat': return (ctx.feats ?? []).map((x) => String(x).toLowerCase()).includes(String(p.name).toLowerCase());
      case 'speciesIs': return String(ctx.species ?? '').toLowerCase() === String(p.name).toLowerCase();
      case 'hasProficiencyGroup': return (ctx.proficiencyGroups ?? []).includes(p.group);
      case 'event': return (ctx.events ?? []).includes(p.name);
      case 'usesAny': return (ctx.attackOptions ?? []).some((x) => p.names.includes(x));
      case 'prompt': return ask1(p.promptId);
      default: return null;
    }
  };
  const result = ev(predicate);
  return { policy: pending.length ? 'PROMPT' : policy, value: pending.length ? null : result, pending };
}
