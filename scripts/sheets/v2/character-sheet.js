import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { CombatRollConfigDialog } from "/systems/foundryvtt-swse/scripts/apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import CharacterGenerator from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-main.js";
import { MentorNotesApp } from "/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js";
import { CombatExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    }
  };

  static tabGroups = {
    primary: {
      initial: "overview"
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "character", "swse-character-sheet"],
      width: 900,
      height: 950,
      resizable: true
    });
  }

  constructor(document, options = {}) {
    super(document, options);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.activateListeners(this.element);

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(this.element, this.document);
  }

  /* ============================================================
     PREPARE CONTEXT (PURE ORCHESTRATION)
  ============================================================ */

  async _prepareContext(options) {
    const actor = this.document;
    const context = await super._prepareContext(options);

    // Authoritative derived state (populated by character-actor.js computeCharacterDerived)
    // SAFEGUARD: Ensure all expected nested properties exist with empty defaults
    const derived = foundry.utils.duplicate(actor.system?.derived ?? {});

    // Define ability constants used for multiple safeguards
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const ABILITY_LABELS = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma'
    };

    // Normalize critical derived structures to prevent undefined path errors in templates
    derived.talents ??= {};
    derived.talents.groups ??= [];
    derived.talents.list ??= [];

    derived.skills ??= [];

    derived.attacks ??= {};
    derived.attacks.list ??= [];

    derived.identity ??= {};
    derived.identity.halfLevel ??= 0;
    // Provide ability array for skills panel selectors (used in skills-panel.hbs line 75)
    derived.identity.abilities ??= ABILITY_KEYS.map(key => ({
      key,
      label: ABILITY_LABELS[key]
    }));

    derived.encumbrance ??= {};
    derived.encumbrance.state ??= "normal";
    derived.encumbrance.label ??= "Unencumbered";
    derived.encumbrance.total ??= 0;
    derived.encumbrance.lightLoad ??= 0;
    derived.encumbrance.mediumLoad ??= 0;
    derived.encumbrance.heavyLoad ??= 0;

    derived.defenses ??= {};

    // Build abilities array from system.abilities object
    // Convert {str: {...}, dex: {...}, ...} → [{key: 'str', label: 'Strength', ...}, ...]
    const abilitiesMap = system.abilities ?? {};
    const abilities = ABILITY_KEYS.map(key => {
      const ability = abilitiesMap[key] ?? {};
      return {
        key,
        label: ABILITY_LABELS[key],
        base: ability.base ?? 10,
        racial: ability.racial ?? 0,
        temp: ability.temp ?? 0,
        total: ability.total ?? 10,
        mod: ability.mod ?? 0
      };
    });

    // Build headerDefenses array from derived.defenses object
    // Convert {fort: 10, ref: 10, will: 10, flatFooted: 10} → [{key: 'fort', label: 'Fortitude', total: 10, ...}, ...]
    const defenseKeys = [
      { key: 'fort', label: 'Fortitude' },
      { key: 'ref', label: 'Reflex' },
      { key: 'will', label: 'Will' },
      { key: 'flatFooted', label: 'Flat-Footed' }
    ];
    const headerDefenses = defenseKeys.map(def => ({
      key: def.key,
      label: def.label,
      total: derived.defenses[def.key] ?? 10,
      armorBonus: derived.defenses[`${def.key}ArmorBonus`] ?? 0,
      abilityMod: derived.defenses[`${def.key}AbilityMod`] ?? 0,
      classDef: derived.defenses[`${def.key}ClassDef`] ?? 0,
      miscMod: derived.defenses[`${def.key}MiscMod`] ?? 0
    }));

    // Identity + visual customization
    const forceSensitive = system.forceSensitive ?? false;
    const identityGlowColor = forceSensitive ? '#88cfff' : '#666666';

    const inventory = this._buildInventoryModel(actor);

    // Presentation-only normalization (no mutation)
    const biography =
      typeof actor.system.biography === "object"
        ? actor.system.biography
        : {
            main: "",
            contacts: "",
            reputation: "",
            faction: "",
            gmNotes: ""
          };

    // Compute display objects from system data
    const system = actor.system;
    const hp = {
      value: system.hp?.value ?? 0,
      max: system.hp?.max ?? 1,
      temp: system.hp?.temp ?? 0
    };
    hp.percent = Math.round((hp.value / hp.max) * 100);

    // Bonus HP (derived-only from ModifierEngine)
    const bonusHp = await this._computeBonusHP(actor);

    // Condition track steps (0-5 numeric → visual array)
    const conditionCurrent = system.conditionTrack?.current ?? 0;
    const conditionLabels = ["Normal", "−1", "−2", "−5", "−10", "Helpless"];
    const conditionSteps = [];
    for (let i = 0; i < 6; i++) {
      conditionSteps.push({
        step: i,
        label: conditionLabels[i],
        active: i === conditionCurrent
      });
    }

    // Initiative total (from derived calculation)
    const initiativeTotal = derived?.initiative?.total ?? 0;

    // Combat attacks context
    const combat = {
      attacks: derived?.attacks?.list ?? []
    };

    // Force Points visual array (value as dots, with used state)
    const fpValue = system.forcePoints?.value ?? 0;
    const fpMax = system.forcePoints?.max ?? 0;
    const forcePoints = [];
    for (let i = 1; i <= fpMax; i++) {
      forcePoints.push({
        index: i,
        used: i <= fpValue
      });
    }

    // Force suite context (hand/discard zones + tag filtering)
    const forcePowers = (actor?.items ?? []).filter(i => i.type === 'force-power');
    const forceTags = [...new Set(forcePowers.flatMap(p => p.system?.tags ?? []))].sort();
    const forceSuite = {
      hand: forcePowers.filter(p => !p.system?.discarded),
      discard: forcePowers.filter(p => p.system?.discarded)
    };

    // Dark Side Points context (via DSPEngine for house rule support)
    const dspValue = DSPEngine.getValue(actor);
    const dspMax = DSPEngine.getMax(actor);
    const dspSegments = [];
    for (let i = 1; i <= dspMax; i++) {
      dspSegments.push({
        index: i,
        filled: i <= dspValue,
        color: i <= dspValue ? '#E74C3C' : '#4A90E2'
      });
    }

    // Build mode (free build = prerequisites not enforced, typically set during chargen)
    const buildMode = actor.system?.buildMode ?? "normal";

    // Action Economy Context (for combat tab)
    let actionEconomy = null;
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

      const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
      const state = ActionEngine.getVisualState(turnState);
      const breakdown = ActionEngine.getTooltipBreakdown(turnState);
      const enforcementMode = game.settings.get("swse", "actionEconomyMode");

      actionEconomy = {
        state,
        breakdown,
        enforcementMode
      };
    }

    return {
      ...context,
      biography,
      derived,
      inventory,
      hp,
      bonusHp,
      conditionSteps,
      initiativeTotal,
      combat,
      forcePoints,
      forceTags,
      forceSuite,
      lowHand: forceSuite.hand.length > 5,
      darkSideMax: dspMax,
      darkSideSegments: dspSegments,
      abilities,
      headerDefenses,
      forceSensitive,
      identityGlowColor,
      buildMode,
      actionEconomy
    };
  }

  /* ============================================================
     BONUS HP COMPUTATION (DERIVED-ONLY)
  ============================================================ */

  async _computeBonusHP(actor) {
    try {
      const { ModifierEngine } = await import("/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js").catch(
        () => ({ ModifierEngine: null })
      );

      if (!ModifierEngine) {
        return { value: 0, label: "" };
      }

      const bonusMods = await ModifierEngine.collectModifiers(actor, {
        domain: "bonusHitPoints",
        context: {}
      });

      // RAW: Only highest source applies
      const highestBonus = bonusMods.length
        ? Math.max(...bonusMods.map(m => m.value))
        : 0;

      return {
        value: highestBonus,
        label: highestBonus > 0 ? `+${highestBonus}` : ""
      };
    } catch {
      return { value: 0, label: "" };
    }
  }

  /* ============================================================
     INVENTORY VIEW MODEL (READ-ONLY)
  ============================================================ */

  _buildInventoryModel(actor) {
    const items = Array.from(actor.items);

    const build = type =>
      items
        .filter(i => i.type === type)
        .map(i => ({
          id: i.id,
          name: i.name,
          img: i.img,
          system: i.system
        }));

    return {
      equipment: build("equipment"),
      armor: build("armor"),
      weapons: build("weapon")
    };
  }

  /* ============================================================
     LISTENERS (UI ONLY)
  ============================================================ */

  activateListeners(html) {
    // Toggle Abilities Panel
    html.querySelectorAll("[data-action='toggle-abilities']").forEach(button => {
      button.addEventListener("click", ev => {
        const panel = html.querySelector(".abilities-panel");
        const toggleBtn = html.querySelector(".abilities-toggle");
        if (panel) {
          panel.classList.toggle("expanded");
          if (toggleBtn) {
            toggleBtn.textContent = panel.classList.contains("expanded") ? "Less" : "More";
          }
        }
      });
    });

    // Toggle Defenses Panel
    html.querySelectorAll("[data-action='toggle-defenses']").forEach(button => {
      button.addEventListener("click", ev => {
        const panel = html.querySelector(".defenses-panel");
        const toggleBtn = html.querySelector(".defenses-toggle");
        if (panel) {
          panel.classList.toggle("expanded");
          if (toggleBtn) {
            toggleBtn.textContent = panel.classList.contains("expanded") ? "Less" : "More";
          }
        }
      });
    });

    // UI-only preview math for ability pills
    html.querySelectorAll(".ability-expanded input").forEach(input => {
      input.addEventListener("input", ev => {
        const row = ev.currentTarget.closest(".ability-row");
        this._previewAbilityRow(row);
      });
    });

    // Force Card Flip
    html.querySelectorAll(".force-card").forEach(card => {
      card.addEventListener("click", ev => {
        card.classList.toggle("flipped");
      });
    });

    // Flip Back
    html.querySelectorAll(".flip-back").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const card = ev.currentTarget.closest(".force-card");
        if (card) card.classList.remove("flipped");
      });
    });

    // Mentor Button
    html.querySelectorAll('[data-action="open-mentor"]').forEach(button => {
      button.addEventListener("click", ev => {
        ev.preventDefault();
        this._openMentorConversation();
      });
    });

    // Header Command Buttons
    html.querySelectorAll('[data-action="cmd-chargen"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        const chargen = new CharacterGenerator(this.actor);
        chargen.render(true);
      });
    });

    html.querySelectorAll('[data-action="cmd-levelup"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        const levelup = new SWSELevelUpEnhanced(this.actor);
        levelup.render(true);
      });
    });

    html.querySelectorAll('[data-action="cmd-store"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        const store = new SWSEStore(this.actor);
        store.render(true);
      });
    });

    html.querySelectorAll('[data-action="cmd-conditions"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        // Switch to overview tab and scroll to health panel
        await this.activateTab("overview");
        const healthPanel = html.querySelector(".hp-condition-panel");
        if (healthPanel) {
          healthPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    html.querySelectorAll('[data-action="revalidate-build"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        await this._revalidateBuild();
      });
    });

    // Inventory Panel Handlers
    this._activateInventoryUI(html);

    // SWSE Combat UI Wiring
    this._activateCombatUI(html);

    // Skills Panel Handlers
    this._activateSkillsUI(html);

    // Force Suite Handlers
    this._activateForceUI(html);

    // Feats/Talents Handlers
    this._activateAbilitiesUI(html);

    // Misc Handlers (languages, rest, DSP)
    this._activateMiscUI(html);
  }

  /* ============================================================
     UI PREVIEW MATH (NON-AUTHORITATIVE)
  ============================================================ */

  _previewAbilityRow(row) {
    if (!row) return;

    const base = Number(row.querySelector('[data-field="base"]')?.value || 0);
    const misc = Number(row.querySelector('[data-field="misc"]')?.value || 0);

    const total = base + misc;
    const mod = Math.floor((total - 10) / 2);

    const totalEl = row.querySelector(".math-result");
    const modEl = row.querySelector(".math-mod");

    if (totalEl) {
      totalEl.textContent = total;
      totalEl.classList.remove("result-positive","result-zero","result-negative");

      if (total > 0) totalEl.classList.add("result-positive");
      else if (total === 0) totalEl.classList.add("result-zero");
      else totalEl.classList.add("result-negative");
    }

    if (modEl) {
      modEl.textContent = mod >= 0 ? "+" + mod : mod;
    }
  }

  /* ============================================================
     FORCE ANIMATION HELPERS (UI ONLY)
  ============================================================ */

  _handleForceDiscardAnimation(itemId) {
    const card = document.querySelector(
      `.force-card[data-item-id="${itemId}"]`
    );
    if (!card) return;
    card.classList.add("discarding");
    setTimeout(() => card.classList.remove("discarding"), 500);
  }

  _handleForceRecoveryAnimation(itemIds = [], full = false) {
    const panel = document.querySelector(".force-panel");
    if (!panel) return;

    if (full) {
      panel.classList.add("force-recovery-burst");
      setTimeout(() => panel.classList.remove("force-recovery-burst"), 800);
    }

    itemIds.forEach(id => {
      const card = document.querySelector(
        `.force-card[data-item-id="${id}"]`
      );
      if (!card) return;

      card.classList.add("recovering");

      setTimeout(() => {
        card.classList.remove("recovering");
        card.classList.add("recovered");
        setTimeout(() => card.classList.remove("recovered"), 400);
      }, 500);
    });
  }

  /* ============================================================
     INVENTORY UI WIRING
  ============================================================ */

  _activateInventoryUI(html) {
    // Equip / Unequip toggle
    html.querySelectorAll(".item-equip").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.toggleEquip(this.actor, itemId);
      });
    });

    // Edit item
    html.querySelectorAll(".item-edit").forEach(button => {
      button.addEventListener("click", (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) this.actor.items.get(itemId)?.sheet.render(true);
      });
    });

    // Add/increment quantity
    html.querySelectorAll(".item-add").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.incrementQuantity(this.actor, itemId);
      });
    });

    // Sell item
    html.querySelectorAll(".item-sell").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.decrementQuantity(this.actor, itemId);
      });
    });

    // Delete/Remove item
    html.querySelectorAll('[data-action="delete"], [data-action="equip"], [data-action="edit"], [data-action="configure"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const action = button.dataset.action;
        const itemId = button.dataset.itemId || event.currentTarget.closest("[data-item-id]")?.dataset.itemId;

        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        switch (action) {
          case "delete":
            await item.delete();
            break;
          case "equip":
            await InventoryEngine.toggleEquip(this.actor, itemId);
            break;
          case "edit":
            item.sheet.render(true);
            break;
          case "configure":
            // For weapons: open a configuration dialog
            if (item.type === "weapon") {
              item.sheet.render(true); // For now, just open the item sheet
            }
            break;
        }
      });
    });
  }

  /* ============================================================
     COMBAT UI WIRING
  ============================================================ */

  _activateCombatUI(html) {
    // Action click (cards and table rows)
    html.querySelectorAll(".swse-combat-action-card, .action-row").forEach(element => {
      element.addEventListener("click", async (event) => {
        if (event.target.classList.contains("hide-action")) return;
        const key = event.currentTarget.dataset.actionKey;
        if (!key) return;

        const data = this.actor.flags?.swse?.combatActions?.[key];
        if (data) {
          new CombatRollConfigDialog(this.actor, data).render(true);
        }
      });
    });

    // Hide individual action
    html.querySelectorAll(".hide-action").forEach(button => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const el = event.currentTarget.closest(".swse-combat-action-card, .action-row");
        if (el) el.classList.add("collapsed");
      });
    });

    // Collapse group (table mode)
    html.querySelectorAll(".collapse-group").forEach(button => {
      button.addEventListener("click", (event) => {
        const groupKey = event.currentTarget.dataset.group;
        if (groupKey) {
          const table = html.querySelector(`table[data-group='${groupKey}']`);
          if (table) table.classList.toggle("collapsed");
        }
      });
    });

    // Use action button
    html.querySelectorAll('[data-action="swse-v2-use-action"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const actionId = button.dataset.actionId;
        if (!actionId) return;

        // Trigger action execution (typically a roll or effect)
        const data = this.actor.flags?.swse?.combatActions?.[actionId];
        if (data) {
          // Open the config dialog to show details before rolling
          new CombatRollConfigDialog(this.actor, data).render(true);
        }
      });
    });
  }

  /* ============================================================
     SKILLS UI WIRING
  ============================================================ */

  _activateSkillsUI(html) {
    // Filter skills by text
    html.querySelectorAll('[data-action="filter-skills"]').forEach(input => {
      input.addEventListener("input", (event) => {
        const filterText = event.target.value.toLowerCase();
        const skillRows = html.querySelectorAll(".skill-row-container");

        skillRows.forEach(row => {
          const skillName = row.dataset.name?.toLowerCase() || "";
          const skillLabel = row.dataset.label?.toLowerCase() || "";
          const matches = skillName.includes(filterText) || skillLabel.includes(filterText);
          row.style.display = matches ? "" : "none";
        });
      });
    });

    // Sort skills
    html.querySelectorAll('[data-action="sort-skills"]').forEach(select => {
      select.addEventListener("change", (event) => {
        const sortBy = event.target.value;
        const skillsList = html.querySelector(".skills-list");
        if (!skillsList) return;

        const rows = Array.from(skillsList.querySelectorAll(".skill-row-container"));
        rows.sort((a, b) => {
          switch (sortBy) {
            case "name":
              return (a.dataset.name || "").localeCompare(b.dataset.name || "");
            case "total-desc":
              return Number(b.dataset.total || 0) - Number(a.dataset.total || 0);
            case "trained":
              return (b.dataset.trained === "true" ? 1 : 0) - (a.dataset.trained === "true" ? 1 : 0);
            case "favorite":
              return (b.dataset.favorite === "true" ? 1 : 0) - (a.dataset.favorite === "true" ? 1 : 0);
            case "default":
            default:
              return 0;
          }
        });

        rows.forEach(row => skillsList.appendChild(row));
      });
    });
  }

  /* ============================================================
     FORCE SUITE UI WIRING
  ============================================================ */

  _activateForceUI(html) {
    // Force sort dropdown
    html.querySelectorAll('[data-action="force-sort"]').forEach(select => {
      select.addEventListener("change", (event) => {
        const sortBy = event.target.value;
        const cardGrid = html.querySelector(".force-card-grid");
        if (!cardGrid) return;

        const cards = Array.from(cardGrid.querySelectorAll(".force-card:not(.discarded)"));
        cards.sort((a, b) => {
          const aName = a.querySelector(".force-name")?.textContent || "";
          const aTagString = a.dataset.tags || "";
          const bName = b.querySelector(".force-name")?.textContent || "";
          const bTagString = b.dataset.tags || "";

          switch (sortBy) {
            case "tag":
              return aTagString.localeCompare(bTagString);
            case "name":
            default:
              return aName.localeCompare(bName);
          }
        });

        cards.forEach(card => cardGrid.appendChild(card));
      });
    });

    // Force tag filter buttons
    html.querySelectorAll('[data-action="force-tag-filter"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const tag = button.dataset.tag;
        if (!tag) return;

        // Toggle button active state
        button.classList.toggle("active");

        // Filter cards
        const activeFilters = Array.from(html.querySelectorAll('[data-action="force-tag-filter"].active'))
          .map(b => b.dataset.tag);

        const cards = html.querySelectorAll(".force-card:not(.discarded)");
        cards.forEach(card => {
          if (activeFilters.length === 0) {
            card.style.display = "";
          } else {
            const cardTags = (card.dataset.tags || "").split(" ");
            const matches = activeFilters.some(f => cardTags.includes(f));
            card.style.display = matches ? "" : "none";
          }
        });
      });
    });

    // Activate force button
    html.querySelectorAll('[data-action="activate-force"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const power = this.actor.items.get(itemId);
        if (!power || power.type !== "force-power") return;

        // Determine if this is a recovery or activation
        const isRecovery = power.system?.discarded ?? false;

        try {
          const result = await ForceExecutor.activateForce(this.actor, itemId, isRecovery);
          if (result.success) {
            ui?.notifications?.info?.(`${power.name} ${isRecovery ? "recovered" : "used"}`);
          }
        } catch (err) {
          console.error("Force activation failed:", err);
          ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
        }
      });
    });
  }

  /* ============================================================
     FEATS/TALENTS/ABILITIES UI WIRING
  ============================================================ */

  _activateAbilitiesUI(html) {
    // Open ability/feat/talent sheet
    html.querySelectorAll('[data-action="open-ability"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (item) {
          item.sheet.render(true);
        }
      });
    });

    // Add feat button
    html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Open a dialog to select/create a feat
        // For now, just open the item creation dialog
        const itemData = {
          type: "feat",
          name: "New Feat",
          system: {}
        };
        const doc = await Item.create(itemData, { parent: this.actor });
        if (doc) doc.sheet.render(true);
      });
    });

    // Delete feat button
    html.querySelectorAll('[data-action="delete-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (item) {
          await item.delete();
        }
      });
    });

    // Add talent button
    html.querySelectorAll('[data-action="add-talent"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Open a dialog to select a talent
        // For now, just open the item creation dialog
        const itemData = {
          type: "talent",
          name: "New Talent",
          system: {}
        };
        const doc = await Item.create(itemData, { parent: this.actor });
        if (doc) doc.sheet.render(true);
      });
    });
  }

  /* ============================================================
     MISCELLANEOUS UI WIRING (LANGUAGES, REST, DSP, ETC)
  ============================================================ */

  _activateMiscUI(html) {
    // Add language button
    html.querySelectorAll('[data-action="add-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Open a dialog for language selection
        const languages = this.actor.system?.languages ?? [];
        const newLang = prompt("Enter language name:");
        if (newLang) {
          const plan = {
            update: {
              "system.languages": [...languages, newLang]
            }
          };
          try {
            await ActorEngine.apply(this.actor, plan);
          } catch (err) {
            console.error("Failed to add language:", err);
            ui?.notifications?.error?.(`Failed to add language: ${err.message}`);
          }
        }
      });
    });

    // Remove language button
    html.querySelectorAll('[data-action="remove-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const langName = button.dataset.language;
        if (!langName) return;

        const languages = (this.actor.system?.languages ?? []).filter(l => l !== langName);
        const plan = {
          update: {
            "system.languages": languages
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
        } catch (err) {
          console.error("Failed to remove language:", err);
          ui?.notifications?.error?.(`Failed to remove language: ${err.message}`);
        }
      });
    });

    // Rest / Second Wind button
    html.querySelectorAll('[data-action="rest-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Restore second wind uses
        const plan = {
          update: {
            "system.secondWind": {
              current: this.actor.system?.secondWind?.max ?? 1
            }
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Second Wind restored!");
        } catch (err) {
          console.error("Rest failed:", err);
          ui?.notifications?.error?.(`Rest failed: ${err.message}`);
        }
      });
    });

    // Set dark side score button
    html.querySelectorAll('[data-action="set-dark-side-score"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const currentDSP = DSPEngine.getValue(this.actor);
        const newValue = prompt(`Current Dark Side Points: ${currentDSP}\n\nEnter new value:`, String(currentDSP));

        if (newValue !== null) {
          const value = Math.max(0, Math.min(Number(newValue) || 0, DSPEngine.getMax(this.actor)));
          const plan = {
            update: {
              "system.darkSidePoints": value
            }
          };

          try {
            await ActorEngine.apply(this.actor, plan);
          } catch (err) {
            console.error("Failed to set DSP:", err);
            ui?.notifications?.error?.(`Failed to set DSP: ${err.message}`);
          }
        }
      });
    });

    // Use extra skill button
    html.querySelectorAll('[data-action="use-extra-skill"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        if (!skillKey) return;

        // Increment extra skill uses
        const current = this.actor.system?.skills?.[skillKey]?.extra ?? 0;
        const plan = {
          update: {
            [`system.skills.${skillKey}.extra`]: current + 1
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.(`Extra skill use recorded for ${skillKey}`);
        } catch (err) {
          console.error("Failed to use extra skill:", err);
          ui?.notifications?.error?.(`Failed to use extra skill: ${err.message}`);
        }
      });
    });
  }

  /* ============================================================
     MENTOR CONVERSATION
  ============================================================ */

  _openMentorConversation() {
    const actor = this.actor;
    new MentorChatDialog(actor).render(true);
  }

  /* ============================================================
     DROP HANDLING (TAB-AGNOSTIC)
  ============================================================ */

  async _onDrop(event) {
    event.preventDefault();

    // Extract drag data
    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    // Check if this is an actor drop
    let droppedDocument = null;
    if (data.uuid) {
      try {
        droppedDocument = await fromUuid(data.uuid);
      } catch (err) {
        // Not a valid UUID, treat as item drop
      }
    }

    // ACTOR DROP: Check if GM can adopt
    if (droppedDocument && droppedDocument.documentName === 'Actor') {
      return this._handleActorDrop(droppedDocument);
    }

    // ITEM DROP: Use standard resolution
    const result = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!result || !result.mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, result.mutationPlan);
      // UI feedback: pulse the target tab
      if (result.uiTargetTab) {
        this._pulseTab(result.uiTargetTab);
      }
    } catch (err) {
      console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  /**
   * Handle actor drop: Show modal for GM, simple add for players
   *
   * @private
   * @param {Actor} droppedActor
   */
  async _handleActorDrop(droppedActor) {
    // Cross-type or player drop: only add (no adoption)
    if (droppedActor.type !== this.actor.type || !game.user.isGM) {
      return this._addActorRelationship(droppedActor);
    }

    // Same type + GM: show modal
    new AdoptOrAddDialog(droppedActor, async (choice) => {
      if (choice === "add") {
        await this._addActorRelationship(droppedActor);
      } else if (choice === "adopt") {
        await this._adoptActor(droppedActor);
      }
    }).render(true);
  }

  /**
   * Add actor as relationship (linked reference)
   *
   * @private
   * @param {Actor} actor
   */
  async _addActorRelationship(actor) {
    const relationships = this.actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);

    if (alreadyLinked) {
      console.debug(`Already linked: ${actor.name}`);
      return;
    }

    const mutationPlan = {
      update: {
        'system.relationships': [
          ...relationships,
          {
            uuid: actor.uuid,
            name: actor.name,
            type: actor.type
          }
        ]
      }
    };

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      console.error('Failed to add actor relationship:', err);
      ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
    }
  }

  /**
   * Adopt actor stat block (identity mutation)
   *
   * @private
   * @param {Actor} sourceActor
   */
  async _adoptActor(sourceActor) {
    const mutationPlan = AdoptionEngine.buildAdoptionPlan({
      targetActor: this.actor,
      sourceActor: sourceActor
    });

    if (!mutationPlan) {
      ui?.notifications?.warn?.(`Cannot adopt from ${sourceActor.name}`);
      return;
    }

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
      ui?.notifications?.info?.(`${this.actor.name} adopted stat block from ${sourceActor.name}`);
    } catch (err) {
      console.error('Adoption failed:', err);
      ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
    }
  }

  /**
   * Pulse tab for UI feedback on drop success
   *
   * @private
   * @param {string} tabName - tab identifier to pulse
   */
  _pulseTab(tabName) {
    if (!tabName) return;

    const tabButton = this.element?.querySelector(`[data-tab="${tabName}"]`);
    if (!tabButton) return;

    tabButton.classList.add('tab-pulse');

    setTimeout(() => {
      tabButton.classList.remove('tab-pulse');
    }, 800);
  }

  /**
   * Revalidate character build by switching from free build mode to normal mode.
   * This enforces prerequisites and restrictions that were bypassed in free build.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _revalidateBuild() {
    try {
      // Switch from free build mode to normal mode (prerequisites enforced)
      const plan = {
        update: {
          'system.buildMode': 'normal'
        }
      };

      await ActorEngine.apply(this.actor, plan);
      ui?.notifications?.info?.('Build revalidated — prerequisites now enforced');
    } catch (err) {
      console.error('Build revalidation failed:', err);
      ui?.notifications?.error?.(`Build revalidation failed: ${err.message}`);
    }
  }

  /**
   * Override form submission to route through ActorEngine governance layer.
   *
   * CRITICAL: This prevents Foundry's default submission pipeline entirely.
   * - Foundry V2: _onSubmitForm → #onSubmitDocumentForm → _prepareSubmitData → _processSubmitData → actor.update()
   * - Our override: event.preventDefault() → process data directly → ActorEngine.updateActor()
   *
   * Without this, governance layer violation occurs:
   * MutationInterceptor blocks actor.update(), validation fails, sheet breaks.
   *
   * @param {Event} event - Form submission event
   * @returns {Promise<void>}
   */
  async _onSubmitForm(event) {
    event.preventDefault();

    // Get the form element
    const form = event.target;

    // Convert FormData to plain object, then expand nested paths
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const expanded = foundry.utils.expandObject(formDataObj);

    if (!expanded) {return;}

    try {
      // Route directly through governance layer
      // This bypasses Foundry's _processSubmitData → actor.update() entirely
      await ActorEngine.updateActor(this.actor, expanded);
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}