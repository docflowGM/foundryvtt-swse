// scripts/framework/dd-engine.js
import { swseLogger } from "../utils/logger.js";
import { ActorEngine } from "../actors/engine/actor-engine.js";

export const DDEngine = {
  async handleCompendiumDrop(actor, packKey, docId) {
    try {
      const pack = game.packs.get(packKey);
      if (!pack) {
        ui.notifications?.error?.(`Compendium not found: ${packKey}`);
        return;
      }
      const doc = await pack.getDocument(docId);
      if (!doc) return;
      const itemData = doc.toObject();
      // Create item on actor
      const created = await actor.createEmbeddedDocuments("Item", [itemData]);
      // If item is droid/vehicle, map stats
      if (itemData.type === "droid" || itemData.type === "vehicle") {
        const mapping = {
          "system.hp.max": "system.hp.max",
          "system.armor.value": "system.armor.value",
          "system.speed": "system.speed"
        };
        const update = {};
        for (const [k,v] of Object.entries(mapping)) {
          const val = foundry.utils.getProperty(itemData, k);
          if (typeof val !== "undefined") foundry.utils.setProperty(update, v, val);
        }
        if (Object.keys(update).length) await globalThis.SWSE.ActorEngine.updateActor(actor, update);
        // Recalculate derived
        await ActorEngine.recalcAll(actor);
      }
      return created;
    } catch (err) {
      swseLogger.error("DDEngine.handleCompendiumDrop failed", err);
      ui.notifications?.error("Drop failed; see console");
    }
  }
};
