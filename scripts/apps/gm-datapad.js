/**
 * GM Datapad (ApplicationV2)
 *
 * Consolidated GM operations hub using the same shell architecture as actor datapads.
 * Single window with internal routing to different pages:
 * - Home (app cards)
 * - Bulletin (party/player notices)
 * - House Rules (rule configuration)
 * - Store (governance dashboard)
 * - Approvals (droid/custom approvals)
 * - Workspace (GM-owned actors)
 *
 * Architecture: internal page routing, NOT multiple embedded ApplicationV2 windows
 * Styling: reuses .swse-datapad/.swse-screen patterns
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class GMDatapad extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: 'gm-datapad',
    tag: 'section',
    window: {
      title: 'GM Datapad',
      width: 1200,
      height: 800,
      resizable: true
    },
    classes: ['swse', 'gm-datapad', 'swse-datapad-container'],
    tabs: [
      {
        navSelector: '.gm-datapad-nav',
        contentSelector: '.gm-datapad-content',
        initial: 'home'
      }
    ]
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/gm-datapad.hbs'
    }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  constructor(options = {}) {
    super(options);
    this.currentPage = 'home';
    this.pageData = {};
    this.NS = 'foundryvtt-swse';
  }

  async _prepareContext(options) {
    // GM-only access
    if (!game.user?.isGM) {
      throw new Error('GM Datapad is restricted to Game Masters.');
    }

    const context = await super._prepareContext(options);

    // Load page-specific data based on current page
    const pageContext = await this._loadPageContext(this.currentPage);

    return foundry.utils.mergeObject(context, {
      currentPage: this.currentPage,
      apps: this._getAppCards(),
      ...pageContext
    });
  }

  /**
   * Load context for the current page
   */
  async _loadPageContext(pageId) {
    switch (pageId) {
      case 'home':
        return this._loadHomeContext();
      case 'bulletin':
        return this._loadBulletinContext();
      case 'house-rules':
        return this._loadHouseRulesContext();
      case 'store':
        return this._loadStoreContext();
      case 'approvals':
        return this._loadApprovalsContext();
      case 'workspace':
        return this._loadWorkspaceContext();
      default:
        return {};
    }
  }

  /**
   * Home page: app cards
   */
  async _loadHomeContext() {
    return {
      pageTitle: 'GM Operations',
      pageDescription: 'Master control for store, rules, approvals, and party management'
    };
  }

  /**
   * Bulletin page: party/player notices
   * Phase 2 will back this with journals/flags
   */
  async _loadBulletinContext() {
    return {
      pageTitle: 'Bulletin',
      pageDescription: 'Party and player notices',
      partyBulletin: {
        lastSession: 'Not yet configured',
        currentSituation: 'Not yet configured',
        currentLocation: 'Not yet configured'
      },
      playerBulletins: []
    };
  }

  /**
   * House Rules page: rule configuration
   * Will reuse HouseRuleService in Phase 2
   */
  async _loadHouseRulesContext() {
    return {
      pageTitle: 'House Rules',
      pageDescription: 'Game rule modifications',
      migrationTarget: 'HouseRuleService (Phase 2)',
      placeholder: true
    };
  }

  /**
   * Store page: governance dashboard
   * Will migrate GMStoreDashboard content in Phase 2
   */
  async _loadStoreContext() {
    return {
      pageTitle: 'Store',
      pageDescription: 'Store governance and approvals',
      migrationTarget: 'GMStoreDashboard (Phase 2)',
      placeholder: true
    };
  }

  /**
   * Approvals page: droid, store, and custom approvals
   * Will migrate GMDroidApprovalDashboard content in Phase 2
   */
  async _loadApprovalsContext() {
    return {
      pageTitle: 'Approvals',
      pageDescription: 'Pending droid and store approvals',
      migrationTarget: 'GMDroidApprovalDashboard (Phase 2)',
      placeholder: true
    };
  }

  /**
   * Workspace page: GM-owned actor access
   * Future: quick-open sheets, pinned actors, active cast
   */
  async _loadWorkspaceContext() {
    const gmActors = game.actors.filter(a => a.isOwner);
    return {
      pageTitle: 'Workspace',
      pageDescription: 'GM-owned actor access',
      gmActors: gmActors.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        img: a.img
      }))
    };
  }

  /**
   * Get app card definitions for home page
   */
  _getAppCards() {
    return [
      {
        id: 'bulletin',
        label: 'Bulletin',
        icon: 'fa-solid fa-newspaper',
        description: 'Party and player notices'
      },
      {
        id: 'house-rules',
        label: 'House Rules',
        icon: 'fa-solid fa-book',
        description: 'Game rule modifications'
      },
      {
        id: 'store',
        label: 'Store',
        icon: 'fa-solid fa-store',
        description: 'Store governance'
      },
      {
        id: 'approvals',
        label: 'Approvals',
        icon: 'fa-solid fa-check-circle',
        description: 'Pending approvals'
      },
      {
        id: 'workspace',
        label: 'Workspace',
        icon: 'fa-solid fa-users',
        description: 'GM actor access'
      }
    ];
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Wire app card clicks
    root.querySelectorAll('[data-app-card]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const appId = ev.currentTarget.dataset.appCard;
        this._navigateTo(appId);
      });
    });

    // Wire nav buttons
    root.querySelectorAll('[data-nav-to]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const pageId = ev.currentTarget.dataset.navTo;
        this._navigateTo(pageId);
      });
    });

    // Wire workspace actor clicks
    root.querySelectorAll('[data-open-actor]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const actorId = ev.currentTarget.dataset.openActor;
        const actor = game.actors.get(actorId);
        if (actor) {
          actor.sheet.render(true);
        }
      });
    });
  }

  /**
   * Navigate to a different page within the datapad
   */
  async _navigateTo(pageId) {
    SWSELogger.log(`[GM Datapad] Navigating to: ${pageId}`);
    this.currentPage = pageId;
    await this.render(false);
  }
}

export default GMDatapad;
