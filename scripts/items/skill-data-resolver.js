/**
 * Canonical presentation resolver for custom/skill item sheets.
 * Keeps skill storage compatible with the existing progression skill systems.
 */

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry !== null && entry !== undefined && String(entry).trim() !== '');
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function asText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'object') {
    if (typeof value.value === 'string') return value.value;
    if (typeof value.text === 'string') return value.text;
    return fallback;
  }
  return String(value);
}

function toNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAbility(value) {
  const normalized = String(value || 'cha').trim().toLowerCase().slice(0, 3);
  if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(normalized)) return normalized;
  return 'cha';
}

function classEligibility(classes = {}) {
  return ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'].map((name) => {
    const raw = classes?.[name];
    return {
      name,
      value: raw === true ? 'true' : raw === false || raw == null ? 'false' : String(raw),
      label: raw === true ? 'Class Skill' : raw === false || raw == null ? 'No' : String(raw)
    };
  });
}

export function resolveSkillData(itemOrData = {}) {
  const item = itemOrData?.system ? itemOrData : { system: itemOrData ?? {} };
  const system = clone(item?.system ?? {});
  const dcTable = Array.isArray(system.dcTable) ? system.dcTable.map((tier, index) => ({
    index,
    dc: toNumber(tier?.dc, 0),
    effect: asText(tier?.effect, '')
  })) : [];
  const synergies = Array.isArray(system.synergies) ? system.synergies.map((synergy, index) => ({
    index,
    name: asText(synergy?.name, ''),
    bonus: asText(synergy?.bonus, '+2')
  })) : [];
  const tags = asArray(system.tags);

  return {
    ability: normalizeAbility(system.ability || system.selectedAbility),
    abilityOptions: [
      { value: 'str', label: 'Strength' },
      { value: 'dex', label: 'Dexterity' },
      { value: 'con', label: 'Constitution' },
      { value: 'int', label: 'Intelligence' },
      { value: 'wis', label: 'Wisdom' },
      { value: 'cha', label: 'Charisma' }
    ],
    category: asText(system.category || system.type || 'skill', 'skill'),
    sourcebook: asText(system.sourcebook || system.source || 'Manual', 'Manual'),
    page: toNumber(system.page, 0),
    tags,
    tagsText: tags.join(', '),
    trainedOnly: system.trainedOnly === true,
    armorCheckPenalty: system.armorCheckPenalty === true || system.acp === true,
    retry: system.retry !== false,
    takeTen: system.takeTen !== false,
    takeTwenty: system.takeTwenty === true,
    actionType: asText(system.actionType || system.action || 'standard', 'standard'),
    usageNotes: asText(system.usageNotes || system.benefit || '', ''),
    benefit: asText(system.benefit || system.description?.value || system.description || '', ''),
    special: asText(system.special, ''),
    classes: classEligibility(system.classes),
    dcTable,
    synergies,
    effectCount: Array.isArray(item?.effects) ? item.effects.length : 0
  };
}
