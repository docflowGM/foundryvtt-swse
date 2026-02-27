// scripts/apps/levelup/npc-levelup-entry.js
import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isEpicOverrideEnabled } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { NpcProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js";
import { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-enhanced.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

export class SWSENpcLevelUpEntry extends SWSEApplicationV2 {
  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs' }
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: 'swse-npc-levelup-entry',
    position: { width: 560, height: 'auto' },
    window: { title: 'NPC Level Up', resizable: true, draggable: true, frame: true }
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

    const mode = actor?.getFlag('foundryvtt-swse', 'npcLevelUp.mode') ?? 'statblock';
    const hasSnapshot = NpcProgressionEngine.hasSnapshot(actor);

    return {
      actorName: actor?.name ?? 'NPC',
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
    if (!el) {return;}

    if (this._boundElement === el) {return;}
    this._boundElement = el;

    el.addEventListener('click', async (ev) => {
      const btn = ev?.target?.closest?.('[data-action]');
      if (!btn) {return;}
      ev?.preventDefault?.();

      const action = String(btn.dataset.action ?? '').trim();
      if (!action) {return;}

      try {
        switch (action) {
          case 'heroic':
            await this._handleHeroic();
            break;
          case 'nonheroic':
            await this._handleNonheroic();
            break;
          case 'revert':
            await this._handleRevert();
            break;
          case 'cancel':
            this.close();
            break;
        }
      } catch (err) {
        SWSELogger.error('NPC level-up entry action failed:', err);
        ui.notifications.error('NPC level-up action failed.');
      }
    });
  }

  async _handleHeroic() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const heroicNext = (Number(heroicLevel) || 0) + 1;

    if (heroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn('Epic Override required to take Heroic levels beyond 20.');
    }

    if ((Number(nonheroicLevel) || 0) > 0) {
      const ok = await SWSEDialogV2.confirm({
        title: 'Add Heroic Level?',
        content: '<p>This NPC already has nonheroic levels. Mixed progression is legal but uncommon. Continue?</p>'
      });
      if (!ok) {return;}
    }

    try {
      // Build heroic progression packet through NPC engine
      const packet = await NpcProgressionEngine.buildHeroicLevelPacket(this.actor, {
        createSnapshot: true
      });

      // Apply through unified ActorEngine for governance
      await NpcProgressionEngine.applyProgression(this.actor, packet);

      // Close this dialog and open full level-up UI
      this.close();
      new SWSELevelUpEnhanced(this.actor).render(true);
    } catch (err) {
      SWSELogger.error('Heroic level-up failed:', err);
      ui.notifications.error('Failed to apply heroic level-up.');
    }
  }

  async _handleNonheroic() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const nonheroicNext = (Number(nonheroicLevel) || 0) + 1;

    if (nonheroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn('Epic Override required to take Nonheroic levels beyond 20.');
    }

    if ((Number(heroicLevel) || 0) > 0) {
      const ok = await SWSEDialogV2.confirm({
        title: 'Add Nonheroic Level?',
        content: '<p>This NPC already has heroic levels. Mixed progression is legal but uncommon. Continue?</p>'
      });
      if (!ok) {return;}
    }

    try {
      // Build nonheroic progression packet through NPC engine
      const packet = await NpcProgressionEngine.buildNonheroicLevelPacket(this.actor, {
        createSnapshot: true
      });

      // Apply through unified ActorEngine for governance
      await NpcProgressionEngine.applyProgression(this.actor, packet);

      this.close();
    } catch (err) {
      SWSELogger.error('Nonheroic level-up failed:', err);
      ui.notifications.error('Failed to apply nonheroic level-up.');
    }
  }

  async _handleRevert() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}

    const snapshotInfo = NpcProgressionEngine.getSnapshotInfo(this.actor);
    if (!snapshotInfo) {
      return ui.notifications.warn('No snapshot available to revert to.');
    }

    const ok = await SWSEDialogV2.confirm({
      title: 'Revert NPC to Statblock Snapshot',
      content: `<p>This restores the NPC to: <strong>${snapshotInfo.label}</strong> (${snapshotInfo.date})</p><p>Items, effects, and all attributes will be restored exactly.</p>`
    });
    if (!ok) {return;}

    try {
      await NpcProgressionEngine.revertToSnapshot(this.actor);
      this.close();
    } catch (err) {
      SWSELogger.error('Snapshot revert failed:', err);
      ui.notifications.error('Failed to revert NPC to snapshot.');
    }
  }
}

export default SWSENpcLevelUpEntry;