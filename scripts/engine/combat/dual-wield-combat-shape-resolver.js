import { EffectiveWeaponQualityResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/effective-weapon-quality-resolver.js";

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.itemType,
    system.sourceType,
    system.size,
    system.weaponSize,
    system.effectiveSize,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties,
    Array.isArray(system.qualities) ? system.qualities.join(' ') : system.qualities,
    Array.isArray(system.weaponQualities) ? system.weaponQualities.join(' ') : system.weaponQualities
  ];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function weaponId(weapon) {
  return String(weapon?.id ?? weapon?._id ?? weapon?.uuid ?? '');
}

function sameWeapon(a, b) {
  const aid = weaponId(a);
  const bid = weaponId(b);
  return !!aid && !!bid && aid === bid;
}

function equippedWeapons(actor) {
  return actorItems(actor).filter(item => item?.type === 'weapon' && item?.system?.equipped);
}

function isDoubleWeapon(weapon) {
  if (!weapon) return false;
  if (weapon.system?.isDoubleWeapon === true || weapon.system?.doubleWeapon === true) return true;
  const qualities = EffectiveWeaponQualityResolver.resolve(weapon);
  if (qualities.has('double') || qualities.has('double-weapon')) return true;
  const text = weaponText(weapon);
  return text.includes('double')
    || text.includes('quarterstaff')
    || text.includes('electrostaff')
    || text.includes('double-bladed-lightsaber')
    || text.includes('double-vibroblade');
}

function isNaturalWeapon(weapon) {
  if (!weapon) return false;
  if (weapon.flags?.swse?.isNaturalWeapon === true || weapon.flags?.swse?.naturalWeapon === true) return true;
  if (weapon.system?.naturalWeapon === true || weapon.system?.isNaturalWeapon === true) return true;
  const text = weaponText(weapon);
  return /natural-weapon|claw|bite|talon|tusk|horn|tail|slam|gore/.test(text);
}

function isUnarmedWeapon(weapon) {
  if (!weapon) return false;
  const text = weaponText(weapon);
  return text.includes('unarmed') || isNaturalWeapon(weapon);
}

function effectiveSize(weapon, context = {}) {
  const flags = context?.flags ?? {};
  const explicit = context?.effectiveWeaponSize
    ?? context?.weaponEffectiveSize
    ?? flags.effectiveWeaponSize
    ?? flags['weaponProperty.effectiveSize']
    ?? weapon?.system?.effectiveSize
    ?? weapon?.system?.weaponSize
    ?? weapon?.system?.size;
  const key = normalizeKey(explicit);
  if (key) return key;
  const text = weaponText(weapon);
  if (text.includes('tiny')) return 'tiny';
  if (text.includes('small')) return 'small';
  if (text.includes('medium')) return 'medium';
  if (text.includes('large')) return 'large';
  if (text.includes('huge')) return 'huge';
  return '';
}

function isLightWeapon(weapon, context = {}) {
  if (!weapon) return false;
  if (weapon.system?.light === true || weapon.system?.isLight === true || weapon.system?.isLightWeapon === true) return true;
  const qualities = EffectiveWeaponQualityResolver.resolve(weapon, context);
  if (qualities.has('light') || qualities.has('light-weapon')) return true;
  const size = effectiveSize(weapon, context);
  if (size === 'tiny' || size === 'small') return true;
  const text = weaponText(weapon);
  return text.includes('light-weapon')
    || text.includes('light-melee')
    || text.includes('knife')
    || text.includes('dagger')
    || text.includes('hold-out')
    || text.includes('short-sword');
}

function isProficient(weapon) {
  return weapon?.system?.proficient !== false;
}

function findPrimary(actor) {
  const weapons = equippedWeapons(actor);
  return weapons.find(item => !item.system?.isOffhand && item.system?.slot !== 'offhand') ?? weapons[0] ?? null;
}

function findOffhand(actor, primary = null) {
  const weapons = equippedWeapons(actor);
  const explicit = weapons.find(item => item.system?.isOffhand === true || item.system?.slot === 'offhand');
  if (explicit) return explicit;
  return weapons.find(item => primary && !sameWeapon(item, primary)) ?? null;
}

function dualWeaponMasteryLevel(actor) {
  let level = 0;
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item.system?.disabled === true) continue;
    const name = normalizeKey(item.name);
    const slug = normalizeKey(item.system?.slug);
    const text = `${name} ${slug}`;
    if (text.includes('dual-weapon-mastery-iii') || text.includes('dual-weapon-mastery-3')) level = Math.max(level, 3);
    else if (text.includes('dual-weapon-mastery-ii') || text.includes('dual-weapon-mastery-2')) level = Math.max(level, 2);
    else if (text.includes('dual-weapon-mastery-i') || text.includes('dual-weapon-mastery-1')) level = Math.max(level, 1);
  }
  return level;
}

function dualWeaponPenalty(level) {
  if (level >= 3) return 0;
  if (level === 2) return -2;
  if (level === 1) return -5;
  return -10;
}

function describeWeapon(weapon, role, context = {}) {
  if (!weapon) return null;
  return {
    weapon,
    weaponId: weaponId(weapon),
    name: weapon.name ?? '',
    handRole: role,
    proficient: isProficient(weapon),
    isLightWeapon: isLightWeapon(weapon, context),
    isNaturalWeapon: isNaturalWeapon(weapon),
    isUnarmed: isUnarmedWeapon(weapon),
    effectiveSize: effectiveSize(weapon, context),
    effectiveQualities: Array.from(EffectiveWeaponQualityResolver.resolve(weapon, context))
  };
}

export class DualWieldCombatShapeResolver {
  static resolve(actor, options = {}) {
    const primary = options.primaryWeapon ?? findPrimary(actor);
    const explicitOffhand = options.offhandWeapon ?? null;
    const doubleWeapon = options.isDoubleWeapon === true || isDoubleWeapon(primary);
    const offhand = doubleWeapon ? primary : explicitOffhand ?? findOffhand(actor, primary);
    const usingTwoWeapons = !!primary && !!offhand && !sameWeapon(primary, offhand);
    const usingDoubleWeapon = !!primary && doubleWeapon;
    const mode = usingDoubleWeapon ? 'doubleWeapon' : usingTwoWeapons ? 'dualWield' : 'singleWeapon';

    const mainHand = describeWeapon(primary, usingDoubleWeapon ? 'double-primary' : 'main', options);
    const offHand = describeWeapon(offhand, usingDoubleWeapon ? 'double-secondary' : 'offhand', options);
    const dwmLevel = dualWeaponMasteryLevel(actor);
    const proficient = usingDoubleWeapon
      ? mainHand?.proficient === true
      : (mainHand?.proficient === true && offHand?.proficient === true);
    const basePenalty = mode === 'singleWeapon' ? 0 : -10;
    const finalPenalty = mode === 'singleWeapon' ? 0 : proficient ? dualWeaponPenalty(dwmLevel) : basePenalty;

    return {
      mode,
      usingDualWield: mode !== 'singleWeapon',
      usingTwoWeapons,
      usingDoubleWeapon,
      mainHand,
      offHand,
      primaryEnd: usingDoubleWeapon ? mainHand : null,
      secondaryEnd: usingDoubleWeapon ? offHand : null,
      dualWeaponMasteryLevel: dwmLevel,
      penalty: {
        base: basePenalty,
        final: finalPenalty,
        source: mode === 'singleWeapon'
          ? 'Single Weapon'
          : proficient && dwmLevel > 0
            ? `Dual Weapon Mastery ${['I', 'II', 'III'][dwmLevel - 1]}`
            : 'Two-Weapon Fighting',
        proficiencyEligible: proficient
      }
    };
  }

  static roleForWeapon(actor, weapon, options = {}) {
    const shape = this.resolve(actor, options);
    if (!weapon) return { shape, role: null, slot: null };
    if (shape.usingDoubleWeapon && sameWeapon(shape.mainHand?.weapon, weapon)) {
      const hinted = normalizeKey(options.handRole ?? options.slot ?? options.attackRole ?? '');
      const role = hinted.includes('secondary') || hinted.includes('offhand') ? 'double-secondary' : 'double-primary';
      return { shape, role, slot: role === 'double-secondary' ? shape.offHand : shape.mainHand };
    }
    if (sameWeapon(shape.offHand?.weapon, weapon)) return { shape, role: 'offhand', slot: shape.offHand };
    if (sameWeapon(shape.mainHand?.weapon, weapon)) return { shape, role: 'main', slot: shape.mainHand };
    return { shape, role: null, slot: null };
  }

  static annotateModifierResult(result, actor, weapon, options = {}) {
    const { shape, role, slot } = this.roleForWeapon(actor, weapon, options);
    result.flags ??= {};
    result.breakdown ??= [];
    result.dualWieldShape = shape;
    if (role) {
      result.flags.handRole = role;
      result.flags['swse.handRole'] = role;
      result.flags.isOffhandAttack = role === 'offhand' || role === 'double-secondary';
      result.flags.isMainHandAttack = role === 'main' || role === 'double-primary';
      result.flags.offhandLightWeapon = role === 'offhand' || role === 'double-secondary' ? slot?.isLightWeapon === true : false;
      result.flags.weaponIsLight = slot?.isLightWeapon === true;
      result.flags.weaponIsNatural = slot?.isNaturalWeapon === true;
      result.flags.weaponIsUnarmed = slot?.isUnarmed === true;
      result.flags.effectiveWeaponSize = slot?.effectiveSize || result.flags.effectiveWeaponSize;
      result.breakdown.push({ label: `Hand Role: ${role}`, value: 0, type: 'dualWieldShape' });
    }
    if (shape.usingDualWield) {
      result.flags.dualWieldMode = shape.mode;
      result.flags.dualWeaponMasteryLevel = shape.dualWeaponMasteryLevel;
      result.flags.dualWieldPenalty = shape.penalty.final;
    }
    return result;
  }
}

export default DualWieldCombatShapeResolver;
