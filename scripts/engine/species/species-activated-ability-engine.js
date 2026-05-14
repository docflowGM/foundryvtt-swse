import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { PoisonEngine } from "/systems/foundryvtt-swse/scripts/engine/poison/poison-engine.js";

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SIZE_ORDER = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];

export class SpeciesActivatedAbilityEngine {
  static async use(actor, item, options = {}) {
    const abilityId = item?.flags?.swse?.speciesAbilityId || item?.flags?.swse?.abilityKey || item?.system?.speciesAbility?.id || item?.system?.specialAbility?.id || item?.slug || item?.name;
    const normalized = normalizeId(abilityId);

    switch (normalized) {
      case 'bellow':
      case 'ithorian-bellow':
        return this.useBellow(actor, item, options);
      case 'confusion':
      case 'yarkora-confusion':
        return this.useConfusion(actor, item, options);
      case 'shapeshift':
      case 'clawdite-shapeshift':
        return this.useShapeshift(actor, item, options);
      case 'energy-surge':
      case 'aleena-energy-surge':
        return this.useEnergySurge(actor, item, options);
      case 'force-blast':
      case 'felucian-force-blast':
        return this.useForceBlast(actor, item, options);
      case 'pacifism':
      case 'caamasi-pacifism':
        return this.usePacifism(actor, item, options);
      case 'pheromones':
      case 'falleen-pheromones':
        return this.usePheromones(actor, item, options);
      case 'startle':
      case 'clawdite-startle':
        return this.useStartle(actor, item, options);
      case 'rage':
      case 'species-rage':
        return this.useRage(actor, item, options);
      case 'telepathy':
      case 'natural-telepath':
      case 'broadcast-telepath':
        return this.useTelepathy(actor, item, options);
      case 'natural-weapon-poison':
      case 'poison':
      case 'mantellian-savrip-poison':
        return this.useNaturalWeaponPoison(actor, item, options);
      case 'roller':
      case 'lurmen-roller':
        return this.useRoller(actor, item, options);
      default:
        ui?.notifications?.info?.(`${item?.name || 'Species ability'} is recorded on the actor, but does not have an automated handler yet.`);
        return { success: false, reason: 'No automated species ability handler', abilityId: normalized };
    }
  }

  static async useBellow(actor, item, options = {}) {
    const hasStrong = hasOwnedFeat(actor, 'Strong Bellow');
    const hasDevastating = hasOwnedFeat(actor, 'Devastating Bellow');
    const baseDice = hasDevastating ? 4 : 3;
    const maxExtraDice = hasStrong ? 6 : 4;
    const extraDice = await chooseNumber({
      title: 'Ithorian Bellow',
      label: 'Additional sonic damage dice',
      hint: hasStrong
        ? 'Strong Bellow removes the default condition-track cost; extra dice still add strain.'
        : 'Each extra d6 moves you one additional step down the Condition Track.',
      min: 0,
      max: maxExtraDice,
      value: 0
    });
    if (extraDice === null) return { cancelled: true };

    const characterLevel = getCharacterLevel(actor);
    const attackRoll = await rollFormula(`1d20 + ${characterLevel}`);
    const damageFormula = `${baseDice + extraDice}d6`;
    const damageRoll = await rollFormula(damageFormula);
    const conditionCost = Math.max(0, (hasStrong ? 0 : 1) + extraDice);

    const targets = getUserTargets();
    const targetLines = [];
    for (const targetActor of targets) {
      const fortitude = getDefense(targetActor, 'fortitude');
      const hit = attackRoll.total >= fortitude;
      targetLines.push(`<li>${escapeHtml(targetActor.name)}: Fortitude ${fortitude}; ${hit ? 'hit' : 'miss'} (${hit ? damageRoll.total : Math.floor(damageRoll.total / 2)} sonic damage${hit ? '' : ', half on miss'}).</li>`);
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: [
        `<h2>${escapeHtml(actor.name)} uses Bellow</h2>`,
        `<p><strong>Attack:</strong> ${attackRoll.total} vs Fortitude in a 6-square cone.</p>`,
        `<p><strong>Damage:</strong> ${damageFormula} sonic = ${damageRoll.total}; half damage on miss.</p>`,
        `<p><strong>Condition cost:</strong> ${conditionCost} step${conditionCost === 1 ? '' : 's'} down the Condition Track.</p>`,
        hasDevastating ? `<p><em>Devastating Bellow:</em> base damage is 4d6.</p>` : '',
        hasStrong ? `<p><em>Strong Bellow:</em> first condition step is negated.</p>` : '',
        targetLines.length ? `<ul>${targetLines.join('')}</ul>` : `<p>No targets selected; compare the attack result to each target's Fortitude Defense.</p>`
      ].join('')
    });

    if (conditionCost > 0) {
      await applyConditionSteps(actor, conditionCost, { source: 'Ithorian Bellow', persistent: true });
    }

    return { success: true, abilityId: 'bellow', attackTotal: attackRoll.total, damageFormula, damageTotal: damageRoll.total, conditionCost };
  }

  static async useConfusion(actor, item, options = {}) {
    const deception = getSkillTotal(actor, 'deception');
    const roll = await rollFormula(`1d20 + ${deception}`);
    const targets = getUserTargets();
    const results = [];

    for (const targetActor of targets) {
      const will = getDefense(targetActor, 'will');
      const success = roll.total >= will;
      if (success) {
        await createStatusEffect(targetActor, {
          name: 'Confused',
          icon: 'icons/svg/daze.svg',
          durationRounds: 1,
          description: 'Does not threaten squares until the end of the Yarkora\'s next turn. Mind-Affecting effect.',
          changes: [
            { key: 'flags.swse.conditions.confused', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 },
            { key: 'flags.swse.threatenedSquares.suppressed', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 }
          ],
          flags: { swse: { speciesAbility: 'confusion', mindAffecting: true, doesNotThreaten: true } }
        });
      }
      results.push(`<li>${escapeHtml(targetActor.name)}: Will ${will}; ${success ? '<strong>confused</strong>' : 'resists'}.</li>`);
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: [
        `<h2>${escapeHtml(actor.name)} uses Confusion</h2>`,
        `<p><strong>Deception:</strong> ${roll.total} vs Will Defense of targets within 6 squares.</p>`,
        results.length ? `<ul>${results.join('')}</ul>` : `<p>No targets selected; compare ${roll.total} to each target's Will Defense.</p>`
      ].join('')
    });

    return { success: true, abilityId: 'confusion', total: roll.total, targetCount: targets.length };
  }

  static async usePacifism(actor, item, options = {}) {
    const persuasion = getSkillTotal(actor, 'persuasion');
    const roll = await rollFormula(`1d20 + ${persuasion}`);
    const targetActor = getSingleTarget();
    if (!targetActor) {
      ui?.notifications?.warn?.('Select one target for Pacifism.');
      return { success: false, reason: 'No target selected' };
    }
    const will = getDefense(targetActor, 'will');
    const success = roll.total >= will;
    if (success) {
      await applyConditionSteps(targetActor, 1, { source: 'Caamasi Pacifism', nonPhysical: true, mindAffecting: true });
      await createStatusEffect(targetActor, {
        name: 'Pacified',
        icon: 'icons/svg/angel.svg',
        durationRounds: 1,
        description: 'Moved -1 step on the Condition Track by Caamasi Pacifism. Mind-Affecting, language-dependent effect.',
        changes: [
          { key: 'flags.swse.conditions.pacified', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 }
        ],
        flags: { swse: { speciesAbility: 'pacifism', mindAffecting: true, languageDependent: true, nonPhysicalCondition: true } }
      });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} uses Pacifism</h2><p>Persuasion ${roll.total} vs ${escapeHtml(targetActor.name)}'s Will ${will}: ${success ? '<strong>success</strong>; target moves -1 step on the Condition Track.' : 'no effect'}.</p>`
    });
    return { success, abilityId: 'pacifism', total: roll.total, target: targetActor.id };
  }

  static async usePheromones(actor, item, options = {}) {
    const characterLevel = getCharacterLevel(actor);
    const chaMod = getAbilityMod(actor, 'cha');
    const roll = await rollFormula(`1d20 + ${characterLevel} + ${chaMod}`);
    const targetActor = getSingleTarget();
    if (!targetActor) {
      ui?.notifications?.warn?.('Select one adjacent target for Pheromones.');
      return { success: false, reason: 'No target selected' };
    }
    const fortitude = getDefense(targetActor, 'fortitude');
    const success = roll.total >= fortitude;
    if (success) {
      await applyConditionSteps(targetActor, 1, { source: 'Falleen Pheromones', inhaledPoison: true, nonPhysical: true });
      await createStatusEffect(targetActor, {
        name: 'Pheromone Influence',
        icon: 'icons/svg/aura.svg',
        durationRounds: 1,
        description: 'Moved -1 step on the Condition Track by Falleen Pheromones. This is an inhaled poison effect.',
        changes: [
          { key: 'flags.swse.conditions.pheromoneInfluence', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 }
        ],
        flags: { swse: { speciesAbility: 'pheromones', inhaledPoison: true, nonPhysicalCondition: true } }
      });
    } else {
      await createStatusEffect(targetActor, {
        name: 'Pheromone Acclimation',
        icon: 'icons/svg/shield.svg',
        durationSeconds: 24 * 60 * 60,
        description: 'Immune to this Falleen\'s Pheromones for 24 hours after resisting the effect.',
        changes: [],
        flags: { swse: { speciesAbility: 'pheromones', immuneToSourceActor: actor.id } }
      });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} uses Pheromones</h2><p>Special attack ${roll.total} vs ${escapeHtml(targetActor.name)}'s Fortitude ${fortitude}: ${success ? '<strong>success</strong>; target moves -1 step on the Condition Track.' : 'resisted; target is immune to this Falleen\'s Pheromones for 24 hours'}.</p>`
    });
    return { success, abilityId: 'pheromones', total: roll.total, target: targetActor.id };
  }

  static async useStartle(actor, item, options = {}) {
    const deception = getSkillTotal(actor, 'deception');
    const targetActor = getSingleTarget();
    if (!targetActor) {
      ui?.notifications?.warn?.('Select the attacking creature for Startle.');
      return { success: false, reason: 'No target selected' };
    }
    const roll = await rollFormula(`1d20 + ${deception}`);
    const will = getDefense(targetActor, 'will');
    const success = roll.total >= will;
    if (success) {
      await createStatusEffect(targetActor, {
        name: 'Startled',
        icon: 'icons/svg/terror.svg',
        durationRounds: 1,
        description: '-5 penalty on the triggering attack roll from Clawdite Startle.',
        changes: [
          { key: 'flags.swse.attackPenalty.nextAttack', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: -5, priority: 30 },
          { key: 'flags.swse.conditions.startled', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 }
        ],
        flags: { swse: { speciesAbility: 'startle', reactionTrigger: 'attacked', attackPenalty: -5, expiresAfterAttack: true } }
      });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} uses Startle</h2><p>Reaction: Deception ${roll.total} vs ${escapeHtml(targetActor.name)}'s Will ${will}: ${success ? '<strong>success</strong>; triggering attack takes -5.' : 'no effect'}.</p>`
    });
    return { success, abilityId: 'startle', total: roll.total, target: targetActor.id };
  }



  static async useRage(actor, item, options = {}) {
    const action = RageEngine.getRageActionMode(actor);
    const result = await RageEngine.startRage(actor, { mode: options?.mode || 'rage' });
    if (result?.blocked) {
      ui?.notifications?.warn?.(result.reason || 'Rage is not available.');
      return { success: false, abilityId: 'rage', ...result };
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: [
        `<h2>${escapeHtml(actor.name)} enters Rage</h2>`,
        `<p><strong>Duration:</strong> ${result.duration} round${result.duration === 1 ? '' : 's'}.</p>`,
        `<p><strong>Bonus:</strong> +${RageEngine.getRageAttackDamageBonus(actor)} Rage bonus to melee attack rolls and melee damage rolls.</p>`,
        `<p><strong>Uses:</strong> ${result.usesSpent}/${result.usesPerDay} spent today.</p>`,
        `<p><strong>Aftereffect:</strong> When Rage ends, the actor moves -1 persistent step on the Condition Track.</p>`,
        action?.canEndAtWill ? `<p><em>Controlled Rage:</em> Rage may be ended at will.</p>` : ''
      ].join('')
    });
    return { success: true, abilityId: 'rage', ...result };
  }

  static async useTelepathy(actor, item, options = {}) {
    const ability = item?.system?.speciesAbility || {};
    const naturalBonus = Number(ability?.checkBonus || 0) || 0;
    const check = getForceLikeCheck(actor, { bonus: naturalBonus });
    const roll = await rollFormula(`1d20 + ${check.bonus}`);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: [
        `<h2>${escapeHtml(actor.name)} uses ${escapeHtml(item?.name || 'Species Telepathy')}</h2>`,
        `<p><strong>Check:</strong> ${roll.total} (${escapeHtml(check.label)}${naturalBonus ? `, +${naturalBonus} species bonus` : ''}).</p>`,
        `<p>${escapeHtml(ability?.description || item?.system?.description || 'This is a species-granted Force-like communication ability. The GM adjudicates range, willingness, and target limits from the trait text.')}</p>`
      ].join('')
    });
    return { success: true, abilityId: 'telepathy', total: roll.total, checkMode: check.mode };
  }

  static async useShapeshift(actor, item, options = {}) {
    const hasMetamorph = hasOwnedFeat(actor, 'Metamorph');
    const con = getAbilityTotal(actor, 'con');
    const rounds = Math.max(1, con || 1);
    let sizeMode = 'same';

    if (hasMetamorph) {
      sizeMode = await chooseOne({
        title: 'Shapeshift',
        label: 'Metamorph size option',
        options: [
          { value: 'same', label: 'Appearance only' },
          { value: 'smaller', label: 'Decrease size by one step' },
          { value: 'larger', label: 'Increase size by one step' }
        ],
        value: 'same'
      });
      if (sizeMode === null) return { cancelled: true };
    }

    const effects = [{
      name: 'Shapeshift',
      icon: 'icons/svg/mystery-man.svg',
      durationRounds: rounds,
      description: '+10 Species bonus to Deception checks made to disguise appearance.',
      changes: [
        { key: 'system.skills.deception.species', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 10, priority: 20 },
        { key: 'flags.swse.shapeshift.active', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 20 }
      ],
      flags: { swse: { speciesAbility: 'shapeshift', hasMetamorph, sizeMode } }
    }];

    const currentSize = String(actor.system?.traits?.size || actor.system?.size || 'Medium');
    const sizeEffect = buildMetamorphEffect(currentSize, sizeMode, rounds);
    if (sizeEffect) effects.push(sizeEffect);

    for (const effect of effects) await createStatusEffect(actor, effect);
    await ActorEngine.updateActor(actor, {
      'flags.swse.shapeshift.active': true,
      'flags.swse.shapeshift.mode': sizeMode,
      'flags.swse.shapeshift.rounds': rounds,
      'flags.swse.shapeshift.hasMetamorph': hasMetamorph
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} shapeshifts</h2><p>Gains +10 Species bonus to Deception checks made to disguise appearance for ${rounds} round${rounds === 1 ? '' : 's'}.</p>${sizeEffect ? `<p><strong>Metamorph:</strong> ${escapeHtml(sizeEffect.description)}</p>` : ''}`
    });

    return { success: true, abilityId: 'shapeshift', rounds, mode: sizeMode };
  }

  static async useEnergySurge(actor, item, options = {}) {
    const conMod = getAbilityMod(actor, 'con');
    const rounds = Math.max(1, conMod);
    const baseSpeed = Number(actor.system?.derived?.speed?.base ?? actor.system?.speed ?? actor.system?.movement?.walk ?? 6) || 6;
    const speedBonus = Math.max(0, 8 - baseSpeed);
    const changes = [
      { key: 'flags.swse.dexterityBasedChecks.speciesBonus', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: 2, priority: 20 },
      { key: 'flags.swse.dexterityBasedAttacks.speciesBonus', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: 2, priority: 20 }
    ];
    for (const skill of ['acrobatics', 'initiative', 'pilot', 'ride', 'stealth']) {
      changes.push({ key: `system.skills.${skill}.species`, mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 2, priority: 20 });
    }
    if (speedBonus > 0) {
      changes.push({ key: 'system.movement.walk', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: speedBonus, priority: 20 });
      changes.push({ key: 'system.speed', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: speedBonus, priority: 20 });
    }

    await createStatusEffect(actor, {
      name: 'Energy Surge',
      icon: 'icons/svg/lightning.svg',
      durationRounds: rounds,
      description: '+2 to Dexterity-based checks/attacks and base speed rises to 8 squares. Apply -1 persistent condition step when it expires.',
      changes,
      flags: { swse: { speciesAbility: 'energy-surge', expirationConditionSteps: 1, persistentAfterEffect: true } }
    });
    await ActorEngine.updateActor(actor, {
      'flags.swse.energySurge.pendingPersistentCondition': true,
      'flags.swse.energySurge.rounds': rounds,
      'flags.swse.energySurge.expiresAt': Date.now() + rounds * 6000
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} uses Energy Surge</h2><p>For ${rounds} round${rounds === 1 ? '' : 's'}, gains +2 to Dexterity-based checks and attacks and base speed rises to 8 squares. When it expires, apply a -1 persistent step on the Condition Track.</p>`
    });

    return { success: true, abilityId: 'energy-surge', rounds, speedBonus };
  }


  static async useNaturalWeaponPoison(actor, item, options = {}) {
    const targetActor = getSingleTarget();
    if (!targetActor) {
      ui?.notifications?.warn?.('Select one living target for Natural Weapon Poison.');
      return { success: false, reason: 'No target selected' };
    }
    const poisonKey = item?.system?.specialAbility?.poisonKey || item?.system?.speciesAbility?.poisonKey || item?.flags?.swse?.poisonKey || 'mantellian-savrip-natural-poison';
    return PoisonEngine.applyPoison({
      sourceActor: actor,
      targetActor,
      poisonKey,
      delivery: 'contact',
      sourceItem: item,
      immediate: true
    });
  }

  static async useRoller(actor, item, options = {}) {
    const active = !!actor.flags?.swse?.roller?.active;
    if (active) {
      await ActorEngine.updateActor(actor, {
        'flags.swse.roller.active': false
      });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<h2>${escapeHtml(actor.name)} stops rolling</h2><p>Roller movement mode ends. Remove the Roller ActiveEffect if it remains on the actor.</p>`
      });
      return { success: true, abilityId: 'roller', active: false };
    }
    await createStatusEffect(actor, {
      name: 'Roller',
      icon: 'icons/svg/wingfoot.svg',
      description: '+4 base speed while curled into a ball. Actions are limited to Move, Withdraw, Catch a Second Wind, Drop an Item, Recover, and Run.',
      changes: [
        { key: 'system.movement.walk', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 4, priority: 20 },
        { key: 'system.speed', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 4, priority: 20 },
        { key: 'flags.swse.roller.actionRestrictions', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: 'movement-only', priority: 20 }
      ],
      flags: { swse: { speciesAbility: 'roller', toggle: true } }
    });
    await ActorEngine.updateActor(actor, { 'flags.swse.roller.active': true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<h2>${escapeHtml(actor.name)} uses Roller</h2><p>Base speed increases by 4 squares while rolled up; actions are restricted by the trait text.</p>`
    });
    return { success: true, abilityId: 'roller', active: true };
  }

  static async useForceBlast(actor, item, options = {}) {
    const forceCheck = getForceLikeCheck(actor);
    const roll = await rollFormula(`1d20 + ${forceCheck.bonus}`);
    const targetActor = getSingleTarget();
    const dcDamage = getForceBlastDamageDice(roll.total);
    const spendFp = dcDamage > 0 ? await chooseYesNo({ title: 'Force Blast', label: 'Spend a Force Point for bonus damage?' }) : false;
    const fpBonus = spendFp ? Math.floor(getCharacterLevel(actor) / 2) : 0;
    const damageFormula = dcDamage > 0 ? `${dcDamage}d6${fpBonus ? ` + ${fpBonus}` : ''}` : null;
    const damageRoll = damageFormula ? await rollFormula(damageFormula) : null;
    let targetLine = '<p>No target selected; compare the Use the Force-style result to the target\'s Reflex Defense.</p>';
    if (targetActor) {
      const reflex = getDefense(targetActor, 'reflex');
      const hit = dcDamage > 0 && roll.total >= reflex;
      targetLine = `<p>${escapeHtml(targetActor.name)} Reflex ${reflex}; ${hit ? `<strong>hit</strong> for ${damageRoll.total} damage.` : 'no damage.'}</p>`;
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: [
        `<h2>${escapeHtml(actor.name)} uses Force Blast</h2>`,
        `<p>Racial Force Blast check: ${roll.total} (${escapeHtml(forceCheck.label)}). ${dcDamage > 0 ? `Damage tier ${dcDamage}d6.` : 'Below DC 15; no effect and use is spent.'}</p>`,
        spendFp ? `<p>Force Point damage bonus: +${fpBonus}.</p>` : '',
        damageRoll ? `<p><strong>Damage:</strong> ${damageFormula} = ${damageRoll.total}</p>` : '',
        targetLine
      ].join('')
    });
    return { success: dcDamage > 0, abilityId: 'force-blast', total: roll.total, checkMode: forceCheck.mode, damageFormula, damageTotal: damageRoll?.total ?? 0 };
  }
}

async function applyConditionSteps(actor, steps, options = {}) {
  const current = Number(actor.system?.conditionTrack?.current ?? 0);
  return ConditionEngine.applyConditionStep(actor, current + Number(steps || 0), options);
}

async function createStatusEffect(actor, data = {}) {
  const duration = {};
  if (data.durationRounds) duration.rounds = data.durationRounds;
  if (data.durationSeconds) duration.seconds = data.durationSeconds;
  const effectData = {
    name: data.name || 'Species Effect',
    icon: data.icon || 'icons/svg/aura.svg',
    origin: data.origin,
    disabled: false,
    duration,
    changes: Array.isArray(data.changes) ? data.changes : [],
    flags: {
      ...(data.flags || {}),
      swse: {
        ...(data.flags?.swse || {}),
        description: data.description || data.name || 'Species effect',
        source: data.source || data.flags?.swse?.source || 'species-ability'
      }
    }
  };

  if (typeof actor?.createEmbeddedDocuments === 'function') {
    try {
      return actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    } catch (err) {
      SWSELogger.warn?.('[SpeciesActivatedAbilityEngine] ActiveEffect creation failed; falling back to system.activeEffects.', err);
    }
  }

  const current = Array.isArray(actor.system?.activeEffects) ? [...actor.system.activeEffects] : [];
  current.push({ enabled: true, ...data, id: data.id || `species-effect-${Date.now()}` });
  return ActorEngine.updateActor(actor, { 'system.activeEffects': current });
}

function getForceBlastDamageDice(total) {
  if (total >= 30) return 5;
  if (total >= 25) return 4;
  if (total >= 20) return 3;
  if (total >= 15) return 2;
  return 0;
}

function buildMetamorphEffect(currentSize, mode, rounds) {
  if (mode !== 'smaller' && mode !== 'larger') return null;
  const index = Math.max(0, SIZE_ORDER.indexOf(currentSize));
  const newIndex = Math.max(0, Math.min(SIZE_ORDER.length - 1, index + (mode === 'larger' ? 1 : -1)));
  const newSize = SIZE_ORDER[newIndex] || currentSize;
  const large = mode === 'larger';
  const small = mode === 'smaller';
  return {
    name: `Metamorph (${newSize})`,
    icon: 'icons/svg/upgrade.svg',
    durationRounds: rounds,
    description: small
      ? `Size becomes ${newSize}; +1 Reflex, +5 Stealth, carrying capacity becomes three-quarters.`
      : `Size becomes ${newSize}; -1 Reflex, -5 Stealth, +5 Damage Threshold, reach +1 square, carrying capacity doubles.`,
    changes: [
      { key: 'system.traits.size', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: newSize, priority: 30 },
      { key: 'system.defenses.reflex.species', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: small ? 1 : -1, priority: 20 },
      { key: 'system.skills.stealth.species', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: small ? 5 : -5, priority: 20 },
      ...(large ? [
        { key: 'system.damageThreshold.species', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 5, priority: 20 },
        { key: 'system.reach.species', mode: CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2, value: 1, priority: 20 }
      ] : []),
      { key: 'flags.swse.metamorph.carryingCapacityMultiplier', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: small ? 0.75 : 2, priority: 20 }
    ],
    flags: { swse: { speciesAbility: 'shapeshift', feat: 'Metamorph', size: newSize, reflex: small ? 1 : -1, stealth: small ? 5 : -5, damageThreshold: large ? 5 : 0, reach: large ? 1 : 0 } }
  };
}

async function rollFormula(formula) {
  return new Roll(formula).evaluate({ async: true });
}

async function chooseNumber({ title, label, hint, min, max, value }) {
  if (!globalThis.Dialog?.prompt) return value;
  const content = `<form><div class="form-group"><label>${escapeHtml(label)}</label><input type="range" name="value" min="${min}" max="${max}" value="${value}" step="1" oninput="this.nextElementSibling.value=this.value"><output>${value}</output></div>${hint ? `<p class="notes">${escapeHtml(hint)}</p>` : ''}</form>`;
  return Dialog.prompt({
    title,
    content,
    label: 'Use Ability',
    callback: html => Number(html[0]?.querySelector('[name="value"]')?.value ?? value),
    rejectClose: false
  });
}

async function chooseOne({ title, label, options, value }) {
  if (!globalThis.Dialog?.prompt) return value;
  const optionHtml = options.map(opt => `<option value="${escapeHtml(opt.value)}" ${opt.value === value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
  return Dialog.prompt({
    title,
    content: `<form><div class="form-group"><label>${escapeHtml(label)}</label><select name="value">${optionHtml}</select></div></form>`,
    label: 'Apply',
    callback: html => String(html[0]?.querySelector('[name="value"]')?.value ?? value),
    rejectClose: false
  });
}

async function chooseYesNo({ title, label }) {
  if (!globalThis.Dialog?.confirm) return false;
  return Dialog.confirm({ title, content: `<p>${escapeHtml(label)}</p>`, yes: () => true, no: () => false, defaultYes: false });
}

function getSingleTarget() {
  const targets = getUserTargets();
  return targets[0] || null;
}

function getUserTargets() {
  return Array.from(game?.user?.targets || []).map(token => token.actor).filter(Boolean);
}

function normalizeId(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hasOwnedFeat(actor, name) {
  const wanted = normalizeId(name);
  return Array.from(actor?.items || []).some(item => item?.type === 'feat' && normalizeId(item.name) === wanted);
}


function getForceLikeCheck(actor, options = {}) {
  const skill = actor?.system?.skills?.useTheForce;
  const trained = skill?.trained === true || skill?.isTrained === true || skill?.rank > 0;
  const skillTotal = Number(skill?.total ?? skill?.value ?? actor?.system?.derived?.skills?.map?.useTheForce?.total);
  const extra = Number(options?.bonus || 0) || 0;
  if (trained && Number.isFinite(skillTotal)) {
    return { mode: 'useTheForce', bonus: skillTotal + extra, label: 'Use the Force skill' };
  }
  const chaMod = getAbilityMod(actor, 'cha');
  const halfLevel = Math.floor(getCharacterLevel(actor) / 2);
  return { mode: 'forceLike', bonus: chaMod + halfLevel + extra, label: 'Charisma modifier + half level' };
}

function getCharacterLevel(actor) {
  return Number(actor.system?.heroicLevel ?? actor.system?.level ?? actor.system?.details?.level ?? 1) || 1;
}

function getAbilityTotal(actor, key) {
  if (!ABILITY_KEYS.includes(key)) return 0;
  return Number(actor.system?.abilities?.[key]?.total ?? actor.system?.abilities?.[key]?.value ?? actor.system?.abilities?.[key]?.base ?? 10) || 10;
}

function getAbilityMod(actor, key) {
  const stored = Number(actor.system?.abilities?.[key]?.mod);
  if (Number.isFinite(stored)) return stored;
  return Math.floor((getAbilityTotal(actor, key) - 10) / 2);
}

function getSkillTotal(actor, key) {
  return Number(actor.system?.skills?.[key]?.total ?? actor.system?.skills?.[key]?.value ?? actor.system?.derived?.skills?.map?.[key]?.total ?? 0) || 0;
}

function getDefense(actor, key) {
  return Number(actor.system?.defenses?.[key]?.total ?? actor.system?.defenses?.[key]?.value ?? actor.system?.derived?.defenses?.[key] ?? 10) || 10;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
