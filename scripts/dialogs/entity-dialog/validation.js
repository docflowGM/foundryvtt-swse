/**
 * SWSE Entity Dialog validation helpers.
 *
 * Validation is intentionally advisory for GM-authored/homebrew content. The
 * save pipeline reports warnings but does not block valid Foundry updates unless
 * Foundry itself rejects the update.
 */

import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

const DICE_TERM_RE = String.raw`\d*d\d+(?:k[hl]?\d*|d[hl]?\d*|r[<>=]?\d*|x[<>=]?\d*|cs[<>=]?\d*|cf[<>=]?\d*)*`;
const DICE_RE = new RegExp(String.raw`^\s*(?:${DICE_TERM_RE}|\d+)(?:\s*[+\-*/]\s*(?:${DICE_TERM_RE}|\d+))*\s*$`, 'i');

function toNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function add(issues, path, message, severity = 'warning') {
  issues.push({ path, message, severity, msg: message });
}

function validateUniversal({ name, system }, issues) {
  if (!String(name || '').trim()) add(issues, 'name', 'Name is required.', 'error');
  if (system?.cost != null && toNumber(system.cost, 0) < 0) add(issues, 'system.cost', 'Cost cannot be negative.');
  if (system?.value != null && toNumber(system.value, 0) < 0) add(issues, 'system.value', 'Value cannot be negative.');
  if (system?.weight != null && toNumber(system.weight, 0) < 0) add(issues, 'system.weight', 'Weight cannot be negative.');
}

function validateWeapon(system, issues) {
  if (system.damage && !DICE_RE.test(String(system.damage))) {
    add(issues, 'system.damage', 'Weapon damage should be a Foundry dice formula such as 2d6, 2d6+1, 4d6kh3, or 4d6kl3.');
  }
  const critText = String(system.criticalRange || '20');
  const critMin = critText.includes('-') ? Number(critText.split('-')[0]) : Number(critText);
  if (Number.isFinite(critMin) && (critMin < 2 || critMin > 20)) {
    add(issues, 'system.criticalRange', 'Critical range should start between 2 and 20.');
  }
  const ammo = system.ammunition ?? {};
  if (toNumber(ammo.current, 0) > toNumber(ammo.max, 0) && toNumber(ammo.max, 0) > 0) {
    add(issues, 'system.ammunition.current', 'Current ammunition exceeds maximum ammunition.');
  }
  for (const [key, range] of Object.entries(system.ranges ?? {})) {
    if (toNumber(range?.min, 0) < 0 || toNumber(range?.max, 0) < 0) {
      add(issues, `system.ranges.${key}`, 'Range bands cannot be negative.');
    }
  }
}

function validateArmor(system, issues) {
  const armor = resolveArmorData({ type: 'armor', system });
  if (!['light', 'medium', 'heavy', 'shield'].includes(armor.armorType)) {
    add(issues, 'system.armorType', 'Armor type should be light, medium, heavy, or shield.');
  }
  if (armor.isEnergyShield) {
    if (armor.shieldRating < 0) add(issues, 'system.shieldRating', 'Shield Rating cannot be negative.');
    if (armor.currentSR > armor.shieldRating && armor.shieldRating > 0) add(issues, 'system.currentSR', 'Current SR exceeds Shield Rating.');
    if (armor.chargesCurrent > armor.chargesMax && armor.chargesMax > 0) add(issues, 'system.charges.current', 'Current charges exceed maximum charges.');
    return;
  }
  if (armor.reflexBonus < 0) add(issues, 'system.defenseBonus', 'Armor Reflex bonus is usually non-negative.');
}

function validateForcePower(system, issues) {
  const rows = asArray(system.dcChart).filter((row) => row && typeof row === 'object');
  if (!rows.length) add(issues, 'system.dcChart', 'Force Power has no structured DC chart yet.');
  let previous = null;
  rows.forEach((row, index) => {
    const dc = toNumber(row.dc, 0);
    if (dc < 0 || dc > 80) add(issues, `system.dcChart.${index}.dc`, `DC row ${index + 1} is outside the expected range.`);
    if (!String(row.effect || row.description || '').trim()) add(issues, `system.dcChart.${index}.effect`, `DC row ${index + 1} needs effect text.`);
    if (previous != null && dc <= previous) add(issues, `system.dcChart.${index}.dc`, `DC row ${index + 1} should be higher than the previous row.`);
    previous = dc;
  });
}

function validateSkill(system, issues) {
  const rows = asArray(system.dcTable).filter((row) => row && typeof row === 'object');
  rows.forEach((row, index) => {
    if (!String(row.effect || '').trim()) add(issues, `system.dcTable.${index}.effect`, `Skill DC row ${index + 1} needs outcome text.`);
  });
}

function validateChoiceMeta(system, issues) {
  const choice = system.choiceMeta ?? {};
  if (choice.required === true && !String(choice.choiceKind || choice.label || '').trim()) {
    add(issues, 'system.choiceMeta.choiceKind', 'Choice-required mechanics should identify what the player chooses.');
  }
}

export function validateItemData({ type = 'equipment', name = '', system = {} } = {}) {
  const issues = [];
  validateUniversal({ name, system }, issues);
  if (type === 'weapon') validateWeapon(system, issues);
  if (type === 'armor') validateArmor(system, issues);
  if (type === 'force-power') validateForcePower(system, issues);
  if (type === 'skill') validateSkill(system, issues);
  if (type === 'feat' || type === 'talent') validateChoiceMeta(system, issues);
  return issues;
}

export function summarizeValidation(issues = []) {
  const list = Array.isArray(issues) ? issues : [];
  return {
    issues: list.map((issue, index) => ({ index, ...issue })),
    count: list.length,
    errorCount: list.filter((issue) => issue.severity === 'error').length,
    warningCount: list.filter((issue) => issue.severity !== 'error').length,
    hasIssues: list.length > 0,
    summary: list.length ? `${list.length} validation warning${list.length === 1 ? '' : 's'}` : 'No validation warnings'
  };
}
