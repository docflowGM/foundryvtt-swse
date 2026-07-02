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

function isRangedWeapon(weapon, context = {}) {
  if (context.attackType === 'ranged' || context.weaponType === 'ranged') return true;
  const system = weapon?.system ?? {};
  const text = [weapon?.name, system.weaponType, system.weaponGroup, system.category, system.type, system.range]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return system.ranged === true || text.includes('ranged') || text.includes('pistol') || text.includes('rifle') || text.includes('blaster');
}

function isPointBlankContext(context = {}) {
  if (context.pointBlankRange === true || context.isPointBlank === true) return true;
  const band = String(context.rangeBand || context.rangeCategory || '').toLowerCase().replace(/_/g, '-');
  return band === 'point-blank' || band === 'pointblank';
}

function explicitFeatBonus(item, weapon, target, context = {}) {
  const key = featBaseKey(item);
  if (key === 'point-blank-shot') {
    if (!isRangedWeapon(weapon, context) || !isPointBlankContext(context)) return 0;
    return target === 'attack' || target === 'damage' ? 1 : 0;
  }

  if (!weaponMatchesSelectedChoice(item, weapon)) return 0;
  if (key === 'weapon-focus' && target === 'attack') return 1;
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
