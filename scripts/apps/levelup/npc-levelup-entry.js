// scripts/apps/levelup/npc-levelup-entry.js
import SWSEApplicationV2 from "../base/swse-application-v2.js";
import { SWSELogger } from "../../utils/logger.js";
import { isEpicOverrideEnabled } from "../../settings/epic-override.js";
import { getLevelSplit } from "../../actors/derived/level-split.js";
import { ensureNpcProgressionMode, revertNpcToStatblock, levelUpNpcNonheroic } from "../../engine/npc-levelup.js";
import { SWSELevelUpEnhanced } from "./levelup-enhanced.js";

export class SWSENpcLevelUpEntry extends SWSEApplicationV2 {
  static PARTS = {
    main: { template: "systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs" }
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "swse-npc-levelup-entry",
    position: { width: 560, height: "auto" },
    window: { title: "NPC Level Up", resizable: true, draggable: true, frame: true }
  });

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this._boundElement = null;
  }

  async _prepareContext() {
    const actor = this.actor;

    const { heroicLevel: heroicLevels, nonheroicLevel: nonheroicLevels, totalLevel } = getLevelSplit(actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();

    const heroicNext = (Number(heroicLevels) || 0) + 1;
    const nonheroicNext = (Number(nonheroicLevels) || 0) + 1;

    const heroicBlocked = heroicNext > 20 && !epicOverrideEnabled;
    const heroicAdvisory = heroicNext > 20 && epicOverrideEnabled;

    const nonheroicBlocked = nonheroicNext > 20 && !epicOverrideEnabled;
    const nonheroicAdvisory = nonheroicNext > 20 && epicOverrideEnabled;

    const mode = actor?.getFlag("swse", "npcLevelUp.mode") ?? "statblock";
    const hasSnapshot = !!actor?.getFlag("swse", "npcLevelUp.snapshot");

    return {
      actorName: actor?.name ?? "NPC",
      totalLevel: Number(actor?.system?.level) || Number(totalLevel) || 1,
      heroicLevels: Number(heroicLevels) || 0,
      nonheroicLevels: Number(nonheroicLevels) || 0,
      mode,
      hasSnapshot,
      isGM: !!game.user?.isGM,

      epicOverrideEnabled,
      heroicBlocked,
      heroicAdvisory,
      nonheroicBlocked,
      nonheroicAdvisory
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const el = this.element;
    if (!el) return;

    if (this._boundElement === el) return;
    this._boundElement = el;

    el.addEventListener("click", async (ev) => {
      const btn = ev?.target?.closest?.("[data-action]");
      if (!btn) return;
      ev?.preventDefault?.();

      const action = String(btn.dataset.action ?? "").trim();
      if (!action) return;

      try {
        switch (action) {
          case "heroic":
            await this._handleHeroic();
            break;
          case "nonheroic":
            await this._handleNonheroic();
            break;
          case "revert":
            await this._handleRevert();
            break;
          case "cancel":
            this.close();
            break;
        }
      } catch (err) {
        SWSELogger.error("NPC level-up entry action failed:", err);
        ui.notifications.error("NPC level-up action failed.");
      }
    });
  }

  async _handleHeroic() {
    if (!game.user?.isGM) return ui.notifications.warn("GM only.");

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const heroicNext = (Number(heroicLevel) || 0) + 1;

    if (heroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn("Epic Override required to take Heroic levels beyond 20.");
    }

    if ((Number(nonheroicLevel) || 0) > 0) {
      const ok = await Dialog.confirm({
        title: "Add Heroic Level?",
        content: "<p>This NPC already has nonheroic levels. Mixed progression is legal but uncommon. Continue?</p>"
      });
      if (!ok) return;
    }

    await ensureNpcProgressionMode(this.actor, { track: "heroic" });
    this.close();
    new SWSELevelUpEnhanced(this.actor).render(true);
  }

  async _handleNonheroic() {
    if (!game.user?.isGM) return ui.notifications.warn("GM only.");

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const nonheroicNext = (Number(nonheroicLevel) || 0) + 1;

    if (nonheroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn("Epic Override required to take Nonheroic levels beyond 20.");
    }

    if ((Number(heroicLevel) || 0) > 0) {
      const ok = await Dialog.confirm({
        title: "Add Nonheroic Level?",
        content: "<p>This NPC already has heroic levels. Mixed progression is legal but uncommon. Continue?</p>"
      });
      if (!ok) return;
    }

    await ensureNpcProgressionMode(this.actor, { track: "nonheroic" });
    this.close();
    await levelUpNpcNonheroic(this.actor);
  }

  async _handleRevert() {
    if (!game.user?.isGM) return ui.notifications.warn("GM only.");

    const ok = await Dialog.confirm({
      title: "Revert NPC to Statblock Snapshot",
      content: "<p>This restores the NPC exactly to the snapshot taken before the first level-up (including items and effects).</p>"
    });
    if (!ok) return;

    await revertNpcToStatblock(this.actor);
    this.close();
  }
}

export default SWSENpcLevelUpEntry;
