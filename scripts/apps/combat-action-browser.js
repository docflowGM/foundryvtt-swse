/**
 * SWSE Combat Action Browser
 * -----------------------------------------
 * - Opens from Sidebar (⚔️ button)
 * - Opens from Token HUD button
 * - Two tabs: Character | Vehicle
 * - Search + Filter
 * - Greyed-out unavailable actions with tooltip
 * - Auto-roll integration
 * - Favorites (pinned actions)
 */

import { CombatActionsMapper } from '../combat/utils/combat-actions-mapper.js';
import { SWSERoll } from '../combat/rolls/enhanced-rolls.js';
import { SWSECombat } from '../combat/systems/enhanced-combat-system.js';
import SWSEApplication from './base/swse-application.js';

export class SWSECombatActionBrowser extends SWSEApplication {

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEApplication.DEFAULT_OPTIONS ?? {},
    {
      id: 'swse-combat-action-browser',
      classes: ['swse', 'swse-action-browser'],
      template: 'systems/foundryvtt-swse/templates/apps/combat-action-browser.hbs',
      position: { width: 700, height: 600 },
      resizable: true,
      title: 'Combat Actions'
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

/* ------------------------------- */
  /* Initialization                   */
  /* ------------------------------- */

  static init() {
    this._addSidebarButton();
    this._addHUDButtonHook();
  }

  static _addSidebarButton() {
    Hooks.on('renderSidebar', () => {
      const sidebar = document.querySelector('#sidebar-tabs');
      if (!sidebar) {return;}

      if (sidebar.querySelector('.swse-action-browser-tab')) {return;}

      const btn = document.createElement('li');
      btn.classList.add('swse-action-browser-tab');
      btn.innerHTML = `<i class="fa-solid fa-crossed-swords"></i>`;
      btn.title = 'Combat Action Browser';
      btn.addEventListener('click', () => {
        new SWSECombatActionBrowser().render(true);
      });
      sidebar.appendChild(btn);
    });
  }

  static _addHUDButtonHook() {
    Hooks.on('renderTokenHUD', (hud, html) => {
      // Convert to DOM element if needed (v13 compatibility)
      const hudElement = html instanceof HTMLElement ? html : html[0];
      if (!hudElement) {return;}

      const btn = document.createElement('div');
      btn.classList.add('control-icon', 'swse-action-hud');
      btn.innerHTML = `<i class="fa-solid fa-crossed-swords"></i>`;
      btn.title = 'Open Combat Action Browser';

      btn.addEventListener('click', () => {
        new SWSECombatActionBrowser().render(true);
      });

      const colRight = hudElement.querySelector('.col.right');
      if (colRight) {
        colRight.appendChild(btn);
      }
    });
  }

  /* ------------------------------- */
  /* Application Rendering            */
  /* ------------------------------- */

  async _prepareContext(options) {
    await CombatActionsMapper.init();

    const selectedActor = canvas.tokens.controlled[0]?.actor ?? null;

    const data = {
      actor: selectedActor,
      tabs: ['character', 'vehicle'],
      currentTab: this.currentTab ?? 'character',
      character: this._getCharacterActions(selectedActor),
      vehicle: this._getVehicleActions(selectedActor),
      search: this.searchQuery ?? ''
    };

    return data;
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelectorAll('.swse-action-tab').forEach(el => {
      el.addEventListener('click', ev => {
        this.currentTab = ev.currentTarget.dataset.tab;
        this.render();
      });
    });

    const searchInput = root.querySelector('.swse-action-search');
    if (searchInput) {
      searchInput.addEventListener('keyup', ev => {
        this.searchQuery = ev.target.value.toLowerCase();
        this.render();
      });
    }

    root.querySelectorAll('.swse-action-fav').forEach(el => {
      el.addEventListener('click', ev => {
        const key = ev.currentTarget.dataset.key;
        this._toggleFavorite(key);
        this.render();
      });
    });

    root.querySelectorAll('.swse-action-exec').forEach(el => {
      el.addEventListener('click', ev => {
        const key = ev.currentTarget.dataset.key;
        const type = ev.currentTarget.dataset.actionType;
        this._executeAction(key, type);
      });
    });
  }

  /* ------------------------------- */
  /* Data Preparation                 */
  /* ------------------------------- */

  _getCharacterActions(actor) {
    if (!actor) {return { favorites: [], groups: {} };}

    const all = CombatActionsMapper.getAllActionsBySkill();
    const favoriteKeys = this._getFavorites(actor);

    const groups = {};
    const favs = [];

    for (const [skill, { combatActions, extraUses }] of Object.entries(all)) {
      const combined = [...combatActions, ...extraUses].map(a =>
        this._prepareDisplayAction(a, actor)
      );

      for (const action of combined) {
        if (!this._passesSearch(action)) {continue;}

        if (favoriteKeys.includes(action.key)) {favs.push(action);}

        if (!groups[skill]) {groups[skill] = [];}
        groups[skill].push(action);
      }
    }

    return { favorites: favs, groups };
  }

  _getVehicleActions(actor) {
    if (!actor || actor.type !== 'vehicle') {return { favorites: [], groups: {} };}

    const roles = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander', 'system operator'];

    const favoriteKeys = this._getFavorites(actor);
    const groups = {};
    const favs = [];

    for (const role of roles) {
      const actions = CombatActionsMapper.getActionsForCrewPosition(role);
      if (!actions.length) {continue;}

      groups[role] = actions
        .map(a => this._prepareDisplayAction(a, actor))
        .filter(a => this._passesSearch(a));

      for (const a of groups[role]) {
        if (favoriteKeys.includes(a.key)) {favs.push(a);}
      }
    }

    return { favorites: favs, groups };
  }

  _prepareDisplayAction(action, actor) {
    const enh = CombatActionsMapper.getEnhancementsForAction(action.key, actor);
    const canUse = this._canActorUseAction(actor, action);

    return {
      ...action,
      canUse,
      disabled: !canUse,
      tooltip: canUse ? '' : this._explainWhyCantUse(actor, action),
      enhancements: enh,
      hasEnhancements: enh.length > 0,
      isFavorite: this._getFavorites(actor).includes(action.key)
    };
  }

  _passesSearch(action) {
    if (!this.searchQuery) {return true;}
    return action.name.toLowerCase().includes(this.searchQuery);
  }

  /* ------------------------------- */
  /* Favorites                       */
  /* ------------------------------- */

  _getFavorites(actor) {
    return actor.getFlag('foundryvtt-swse', 'pinnedActions') ?? [];
  }

  async _toggleFavorite(key) {
    const actor = canvas.tokens.controlled[0]?.actor;
    if (!actor) {return;}

    const favs = new Set(this._getFavorites(actor));
    if (favs.has(key)) {favs.delete(key);} else {favs.add(key);}

    await actor.setFlag('foundryvtt-swse', 'pinnedActions', [...favs]);
  }

  /* ------------------------------- */
  /* Action Execution                 */
  /* ------------------------------- */

  async _executeAction(key, actionType) {
    const actor = canvas.tokens.controlled[0]?.actor;
    if (!actor) {return ui.notifications.warn('No actor selected.');}

    Hooks.callAll('swse.preCombatActionExecute', { actor, key, actionType });

    if (actionType === 'skill') {
      await SWSERoll.rollSkill(actor, key);
    } else if (actionType === 'attack') {
      const weapon = actor.items.find(i => i.type === 'weapon' && i.system.key === key);
      if (!weapon) {return ui.notifications.warn('Weapon not found.');}
      await SWSECombat.rollAttack(actor, weapon);
    } else if (actionType === 'vehicle') {
      const vehicle = actor;
      const target = [...game.user.targets][0]?.actor ?? null;
      if (!target) {return ui.notifications.warn('No target selected.');}
      const weapon = vehicle.items.find(i => i.type === 'vehicle-weapon' && i.system.key === key);
      await SWSECombat.rollAttack(vehicle, weapon, target);
    }

    // Grapple, Feint, Bull Rush, custom:
    else if (actionType === 'custom') {
      Hooks.callAll('swse.executeCustomAction', { actor, actionKey: key });
    }

    Hooks.callAll('swse.postCombatActionExecute', { actor, key, actionType });
  }

  /* ------------------------------- */
  /* Action Qualification             */
  /* ------------------------------- */

  _canActorUseAction(actor, action) {
    if (actor.type === 'vehicle' && action.crewPosition) {
      const role = actor.system?.crewRole?.toLowerCase();
      return role === action.crewPosition.toLowerCase() || action.crewPosition === 'any';
    }

    return true; // Expand later with prereqs
  }

  _explainWhyCantUse(actor, action) {
    if (actor.type === 'vehicle' && action.crewPosition) {
      return `Requires crew role: ${action.crewPosition}`;
    }

    return 'Prerequisites not met.';
  }

  /**
   * Get display name for a skill key
   * @param {string} skill - The skill key
   * @returns {string} Display name
   */
  _getSkillDisplayName(skill) {
    // Map skill keys to display names
    const skillNames = {
      'acrobatics': 'Acrobatics',
      'athletics': 'Athletics',
      'deception': 'Deception',
      'initiative': 'Initiative',
      'insight': 'Insight',
      'medicine': 'Medicine',
      'perception': 'Perception',
      'sleight-of-hand': 'Sleight of Hand',
      'stealth': 'Stealth',
      'survival': 'Survival',
      'armor-proficiency': 'Armor Proficiency',
      'weapon-proficiency': 'Weapon Proficiency',
      'other-skills': 'Other Skills'
    };

    return skillNames[skill] || skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
  }
}

window.SWSECombatActionBrowser = SWSECombatActionBrowser;
