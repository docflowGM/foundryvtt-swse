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

export class SWSECharacterSheet extends SWSEActorSheetBase {

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
    this._saveScrollPositions();
    await super._render(force, options);
    this._restoreScrollPositions();
  }

  // PERFORMANCE: Cache scroll container references to avoid repeated DOM queries
  _cacheScrollContainers() {
    if (this._scrollContainers) return;
    const root = this.element?.[0];
    if (!root) return;
    this._scrollContainers = root.querySelectorAll('.sheet-body, .tab');
  }

  _saveScrollPositions() {
    this._scrollPositions = {};
    this._cacheScrollContainers();
    if (!this._scrollContainers) return;

    this._scrollContainers.forEach(el => {
      const key = el.dataset.scrollKey || el.className;
      this._scrollPositions[key] = el.scrollTop;
    });
  }

  _restoreScrollPositions() {
    if (!this._scrollPositions) return;
    this._cacheScrollContainers();
    if (!this._scrollContainers) return;

    this._scrollContainers.forEach(el => {
      const key = el.dataset.scrollKey || el.className;
      if (this._scrollPositions[key] !== undefined) {
        el.scrollTop = this._scrollPositions[key];
      }
    });
  }

  // Clear cache when sheet is closed
  async close() {
    this._scrollContainers = null;
    return super.close();
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

    return context;
  }
// ----------------------------------------------------------
  // D. DOM Event Routing Engine (v13)
  // ----------------------------------------------------------

  activateListeners(html) {
    // Call super FIRST to set up base data-action handler and other core listeners
    super.activateListeners(html);

    // Defense input debouncing
    html.find(".defense-input-sm, .defense-select-sm").change(ev => {
      this._debouncedDefenseChange.call(this);
    });

    // ========== HEADER BUTTONS ==========
    html.find('.level-up').click(ev => this._onLevelUp(ev));
    html.find('.character-generator').click(ev => this._onCharacterGenerator(ev));
    html.find('.open-store').click(ev => this._onOpenStore(ev));
    html.find('.pick-species-btn').click(ev => this._onPickSpecies(ev));
    html.find('.add-class-btn').click(ev => this._onAddClass(ev));

    // ========== PROGRESSION ENGINE BUTTONS ==========
    html.find('.roll-attributes-btn').click(ev => this._onRollAttributes(ev));

    // ========== FORCE TAB ACTIONS ==========
    html.find('.roll-force-point').click(ev => this._onRollForcePoint(ev));
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
    html.find(".reduce-dsp").click(ev => {
      ev.preventDefault();
      this._onReduceDSP();
    });

    html.find(".increase-dsp").click(ev => {
      ev.preventDefault();
      this._onIncreaseDSP();
    });

    html.find(".dark-inspiration").click(ev => {
      ev.preventDefault();
      this._onDarkInspiration();
    });

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

    SWSELogger.log("SWSE | Character sheet listeners activated (all handlers wired)");
  }

  
  // ----------------------------------------------------------
  // E.0 Header Button Handlers
  // ----------------------------------------------------------
  async _onLevelUp(event) {
    event.preventDefault();
    // Open level up dialog using the static method from the compatibility shim
    try {
      const { SWSELevelUp } = await import('../apps/swse-levelup.js');
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
      const { SWSECharacterGeneratorApp } = await import('../apps/chargen.js');
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
      const { SWSEStore } = await import('../apps/store/store-main.js');
      new SWSEStore(this.actor).render(true);
    } catch (err) {
      SWSELogger.warn('Store system not available:', err);
      ui.notifications.warn('Store not loaded');
    }
  }

  async _onPickSpecies(event) {
    event.preventDefault();
    return this._showSpeciesPicker();
  }

  async _onAddClass(event) {
    event.preventDefault();
    return this._showClassPicker();
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
  // E.3 Species Picker (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _showSpeciesPicker() {
    const pack = game.packs.get('foundryvtt-swse.species');
    if (!pack) return ui.notifications.error("Species pack not found.");

    const index = await pack.getIndex();
    let species = index.map(x => ({
      id: x._id,
      name: x.name,
      img: x.img
    }));

    // Sort species: Human first, Near-Human second, then alphabetically
    species.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      // Human always first
      if (nameA === "human" && nameB !== "human") return -1;
      if (nameA !== "human" && nameB === "human") return 1;

      // Near-Human second
      if (nameA === "near-human" && nameB !== "near-human") return -1;
      if (nameA !== "near-human" && nameB === "near-human") return 1;

      // Rest alphabetically
      return nameA.localeCompare(nameB);
    });

    // Create species selection dialog with card UI
    // Generate asset filename from species name (lowercase, hyphens)
    const getSpeciesImagePath = (name) => {
      const filename = name.toLowerCase().replace(/\s+/g, '-') + '.webp';
      return `/assets/species/${filename}`;
    };

    const rows = species.map((sp, idx) => `
      <div class="species-choice-card" data-key="${idx}" data-species="${escapeHTML(sp.name)}" style="cursor: pointer; padding: 12px; border: 1px solid #ccc; border-radius: 4px; margin: 8px; display: inline-block; min-width: 120px; text-align: center; transition: all 0.2s;">
        <img src="${escapeHTML(getSpeciesImagePath(sp.name))}" alt="${escapeHTML(sp.name)}" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 8px; object-fit: cover; background: #666;" onerror="this.innerHTML='<i class=\"fas fa-dna\" style=\"color: #fff; font-size: 24px;\"></i>'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center';">
        <strong>${escapeHTML(sp.name)}</strong>
      </div>`
    ).join("");

    const dialog = new Dialog({
      title: "Select Species",
      content: `<div class="swse-species-picker" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">${rows}</div>`,
      buttons: {
        cancel: { label: "Cancel" }
      },
      render: html => {
        html[0].querySelectorAll(".species-choice-card").forEach(card => {
          card.addEventListener("mouseenter", (evt) => {
            evt.currentTarget.style.transform = "scale(1.05)";
            evt.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            evt.currentTarget.style.borderColor = "#4a9eff";
          });

          card.addEventListener("mouseleave", (evt) => {
            evt.currentTarget.style.transform = "scale(1)";
            evt.currentTarget.style.boxShadow = "none";
            evt.currentTarget.style.borderColor = "#ccc";
          });

          card.addEventListener("click", async (evt) => {
            const key = Number(card.dataset.key);
            const selectedSpecies = species[key];

            // Get the actual document
            const doc = await pack.getDocument(selectedSpecies.id);

            // Show confirmation if changing species
            if (this.actor.system?.species) {
              const confirmed = await Dialog.confirm({
                title: "Change Species?",
                content: `<p>Change from <strong>${escapeHTML(this.actor.system.species)}</strong> to <strong>${escapeHTML(doc.name)}</strong>?</p><p>Racial bonuses and traits will be updated.</p>`
              });
              if (!confirmed) return;
            }

            // Use progression engine if available
            try {
              const { SWSEProgressionEngine } = await import('../../engine/progression.js');
              const engine = new SWSEProgressionEngine(this.actor, "chargen");

              // Call the progression engine action
              await engine.doAction('confirmSpecies', {
                speciesId: doc.name,
                abilityChoice: null // Will prompt separately if needed (human bonus)
              });

              ui.notifications.info(`Species set to ${doc.name}`);
            } catch (err) {
              // Fallback to old method if progression engine fails
              console.warn("Progression engine failed, using fallback:", err);
              const { DropHandler } = await import('../../drag-drop/drop-handler.js');
              await DropHandler.handleSpeciesDrop(this.actor, doc);
              ui.notifications.info(`Species set to ${doc.name}`);
            }

            // Close the dialog using the Dialog's close method
            dialog.close();
          });
        });
      }
    });
    dialog.render(true);
  }

  // ----------------------------------------------------------
  // E.4 Class Picker (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _showClassPicker() {
    const { getAvailableClasses } = await import('../../apps/levelup/levelup-class.js');
    const classes = await getAvailableClasses(this.actor, {});
    if (!classes?.length) return ui.notifications.warn("No classes available.");

    return this._showSelectionDialog(
      "Select Class",
      classes,
      cls => `<strong>${cls.name}</strong> — ${cls.description ?? ""}`,
      async cls => {
        // Use progression engine if available
        try {
          const { SWSEProgressionEngine } = await import('../../engine/progression.js');
          const engine = new SWSEProgressionEngine(this.actor, "chargen");

          // Call the progression engine action
          await engine.doAction('confirmClass', {
            classId: cls.id,
            skipPrerequisites: false
          });

          ui.notifications.info(`Class selected: ${cls.name}`);
        } catch (err) {
          // Fallback to direct item creation if progression engine fails
          console.warn("Progression engine failed for class, using fallback:", err);
          const classItem = {
            name: cls.name,
            type: 'class',
            system: {
              level: 1,
              description: cls.description || ''
            }
          };
          await this.actor.createEmbeddedDocuments("Item", [classItem]);
          ui.notifications.info(`Class added: ${cls.name}`);
        }
      }
    );
  }

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
  // E.5B Background Picker (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _showBackgroundPicker() {
    // Check if backgrounds are enabled
    const enableBackgrounds = game.settings.get('foundryvtt-swse', 'enableBackgrounds');
    if (!enableBackgrounds) {
      return ui.notifications.warn("Backgrounds are not enabled in this world.");
    }

    // Load backgrounds from progression data
    try {
      const { PROGRESSION_RULES } = await import('../../progression/data/progression-data.js');
      const backgrounds = Object.entries(PROGRESSION_RULES.backgrounds || {})
        .map(([id, bg]) => ({
          id,
          name: bg.name,
          trainedSkills: bg.trainedSkills || [],
          description: bg.description || ""
        }));

      if (!backgrounds.length) {
        return ui.notifications.warn("No backgrounds available.");
      }

      return this._showSelectionDialog(
        "Select Background",
        backgrounds,
        bg => `<strong>${bg.name}</strong><br><small>Skills: ${(bg.trainedSkills || []).join(", ")}</small>`,
        async bg => {
          // Use progression engine if available
          try {
            const { SWSEProgressionEngine } = await import('../../engine/progression.js');
            const engine = new SWSEProgressionEngine(this.actor, "chargen");

            // Call the progression engine action
            await engine.doAction('confirmBackground', {
              backgroundId: bg.id
            });

            ui.notifications.info(`Background set to ${bg.name}`);
          } catch (err) {
            // Fallback - just apply to actor directly
            console.warn("Progression engine failed for background, using fallback:", err);
            await this.actor.update({
              "system.progression.background": bg.id,
              "system.progression.backgroundTrainedSkills": bg.trainedSkills || []
            });
            ui.notifications.info(`Background set to ${bg.name}`);
          }
        }
      );
    } catch (err) {
      console.error("Failed to load backgrounds:", err);
      ui.notifications.error("Failed to load backgrounds.");
    }
  }

  // ----------------------------------------------------------
  // E.6 Roll Attributes (Progression Engine Integrated)
  // ----------------------------------------------------------
  async _onRollAttributes(event) {
    event.preventDefault();

    try {
      // Open the character generator which has the progression engine UI
      // for attribute rolling and other selections
      const CharacterGenerator = (await import('../../apps/chargen/chargen-main.js')).default;
      const chargen = new CharacterGenerator(this.actor);
      chargen.currentStep = 'attributes';
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

      // Create a blob from the JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Generate filename with character name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const safeName = actorData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeName}_${timestamp}.json`;

      link.href = url;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      ui.notifications.info(`Exported ${actorData.name} to JSON`);
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

      // Create a blob from the JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.download = 'swse_character_template.json';
      link.href = url;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      ui.notifications.info('Character template downloaded');
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

    const atk = item.system.attackBonus ?? 0;
    const roll = await this._safeEvaluate(`1d20 + ${atk}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Attack: ${item.name}`
    });
  }

  // Damage Roll
  async _onRollDamage(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return ui.notifications.error("Weapon not found.");

    const dmg = item.system.damage || "1d6";
    const roll = await this._safeEvaluate(dmg);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Damage: ${item.name}`
    });
  }

  // Use the Force Roll
  async _onUsePower(evt) {
    const id = evt.currentTarget.dataset.itemId;
    const p = this.actor.items.get(id);
    if (!p) return ui.notifications.error("Power not found.");

    const sk = this.actor.system.skills?.useTheForce;
    if (!sk) return ui.notifications.error("Use the Force skill missing.");

    const roll = await this._safeEvaluate(`1d20 + ${sk.total}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Use the Force: ${p.name}`
    });
  }

  // Force Point Roll
  async _onRollForcePoint(evt) {
    const fp = this.actor.system.forcePoints?.value || 0;
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

  async _onPostCombatAction(evt) {
    evt.preventDefault();
    const el = evt.currentTarget;
    const name = el.dataset.actionName;

    const data = CombatActionsMapper.getAllCombatActions();
    const action = data.find(a => a.name === name);
    if (!action) return ui.notifications.warn(`Action not found: ${name}`);

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
  // I. Talent Tree Engine
  // ----------------------------------------------------------

  async _onToggleTree(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const el = btn.closest(".talent-tree");
    const content = el.querySelector(".tree-content");
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
    try {
      const actor = this.actor;
      const roll = await globalThis.SWSE.RollEngine.skillRoll({
        actor,
        skill: skillKey,
        flavor: `Skill Check — ${skillKey}`
      });
      roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }) });
    } catch (err) {
      console.error("Skill Roll Error:", err);
      ui.notifications.error(`Failed to roll skill: ${skillKey}`);
    }
  }

  /**
   * Roll a specific action for a skill (skill-action-card)
   */
  async _onSkillActionRoll(skillKey, actionName) {
    const actor = this.actor;

    try {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<strong>${actionName}</strong><br>Performing skill action for <em>${skillKey}</em>.`
      });

      // Trigger a standard roll message for now
      // (Your RollEngine can later be extended for action-specific logic)
      const roll = await globalThis.SWSE.RollEngine.skillRoll({
        actor,
        skill: skillKey,
        flavor: `Skill Action — ${actionName}`
      });
      roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }) });

    } catch (err) {
      console.error("Skill Action Roll Error:", err);
      ui.notifications.error(`Failed to perform action: ${actionName}`);
    }
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
}
