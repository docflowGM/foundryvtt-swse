/**
 * Within-profile ability choices (e.g. Devaronian male/female, Arkanian Offshoot Strength/Dexterity) — central validation.
 *
 * The species step presents the options, but the choice must be valid no matter which path assigns the species
 * (chargen, drag-and-drop, templates, followers). The published option — never the caller's payload — supplies the
 * modifiers that are applied. Pure module: no Foundry globals.
 */

export const ABILITY_CHOICE_ERRORS = Object.freeze({
  MISSING_CHOICE: 'MISSING_CHOICE',
  UNKNOWN_CHOICE: 'UNKNOWN_CHOICE',
  MODIFIER_MISMATCH: 'MODIFIER_MISMATCH',
});

const KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ALIASES = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };

/** Non-zero ability modifiers of a raw option/payload, normalized to str..cha. */
export function normalizeChoiceMods(raw = {}) {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const lower = String(key).toLowerCase();
    const k = ALIASES[lower] || lower;
    const n = Number(value);
    if (KEYS.includes(k) && Number.isFinite(n) && n !== 0) out[k] = n;
  }
  return out;
}

/** Published options of an entry's selectable-modifier choice (empty when it defines none). */
export function getAbilityChoiceOptions(entry) {
  const choice = entry?.abilityChoice || entry?.system?.abilityChoice || null;
  if (!choice || choice.type !== 'choice' || !Array.isArray(choice.chooseOne)) return [];
  return choice.chooseOne.map((raw, index) => {
    const mods = normalizeChoiceMods(raw);
    const first = Object.keys(mods)[0] ?? 'choice';
    return { id: raw?.id ? String(raw.id) : `${first}-${index}`, label: raw?.label ? String(raw.label) : null, mods };
  });
}

const sameMods = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/**
 * @param {object} entry     effective species entry (with the selected version applied)
 * @param {object|null} selected  caller-supplied selection ({id, mods, ...})
 * @returns {{required: boolean, ok: boolean, code: string|null, choice: object|null}}
 */
export function resolveAbilityChoice(entry, selected) {
  const options = getAbilityChoiceOptions(entry);
  if (!options.length) return { required: false, ok: true, code: null, choice: null };
  if (!selected || typeof selected !== 'object') return { required: true, ok: false, code: ABILITY_CHOICE_ERRORS.MISSING_CHOICE, choice: null };
  const option = options.find(o => o.id === String(selected.id ?? ''));
  if (!option) return { required: true, ok: false, code: ABILITY_CHOICE_ERRORS.UNKNOWN_CHOICE, choice: null };
  if (selected.mods && !sameMods(normalizeChoiceMods(selected.mods), option.mods)) {
    return { required: true, ok: false, code: ABILITY_CHOICE_ERRORS.MODIFIER_MISMATCH, choice: null };
  }
  return { required: true, ok: true, code: null, choice: { id: option.id, label: option.label ?? selected.label ?? option.id, mods: { ...option.mods } } };
}
