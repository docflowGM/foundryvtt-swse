// ============================================
// FILE: scripts/swse-levelup.js
// ============================================
import { getClasses } from "./swse-data.js";

export class SWSELevelUp {
  static async open(actor) {
    const classes = await getClasses();
    const classOptions = classes.map(c => 
      `<option value="${c.name}">${c.name}</option>`
    ).join("");

    const dialogContent = `
      <form>
        <div class="form-group">
          <label>Choose Class</label>
          <select name="classId">${classOptions}</select>
        </div>
        <div class="form-group">
          <label>HP Method</label>
          <select name="hpChoice">
            <option value="roll">Roll</option>
            <option value="max">Max</option>
          </select>
        </div>
      </form>
    `;

    return new Promise(resolve => {
      new Dialog({
        title: "Level Up",
        content: dialogContent,
        buttons: {
          ok: {
            label: "Level Up",
            callback: async html => {
              const classId = html.find("[name=classId]").val();
              const hpChoice = html.find("[name=hpChoice]").val();
              await SWSELevelUp.apply(actor, classId, hpChoice);
              resolve(true);
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(false)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  static async apply(actor, className, hpChoice) {
    const classes = await getClasses();
    const classData = classes.find(c => c.name === className);
    if (!classData) {
      ui.notifications.error("Class not found!");
      return;
    }

    const hitDie = classData.hitDie || 6;
    const conMod = actor.system.abilities.con?.mod || 0;
    
    let hpGain = 0;
    if (hpChoice === "max") {
      hpGain = hitDie + conMod;
    } else {
      const roll = await new Roll(`1d${hitDie}`).evaluate({async: true});
      hpGain = roll.total + conMod;
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor}),
        flavor: `HP Roll for new level`
      });
    }

    // Create class item
    await actor.createEmbeddedDocuments("Item", [{
      name: className,
      type: "class",
      system: { 
        level: 1,
        hitDie: `1d${hitDie}`
      }
    }]);

    // Update actor
    await actor.update({
      "system.level": actor.system.level + 1,
      "system.hp.max": actor.system.hp.max + hpGain,
      "system.hp.value": actor.system.hp.value + hpGain
    });

    ui.notifications.info(`${actor.name} leveled up! Gained ${hpGain} HP.`);
  }
}