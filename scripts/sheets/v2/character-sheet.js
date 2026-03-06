import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { CombatRollConfigDialog } from "/systems/foundryvtt-swse/scripts/apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";

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

    // Normalize critical derived structures to prevent undefined path errors in templates
    derived.talents ??= {};
    derived.talents.groups ??= [];
    derived.talents.list ??= [];

    derived.skills ??= [];

    derived.attacks ??= {};
    derived.attacks.list ??= [];

    derived.identity ??= {};
    derived.identity.halfLevel ??= 0;

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
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const ABILITY_LABELS = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma'
    };
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
      identityGlowColor
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

    // Inventory Panel Handlers
    this._activateInventoryUI(html);

    // SWSE Combat UI Wiring
    this._activateCombatUI(html);
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