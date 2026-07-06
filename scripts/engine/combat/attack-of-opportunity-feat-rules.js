/**
 * AttackOfOpportunityFeatRules
 *
 * Manual/guided Attack of Opportunity support. This module intentionally does
 * not detect threatened squares, adjacency, reach, line of sight, movement path,
 * or provocation. It only exposes actor-owned feat effects that can safely be
 * represented once the GM/player has chosen to use the AoO combat action.
 *
 * SWSE rules note: attacks of opportunity are free actions, not reactions. This
 * module therefore exposes a separate AoO pool instead of touching reaction
 * capacity. Reactions remain trigger-limited elsewhere in the action economy.
 */

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasFeat(actor, featName) {
  const wanted = normalize(featName);
  return actorItems(actor).some(item =>
    String(item?.type ?? '').toLowerCase() === 'feat' &&
    item?.system?.disabled !== true &&
    normalize(item?.name) === wanted
  );
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function abilityModFromActor(actor, abilityKey) {
  const system = actor?.system ?? {};
  const candidates = [
    system?.attributes?.[abilityKey],
    system?.derived?.attributes?.[abilityKey],
    system?.abilities?.[abilityKey],
    system?.stats?.abilities?.[abilityKey]
  ];

  for (const entry of candidates) {
    if (!entry || typeof entry !== 'object') continue;
    const explicit = toNumber(entry.mod ?? entry.modifier ?? entry.valueMod ?? entry.totalMod, null);
    if (explicit !== null) return explicit;
    const total = toNumber(entry.total ?? entry.score ?? entry.value ?? entry.base, null);
    if (total !== null) return Math.floor((total - 10) / 2);
  }

  return 0;
}

function opportunityAttackCapacity(actor) {
  const base = 1;
  const hasCombatReflexes = hasFeat(actor, 'Combat Reflexes');
  const dexMod = abilityModFromActor(actor, 'dex');
  const combatReflexesBonus = hasCombatReflexes ? Math.max(0, dexMod) : 0;
  return {
    base,
    bonus: combatReflexesBonus,
    total: base + combatReflexesBonus,
    source: hasCombatReflexes ? 'Combat Reflexes' : 'base attacks of opportunity',
    hasCombatReflexes,
    dexModifier: dexMod,
    actionType: 'free',
    pool: 'attacksOfOpportunity',
    doesNotConsumeReaction: true
  };
}

export class AttackOfOpportunityFeatRules {
  static hasCombatReflexes(actor) {
    return hasFeat(actor, 'Combat Reflexes');
  }

  static hasMartialArtsI(actor) {
    return hasFeat(actor, 'Martial Arts I');
  }

  static getOpportunityAttackCapacity(actor) {
    return opportunityAttackCapacity(actor);
  }

  static getReactionCapacity(actor) {
    // Backward-compatible alias for older callers. The payload is intentionally
    // the AoO pool, not reaction economy. Prefer getOpportunityAttackCapacity().
    return this.getOpportunityAttackCapacity(actor);
  }

  static getEligibility(actor) {
    return {
      eligibleWeaponCategories: ['melee', 'natural', 'pistol', 'foldedRetractableStock'],
      unarmedAllowed: this.hasMartialArtsI(actor),
      unarmedRequiresFeat: 'Martial Arts I',
      cannotUseWhileFlatFooted: !this.hasCombatReflexes(actor),
      combatReflexesAllowsFlatFootedAoO: this.hasCombatReflexes(actor),
      spatialPredicatePolicy: 'metadata_manual',
      actionType: 'free',
      doesNotConsumeReaction: true
    };
  }

  static buildActionEnrichment(actor) {
    const capacity = this.getOpportunityAttackCapacity(actor);
    const eligibility = this.getEligibility(actor);
    return {
      resources: [
        `Attacks of opportunity available: ${capacity.total}`,
        capacity.hasCombatReflexes ? `Combat Reflexes: +${capacity.bonus} AoO from Dex` : 'AoO is a free action, not a reaction',
        eligibility.unarmedAllowed ? 'Unarmed AoO allowed: Martial Arts I' : 'Unarmed AoO requires Martial Arts I',
        eligibility.combatReflexesAllowsFlatFootedAoO ? 'Can AoO while flat-footed: Combat Reflexes' : 'Cannot AoO while flat-footed'
      ],
      ruleData: {
        opportunityAttackCapacity: capacity,
        reactionCapacity: capacity,
        ...eligibility
      }
    };
  }

  static enrichAction(action, actor) {
    if (!action || normalize(action.key ?? action.id ?? action.name) !== 'attack-of-opportunity') return action;
    const enrichment = this.buildActionEnrichment(actor);
    return {
      ...action,
      actionType: action.actionType ?? 'free',
      cost: action.cost ?? {},
      resources: [
        ...(Array.isArray(action.resources) ? action.resources : []),
        ...enrichment.resources
      ],
      ruleData: {
        ...(action.ruleData ?? {}),
        ...enrichment.ruleData
      }
    };
  }
}

export default AttackOfOpportunityFeatRules;
