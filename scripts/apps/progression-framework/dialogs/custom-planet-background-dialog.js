import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';

export class CustomPlanetBackgroundDialog extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-custom-planet-background-dialog',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse',
      'swse-custom-planet-background-dialog'
    ],
    position: {
      width: 760,
      height: 'auto'
    },
    window: {
      title: 'Create Custom Planetary Background',
      resizable: true,
      draggable: true,
      frame: true
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/custom-planet-background-dialog.hbs'
    }
  };

  constructor({ skills = [], languages = [], allowUTF = false, onSubmit = null } = {}) {
    super({});
    this.skills = Array.isArray(skills) ? skills : [];
    this.languages = Array.isArray(languages) ? languages : [];
    this.allowUTF = Boolean(allowUTF);
    this.onSubmit = typeof onSubmit === 'function' ? onSubmit : null;
    this._customLanguageMode = false;
  }

  async _prepareContext() {
    return {
      allowUTF: this.allowUTF,
      skills: this.skills.map((skill) => ({
        id: skill.id || skill._id || skill.key || skill.name,
        name: skill.name,
        key: skill.key || ''
      })),
      languages: this.languages.map((language) => ({
        id: language.id || language.slug || language.name,
        name: language.name
      })),
      customLanguageMode: this._customLanguageMode
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    const toggleCustomLanguage = () => {
      this._customLanguageMode = !this._customLanguageMode;
      this.render(true);
    };

    root.querySelector('[data-action="toggle-custom-language"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      toggleCustomLanguage();
    });

    root.querySelector('[data-action="cancel-dialog"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.close();
    });

    root.querySelector('[data-action="submit-dialog"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.#submit(root);
    });
  }

  async #submit(root) {
    const planetName = String(root.querySelector('[name="planetName"]')?.value || '').trim();
    const selectedSkills = Array.from(root.querySelectorAll('input[name="skills"]:checked')).map((input) => input.value);
    const selectedLanguage = String(root.querySelector('[name="language"]')?.value || '').trim();
    const customLanguage = String(root.querySelector('[name="customLanguage"]')?.value || '').trim();

    if (!planetName) {
      ui.notifications?.warn('Enter a planet name.');
      return;
    }

    if (selectedSkills.length !== 3) {
      ui.notifications?.warn('Choose exactly 3 skills for the planet background.');
      return;
    }

    const languageName = this._customLanguageMode ? customLanguage : selectedLanguage;
    if (!languageName) {
      ui.notifications?.warn('Choose a language or add a custom language.');
      return;
    }

    const selectedSkillDocs = this.skills.filter((skill) => selectedSkills.includes(skill.id || skill._id || skill.key || skill.name));
    if (selectedSkillDocs.length !== 3) {
      ui.notifications?.warn('Could not resolve all selected skills.');
      return;
    }

    const payload = {
      planetName,
      relevantSkills: selectedSkillDocs.map((skill) => skill.name),
      bonusLanguage: languageName,
      isCustomLanguage: this._customLanguageMode
    };

    if (this.onSubmit) {
      await this.onSubmit(payload);
    }

    await this.close();
  }
}
