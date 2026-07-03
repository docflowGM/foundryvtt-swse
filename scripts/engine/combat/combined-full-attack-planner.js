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

function sameWeapon(a, b) {
  const aid = String(a?.id ?? a?._id ?? a?.uuid ?? '');
  const bid = String(b?.id ?? b?._id ?? b?.uuid ?? '');
  return !!aid && !!bid && aid === bid;
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

function attackRow({ slot, label, source, attackNumber, dualPenalty, multiPenalty, multiApplies }) {
  const multi = multiApplies ? multiPenalty.final : 0;
  const dual = dualPenalty.final || 0;
  const finalPenalty = Math.min(0, dual + multi);
  return {
    weapon: slot?.weapon ?? null,
    label,
    attackNumber,
    handRole: slot?.handRole ?? null,
    weaponRole: slot?.handRole ?? null,
    source,
    isOffhandAttack: ['offhand', 'double-secondary'].includes(slot?.handRole),
    isMainHandAttack: ['main', 'double-primary'].includes(slot?.handRole),
    isLightWeapon: slot?.isLightWeapon === true,
    isNaturalWeapon: slot?.isNaturalWeapon === true,
    isUnarmed: slot?.isUnarmed === true,
    effectiveSize: slot?.effectiveSize ?? '',
    effectiveQualities: slot?.effectiveQualities ?? [],
    dualWieldPenalty: dual,
    multiattackPenalty: multi,
    finalPenalty,
    penaltyBreakdown: [
      ...(dual ? [{ label: dualPenalty.source, value: dual, type: 'dualWield' }] : []),
      ...(multi ? [{ label: multiPenalty.source, value: multi, type: 'multiattack' }] : [])
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
    const attacks = [];

    if (shape.mainHand?.weapon) {
      attacks.push(attackRow({
        slot: shape.mainHand,
        label: `${shape.mainHand.name} — ${shape.mainHand.handRole === 'double-primary' ? 'Primary End' : 'Main Hand'}`,
        source: 'base',
        attackNumber: attacks.length + 1,
        dualPenalty,
        multiPenalty,
        multiApplies: mode !== 'none'
      }));
    }

    if (mode === 'double' || mode === 'triple') {
      attacks.push(attackRow({
        slot: stackSlot,
        label: `${stackSlot.name} — Double Attack`,
        source: 'doubleAttack',
        attackNumber: attacks.length + 1,
        dualPenalty,
        multiPenalty,
        multiApplies: true
      }));
    }

    if (mode === 'triple') {
      attacks.push(attackRow({
        slot: stackSlot,
        label: `${stackSlot.name} — Triple Attack`,
        source: 'tripleAttack',
        attackNumber: attacks.length + 1,
        dualPenalty,
        multiPenalty,
        multiApplies: true
      }));
    }

    if (shape.usingDualWield && shape.offHand?.weapon) {
      attacks.push(attackRow({
        slot: shape.offHand,
        label: `${shape.offHand.name} — ${shape.usingDoubleWeapon ? 'Secondary End' : 'Off Hand'}`,
        source: shape.usingDoubleWeapon ? 'doubleWeaponSecondary' : 'offhand',
        attackNumber: attacks.length + 1,
        dualPenalty,
        multiPenalty,
        multiApplies: mode !== 'none'
      }));
    }

    attacks.forEach((attack, index) => { attack.attackNumber = index + 1; });

    const breakdown = [];
    if (shape.usingDualWield) {
      const dwm = shape.dualWeaponMasteryLevel ? ` via Dual Weapon Mastery ${roman(shape.dualWeaponMasteryLevel)}` : '';
      breakdown.push(`${shape.mode}: base -10 two-weapon penalty${dwm}; final ${dualPenalty.final}.`);
    }
    if (mode !== 'none') {
      const reduction = multiPenalty.reduction ? `, Multiattack Proficiency reduction +${multiPenalty.reduction}` : '';
      breakdown.push(`${multiPenalty.source}: base ${multiPenalty.base}${reduction}; final ${multiPenalty.final}.`);
    }
    breakdown.push(`Total attacks: ${attacks.length}.`);

    return {
      legal: attacks.length > 0,
      planner: 'combinedFullAttack',
      actionType: 'full-round',
      mode,
      shape,
      attacks,
      warnings: [],
      breakdown
    };
  }
}

export default CombinedFullAttackPlanner;
