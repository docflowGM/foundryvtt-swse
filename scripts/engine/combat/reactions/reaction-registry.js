/**
 * ReactionRegistry
 *
 * Metadata registry for all reaction types.
 * Schema is talent-agnostic but flexible enough to support all SWSE reaction patterns.
 *
 * Governance:
 * - No direct ChatMessage.create()
 * - No state mutation
 * - Pure data structure + handler declarations
 * - Handlers are defined but not called here
 */

export class ReactionRegistry {
  /**
   * Master registry of all reactions
   * Each entry maps to a talent or universal reaction
   */
  static registry = {
    // DEFENSIVE REACTIONS
    block: {
      key: 'block',
      label: 'Block',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Reduce incoming damage',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    deflect: {
      key: 'deflect',
      label: 'Deflect',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Deflect ranged energy attack; sonic attacks are energy but cannot be deflected.',

      conditions: {
        validAttackTypes: ['ranged'],
        validDamageTypes: ['energy'],
        excludedDamageTypes: ['sonic'],
        rejectSonicDeflection: true,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    // COUNTERATTACK REACTIONS
    counterattack: {
      key: 'counterattack',
      label: 'Counterattack',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Make an attack roll against attacker',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    unarmedParry: {
      key: 'unarmedParry',
      label: 'Unarmed Parry',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Negate an incoming melee attack with an unarmed or natural weapon attack roll while fighting defensively.',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null,
        requiresFightingDefensively: true,
        requiresNotFlatFooted: true
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveUnarmedParry
    },

    unarmedCounterstrike: {
      key: 'unarmedCounterstrike',
      label: 'Unarmed Counterstrike',
      trigger: 'ON_REACTION_SUCCESS',
      description: 'After a successful Unarmed Parry, make an unarmed or natural weapon attack against the parried attacker.',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null,
        requiresReactionKey: 'unarmedParry'
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveUnarmedCounterstrike
    },

    retaliationJab: {
      key: 'retaliationJab',
      label: 'Retaliation Jab',
      trigger: 'ON_ATTACK_MISSED',
      description: 'When an enemy misses you with a melee attack, deal Strength modifier damage to that attacker if within reach.',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null,
        requiresAttackMissed: true
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveRetaliationJab
    },

    primitiveBlock: {
      key: 'primitiveBlock',
      label: 'Primitive Block',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Negate an incoming melee attack by rolling Use the Force against the incoming attack roll. Requires Primitive Block and an Empowered Weapon drawn.',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: ['Primitive Block'],
        requiresDefense: null,
        requiresNotFlatFooted: true
      },

      usage: {
        perRound: false,
        perEncounter: false,
        maxPerRound: null,
        cumulativePenalty: -5
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolvePrimitiveBlock
    },

    intimidatingDefense: {
      key: 'intimidatingDefense',
      label: 'Intimidating Defense',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Make a Persuasion check to Intimidate an incoming attacker; on success, apply a -5 penalty to that attack roll.',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: false,
        perEncounter: true,
        maxPerEncounter: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveIntimidatingDefense
    },

    deepSpaceGambit: {
      key: 'deepSpaceGambit',
      label: 'Deep-Space Gambit',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Once per encounter, force an incoming attacker to reroll an attack against you or a vehicle you occupy and keep the worse result.',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: false,
        perEncounter: true,
        maxPerEncounter: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveDeepSpaceGambit
    },

    lightsaberEvasion: {
      key: 'lightsaberEvasion',
      label: 'Lightsaber Evasion',
      trigger: 'ON_ATTACK_MISSED',
      description: 'When an enemy misses you with a melee lightsaber attack, move up to 2 squares without provoking attacks of opportunity.',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null,
        requiresAttackMissed: true,
        requiresWeaponText: ['lightsaber']
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveLightsaberEvasion
    },

    preternaturalSenses: {
      key: 'preternaturalSenses',
      label: 'Preternatural Senses',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Once per encounter, add one-half class level to one Defense Score as a reaction.',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: false,
        perEncounter: true,
        maxPerEncounter: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolvePreternaturalSenses
    },

    feignHarmlessness: {
      key: 'feignHarmlessness',
      label: 'Feign Harmlessness',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Once per encounter, roll Persuasion and use the result in place of Reflex Defense against the incoming attack.',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: false,
        perEncounter: true,
        maxPerEncounter: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveFeignHarmlessness
    },

    uncannyInstincts: {
      key: 'uncannyInstincts',
      label: 'Uncanny Instincts',
      trigger: 'ON_DAMAGE_TAKEN',
      description: 'Once per round after an opponent successfully damages you, move 1 square as a reaction without provoking attacks of opportunity.',

      conditions: {
        validAttackTypes: null,
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: swseResolveUncannyInstincts
    },

    // FORCE REACTIONS
    forceReflection: {
      key: 'forceReflection',
      label: 'Force Reflection',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Reflect Force-based attack',

      conditions: {
        validAttackTypes: null,
        validDamageTypes: ['force'],
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 1,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    // MOVEMENT REACTIONS
    evasion: {
      key: 'evasion',
      label: 'Evasion',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Avoid area effect damage',

      conditions: {
        validAttackTypes: null,
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    }
  };

  /**
   * Get reaction definition by key
   * @param {string} reactionKey
   * @returns {Object|null}
   */
  static getReaction(reactionKey) {
    return this.registry[reactionKey] || null;
  }

  /**
   * Get all registered reaction keys
   * @returns {string[]}
   */
  static getReactionKeys() {
    return Object.keys(this.registry);
  }

  /**
   * Check if reaction exists
   * @param {string} reactionKey
   * @returns {boolean}
   */
  static hasReaction(reactionKey) {
    return reactionKey in this.registry;
  }

  /**
   * Register a new reaction (for talent system integration)
   * Must follow schema structure
   * @param {string} key
   * @param {Object} definition
   */
  static registerReaction(key, definition) {
    if (!key || typeof key !== 'string') {
      throw new Error('ReactionRegistry: Reaction key must be non-empty string');
    }

    if (!definition || typeof definition !== 'object') {
      throw new Error('ReactionRegistry: Reaction definition must be object');
    }

    // Validate required fields
    const required = ['label', 'trigger', 'conditions', 'usage', 'cost', 'handler'];
    for (const field of required) {
      if (!(field in definition)) {
        throw new Error(`ReactionRegistry: Missing required field "${field}" in reaction "${key}"`);
      }
    }

    this.registry[key] = definition;
  }

  /**
   * Get reactions that match a trigger
   * @param {string} trigger - Trigger type (e.g., 'ON_ATTACK_DECLARED')
   * @returns {Object[]}
   */
  static getReactionsByTrigger(trigger) {
    return Object.values(this.registry).filter(r => r.trigger === trigger);
  }
}


/* ============================================================
   TALENT REACTION HANDLERS
============================================================ */

function swseSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function swseAbilityMod(actor, key = 'str') {
  const ability = String(key || 'str').toLowerCase().slice(0, 3);
  const value = actor?.system?.abilities?.[ability]?.mod
    ?? actor?.system?.attributes?.[ability]?.mod
    ?? actor?.system?.derived?.attributes?.[ability]?.mod
    ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function swseActorHasItemNamed(actor, name, type = null) {
  const wanted = swseSlug(name);
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (type && item?.type !== type) return false;
      return swseSlug(item?.name) === wanted;
    });
  } catch (_err) {
    return false;
  }
}

function swseActorLevel(actor) {
  const candidates = [
    actor?.system?.details?.level,
    actor?.system?.level,
    actor?.system?.attributes?.level,
    actor?.system?.derived?.level,
    actor?.system?.heroicLevel,
    actor?.system?.derived?.heroicLevel
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function swseDefenseTotal(actor, key = 'will') {
  const defense = String(key || 'will').toLowerCase();
  const candidates = [
    actor?.system?.defenses?.[defense]?.total,
    actor?.system?.derived?.defenses?.[defense]?.total,
    actor?.system?.defenses?.[defense]?.value,
    actor?.system?.derived?.defenses?.[defense]?.value
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function swseIsNaturalOrUnarmedWeapon(item) {
  if (!item) return false;
  const system = item.system ?? {};
  const flags = item.flags?.swse ?? {};
  if (flags.unarmed === true || flags.naturalWeapon === true || flags.isNaturalWeapon === true) return true;
  if (system.isUnarmed === true || system.unarmed === true || system.naturalWeapon === true || system.isNaturalWeapon === true) return true;
  if (system.properties?.naturalWeapon === true || system.properties?.['natural-weapon'] === true) return true;
  const text = [
    item.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.source,
    system.sourceType,
    system.weaponFamily,
    system.naturalWeaponType,
    Array.isArray(system.properties) ? system.properties.join(' ') : ''
  ].map(swseSlug).join(' ');
  return /unarmed|natural-weapon|claw|bite|talon|tusk|horn|tail|slam|gore/.test(text);
}

async function swseGetUnarmedFamilyWeapon(actor) {
  const items = Array.from(actor?.items ?? []);
  const owned = items.find(item => ['weapon', 'lightsaber'].includes(item?.type) && swseIsNaturalOrUnarmedWeapon(item));
  if (owned) return owned;

  const { buildVirtualUnarmedWeapon } = await import('/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js');
  return buildVirtualUnarmedWeapon(actor);
}

async function swseRollUnarmedFamilyAttack(defender, attacker, attackContext = {}, options = {}) {
  const weapon = await swseGetUnarmedFamilyWeapon(defender);
  const attackTotal = Number(attackContext.attackTotal ?? attackContext.dc ?? attackContext.incomingAttackTotal ?? 0);
  const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const result = await rollAttack(defender, weapon, {
    target: attacker ?? null,
    targetContext: attackTotal > 0
      ? { mode: 'manual', label: 'Incoming attack roll', defenseType: 'dc', defenseValue: attackTotal }
      : { mode: 'none', defenseType: 'dc' },
    reaction: true,
    reactionKey: options.reactionKey ?? 'unarmedParry',
    showRollCompanion: true,
    suppressNestedReactions: true
  });
  const total = Number(result?.total ?? result?.roll?.total ?? 0);
  return { result, total, weapon, attackTotal };
}

async function swseResolveUnarmedParry(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  const attackContext = context.attackContext ?? {};
  if (!defender) {
    return { success: false, resultMessage: 'Unarmed Parry could not resolve the defender.' };
  }

  const rollData = await swseRollUnarmedFamilyAttack(defender, attacker, attackContext, { reactionKey: 'unarmedParry' });
  const { total, attackTotal, weapon } = rollData;
  const success = attackTotal > 0 ? total >= attackTotal : null;
  const hasCounterstrike = swseActorHasItemNamed(defender, 'Unarmed Counterstrike', 'talent');

  let message = `${defender.name} rolls ${weapon?.name ?? 'an unarmed attack'} for Unarmed Parry`;
  if (attackTotal > 0) {
    message += success
      ? ` and equals or exceeds the incoming attack roll ${attackTotal}; the attack is negated.`
      : ` against incoming attack roll ${attackTotal}; the attack is not negated.`;
  } else {
    message += '; compare the roll to the incoming melee attack total.';
  }
  if (success && hasCounterstrike) {
    message += ' Unarmed Counterstrike is available against the parried attacker.';
  }

  return {
    success: success !== false,
    modifiedDamage: success === true ? 0 : null,
    eventState: success === true ? 'success' : success === false ? 'failure' : 'final',
    resolutionLabel: success === true ? 'Attack Negated' : success === false ? 'Parry Failed' : 'Parry Rolled',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolveUnarmedCounterstrike(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  if (!defender) {
    return { success: false, resultMessage: 'Unarmed Counterstrike could not resolve the actor.' };
  }
  const weapon = await swseGetUnarmedFamilyWeapon(defender);
  const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  await rollAttack(defender, weapon, { target: attacker ?? null, reaction: true, reactionKey: 'unarmedCounterstrike', showRollCompanion: true });
  return {
    success: true,
    resolutionLabel: 'Counterstrike Rolled',
    resultMessage: `${defender.name} makes an Unarmed Counterstrike with ${weapon?.name ?? 'an unarmed attack'}.`
  };
}

async function swseResolveRetaliationJab(context = {}) {
  const defender = context.defender;
  if (!defender) {
    return { success: false, resultMessage: 'Retaliation Jab could not resolve the actor.' };
  }
  const damage = Math.max(1, swseAbilityMod(defender, 'str'));
  return {
    success: true,
    modifiedDamage: null,
    resolutionLabel: 'Retaliation Jab',
    resultMessage: `${defender.name} deals ${damage} damage to the attacker if the attacker is within reach.`
  };
}


async function swseResolveDeepSpaceGambit(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  if (!defender) {
    return { success: false, resultMessage: 'Deep-Space Gambit could not resolve the defender.' };
  }

  const attackContext = context.attackContext ?? {};
  const originalTotal = Number(
    attackContext.attackTotal ??
    attackContext.incomingAttackTotal ??
    attackContext.total ??
    attackContext.rollTotal ??
    0
  );

  let reroll = null;
  try {
    reroll = await new Roll('1d20').evaluate({ async: true });
  } catch (err) {
    console.warn('[SWSE] Deep-Space Gambit reroll failed:', err);
  }

  const rerollTotal = Number(reroll?.total ?? 0);
  let message = String(defender.name ?? 'The defender') + ' uses Deep-Space Gambit against ' + String(attacker?.name ?? 'the incoming attacker') + '.';
  if (rerollTotal > 0) {
    message += ' The attacker rerolls the attack d20 and keeps the worse result. Rerolled d20: ' + rerollTotal + '.';
  } else {
    message += ' The attacker must reroll the attack and keep the worse result.';
  }
  if (originalTotal > 0) {
    message += ' Original incoming attack total was ' + originalTotal + '; adjust the final result against the worse d20 until the attack event bridge can replace the roll automatically.';
  }

  return {
    success: true,
    forceAttackReroll: true,
    rerollTotal: rerollTotal || null,
    originalAttackTotal: originalTotal || null,
    eventState: 'success',
    resolutionLabel: 'Reroll Forced',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolveIntimidatingDefense(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  if (!defender) {
    return { success: false, resultMessage: 'Intimidating Defense could not resolve the defender.' };
  }

  const attackerWill = swseDefenseTotal(attacker, 'will');
  const higherLevelBonus = attacker && swseActorLevel(attacker) > swseActorLevel(defender) ? 5 : 0;
  const dc = attackerWill !== null ? attackerWill + higherLevelBonus : null;

  let rollData = null;
  try {
    const { rollSkillCheck } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
    rollData = await rollSkillCheck(defender, 'persuasion', {
      dc,
      skillUse: { key: 'intimidating-defense', label: 'Intimidating Defense' },
      sourceType: 'talent',
      sourceLabel: 'Intimidating Defense',
      showRollCompanion: true
    });
  } catch (err) {
    console.warn('[SWSE] Intimidating Defense skill roll failed:', err);
  }

  const total = Number(rollData?.roll?.total ?? rollData?.total ?? 0);
  const success = dc !== null && total > 0 ? total >= dc : null;
  let message = `${defender.name} rolls Persuasion to Intimidate for Intimidating Defense`;
  if (dc !== null && total > 0) {
    message += success
      ? ` and equals or exceeds ${attacker?.name ?? 'the attacker'}'s Will Defense ${dc}; apply a -5 penalty to the incoming attack roll.`
      : ` against ${attacker?.name ?? 'the attacker'}'s Will Defense ${dc}; the attack penalty is not applied.`;
  } else {
    message += '; compare the Persuasion check to the attacker\'s Will Defense, adding +5 if the attacker is higher level.';
  }
  if (higherLevelBonus) {
    message += ' The DC includes the +5 higher-level target bonus.';
  }

  return {
    success: success !== false,
    modifiedAttackPenalty: success === true ? -5 : 0,
    eventState: success === true ? 'success' : success === false ? 'failure' : 'final',
    resolutionLabel: success === true ? 'Attack Penalized' : success === false ? 'Intimidate Failed' : 'Intimidation Rolled',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolveLightsaberEvasion(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  if (!defender) {
    return { success: false, resultMessage: 'Lightsaber Evasion could not resolve the defender.' };
  }
  const message = `${defender.name} uses Lightsaber Evasion after ${attacker?.name ?? 'an enemy'} misses with a melee lightsaber attack. Move up to 2 squares without provoking attacks of opportunity.`;
  return {
    success: true,
    movementSquares: 2,
    eventState: 'success',
    resolutionLabel: 'Movement Available',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolvePreternaturalSenses(context = {}) {
  const defender = context.defender;
  if (!defender) {
    return { success: false, resultMessage: 'Preternatural Senses could not resolve the defender.' };
  }
  const bonus = Math.max(1, Math.floor(swseActorLevel(defender) / 2));
  const message = `${defender.name} uses Preternatural Senses. Add +${bonus} to one Defense Score of the player's choice against the triggering attack/effect until the reaction resolves.`;
  return {
    success: true,
    defenseBonus: bonus,
    eventState: 'success',
    resolutionLabel: 'Defense Bonus Declared',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolveFeignHarmlessness(context = {}) {
  const defender = context.defender;
  const attackContext = context.attackContext ?? context;
  const attackTotal = Number(attackContext.attackTotal ?? attackContext.incomingAttackTotal ?? attackContext.total ?? 0);
  if (!defender) {
    return { success: false, resultMessage: 'Feign Harmlessness could not resolve the defender.' };
  }

  let rollData = null;
  try {
    const { rollSkillCheck } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
    rollData = await rollSkillCheck(defender, 'persuasion', {
      dc: attackTotal > 0 ? attackTotal : null,
      skillUse: { key: 'feign-harmlessness', label: 'Feign Harmlessness' },
      sourceType: 'talent',
      sourceLabel: 'Feign Harmlessness',
      showRollCompanion: true
    });
  } catch (err) {
    console.warn('[SWSE] Feign Harmlessness skill roll failed:', err);
  }

  const total = Number(rollData?.roll?.total ?? rollData?.total ?? 0);
  const success = attackTotal > 0 && total > 0 ? total >= attackTotal : null;
  let message = `${defender.name} rolls Persuasion for Feign Harmlessness and may use the result in place of Reflex Defense against the incoming attack.`;
  if (attackTotal > 0 && total > 0) {
    message += success ? ` The Persuasion result ${total} equals or exceeds the incoming attack ${attackTotal}.` : ` The Persuasion result ${total} is below the incoming attack ${attackTotal}.`;
  }

  return {
    success: success !== false,
    substituteDefenseTotal: total || null,
    eventState: success === true ? 'success' : success === false ? 'failure' : 'final',
    resolutionLabel: success === true ? 'Persuasion Defense Succeeds' : success === false ? 'Persuasion Defense Fails' : 'Persuasion Defense Rolled',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolveUncannyInstincts(context = {}) {
  const defender = context.defender;
  const attacker = context.attacker;
  if (!defender) {
    return { success: false, resultMessage: 'Uncanny Instincts could not resolve the defender.' };
  }
  const message = `${defender.name} uses Uncanny Instincts after being damaged by ${attacker?.name ?? 'an opponent'}. Move 1 square; this movement does not provoke attacks of opportunity.`;
  return {
    success: true,
    movementSquares: 1,
    eventState: 'success',
    resolutionLabel: 'Movement Available',
    reactionResultText: message,
    resultMessage: message
  };
}

async function swseResolvePrimitiveBlock(context = {}) {
  const defender = context.defender;
  const attackContext = context.attackContext ?? {};
  const attackTotal = Number(attackContext.attackTotal ?? attackContext.dc ?? attackContext.incomingAttackTotal ?? 0);

  if (!defender) {
    return { success: false, resultMessage: 'Primitive Block could not resolve the defender.' };
  }

  let rollData = null;
  try {
    const { rollSkillCheck } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
    rollData = await rollSkillCheck(defender, 'useTheForce', {
      dc: attackTotal > 0 ? attackTotal : null,
      skillUse: { key: 'primitive-block', label: 'Primitive Block' },
      sourceType: 'talent',
      sourceLabel: 'Primitive Block',
      showRollCompanion: true
    });
  } catch (err) {
    console.warn('[SWSE] Primitive Block skill roll failed:', err);
  }

  const total = Number(rollData?.roll?.total ?? rollData?.total ?? 0);
  const success = attackTotal > 0 ? total >= attackTotal : null;
  let message = `${defender.name} rolls Use the Force for Primitive Block`;
  if (attackTotal > 0 && total > 0) {
    message += success
      ? ` and equals or exceeds the incoming melee attack roll ${attackTotal}; the attack is negated.`
      : ` against incoming melee attack roll ${attackTotal}; the attack is not negated.`;
  } else {
    message += '; compare the Use the Force check to the incoming melee attack total.';
  }
  message += ' Apply the cumulative -5 Primitive Block penalty manually for repeated uses since the start of your last turn.';

  return {
    success: success !== false,
    modifiedDamage: success === true ? 0 : null,
    eventState: success === true ? 'success' : success === false ? 'failure' : 'final',
    resolutionLabel: success === true ? 'Attack Negated' : success === false ? 'Primitive Block Failed' : 'Primitive Block Rolled',
    reactionResultText: message,
    resultMessage: message
  };
}

/* ============================================================
   PHASE 7: FIRST-WAVE REACTION HANDLER FALLBACKS
============================================================ */

function swseReactionResultCard({ title, subtitle = "", state = "default", details = "" } = {}) {
  return {
    type: "reaction",
    statusLabel: title,
    statusSubLabel: subtitle,
    result: state,
    details
  };
}

async function swsePostReactionFallback(result = {}) {
  const content = `
    <div class="swse-reaction-result swse-reaction-result--${result.result ?? "default"}">
      <div><strong>${result.statusLabel ?? "Reaction"}</strong></div>
      ${result.statusSubLabel ? `<div>${result.statusSubLabel}</div>` : ""}
      ${result.details ? `<div>${result.details}</div>` : ""}
    </div>
  `;
  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    content
  });
}

const SWSE_FIRST_WAVE_REACTION_FALLBACKS = {
  async block({ defender, attacker } = {}) {
    if (typeof SWSERoll?.rollSkill === "function") {
      try {
        await SWSERoll.rollSkill(defender, "useTheForce");
        return swsePostReactionFallback(swseReactionResultCard({
          title: "Block Attempted",
          subtitle: `${defender?.name ?? "Defender"} reacted to ${attacker?.name ?? "an attack"}`,
          state: "success"
        }));
      } catch (err) {
        return swsePostReactionFallback(swseReactionResultCard({
          title: "Block Failed",
          subtitle: err.message,
          state: "failure"
        }));
      }
    }
    return swsePostReactionFallback(swseReactionResultCard({
      title: "Block Attempted",
      subtitle: `${defender?.name ?? "Defender"} triggered Block`,
      state: "pending"
    }));
  },

  async deflect({ defender, attacker } = {}) {
    if (typeof SWSERoll?.rollSkill === "function") {
      try {
        await SWSERoll.rollSkill(defender, "useTheForce");
        return swsePostReactionFallback(swseReactionResultCard({
          title: "Deflect Attempted",
          subtitle: `${defender?.name ?? "Defender"} reacted to ${attacker?.name ?? "an attack"}`,
          state: "success"
        }));
      } catch (err) {
        return swsePostReactionFallback(swseReactionResultCard({
          title: "Deflect Failed",
          subtitle: err.message,
          state: "failure"
        }));
      }
    }
    return swsePostReactionFallback(swseReactionResultCard({
      title: "Deflect Attempted",
      subtitle: `${defender?.name ?? "Defender"} triggered Deflect`,
      state: "pending"
    }));
  },

  async "force-point"({ defender } = {}) {
    const current = defender?.system?.forcePoints?.value ?? 0;
    if (current > 0 && typeof ActorEngine?.apply === "function") {
      await ActorEngine.apply(defender, {
        update: {
          "system.forcePoints.value": Math.max(0, current - 1)
        }
      });
    }
    return swsePostReactionFallback(swseReactionResultCard({
      title: "Force Point Spent",
      subtitle: defender?.name ?? "Actor",
      state: "success"
    }));
  },

  async "destiny-point"({ defender } = {}) {
    const current = defender?.system?.destinyPoints?.value ?? 0;
    if (current > 0 && typeof ActorEngine?.apply === "function") {
      await ActorEngine.apply(defender, {
        update: {
          "system.destinyPoints.value": Math.max(0, current - 1)
        }
      });
    }
    return swsePostReactionFallback(swseReactionResultCard({
      title: "Destiny Point Spent",
      subtitle: defender?.name ?? "Actor",
      state: "success"
    }));
  }
};

Hooks.once("ready", () => {
  const registry = game.swse?.reactionRegistry ?? null;
  if (!registry) return;

  for (const [key, handler] of Object.entries(SWSE_FIRST_WAVE_REACTION_FALLBACKS)) {
    const existing = registry.get?.(key) ?? registry[key] ?? null;
    if (existing && typeof existing === "object" && typeof existing.handler !== "function") {
      existing.handler = handler;
    }
  }
});
