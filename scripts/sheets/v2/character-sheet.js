import { ActorEngine } from "../../governance/actor-engine/actor-engine.js";
import { InventoryEngine } from "../../engine/inventory/InventoryEngine.js";
import { CombatRollConfigDialog } from "../../apps/combat/combat-roll-config-dialog.js";

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

    // Authoritative derived state from engine layer
    const derived = ActorEngine.buildDerivedState
      ? ActorEngine.buildDerivedState(actor)
      : actor.system?.derived ?? {};

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

    return {
      ...context,
      biography,
      derived,
      inventory
    };
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
}