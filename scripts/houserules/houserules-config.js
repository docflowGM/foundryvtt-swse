/**
 * Houserules Configuration Application (Upgraded for Foundry V13–V15)
 * Main launcher UI for all houserule sub-menus.
 */

import SWSEFormApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-form-application-v2.js";
import {
  CharacterCreationMenu,
  AdvancementMenu,
  CombatMenu,
  ForceMenu,
  SkillsFeatsMenu,
  SpaceCombatMenu,
  PresetsMenu,
  CharacterRestrictionsMenu
} from "/systems/foundryvtt-swse/scripts/houserules/houserule-menus.js';

export class HouserulesConfig extends SWSEFormApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-houserules-config',
      title: 'SWSE House Rules Configuration',
      template: 'systems/foundryvtt-swse/templates/apps/houserules/houserules-config.hbs',
      position: { width: 700, height: 600 },
      resizable: true,
      classes: ['swse', 'houserules']
    }
  );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

/** Prepare render context */
  async _prepareContext(options) {
    return {
      isGM: game.user.isGM,
      menus: [
        {
          id: 'character-creation',
          icon: 'fa-solid fa-user-plus',
          title: 'Character Creation',
          description: 'Ability scores, hit points, and starting character rules'
        },
        {
          id: 'character-restrictions',
          icon: 'fa-solid fa-ban',
          title: 'Character Restrictions',
          description: 'Ban races, disable backgrounds'
        },
        {
          id: 'skills-feats',
          icon: 'fa-solid fa-dice-d20',
          title: 'Skills & Feats',
          description: 'Skill checks, feat variants, feint mechanics'
        },
        {
          id: 'advancement',
          icon: 'fa-solid fa-arrow-up',
          title: 'Advancement',
          description: 'Level-up rules, talents, retraining'
        },
        {
          id: 'combat',
          icon: 'fa-solid fa-fist-raised',
          title: 'Combat',
          description: 'Death, diagonal movement, critical hits, condition track'
        },
        {
          id: 'force',
          icon: 'fa-solid fa-hand-sparkles',
          title: 'Force & Destiny',
          description: 'Force powers, dark side rules, destiny mechanics'
        },
        {
          id: 'space-combat',
          icon: 'fa-solid fa-rocket',
          title: 'Space Combat',
          description: 'Ship combat, initiative, role priority'
        },
        {
          id: 'presets',
          icon: 'fa-solid fa-file-import',
          title: 'Presets',
          description: 'Load, apply, and export ruleset presets'
        }
      ]
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelectorAll('.houserule-menu-button').forEach((button) =>
      button.addEventListener('click', (ev) =>
        this._onOpenMenu(ev).catch((err) => {
          console.error('SWSE | Failed to open houserule menu:', err);
          ui.notifications.error('Failed to open menu. See console.');
        })
      )
    );
  }

  /**
   * Dispatcher for opening specific sub-menus.
   */
  async _onOpenMenu(event) {
    if (!game.user.isGM) {
      ui.notifications.warn('Only GMs may configure houserules.');
      return;
    }

    const menuId = event.currentTarget.dataset.menu;

    // More maintainable lookup table
    const menuMap = {
      'character-creation': CharacterCreationMenu,
      'character-restrictions': CharacterRestrictionsMenu,
      'skills-feats': SkillsFeatsMenu,
      advancement: AdvancementMenu,
      combat: CombatMenu,
      force: ForceMenu,
      'space-combat': SpaceCombatMenu,
      presets: PresetsMenu
    };

    const MenuClass = menuMap[menuId];

    if (!MenuClass) {
      ui.notifications.error(`Unknown houserule menu: ${menuId}`);
      return;
    }

    new MenuClass().render(true);
  }

  /** FormApplication requirement (unused here) */
  async _updateObject(_event, _formData) {
    return;
  }

  /** Explicit cleanup (helps on V13+ when app is re-rendered repeatedly) */
  close(options) {
    return super.close(options);
  }
}

/* -------------------------------------------------------------------------- */
/*                       REGISTER MENU IN FOUNDRY SETTINGS                    */
/* -------------------------------------------------------------------------- */

Hooks.once('ready', () => {
  game.settings.registerMenu('foundryvtt-swse', 'houserulesConfig', {
    name: 'House Rules Configuration',
    label: 'Configure House Rules',
    hint: 'Open the unified configuration menu for all SWSE houserules.',
    icon: 'fa-solid fa-cog',
    type: HouserulesConfig,
    restricted: true
  });
});
