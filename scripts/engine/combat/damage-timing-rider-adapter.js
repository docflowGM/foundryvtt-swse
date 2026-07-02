/**
 * DamageTimingRiderAdapter — Phase 10F
 *
 * Converts feat/talent damage timing metadata into safe pre-ActorEngine.applyDamage
 * packet mutations. This is the damage-rider consumer boundary for effects that
 * must change damage before DamageResolutionEngine handles mitigation, damage
 * threshold checks, condition-track impact, and HP updates.
 *
 * Governance:
 * - No direct HP mutation.
 * - No duplicate DamageResolutionEngine.
 * - No attack-bonus substitution for damage riders.
 * - All final damage application remains ActorEngine.applyDamage().
 */

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function actorLevel(actor) {
  const candidates = [
    actor?.system?.details?.level,
    actor?.system?.level,
    actor?.system?.attributes?.level,
    actor?.system?.derived?.level,
    actor?.system?.heroicLevel,
    actor?.system?.derived?.heroicLevel
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function combatantForActor(actor) {
  const combatants = Array.from(game?.combat?.combatants ?? []);
  return combatants.find(combatant => String(combatant?.actor?.id ?? combatant?.actorId ?? "") === String(actor?.id ?? "")) ?? null;
}

function hasActedThisEncounter(actor, context = {}) {
  if (context.targetHasActedThisEncounter !== undefined) return context.targetHasActedThisEncounter === true;
  if (context.targetHasActed !== undefined) return context.targetHasActed === true;
  if (actor?.flags?.["foundryvtt-swse"]?.hasActedThisEncounter === true) return true;
  if (actor?.getFlag?.("foundryvtt-swse", "hasActedThisEncounter") === true) return true;

  const combat = game?.combat;
  const combatant = combatantForActor(actor);
  if (!combat || !combatant) return false;

  if (combatant?.flags?.["foundryvtt-swse"]?.hasActedThisEncounter === true) return true;
  if (combatant?.flags?.swse?.hasActedThisEncounter === true) return true;
  if (combatant?.defeated === true) return true;

  const currentRound = Number(combat.round ?? 0);
  const currentTurn = Number(combat.turn ?? 0);
  const targetTurn = Number(combatant?.initiative ?? combatant?.turn ?? NaN);
  const combatants = Array.from(combat.combatants ?? []);
  const index = combatants.findIndex(candidate => candidate?.id === combatant?.id);

  // Conservative default: during round 1, actors with an index before the current
  // turn are treated as having acted. After round 1, all combatants have had at
  // least one opportunity to act unless a caller supplies a more precise flag.
  if (currentRound > 1) return true;
  if (currentRound === 1 && index >= 0 && Number.isFinite(currentTurn)) return index < currentTurn;
  if (Number.isFinite(targetTurn) && Number.isFinite(currentTurn)) return targetTurn < currentTurn;
  return false;
}

function ruleType(rule = {}) {
  return normalizeToken(rule.type ?? rule.ruleType ?? rule.kind ?? rule.mode ?? "");
}

function isAdvantageousAttackSource(rule = {}, item = null) {
  const candidates = [
    rule.sourceName,
    rule.name,
    rule.label,
    rule.feat,
    rule.featName,
    item?.name
  ];
  return candidates.some(value => normalizeToken(value) === "advantageous-attack");
}

function hasAttackBonusShape(rule = {}) {
  const type = ruleType(rule);
  const domain = normalizeToken(rule.domain ?? rule.appliesTo ?? rule.target ?? rule.stat ?? rule.roll ?? "");
  const bonusType = normalizeToken(rule.bonusType ?? rule.modifierType ?? rule.bonus?.type ?? rule.bonus?.domain ?? "");
  return [
    "attack-bonus",
    "attack-modifier",
    "attack-roll-bonus",
    "to-hit-bonus"
  ].includes(type)
    || ["attack", "attack-roll", "to-hit"].includes(domain)
    || ["attack", "attack-roll", "to-hit"].includes(bonusType)
    || rule.attackBonus !== undefined
    || rule.attackModifier !== undefined
    || rule.toHitBonus !== undefined;
}

function isQuarantinedDamageTimingRule(rule = {}, item = null) {
  return isAdvantageousAttackSource(rule, item) && hasAttackBonusShape(rule);
}

function isDamageRiderRule(rule = {}) {
  const type = ruleType(rule);
  return [
    "damage-rider",
    "damage-bonus",
    "successful-hit-damage-rider",
    "post-hit-damage-rider",
    "pre-damage-rider",
    "advantageous-attack",
    "target-not-acted-damage-rider"
  ].includes(type);
}

function collectDamageTimingRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  const push = rule => {
    if (!rule || typeof rule !== "object") return;
    if (isQuarantinedDamageTimingRule(rule, item)) return;
    if (isDamageRiderRule(rule)) rules.push({ ...rule, sourceName: rule.sourceName ?? item?.name, sourceId: rule.sourceId ?? item?.id ?? item?._id ?? null });
  };

  for (const key of ["damageTimingRules", "damageRiders", "damageRules", "targetDamageRules"]) {
    const value = meta[key];
    if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === "object") {
      if (Array.isArray(value.rules)) value.rules.forEach(push);
      else Object.values(value).forEach(entry => Array.isArray(entry) ? entry.forEach(push) : push(entry));
    }
  }

  for (const key of ["rules", "attackRules", "attackModifiers", "attackBonuses", "combatRules"]) {
    const value = meta[key];
    if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === "object") {
      if (Array.isArray(value.rules)) value.rules.forEach(push);
      else Object.values(value).forEach(entry => Array.isArray(entry) ? entry.forEach(push) : push(entry));
    }
  }

  return rules;
}

function collectQuarantinedDamageTimingRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const quarantined = [];
  const push = rule => {
    if (!rule || typeof rule !== "object") return;
    if (!isQuarantinedDamageTimingRule(rule, item)) return;
    quarantined.push({
      sourceName: rule.sourceName ?? item?.name ?? "Damage Rider Metadata",
      sourceId: rule.sourceId ?? item?.id ?? item?._id ?? null,
      reason: "wrong_shape_attack_bonus_metadata",
      message: `${rule.sourceName ?? item?.name ?? "Damage Rider Metadata"}: attack-bonus shaped metadata was ignored by the damage rider adapter. Advantageous Attack is handled by the built-in damage rider compatibility rule.`,
      rule
    });
  };

  for (const key of [
    "rules",
    "attackRules",
    "attackModifiers",
    "attackBonuses",
    "combatRules",
    "damageTimingRules",
    "damageRiders",
    "damageRules",
    "targetDamageRules"
  ]) {
    const value = meta[key];
    if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === "object") {
      if (Array.isArray(value.rules)) value.rules.forEach(push);
      else Object.values(value).forEach(entry => Array.isArray(entry) ? entry.forEach(push) : push(entry));
    }
  }
  return quarantined;
}

function hasFeat(actor, featName) {
  const wanted = normalizeToken(featName);
  return actorItems(actor).some(item => item?.type === "feat" && item?.system?.disabled !== true && normalizeToken(item?.name) === wanted);
}

function builtInCompatibilityRules(actor) {
  const rules = [];
  if (hasFeat(actor, "Advantageous Attack")) {
    rules.push({
      type: "TARGET_NOT_ACTED_DAMAGE_RIDER",
      sourceName: "Advantageous Attack",
      sourceId: "compat-advantageous-attack",
      requiresHit: true,
      requiresTargetNotActed: true,
      damageBonus: { formula: "halfLevel", minimum: 1 },
      description: "Add one-half heroic level to damage against a target that has not acted yet in this encounter."
    });
  }
  return rules;
}

function collectActorDamageTimingRules(actor) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (item?.system?.disabled === true) continue;
    rules.push(...collectDamageTimingRules(item));
  }
  rules.push(...builtInCompatibilityRules(actor));
  return rules;
}

function collectActorQuarantinedDamageTimingRules(actor) {
  const quarantined = [];
  for (const item of actorItems(actor)) {
    if (item?.system?.disabled === true) continue;
    quarantined.push(...collectQuarantinedDamageTimingRules(item));
  }
  return quarantined;
}

function resolveDamageBonus(rule = {}, context = {}) {
  const bonus = rule.damageBonus ?? rule.bonus ?? rule.value ?? 0;
  if (typeof bonus === "number") return bonus;
  if (typeof bonus === "string" && bonus.trim()) return numeric(bonus, 0);
  if (!bonus || typeof bonus !== "object") return 0;

  const formula = normalizeToken(bonus.formula ?? bonus.type ?? "flat");
  if (formula === "half-level" || formula === "halflevel" || formula === "one-half-level") {
    const level = actorLevel(context.attacker ?? context.actor);
    return Math.max(numeric(bonus.minimum, 0), Math.floor(level / 2));
  }
  if (formula === "heroic-level" || formula === "level") {
    return actorLevel(context.attacker ?? context.actor);
  }
  return numeric(bonus.value ?? bonus.amount, 0);
}

function ruleMatches(rule = {}, context = {}) {
  if (rule.requiresHit === true && context.hit !== true && context.isHit !== true) return false;
  if (rule.requiresCritical === true && context.critical !== true && context.isCritical !== true) return false;

  const target = context.targetActor ?? context.target ?? context.damagePacket?.targetActor ?? null;
  if (rule.requiresTargetNotActed === true && hasActedThisEncounter(target, context) === true) return false;
  if (rule.requiresTargetActed === true && hasActedThisEncounter(target, context) !== true) return false;

  const allowedDamageTypes = asArray(rule.requiresDamageType ?? rule.damageTypes ?? rule.validDamageTypes).map(normalizeToken).filter(Boolean);
  if (allowedDamageTypes.length) {
    const actual = normalizeToken(context.damagePacket?.type ?? context.damageType ?? context.type ?? "");
    if (!allowedDamageTypes.includes(actual)) return false;
  }

  const excludedDamageTypes = asArray(rule.excludedDamageTypes).map(normalizeToken).filter(Boolean);
  if (excludedDamageTypes.length) {
    const actual = normalizeToken(context.damagePacket?.type ?? context.damageType ?? context.type ?? "");
    if (excludedDamageTypes.includes(actual)) return false;
  }

  return true;
}

export class DamageTimingRiderAdapter {
  static collectRules(actor) {
    return collectActorDamageTimingRules(actor);
  }

  static collectQuarantinedRules(actor) {
    return collectActorQuarantinedDamageTimingRules(actor);
  }

  static targetHasActedThisEncounter(actor, context = {}) {
    return hasActedThisEncounter(actor, context);
  }

  static buildPlan(context = {}) {
    const attacker = context.attacker ?? context.actor ?? context.sourceActor ?? null;
    const targetActor = context.targetActor ?? context.target ?? context.damagePacket?.targetActor ?? null;
    const originalPacket = context.damagePacket ?? {};
    const baseAmount = numeric(originalPacket.amount ?? context.amount, 0);
    const appliedRiders = [];
    const manualNotes = [];
    let amount = baseAmount;

    manualNotes.push(...collectActorQuarantinedDamageTimingRules(attacker));
    for (const rule of collectActorDamageTimingRules(attacker)) {
      if (!ruleMatches(rule, { ...context, attacker, targetActor, damagePacket: originalPacket })) continue;
      const bonus = resolveDamageBonus(rule, { ...context, attacker, targetActor });
      if (bonus === 0) {
        manualNotes.push({
          sourceName: rule.sourceName ?? "Damage Rider",
          message: `${rule.sourceName ?? "Damage Rider"}: matched but produced no numeric damage bonus.`,
          rule
        });
        continue;
      }
      amount += bonus;
      appliedRiders.push({
        sourceName: rule.sourceName ?? "Damage Rider",
        sourceId: rule.sourceId ?? null,
        amount: bonus,
        rule,
        message: `${rule.sourceName ?? "Damage Rider"}: ${bonus >= 0 ? "+" : ""}${bonus} damage before damage resolution.`
      });
    }

    return {
      attacker,
      targetActor,
      originalAmount: baseAmount,
      finalAmount: Math.max(0, amount),
      delta: amount - baseAmount,
      appliedRiders,
      manualNotes,
      damagePacket: {
        ...originalPacket,
        amount: Math.max(0, amount),
        sourceActor: originalPacket.sourceActor ?? attacker ?? null,
        targetActor: originalPacket.targetActor ?? targetActor ?? null,
        options: {
          ...(originalPacket.options ?? {}),
          damageTimingRiders: appliedRiders.map(rider => ({
            sourceName: rider.sourceName,
            sourceId: rider.sourceId,
            amount: rider.amount
          }))
        }
      }
    };
  }

  static applyToDamagePacket(damagePacket = {}, context = {}) {
    return this.buildPlan({
      ...context,
      damagePacket,
      attacker: context.attacker ?? context.actor ?? damagePacket.sourceActor ?? null,
      targetActor: context.targetActor ?? context.target ?? damagePacket.targetActor ?? null
    });
  }

  static async applyDamage(actor, damagePacket = {}, context = {}) {
    const plan = this.applyToDamagePacket(damagePacket, {
      ...context,
      targetActor: context.targetActor ?? actor ?? damagePacket.targetActor ?? null
    });
    const result = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js")
      .then(module => module.ActorEngine.applyDamage(actor, plan.damagePacket));
    return { ...plan, result };
  }
}

export default DamageTimingRiderAdapter;