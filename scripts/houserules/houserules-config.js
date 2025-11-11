/**
 * Houserules Configuration Application
 * Main UI for accessing all houserule menus
 */

import { CharacterCreationMenu } from './houserule-menus.js';
import { AdvancementMenu } from './houserule-menus.js';
import { CombatMenu } from './houserule-menus.js';
import { ForceMenu } from './houserule-menus.js';
import { SkillsFeatsMenu } from './houserule-menus.js';
import { SpaceCombatMenu } from './houserule-menus.js';
import { PresetsMenu } from './houserule-menus.js';

/* Upgraded to FormApplication for Foundry compatibility */
export class HouserulesConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-houserules-config",
      title: "SWSE House Rules Configuration",
      template: "systems/swse/templates/apps/houserules/houserules-config.hbs",
      width: 700,
      height: 600,
      resizable: true
    });
  }
  
  getData() {
    return {
      isGM: game.user.isGM,
      menus: [
        {
          id: "character-creation",
          icon: "fas fa-user-plus",
          title: "Character Creation",
          description: "Ability scores, hit points, and starting rules"
        },
        {
          id: "skills-feats",
          icon: "fas fa-dice-d20",
          title: "Skills & Feats",
          description: "Skill checks, feint mechanics, and feat variants"
        },
        {
          id: "advancement",
          icon: "fas fa-arrow-up",
          title: "Advancement",
          description: "Level up rules, talents, and retraining"
        },
        {
          id: "combat",
          icon: "fas fa-fist-raised",
          title: "Combat",
          description: "Death, damage, movement, and combat feats"
        },
        {
          id: "force",
          icon: "fas fa-hand-sparkles",
          title: "Force & Destiny",
          description: "Force powers, training, and destiny points"
        },
        {
          id: "space-combat",
          icon: "fas fa-rocket",
          title: "Space Combat",
          description: "Ship combat, initiative, and crew roles"
        },
        {
          id: "presets",
          icon: "fas fa-file-import",
          title: "Presets",
          description: "Load, save, and manage houserule presets"
        }
      ]
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('.houserule-menu-button').click(this._onOpenMenu.bind(this));
  }
  
  async _onOpenMenu(event) {
    const menuId = event.currentTarget.dataset.menu;
    
    switch (menuId) {
      case 'character-creation':
        new CharacterCreationMenu().render(true);
        break;
      case 'skills-feats':
        new SkillsFeatsMenu().render(true);
        break;
      case 'advancement':
        new AdvancementMenu().render(true);
        break;
      case 'combat':
        new CombatMenu().render(true);
        break;
      case 'force':
        new ForceMenu().render(true);
        break;
      case 'space-combat':
        new SpaceCombatMenu().render(true);
        break;
      case 'presets':
        new PresetsMenu().render(true);
        break;
    }
  }
}

// Register the config button in settings
Hooks.once('ready', () => {
  game.settings.registerMenu("swse", "houserulesConfig", {
    name: "House Rules Configuration",
    label: "Configure House Rules",
    hint: "Configure all SWSE house rules and variants",
    icon: "fas fa-cog",
    type: HouserulesConfig,
    restricted: true
  });
});
