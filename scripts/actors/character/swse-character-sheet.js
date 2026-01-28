//
// ============================================================
// SWSE Character Sheet (Modernized v13 Edition)
// Clean Rewrite (C1) — Structured, Maintains Spirit of Original
// ============================================================
//
// TABLE OF CONTENTS
//   A. Header & Init
//   B. Rendering & Scroll State
//   C. Data Preparation Engine
//   D. DOM Event Routing Engine (v13)
//   E. Dialog Engine (Species, Feat, Talent, Class, Human Bonus)
//   F. Roll Engine (Skills, Attacks, Damage, Force)
//   G. Combat Actions Engine
//   H. Feat Actions Engine
//   I. Talent Tree Engine
//   J. Force Suite & Power Engine
//   K. Drag & Drop / Compendium Import Engine
//   L. Utility Functions
// ============================================================

import { SWSEActorSheetBase } from "../../sheets/base-sheet.js";
import { SWSELogger } from '../../utils/logger.js';
import { debounce } from '../../utils/performance-utils.js';
import { CombatActionsMapper } from '../../combat/utils/combat-actions-mapper.js';
import { FeatActionsMapper } from '../../utils/feat-actions-mapper.js';
import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';
import { FeatSystem } from "../../engine/FeatSystem.js";
import { SkillSystem } from "../../engine/SkillSystem.js";
import { TalentAbilitiesEngine } from "../../engine/TalentAbilitiesEngine.js";
import { StarshipManeuversEngine } from "../../engine/StarshipManeuversEngine.js";
import { ClassNormalizer } from "../../progression/engine/class-normalizer.js";
import { SWSEGrappling } from "../../combat/systems/grappling-system.js";

export class SWSECharacterSheet extends SWSEActorSheetBase {

  /**
   * Prevent non-character actors from using this sheet
   * Vehicle, Droid, and NPC sheets should be used instead
   */
  static canUserUseSheet(user, sheet, actor) {
    // Only characters should use this sheet (not vehicle, droid, npc)
    if (actor?.type && actor.type !== "character") {
      return false;
    }
    return super.canUserUseSheet(user, sheet, actor);
  }

  // Debounced handler for defense input changes
  _debouncedDefenseChange = debounce(function() {
    this.actor.prepareData();
    this.render();
  }, 300);

  // ----------------------------------------------------------
  // B. Rendering & Scroll State
  // ----------------------------------------------------------

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'character'],
      template: 'systems/foundryvtt-swse/templates/actors/character/character-sheet.hbs',
      width: 800,
      height: 900,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      scrollY: ['.sheet-body', '.tab']
    });
  }

  async _render(force, options) {
    await super._render(force, options);
  }

  
  // ----------------------------------------------------------
  // C. Data Preparation Engine (Optimized)
  // ----------------------------------------------------------
  async getData() {
    const context = await super.getData();
    const actor = this.actor;
    const system = actor.system;

    // Add GM flag for template rendering
    context.isGM = game.user.isGM;

    // Check Force Sensitivity for UI display
    context.canUseTheForce = SkillSystem._canUseTheForce(this.actor);

    // Inject skill actions
    context.skillActions = await SkillSystem.buildSkillActions(this.actor);

    // PERFORMANCE: Single-pass item categorization (O(n) instead of O(n*k))
    const itemsByType = new Map();
    const itemsWithLowerNames = [];

    for (const item of actor.items) {
      const type = item.type;
      if (!itemsByType.has(type)) itemsByType.set(type, []);
      itemsByType.get(type).push(item);
      itemsWithLowerNames.push({ item, lowerName: item.name.toLowerCase() });
    }

    // Pre-compute commonly needed collections
    const feats = itemsByType.get("feat") || [];
    const talents = itemsByType.get("talent") || [];
    const allPowers = itemsByType.get("forcepower") || itemsByType.get("force-power") || [];
    const classes = itemsByType.get("class") || [];

    // Pre-compute lowercase names for feats to avoid repeated toLowerCase()
    const featsWithLowerNames = feats.map(f => ({ feat: f, lowerName: f.name.toLowerCase() }));

    // --------------------------------------
    // 1. FEATS: Force Secrets / Techniques
    // --------------------------------------
    context.forceSecrets = featsWithLowerNames
      .filter(f => f.lowerName.includes("force secret"))
      .map(f => f.feat);
    context.forceTechniques = featsWithLowerNames
      .filter(f => f.lowerName.includes("force technique"))
      .map(f => f.feat);

    // --------------------------------------
    // 1b. TALENTS: Lightsaber Forms
    // --------------------------------------
    context.lightsaberForms = talents.filter(t =>
      t.system?.talent_tree?.toLowerCase() === "lightsaber forms"
    );

    // --------------------------------------
    // 2. FORCE POWERS: Known vs Suite (use inSuite boolean on powers)
    // --------------------------------------
    context.activeSuite = allPowers.filter(p => p.system?.inSuite);
    context.knownPowers = allPowers.filter(p => !p.system?.inSuite);

    // --------------------------------------
    // 3. FORCE REROLL DICE
    // --------------------------------------
    const lvl = system.level || 1;
    const die = system.forcePoints?.diceType || "d6";
    context.forceRerollDice =
      lvl >= 15 ? `3${die} (take highest)` :
      lvl >= 8  ? `2${die} (take highest)` :
                  `1${die}`;

    // --------------------------------------
    // 4. DARK SIDE SCORE VISUALIZATION
    // --------------------------------------
    const wis = system.attributes?.wis?.total ?? 10;
    const mult = game.settings.get("foundryvtt-swse", "darkSideMaxMultiplier") || 1;
    const maxDS = Math.max(wis * mult, 1);
    const cur = system.darkSideScore || 0;

    context.darkSideMax = maxDS;
    context.hasForceSensitivity = actor.items.some(i =>
      i.type === 'feat' && (
        i.name.toLowerCase().includes('force sensitivity') ||
        i.name.toLowerCase() === 'force sensitive'
      )
    );
    context.darkInspirationEnabled = game.settings.get("foundryvtt-swse", "darkInspirationEnabled") || false;
    context.darkSideSegments = [];
    for (let i = 1; i <= maxDS; i++) {
      const t = (i - 1) / (maxDS - 1 || 1);
      const r = Math.round(t * 255);
      const b = Math.round((1 - t) * 255);
      context.darkSideSegments.push({
        index: i,
        color: `rgb(${r}, 0, ${b})`,
        active: i <= cur,
        isCurrent: i === cur
      });
    }

    // --------------------------------------
    // 5. COMBAT ACTIONS
    // --------------------------------------
    const bySkill = CombatActionsMapper.getAllActionsBySkill();
    const flat = [];

    for (const [skill, data] of Object.entries(bySkill)) {
      if (!data.combatActions) continue;
      data.combatActions.forEach(a => flat.push({ ...a, skill }));
    }

    flat.sort((a, b) => {
      const order = { swift: 0, move: 1, standard: 2, "full-round": 3 };
      const A = order[a.actionType?.toLowerCase()] ?? 99;
      const B = order[b.actionType?.toLowerCase()] ?? 99;
      return A - B || a.name.localeCompare(b.name);
    });

    context.combatActions = CombatActionsMapper.addEnhancementsToActions(flat, actor);

    // --------------------------------------
    // 6. FEAT ACTION STATES
    // --------------------------------------
    const rawFeatActions = FeatActionsMapper.getActionsByType(actor);
    const fx = actor.effects.filter(e => e.flags?.swse?.type === "feat-action");

    // Process each action category and build the all array
    context.featActions = { all: [] };
    const actionCategories = ["passive", "modifier", "swift", "standard", "fullRound", "reaction"];
    for (const cat of actionCategories) {
      if (!rawFeatActions[cat] || rawFeatActions[cat].length === 0) continue;
      context.featActions[cat] = rawFeatActions[cat].map(action => {
        const eff = fx.find(e => e.flags?.swse?.actionKey === action.key);
        const enriched = {
          ...action,
          toggled: !!eff,
          variableValue: eff?.flags?.swse?.variableValue || action.variableOptions?.min || 0,
          typeLabel: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1'),
          type: `type-${cat}`
        };
        context.featActions.all.push(enriched);
        return enriched;
      });
    }

    // --------------------------------------
    // 7. CLASS DISPLAY (classes already filtered above)
    // --------------------------------------
    context.chargenComplete = classes.length > 0;
    context.classDisplay = classes.length > 0
      ? classes.map(c => `${c.name} ${c.system.level || 1}`).join(" / ")
      : "No classes";
    context.displayedClasses = context.classDisplay; // Alias for HUD template

    // --------------------------------------
    // 8. TALENT ABILITIES (NEW)
    // --------------------------------------
    context.talentAbilities = TalentAbilitiesEngine.getAbilitiesForActor(actor);

    // --------------------------------------
    // 9. STARSHIP MANEUVERS
    // --------------------------------------
    const hasStartshipTactics = actor.items.some(item =>
      item.type === 'feat' &&
      (item.name === 'Starship Tactics' || item.name.includes('Starship Tactics'))
    );
    context.system.hasStartshipTactics = hasStartshipTactics;

    if (hasStartshipTactics) {
      context.starshipManeuvers = StarshipManeuversEngine.getManeuversForActor(actor);

      // Prepare suite data for suite management UI
      const allManeuvers = actor.items.filter(item => item.type === 'maneuver');
      const suiteIds = actor.system.starshipManeuverSuite?.maneuvers || [];

      context.starshipManeuvers.all = allManeuvers;
      context.activeSuite = allManeuvers.filter(m => suiteIds.includes(m.id));
    }

    // Calculate HP percentage for progress bar
    context.hpPercentage = system.hp?.max && system.hp?.max > 0
      ? Math.round((system.hp.value / system.hp.max) * 100)
      : 0;

    // --------------------------------------
    // 10. TALENT TREES (for Talents Tab)
    // --------------------------------------
    await this._prepareTalentTreesData(context, classes, talents);

    // --------------------------------------
    // 11. GRAPPLING STATE
    // --------------------------------------
    context.grappleState = this._getGrappleState();

    return context;
  }
// ----------------------------------------------------------
  // D. DOM Event Routing Engine (v13)
  // ----------------------------------------------------------

  activateListeners(html) {
    // Call super FIRST to set up base data-action handler and other core listeners
    super.activateListeners(html);

    // Prevent Enter key from triggering form submission on input fields
    html.find('input[type="text"], input[type="number"], textarea').on('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
      }
    });

    // Defense input debouncing
    html.find(".defense-input-sm, .defense-select-sm").change(ev => {
      this._debouncedDefenseChange.call(this);
    });

    // Ability score input changes - recalculate modifiers
    html.find(".ability-inputs input").change(ev => {
      this.actor.prepareData();
      this.render();
    });

    // ========== HEADER BUTTONS ==========
    html.find('.level-up').click(ev => this._onLevelUp(ev));
    html.find('.character-generator').click(ev => this._onCharacterGenerator(ev));
    html.find('.open-store').click(ev => this._onOpenStore(ev));
    html.find('.pick-species-btn').click(ev => this._onPickSpecies(ev));
    html.find('.add-class-btn').click(ev => this._onAddClass(ev));
    html.find('.talk-to-mentor').click(ev => this._onTalkToMentor(ev));

    // ========== CONDITION TRACK ==========
    html.find('.track-condition, .track-pip').click(ev => this._onConditionTrackClick(ev));
    html.find('.track-button.improve, .cond-btn.improve').click(ev => this._onRecoverCondition(ev));
    html.find('.track-button.worsen, .cond-btn.worsen').click(ev => this._onWorsenCondition(ev));

    // ========== PROGRESSION ENGINE BUTTONS ==========
    html.find('.roll-attributes-btn').click(ev => this._onRollAttributes(ev));

    // ========== FORCE TAB ACTIONS ==========
    html.find('.roll-force-point, .roll-fp').click(ev => this._onRollForcePoint(ev));
    html.find('[data-action="usePower"]').click(ev => this._onUsePower(ev));
    html.find('[data-action="regainForcePower"]').click(ev => this._onRegainForcePower(ev));
    html.find('[data-action="spendForcePoint"]').click(ev => this._onSpendForcePoint(ev));
    html.find('[data-action="addToSuite"]').filter('.force-power').click(ev => this._onAddToSuite(ev));
    html.find('[data-action="removeFromSuite"]').filter('.force-power').click(ev => this._onRemoveFromSuite(ev));
    html.find('[data-action="restForce"]').click(ev => this._onRestForce(ev));

    // ========== COMBAT TAB ACTIONS ==========
    html.find('[data-action="rollAttack"]').click(ev => this._onRollAttack(ev));
    html.find('[data-action="rollDamage"]').click(ev => this._onRollDamage(ev));
    html.find('[data-action="rollCombatAction"]').click(ev => this._onPostCombatAction(ev));

    // ========== GRAPPLING ACTIONS ==========
    html.find('[data-action="startGrapple"]').click(ev => this._onStartGrapple(ev));
    html.find('[data-action="continueGrapple"]').click(ev => this._onContinueGrapple(ev));
    html.find('[data-action="attemptPin"]').click(ev => this._onAttemptPin(ev));
    html.find('[data-action="escapeGrapple"]').click(ev => this._onEscapeGrapple(ev));

    // ========== TALENTS TAB ACTIONS ==========
    html.find('[data-action="toggleTree"]').click(ev => this._onToggleTree(ev));
    html.find('[data-action="selectTalent"]').click(ev => this._onSelectTalent(ev));
    html.find('[data-action="viewTalent"]').click(ev => this._onViewTalent(ev));
    html.find('[data-action="filterTalents"]').click(ev => this._onFilterTalents(ev));

    // ========== FEAT ACTIONS PANEL ==========
    // Feat actions now use data-action dispatcher in base-sheet.js
    // Legacy handlers removed - templates refactored to use data-action attributes

    // ========== TALENT ABILITIES PANEL ==========
    // Talent abilities now use data-action dispatcher in base-sheet.js
    // Legacy handlers removed - templates refactored to use data-action attributes

    // ========== STARSHIP MANEUVERS PANEL ==========
    html.find('.starship-maneuvers-section .ability-card-header').click(ev => this._onExpandAbilityCard(ev));
    html.find('.starship-maneuvers-section .ability-roll-btn').click(ev => this._onRollTalentAbility(ev));
    html.find('.starship-maneuvers-section .ability-toggle-btn').click(ev => this._onToggleTalentAbility(ev));
    html.find('.starship-maneuvers-section .ability-post-btn').click(ev => this._onPostTalentAbility(ev));
    html.find('.starship-maneuvers-section .ability-reset-btn').click(ev => this._onResetAbilityUses(ev));

    html.find('.maneuvers-rules-header').click(ev => {
      const header = $(ev.currentTarget);
      const content = header.next('.maneuvers-rules-content');
      content.slideToggle(200);
    });

    // Starship Maneuvers suite management (use class selectors to avoid Force suite conflicts)
    html.find('.starship-maneuvers-section .add-to-suite').click(ev => this._onAddManeuverToSuite(ev));
    html.find('.starship-maneuvers-section .remove-from-suite').click(ev => this._onRemoveManeuverFromSuite(ev));
    html.find('.use-maneuver').click(ev => this._onUseManeuver(ev));
    html.find('.regain-maneuver').click(ev => this._onRegainManeuver(ev));
    html.find('.rest-maneuvers').click(ev => this._onRestManeuvers(ev));

    // ========== SKILL SYSTEM EVENT LISTENERS ==========
    html.find(".roll-skill").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      this._onSkillRoll(skill);
    });

    html.find(".skill-action-roll").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      const action = ev.currentTarget.dataset.action;
      this._onSkillActionRoll(skill, action);
    });

    html.find(".skill-expand-btn").click(ev => {
      ev.preventDefault();
      const skill = ev.currentTarget.dataset.skill;
      this._toggleSkillPanel(skill);
    });

    html.find(".skill-action-card .card-header").click(ev => {
      ev.preventDefault();
      const card = $(ev.currentTarget).closest(".skill-action-card");
      this._toggleSkillActionCard(card);
    });

    // ========== COLLAPSIBLE SKILL USE SECTIONS ==========
    html.find(".collapsible-toggle").click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const category = $(ev.currentTarget).closest(".extra-uses-category");
      const content = category.find(".collapsible-content");

      if (content.hasClass("collapsed")) {
        content.removeClass("collapsed");
        category.addClass("expanded");
      } else {
        content.addClass("collapsed");
        category.removeClass("expanded");
      }
    });

    // ========== SKILL FILTER & SORT CONTROLS ==========
    html.find(".filter-btn").click(ev => {
      ev.preventDefault();
      const filterType = ev.currentTarget.dataset.filter;
      this._onSkillFilterChange(filterType, html);
    });

    html.find(".sort-select").change(ev => {
      ev.preventDefault();
      const sortType = ev.currentTarget.value;
      this._onSkillSortChange(sortType, html);
    });

    html.find(".skill-favorite-toggle").click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const skillKey = ev.currentTarget.dataset.skill;
      this._onToggleSkillFavorite(skillKey);
    });

    // ========== DESTINY SYSTEM EVENT LISTENERS ==========
    html.find(".fulfill-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onFulfillDestiny();
    });

    html.find(".reset-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onResetDestiny();
    });

    html.find(".enable-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onEnableDestiny();
    });

    html.find(".spend-destiny-btn").click(ev => {
      ev.preventDefault();
      this._onSpendDestinyPoint();
    });

    // ========== DARK SIDE POINTS HANDLERS ==========
    // Use event delegation for dark side buttons to ensure they work in all tabs
    html.on('click', '.reduce-dsp', (ev) => {
      ev.preventDefault();
      this._onReduceDSP();
    });

    html.on('click', '.increase-dsp', (ev) => {
      ev.preventDefault();
      this._onIncreaseDSP();
    });

    html.on('click', '.dark-inspiration', (ev) => {
      ev.preventDefault();
      this._onDarkInspiration();
    });

    // Dark side segment click - set DSP to the clicked segment
    html.on('click', '.dark-side-segment', (ev) => {
      ev.preventDefault();
      const segment = ev.currentTarget.dataset.segment;
      if (segment !== undefined) {
        this._onSetDarkSideScore(parseInt(segment, 10));
      }
    });

    // ========== FEAT VARIABLE SLIDER (uses change event, not click) ==========
    html.find(".feat-variable-slider").change(ev => this._onUpdateVariableAction(ev));

    // ========== IMPORT/EXPORT HANDLERS ==========
    html.find(".export-character-json-btn").click(ev => {
      ev.preventDefault();
      this._onExportCharacterJSON();
    });

    html.find(".export-template-btn").click(ev => {
      ev.preventDefault();
      this._onExportTemplate();
    });

    html.find(".import-character-btn").click(ev => {
      ev.preventDefault();
      this._onImportCharacter();
    });

    // ========== BIOGRAPHY TAB HANDLERS ==========
    html.find(".choose-background-btn").click(ev => {
      ev.preventDefault();
      this._onChooseBackground();
    });

    SWSELogger.log("SWSE | Character sheet listeners activated (all handlers wired)");
  }

  
  // ----------------------------------------------------------
  // E.0 Header Button Handlers
  // ----------------------------------------------------------
  async _onLevelUp(event) {
    event.preventDefault();
    // Open level up dialog using the static method from the compatibility shim
    try {
      const { SWSELevelUp } = await import('../../apps/swse-levelup.js');
      // Use the static openEnhanced method which handles validation and initialization
      await SWSELevelUp.openEnhanced(this.actor);
    } catch (err) {
      SWSELogger.error('Level up system error:', err);
      ui.notifications.error('Failed to open level up dialog');
    }
  }

  async _onCharacterGenerator(event) {
    event.preventDefault();
    // Open character generator using barrel export
    try {
      const { SWSECharacterGeneratorApp } = await import('../../apps/chargen.js');
      new SWSECharacterGeneratorApp(this.actor).render(true);
    } catch (err) {
      SWSELogger.error('Character generator error:', err);
      ui.notifications.error('Failed to open character generator');
    }
  }

  async _onOpenStore(event) {
    event.preventDefault();
    // Open marketplace/store
    try {
      const { SWSEStore } = await import('../../apps/store/store-main.js');
      new SWSEStore(this.actor).render(true);
    } catch (err) {
      SWSELogger.warn('Store system not available:', err);
      ui.notifications.warn('Store not loaded');
    }
  }

  async _onPickSpecies(event) {
    event.preventDefault();
    try {
      const { default: CharacterGeneratorImproved } = await import('../../apps/chargen-improved.js');
      const chargen = new CharacterGeneratorImproved(this.actor, {
        singleStepMode: true  // Close after selecting species
      });
      chargen.currentStep = 'species';
      chargen.render(true);
    } catch (err) {
      console.warn("Failed to open species selector chargen:", err);
      ui.notifications.error("Failed to open species selection. Please try again.");
    }
  }

  async _onAddClass(event) {
    event.preventDefault();
    try {
      const { default: CharacterGeneratorImproved } = await import('../../apps/chargen-improved.js');
      const chargen = new CharacterGeneratorImproved(this.actor, {
        singleStepMode: true  // Close after selecting class
      });
      chargen.currentStep = 'class';
      chargen.render(true);
    } catch (err) {
      console.warn("Failed to open class selector chargen:", err);
      ui.notifications.error("Failed to open class selection. Please try again.");
    }
  }

  async _onTalkToMentor(event) {
    event.preventDefault();
    // Open mentor chat dialog
    try {
      const { MentorChatDialog } = await import('../../apps/mentor-chat-dialog.js');
      MentorChatDialog.show(this.actor);
    } catch (err) {
      SWSELogger.error('Mentor chat dialog error:', err);
      ui.notifications.error('Failed to open mentor chat dialog');
    }
  }

  // ----------------------------------------------------------
  // Condition Track Handlers
  // ----------------------------------------------------------

  /**
   * Handle clicking on a condition track step
   */
  async _onConditionTrackClick(event) {
    event.preventDefault();
    const step = Number(event.currentTarget.dataset.step);
    await this.actor.update({ 'system.conditionTrack.current': step });
    ui.notifications.info(`Condition set to Step ${step}`);
  }

  /**
   * Handle recovering one condition step
   */
  async _onRecoverCondition(event) {
    event.preventDefault();
    const current = Math.max(0, this.actor.system.conditionTrack.current - 1);
    await this.actor.update({ 'system.conditionTrack.current': current });
  }

  /**
   * Handle worsening condition by one step
   */
  async _onWorsenCondition(event) {
    event.preventDefault();
    const max = 5; // Helpless is step 5
    const current = Math.min(max, this.actor.system.conditionTrack.current + 1);
    await this.actor.update({ 'system.conditionTrack.current': current });
  }

  // ----------------------------------------------------------
  // E. Dialog Engine (Streamlined v13 Model)
  // ----------------------------------------------------------

  /**
   * Universal helper to show a list-selection dialog.
   */
  async _showSelectionDialog(title, items, formatter, onSelect) {
    const rows = items.map((itm, idx) => `
      <div class="swse-option" data-key="${idx}">
        ${formatter(itm)}
      </div>`).join("");

    new Dialog({
      title,
      content: `<div class="swse-dialog-list">${rows}</div>`,
      buttons: {
        cancel: { label: "Cancel" }
      },
      render: html => {
        html[0].querySelectorAll(".swse-option").forEach(row => {
          row.addEventListener("click", evt => {
            const key = Number(row.dataset.key);
            onSelect(items[key]);
            const dlg = row.closest(".dialog");
            if (dlg) dlg.querySelector("button[data-button='cancel']").click();
          });
        });
      }
    }).render(true);
  }

  // ----------------------------------------------------------
  // E.1 Feat Picker (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _showFeatPicker() {
    const pack = game.packs.get('foundryvtt-swse.feats');
    if (!pack) return ui.notifications.error("Feat pack not found.");
    const docs = await pack.getDocuments();

    return this._showSelectionDialog(
      "Select Feat",
      docs,
      feat => `<strong>${feat.name}</strong><br><small>${feat.system.description ?? ""}</small>`,
      async feat => {
        // Use progression engine if available
        try {
          const { SWSEProgressionEngine } = await import('../../engine/progression.js');
          const engine = new SWSEProgressionEngine(this.actor, "chargen");

          // Get current feats from progression data
          const feats = engine.data.feats || [];
          if (!feats.includes(feat.name)) {
            feats.push(feat.name);
          }

          // Call the progression engine action
          await engine.doAction('confirmFeats', {
            featIds: feats
          });

          ui.notifications.info(`Added feat: ${feat.name}`);
        } catch (err) {
          // Fallback to old method if progression engine fails
          console.warn("Progression engine failed, using fallback:", err);
          ui.notifications.warn("Using fallback mode. Progression engine encountered an error.");
          await this.actor.createEmbeddedDocuments("Item", [feat.toObject()]);
          ui.notifications.info(`Added feat: ${feat.name}`);
        }
      }
    );
  }

  // ----------------------------------------------------------
  // E.2 Talent Picker (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _showTalentPicker() {
    const pack = game.packs.get('foundryvtt-swse.talents');
    if (!pack) return ui.notifications.error("Talents pack not found.");
    const docs = await pack.getDocuments();

    return this._showSelectionDialog(
      "Select Talent",
      docs,
      tal => `<strong>${tal.name}</strong><br><small>${tal.system.description ?? ""}</small>`,
      async tal => {
        // Use progression engine if available
        try {
          const { SWSEProgressionEngine } = await import('../../engine/progression.js');
          const engine = new SWSEProgressionEngine(this.actor, "chargen");

          // Get current talents from progression data
          const talents = engine.data.talents || [];
          if (!talents.includes(tal.name)) {
            talents.push(tal.name);
          }

          // Call the progression engine action
          await engine.doAction('confirmTalents', {
            talentIds: talents
          });

          ui.notifications.info(`Added talent: ${tal.name}`);
        } catch (err) {
          // Fallback to old method if progression engine fails
          console.warn("Progression engine failed, using fallback:", err);
          await this.actor.createEmbeddedDocuments("Item", [tal.toObject()]);
          ui.notifications.info(`Added talent: ${tal.name}`);
        }
      }
    );
  }

  // ----------------------------------------------------------
  // E.3 & E.4 Species & Class Selection
  // (Now integrated into chargen with singleStepMode)
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // E.5 Human Bonus Feat & Skill
  // ----------------------------------------------------------
  async _showHumanBonusDialogs() {
    const { loadFeats } = await import('../apps/levelup/levelup-feats.js');
    const feats = await loadFeats(this.actor);

    await this._showSelectionDialog(
      "Human Bonus Feat",
      feats,
      f => `<strong>${f.name}</strong>`,
      async f => await this.actor.createEmbeddedDocuments("Item", [f])
    );

    const skills = Object.keys(this.actor.system.skills);
    await this._showSelectionDialog(
      "Human Bonus Skill",
      skills,
      sk => `<strong>${sk}</strong>`,
      async sk => {
        await this.actor.update({ [`system.skills.${sk}.trained`]: true });
        ui.notifications.info(`Trained in ${sk}`);
      }
    );
  }

  // ----------------------------------------------------------
  // E.5B Background Selection
  // (Now integrated into chargen with singleStepMode)
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // E.6 Roll Attributes (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _onRollAttributes(event) {
    event.preventDefault();

    try {
      // Open the character generator which has the progression engine UI
      // for attribute rolling and other selections
      // Use CharacterGeneratorImproved for full functionality (abilityMethod, pointBuyPool, etc.)
      const CharacterGeneratorImproved = (await import('../../apps/chargen-improved.js')).default;
      const chargen = new CharacterGeneratorImproved(this.actor);
      chargen.currentStep = 'abilities';
      chargen.render(true);

    } catch (err) {
      console.warn("Failed to open character generator:", err);
      ui.notifications.error("Failed to open attribute rolling interface. Please try again.");
    }
  }

  // ----------------------------------------------------------
  // E.7 Destiny Management
  // ----------------------------------------------------------

  async _onEnableDestiny() {
    await this.actor.update({ "system.destiny.hasDestiny": true });
    ui.notifications.info("Destiny enabled for this character.");
  }

  async _onFulfillDestiny() {
    await this.actor.update({ "system.destiny.fulfilled": true });
    ui.notifications.info("Destiny fulfilled!");
  }

  async _onResetDestiny() {
    await this.actor.update({ "system.destiny.fulfilled": false });
    ui.notifications.info("Destiny reset to active.");
  }

  async _onSpendDestinyPoint() {
    const { DestinySpendingDialog } = await import('../../apps/destiny-spending-dialog.js');
    DestinySpendingDialog.open(this.actor);
  }

  /**
   * Open reduce DSP dialog
   */
  async _onReduceDSP() {
    const actor = this.actor;
    const currentDSP = actor.system.darkSideScore || 0;

    if (currentDSP === 0) {
      ui.notifications.info("Your Dark Side Points are already at 0.");
      return;
    }

    const buttons = {
      free: {
        label: "Free",
        callback: () => {
          // Free option doesn't actually do anything - just close the dialog
          ui.notifications.info("You have chosen not to reduce your Dark Side Points.");
        }
      },
      dramatic: {
        label: "Dramatic Heroism",
        callback: () => {
          actor.update({ "system.darkSideScore": 1 });
          ui.notifications.info("Through dramatic heroism, you've reduced your Dark Side corruption to 1!");
        }
      },
      atonement: {
        label: "Atonement (1 Force Point)",
        callback: async () => {
          const fpData = actor.system.forcePoints || {};
          const fpValue = fpData.value || 0;

          if (fpValue <= 0) {
            ui.notifications.warn("You don't have a Force Point to spend for atonement.");
            return;
          }

          // Reduce DSP by 1 and spend a force point
          const newDSP = Math.max(currentDSP - 1, 0);
          await actor.update({
            "system.darkSideScore": newDSP,
            "system.forcePoints.value": fpValue - 1
          });
          ui.notifications.info("Through atonement, you've reduced your Dark Side Points and spent a Force Point.");
        }
      }
    };

    new Dialog({
      title: "Reduce Dark Side Points",
      content: `<p>How would you like to reduce your Dark Side Points?</p>
                <p><strong>Current DSP:</strong> ${currentDSP}</p>`,
      buttons,
      default: "free"
    }).render(true);
  }

  /**
   * Increase DSP by 1
   */
  async _onIncreaseDSP() {
    const actor = this.actor;
    const system = actor.system;
    const wis = system.attributes?.wis?.total ?? 10;
    const mult = game.settings.get("foundryvtt-swse", "darkSideMaxMultiplier") || 1;
    const maxDS = Math.max(wis * mult, 1);
    const currentDSP = system.darkSideScore || 0;

    if (currentDSP >= maxDS) {
      ui.notifications.warn(`You are already at maximum Dark Side corruption (${maxDS}/${maxDS}).`);
      return;
    }

    await actor.update({ "system.darkSideScore": currentDSP + 1 });
    ui.notifications.info(`Dark Side Points increased to ${currentDSP + 1}.`);
  }

  /**
   * Set DSP to a specific value (from clicking dark side segment)
   * @param {number} value - The target dark side score
   */
  async _onSetDarkSideScore(value) {
    const actor = this.actor;
    const system = actor.system;
    const wis = system.attributes?.wis?.total ?? 10;
    const mult = game.settings.get("foundryvtt-swse", "darkSideMaxMultiplier") || 1;
    const maxDS = Math.max(wis * mult, 1);

    // Clamp value between 0 and max
    const newDSP = Math.max(0, Math.min(value, maxDS));
    const currentDSP = system.darkSideScore || 0;

    if (newDSP === currentDSP) return; // No change

    await actor.update({ "system.darkSideScore": newDSP });
    ui.notifications.info(`Dark Side Points set to ${newDSP}.`);
  }

  /**
   * Open dark inspiration dialog showing dark side force powers
   */
  async _onDarkInspiration() {
    const actor = this.actor;

    // Get all force powers with "dark side" descriptor
    const darkSidePowers = actor.items.filter(item => {
      if (item.type !== 'forcepower') return false;
      const desc = (item.system.descriptors || "").toLowerCase();
      return desc.includes('dark side');
    });

    if (darkSidePowers.length === 0) {
      ui.notifications.info("There are no Dark Side Force Powers available.");
      return;
    }

    // Build the dialog content
    const powerRows = darkSidePowers.map((power, idx) => `
      <div class="swse-option dark-power-option" data-power-id="${power.id}" data-power-index="${idx}">
        <strong>${power.name}</strong><br/>
        <small>${power.system.descriptors || 'Force Power'}</small>
      </div>
    `).join("");

    const dialog = new Dialog({
      title: "Dark Inspiration - Select a Dark Side Power",
      content: `<div class="swse-dialog-list dark-powers-list">${powerRows}</div>`,
      buttons: {
        cancel: { label: "Cancel" }
      },
      default: "cancel"
    });

    // Attach click handlers after rendering
    dialog.render(true);

    dialog._element?.on('click', '.dark-power-option', async (ev) => {
      ev.preventDefault();
      const powerId = ev.currentTarget.dataset.powerId;
      const power = actor.items.get(powerId);

      if (!power) return;

      // Post announcement to chat
      const announcement = await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="dark-inspiration-announcement"><p><strong>${actor.name}</strong> embraced the dark side and uses <strong>${power.name}</strong>...</p></div>`,
        type: CONST.CHAT_MESSAGE_TYPES.OOC
      });

      // Cast the power (use it as if the character knows it)
      const { ForceEnhancementDialog } = await import('../../utils/force-enhancement-dialog.js');
      const { SWSERoll } = await import('../../combat/rolls/enhanced-rolls.js');

      // Check for enhancements/techniques
      const enhancements = await ForceEnhancementDialog.checkAndPrompt(actor, power);

      // Roll the power usage
      await SWSERoll.rollUseTheForce(actor, power, enhancements);

      // Increase DSP by 1
      const currentDSP = actor.system.darkSideScore || 0;
      await actor.update({ "system.darkSideScore": currentDSP + 1 });

      ui.notifications.info(`You've used Dark Inspiration to cast ${power.name} and increased your Dark Side Points!`);

      dialog.close();
    });
  }

  /**
   * Export character data to JSON file
   */
  /**
   * Helper method to download a file using modern File System Access API with fallback
   * @param {string} content - The file content
   * @param {string} filename - The suggested filename
   * @param {string} mimeType - The MIME type (e.g., 'application/json')
   * @returns {Promise<boolean>} - Whether the download was successful
   */
  async _downloadFile(content, filename, mimeType = 'application/json') {
    // Try modern File System Access API first (provides native save dialog)
    if ('showSaveFilePicker' in window) {
      try {
        const extension = filename.split('.').pop() || 'json';
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: `${extension.toUpperCase()} Files`,
            accept: { [mimeType]: [`.${extension}`] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled the save dialog
          return false;
        }
        // Fall through to blob download on other errors
        console.warn('File System Access API failed, using fallback download', err);
      }
    }

    // Fallback: Use data URI for direct download (more reliable than blob URLs)
    try {
      const link = document.createElement('a');
      // Use base64 data URI which works more reliably across browsers
      const base64 = btoa(unescape(encodeURIComponent(content)));
      link.href = `data:${mimeType};base64,${base64}`;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (err) {
      console.error('Data URI download failed:', err);
      // Last resort: blob URL
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }
  }

  async _onExportCharacterJSON() {
    try {
      // Get complete actor data including all embedded items
      const actorData = this.actor.toObject();

      // Create a clean export object
      const exportData = {
        name: actorData.name,
        type: actorData.type,
        img: actorData.img,
        system: actorData.system,
        items: actorData.items,
        effects: actorData.effects,
        flags: actorData.flags,
        exportedAt: new Date().toISOString(),
        exportedBy: game.user.name,
        systemVersion: game.system.version
      };

      // Convert to JSON string with nice formatting
      const jsonString = JSON.stringify(exportData, null, 2);

      // Generate filename with character name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const safeName = actorData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeName}_${timestamp}.json`;

      // Download using improved method
      const success = await this._downloadFile(jsonString, filename, 'application/json');
      if (success) {
        ui.notifications.info(`Exported ${actorData.name} to JSON`);
      }
    } catch (error) {
      console.error("Error exporting character:", error);
      ui.notifications.error("Failed to export character. See console for details.");
    }
  }

  /**
   * Export a blank character template
   */
  async _onExportTemplate() {
    try {
      // Create a template with all fields but minimal/example data
      const template = {
        name: "Character Name",
        type: "character",
        img: "icons/svg/mystery-man.svg",
        system: {
          level: 1,
          race: "Human",
          size: "Medium",
          forceSensitive: false,
          biography: "Character background and description",
          attributes: {
            str: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 },
            dex: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 },
            con: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 },
            int: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 },
            wis: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 },
            cha: { base: 10, racial: 0, enhancement: 0, temp: 0, total: 10, mod: 0 }
          },
          hp: {
            value: 30,
            max: 30,
            temp: 0
          },
          forcePoints: {
            value: 5,
            max: 5,
            diceType: "d6"
          },
          destinyPoints: {
            value: 1,
            max: 1
          },
          conditionTrack: {
            current: 0,
            penalty: 0,
            persistent: 0
          },
          destiny: {
            hasDestiny: false,
            type: "",
            fulfilled: false,
            secret: ""
          },
          darkSideScore: 0
        },
        items: [],
        effects: [],
        flags: {},
        _instructions: {
          description: "SWSE Character Template",
          usage: "Fill in the fields above with your character information, then import this file using the Import button in the Import/Export tab.",
          fields: {
            name: "Your character's name",
            type: "Must be 'character', 'npc', 'vehicle', or 'droid'",
            img: "Path to character portrait image",
            "system.level": "Character level (1-20)",
            "system.race": "Character species/race",
            "system.attributes": "Ability scores - modify the 'base' values, totals will be calculated",
            "system.hp": "Hit points",
            "system.forcePoints": "Force points (if applicable)",
            items: "Array of item objects (classes, feats, talents, equipment, etc.)",
            effects: "Array of active effect objects",
            flags: "Additional system-specific data"
          }
        }
      };

      // Convert to JSON string with nice formatting
      const jsonString = JSON.stringify(template, null, 2);

      // Download using improved method
      const success = await this._downloadFile(jsonString, 'swse_character_template.json', 'application/json');
      if (success) {
        ui.notifications.info('Character template downloaded');
      }
    } catch (error) {
      console.error("Error exporting template:", error);
      ui.notifications.error("Failed to export template. See console for details.");
    }
  }

  /**
   * Open the character import wizard
   */
  async _onImportCharacter() {
    try {
      const { CharacterImportWizard } = await import('../../apps/character-import-wizard.js');
      CharacterImportWizard.open();
    } catch (error) {
      console.error("Error opening import wizard:", error);
      ui.notifications.error("Failed to open import wizard. See console for details.");
    }
  }

  /**
   * Open background selection dialog
   * Opens the character generator with the background step pre-selected
   */
  async _onChooseBackground() {
    try {
      const CharacterGeneratorImproved = (await import('../../apps/chargen-improved.js')).default;
      const chargen = new CharacterGeneratorImproved(this.actor, {
        singleStepMode: true  // Close after selecting background
      });
      chargen.currentStep = 'background';
      chargen.render(true);
    } catch (err) {
      console.warn("Failed to open background selector:", err);
      ui.notifications.error("Failed to open background selection. Please try again.");
    }
  }


  // ----------------------------------------------------------
  // F. Roll Engine (v13 Modernized)
  // ----------------------------------------------------------

  async _safeEvaluate(formula) {
    let roll = formula;
    if (typeof roll === "string") roll = new Roll(roll);
    await roll.evaluate({ async: true });
    return roll;
  }

  // Skill Roll
  async _rollSkill(skillKey, label="Skill Check") {
    const sk = this.actor.system.skills?.[skillKey];
    if (!sk) return ui.notifications.error(`Skill not found: ${skillKey}`);

    const roll = await this._safeEvaluate(`1d20 + ${sk.total}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label
    });
  }

  // Attack Roll
  async _onRollAttack(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return ui.notifications.error("Weapon not found.");

    // Use proper SWSERoll system with dialog to confirm bonuses and add modifiers
    return SWSERoll.rollAttack(this.actor, item, { showDialog: true });
  }

  // Damage Roll
  async _onRollDamage(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return ui.notifications.error("Weapon not found.");

    // Use proper SWSERoll system with dialog to confirm bonuses and add modifiers
    return SWSERoll.rollDamage(this.actor, item, { showDialog: true });
  }

  // Use the Force Roll
  async _onUsePower(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const power = this.actor.items.get(id);
    if (!power) return ui.notifications.error("Power not found.");

    // Use proper SWSERoll system for Force power activation
    return SWSERoll.rollUseTheForce(this.actor, power);
  }

  // Force Point Roll
  async _onRollForcePoint(evt) {
    // Read from DOM first to catch unsaved input, fallback to actor data
    const inputElement = this.element.find('input[name="system.forcePoints.value"]')[0];
    let fp = this.actor.system.forcePoints?.value || 0;

    if (inputElement && inputElement.value) {
      fp = parseInt(inputElement.value, 10) || fp;
    }

    if (fp <= 0) return ui.notifications.warn("No Force Points left.");

    const dieType = this.actor.system.forcePoints?.diceType || "d6";
    const lvl = this.actor.system.level || 1;
    const qty = lvl >= 15 ? 3 : lvl >= 8 ? 2 : 1;

    const roll = await this._safeEvaluate(`${qty}${dieType}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Force Point Roll"
    });

    await this.actor.update({ "system.forcePoints.value": fp - 1 });
  }


  
  // ----------------------------------------------------------
  // G. Combat Action Engine (Simplified)
  // ----------------------------------------------------------

  // Handler for data-action="rollCombatAction" (matches _onAction naming convention)
  async _onRollCombatAction(event) {
    return this._onPostCombatAction(event);
  }

  async _onPostCombatAction(evt) {
    evt.preventDefault();
    // Find the actual element with data-action-name (event.currentTarget may be the root listener)
    const actionElement = evt.target.closest('[data-action-name]');
    const el = actionElement || evt.currentTarget;
    const name = el.dataset.actionName;

    const data = CombatActionsMapper.getAllCombatActions();
    const action = data.find(a => a.name === name);
    if (!action) return ui.notifications.warn(`Action not found: ${name}`);

    // Special handling for grapple action - use the grappling system
    if (name.toLowerCase().includes("grapple") || name.toLowerCase().includes("grab")) {
      return this._onStartGrapple(evt);
    }

    const rollable = action.relatedSkills?.filter(r => r.dc?.type === "flat") || [];
    if (!rollable.length)
      return this._postCombatActionDescription(name, action);

    if (rollable.length === 1) {
      const rs = rollable[0];
      const key = this._getSkillKey(rs.skill);
      return SWSERoll.rollCombatActionCheck(this.actor, key, {
        name,
        actionType: action.action?.type,
        dc: rs.dc,
        outcome: rs.outcome
      });
    }

    return this._showSelectionDialog(
      `${name}: Choose Skill`,
      rollable,
      rs => `<strong>${rs.skill}</strong> — DC ${rs.dc.value}`,
      async rs => {
        const key = this._getSkillKey(rs.skill);
        return SWSERoll.rollCombatActionCheck(this.actor, key, {
          name,
          actionType: action.action?.type,
          dc: rs.dc,
          outcome: rs.outcome
        });
      }
    );
  }

  async _postCombatActionDescription(name, action) {
    const msg = `
      <div class="swse-combat-action">
        <h3>${name}</h3>
        <p>${action.notes ?? ""}</p>
      </div>
    `;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: msg });
  }

  // ----------------------------------------------------------
  // G.5 Grappling Engine
  // ----------------------------------------------------------

  /**
   * Get current grapple state for the character
   */
  _getGrappleState() {
    const grabbed = this.actor.effects.find(e => e.flags?.swse?.grapple === "grabbed");
    const grappled = this.actor.effects.find(e => e.flags?.swse?.grapple === "grappled");
    const pinned = this.actor.effects.find(e => e.flags?.swse?.grapple === "pinned");

    const hasPinFeat = this.actor.items.some(i =>
      i.type === "feat" && i.name.toLowerCase().includes("pin")
    );

    return {
      grabbed: !!grabbed,
      grappled: !!grappled,
      pinned: !!pinned,
      grappler: grabbed?.origin ? game.actors.get(grabbed.flags.swse.source)?.name : null,
      opponent: grappled?.origin ? game.actors.get(grappled.flags.swse.source)?.name : null,
      canPin: !!grappled && hasPinFeat
    };
  }

  /**
   * Get selected combat target, prompting user if none selected
   */
  async _getGrappleTarget() {
    if (canvas.tokens.controlled.length > 0) {
      const controlled = canvas.tokens.controlled[0];
      if (controlled.actor !== this.actor) {
        return controlled.actor;
      }
    }

    ui.notifications.warn("Please select a target token to grapple");
    return null;
  }

  /**
   * Start a grab attack (initiates RAW grappling sequence)
   */
  async _onStartGrapple(event) {
    event.preventDefault();
    const target = await this._getGrappleTarget();
    if (!target) return;

    await SWSEGrappling.attemptGrab(this.actor, target);
    this.render();
  }

  /**
   * Continue with grapple check (next round of grappling)
   */
  async _onContinueGrapple(event) {
    event.preventDefault();
    const target = await this._getGrappleTarget();
    if (!target) return;

    await SWSEGrappling.grappleCheck(this.actor, target);
    this.render();
  }

  /**
   * Attempt to pin opponent (requires Pin feat)
   */
  async _onAttemptPin(event) {
    event.preventDefault();
    const target = await this._getGrappleTarget();
    if (!target) return;

    const hasPinFeat = this.actor.items.some(i =>
      i.type === "feat" && i.name.toLowerCase().includes("pin")
    );

    if (!hasPinFeat) {
      ui.notifications.warn("Character lacks the Pin feat");
      return;
    }

    await SWSEGrappling.attemptPin(this.actor, target);
    this.render();
  }

  /**
   * Attempt to escape from a grapple
   */
  async _onEscapeGrapple(event) {
    event.preventDefault();
    const target = await this._getGrappleTarget();
    if (!target) return;

    await SWSEGrappling.escapeGrapple(this.actor, target);
    this.render();
  }


  // ----------------------------------------------------------
  // H. Feat Actions Engine
  // ----------------------------------------------------------

  async _onToggleFeatAction(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    if (!key) return;

    const updated = await FeatActionsMapper.toggleAction(this.actor, key);
    ui.notifications.info(updated ? "Feat Action Enabled" : "Feat Action Disabled");
    this.render();
  }

  async _onUpdateVariableAction(event) {
    event.preventDefault();

    const key = event.currentTarget.dataset.key;
    const value = Number(event.currentTarget.value);
    if (!key) return;

    // Update the displayed value next to the slider
    const wrapper = event.currentTarget.closest(".feat-variable-control");
    if (wrapper) {
      const out = wrapper.querySelector(".variable-value");
      if (out) out.textContent = value;
    }

    await FeatActionsMapper.updateVariableAction(this.actor, key, value);
  }

  async _onUseFeatAction(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.actionKey;

    const feats = FeatActionsMapper.getAllFeatActions();
    const f = feats[key];
    if (!f) return ui.notifications.error("Feat action missing.");

    const msg = `
      <div class="swse-feat-action">
        <h3><i class="fas fa-star"></i> ${f.name}</h3>
        <p><strong>Type:</strong> ${f.actionType}</p>
        ${f.trigger ? `<p><strong>Trigger:</strong> ${f.trigger}</p>` : ""}
        <p>${f.description || ""}</p>
        <p>${f.notes || ""}</p>
      </div>
    `;

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: msg
    });
  }


  // ----------------------------------------------------------
  // I.0 Talent Tree Data Preparation
  // ----------------------------------------------------------

  /**
   * Prepare talent trees data for the talents tab
   * @param {Object} context - The render context
   * @param {Array} classes - Array of class items on the actor
   * @param {Array} talents - Array of talent items the actor has acquired
   */
  async _prepareTalentTreesData(context, classes, talents) {
    try {
      // Get talent tree names from all classes using ClassNormalizer
      const treeNames = new Set();

      for (const cls of classes) {
        // Use ClassNormalizer to ensure consistent property access
        const normalizedClass = ClassNormalizer.normalizeClassDoc(cls);
        const classTrees = normalizedClass.system?.talentTrees
          || normalizedClass.system?.talent_trees
          || [];

        const treesArray = Array.isArray(classTrees) ? classTrees : [classTrees].filter(Boolean);
        treesArray.forEach(tree => {
          if (typeof tree === 'string' && tree.trim()) {
            treeNames.add(tree.trim());
          }
        });
      }

      // Debug log for troubleshooting
      SWSELogger.log(`[TALENT-TREES] Found ${treeNames.size} talent trees from ${classes.length} classes:`, Array.from(treeNames));

      // If no trees from actor's class items, try to load from compendium by class name
      if (treeNames.size === 0 && classes.length > 0) {
        const classPack = game.packs.get('foundryvtt-swse.classes');
        if (classPack) {
          for (const cls of classes) {
            try {
              // Find class in compendium by name
              const classIndex = classPack.index.find(c => c.name === cls.name);
              if (classIndex) {
                const fullClassDoc = await classPack.getDocument(classIndex._id);
                const normalizedClass = ClassNormalizer.normalizeClassDoc(fullClassDoc);
                const classTrees = normalizedClass.system?.talentTrees
                  || normalizedClass.system?.talent_trees
                  || [];

                const treesArray = Array.isArray(classTrees) ? classTrees : [classTrees].filter(Boolean);
                treesArray.forEach(tree => {
                  if (typeof tree === 'string' && tree.trim()) {
                    treeNames.add(tree.trim());
                  }
                });
              }
            } catch (err) {
              SWSELogger.warn(`[TALENT-TREES] Error loading class ${cls.name} from compendium:`, err);
            }
          }
          SWSELogger.log(`[TALENT-TREES] After compendium lookup: ${treeNames.size} talent trees`);
        }
      }

      // If still no trees, try to get trees from actor's acquired talents
      if (treeNames.size === 0 && talents.length > 0) {
        for (const talent of talents) {
          const tree = talent.system?.tree || talent.system?.talent_tree || talent.system?.talentTree;
          if (tree && typeof tree === 'string') {
            treeNames.add(tree.trim());
          }
        }
      }

      // Build talent tree filters for UI
      context.talentTreeFilters = Array.from(treeNames).map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        label: name
      }));

      // Build acquired talents list
      context.acquiredTalents = talents.map(t => ({
        _id: t.id,
        name: t.name,
        treeName: t.system?.tree || t.system?.talent_tree || 'Unknown',
        summary: t.system?.benefit || t.system?.description || ''
      }));

      // Calculate available talent selections
      const totalTalents = classes.reduce((sum, cls) => {
        const classLevel = cls.system?.level || 1;
        // Most classes get 1 talent at odd levels (1, 3, 5, 7, 9, etc.)
        return sum + Math.ceil(classLevel / 2);
      }, 0);
      context.availableTalentSelections = Math.max(0, totalTalents - talents.length);

      // Load talent tree compendium data for display
      const treePack = game.packs.get('foundryvtt-swse.talent_trees');
      const talentPack = game.packs.get('foundryvtt-swse.talents');

      context.talentTrees = [];

      if (treePack && talentPack) {
        const allCompendiumTalents = await talentPack.getDocuments();
        const acquiredTalentNames = new Set(talents.map(t => t.name.toLowerCase()));

        for (const treeName of treeNames) {
          // Find talents that belong to this tree
          const treeTalents = allCompendiumTalents.filter(t => {
            const talentTree = t.system?.tree || t.system?.talent_tree || '';
            return talentTree.toLowerCase() === treeName.toLowerCase();
          });

          if (treeTalents.length === 0) continue;

          // Organize talents into tiers based on prerequisites
          const tiers = this._organizeTalentsIntoTiers(treeTalents, acquiredTalentNames);

          context.talentTrees.push({
            id: treeName.toLowerCase().replace(/\s+/g, '-'),
            name: treeName,
            class: `tree-${treeName.toLowerCase().replace(/\s+/g, '-')}`,
            description: `Talents from the ${treeName} talent tree.`,
            tiers
          });
        }
      }

      // Sort trees alphabetically
      context.talentTrees.sort((a, b) => a.name.localeCompare(b.name));

    } catch (err) {
      SWSELogger.error('Error preparing talent trees:', err);
      context.talentTrees = [];
      context.talentTreeFilters = [];
      context.acquiredTalents = [];
      context.availableTalentSelections = 0;
    }
  }

  /**
   * Organize talents into tiers based on prerequisites
   * @param {Array} treeTalents - All talents in a tree
   * @param {Set} acquiredNames - Set of lowercase acquired talent names
   * @returns {Array} Array of tier objects
   */
  _organizeTalentsIntoTiers(treeTalents, acquiredNames) {
    const tiers = [];
    const processed = new Set();

    // Helper to check if prerequisites are met
    const prereqsMet = (talent) => {
      const prereq = talent.system?.prerequisite || talent.system?.prerequisites || '';
      if (!prereq || prereq === 'None' || prereq === '-') return true;

      // Check if any acquired talent is mentioned in prerequisites
      for (const name of acquiredNames) {
        if (prereq.toLowerCase().includes(name)) return true;
      }

      // If no specific talent prereq found, check for non-talent prereqs (BAB, feats, etc.)
      const hasTalentPrereq = treeTalents.some(t =>
        prereq.toLowerCase().includes(t.name.toLowerCase())
      );

      return !hasTalentPrereq; // If no talent prereq, it's available
    };

    // Build tiers iteratively
    let iteration = 0;
    while (processed.size < treeTalents.length && iteration < 10) {
      const tierTalents = [];

      for (const talent of treeTalents) {
        if (processed.has(talent.id)) continue;

        const prereq = talent.system?.prerequisite || talent.system?.prerequisites || '';

        // Tier 0: No prerequisites or non-talent prerequisites only
        if (iteration === 0) {
          const hasTalentPrereq = treeTalents.some(t =>
            prereq.toLowerCase().includes(t.name.toLowerCase())
          );
          if (!hasTalentPrereq) {
            tierTalents.push(talent);
            processed.add(talent.id);
          }
        } else {
          // Later tiers: Check if prereq talent is in an earlier tier
          const prereqInEarlierTier = tiers.some(tier =>
            tier.talents.some(t => prereq.toLowerCase().includes(t.name.toLowerCase()))
          );
          if (prereqInEarlierTier) {
            tierTalents.push(talent);
            processed.add(talent.id);
          }
        }
      }

      if (tierTalents.length > 0) {
        tiers.push({
          talents: tierTalents.map(t => ({
            _id: t.id,
            name: t.name,
            state: acquiredNames.has(t.name.toLowerCase()) ? 'acquired'
                 : prereqsMet(t) ? 'available'
                 : 'locked',
            icon: t.system?.icon || 'fas fa-brain',
            prerequisite: t.system?.prerequisite || t.system?.prerequisites || ''
          }))
        });
      }

      iteration++;
    }

    // Add any remaining unprocessed talents to the last tier
    const remaining = treeTalents.filter(t => !processed.has(t.id));
    if (remaining.length > 0) {
      tiers.push({
        talents: remaining.map(t => ({
          _id: t.id,
          name: t.name,
          state: acquiredNames.has(t.name.toLowerCase()) ? 'acquired' : 'locked',
          icon: t.system?.icon || 'fas fa-brain',
          prerequisite: t.system?.prerequisite || t.system?.prerequisites || ''
        }))
      });
    }

    return tiers;
  }

  // ----------------------------------------------------------
  // I. Talent Tree Engine
  // ----------------------------------------------------------

  async _onToggleTree(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const el = btn.closest(".talent-tree");
    if (!el) return;

    const content = el.querySelector(".tree-content");
    if (!content) return;

    const icon = btn.querySelector("i");

    const open = content.style.display !== "none";
    content.style.display = open ? "none" : "block";

    if (icon) {
      icon.classList.toggle("fa-chevron-down", !open);
      icon.classList.toggle("fa-chevron-right", open);
    }
  }

  async _onSelectTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentId;
    const item = this.actor.items.get(id);

    if (!item) return ui.notifications.warn("Talent not found.");

    const isLocked = event.currentTarget.classList.contains("locked");
    if (isLocked) {
      return ui.notifications.warn("Talent is locked. Prerequisites unmet.");
    }

    const acquired = event.currentTarget.classList.contains("acquired");
    if (acquired) {
      const ok = await Dialog.confirm({
        title: `Remove Talent: ${item.name}`,
        content: `<p>This may break dependent choices. Remove?</p>`
      });
      if (ok) await item.delete();
      return;
    }

    return item.sheet?.render(true);
  }

  async _onViewTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentId;
    const t = this.actor.items.get(id);
    if (t) t.sheet.render(true);
  }

  async _onFilterTalents(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.filter;
    const html = this.element[0];

    html.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");

    if (id === "all") {
      html.querySelectorAll(".talent-tree").forEach(t => t.style.display = "");
      return;
    }

    html.querySelectorAll(".talent-tree").forEach(t => {
      const match = t.dataset.treeId === id;
      t.style.display = match ? "" : "none";
    });
  }


  // ----------------------------------------------------------
  // I.2 Talent Abilities Engine (NEW)
  // ----------------------------------------------------------

  /**
   * Expand/collapse an ability card
   */
  _onExpandAbilityCard(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest('.ability-card');
    if (!card) return;

    const body = card.querySelector('.ability-card-body');
    const icon = header.querySelector('.ability-expand-icon i');

    card.classList.toggle('expanded');

    if (card.classList.contains('expanded')) {
      body.style.display = 'flex';
      icon?.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
      body.style.display = 'none';
      icon?.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
  }

  /**
   * Roll a talent ability check
   */
  async _onRollTalentAbility(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.abilityId;
    const talentId = btn.dataset.talentId;

    // Get the ability data
    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
    const ability = abilities.all.find(a => a.id === abilityId);

    if (!ability) {
      return ui.notifications.warn("Ability not found.");
    }

    // Check for conditional bonus checkbox
    const card = btn.closest('.ability-card');
    const conditionalCheckbox = card?.querySelector('.conditional-bonus-checkbox');
    const applyConditionalBonus = conditionalCheckbox?.checked || false;

    // Roll the ability
    await TalentAbilitiesEngine.rollAbility(this.actor, ability, {
      applyConditionalBonus
    });

    // Re-render to update uses
    this.render();
  }

  /**
   * Toggle a toggleable talent ability
   */
  async _onToggleTalentAbility(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.abilityId;

    const newState = await TalentAbilitiesEngine.toggleAbility(this.actor, abilityId);
    ui.notifications.info(newState ? "Ability activated" : "Ability deactivated");

    this.render();
  }

  /**
   * Post talent ability details to chat
   */
  async _onPostTalentAbility(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.abilityId;

    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
    const ability = abilities.all.find(a => a.id === abilityId);

    if (!ability) {
      return ui.notifications.warn("Ability not found.");
    }

    await TalentAbilitiesEngine.postAbilityToChat(this.actor, ability);
  }

  /**
   * View the source talent for an ability
   */
  async _onViewTalentFromAbility(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const talentId = btn.dataset.talentId;

    const talent = this.actor.items.get(talentId);
    if (talent) {
      talent.sheet.render(true);
    } else {
      ui.notifications.warn("Source talent not found.");
    }
  }

  /**
   * Use an ability choice (for multi-option abilities)
   */
  async _onUseAbilityChoice(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.abilityId;
    const choiceIndex = parseInt(btn.dataset.choiceIndex, 10);

    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
    const ability = abilities.all.find(a => a.id === abilityId);

    if (!ability || !ability.choices?.[choiceIndex]) {
      return ui.notifications.warn("Choice not found.");
    }

    const choice = ability.choices[choiceIndex];

    // Post choice to chat
    const content = `
      <div class="swse-ability-card">
        <div class="ability-card-header">
          <i class="${ability.icon}"></i>
          <h3>${ability.name}: ${choice.name}</h3>
          <span class="ability-type-badge type-${choice.actionType}">${choice.actionType}</span>
        </div>
        <div class="ability-card-body">
          <p class="ability-source"><em>From: ${ability.sourceTalentName}</em></p>
          <p class="ability-description">${choice.effect}</p>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });

    // Decrement uses if limited
    if (ability.usesData?.isLimited) {
      await TalentAbilitiesEngine.useAbility(this.actor, ability.sourceTalentId);
      this.render();
    }
  }

  /**
   * Use special action (like Force Focus recharge)
   */
  async _onUseSpecialAction(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.abilityId;
    const talentId = btn.dataset.talentId;

    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
    const ability = abilities.all.find(a => a.id === abilityId);

    if (!ability?.specialAction) {
      return ui.notifications.warn("Special action not found.");
    }

    // Post special action to chat
    const content = `
      <div class="swse-ability-card">
        <div class="ability-card-header">
          <i class="${ability.icon}"></i>
          <h3>${ability.specialAction.name}</h3>
          <span class="ability-type-badge type-${ability.specialAction.actionType}">${ability.specialActionData?.typeLabel || ability.specialAction.actionType}</span>
        </div>
        <div class="ability-card-body">
          <p class="ability-source"><em>From: ${ability.name} (${ability.sourceTalentName})</em></p>
          <p class="ability-description">${ability.specialAction.effect}</p>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });

    ui.notifications.info(`Used ${ability.specialAction.name}`);
  }

  /**
   * Reset ability uses (encounter or day)
   */
  async _onResetAbilityUses(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const resetType = btn.dataset.action === 'resetDayUses' ? 'day' : 'encounter';

    await TalentAbilitiesEngine.resetAbilityUses(this.actor, resetType);
    ui.notifications.info(`Reset ${resetType} ability uses.`);

    this.render();
  }

  /**
   * Filter abilities by type
   */
  _onFilterAbilities(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const filter = btn.dataset.filter;
    const container = btn.closest('.swse-talent-abilities-container');

    // Update active button
    container.querySelectorAll('.ability-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Filter cards
    const cards = container.querySelectorAll('.ability-card');
    cards.forEach(card => {
      if (filter === 'all') {
        card.style.display = '';
      } else {
        const cardType = card.dataset.actionType;
        card.style.display = cardType === filter ? '' : 'none';
      }
    });
  }

  // ----------------------------------------------------------
  // I.3 Talent Abilities Aliases for Data-Action Dispatcher
  // ----------------------------------------------------------
  // These aliases enable the data-action dispatcher to work with talent abilities
  // The actual implementation is in the longer method names for starship maneuvers compatibility

  async _onExpandAbility(event) {
    return this._onExpandAbilityCard(event);
  }

  async _onRollAbility(event) {
    return this._onRollTalentAbility(event);
  }

  async _onToggleAbility(event) {
    return this._onToggleTalentAbility(event);
  }

  async _onPostAbility(event) {
    return this._onPostTalentAbility(event);
  }

  async _onResetEncounterUses(event) {
    return this._onResetAbilityUses(event);
  }

  async _onResetDayUses(event) {
    return this._onResetAbilityUses(event);
  }

  /**
   * Handle using a sub-ability from a multi-option talent ability
   */
  async _onUseSubAbility(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const abilityId = btn.dataset.subAbilityId;
    const talentId = btn.dataset.talentId;

    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
    // Find parent ability
    const parentAbility = abilities.all.find(a =>
      a.isMultiOption && a.subAbilities?.some(sub => sub.id === abilityId)
    );

    if (!parentAbility) {
      return ui.notifications.warn("Sub-ability not found.");
    }

    const subAbility = parentAbility.subAbilities.find(sub => sub.id === abilityId);
    if (!subAbility) {
      return ui.notifications.warn("Sub-ability not found.");
    }

    // Roll the sub-ability
    if (subAbility.rollData?.canRoll) {
      await TalentAbilitiesEngine.rollAbility(this.actor, subAbility, {});
    } else {
      // Post to chat
      const content = `
        <div class="swse-ability-card">
          <div class="ability-card-header">
            <i class="${subAbility.icon}"></i>
            <h3>${subAbility.name}</h3>
            <span class="ability-type-badge type-${subAbility.actionType}">${subAbility.typeLabel}</span>
          </div>
          <div class="ability-card-body">
            <p class="ability-source"><em>From: ${parentAbility.name} (${parentAbility.sourceTalentName})</em></p>
            <p class="ability-description">${subAbility.description}</p>
          </div>
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content
      });
    }

    // Decrement uses if limited
    if (parentAbility.usesData?.isLimited) {
      await TalentAbilitiesEngine.useAbility(this.actor, parentAbility.sourceTalentId);
      this.render();
    }
  }


  // ----------------------------------------------------------
  // J. Force Suite Engine
  // ----------------------------------------------------------

  async _onAddToSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.powerId;
    const p = this.actor.items.get(id);
    if (!p) return;

    const suite = this.actor.items.filter(i =>
      ["forcepower", "force-power"].includes(i.type) &&
      i.system.inSuite
    );

    const max = this.actor.system.forceSuite?.maxPowers || 6;
    if (suite.length >= max) {
      return ui.notifications.warn(`Suite full (${max} powers).`);
    }

    await p.update({ "system.inSuite": true });
    ui.notifications.info(`Added ${p.name} to Suite`);
  }

  async _onRemoveFromSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.powerId;
    const p = this.actor.items.get(id);
    if (!p) return;

    await p.update({ "system.inSuite": false });
    ui.notifications.info(`Removed ${p.name} from Suite`);
  }

  async _onRestForce(event) {
    event.preventDefault();
    const spent = this.actor.items.filter(i =>
      ["forcepower", "force-power"].includes(i.type) &&
      i.system.spent
    );

    if (!spent.length) {
      return ui.notifications.info("All powers already refreshed.");
    }

    const ok = await Dialog.confirm({
      title: "Regain Force Powers",
      content: `<p>Regain all spent powers?</p><p>${spent.length} will be restored.</p>`
    });

    if (!ok) return;

    for (const p of spent) {
      await p.update({ "system.spent": false });
    }

    ui.notifications.info("Force powers restored.");
  }

  // ----------------------------------------------------------
  // K. Starship Maneuvers Suite Engine
  // ----------------------------------------------------------

  /**
   * Add a maneuver to the active suite
   */
  async _onAddManeuverToSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const maneuver = this.actor.items.get(id);
    if (!maneuver) return;

    const suite = this.actor.system.starshipManeuverSuite || { maneuvers: [], max: 6 };
    const currentIds = suite.maneuvers || [];
    const max = suite.max || 6;

    if (currentIds.length >= max) {
      return ui.notifications.warn(`Suite full (${max} maneuvers maximum).`);
    }

    if (currentIds.includes(id)) {
      return ui.notifications.warn(`${maneuver.name} is already in your suite.`);
    }

    await this.actor.update({
      'system.starshipManeuverSuite.maneuvers': [...currentIds, id]
    });
    ui.notifications.info(`Added ${maneuver.name} to active suite.`);
  }

  /**
   * Remove a maneuver from the active suite
   */
  async _onRemoveManeuverFromSuite(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const maneuver = this.actor.items.get(id);
    if (!maneuver) return;

    const suite = this.actor.system.starshipManeuverSuite || { maneuvers: [] };
    const currentIds = suite.maneuvers || [];

    await this.actor.update({
      'system.starshipManeuverSuite.maneuvers': currentIds.filter(mId => mId !== id)
    });
    ui.notifications.info(`Removed ${maneuver.name} from active suite.`);
  }

  /**
   * Mark a maneuver as spent (used)
   */
  async _onUseManeuver(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const maneuver = this.actor.items.get(id);
    if (!maneuver) return;

    await maneuver.update({ 'system.spent': true });
    ui.notifications.info(`${maneuver.name} has been spent.`);
  }

  /**
   * Regain a single spent maneuver
   */
  async _onRegainManeuver(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const maneuver = this.actor.items.get(id);
    if (!maneuver) return;

    await maneuver.update({ 'system.spent': false });
    ui.notifications.info(`${maneuver.name} has been regained.`);
  }

  /**
   * Rest to regain all spent maneuvers in the suite
   */
  async _onRestManeuvers(event) {
    event.preventDefault();

    const suiteIds = this.actor.system.starshipManeuverSuite?.maneuvers || [];
    const spentManeuvers = this.actor.items.filter(i =>
      i.type === 'maneuver' && i.system.spent && suiteIds.includes(i.id)
    );

    if (!spentManeuvers.length) {
      return ui.notifications.info("All maneuvers are already available.");
    }

    const ok = await Dialog.confirm({
      title: "Rest - Regain Maneuvers",
      content: `<p>Rest for 1 minute to regain all spent maneuvers?</p><p>${spentManeuvers.length} maneuver(s) will be restored.</p>`
    });

    if (!ok) return;

    for (const m of spentManeuvers) {
      await m.update({ 'system.spent': false });
    }

    ui.notifications.info(`${spentManeuvers.length} maneuver(s) regained.`);
  }

  /**
   * Handle spending a Force Point for various purposes
   * @param {Event} event - The triggering event
   */
  async _onSpendForcePoint(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;

    switch (type) {
      case 'reroll':
        // Spend Force Point to add Force Point dice to a roll
        const spent = await this.actor.spendForcePoint('adding to a roll');
        if (spent) {
          // Roll the Force Point dice
          const dieType = this.actor.system.forcePoints?.diceType || 'd6';
          const level = this.actor.system.level || 1;
          const qty = level >= 15 ? 3 : level >= 8 ? 2 : 1;

          const roll = await new Roll(`${qty}${dieType}`).evaluate({ async: true });
          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<div class="swse force-roll"><h4><i class="fas fa-dice"></i> Force Point Roll</h4><p>Add this to your roll result!</p></div>`
          });
        }
        break;

      case 'avoid-death':
        // Spend Force Point to avoid death
        await this.actor.spendForcePoint('avoiding death');
        break;

      case 'reduce-dark':
        // Spend Force Point to reduce Dark Side Score
        const currentDark = this.actor.system.darkSideScore || 0;
        if (currentDark <= 0) {
          return ui.notifications.warn(`${this.actor.name} has no Dark Side Score to reduce.`);
        }
        const reduceSpent = await this.actor.spendForcePoint('reducing Dark Side Score');
        if (reduceSpent) {
          await this.actor.update({ 'system.darkSideScore': Math.max(0, currentDark - 1) });
          ui.notifications.info(`${this.actor.name}'s Dark Side Score reduced to ${currentDark - 1}.`);
        }
        break;

      default:
        // Generic Force Point spend
        await this.actor.spendForcePoint(type || 'unspecified');
    }
  }

  /**
   * Handle regaining a spent Force Power by spending a Force Point
   * @param {Event} event - The triggering event
   */
  async _onRegainForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const power = this.actor.items.get(itemId);

    if (!power) {
      return ui.notifications.error("Force Power not found.");
    }

    if (!power.system.spent) {
      return ui.notifications.warn(`${power.name} is not spent.`);
    }

    // Spend a Force Point to regain the power
    const spent = await this.actor.spendForcePoint(`regaining ${power.name}`);

    if (spent) {
      await power.update({ 'system.spent': false });
      ui.notifications.info(`${power.name} has been regained!`);
    }
  }


  // ----------------------------------------------------------
  // K. Drag & Drop / Compendium Import Engine
  // ----------------------------------------------------------

  async _onDrop(event) {
    event.preventDefault();

    const dt = event.dataTransfer;
    let raw = dt?.getData("text/plain");
    if (!raw) return super._onDrop(event);

    let data;
    try { data = JSON.parse(raw); }
    catch { return super._onDrop(event); }

    if (data.type !== "Item" || !data.pack || !data.id)
      return super._onDrop(event);

    const pack = game.packs.get(data.pack);
    if (!pack) return ui.notifications.error(`Missing pack ${data.pack}`);

    const doc = await pack.getDocument(data.id);
    if (!doc) return ui.notifications.error("Document not found in compendium.");

    const itemData = doc.toObject();
    const existing = this.actor.items.find(i => i.name === itemData.name && i.type === itemData.type);

    if (existing) {
      ui.notifications.info(`${itemData.name} already owned.`);
      return;
    }

    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);

    // ----------------------------------------------------------
    // PATCH: Asset auto-add for Droids & Vehicles on drag/drop
    // ----------------------------------------------------------
    // If dropped item is a Droid, add to character's droid assets
    if (itemData.type === "droid") {
      const prev = this.actor.system.droids || [];
      const entry = {
        _id: itemData._id || foundry.utils.randomID(),
        name: itemData.name,
        model: itemData.system?.model || "Unknown",
        sourceItemId: created?.id ?? created?._id
      };

      await this.actor.update({ "system.droids": [...prev, entry] });
      ui.notifications.info(`Added droid asset: ${entry.name}`);
    }

    // If dropped item is a Vehicle, add to character's vehicle assets
    if (itemData.type === "vehicle") {
      const prev = this.actor.system.vehicles || [];
      const entry = {
        _id: itemData._id || foundry.utils.randomID(),
        name: itemData.name,
        vehicleClass: itemData.system?.vehicleClass || "Unknown",
        sourceItemId: created?.id ?? created?._id
      };

      await this.actor.update({ "system.vehicles": [...prev, entry] });
      ui.notifications.info(`Added vehicle asset: ${entry.name}`);
    }

    const applyEffects = game.settings.get("swse", "applyItemsAsEffects");
    if (applyEffects && created) {
      const changes = [];
      if (itemData.system?.hp?.max) {
        changes.push({ key: "system.hp.max", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: itemData.system.hp.max });
      }
      if (itemData.system?.armor?.value) {
        changes.push({ key: "system.armor.value", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: itemData.system.armor.value });
      }

      if (changes.length) {
        await this.actor.createEmbeddedDocuments("ActiveEffect", [{
          label: `From ${itemData.name}`,
          icon: itemData.img,
          changes,
          origin: `Actor.${this.actor.id}.Item.${created.id}`,
          flags: { swse: { fromItem: true } }
        }]);
      }
    }
  }


  // ----------------------------------------------------------
  // L. Utility Functions
  // ----------------------------------------------------------

  /* ======================================================================
     SKILL SYSTEM — SHEET HANDLERS
     ====================================================================== */

  /**
   * Roll a basic skill check
   */
  async _onSkillRoll(skillKey) {
    // Use proper SWSERoll system with dialog to confirm bonuses and add modifiers
    return SWSERoll.rollSkill(this.actor, skillKey, { showDialog: true });
  }

  /**
   * Roll a specific action for a skill (skill-action-card)
   */
  async _onSkillActionRoll(skillKey, actionName) {
    // Use proper SWSERoll system with dialog to confirm bonuses and add modifiers
    return SWSERoll.rollSkill(this.actor, skillKey, { showDialog: true });
  }

  /**
   * Show/hide full skill actions panel
   */
  _toggleSkillPanel(skillKey) {
    const panel = $(`.swse-skill-actions-panel[data-skill="${skillKey}"]`);
    const icon = $(`.skill-expand-btn[data-skill="${skillKey}"] i`);

    const isVisible = panel.is(":visible");

    if (isVisible) {
      panel.slideUp(180);
      icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
      panel.slideDown(200);
      icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
  }

  /**
   * Expand/collapse the body of a skill action card
   */
  _toggleSkillActionCard(cardElem) {
    const body = cardElem.find(".card-body");
    const icon = cardElem.find(".action-expand i");

    const isVisible = body.is(":visible");

    if (isVisible) {
      body.slideUp(180);
      icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
      body.slideDown(200);
      icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
  }

  /**
   * Toggle favorite status of a skill
   */
  async _onToggleSkillFavorite(skillKey) {
    const currentFavorite = this.actor.system.skills[skillKey]?.favorite || false;
    await this.actor.update({
      [`system.skills.${skillKey}.favorite`]: !currentFavorite
    });
  }

  /**
   * Filter skills based on trained/untrained/favorite status
   */
  _onSkillFilterChange(filterType, html) {
    const filterBtns = html.find(".filter-btn");
    filterBtns.removeClass("active");
    html.find(`.filter-btn[data-filter="${filterType}"]`).addClass("active");

    const skillRows = html.find(".skill-row-container");
    skillRows.removeClass("hidden");

    if (filterType === "trained") {
      skillRows.each((_, row) => {
        const skillKey = row.dataset.skill;
        const isTrained = this.actor.system.skills[skillKey]?.trained || false;
        if (!isTrained) {
          $(row).addClass("hidden");
        }
      });
    } else if (filterType === "untrained") {
      skillRows.each((_, row) => {
        const skillKey = row.dataset.skill;
        const isTrained = this.actor.system.skills[skillKey]?.trained || false;
        if (isTrained) {
          $(row).addClass("hidden");
        }
      });
    } else if (filterType === "favorite") {
      skillRows.each((_, row) => {
        const skillKey = row.dataset.skill;
        const isFavorite = this.actor.system.skills[skillKey]?.favorite || false;
        if (!isFavorite) {
          $(row).addClass("hidden");
        }
      });
    }

    // Apply current sort after filtering
    const sortSelect = html.find(".sort-select");
    const currentSort = sortSelect.val();
    this._applySkillSort(currentSort, html);
  }

  /**
   * Sort skills by various criteria
   */
  _onSkillSortChange(sortType, html) {
    this._applySkillSort(sortType, html);
  }

  /**
   * Apply sorting to visible skills
   */
  _applySkillSort(sortType, html) {
    const skillsList = html.find(".skills-list");
    const skillRows = html.find(".skill-row-container").get();

    // Sort based on type
    skillRows.sort((a, b) => {
      const aKey = a.dataset.skill;
      const bKey = b.dataset.skill;
      const aSkill = this.actor.system.skills[aKey];
      const bSkill = this.actor.system.skills[bKey];

      // Get skill labels from the DOM
      const aLabel = $(a).find(".skill-name").text();
      const bLabel = $(b).find(".skill-name").text();

      switch (sortType) {
        case "trained-first":
          if (aSkill.trained !== bSkill.trained) {
            return bSkill.trained - aSkill.trained;
          }
          return aLabel.localeCompare(bLabel);

        case "trained-last":
          if (aSkill.trained !== bSkill.trained) {
            return aSkill.trained - bSkill.trained;
          }
          return aLabel.localeCompare(bLabel);

        case "name-asc":
          return aLabel.localeCompare(bLabel);

        case "name-desc":
          return bLabel.localeCompare(aLabel);

        case "total-desc":
          return (bSkill.total || 0) - (aSkill.total || 0);

        case "total-asc":
          return (aSkill.total || 0) - (bSkill.total || 0);

        case "favorite-first":
          if (aSkill.favorite !== bSkill.favorite) {
            return (bSkill.favorite ? 1 : 0) - (aSkill.favorite ? 1 : 0);
          }
          return aLabel.localeCompare(bLabel);

        default:
          // Default order (as defined in template)
          return 0;
      }
    });

    // Re-append sorted rows
    skillRows.forEach(row => {
      skillsList.append(row);
    });
  }
}
