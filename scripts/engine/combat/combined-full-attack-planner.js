import { DualWieldCombatShapeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/dual-wield-combat-shape-resolver.js";
import {
  getWeaponGroup,
  getDoubleAttackGroups,
  getTripleAttackGroups,
  getMultiattackReduction
} from "/systems/foundryvtt-swse/scripts/combat/multi-attack.js";

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function roman(level) {
  return ['I', 'II', 'III'][Math.max(0, Math.min(2, Number(level || 0) - 1))] ?? '';
}

function weaponForSlot(slot) {
  return slot?.weapon ?? null;
}

function selectedSlot(shape, options = {}) {
  const requested = normalizeKey(options.doubleAttackHand ?? options.multiAttackHand ?? options.attackStackHand ?? options.selectedHand ?? options.handRole ?? 'main');
  if (shape.usingDoubleWeapon && (requested.includes('secondary') || requested.includes('offhand'))) return shape.offHand;
  if (!shape.usingDoubleWeapon && requested.includes('offhand')) return shape.offHand;
  return shape.mainHand;
}

function canUseDoubleAttack(actor, slot) {
  const weapon = weaponForSlot(slot);
  const group = getWeaponGroup(weapon);
  return !!group && getDoubleAttackGroups(actor).has(group);
}

function canUseTripleAttack(actor, slot) {
  const weapon = weaponForSlot(slot);
  const group = getWeaponGroup(weapon);
  return !!group && getDoubleAttackGroups(actor).has(group) && getTripleAttackGroups(actor).has(group);
}

function multiattackPenalty(actor, slot, mode) {
  if (!slot || mode === 'none') return { base: 0, reduction: 0, final: 0, source: 'No Double/Triple Attack' };
  const weapon = weaponForSlot(slot);
  const group = getWeaponGroup(weapon);
  const base = mode === 'triple' ? -10 : mode === 'double' ? -5 : 0;
  const reduction = group ? getMultiattackReduction(actor, group) : 0;
  const final = Math.min(0, base + reduction);
  return {
    base,
    reduction,
    final,
    source: mode === 'triple' ? 'Triple Attack' : mode === 'double' ? 'Double Attack' : 'No Double/Triple Attack',
    weaponGroup: group
  };
}

function combinedPenalty({ shape, multiPenalty, mode }) {
  const dual = shape.usingDualWield ? Number(shape.penalty?.final ?? 0) : 0;
  const multi = mode === 'none' ? 0 : Number(multiPenalty?.final ?? 0);
  return Math.min(0, dual + multi);
}

function attackRow({ slot, label, source, attackNumber, penalties }) {
  const handRole = slot?.handRole ?? null;
  return {
    weapon: slot?.weapon ?? null,
    label,
    attackNumber,
    handRole,
    weaponRole: handRole,
    source,
    attackSource: source,
    isOffhandAttack: ['offhand', 'double-secondary'].includes(handRole),
    isMainHandAttack: ['main', 'double-primary'].includes(handRole),
    isLightWeapon: slot?.isLightWeapon === true,
    isNaturalWeapon: slot?.isNaturalWeapon === true,
    isUnarmed: slot?.isUnarmed === true,
    effectiveSize: slot?.effectiveSize ?? '',
    effectiveQualities: slot?.effectiveQualities ?? [],
    dualWieldPenalty: penalties.dual,
    multiattackPenalty: penalties.multi,
    finalPenalty: penalties.final,
    penaltyBreakdown: [
      ...(penalties.dual ? [{ label: penalties.dualSource, value: penalties.dual, type: 'dualWield' }] : []),
      ...(penalties.multi ? [{ label: penalties.multiSource, value: penalties.multi, type: 'multiattack' }] : [])
    ]
  };
}

export class CombinedFullAttackPlanner {
  static build(actor, options = {}) {
    const shape = DualWieldCombatShapeResolver.resolve(actor, options);
    const requested = normalizeKey(options.multipleAttackMode ?? options.multiattackMode ?? options.attackMode ?? 'auto');
    const stackSlot = selectedSlot(shape, options);
    const hasTriple = stackSlot && canUseTripleAttack(actor, stackSlot);
    const hasDouble = stackSlot && canUseDoubleAttack(actor, stackSlot);
    const mode = requested === 'triple' && hasTriple
      ? 'triple'
      : requested === 'double' && hasDouble
        ? 'double'
        : requested === 'none'
          ? 'none'
          : hasTriple
            ? 'triple'
            : hasDouble
              ? 'double'
              : 'none';

    const multiPenalty = multiattackPenalty(actor, stackSlot, mode);
    const dualPenalty = shape.penalty;
    const penalties = {
      dual: shape.usingDualWield ? Number(dualPenalty?.final ?? 0) : 0,
      dualSource: dualPenalty?.source ?? 'Two-Weapon Fighting',
      multi: mode === 'none' ? 0 : Number(multiPenalty.final ?? 0),
      multiSource: multiPenalty.source,
      final: combinedPenalty({ shape, multiPenalty, mode })
    };
    const attacks = [];

    if (shape.mainHand?.weapon) {
      attacks.push(attackRow({
        slot: shape.mainHand,
        label: `${shape.mainHand.name} — ${shape.mainHand.handRole === 'double-primary' ? 'Primary End' : 'Main Hand'}`,
        source: 'base',
        attackNumber: attacks.length + 1,
        penalties
      }));
    }

    if (mode === 'double' || mode === 'triple') {
      attacks.push(attackRow({
        slot: stackSlot,
        label: `${stackSlot.name} — Double Attack`,
        source: 'doubleAttack',
        attackNumber: attacks.length + 1,
        penalties
      }));
    }

    if (mode === 'triple') {
      attacks.push(attackRow({
        slot: stackSlot,
        label: `${stackSlot.name} — Triple Attack`,
        source: 'tripleAttack',
        attackNumber: attacks.length + 1,
        penalties
      }));
    }

    if (shape.usingDualWield && shape.offHand?.weapon) {
      attacks.push(attackRow({
        slot: shape.offHand,
        label: `${shape.offHand.name} — ${shape.usingDoubleWeapon ? 'Secondary End' : 'Off Hand'}`,
        source: shape.usingDoubleWeapon ? 'doubleWeaponSecondary' : 'offhand',
        attackNumber: attacks.length + 1,
        penalties
      }));
    }

    attacks.forEach((attack, index) => { attack.attackNumber = index + 1; });

    const breakdown = [];
    if (shape.usingDualWield) {
      const dwm = shape.dualWeaponMasteryLevel ? ` via Dual Weapon Mastery ${roman(shape.dualWeaponMasteryLevel)}` : '';
      breakdown.push(`${shape.mode}: base -10 two-weapon penalty${dwm}; final ${penalties.dual}.`);
    }
    if (mode !== 'none') {
      const reduction = multiPenalty.reduction ? `, Multiattack Proficiency reduction +${multiPenalty.reduction}` : '';
      breakdown.push(`${multiPenalty.source}: base ${multiPenalty.base}${reduction}; final ${penalties.multi}.`);
    }
    breakdown.push(`Combined penalty applied to every attack: ${penalties.final}.`);
    breakdown.push(`Attack ownership: base/double/triple attacks use ${stackSlot?.handRole ?? 'main'}; dual-wield attack uses ${shape.offHand?.handRole ?? 'offhand'}.`);
    breakdown.push(`Total attacks: ${attacks.length}.`);

    return {
      legal: attacks.length > 0,
      planner: 'combinedFullAttack',
      actionType: 'full-round',
      mode,
      selectedAttackStackHand: stackSlot?.handRole ?? null,
      shape,
      combinedPenalty: penalties.final,
      attacks,
      warnings: [],
      breakdown
    };
  }
}

export default CombinedFullAttackPlanner;
