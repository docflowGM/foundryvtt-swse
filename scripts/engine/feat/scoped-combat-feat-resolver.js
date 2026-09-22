import { isRangedWeapon as canonicalIsRangedWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";

function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function singularizeToken(value) {
  const token = normalizeToken(value);
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function featBaseKey(item) {
  return normalizeToken(String(item?.name || item?.system?.slug || item?.slug || '').replace(/\([^)]*\)/g, '').trim());
}

function selectedChoiceValue(item) {
  const system = item?.system ?? {};
  const meta = system.abilityMeta ?? {};
  const choiceMeta = system.choiceMeta ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? meta.selectedChoice ?? meta.selectedChoices;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') return entry.value || entry.id || entry.group || entry.weapon || entry.weaponGroup || entry.label || entry.name || '';
  const paren = String(item?.name || '').match(/\(([^)]+)\)/);
  return paren?.[1] || '';
}

function weaponCandidates(weapon) {
  const system = weapon?.system ?? {};
  return [
    weapon?.name,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.type,
    system.baseWeapon,
    system.proficiencyGroup,
    system.proficiency,
    ...(Array.isArray(system.tags) ? system.tags : []),
    ...(Array.isArray(system.properties) ? system.properties : [])
  ].map(normalizeToken).filter(Boolean);
}

function weaponMatchesSelectedChoice(item, weapon) {
  const selected = normalizeToken(selectedChoiceValue(item));
  if (!selected || !weapon) return false;
  const selectedSingular = singularizeToken(selected);
  return weaponCandidates(weapon).some(candidate => {
    const singularCandidate = singularizeToken(candidate);
    return candidate === selected
      || singularCandidate === selectedSingular
      || candidate.includes(selected)
      || selected.includes(candidate)
      || singularCandidate.includes(selectedSingular)
      || selectedSingular.includes(singularCandidate);
  });
}

// Math Integrity Freeze, Batch 2B: delegated to the canonical branch
// authority. The caller-supplied roll-time context stays first (a
// legitimate distinct signal for e.g. a thrown-weapon attack resolving as
// ranged for that one roll without changing the weapon's own identity).
function isRangedWeapon(weapon, context = {}) {
  if (context.attackType === 'ranged' || context.weaponType === 'ranged') return true;
  if (context.attackType === 'melee' || context.weaponType === 'melee') return false;
  return canonicalIsRangedWeapon(weapon);
}

function isPointBlankContext(context = {}) {
  if (context.pointBlankRange === true || context.isPointBlank === true) return true;
  const band = String(context.rangeBand || context.rangeCategory || '').toLowerCase().replace(/_/g, '-');
  return band === 'point-blank' || band === 'pointblank';
}

// Math Integrity Freeze, Attack Bonus round 6: discovered while proving the
// Greater Weapon Focus + Weapon Focus golden stacking test (+2, per the real
// packs/feats.db "Weapon Focus" record). This resolver's own
// 'weapon-focus' branch and CombatOptionResolver.collectAttackModifiers()
// (via collectModifierRollBonuses() reading item.system.abilityMeta.
// modifiers) are two INDEPENDENT authorities for the exact same bonus --
// resolveAttackBonus() adds both (this resolver's total unconditionally,
// CombatOptionResolver's via attackOptionModifiers.attackBonus), so any
// actor with the real, current Weapon Focus feat record (which already
// carries its own abilityMeta.modifiers entry) was silently double-counted
// (+2 instead of +1) on every attack roll with the selected weapon. This
// resolver's hardcoded 'weapon-focus' fallback still exists for LEGACY feat
// items that predate that data-driven record shape (no abilityMeta.modifiers
// at all) -- see combat-feat-attack-modifier-regression.test.mjs's bare
// `{ name: 'Weapon Focus', system: { selectedChoice } }` fixture -- so it is
// gated, not removed: it only fires when the item does NOT already carry a
// data-driven attack modifier CombatOptionResolver would apply itself.
// Weapon Specialization's damage bonus (a Damage-domain concern, out of this
// round's scope) and Point Blank Shot are unaffected.
function hasDataDrivenAttackModifier(item) {
  const modifiers = item?.system?.abilityMeta?.modifiers;
  if (!Array.isArray(modifiers)) return false;
  return modifiers.some((mod) => {
    if (!mod || mod.enabled === false) return false;
    const targets = Array.isArray(mod.target) ? mod.target : [mod.target];
    return targets.some((t) => t === 'attack' || t === 'attack.bonus');
  });
}

function explicitFeatBonus(item, weapon, target, context = {}) {
  const key = featBaseKey(item);
  if (key === 'point-blank-shot') {
    if (!isRangedWeapon(weapon, context) || !isPointBlankContext(context)) return 0;
    return target === 'attack' || target === 'damage' ? 1 : 0;
  }

  if (!weaponMatchesSelectedChoice(item, weapon)) return 0;
  if (key === 'weapon-focus' && target === 'attack') {
    if (hasDataDrivenAttackModifier(item)) return 0;
    return 1;
  }
  if (key === 'weapon-specialization' && target === 'damage') return 2;
  return 0;
}

export class ScopedCombatFeatResolver {
  static getBonus(actor, weapon, target, context = {}) {
    let total = 0;
    try {
      if (!actor?.items || !target) return 0;
      const enrichedContext = { ...context, weapon };
      for (const item of actor.items) {
        if (item?.type !== 'feat') continue;
        total += explicitFeatBonus(item, weapon, target, enrichedContext);
      }
    } catch (err) {
      console.warn(`[SWSE] Failed to calculate scoped ${target} feat bonus:`, err);
    }
    return total;
  }
}

export default ScopedCombatFeatResolver;
