// systems/swse/scripts/swse-levelup.js

import { SWSEActor } from "./swse-actor.js";
import { SWSEItem } from "./swse-item.js";

/**
 * Handles leveling up a character (adding class levels, feats, talents, etc.)
 * Patched to handle droids (no Constitution).
 */
export class SWSELevelUp {
  /**
   * Open the Level Up dialog for a given actor.
   * @param {Actor} actor - The actor leveling up.
   */
  static async open(actor) {
    const actorSys = actor.system;

    // Determine available classes
    const classPacks = game.packs.filter(p => p.metadata.name.includes("classes"));
    const classItems = [];
    for (let pack of classPacks) {
      const content = await pack.getDocuments();
      classItems.push(...content);
    }

    // Show available classes
    const classOptions = classItems.map(i => `<option value="${i.id}">${i.name}</option>`).join("");

    const dialogContent = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("SWSE.LevelUp.chooseClass")}</label>
          <select name="classId">${classOptions}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("SWSE.LevelUp.hpChoice")}</label>
          <select name="hpChoice">
            <option value="roll">${game.i18n.localize("SWSE.LevelUp.roll")}</option>
            <option value="max">${game.i18n.localize("SWSE.LevelUp.max")}</option>
          </select>
        </div>
      </form>
    `;

    return new Promise(resolve => {
      new Dialog({
        title: game.i18n.localize("SWSE.LevelUp.title"),
        content: dialogContent,
        buttons: {
          ok: {
            label: game.i18n.localize("SWSE.LevelUp.confirm"),
            callback: async html => {
              const classId = html.find("[name=classId]").val();
              const hpChoice = html.find("[name=hpChoice]").val();
              await SWSELevelUp.apply(actor, classId, hpChoice);
              resolve(true);
            }
          },
          cancel: {
            label: game.i18n.localize("Cancel"),
            callback: () => resolve(false)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  /**
   * Apply level up logic
   */
  static async apply(actor, classId, hpChoice) {
    const actorSys = actor.system;

    // Get class definition
    const classItem = await fromUuid(`Compendium.${game.system.id}.swse-classes.${classId}`);
    if (!classItem) {
      ui.notifications.error("Class not found in compendium.");
      return;
    }

    const thisClassDef = classItem.system;

    // --- ATTRIBUTE HANDLING ---
    // utility to safely pull attribute values (handles droids w/o con)
    function getAttrValue(actorSys, key, fallback = 10) {
      const attPath = actorSys.attributes ?? {};
      return attPath[key]?.value ?? attPath[key] ?? fallback;
    }

    // build attributes (skip con if droid)
    const attributes = ["str", "dex", "int", "wis", "cha"];
    if (actorSys.attributes?.con) {
      attributes.splice(2, 0, "con");
    }

    const currentAttrs = {};
    for (let a of attributes) {
      currentAttrs[a] = getAttrValue(actorSys, a);
    }

    // --- HP CALCULATION ---
    let hitDie = thisClassDef?.hitDie ?? 6;
    const hasCon = !!actorSys.attributes?.con;

    const conBefore = hasCon ? getAttrValue(actorSys, "con") : null;
    const conModBefore = hasCon ? Math.floor((conBefore - 10) / 2) : 0;
    const conAfter = conBefore; // milestone handled separately
    const conModAfter = hasCon ? Math.floor((conAfter - 10) / 2) : 0;
    const conModDelta = hasCon ? conModAfter - conModBefore : 0;

    let hpGain = 0;
    if (hpChoice === "max") {
      hpGain = hitDie + conModAfter;
    } else {
      const roll = await (new Roll(`1d${hitDie}`)).evaluate({ async: true });
      hpGain = roll.total + conModAfter;
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `${actor.name} rolls hit points for new level`
      });
    }

    // --- CLASS LEVEL ---
    const newClassItem = classItem.toObject();
    await actor.createEmbeddedDocuments("Item", [newClassItem]);

    // --- UPDATE ACTOR HP ---
    await actor.update({
      "system.hp.max": (actorSys.hp.max ?? 0) + hpGain,
      "system.hp.value": (actorSys.hp.value ?? 0) + hpGain
    });

    // --- NOTIFICATION ---
    ui.notifications.info(`${actor.name} leveled up! Gained ${hpGain} HP.`);
  }
}
