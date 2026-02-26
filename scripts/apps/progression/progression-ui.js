/**
 * Minimal Progression UI helpers. Replace Dialog skeletons with Applications/HBS for full UX.
 */

import { ProgressionEngine } from '../../engine/progression-engine.js';
import { PROGRESSION_RULES } from "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class ProgressionUI {
  static async openStartSelector(actor) {
    return new Promise((resolve) => {
      const content = `
        <p>Start Character Creation:</p>
        <div class="type-grid">
          <div class="type-card choice-button" data-choice="living">
            <h3>Living Being</h3>
            <p>Organic species with unique traits and force sensitivity.</p>
          </div>
          <div class="type-card choice-button" data-choice="droid">
            <h3>Droid</h3>
            <p>Mechanical beings with specialized modules and upgrade slots.</p>
          </div>
          <div class="type-card choice-button" data-choice="template">
            <h3>Template Build</h3>
            <p>Quick build from pre-made templates and backgrounds.</p>
          </div>
        </div>`;
      const dlg = new SWSEDialogV2({
        title: 'Create Character',
        content,
        buttons: { cancel: { label: 'Cancel' } },
        render: (html) => {
          const root = html?.[0] ?? html;
          root.querySelectorAll('[data-choice]').forEach(el => {
            el.addEventListener('click', (ev) => {
              root.querySelectorAll('[data-choice]').forEach(c => c.classList.remove('selected'));
              ev.currentTarget.classList.add('selected');
              resolve(ev.currentTarget.dataset.choice);
              dlg.close();
            });
          });
        }
      });
      dlg.render(true);
    });
  }

  static async openTemplateQuickBuild(actor) {
    const templates = PROGRESSION_RULES.templates || {};
    const tplList = Object.entries(templates).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('');

    // Check if backgrounds are enabled via houserule
    const enableBackgrounds = HouseRuleService.get('enableBackgrounds');

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
