/**
 * SWSE Hotbar Macro Generator
 * AUTO-GENERATED
 */

export class SWSEMacroGenerator {
  static async createMacro({ id, packId, actorId }) {
    const name = `SWSE: ${id}`;
    const command = `
      const actor = game.actors.get("${actorId}");
      const pack = game.packs.get("${packId}");
      const doc = await pack.getDocument("${id}");
      CONFIG.SWSE.Action.execute(actor, doc.system);
    `;

    let macro = game.macros.find(m => m.name === name);
    if (!macro) {
      macro = await Macro.create({
        name,
        type: "script",
        scope: "global",
        command,
        img: "icons/svg/combat.svg"
      });
    }

    return macro;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.MacroGenerator = SWSEMacroGenerator;
});
