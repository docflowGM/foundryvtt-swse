/**
 * RageEngine
 *
 * Central resolver for the species Rage ability and feat upgrades that modify it.
 * This is intentionally a rule bridge, not a new active-ability framework: species
 * abilities still activate through the existing species ability handlers, while
 * combat/skill resolution can query this helper for the current Rage state.
 */

import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

const RAGE_FLAG_PATH = "swse";
const RAGE_BASE_BONUS = 2;
const RAGE_BASE_USES = 1;
const RAGE_DEFAULT_MAX_BONUS = 5;
const RAGE_AFTEREFFECT_SOURCE = "Rage aftereffect";

function todayKey() {
  try { return new Date().toISOString().slice(0, 10); }
  catch { return String(Date.now()); }
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemName(item) {
  return normalizeName(item?.name ?? item?.system?.name ?? "");
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch { return []; }
}

function getRuleItems(actor) {
  return actorItems(actor).filter(item => item?.type === "feat" || item?.type === "talent" || item?.type === "speciesability");
}

function getRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  if (Array.isArray(meta.rules)) rules.push(...meta.rules);
  if (Array.isArray(meta.primitives)) {
    for (const primitive of meta.primitives) {
      if (primitive?.type?.startsWith?.("RAGE_")) rules.push(primitive);
      if (primitive?.data?.type?.startsWith?.("RAGE_")) rules.push(primitive.data);
    }
  }
  return rules.filter(rule => rule?.type?.startsWith?.("RAGE_"));
}

function hasFeat(actor, featName) {
  const target = normalizeName(featName);
  return getRuleItems(actor).some(item => itemName(item) === target);
}

function getConModifier(actor) {
  const candidates = [
    actor?.system?.attributes?.constitution?.modifier,
    actor?.system?.attributes?.con?.modifier,
    actor?.system?.abilities?.con?.mod,
    actor?.system?.derived?.attributes?.con?.mod
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function isMeleeWeapon(weapon, context = {}) {
  const explicit = context.attackType ?? context.rangeType ?? context.weaponType;
  if (explicit) {
    const value = normalizeName(explicit);
    if (value.includes("melee") || value.includes("unarmed")) return true;
    if (value.includes("ranged") || value.includes("pistol") || value.includes("rifle")) return false;
  }

  const candidates = [
    weapon?.system?.combat?.range,
    weapon?.system?.range,
    weapon?.system?.weaponType,
    weapon?.system?.weaponGroup,
    weapon?.system?.category,
    weapon?.system?.type,
    weapon?.name
  ].map(normalizeName);

  if (candidates.some(v => v.includes("melee") || v.includes("lightsaber") || v.includes("unarmed") || v.includes("blade"))) return true;
  if (candidates.some(v => v.includes("ranged") || v.includes("pistol") || v.includes("rifle") || v.includes("bowcaster") || v.includes("blaster"))) return false;
  return false;
}

function actorFlag(actor, key, fallback = undefined) {
  const flags = actor?.flags?.[RAGE_FLAG_PATH] ?? actor?.flags?.swse ?? {};
  return flags?.[key] ?? fallback;
}

function getConditionStep(actor) {
  const candidates = [
    actor?.system?.conditionTrack?.current,
    actor?.system?.derived?.damage?.conditionStep
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(5, numeric));
  }
  return 0;
}

function hasRageRule(actor, type) {
  return getRuleItems(actor).some(item => getRules(item).some(rule => rule.type === type));
}

export class RageEngine {
  static hasRageTrait(actor) {
    if (!actor) return false;
    if (actorFlag(actor, "hasRage") === true || actorFlag(actor, "rageUnlocked") === true) return true;
    const species = normalizeName(actor?.system?.details?.species ?? actor?.system?.species ?? actor?.system?.traits?.species ?? "");
    if (["wookiee", "mantellian savrip", "nelvaanian"].some(s => species.includes(s))) return true;
    return getRuleItems(actor).some(item => {
      const name = itemName(item);
      const text = normalizeName(`${item?.system?.traitType ?? ""} ${item?.system?.abilityKey ?? ""} ${item?.system?.description?.value ?? ""} ${item?.system?.benefit ?? ""}`);
      return name === "rage" || text.includes("rage species trait") || text.includes("entered rage") || text.includes("enter rage");
    });
  }

  static isRaging(actor) {
    return actorFlag(actor, "rageActive") === true;
  }

  static isChannelingRage(actor) {
    return actorFlag(actor, "rageChannelActive") === true;
  }

  static hasPowerfulRage(actor) {
    return hasFeat(actor, "Powerful Rage") || hasRageRule(actor, "RAGE_STRENGTH_SKILL_BONUS");
  }

  static getRageUseLedger(actor) {
    const date = actorFlag(actor, "rageUsesSpentDate", todayKey());
    const spent = Number(actorFlag(actor, "rageUsesSpent", 0)) || 0;
    const today = todayKey();
    return { date: today, spent: date === today ? Math.max(0, spent) : 0, max: this.getRageUsesPerDay(actor) };
  }

  static canStartRage(actor) {
    if (!this.hasRageTrait(actor)) return { allowed: false, reason: "Rage is not available." };
    if (this.isRaging(actor) || this.isChannelingRage(actor)) return { allowed: false, reason: "Rage is already active." };
    const ledger = this.getRageUseLedger(actor);
    if (ledger.max <= 0) return { allowed: false, reason: "No Rage uses available." };
    if (ledger.spent >= ledger.max) return { allowed: false, reason: "No Rage uses remaining today.", ledger };
    return { allowed: true, ledger };
  }

  static getRageUsesPerDay(actor) {
    if (!this.hasRageTrait(actor)) return 0;
    let uses = RAGE_BASE_USES;
    for (const item of getRuleItems(actor)) {
      for (const rule of getRules(item)) {
        if (rule.type === "RAGE_USES_BONUS") uses += Number(rule.value ?? 0) || 0;
      }
      if (itemName(item) === "extra rage" && !getRules(item).some(rule => rule.type === "RAGE_USES_BONUS")) uses += 1;
    }
    return Math.max(0, uses);
  }

  static getRageDurationRounds(actor) {
    return Math.max(1, getConModifier(actor) + 5);
  }

  static getRageActionMode(actor) {
    for (const item of getRuleItems(actor)) {
      for (const rule of getRules(item)) {
        if (rule.type === "RAGE_ACTION_MODE" && rule.activation) {
          return {
            activation: rule.activation,
            canEndAtWill: rule.canEndAtWill === true,
            sourceName: item.name
          };
        }
      }
    }
    return { activation: "swift", canEndAtWill: false, sourceName: "Rage" };
  }

  static getRageAttackDamageBonus(actor) {
    let bonus = RAGE_BASE_BONUS;
    for (const item of getRuleItems(actor)) {
      for (const rule of getRules(item)) {
        if (rule.type === "RAGE_ATTACK_DAMAGE_BONUS_OVERRIDE") {
          const attack = Number(rule.attackBonus ?? rule.value ?? bonus);
          const damage = Number(rule.damageBonus ?? rule.value ?? bonus);
          bonus = Math.max(bonus, attack, damage);
        }
      }
      if (itemName(item) === "dreadful rage") bonus = Math.max(bonus, RAGE_DEFAULT_MAX_BONUS);
    }
    return bonus;
  }

  static collectAttackModifiers(actor, weapon, context = {}) {
    if (!this.isRaging(actor) || !isMeleeWeapon(weapon, context)) {
      return { attackBonus: 0, damageBonus: 0, breakdown: [] };
    }
    const bonus = this.getRageAttackDamageBonus(actor);
    return {
      attackBonus: bonus,
      damageBonus: bonus,
      breakdown: [
        { label: hasFeat(actor, "Dreadful Rage") ? "Dreadful Rage" : "Rage", value: bonus, type: "attack" },
        { label: hasFeat(actor, "Dreadful Rage") ? "Dreadful Rage damage" : "Rage damage", value: bonus, type: "damage" }
      ]
    };
  }

  static getSkillContextFlags(actor, existing = []) {
    const flags = new Set(Array.isArray(existing) ? existing.map(String) : []);
    if (this.isRaging(actor)) flags.add("raging");
    if (this.isChannelingRage(actor)) flags.add("rageChannel");
    return Array.from(flags);
  }

  static getChannelRageDefenseModifiers(actor) {
    if (!this.isChannelingRage(actor)) return [];
    return [{ target: "defense.will", value: 5, type: "rage", source: "Channel Rage" }];
  }

  static async startRage(actor, { mode = "rage" } = {}) {
    if (!actor?.update) return null;
    const availability = this.canStartRage(actor);
    if (!availability.allowed) {
      return { blocked: true, mode, reason: availability.reason, usesPerDay: availability.ledger?.max ?? this.getRageUsesPerDay(actor), usesSpent: availability.ledger?.spent ?? 0 };
    }

    const duration = this.getRageDurationRounds(actor);
    const usesPerDay = this.getRageUsesPerDay(actor);
    const action = this.getRageActionMode(actor);
    const ledger = availability.ledger ?? this.getRageUseLedger(actor);
    const nextSpent = Math.min(usesPerDay, (ledger.spent ?? 0) + 1);

    if (mode === "channelRage" || mode === "channel") {
      await actor.update({
        "flags.swse.rageActive": false,
        "flags.swse.rageChannelActive": true,
        "flags.swse.rageChannelStartedAt": Date.now(),
        "flags.swse.rageUsesPerDay": usesPerDay,
        "flags.swse.rageUsesSpent": nextSpent,
        "flags.swse.rageUsesSpentDate": ledger.date,
        "flags.swse.rageActionMode": action.activation,
        "flags.swse.rageCanEndAtWill": action.canEndAtWill
      });
      return { mode: "channelRage", duration, usesPerDay, usesSpent: nextSpent, action };
    }

    await actor.update({
      "flags.swse.rageActive": true,
      "flags.swse.rageChannelActive": false,
      "flags.swse.rageRoundsRemaining": duration,
      "flags.swse.rageStartedAt": Date.now(),
      "flags.swse.rageUsesPerDay": usesPerDay,
      "flags.swse.rageUsesSpent": nextSpent,
      "flags.swse.rageUsesSpentDate": ledger.date,
      "flags.swse.rageActionMode": action.activation,
      "flags.swse.rageCanEndAtWill": action.canEndAtWill,
      "flags.swse.rageAttackDamageBonus": this.getRageAttackDamageBonus(actor)
    });
    return { mode: "rage", duration, usesPerDay, usesSpent: nextSpent, action };
  }

  static async endRage(actor) {
    if (!actor?.update) return null;
    const wasRaging = this.isRaging(actor);
    const updates = {
      "flags.swse.rageActive": false,
      "flags.swse.rageChannelActive": false,
      "flags.swse.rageRoundsRemaining": 0
    };

    if (wasRaging) {
      const current = getConditionStep(actor);
      updates["system.conditionTrack.current"] = Math.min(5, current + 1);
      updates["system.conditionTrack.persistent"] = true;
      updates["flags.swse.rageAftereffectActive"] = true;
      updates["flags.swse.rageAftereffectSource"] = RAGE_AFTEREFFECT_SOURCE;
      updates["flags.swse.rageAftereffectNote"] = "Persistent -1 condition step from Rage; remove after 10 minutes of non-strenuous recuperation.";
    }

    await actor.update(updates);
    return { ended: true, appliedAftereffect: wasRaging };
  }

  static getCurrentRageConditionNotes(actor) {
    const notes = [];
    if (this.isRaging(actor)) {
      const bonus = this.getRageAttackDamageBonus(actor);
      const duration = Number(actorFlag(actor, "rageRoundsRemaining", this.getRageDurationRounds(actor))) || this.getRageDurationRounds(actor);
      const restrictionText = this.hasPowerfulRage(actor)
        ? "Powerful Rage active; concentration/patience restriction suppressed for sheet display."
        : "Cannot use skills requiring patience or concentration (GM-enforced).";
      notes.push({
        id: "rage-active",
        label: "Raging",
        type: "rage",
        severity: "warning",
        text: `+${bonus} Rage bonus to melee attack and melee damage; ${duration} round${duration === 1 ? "" : "s"} remaining. ${restrictionText}`
      });
    }

    if (this.isChannelingRage(actor)) {
      notes.push({
        id: "rage-channel",
        label: "Channel Rage",
        type: "rage",
        severity: "warning",
        text: "+5 Rage bonus to Will Defense instead of normal Rage."
      });
    }

    if (actorFlag(actor, "rageAftereffectActive") === true) {
      notes.push({
        id: "rage-aftereffect",
        label: "Rage Aftereffect",
        type: "condition",
        severity: "danger",
        text: actorFlag(actor, "rageAftereffectNote", "Persistent condition from Rage; remove after 10 minutes of recuperation.")
      });
    }

    return notes;
  }

}

export default RageEngine;
