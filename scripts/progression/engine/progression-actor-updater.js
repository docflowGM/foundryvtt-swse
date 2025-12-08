/**
 * ActorProgressionUpdater.finalize(actor)
 * Converts canonical system.progression data into derived actor.system.* fields used by sheets.
 * Keep all derived-field writes here to avoid scattered writes across the codebase.
 */

export class ActorProgressionUpdater {
  static async finalize(actor) {
    const prog = actor.system.progression || {};
    const updates = {};

    // Copy progression.abilities -> system.attributes.* (example mapping; adapt to your sheet)
    const abilities = prog.abilities || {};
    if (abilities) {
      if (abilities.str !== undefined) updates["system.attributes.str.value"] = abilities.str;
      if (abilities.dex !== undefined) updates["system.attributes.dex.value"] = abilities.dex;
      if (abilities.con !== undefined) updates["system.attributes.con.value"] = abilities.con;
      if (abilities.int !== undefined) updates["system.attributes.int.value"] = abilities.int;
      if (abilities.wis !== undefined) updates["system.attributes.wis.value"] = abilities.wis;
      if (abilities.cha !== undefined) updates["system.attributes.cha.value"] = abilities.cha;
    }

    // Compute total level and simple HP example (replace with real rules)
    const totalLevel = (prog.classLevels || []).reduce((s, c) => s + (c.level||0), 0);
    updates["system.attributes.hp.max"] = totalLevel > 0 ? (5 + totalLevel * 5) : actor.system?.attributes?.hp?.max || 0;

    // Keep applied feats/talents as flags (you may want to create Item documents instead)
    updates["flags.swse.appliedFeats"] = prog.feats || [];
    updates["flags.swse.appliedTalents"] = prog.talents || [];

    if (Object.keys(updates).length) {
      await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
    }
  }
}
