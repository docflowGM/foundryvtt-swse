/**
 * Minimal Progression UI helpers. Replace Dialog skeletons with Applications/HBS for full UX.
 */

import { ProgressionEngine } from '../engine/progression-engine.js';
import { PROGRESSION_RULES } from '../data/progression-data.js';

export class ProgressionUI {
  static async openStartSelector(actor) {
    return new Promise((resolve) => {
      const content = `
        <p>Start Character Creation:</p>
        <div class="swse-quick-choices">
          <button type="button" data-choice="living">Living Being</button>
          <button type="button" data-choice="droid">Droid</button>
          <button type="button" data-choice="template">Template Build</button>
        </div>`;
      const dlg = new SWSEDialogV2({
        title: 'Create Character',
        content,
        buttons: { cancel: { label: 'Cancel' } },
        render: (html) => {
          const root = html?.[0] ?? html;
  root.querySelectorAll('[data-choice]').forEach(el => el.addEventListener('click', (ev) => {
            resolve(ev.currentTarget.dataset.choice);
            dlg.close();
          }));
        }
      });
      dlg.render(true);
    });
  }

  static async openTemplateQuickBuild(actor) {
    const templates = PROGRESSION_RULES.templates || {};
    const tplList = Object.entries(templates).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('');

    // Check if backgrounds are enabled via houserule
    const enableBackgrounds = game.settings.get('foundryvtt-swse', 'enableBackgrounds');

    // Build background dropdown if enabled
    let backgroundField = '';
    if (enableBackgrounds) {
      const backgrounds = PROGRESSION_RULES.backgrounds || {};
      const bgList = Object.entries(backgrounds)
        .map(([id, bg]) => `<option value="${id}">${bg.name}</option>`)
        .join('');
      backgroundField = `
        <div class="form-group background-selector" style="display: none;">
          <label>Background (optional)</label>
          <select name="background">
            <option value="">(default)</option>
            ${bgList}
          </select>
        </div>`;
    }

    const content = `
      <form>
        <div class="form-group"><label>Template</label><select name="template">${tplList}</select></div>
        ${backgroundField}
      </form>`;
    new SWSEDialogV2({
      title: 'Template Quick Build',
      content,
      buttons: {
        ok: {
          label: 'Build',
          callback: async (html) => {
            const tpl = (root?.querySelector?.('[name="template"]')?.value ?? null);
            const bg = (root?.querySelector?.('[name="background"]')?.value ?? null) || null;
            await ProgressionEngine.applyTemplateBuild(actor, tpl, { background: bg });
          }
        },
        cancel: { label: 'Cancel' }
      },
      render: (html) => {
        // Add change listener to template dropdown to show/hide background selector
        root.querySelector('[name="template"]')?.addEventListener('change', (event) => {
            const selectedTemplateId = event.currentTarget?.value;
          const selectedTemplate = templates[selectedTemplateId];
            const backgroundSelector = root.querySelector('.background-selector');

          // Only show background selector if template doesn't have a predefined background
          if (selectedTemplate && !selectedTemplate.background) {
                backgroundSelector?.style && (backgroundSelector.style.display = '');
          } else {
                backgroundSelector?.style && (backgroundSelector.style.display = 'none');
          }
        });

        // Trigger change on initial load to set correct visibility
        root.querySelector('[name="template"]')?.dispatchEvent(new Event('change'));
      }
    }).render(true);
  }
}
