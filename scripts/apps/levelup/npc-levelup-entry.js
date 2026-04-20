// scripts/apps/levelup/npc-levelup-entry.js
import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isEpicOverrideEnabled } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { NpcProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { getNpcMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";

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

    const mode = getNpcMode(actor);
    const hasSnapshot = NpcProgressionEngine.hasSnapshot(actor);

    // Phase 5: Progression summary for status block
    const classes = actor.items?.filter(i => i.type === 'class') || [];
    const classNames = classes.map(c => c.name || 'Unnamed Class').filter(Boolean);
    const classCount = classes.length;
    const hasMixedProgressionTracks = Number(heroicLevels) > 0 && Number(nonheroicLevels) > 0;

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
      nonheroicAdvisory,

      // Phase 5: Progression summary fields
      classCount,
      classNames,
      hasMixedProgressionTracks
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
      const nextLevel = (Number(this.actor.system?.level) || 1) + 1;
      await SnapshotManager.createSnapshot(this.actor, `Before Heroic Level-Up to ${nextLevel}`);

      this.close();
      await launchProgression(this.actor, {
        subtype: 'actor',
        source: 'npc-levelup-entry.heroic'
      });
    } catch (err) {
      SWSELogger.error('Heroic level-up failed:', err);
      ui.notifications.error('Failed to open heroic level-up.');
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
      const nextLevel = (Number(this.actor.system?.level) || 1) + 1;
      await SnapshotManager.createSnapshot(this.actor, `Before Nonheroic Level-Up to ${nextLevel}`);

      this.close();
      await launchProgression(this.actor, {
        subtype: 'nonheroic',
        source: 'npc-levelup-entry.nonheroic'
      });
    } catch (err) {
      SWSELogger.error('Nonheroic level-up failed:', err);
      ui.notifications.error('Failed to open nonheroic level-up.');
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