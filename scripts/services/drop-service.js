/**
 * ============================================================================
 * SWSE Unified Drop Service
 *
 * Single deterministic drag contract for all V2 sheets.
 * All sheet-level drops route through this service.
 *
 * Tab-level drag (Force/Maneuver reorder) = UI-only, handled in sheets
 * Sheet-level drag (Items/Actors)         = Document mutation, handled here
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* ITEM TYPE VALIDATION MATRIX                                                */
/* -------------------------------------------------------------------------- */

/**
 * Which item types each actor type accepts via drag & drop.
 * Types not listed here are rejected.
 */
const VALID_ITEM_TYPES = {
  character: [
    "weapon", "armor", "equipment", "feat", "talent", "skill",
    "forcePower", "forcepower", "force-power", "condition",
    "combat-action", "maneuver", "species", "class"
  ],
  npc: [
    "weapon", "armor", "equipment", "feat", "talent", "skill",
    "forcePower", "forcepower", "force-power", "condition",
    "combat-action", "species", "class"
  ],
  droid: [
    "weapon", "armor", "equipment", "feat", "talent", "skill",
    "condition", "combat-action", "class"
  ],
  vehicle: [
    "weapon", "armor", "equipment",
    "vehicleWeapon", "vehicleWeaponRange"
  ]
};

/**
 * Which actor types each sheet accepts as crew/owned references.
 * Vehicle crew: any character, NPC, or droid can crew a vehicle.
 */
const VALID_CREW_TYPES = {
  character: ["vehicle", "npc", "beast", "droid"],
  npc: [],
  droid: ["vehicle", "npc", "beast"],
  vehicle: ["character", "npc", "droid"]
};

/**
 * Actor types that trigger "sheet claim" (close current, open dropped).
 * Key = current sheet actor type, value = dropped actor types that claim.
 *
 * Vehicles never sheet-claim for character/NPC/droid — those always
 * become crew. Only vehicle→vehicle triggers claim.
 */
const SHEET_CLAIM_TYPES = {
  droid: ["droid"],
  npc: ["npc"],
  character: ["character"]
};

/* -------------------------------------------------------------------------- */
/* DROP SERVICE                                                               */
/* -------------------------------------------------------------------------- */

export class DropService {

  /**
   * Main entry point — route a drop event on any V2 sheet.
   *
   * @param {Event} event - The native drop event
   * @param {DocumentSheetV2} sheet - The sheet instance receiving the drop
   * @returns {Promise<boolean>} true if drop was handled
   */
  static async onDrop(event, sheet) {
    event.preventDefault();

    const data = TextEditor.getDragEventData(event);
    if (!data?.type) return false;

    const actor = sheet.document;
    if (!actor) return false;

    // Not editable = reject
    if (!sheet.isEditable) {
      ui.notifications.warn("This sheet is not editable.");
      return false;
    }

    switch (data.type) {
      case "Item":
        return DropService._handleItemDrop(data, event, actor);
      case "Actor":
        return DropService._handleActorDrop(data, event, actor, sheet);
      default:
        return false;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ITEM DROP                                                                */
  /* ------------------------------------------------------------------------ */

  /**
   * Handle an Item drop onto an actor sheet.
   *
   * - Compendium → create embedded copy
   * - Same actor → no-op (reorder is UI-only)
   * - Other actor → transfer (delete from source, create on target)
   */
  static async _handleItemDrop(data, event, targetActor) {
    const item = await fromUuid(data.uuid);
    if (!item) return false;

    // Validate item type for this actor
    if (!DropService._isValidItemForActor(item, targetActor)) {
      ui.notifications.warn(
        `Cannot add ${item.type} items to a ${targetActor.type} sheet.`
      );
      return false;
    }

    // Same actor — no-op (not a transfer)
    if (item.parent?.id === targetActor.id) return false;

    // Duplicate guard: reject if exact name+type already exists
    const existing = targetActor.items.find(
      i => i.name === item.name && i.type === item.type
    );
    if (existing) {
      ui.notifications.info(`${item.name} already exists on this sheet.`);
      return false;
    }

    // Build item data for creation
    const itemData = item.toObject();
    delete itemData._id;

    // Transfer from another actor (not compendium)
    const sourceActor = item.parent;
    if (sourceActor?.documentName === "Actor") {
      await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
    }

    // Create on target
    await targetActor.createEmbeddedDocuments("Item", [itemData]);

    const verb = sourceActor?.documentName === "Actor" ? "Transferred" : "Added";
    ui.notifications.info(`${verb} ${item.name} to ${targetActor.name}.`);
    return true;
  }

  /* ------------------------------------------------------------------------ */
  /* ACTOR DROP                                                               */
  /* ------------------------------------------------------------------------ */

  /**
   * Handle an Actor drop onto an actor sheet.
   *
   * Priority order:
   * 1. Crew/owned reference — if the dropped actor type is in VALID_CREW_TYPES
   *    for this sheet, add as crew/owned (vehicles always crew actors)
   * 2. Sheet claim — if same actor type dropped on same type sheet
   *    (e.g. vehicle→vehicle), close current and open dropped
   * 3. Reject — type not valid for this sheet
   */
  static async _handleActorDrop(data, event, targetActor, sheet) {
    const droppedActor = await fromUuid(data.uuid);
    if (!droppedActor) return false;

    // Self-drop guard
    if (droppedActor.id === targetActor.id) return false;

    // --- CREW / OWNED REFERENCE ---
    // Check crew eligibility FIRST. For vehicles this means
    // character, NPC, and droid always become crew — never sheet-claim.
    const crewTypes = VALID_CREW_TYPES[targetActor.type] || [];
    if (crewTypes.includes(droppedActor.type)) {
      // Duplicate guard
      const owned = [...(targetActor.system.ownedActors || [])];
      if (owned.find(o => o.id === droppedActor.id)) {
        ui.notifications.info(
          `${droppedActor.name} is already linked to ${targetActor.name}.`
        );
        return false;
      }

      owned.push({ id: droppedActor.id, type: droppedActor.type });
      await targetActor.update({ "system.ownedActors": owned });

      const label = targetActor.type === "vehicle" ? "crew member" : "owned actor";
      ui.notifications.info(`Added ${droppedActor.name} as ${label}.`);
      return true;
    }

    // --- SHEET CLAIM ---
    // Same type replaces the sheet (e.g. vehicle→vehicle opens dropped vehicle)
    const claimTypes = SHEET_CLAIM_TYPES[targetActor.type] || [];
    if (claimTypes.includes(droppedActor.type)) {
      sheet.close();
      droppedActor.sheet.render(true);
      return true;
    }

    // --- REJECT ---
    ui.notifications.warn(
      `Cannot add ${droppedActor.type} actors to a ${targetActor.type} sheet.`
    );
    return false;
  }

  /* ------------------------------------------------------------------------ */
  /* VALIDATION                                                               */
  /* ------------------------------------------------------------------------ */

  /**
   * Check if an item type is valid for a given actor type.
   */
  static _isValidItemForActor(item, actor) {
    const allowed = VALID_ITEM_TYPES[actor.type];
    if (!allowed) return false;
    return allowed.includes(item.type);
  }

  /* ------------------------------------------------------------------------ */
  /* VISUAL FEEDBACK — bind dragover/dragleave on sheet root                  */
  /* ------------------------------------------------------------------------ */

  /**
   * Bind drag visual feedback listeners on a sheet root element.
   * Call this from _onRender() in each sheet.
   *
   * @param {HTMLElement} root - The sheet root element
   */
  static bindDragFeedback(root) {
    if (!root || root.dataset.dropBound === "true") return;
    root.dataset.dropBound = "true";

    let dragCounter = 0;

    root.addEventListener("dragenter", (e) => {
      dragCounter++;
      root.classList.add("drop-active");
    });

    root.addEventListener("dragleave", (e) => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        root.classList.remove("drop-active");
      }
    });

    root.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    root.addEventListener("drop", () => {
      dragCounter = 0;
      root.classList.remove("drop-active");
    });

    // Zone-specific feedback
    for (const zone of root.querySelectorAll("[data-drop-zone]")) {
      zone.addEventListener("dragenter", (e) => {
        e.stopPropagation();
        zone.classList.add("drop-zone-active");
      });

      zone.addEventListener("dragleave", (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove("drop-zone-active");
        }
      });

      zone.addEventListener("drop", () => {
        zone.classList.remove("drop-zone-active");
      });
    }
  }
}
