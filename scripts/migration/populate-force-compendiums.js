import { SWSELogger } from "../utils/logger.js";

export class PopulateForceCompendiumsMigration {

  static MIGRATION_VERSION = "1.1.147";
  static MIGRATION_KEY = "forceCompendiumsPopulation";

  /* -------------------------------------------- */
  static _indexCount(index) {
    return index?.size ?? index?.length ?? Array.from(index ?? []).length;
  }

  /* -------------------------------------------- */
  static async _withUnlockedPack(pack, fn) {
    const wasLocked = !!pack.locked;

    if (wasLocked) {
      try {
        await pack.configure({ locked: false });
      } catch (err) {
        SWSELogger.warn(
          `SWSE | Cannot unlock compendium "${pack.collection}". Skipping write ops.`,
          err
        );
        return fn({ unlocked: false, wasLocked });
      }
    }

    try {
      return await fn({ unlocked: true, wasLocked });
    } finally {
      if (wasLocked) {
        try {
          await pack.configure({ locked: true });
        } catch (err) {
          SWSELogger.warn(
            `SWSE | Failed to re-lock compendium "${pack.collection}".`,
            err
          );
        }
      }
    }
  }

  /* -------------------------------------------- */
  static async needsMigration() {
    try {
      const v = game.settings.get(
        "foundryvtt-swse",
        this.MIGRATION_KEY
      );
      return v !== this.MIGRATION_VERSION;
    } catch {
      return true;
    }
  }

  /* -------------------------------------------- */
  static async markComplete() {
    await game.settings.set(
      "foundryvtt-swse",
      this.MIGRATION_KEY,
      this.MIGRATION_VERSION
    );
  }

  /* -------------------------------------------- */
  static async run() {
    if (!game.user.isGM) return;
    if (!(await this.needsMigration())) return;

    try {
      SWSELogger.log("SWSE | Force compendiums migration starting…");
      ui.notifications.info("Repairing & populating Force compendiums…");

      let created = 0;
      created += await this.populateForceTechniques();
      created += await this.populateForceSecrets();
      created += await this.populateLightsaberFormPowers();

      await this.markComplete();

      SWSELogger.log(
        `SWSE | Force compendiums migration complete (${created})`
      );
      ui.notifications.info(
        `Force compendiums repaired (${created} items).`
      );

    } catch (err) {
      SWSELogger.error(
        "SWSE | Force compendiums migration failed",
        err
      );
      ui.notifications?.error?.(
        "Force compendiums migration failed (see console). If compendiums are locked, unlock them and reload."
      );
    }
  }

  /* -------------------------------------------- */
  /** HARD FIX: purge corrupted entries */
  static async _purgeInvalidEntries(pack) {
    const index = await pack.getIndex();
    const badIds = [];

    for (const e of index) {
      const id = e?._id ?? e?.id;
      if (!id) continue;

      try {
        const doc = await pack.getDocument(id);
        if (!doc) badIds.push(id);
      } catch {
        badIds.push(id);
      }
    }

    if (!badIds.length) return;

    SWSELogger.warn(
      `SWSE | Purging ${badIds.length} corrupted entries from ${pack.collection}`
    );

    await this._withUnlockedPack(pack, async ({ unlocked }) => {
      if (!unlocked) return;
      await pack.documentClass.deleteDocuments(badIds, {
        pack: pack.collection
      });
    });
  }

  /* -------------------------------------------- */
  static async populateForceTechniques() {
    const pack = game.packs.get("foundryvtt-swse.forcetechniques");
    if (!pack) return 0;

    await this._purgeInvalidEntries(pack);
    if (this._indexCount(await pack.getIndex()) > 0) return 0;

    const data = await fetch(
      "systems/foundryvtt-swse/data/force-techniques.json"
    ).then(r => r.json());

    let created = 0;

    await this._withUnlockedPack(pack, async ({ unlocked }) => {
      if (!unlocked) return;

      for (const t of data.techniques) {
        try {
          const item = await Item.create({
            name: t.name,
            type: "feat",
            img: "systems/foundryvtt-swse/assets/icons/force-technique.png",
            system: {
              description: `<p>${t.description}</p>`,
              source: t.source || "",
              tags: ["force-technique"],
              prerequisites: (t.prerequisites || []).join(", "),
              relatedPower: t.relatedPower || ""
            }
          }, { temporary: true });

          await pack.importDocument(item);
          created++;
        } catch (err) {
          SWSELogger.error(`Force Technique failed: ${t.name}`, err);
        }
      }
    });

    return created;
  }

  /* -------------------------------------------- */
  static async populateForceSecrets() {
    const pack = game.packs.get("foundryvtt-swse.forcesecrets");
    if (!pack) return 0;

    await this._purgeInvalidEntries(pack);
    if (this._indexCount(await pack.getIndex()) > 0) return 0;

    const data = await fetch(
      "systems/foundryvtt-swse/data/force-secrets.json"
    ).then(r => r.json());

    let created = 0;

    await this._withUnlockedPack(pack, async ({ unlocked }) => {
      if (!unlocked) return;

      for (const s of data.secrets) {
        try {
          const item = await Item.create({
            name: s.name,
            type: "feat",
            img: "systems/foundryvtt-swse/assets/icons/force-secret.png",
            system: {
              description: `<p>${s.description}</p>`,
              source: s.source || "",
              tags: ["force-secret"],
              prerequisites: (s.prerequisites || []).join(", "),
              cost: s.cost
            }
          }, { temporary: true });

          await pack.importDocument(item);
          created++;
        } catch (err) {
          SWSELogger.error(`Force Secret failed: ${s.name}`, err);
        }
      }
    });

    return created;
  }

  /* -------------------------------------------- */
  static async populateLightsaberFormPowers() {
    const pack = game.packs.get(
      "foundryvtt-swse.lightsaberformpowers"
    );
    if (!pack) return 0;

    await this._purgeInvalidEntries(pack);
    if (this._indexCount(await pack.getIndex()) > 0) return 0;

    const data = await fetch(
      "systems/foundryvtt-swse/data/lightsaber-form-powers.json"
    ).then(r => r.json());

    let created = 0;

    await this._withUnlockedPack(pack, async ({ unlocked }) => {
      if (!unlocked) return;

      for (const p of data.powers) {
        try {
          const item = await Item.create({
            name: p.name,
            type: "feat",
            img: "systems/foundryvtt-swse/assets/icons/lightsaber-form-power.png",
            system: {
              description: `<p>${p.description}</p>`,
              source: p.source || "",
              tags: p.tags || ["lightsaber-form"],
              form: p.form || "",
              discipline: p.discipline || "",
              time: p.time || "",
              canRebuke: !!p.canRebuke
            }
          }, { temporary: true });

          await pack.importDocument(item);
          created++;
        } catch (err) {
          SWSELogger.error(
            `Lightsaber Form Power failed: ${p.name}`,
            err
          );
        }
      }
    });

    return created;
  }
}

/* -------------------------------------------- */
Hooks.once("init", () => {
  game.swse ??= {};
  game.swse.migrations ??= {};
  game.swse.migrations.populateForceCompendiums =
    PopulateForceCompendiumsMigration.run.bind(
      PopulateForceCompendiumsMigration
    );
});

Hooks.once("ready", async () => {
  if (game.user.isGM) {
    await PopulateForceCompendiumsMigration.run();
  }
});
