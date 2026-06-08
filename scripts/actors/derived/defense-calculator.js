/**
 * Defense Calculator — Derived Layer (HARDENED)
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 * PHASE 4: Includes PASSIVE/STATE predicate evaluation
 *
 * Formula (SWSE):
 *   Defense = 10 + heroic level + class bonus + ability mod + [state modifiers]
 *
 * NONHEROIC:
 *   Only heroic levels contribute.
 *
 * DROID EXCEPTION:
 *   Fortitude = STR only
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { getClassData } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js"; // STATIC import (no dynamic)
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { getReflexSizeModifier } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { isEnergyShieldItem, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

function getActorFeatItems(actor) {
  try {
    return Array.from(actor?.items ?? []).filter(item => item?.type === 'feat' && item?.system?.disabled !== true);
  } catch (_err) {
    return [];
  }
}


function normalizeArmorCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('heavy')) return 'heavy';
  if (raw.includes('medium')) return 'medium';
  if (raw.includes('light')) return 'light';
  return raw;
}

function armorRank(value) {
  const category = normalizeArmorCategory(value);
  if (category === 'light') return 1;
  if (category === 'medium') return 2;
  if (category === 'heavy') return 3;
  return 0;
}

function getArmorCategory(armor) {
  const armorData = resolveArmorData(armor);
  return normalizeArmorCategory(
    armor?.system?.armorProficiencyRequired ||
    armorData.armorType ||
    'light'
  );
}

function isArmoredSpaceSuitArmor(armor) {
  if (!armor || armor.type !== 'armor') return false;
  const system = armor.system || {};
  const text = [
    armor.name,
    system.armorType,
    system.category,
    system.subtype,
    system.description,
    Array.isArray(system.traits) ? system.traits.join(' ') : ''
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes('armored space suit') || text.includes('armoured space suit');
}

function actorHasArmorProficiency(actor, armor) {
  const required = getArmorCategory(armor);
  const requiredRank = armorRank(required);
  if (!requiredRank) return false;

  if (isArmoredSpaceSuitArmor(armor) && actorHasTalent(actor, 'Armored Spacer')) {
    return true;
  }

  const candidates = [];
  const armorProficiency = actor?.system?.armorProficiency;
  if (armorProficiency && typeof armorProficiency === 'object') {
    for (const [key, value] of Object.entries(armorProficiency)) {
      if (value === true) candidates.push(key);
    }
  }

  const structured = actor?.system?.proficiencies?.armor;
  if (structured instanceof Set) candidates.push(...structured);
  else if (Array.isArray(structured)) candidates.push(...structured);
  else if (structured && typeof structured === 'object') {
    for (const [key, value] of Object.entries(structured)) {
      if (value === true) candidates.push(key);
    }
  }

  const legacyList = actor?.system?.armorProficiencies;
  if (Array.isArray(legacyList)) candidates.push(...legacyList);

  const unlockArmor = actor?._unlockGrants?.proficiencies?.armor;
  if (unlockArmor instanceof Set) candidates.push(...unlockArmor);
  else if (Array.isArray(unlockArmor)) candidates.push(...unlockArmor);

  for (const item of actor?.items ?? []) {
    if (item?.type !== 'feat') continue;
    const name = String(item?.name || '').toLowerCase();
    if (!name.includes('armor proficiency')) continue;
    if (name.includes('heavy')) candidates.push('heavy');
    else if (name.includes('medium')) candidates.push('medium');
    else if (name.includes('light')) candidates.push('light');
  }

  return candidates.some(candidate => armorRank(candidate) >= requiredRank);
}

function getTalentText(item) {
  const description = item?.system?.description;
  return [
    item?.system?.benefit,
    typeof description === 'string' ? description : description?.value,
    item?.system?.category,
    item?.system?.treeId,
    item?.system?.talent_tree,
    item?.system?.tree
  ].filter(Boolean).join(' ').toLowerCase();
}

function actorHasTalent(actor, talentName) {
  const wanted = String(talentName || '').trim().toLowerCase();
  if (!wanted) return false;
  return Array.from(actor?.items ?? []).some(item =>
    item?.type === 'talent' && String(item?.name || '').trim().toLowerCase() === wanted
  );
}

function actorHasArmorSpecialistArmorMastery(actor) {
  return Array.from(actor?.items ?? []).some(item => {
    if (item?.type !== 'talent') return false;
    if (String(item?.name || '').trim().toLowerCase() !== 'armor mastery') return false;
    const treeId = String(item?.system?.treeId || '').trim();
    const text = getTalentText(item);
    return treeId === '17cec542331cb4e4'
      || text.includes('maximum dexterity')
      || text.includes('max dexterity')
      || text.includes('max dex');
  });
}

function actorHasKnightArmorMastery(actor) {
  return Array.from(actor?.items ?? []).some(item => {
    if (item?.type !== 'talent') return false;
    if (String(item?.name || '').trim().toLowerCase() !== 'armor mastery') return false;
    const treeId = String(item?.system?.treeId || '').trim();
    const text = getTalentText(item);
    return treeId === 'ea01d740c91888b3'
      || (text.includes('heroic level') && text.includes('half armor bonus'))
      || text.includes('counts as armored and improved armored defense');
  });
}

function collectDefenseAbilityRule(actor, defenseKey) {
  const key = String(defenseKey || '').toLowerCase();
  for (const item of getActorFeatItems(actor)) {
    const rules = item?.system?.abilityMeta?.defenseAbilityRules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      if (String(rule?.type || '').toUpperCase() !== 'USE_BETTER_ABILITY') continue;
      if (String(rule?.defense || '').toLowerCase() !== key) continue;
      const abilities = Array.isArray(rule.abilities) ? rule.abilities.map(a => String(a || '').toLowerCase().slice(0, 3)).filter(Boolean) : [];
      if (abilities.length) return { ...rule, abilities, sourceName: item.name };
    }
  }
  return null;
}

function resolveDefenseAbility(actor, defenseKey, defaultAbilityKey, getAbilityMod) {
  const fallbackKey = String(defaultAbilityKey || '').toLowerCase().slice(0, 3);
  let best = { key: fallbackKey, mod: getAbilityMod(fallbackKey, 0), sourceName: null };
  const rule = collectDefenseAbilityRule(actor, defenseKey);
  if (!rule) return best;

  for (const ability of rule.abilities) {
    const mod = getAbilityMod(ability, 0);
    if (mod > best.mod) best = { key: ability, mod, sourceName: rule.sourceName };
  }
  return best;
}

function hasDefenseArmorRule(actor, ruleType) {
  const target = String(ruleType || '').toUpperCase();
  for (const item of getActorFeatItems(actor)) {
    const rules = item?.system?.abilityMeta?.defenseArmorRules;
    if (!Array.isArray(rules)) continue;
    if (rules.some(rule => String(rule?.type || '').toUpperCase() === target)) return true;
  }
  return false;
}

function getSystemActiveDefenseBonus(actor, defenseType) {
  const effects = Array.isArray(actor?.system?.activeEffects) ? actor.system.activeEffects : [];
  let total = 0;
  for (const effect of effects) {
    if (effect?.enabled === false) continue;
    const target = String(effect?.target ?? '');
    if (target !== 'defense' && target !== `defense.${defenseType}`) continue;
    const value = Number(effect?.value ?? 0);
    if (Number.isFinite(value)) total += value;
  }
  return total;
}

export class DefenseCalculator {

  static _numberOrZero(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  static _normalizeDefenseKey(defenseType) {
    const key = String(defenseType || '').toLowerCase();
    if (key === 'fort' || key === 'fortitude') return 'fortitude';
    if (key === 'ref' || key === 'reflex') return 'reflex';
    return 'will';
  }

  static _collectSpeciesDefenseBonus(actor, defenseType) {
    const key = this._normalizeDefenseKey(defenseType);
    const defensesState = actor?.system?.defenses ?? {};
    const defenseState = defensesState?.[key] ?? {};

    const direct = this._numberOrZero(defenseState?.speciesBonus)
      + this._numberOrZero(defenseState?.species)
      + this._numberOrZero(defenseState?.misc?.auto?.species)
      + this._numberOrZero(actor?.system?.speciesTraitBonuses?.defenses?.[key])
      + this._numberOrZero(actor?.system?.speciesCombatBonuses?.defenses?.[key]);
    if (direct !== 0) return direct;

    let ruleTotal = 0;
    const speciesItems = (actor?.items || []).filter(item => item?.type === 'species');
    for (const item of speciesItems) {
      const traitBuckets = [
        item?.system?.structuralTraits,
        item?.system?.canonicalTraits,
        item?.system?.traits,
        item?.system?.speciesTraits,
      ].flatMap(value => Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []));

      for (const trait of traitBuckets) {
        const rules = Array.isArray(trait?.rules) ? trait.rules : [];
        for (const rule of rules) {
          const type = String(rule?.type || '').toLowerCase();
          const ruleDefense = this._normalizeDefenseKey(rule?.defense || rule?.target || '');
          if (type !== 'defensemodifier' && type !== 'defense_modifier') continue;
          if (ruleDefense !== key) continue;
          ruleTotal += this._numberOrZero(rule?.value ?? rule?.bonus ?? rule?.modifier);
        }
      }
    }
    if (ruleTotal !== 0) return ruleTotal;

    // Legacy/manual species items may only carry rules in prose. Scan once as a
    // fallback so Neimoidian-style species penalties are still honored after
    // migration without requiring old actors to be repaired by hand.
    for (const item of speciesItems) {
      const text = [
        item?.name,
        item?.system?.description,
        item?.system?.special,
        JSON.stringify(item?.system?.structuralTraits || []),
        JSON.stringify(item?.system?.canonicalTraits || []),
      ].join(' ');
      const defenseLabel = key === 'fortitude' ? 'fortitude' : key === 'reflex' ? 'reflex' : 'will';
      const patterns = [
        new RegExp(`([+-]\\d+)\\s+species\\s+(?:bonus|penalty)[^.!?]{0,80}${defenseLabel}\\s+defense`, 'i'),
        new RegExp(`takes?\\s+a?\\s*([+-]\\d+)\\s+species\\s+(?:bonus|penalty)[^.!?]{0,80}${defenseLabel}\\s+defense`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        const value = Number(match?.[1]);
        if (Number.isFinite(value)) return value;
      }
    }

    // Phase 3 canonical materialization: passive defense bonuses stored in actor flags
    // (e.g. natural armor → flags.swse.speciesPassiveBonuses.reflex)
    const passiveBonuses = actor?.flags?.swse?.speciesPassiveBonuses || {};
    const passiveEntries = passiveBonuses[key] || [];
    const passiveTotal = passiveEntries.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
    if (passiveTotal !== 0) return passiveTotal;

    return 0;
  }

  /**
   * Calculate defense bonuses.
   * PHASE 4: Includes state-dependent modifiers
   *
   * @param {Actor} actor
   * @param {Array} classLevels
   * @param {Object} options
   * @param {Object} context - Optional context for state predicates (attackType, attacker, etc.)
   */
  static async calculate(actor, classLevels = [], options = {}, context = {}) {

    if (!actor?.system) {
      swseLogger.error('DefenseCalculator: Invalid actor provided');
      return this._emptyResult();
    }

    const heroicLevel = getHeroicLevel(actor) ?? 0;
    const safeClassLevels = Array.isArray(classLevels) ? classLevels : [];
    const defensesState = actor.system?.defenses ?? {};
    const abilitiesState = actor.system?.abilities ?? {};
    const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;

    const [computedFortClassBonus, computedRefClassBonus, computedWillClassBonus] = await Promise.all([
      this._getSaveBonus(safeClassLevels, 'fort'),
      this._getSaveBonus(safeClassLevels, 'ref'),
      this._getSaveBonus(safeClassLevels, 'will')
    ]);

    const adjustments = options?.adjustments ?? {};
    const fortAdjust = Number(adjustments.fort ?? 0) || 0;
    const refAdjust = Number(adjustments.ref ?? 0) || 0;
    const willAdjust = Number(adjustments.will ?? 0) || 0;

    const fortStateBonus = await this._getStateModifiers(actor, 'fortitude', context) + getSystemActiveDefenseBonus(actor, 'fortitude');
    const refStateBonus = await this._getStateModifiers(actor, 'reflex', context) + getSystemActiveDefenseBonus(actor, 'reflex');
    const willStateBonus = await this._getStateModifiers(actor, 'will', context) + getSystemActiveDefenseBonus(actor, 'will');

    const isEnergyShieldArmor = (item) => item?.type === 'armor' && isEnergyShieldItem(item);

    // Personal energy shields are defensive generators/accessories, not armor
    // replacement. They grant SR against Energy damage when activated and may
    // impose active-use penalties, but they do not override heroic-level Reflex
    // contribution like worn armor does.
    const equippedArmor = actor.items?.find(item => item.type === 'armor' && item.system?.equipped && !isEnergyShieldArmor(item)) ?? null;
    const equippedArmorStats = equippedArmor ? resolveArmorData(equippedArmor) : null;
    const armorProficient = equippedArmor ? actorHasArmorProficiency(actor, equippedArmor) : false;
    const hasKnightArmorMastery = actorHasKnightArmorMastery(actor);
    const hasArmoredDefense = actorHasTalent(actor, 'Armored Defense') || hasKnightArmorMastery;
    const hasImprovedArmoredDefense = actorHasTalent(actor, 'Improved Armored Defense') || hasKnightArmorMastery;
    const hasArmorMastery = actorHasArmorSpecialistArmorMastery(actor);
    const hasSecondSkin = actorHasTalent(actor, 'Second Skin');

    const getAbilityMod = (abilityKey, fallback = 0) => {
      const key = String(abilityKey || '').toLowerCase();
      // Always compute from canonical raw attributes — avoids stale system.derived.attributes.*.mod
      // which is written AFTER DefenseCalculator runs in the same DerivedCalculator.computeAll pass.
      const attr = (actor.system?.attributes ?? actor.system?.abilities ?? {})[key] ?? {};
      const total = (attr.base ?? 10) + (attr.racial ?? 0) + (attr.enhancement ?? 0) + (attr.temp ?? 0);
      if (!Number.isFinite(total)) return fallback;
      return Math.floor((total - 10) / 2);
    };

    const getMiscBonus = (defenseState) => {
      let total = 0;
      if (defenseState?.misc?.auto && typeof defenseState.misc.auto === 'object') {
        for (const [key, value] of Object.entries(defenseState.misc.auto)) {
          if (String(key || '').toLowerCase() === 'species') continue;
          total += Number(value || 0);
        }
      }
      total += Number(defenseState?.misc?.user?.extra ?? 0) || 0;
      return total;
    };

    const getConditionPenalty = () => {
      const derivedPenalty = actor.system?.derived?.damage?.conditionPenalty;
      if (Number.isFinite(Number(derivedPenalty))) return Number(derivedPenalty);
      const step = Number(actor.system?.conditionTrack?.current ?? 0) || 0;
      const penalties = [0, -1, -2, -5, -10, 0];
      return penalties[step] ?? 0;
    };

    const conditionPenalty = getConditionPenalty();
    const reflexSizeModifier = getReflexSizeModifier(actor);

    const reflexState = defensesState?.reflex ?? {};
    const fortitudeState = defensesState?.fortitude ?? {};
    const willState = defensesState?.will ?? {};

    const reflexSpeciesBonus = this._collectSpeciesDefenseBonus(actor, 'reflex');
    const fortSpeciesBonus = this._collectSpeciesDefenseBonus(actor, 'fortitude');
    const willSpeciesBonus = this._collectSpeciesDefenseBonus(actor, 'will');

    let reflexAbilityKey = String(reflexState.ability || 'dex').toLowerCase();
    let reflexAbilityResolution = resolveDefenseAbility(actor, 'reflex', reflexAbilityKey, getAbilityMod);
    reflexAbilityKey = reflexAbilityResolution.key;
    let reflexAbilityMod = reflexAbilityResolution.mod;
    const reflexClassBonus = Number(computedRefClassBonus ?? reflexState.classBonus ?? 0) || 0;
    const reflexMiscBonus = getMiscBonus(reflexState);
    let reflexArmorBonus = Number(reflexState.armor ?? equippedArmorStats?.reflexBonus ?? 0) || 0;
    if (equippedArmor && armorProficient && hasSecondSkin) {
      reflexArmorBonus += 1;
    }
    if (equippedArmor) {
      const maxAbilityBonus = Number(equippedArmorStats?.maxDexBonus);
      if (Number.isFinite(maxAbilityBonus)) {
        const effectiveMaxAbilityBonus = armorProficient && hasArmorMastery ? maxAbilityBonus + 1 : maxAbilityBonus;
        reflexAbilityMod = Math.min(reflexAbilityMod, effectiveMaxAbilityBonus);
      }
    }
    let reflexLevelTerm = heroicLevel;
    if (equippedArmor) {
      if (armorProficient && hasImprovedArmoredDefense) {
        reflexLevelTerm = Math.max(heroicLevel + Math.floor(reflexArmorBonus / 2), reflexArmorBonus);
      } else if (armorProficient && hasArmoredDefense) {
        reflexLevelTerm = Math.max(heroicLevel, reflexArmorBonus);
      } else {
        reflexLevelTerm = reflexArmorBonus;
      }
    }
    const reflexBase = 10 + reflexLevelTerm + reflexClassBonus + reflexSizeModifier;
    const reflexTotal = Math.max(1, reflexBase + reflexAbilityMod + reflexMiscBonus + reflexSpeciesBonus + refStateBonus + refAdjust + conditionPenalty);

    const fortDefaultAbility = isDroidActor ? 'str' : 'con';
    // SWSE RAW: nonliving targets without Constitution, including Droids, add STR to Fortitude.
    // Do not allow stale legacy data (system.defenses.fortitude.ability = 'con') to override this.
    let fortAbilityKey = isDroidActor ? 'str' : String(fortitudeState.ability || fortDefaultAbility).toLowerCase();
    let fortAbilityResolution = { key: fortAbilityKey, mod: getAbilityMod(fortAbilityKey, 0), sourceName: null };
    if (!isDroidActor) {
      fortAbilityResolution = resolveDefenseAbility(actor, 'fortitude', fortAbilityKey, getAbilityMod);
      fortAbilityKey = fortAbilityResolution.key;
    }
    const fortAbilityMod = fortAbilityResolution.mod;
    const fortClassBonus = Number(computedFortClassBonus ?? fortitudeState.classBonus ?? 0) || 0;
    const fortMiscBonus = getMiscBonus(fortitudeState);
    let fortArmorBonus = equippedArmor && armorProficient
      ? Number(equippedArmorStats?.fortitudeBonus ?? 0) || 0
      : 0;
    if (equippedArmor && armorProficient && hasSecondSkin) {
      fortArmorBonus += 1;
    }
    const fortBase = 10 + heroicLevel + fortClassBonus + fortAbilityMod + fortArmorBonus;
    const fortTotal = Math.max(1, fortBase + fortMiscBonus + fortSpeciesBonus + fortStateBonus + fortAdjust + conditionPenalty);

    let willAbilityKey = String(willState.ability || 'wis').toLowerCase();
    const willAbilityResolution = resolveDefenseAbility(actor, 'will', willAbilityKey, getAbilityMod);
    willAbilityKey = willAbilityResolution.key;
    const willAbilityMod = willAbilityResolution.mod;
    const willClassBonus = Number(computedWillClassBonus ?? willState.classBonus ?? 0) || 0;
    const willMiscBonus = getMiscBonus(willState);
    const willArmorBonus = hasDefenseArmorRule(actor, 'APPLY_ARMOR_FORT_EQUIPMENT_TO_WILL')
      && equippedArmor
      && armorProficient
      ? Number(equippedArmorStats?.fortitudeBonus ?? 0) || 0
      : 0;
    const willBase = 10 + heroicLevel + willClassBonus + willAbilityMod;
    const willTotal = Math.max(1, willBase + willMiscBonus + willSpeciesBonus + willArmorBonus + willStateBonus + willAdjust + conditionPenalty);

    const flatFootedBase = reflexBase;
    // Flat-footed removes a positive Dexterity bonus, but never removes a
    // Dexterity penalty. SWSE RAW: lose Dex bonus, not Dex penalty.
    const flatFootedTotal = Math.max(1, reflexTotal - Math.max(0, reflexAbilityMod));

    return {
      fortitude: {
        base: fortBase,
        total: fortTotal,
        adjustment: fortAdjust,
        stateBonus: fortStateBonus,
        classBonus: fortClassBonus,
        heroicLevel,
        levelContribution: heroicLevel,
        speciesBonus: fortSpeciesBonus,
        miscBonus: fortMiscBonus,
        armorBonus: fortArmorBonus,
        abilityKey: fortAbilityKey,
        abilityMod: fortAbilityMod,
        conditionPenalty
      },
      reflex: {
        base: reflexBase,
        total: reflexTotal,
        adjustment: refAdjust,
        stateBonus: refStateBonus,
        classBonus: reflexClassBonus,
        heroicLevel,
        levelContribution: reflexLevelTerm,
        speciesBonus: reflexSpeciesBonus,
        miscBonus: reflexMiscBonus,
        armorBonus: reflexArmorBonus,
        armorContribution: reflexLevelTerm,
        sizeModifier: reflexSizeModifier,
        abilityKey: reflexAbilityKey,
        abilityMod: reflexAbilityMod,
        conditionPenalty
      },
      will: {
        base: willBase,
        total: willTotal,
        adjustment: willAdjust,
        stateBonus: willStateBonus,
        classBonus: willClassBonus,
        heroicLevel,
        levelContribution: heroicLevel,
        speciesBonus: willSpeciesBonus,
        miscBonus: willMiscBonus,
        armorBonus: willArmorBonus,
        abilityKey: willAbilityKey,
        abilityMod: willAbilityMod,
        conditionPenalty
      },
      flatFooted: {
        base: flatFootedBase,
        total: flatFootedTotal,
        adjustment: refAdjust,
        stateBonus: refStateBonus,
        classBonus: reflexClassBonus,
        heroicLevel,
        levelContribution: reflexLevelTerm,
        speciesBonus: reflexSpeciesBonus,
        miscBonus: reflexMiscBonus,
        armorBonus: reflexArmorBonus,
        armorContribution: reflexLevelTerm,
        sizeModifier: reflexSizeModifier,
        abilityKey: reflexAbilityKey,
        abilityMod: 0,
        conditionPenalty
      }
    };
  }

  /**
   * Get state-dependent modifiers from PASSIVE/STATE abilities.
   * PHASE 4: Evaluates predicates and sums applicable modifiers.
   *
   * @param {Actor} actor
   * @param {string} defenseType - 'fortitude', 'reflex', or 'will'
   * @param {Object} context - Attack context with attackType, etc.
   * @returns {Promise<number>} - Sum of state-dependent modifiers
   */
  static async _getStateModifiers(actor, defenseType, context = {}) {
    try {
      if (!actor?.items) return 0;

      let stateBonus = 0;

      // Check all items for PASSIVE/STATE abilities
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
          continue;
        }

        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
          continue;
        }

        const isStaticSheetContext = !context || Object.keys(context).length === 0;

        // Apply each modifier in the PASSIVE/STATE item
        for (const modifier of meta.modifiers) {
          const scopedModifier = {
            ...modifier,
            mechanicsMode: modifier.mechanicsMode || meta.mechanicsMode,
            applicationScope: modifier.applicationScope || meta.applicationScope,
            staticSheetPolicy: modifier.staticSheetPolicy || meta.staticSheetPolicy,
            requiresRuntimeContext: modifier.requiresRuntimeContext ?? meta.requiresRuntimeContext,
            requiresSelectedChoice: modifier.requiresSelectedChoice ?? meta.requiresSelectedChoice,
            predicateRequirements: modifier.predicateRequirements || meta.predicateRequirements || []
          };

          if (!ModifierEngine.isModifierAllowedInContext(actor, scopedModifier, context, { staticSheet: isStaticSheetContext })) {
            continue;
          }

          // Check if this modifier applies to the current defense type
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToDefense = targets.some(t => t === `defense.${defenseType}` || t === 'defense');

          if (!appliesToDefense) continue;

          // Evaluate predicates (all must be true)
          const predicates = modifier.predicates || [];
          const predicatesMatch = evaluateStatePredicates(actor, predicates, context);

          if (predicatesMatch && modifier.value) {
            stateBonus += modifier.value;
          }
        }
      }

      return stateBonus;
    } catch (err) {
      swseLogger.error('DefenseCalculator._getStateModifiers:', err);
      return 0;
    }
  }

  /**
   * Determine highest class defense bonus.
   */
  static async _getSaveBonus(classLevels, saveType) {

    if (!Array.isArray(classLevels) || classLevels.length === 0) {
      return 0;
    }

    const saveKey =
      saveType === 'fort' ? 'fortitude' :
      saveType === 'ref' ? 'reflex' :
      'will';

    const uniqueClasses = [
      ...new Set(
        classLevels
          .map(cl => cl?.class)
          .filter(Boolean)
      )
    ];

    if (uniqueClasses.length === 0) {
      return 0;
    }

    const classDataList = await Promise.all(
      uniqueClasses.map(className => getClassData(className))
    );

    let maxBonus = 0;

    for (let i = 0; i < uniqueClasses.length; i++) {
      const className = uniqueClasses[i];
      const classData = classDataList[i];

      if (!classData) {
        swseLogger.warn(`DefenseCalculator: Unknown class "${className}"`);
        continue;
      }

      const classBonus = classData.defenses?.[saveKey] ?? 0;
      maxBonus = Math.max(maxBonus, classBonus);
    }

    return maxBonus;
  }

  static _emptyResult() {
    return {
      fortitude: { base: 0, total: 0, adjustment: 0 },
      reflex: { base: 0, total: 0, adjustment: 0 },
      will: { base: 0, total: 0, adjustment: 0 }
    };
  }

  /**
   * Debug helper: log defense breakdown for an actor.
   * Usage: SWSE.debug.defenses(actor)
   * @param {Actor} actor
   */
  static async debugFor(actor) {
    if (!actor?.system) { console.warn('[DefenseCalculator.debugFor] no actor'); return; }
    const prog = actor.system.progression || {};
    const classLevels = prog.classLevels || [];
    const result = await DefenseCalculator.calculate(actor, classLevels);
    const attrs = actor.system.attributes || actor.system.abilities || {};
    const lines = [];
    lines.push(`=== Defense Breakdown: ${actor.name} ===`);
    lines.push(`  Class levels: ${JSON.stringify(classLevels)}`);
    for (const [key, val] of Object.entries(attrs)) {
      const base = val?.base ?? 10;
      const racial = val?.racial ?? 0;
      const enhancement = val?.enhancement ?? 0;
      const temp = val?.temp ?? 0;
      const total = base + racial + enhancement + temp;
      const mod = Math.floor((total - 10) / 2);
      lines.push(`  ${key}: base=${base} racial=${racial} enh=${enhancement} temp=${temp} total=${total} mod=${mod}`);
    }
    for (const def of ['reflex', 'fortitude', 'will']) {
      const d = result[def];
      lines.push(`  ${def}: 10 + level(${d.levelContribution ?? d.heroicLevel}) + class(${d.classBonus}) + abil(${d.abilityMod}) + size(${d.sizeModifier ?? 0}) + misc(${d.miscBonus ?? 0}) + cond(${d.conditionPenalty}) = ${d.total}`);
    }
    console.log(lines.join('\n'));
    return result;
  }
}