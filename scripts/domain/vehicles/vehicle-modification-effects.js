/**
 * Certified mechanical effects of vehicle modifications (Starships of the Galaxy, pp. 40-44).
 *
 * A catalog row becomes MECHANIC_SPECIFIED only when it has an entry in EFFECTS below, the effect text is
 * unambiguous, and tests cover it. Effects contribute to EFFECTIVE statistics; the published baseline
 * (flags.swse.universalVehicleSource) is never rewritten, and removing an installation restores the
 * baseline because effective values are always recomputed from baseline + the sealed ledger.
 *
 * Deliberately NOT encoded (see docs/audits/swse-rules-decisions-pending.md, V-P6-*, and
 * docs/audits/vehicles/p6b-deferred-work.md): hit-point percentage rounding (Reinforced Bulkheads),
 * sublight-drive replacement, jammers, combat thrusters, the limited navicomputer, and replacement-vs-addition
 * when a hull already has the system. Those rows stay SOURCE_VERIFIED and cannot be installed.
 * P6B-1 added regenerating shields (recharge action), SLAM and navicomputers (check equipment bonuses).
 *
 * No Foundry globals: Node-testable.
 */
import { getVehiclePublishedFieldState } from './vehicle-runtime-contract.js';

const finite = v => typeof v === 'number' && Number.isFinite(v);
const abilityMod = score => Math.floor((score - 10) / 2);

const CITE = Object.freeze({
  armor: 'Starships of the Galaxy, Armor: armor is bought as an equipment bonus to the armor a starship adds to its Reflex Defense',
  shields: 'Starships of the Galaxy, Starship Shields table and Shields section: deflector shields with the listed shield rating',
  jets: 'Starships of the Galaxy, Movement Systems: maneuvering jets give an equipment bonus to the starship\'s Dexterity score',
  hyperdrive: 'Starships of the Galaxy, Table 3-3 Movement Systems: hyperdrive of the listed class',
  atmospheric: 'Starships of the Galaxy, Atmospheric Thrusters: raises maximum velocity and character-scale fly speed while in an atmosphere'
});

const CITE2 = Object.freeze({
  recharge: 'Starships of the Galaxy, Regenerating Shields: the current shield rating increases by 10 (up to the maximum) when the recharge shields action is used; normal shields increase by only 5',
  slam: 'Starships of the Galaxy, SubLight Accelerator Motor: +5 bonus on Pilot checks to increase a vehicle\'s speed, +10 if the pilot is using all-out movement',
  navicomputer: 'Starships of the Galaxy, Navicomputer: +5 bonus on Use Computer checks made for astrogation (advanced navicomputer +10 instead of +5)'
});

const SHIELD_RATINGS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 125, 150, 175, 200];
const HYPERDRIVES = { 'hyperdrive-075': 0.75, 'hyperdrive-1': 1, 'hyperdrive-15': 1.5, 'hyperdrive-2': 2, 'hyperdrive-3': 3, 'hyperdrive-4': 4,
  'hyperdrive-5': 5, 'hyperdrive-6': 6, 'hyperdrive-8': 8, 'hyperdrive-10': 10, 'hyperdrive-15-class': 15 };

export const EFFECTS = Object.freeze({
  ...Object.fromEntries([1, 2, 3, 4].map(n => [`armor-${n}`, { kind: 'armor', value: n, group: 'armor', citation: CITE.armor }])),
  ...Object.fromEntries(SHIELD_RATINGS.map(n => [`shields-${n}`, { kind: 'shield', value: n, group: 'shields', citation: CITE.shields }])),
  ...Object.fromEntries([2, 4, 6].map(n => [`maneuvering-jets-${n}`, { kind: 'dexterity', value: n, group: 'jets', citation: CITE.jets }])),
  ...Object.fromEntries(Object.entries(HYPERDRIVES).map(([id, cls]) => [id, { kind: 'hyperdrive', value: cls, group: 'hyperdrive', citation: CITE.hyperdrive }])),
  'regenerating-shields': { kind: 'recharge', value: 10, group: 'recharge-shields', citation: CITE2.recharge },
  'sublight-accelerator': { kind: 'skill-bonus', skill: 'pilot', purpose: 'increase-speed', value: 5, allOutValue: 10, group: 'slam', citation: CITE2.slam },
  'navicomputer': { kind: 'skill-bonus', skill: 'useComputer', use: 'astrogate', value: 5, group: 'navicomputer', citation: CITE2.navicomputer },
  'navicomputer-advanced': { kind: 'skill-bonus', skill: 'useComputer', use: 'astrogate', value: 10, group: 'navicomputer', citation: CITE2.navicomputer },
  'atmospheric-thrusters': { kind: 'atmospheric', percent: 10, group: 'atmospheric', citation: CITE.atmospheric },
  'atmospheric-thrusters-advanced': { kind: 'atmospheric', percent: 25, group: 'atmospheric', citation: CITE.atmospheric }
});

export const IMPLEMENTED_EFFECT_IDS = Object.freeze(Object.keys(EFFECTS));
export const hasEffect = catalogId => Object.prototype.hasOwnProperty.call(EFFECTS, catalogId);

const FLY_MODES = new Set(['fly', 'flying']);
const flyModes = record => (record?.movement?.speedModes ?? []).filter(m => m.scale === 'character' && FLY_MODES.has(m.mode));

/**
 * Hull-specific limits of a registered effect. Anything the book does not rule (a second system of the same
 * kind; a hull that already has shields or a hyperdrive) is denied, never guessed.
 * @returns {string[]} denial reasons (empty = installable)
 */
export function effectInstallability({ catalogEntry, record, entries = [] }) {
  const effect = EFFECTS[catalogEntry?.id];
  if (!effect) return [];
  const reasons = [];
  if (entries.some(e => EFFECTS[e.catalogId]?.group === effect.group)) reasons.push('EFFECT_STACKING_UNRULED');
  switch (effect.kind) {
    case 'armor': if (!finite(record?.defenses?.reflex)) reasons.push('REFLEX_DEFENSE_UNKNOWN'); break;
    case 'shield': {
      const sr = record?.defenses?.shieldRating;
      const state = getVehiclePublishedFieldState(sr, (record?.fieldStates ?? {})['defenses.shieldRating']);
      if (state !== 'explicit-zero') reasons.push('SHIELD_REPLACEMENT_OR_ADDITION_UNRULED');
      break;
    }
    case 'dexterity': if (!finite(record?.abilities?.dex) || !finite(record?.defenses?.reflex) || !finite(record?.abilities?.initiativePrinted)) reasons.push('DEXTERITY_BASIS_UNKNOWN'); break;
    case 'hyperdrive': if (record?.hyperspace?.capability !== 'unavailable') reasons.push('HYPERDRIVE_REPLACEMENT_UNRULED'); break;
    case 'atmospheric': if (!flyModes(record).length) reasons.push('NO_ATMOSPHERIC_FLIGHT_MODE'); break;
    case 'recharge': break;
    case 'skill-bonus':
      // a hull printed with an installed navicomputer already has the standard one: a second is a duplicate (stacking unruled)
      if (catalogEntry.id === 'navicomputer' && record?.hyperspace?.navComputer === 'installed') reasons.push('NAVICOMPUTER_ALREADY_PRESENT');
      break;
    default: reasons.push('EFFECT_KIND_UNKNOWN');
  }
  return reasons;
}

const stat = (base) => ({ base: finite(base) ? base : null, effective: finite(base) ? base : null, delta: 0, sources: [] });

/**
 * Effective statistics = published baseline + the contribution of every sealed ledger entry that has a
 * registered effect. Entries without one are listed in `unimplemented` and contribute nothing.
 * @param {{record: object, entries: object[]}} p record is the published source record (or a construction-derived equivalent)
 */
export function computeEffectiveStatistics({ record, entries = [], environment = 'unknown' }) {
  const out = {
    reflex: stat(record?.defenses?.reflex), initiative: stat(record?.abilities?.initiativePrinted),
    shield: stat(record?.defenses?.shieldRating),
    hyperdrive: { base: record?.hyperspace?.capability ?? null, effectiveClass: null, sources: [] },
    movement: flyModes(record).map(m => ({ mode: m.mode, scale: m.scale, baseSquares: m.squaresPerMove ?? null, effectiveSquares: m.squaresPerMove ?? null,
      baseKmh: m.maxVelocityKmh ?? null, effectiveKmh: m.maxVelocityKmh ?? null, conditional: null, sources: [] })),
    rechargeShields: { base: 5, effective: 5, sources: [] },
    skillBonuses: [],
    unimplemented: []
  };
  // A hull printed with an installed navicomputer carries the standard +5 (SotG Navicomputer).
  if (record?.hyperspace?.navComputer === 'installed')
    out.skillBonuses.push({ skill: 'useComputer', use: 'astrogate', value: 5, sources: [{ name: 'Navicomputer (printed with the hull)', published: true }] });
  for (const e of entries) {
    const fx = EFFECTS[e.catalogId];
    if (!fx) { out.unimplemented.push({ installId: e.installId, name: e.name }); continue; }
    const src = { installId: e.installId, name: e.name, citation: fx.citation };
    switch (fx.kind) {
      case 'armor':
        if (finite(out.reflex.base)) { out.reflex.delta += fx.value; out.reflex.sources.push({ ...src, delta: fx.value }); }
        break;
      case 'shield':
        out.shield.effective = fx.value; out.shield.delta = fx.value - (out.shield.base ?? 0); out.shield.sources.push({ ...src, delta: fx.value });
        break;
      case 'dexterity': {
        const dex = record.abilities.dex, d = abilityMod(dex + fx.value) - abilityMod(dex);
        out.reflex.delta += d; out.initiative.delta += d;
        out.reflex.sources.push({ ...src, delta: d }); out.initiative.sources.push({ ...src, delta: d });
        break;
      }
      case 'hyperdrive': out.hyperdrive.effectiveClass = fx.value; out.hyperdrive.sources.push(src); break;
      case 'recharge': out.rechargeShields.effective = fx.value; out.rechargeShields.sources.push(src); break;
      case 'skill-bonus': out.skillBonuses.push({ skill: fx.skill, use: fx.use ?? null, purpose: fx.purpose ?? null, value: fx.value, allOutValue: fx.allOutValue ?? null, sources: [src] }); break;
      case 'atmospheric':
        for (const m of out.movement) {
          if (finite(m.baseSquares)) m.effectiveSquares = Math.floor(m.baseSquares * (100 + fx.percent) / 100);
          if (finite(m.baseKmh)) m.effectiveKmh = Math.floor(m.baseKmh * (100 + fx.percent) / 100 / 10) * 10;
          m.conditional = 'while flying in an atmosphere'; m.sources.push(src);
        }
        break;
      default: out.unimplemented.push({ installId: e.installId, name: e.name });
    }
  }
  {
    const best = new Map();
    for (const b of out.skillBonuses) {
      const k = `${b.skill}|${b.use ?? ''}|${b.purpose ?? ''}`, cur = best.get(k);
      if (!cur || b.value > cur.value) best.set(k, b);
    }
    out.skillBonuses = [...best.values()];
  }
  for (const s of [out.reflex, out.initiative]) if (finite(s.base)) s.effective = s.base + s.delta;
  // Atmosphere-only effects apply only in an explicit 'atmosphere' environment (unknown never activates them).
  for (const m of out.movement) m.applies = m.sources.length > 0 && environment === 'atmosphere';
  out.environment = environment;
  return out;
}
