import { FeatChoiceResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function optionValue(option) {
  return JSON.stringify(option || {});
}

function renderOptions(options, selectedKey = '') {
  if (!options?.length) {
    return '<p class="notes">No legal choices are currently available for this actor.</p>';
  }
  return `<div class="swse-feat-choice-options">
    ${options.map((option, index) => {
      const key = FeatChoiceResolver.getSelectedChoiceKey(option) || option.id || option.value || String(index);
      const source = option.locked ? 'Locked' : (option.source || option.prerequisiteSource || 'Available');
      return `<label class="swse-feat-choice-option" style="display:block;margin:.35rem 0;">
        <input type="radio" name="swseFeatChoice" value="${escapeHtml(optionValue(option))}" ${selectedKey && selectedKey === key ? 'checked' : ''}>
        <strong>${escapeHtml(option.label || option.name || option.value || option.id)}</strong>
        <span class="notes">${escapeHtml(source)}</span>
      </label>`;
    }).join('')}
  </div>`;
}


async function promptOption(title, message, options) {
  const content = `<form class="swse-feat-choice-dialog"><p>${escapeHtml(message || '')}</p>${renderOptions(options)}</form>`;
  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        confirm: {
          label: 'Continue',
          callback: (html) => {
            const input = html[0]?.querySelector('input[name="swseFeatChoice"]:checked');
            if (!input) { resolve(null); return; }
            try { resolve(JSON.parse(input.value)); } catch (_err) { resolve(input.value); }
          }
        },
        cancel: { label: 'Cancel', callback: () => resolve(null) }
      },
      default: 'confirm',
      close: () => resolve(null)
    }).render(true);
  });
}

export class FeatChoiceDialog {
  static async prompt(actor, itemOrFeat, { title = null, allowCancel = true } = {}) {
    const meta = FeatChoiceResolver.getChoiceMeta(itemOrFeat);
    if (!meta?.required) return null;
    if (FeatChoiceResolver.isClassGrantedItem(itemOrFeat)) {
      ui.notifications?.warn?.(`${itemOrFeat.name} is a locked class grant and cannot be changed.`);
      return null;
    }

    const options = await FeatChoiceResolver.resolveOptions(actor, itemOrFeat);
    const current = FeatChoiceResolver.getStoredChoice(actor, itemOrFeat);
    const selectedKey = FeatChoiceResolver.getSelectedChoiceKey(current);
    const content = `<form class="swse-feat-choice-dialog">
      <p><strong>${escapeHtml(itemOrFeat?.name || 'Feat')}</strong> requires a choice.</p>
      ${meta.choiceSource === 'grantPool' || FeatChoiceResolver.inferChoiceSource(itemOrFeat) === 'grantPool'
        ? '<p class="notes">This feat unlocks progression slots. The dedicated progression step resolves the granted selections later.</p>'
        : ''}
      ${renderOptions(options, selectedKey)}
    </form>`;

    return new Promise((resolve) => {
      new Dialog({
        title: title || `Choose: ${itemOrFeat?.name || 'Feat Choice'}`,
        content,
        buttons: {
          confirm: {
            label: 'Save Choice',
            callback: async (html) => {
              const input = html[0]?.querySelector('input[name="swseFeatChoice"]:checked');
              if (!input) {
                ui.notifications?.warn?.('Choose an option before saving.');
                resolve(null);
                return;
              }
              let selected = null;
              try { selected = JSON.parse(input.value); } catch (_err) { selected = input.value; }
              if (selected?.id === 'exotic' || selected?.branch === 'exoticWeapons') {
                const registry = await FeatChoiceResolver.loadRegistry();
                const category = await promptOption('Choose Exotic Weapon Category', 'Choose the kind of exotic weapon proficiency.', [
                  { id: 'melee', value: 'melee', label: 'Exotic Melee Weapons' },
                  { id: 'ranged', value: 'ranged', label: 'Exotic Ranged Weapons' }
                ]);
                if (!category) { resolve(null); return; }
                const weaponOptions = (registry.exoticWeapons?.[category.value] || []).map((name) => ({
                  id: `exotic:${category.value}:${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                  value: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  label: name,
                  group: 'exotic',
                  category: category.value,
                  weapon: name
                }));
                const weapon = await promptOption('Choose Exotic Weapon', `Choose the specific ${category.label}.`, weaponOptions);
                if (!weapon) { resolve(null); return; }
                selected = weapon;
              }
              const validation = await FeatChoiceResolver.validateSelectedChoice(actor, itemOrFeat, selected);
              if (!validation.valid) {
                ui.notifications?.error?.(validation.errors.join(' '));
                resolve(null);
                return;
              }
              resolve(selected);
            }
          },
          cancel: {
            label: allowCancel ? 'Cancel' : 'Later',
            callback: () => resolve(null)
          }
        },
        default: 'confirm',
        close: () => resolve(null)
      }).render(true);
    });
  }

  static async promptAndApply(actor, item) {
    const selected = await this.prompt(actor, item);
    if (!selected) return false;
    const patch = FeatChoiceResolver.buildChoicePatch(item, selected);
    if (!patch) return false;
    await item.update(patch);
    return true;
  }
}

export default FeatChoiceDialog;
