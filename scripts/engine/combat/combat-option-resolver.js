import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

const ATTACK_OPTION_RULE = "ATTACK_OPTION";

const DEFAULT_ATTACK_OPTIONS = {
  powerAttack: {
    id: "powerAttack",
    label: "Power Attack",
    control: "slider",
    max: 5,
    resource: "baseAttackBonus",
    requiresAttackType: "melee",
    attackModifierFormula: "-value",
    damageModifierFormula: "value",
    summary: "Trade attack bonus for bonus melee damage."
  },
  meleeDefense: {
    id: "meleeDefense",
    label: "Melee Defense",
    control: "slider",
    max: 5,
    resource: "baseAttackBonus",
    requiresAttackType: "melee",
    attackModifierFormula: "-value",
    defenseModifier: {
      target: "defense.reflex",
      type: "dodge",
      valueFormula: "value",
      duration: "untilStartOfNextTurn"
    },
    summary: "Trade attack bonus for a dodge bonus to Reflex Defense until your next turn."
  },
  rapidShot: {
    id: "rapidShot",
    label: "Rapid Shot",
    control: "toggle",
    requiresAttackType: "ranged",
    attackModifier: -2,
    damageDiceStepBonus: 1,
    summary: "Take -2 on a ranged attack to deal +1 die of damage."
  },
  rapidStrike: {
    id: "rapidStrike",
    label: "Rapid Strike",
    control: "toggle",
    requiresAttackType: "melee",
    attackModifier: -2,
    damageDiceStepBonus: 1,
    summary: "Take -2 on a melee attack to deal +1 die of damage."
  },
  carefulShot: {
    id: "carefulShot",
    label: "Careful Shot",
    control: "toggle",
    requiresAttackType: "ranged",
    requiresAim: true,
    attackModifier: 1,
    summary: "When aiming with a ranged weapon, gain +1 on the attack roll."
  },
  deadeye: {
    id: "deadeye",
    label: "Deadeye",
    control: "toggle",
    requiresAttackType: "ranged",
    requiresAim: true,
    damageDiceStepBonus: 1,
    summary: "When aiming with a ranged weapon, deal +1 die of damage."
  },
  preciseShot: {
    id: "preciseShot",
    label: "Precise Shot",
    control: "flag",
    requiresAttackType: "ranged",
    suppresses: ["firingIntoMeleePenalty"],
    summary: "Ignore the attack penalty for firing into melee where that penalty is applied."
  },
  runningAttack: {
    id: "runningAttack",
    label: "Running Attack",
    control: "flag",
    summary: "Movement-dependent attack option. Exposed as a combat flag; movement validation is not automated yet."
  },
  powerfulCharge: {
    id: "powerfulCharge",
    label: "Powerful Charge",
    control: "toggle",
    requiresAttackType: "melee",
    requiresCharge: true,
    damageModifier: 2,
    summary: "When charging with a melee attack, gain +2 damage."
  }
};

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

function camelize(value) {
  const key = normalizeKey(value);
  return key.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());
}

function getAttackType(weapon, context = {}) {
  const explicit = context.attackType ?? context.rangeType ?? context.weaponType;
  if (explicit) {
    const normalized = normalizeKey(explicit);
    if (normalized.includes("ranged")) return "ranged";
    if (normalized.includes("melee")) return "melee";
  }

  const candidates = [
    weapon?.system?.combat?.range,
    weapon?.system?.range,
    weapon?.system?.weaponType,
    weapon?.system?.weaponGroup,
    weapon?.system?.category,
    weapon?.system?.type,
    weapon?.name
  ].map(v => normalizeKey(v));

  if (candidates.some(v => v.includes("ranged") || v.includes("pistol") || v.includes("rifle") || v.includes("bowcaster") || v.includes("blaster"))) {
    return "ranged";
  }
  if (candidates.some(v => v.includes("melee") || v.includes("lightsaber") || v.includes("unarmed") || v.includes("blade"))) {
    return "melee";
  }
  return "unknown";
}

function getFeatRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  const pushRule = (rule) => {
    if (!rule || typeof rule !== "object") return;
    if (rule.type === ATTACK_OPTION_RULE || rule.option || rule.id) rules.push(rule);
  };

  if (Array.isArray(meta.rules)) meta.rules.forEach(pushRule);
  if (Array.isArray(meta.primitives)) {
    for (const primitive of meta.primitives) {
      if (primitive?.type === ATTACK_OPTION_RULE) pushRule(primitive.data ?? primitive);
      if (primitive?.data?.option || primitive?.data?.id) pushRule(primitive.data);
    }
  }
  if (meta.attackOption) pushRule(meta.attackOption);
  return rules;
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch {
    return [];
  }
}

function actorBAB(actor) {
  const value = Number(SchemaAdapters.getBAB(actor) ?? actor?.system?.attributes?.bab?.value ?? actor?.system?.bab ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function optionAllowedForWeapon(option, weapon, context = {}) {
  const attackType = getAttackType(weapon, context);
  if (option.requiresAttackType && attackType !== "unknown" && attackType !== option.requiresAttackType) {
    return false;
  }
  return true;
}

function hydrateOption(raw, actor, weapon, context = {}) {
  const id = camelize(raw.option ?? raw.id ?? raw.key ?? raw.name);
  const defaults = DEFAULT_ATTACK_OPTIONS[id] ?? {};
  const merged = foundry?.utils?.mergeObject
    ? foundry.utils.mergeObject(foundry.utils.deepClone(defaults), raw, { inplace: false })
    : { ...defaults, ...raw };

  merged.id = id;
  merged.label = merged.label ?? raw.label ?? id;
  merged.control = merged.control ?? merged.inputType ?? "toggle";
  merged.attackType = getAttackType(weapon, context);

  if (merged.control === "slider") {
    const bab = actorBAB(actor);
    const ruleMax = Number(merged.max ?? merged.maximum ?? 5);
    merged.min = Number(merged.min ?? 0);
    merged.max = Math.max(0, Math.min(bab, Number.isFinite(ruleMax) ? ruleMax : bab));
    merged.step = Number(merged.step ?? 1);
    merged.value = Math.max(merged.min, Math.min(Number(context?.combatOptions?.[id] ?? context?.attackOptions?.[id] ?? 0), merged.max));
    merged.disabled = merged.max <= 0;
  } else if (merged.control === "toggle") {
    merged.checked = Boolean(context?.combatOptions?.[id] ?? context?.attackOptions?.[id]);
  }

  if (merged.requiresAim && !context?.aim) {
    merged.warning = merged.warning ?? "Requires Aim.";
  }
  if (merged.requiresCharge && !context?.charge) {
    merged.warning = merged.warning ?? "Requires a charge context.";
  }

  return merged;
}

function selectedValue(options, id) {
  const combat = options?.combatOptions ?? options?.attackOptions ?? {};
  const value = combat?.[id];
  if (value === undefined || value === null || value === false || value === "") return 0;
  if (value === true) return 1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export class CombatOptionResolver {
  static getAvailableAttackOptions(actor, weapon, context = {}) {
    const options = [];
    for (const item of actorItems(actor)) {
      for (const rule of getFeatRules(item)) {
        const option = hydrateOption(rule, actor, weapon, context);
        if (!option?.id) continue;
        if (!optionAllowedForWeapon(option, weapon, context)) continue;
        option.sourceItemId = item.id;
        option.sourceName = item.name;
        if (!options.some(existing => existing.id === option.id)) options.push(option);
      }
    }
    return options.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  static summarizeAttackOptions(actor, weapon, options = {}) {
    const available = this.getAvailableAttackOptions(actor, weapon, options);
    return available.map(option => {
      const value = selectedValue(options, option.id);
      return { ...option, selectedValue: value, active: value > 0 || (option.control === "flag" && Boolean(options?.combatOptions?.[option.id])) };
    });
  }

  static collectAttackModifiers(actor, weapon, options = {}) {
    const active = this.summarizeAttackOptions(actor, weapon, options);
    const result = {
      attackBonus: 0,
      damageBonus: 0,
      damageDiceStepBonus: 0,
      defenseModifiers: [],
      flags: {},
      breakdown: []
    };

    for (const option of active) {
      const value = option.selectedValue;
      if (option.control !== "flag" && value <= 0) continue;

      let attack = 0;
      if (Number.isFinite(Number(option.attackModifier))) attack += Number(option.attackModifier) * value;
      if (option.attackModifierFormula === "-value") attack -= value;
      if (attack) {
        result.attackBonus += attack;
        result.breakdown.push({ label: option.label, value: attack, type: "attack" });
      }

      let damage = 0;
      if (Number.isFinite(Number(option.damageModifier))) damage += Number(option.damageModifier) * value;
      if (option.damageModifierFormula === "value") damage += value;
      if (damage) {
        result.damageBonus += damage;
        result.breakdown.push({ label: option.label, value: damage, type: "damage" });
      }

      const diceSteps = Number(option.damageDiceStepBonus ?? 0) * value;
      if (diceSteps) {
        result.damageDiceStepBonus += diceSteps;
        result.breakdown.push({ label: `${option.label} damage die step`, value: diceSteps, type: "damageDiceStep" });
      }

      if (option.defenseModifier && value > 0) {
        const defense = { ...option.defenseModifier, value };
        result.defenseModifiers.push(defense);
        result.breakdown.push({ label: `${option.label} ${defense.target ?? "defense"}`, value, type: "defense" });
      }

      if (Array.isArray(option.suppresses)) {
        for (const suppressed of option.suppresses) result.flags[`suppresses.${suppressed}`] = true;
      }
      if (option.control === "flag") result.flags[option.id] = true;
    }

    return result;
  }
}

export default CombatOptionResolver;
