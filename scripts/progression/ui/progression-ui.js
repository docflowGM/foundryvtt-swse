/**
 * Minimal Progression UI helpers. Replace Dialog skeletons with Applications/HBS for full UX.
 */

import { ProgressionEngine } from "../engine/progression-engine.js";
import { PROGRESSION_RULES } from "../data/progression-data.js";

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
      const dlg = new Dialog({
        title: "Create Character",
        content,
        buttons: { cancel: { label: "Cancel" } },
        render: (html) => {
          html.find('[data-choice]').click((ev) => {
            resolve(ev.currentTarget.dataset.choice);
            dlg.close();
          });
        }
      });
      dlg.render(true);
    });
  }

  static async openTemplateQuickBuild(actor) {
    const templates = PROGRESSION_RULES.templates || {};
    const tplList = Object.entries(templates).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join("");

    // Check if backgrounds are enabled via houserule
    const enableBackgrounds = game.settings.get('foundryvtt-swse', 'enableBackgrounds');

    // Build background dropdown if enabled
    let backgroundField = '';
    if (enableBackgrounds) {
      const backgrounds = PROGRESSION_RULES.backgrounds || {};
      const bgList = Object.entries(backgrounds)
        .map(([id, bg]) => `<option value="${id}">${bg.name}</option>`)
        .join("");
      backgroundField = `
        <div class="form-group">
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
    new Dialog({
      title: "Template Quick Build",
      content,
      buttons: {
        ok: {
          label: "Build",
          callback: async (html) => {
            const tpl = html.find('[name="template"]').val();
            const bg = html.find('[name="background"]').val() || null;
            await ProgressionEngine.applyTemplateBuild(actor, tpl, { background: bg });
          }
        },
        cancel: { label: "Cancel" }
      }
    }).render(true);
  }
}
