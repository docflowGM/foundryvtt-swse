// scripts/apps/levelup/npc-levelup-entry.js
import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isEpicOverrideEnabled } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { getNpcMode, getNpcProfileState } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";
import { evaluateNonheroicTransition } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/nonheroic-class-model.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class SWSENpcLevelUpEntry extends SWSEApplicationV2 {
  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/npc-levelup-entry.hbs' }
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
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
    const npcProfileState = getNpcProfileState(actor);
    const hasSnapshot = SnapshotManager.hasSnapshots(actor);
    const isBeast = npcProfileState?.legalProfile === 'beast' || npcProfileState?.kind === 'beast';
    const isMount = npcProfileState?.legalProfile === 'mount' || npcProfileState?.kind === 'mount';
    const isOwnerSynced = npcProfileState?.mode === 'owner-sync' || ['minion', 'privateer'].includes(npcProfileState?.kind);
    const isFollower = npcProfileState?.kind === 'follower' || npcProfileState?.legalProfile === 'follower';
    const progressionSubtype = isBeast ? 'beast'
      : isMount ? 'mount'
        : isFollower ? 'follower'
          : npcProfileState?.legalProfile === 'nonheroic' || npcProfileState?.kind === 'nonheroic'
            ? 'nonheroic'
            : npcProfileState?.legalProfile === 'heroic' || npcProfileState?.kind === 'heroic'
              ? 'heroic'
              : 'imported-statblock';

    // One canonical heroic/nonheroic transition policy (shared with ClassStep).
    const nonheroicTransition = evaluateNonheroicTransition({ heroicLevel: heroicLevels, nonheroicLevel: nonheroicLevels, target: 'nonheroic' });
    const heroicTransition = evaluateNonheroicTransition({ heroicLevel: heroicLevels, nonheroicLevel: nonheroicLevels, target: 'heroic' });
    const identityConflicts = npcProfileState?.identityConflicts ?? [];
    const requiresStatblockConversion = this._requiresStatblockConversion(npcProfileState);

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
      profile: npcProfileState,
      kindLabel: npcProfileState?.labels?.kind || 'NPC',
      sourceAuthorityLabel: npcProfileState?.labels?.sourceAuthority || 'Statblock',
      legalProfileLabel: npcProfileState?.labels?.legalProfile || 'Standard',
      progressionSubtype,
      isBeast,
      isMount,
      isFollower,
      isOwnerSynced,
      canManualLevel: !isOwnerSynced,
      hasSnapshot,
      isGM: !!game.user?.isGM,

      epicOverrideEnabled,
      heroicBlocked,
      heroicAdvisory,
      nonheroicBlocked,
      nonheroicAdvisory,

      // Transition policy: the entry never offers a route ClassStep cannot complete.
      nonheroicTransitionAllowed: nonheroicTransition.allowed,
      nonheroicTransitionReason: nonheroicTransition.reason,
      heroicTransitionAllowed: heroicTransition.allowed,
      identityConflicts,
      hasIdentityConflict: identityConflicts.length > 0,
      requiresStatblockConversion,

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

  /**
   * Statblock-authoritative NPC (imported/Play Mode): its published HP,
   * defenses, BAB and attacks stay authoritative until the GM explicitly
   * converts it to calculated progression.
   */
  _requiresStatblockConversion(profile = getNpcProfileState(this.actor)) {
    if (!profile) return false;
    const dependent = ['beast', 'mount', 'follower', 'minion', 'privateer'].includes(profile.kind);
    if (dependent || profile.mode === 'owner-sync') return false;
    return profile.sourceAuthority === 'statblock' || profile.mode === 'play' || profile.imported === true;
  }

  /**
   * Gate every manual advancement: contradictory identity blocks; a
   * statblock NPC needs explicit GM authorization, then (with the pre-level
   * snapshot already taken by the caller) the authority is switched through
   * ActorEngine so the decision is persisted and every consumer (sheet,
   * entry, finalizer, derived calc) reads the same authority.
   * @returns {Promise<boolean>} true when progression may start
   */
  async _authorizeProgressionStart(target) {
    const profile = getNpcProfileState(this.actor);
    if (profile?.identityConflicts?.length) {
      ui.notifications.warn(`${profile.identityConflicts.map(c => c.message).join(' ')} Resolve this in NPC Legal Review & Repair before advancing.`);
      return false;
    }
    if (!this._requiresStatblockConversion(profile)) return true;

    const ok = await SWSEDialogV2.confirm({
      title: 'Convert Statblock NPC to Calculated Progression?',
      content: `<p><strong>${foundry.utils.escapeHTML?.(this.actor?.name ?? 'This NPC') ?? 'This NPC'}</strong> uses its published statblock values as authority.</p>
        <p>Continuing makes it a <strong>${target}</strong> NPC with <strong>calculated</strong> HP, defenses, BAB and attacks. A snapshot is saved first; use <em>Revert to Statblock</em> to restore the published values.</p>`
    });
    if (!ok) return false;

    await SnapshotManager.createSnapshot(this.actor, `Statblock before conversion to ${target} progression`);
    // Declared identity must agree with the embedded class records: existing
    // class history wins (a Nonheroic NPC taking its first heroic class stays
    // 'nonheroic' until that class exists); only a classless NPC takes the target.
    const identityKind = profile.hasClassItems && ['heroic', 'nonheroic'].includes(profile.kind) ? profile.kind : target;
    await ActorEngine.updateActor(this.actor, {
      'system.npcProfile.kind': identityKind,
      'system.npcProfile.legalProfile': identityKind,
      'system.npcProfile.mode': 'progression',
      'system.npcProfile.sourceAuthority': 'progression',
      'system.npcProfile.legalReview.statblockConversion': {
        convertedAt: new Date().toISOString(),
        convertedBy: game.user?.id ?? null,
        fromAuthority: profile.sourceAuthority,
        fromMode: profile.mode,
      },
    }, {
      source: 'npc-levelup-entry.statblock-conversion',
      render: false,
      suppressAppRefresh: true,
      meta: { guardKey: `npc-statblock-conversion:${this.actor.id}` },
    });
    return true;
  }

  _getNpcProgressionSubtype(preferred = null) {
    const profile = getNpcProfileState(this.actor);
    if (preferred === 'heroic') return 'heroic';
    if (preferred === 'nonheroic') {
      if (profile?.kind === 'beast' || profile?.legalProfile === 'beast') return 'beast';
      if (profile?.kind === 'mount' || profile?.legalProfile === 'mount') return 'mount';
      return 'nonheroic';
    }
    if (profile?.kind === 'beast' || profile?.legalProfile === 'beast') return 'beast';
    if (profile?.kind === 'mount' || profile?.legalProfile === 'mount') return 'mount';
    if (profile?.kind === 'follower' || profile?.legalProfile === 'follower') return 'follower';
    if (profile?.kind === 'nonheroic' || profile?.legalProfile === 'nonheroic') return 'nonheroic';
    if (profile?.kind === 'heroic' || profile?.legalProfile === 'heroic') return 'heroic';
    return 'imported-statblock';
  }

  _isOwnerSyncedNpc() {
    const profile = getNpcProfileState(this.actor);
    return profile?.mode === 'owner-sync' || ['minion', 'privateer'].includes(profile?.kind);
  }

  async _handleHeroic() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}
    if (this._isOwnerSyncedNpc()) {
      return ui.notifications.info('Owner-synced minions/privateers do not level manually. Update the owner or sync from Allies instead.');
    }

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const heroicNext = (Number(heroicLevel) || 0) + 1;

    if (heroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn('Epic Override required to take Heroic levels beyond 20.');
    }

    if ((Number(nonheroicLevel) || 0) > 0) {
      const ok = await SWSEDialogV2.confirm({
        title: 'Add Heroic Level?',
        content: '<p>This NPC already has nonheroic levels. A nonheroic character may multiclass into a heroic class (Core Rulebook p.277); its nonheroic levels stay in its class history. Continue?</p>'
      });
      if (!ok) {return;}
    }

    try {
      if (!(await this._authorizeProgressionStart('heroic'))) return;
      const nextLevel = (Number(this.actor.system?.level) || 1) + 1;
      await SnapshotManager.createSnapshot(this.actor, `Before Heroic Level-Up to ${nextLevel}`);

      this.close();
      await launchProgression(this.actor, {
        subtype: this._getNpcProgressionSubtype('heroic'),
        source: 'npc-levelup-entry.heroic',
        npcProgression: true
      });
    } catch (err) {
      SWSELogger.error('Heroic level-up failed:', err);
      ui.notifications.error('Failed to open heroic level-up.');
    }
  }

  async _handleNonheroic() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}
    if (this._isOwnerSyncedNpc()) {
      return ui.notifications.info('Owner-synced minions/privateers do not level manually. Update the owner or sync from Allies instead.');
    }

    const { heroicLevel, nonheroicLevel } = getLevelSplit(this.actor);
    const epicOverrideEnabled = isEpicOverrideEnabled();
    const nonheroicNext = (Number(nonheroicLevel) || 0) + 1;

    if (nonheroicNext > 20 && !epicOverrideEnabled) {
      return ui.notifications.warn('Epic Override required to take Nonheroic levels beyond 20.');
    }

    // Same policy ClassStep enforces: reject unsupported transitions BEFORE
    // opening the shell so nothing is offered that cannot be completed.
    const transition = evaluateNonheroicTransition({ heroicLevel, nonheroicLevel, target: 'nonheroic' });
    if (!transition.allowed) {
      return ui.notifications.warn(transition.reason);
    }

    try {
      if (!(await this._authorizeProgressionStart('nonheroic'))) return;
      const nextLevel = (Number(this.actor.system?.level) || 1) + 1;
      await SnapshotManager.createSnapshot(this.actor, `Before Nonheroic Level-Up to ${nextLevel}`);

      this.close();
      await launchProgression(this.actor, {
        subtype: this._getNpcProgressionSubtype('nonheroic'),
        source: 'npc-levelup-entry.nonheroic',
        npcProgression: true
      });
    } catch (err) {
      SWSELogger.error('Nonheroic level-up failed:', err);
      ui.notifications.error('Failed to open nonheroic level-up.');
    }
  }

  async _handleRevert() {
    if (!game.user?.isGM) {return ui.notifications.warn('GM only.');}

    const snapshotInfo = SnapshotManager.getLatestSnapshotInfo(this.actor);
    if (!snapshotInfo) {
      return ui.notifications.warn('No snapshot available to revert to.');
    }

    const ok = await SWSEDialogV2.confirm({
      title: 'Revert NPC to Statblock Snapshot',
      content: `<p>This restores the NPC to: <strong>${snapshotInfo.label}</strong> (${snapshotInfo.date})</p><p>Items, effects, and all attributes will be restored exactly.</p>`
    });
    if (!ok) {return;}

    try {
      await SnapshotManager.revertToLatestSnapshot(this.actor);
      this.close();
    } catch (err) {
      SWSELogger.error('Snapshot revert failed:', err);
      ui.notifications.error('Failed to revert NPC to snapshot.');
    }
  }
}

export default SWSENpcLevelUpEntry;