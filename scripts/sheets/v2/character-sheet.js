import { ActorEngine } from "../../governance/actor-engine/actor-engine.js";
import { InventoryEngine } from "../../engine/inventory/InventoryEngine.js";
import { CombatRollConfigDialog } from "../../apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "../../mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "../../engines/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "../../engines/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "../../apps/adopt-or-add-dialog.js";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    }
  };

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ["swse", "swse-character-sheet"],
      width: 900,
      height: 950,
      resizable: true
    };
  }

  constructor(document, options = {}) {
    super(document, options);
  }

  /* ============================================================
     PREPARE CONTEXT (PURE ORCHESTRATION)
  ============================================================ */

  async _prepareContext(options) {
    const actor = this.document;
    const context = await super._prepareContext(options);

    // Authoritative derived state (populated by character-actor.js computeCharacterDerived)
    const derived = actor.system?.derived ?? {};

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

    // Force suite context (hand/discard zones + tag filtering)
    const forcePowers = (actor?.items ?? []).filter(i => i.type === 'force-power');
    const forceTags = [...new Set(forcePowers.flatMap(p => p.system?.tags ?? []))].sort();
    const forceSuite = {
      hand: forcePowers.filter(p => !p.system?.discarded),
      discard: forcePowers.filter(p => p.system?.discarded)
    };

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
      forceTags,
      forceSuite,
      lowHand: forceSuite.hand.length > 5
    };
  }

  /* ============================================================
     BONUS HP COMPUTATION (DERIVED-ONLY)
  ============================================================ */

  async _computeBonusHP(actor) {
    try {
      const { ModifierEngine } = await import("../../engines/effects/modifiers/ModifierEngine.js").catch(
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
    super.activateListeners(html);

    // Toggle Abilities Panel
    html.on("click", "[data-action='toggle-abilities']", ev => {
      const panel = html.find(".abilities-panel");
      const button = html.find(".abilities-toggle");
      panel.toggleClass("expanded");
      button.text(panel.hasClass("expanded") ? "Less" : "More");
    });

    // Toggle Defenses Panel
    html.on("click", "[data-action='toggle-defenses']", ev => {
      const panel = html.find(".defenses-panel");
      const button = html.find(".defenses-toggle");
      panel.toggleClass("expanded");
      button.text(panel.hasClass("expanded") ? "Less" : "More");
    });

    // UI-only preview math for ability pills
    html.on("input", ".ability-expanded input", ev => {
      const row = ev.currentTarget.closest(".ability-row");
      this._previewAbilityRow(row);
    });

    // Force Card Flip
    html.on("click", ".force-card", ev => {
      ev.currentTarget.classList.toggle("flipped");
    });

    html.on("click", ".flip-back", ev => {
      ev.stopPropagation();
      ev.currentTarget.closest(".force-card")
        .classList.remove("flipped");
    });

    // Mentor Button
    html.on("click", '[data-action="open-mentor"]', (ev) => {
      ev.preventDefault();
      this._openMentorConversation();
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
    html.on("click", ".item-equip", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row.dataset.itemId;
      await InventoryEngine.toggleEquip(this.actor, itemId);
    });

    // Edit item
    html.on("click", ".item-edit", (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row.dataset.itemId;
      this.actor.items.get(itemId)?.sheet.render(true);
    });

    // Add/increment quantity
    html.on("click", ".item-add", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row.dataset.itemId;
      await InventoryEngine.incrementQuantity(this.actor, itemId);
    });

    // Sell item
    html.on("click", ".item-sell", async (event) => {
      const row = event.currentTarget.closest(".inventory-row");
      const itemId = row.dataset.itemId;
      // TODO: Integrate with StoreEngine when implemented
      await InventoryEngine.decrementQuantity(this.actor, itemId);
    });
  }

  /* ============================================================
     COMBAT UI WIRING
  ============================================================ */

  _activateCombatUI(html) {
    // Action click (cards and table rows)
    html.on("click", ".swse-combat-action-card, .action-row", async (event) => {
      if (event.target.classList.contains("hide-action")) return;
      const key = event.currentTarget.dataset.actionKey;
      const actionData = this.actor.getFlag("swse", "combatActions")?.[key];
      if (actionData) {
        new CombatRollConfigDialog(this.actor, actionData).render(true);
      }
    });

    // Hide individual action
    html.on("click", ".hide-action", (event) => {
      event.stopPropagation();
      const el = event.currentTarget.closest(".swse-combat-action-card, .action-row");
      el.classList.add("collapsed");
    });

    // Collapse group (table mode)
    html.on("click", ".collapse-group", (event) => {
      const groupKey = event.currentTarget.dataset.group;
      const table = html.find(`table[data-group='${groupKey}']`);
      table.toggleClass("collapsed");
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
    const mutationPlan = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
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
}