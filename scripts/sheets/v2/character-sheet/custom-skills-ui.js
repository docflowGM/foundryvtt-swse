/**
 * Custom Skills panel UI activation
 *
 * Handles custom skill creation, deletion, and rolling from the character sheet.
 * Pure sheet-local feature with no progression integration.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { rollCustomSkill } from "/systems/foundryvtt-swse/scripts/rolls/custom-skill-roller.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createCustomSkillEntry } from "/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js";

const CUSTOM_SKILL_ABILITY_OPTIONS = [
  ['str', 'Strength'],
  ['dex', 'Dexterity'],
  ['con', 'Constitution'],
  ['int', 'Intelligence'],
  ['wis', 'Wisdom'],
  ['cha', 'Charisma']
];

function normalizeCustomSkills(raw) {
  if (Array.isArray(raw)) {
    return raw.filter(skill => skill && typeof skill === 'object').map(skill => ({ ...skill }));
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, skill]) => skill && typeof skill === 'object')
      .sort(([a], [b]) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      })
      .map(([, skill]) => ({ ...skill }));
  }

  return [];
}

function escapeHtml(value) {
  const esc = globalThis.foundry?.utils?.escapeHTML;
  if (typeof esc === 'function') return esc(String(value ?? ''));
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dialogRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function readDialogValue(html, selector, fallback = '') {
  const root = dialogRoot(html);
  const field = root?.querySelector?.(selector);
  if (!field) return fallback;
  if (field.matches?.('input[type="checkbox"]')) return field.checked === true;
  return field.value ?? fallback;
}

async function promptCustomSkillDetails() {
  const abilityOptions = CUSTOM_SKILL_ABILITY_OPTIONS
    .map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === 'int' ? 'selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');

  const content = `
    <form class="swse-custom-skill-dialog" autocomplete="off">
      <p>Create the custom skill first. Once confirmed, it is saved as a complete skill row instead of a half-built sheet form entry.</p>
      <div class="form-group">
        <label>Skill Name</label>
        <input type="text" name="label" value="New Custom Skill" placeholder="Custom skill name" autofocus>
      </div>
      <div class="form-group">
        <label>Ability</label>
        <select name="ability">${abilityOptions}</select>
      </div>
      <div class="form-group">
        <label>Misc Modifier</label>
        <input type="number" name="miscMod" value="0" step="1">
      </div>
      <div class="form-group stacked">
        <label><input type="checkbox" name="trained"> Trained</label>
        <label><input type="checkbox" name="focused"> Skill Focus</label>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" rows="3" placeholder="Optional notes"></textarea>
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    const DialogClass = globalThis.Dialog;
    if (typeof DialogClass !== 'function') {
      resolve({ label: 'New Custom Skill', ability: 'int', miscMod: 0, trained: false, focused: false, notes: '' });
      return;
    }

    new DialogClass({
      title: 'Add Custom Skill',
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Create Skill',
          callback: (html) => {
            const label = String(readDialogValue(html, '[name="label"]', 'New Custom Skill') || '').trim() || 'New Custom Skill';
            const ability = String(readDialogValue(html, '[name="ability"]', 'int') || 'int').toLowerCase();
            const miscMod = Number(readDialogValue(html, '[name="miscMod"]', 0));
            resolve({
              label,
              ability: CUSTOM_SKILL_ABILITY_OPTIONS.some(([key]) => key === ability) ? ability : 'int',
              miscMod: Number.isFinite(miscMod) ? miscMod : 0,
              trained: readDialogValue(html, '[name="trained"]', false) === true,
              focused: readDialogValue(html, '[name="focused"]', false) === true,
              notes: String(readDialogValue(html, '[name="notes"]', '') || '')
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'confirm',
      close: () => resolve(null)
    }).render(true);
  });
}

/**
 * Activate custom skills panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateCustomSkillsUI(sheet, html, { signal } = {}) {
  const actor = sheet.actor;

  // Add Custom Skill button
  html.querySelectorAll('[data-action="add-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      await addCustomSkill(actor);
    }, { signal });
  });


  // Custom skill field edits must update the whole customSkills array. Foundry
  // dot-path writes like system.customSkills.0.ability can coerce the array into
  // an object on some DataModel paths, which made rows disappear and caused the
  // next Add Custom Skill click to crash on a non-iterable value.
  html.querySelectorAll('[name^="system.customSkills."]').forEach(field => {
    field.addEventListener('change', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      await updateCustomSkillField(actor, event.currentTarget);
    }, { signal, capture: true });
  });

  // Delete Custom Skill button
  html.querySelectorAll('[data-action="delete-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const skillId = button.dataset.customSkillId;
      if (skillId) {
        await deleteCustomSkill(actor, skillId);
      }
    }, { signal });
  });

  // Roll Custom Skill button
  html.querySelectorAll('[data-action="roll-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const skillId = button.dataset.customSkillId;
      if (skillId) {
        await rollCustomSkill(actor, skillId);
      }
    }, { signal });
  });
}


async function updateCustomSkillField(actor, field) {
  if (!actor || !actor.isOwner || !(field instanceof HTMLElement)) return;
  const match = String(field.getAttribute('name') || '').match(/^system\.customSkills\.(\d+)\.([^.]+)$/);
  if (!match) return;

  const index = Number(match[1]);
  const prop = match[2];
  if (!Number.isInteger(index) || index < 0) return;

  const customSkills = normalizeCustomSkills(actor.system.customSkills);
  const current = customSkills[index];
  if (!current) return;

  let value;
  if (field.matches('input[type="checkbox"]')) value = field.checked === true;
  else if (field.matches('input[type="number"]')) {
    const numeric = Number(field.value);
    value = Number.isFinite(numeric) ? numeric : 0;
  } else {
    value = field.value ?? '';
  }

  const updatedSkills = customSkills.map((skill, idx) => idx === index ? { ...skill, [prop]: value } : skill);
  await ActorEngine.updateActor(actor, {
    'system.customSkills': updatedSkills
  }, { source: 'custom-skills-field-update' });
}

/**
 * Add a new custom skill to the actor
 * @param {Actor} actor - The character actor
 * @returns {Promise<void>}
 */
async function addCustomSkill(actor) {
  if (!actor || !actor.isOwner) {
    ui.notifications.warn('You do not have permission to edit this actor.');
    return;
  }

  const customSkills = normalizeCustomSkills(actor.system.customSkills);
  const details = await promptCustomSkillDetails();
  if (!details) return;

  const newSkill = createCustomSkillEntry(details);

  const updatedSkills = [...customSkills, newSkill];

  await ActorEngine.updateActor(actor, {
    "system.customSkills": updatedSkills
  }, { source: 'custom-skills-add' });

  swseLogger.log('[CustomSkills] Added new custom skill:', newSkill.id);
}

/**
 * Delete a custom skill from the actor
 * @param {Actor} actor - The character actor
 * @param {string} skillId - The custom skill ID to delete
 * @returns {Promise<void>}
 */
async function deleteCustomSkill(actor, skillId) {
  if (!actor || !actor.isOwner) {
    ui.notifications.warn('You do not have permission to edit this actor.');
    return;
  }

  if (!skillId) return;

  const customSkills = normalizeCustomSkills(actor.system.customSkills);
  const updatedSkills = customSkills.filter(skill => skill.id !== skillId);

  await ActorEngine.updateActor(actor, {
    "system.customSkills": updatedSkills
  }, { source: 'custom-skills-delete' });

  swseLogger.log('[CustomSkills] Deleted custom skill:', skillId);
}

export { addCustomSkill, deleteCustomSkill, normalizeCustomSkills };
