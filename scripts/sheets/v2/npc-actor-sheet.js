import { SWSEV2CharacterLikeSheet } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js";
import { canUseActorSheetEditControls } from "/systems/foundryvtt-swse/scripts/sheets/v2/actor-sheet-base.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { NpcProfileBuilder } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-profile-builder.js";
import { buildNpcConceptAbilities, buildNpcConceptSheetContext, isNpcSheetWritablePath, isNpcStatblockAuthorityPath, isQuietNpcSheetPath } from "/systems/foundryvtt-swse/scripts/sheets/v2/npc/npc-sheet-helpers.js";
import { coerceSingleFieldValue } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
import { launchFollowerProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { NpcProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js";
import { ActorPerfDiagnostics } from "/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js";

/**
 * SWSEV2NpcSheet — the actor sheet controller for `type: "npc"` actors.
 *
 * Extends SWSEV2CharacterLikeSheet, which owns every listener/context method
 * shared by Character, NPC, and Droid actors (the ~130-listener chain,
 * activateListeners, combat/inventory/skills/force/abilities UI). This class
 * holds only the NPC-exclusive concept-sheet event wiring, field
 * persistence, and roll helpers that were proven NPC-only (each guards
 * `actor?.type !== 'npc'` internally, or was reachable only from an
 * `actor.type === 'npc'`-gated call site on the shared base).
 *
 * Do NOT add shared listener/context logic here — it belongs on
 * SWSEV2CharacterLikeSheet so Character/NPC/Droid keep sharing one
 * implementation.
 */
export class SWSEV2NpcSheet extends SWSEV2CharacterLikeSheet {

  /**
   * Override of SWSEV2CharacterLikeSheet's no-op default. Exact body of the
   * original inline `if (useNpcConceptSheet) { ... }` block from
   * _prepareContextForActorSheet, relocated verbatim.
   */
  _buildNpcConceptAbilitiesContext(context, actor) {
    try {
      const npcConceptAbilities = buildNpcConceptAbilities(actor);
      context.abilitiesPanel = npcConceptAbilities;
      context.abilities = npcConceptAbilities.abilities;
      context.conceptLayout = {
        ...(context.conceptLayout ?? {}),
        abilities: npcConceptAbilities.abilities,
        abilitiesTab: {
          entries: npcConceptAbilities.abilities
        }
      };
    } catch (err) {
      swseLogger.warn('[SWSEV2CharacterSheet] NPC concept ability context failed', {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message
      });
    }

    try {
      const npcProfile = NpcProfileBuilder.buildContext(actor);
      Object.assign(context, npcProfile);
    } catch (err) {
      swseLogger.warn('[SWSEV2CharacterSheet] NPC concept profile context failed', {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message
      });
    }
  }

  /**
   * Phase 6: override of SWSEV2CharacterLikeSheet's no-op default. Exact
   * body of the original inline `if (useNpcConceptSheet) { context.npcConcept
   * = ... }` block from _prepareContextForActorSheet, relocated verbatim
   * (only the parameter shape changed — from separate locals to one
   * options object, per the hook contract's JSDoc on the base method).
   */
  _buildNpcConceptSheetContext(actor, { context, derived, conceptLayout, actionEconomy } = {}) {
    try {
      return ActorPerfDiagnostics.time(
        ms => ActorPerfDiagnostics.recordSheetContext('npc-context-builder', ms),
        () => buildNpcConceptSheetContext(actor, {
          ...context,
          derived,
          conceptLayout,
          actionEconomy
        })
      );
    } catch (err) {
      swseLogger.warn('[SWSEV2NpcSheet] NPC concept sheet context failed', {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message
      });
      return {
        kind: 'npc',
        kindLabel: 'NPC',
        modeLabel: '',
        showModeBadge: false,
        summaryLine: [],
        defenseChips: [],
        showGmTab: game.user?.isGM === true
      };
    }
  }

  _wireNpcConceptSheetEvents(root, signal) {
    if (!(root instanceof HTMLElement) || this.actor?.type !== 'npc') return;

    this._wireNpcConceptFieldPersistence(root, signal);

    root.querySelectorAll('.swse-v2-condition-step').forEach((el) => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const rawStep = ev.currentTarget?.dataset?.step;
        const step = rawStep === 'helpless' ? 5 : Number(rawStep);
        if (!Number.isFinite(step)) return;
        try {
          if (typeof ActorEngine.setConditionStep === 'function') {
            await ActorEngine.setConditionStep(this.actor, step, 'npc-concept-condition-step');
          } else if (typeof this.actor?.setConditionTrackStep === 'function') {
            await this.actor.setConditionTrackStep(step);
          } else {
            await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step }, { source: 'npc-concept-condition-step' });
          }
        } catch (err) {
          swseLogger.error('[NPC Sheet] Condition update failed', { actor: this.actor?.name, step, error: err?.message });
          ui?.notifications?.error?.(`Condition update failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('.swse-v2-open-item').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        const item = itemId ? this.actor?.items?.get?.(itemId) : null;
        if (!item) {
          ui?.notifications?.warn?.('That NPC item could not be found.');
          return;
        }
        item.sheet?.render?.(true);
      }, { signal });
    });

    root.querySelectorAll('[data-action="roll-npc-weapon"], [data-action="roll-npc-statblock-attack"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        const item = itemId ? this.actor?.items?.get?.(itemId) : null;
        try {
          if (item) {
            await this._runCanonicalAttackWithPreroll(item, {
              source: 'npc-concept-attack',
              sourceElement: ev.currentTarget,
              companionSource: ev.currentTarget,
              sheet: this,
              showRollCompanion: true
            });
            return;
          }

          const bonus = this._parseNpcSheetSignedNumber(ev.currentTarget?.dataset?.attackBonus);
          if (bonus === null) {
            ui?.notifications?.warn?.('This imported NPC attack does not have a parsable attack bonus yet.');
            return;
          }

          const allowed = await this._applyActionEconomy?.('standard', {
            source: 'npc-statblock-attack',
            attackName: ev.currentTarget?.dataset?.attackName || 'Statblock Attack'
          });
          if (allowed === false) return;

          const formula = bonus >= 0 ? `1d20 + ${bonus}` : `1d20 - ${Math.abs(bonus)}`;
          await this._rollNpcSheetFlatFormula(formula, {
            title: `${ev.currentTarget?.dataset?.attackName || 'Statblock Attack'} Attack`,
            kind: 'npc-statblock-attack',
            sourceElement: ev.currentTarget
          });
        } catch (err) {
          swseLogger.error('[NPC Sheet] Attack roll failed', { actor: this.actor?.name, error: err?.message });
          ui?.notifications?.error?.(`NPC attack roll failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="roll-npc-statblock-damage"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const formula = this._normalizeNpcSheetDiceFormula(ev.currentTarget?.dataset?.damageFormula);
        if (!formula) {
          ui?.notifications?.warn?.('This imported NPC attack does not have a parsable damage formula yet.');
          return;
        }
        try {
          await this._rollNpcSheetFlatFormula(formula, {
            title: `${ev.currentTarget?.dataset?.attackName || 'Statblock Attack'} Damage`,
            kind: 'npc-statblock-damage',
            sourceElement: ev.currentTarget
          });
        } catch (err) {
          swseLogger.error('[NPC Sheet] Damage roll failed', { actor: this.actor?.name, error: err?.message });
          ui?.notifications?.error?.(`NPC damage roll failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="roll-skill"][data-statblock-total]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const skillKey = ev.currentTarget?.dataset?.skill;
        if (!skillKey) return;
        try {
          const total = this._parseNpcSheetSignedNumber(ev.currentTarget?.dataset?.statblockTotal);
          if (total === null) {
            await this._runCanonicalSkillCheck(skillKey, {
              sourceElement: ev.currentTarget,
              companionSource: ev.currentTarget,
              sheet: this,
              showRollCompanion: true
            });
            return;
          }

          const label = ev.currentTarget?.dataset?.skillLabel || this._labelSkillKey?.(skillKey) || skillKey;
          const dialogResult = await showRollModifiersDialog({
            title: `${label} Check`,
            rollType: 'skill',
            actor: this.actor,
            skillKey,
            sourceElement: ev.currentTarget,
            sheet: this
          });
          if (dialogResult === null) return;

          const extra = Number(dialogResult?.customModifier || 0) || 0;
          const finalBonus = total + extra;
          const formula = finalBonus >= 0 ? `1d20 + ${finalBonus}` : `1d20 - ${Math.abs(finalBonus)}`;
          await this._rollNpcSheetFlatFormula(formula, {
            title: `${label} Check`,
            kind: 'npc-statblock-skill',
            sourceElement: ev.currentTarget
          });
        } catch (err) {
          swseLogger.error('[NPC Sheet] Skill roll failed', { actor: this.actor?.name, error: err?.message });
          ui?.notifications?.error?.(`NPC skill roll failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelector('[data-action="add-npc-weapon"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        const created = await ActorEngine.createEmbeddedDocuments(this.actor, 'Item', [{
          name: 'New Attack',
          type: 'weapon',
          system: {}
        }]);
        if (created?.[0]) created[0].sheet?.render(true);
      } catch (err) {
        swseLogger.error('[NPC Sheet] Add attack failed', { actor: this.actor?.name, error: err?.message });
        ui?.notifications?.error?.(`Could not add attack: ${err.message}`);
      }
    }, { signal });

    root.querySelectorAll('[data-action="open-npc-levelup"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          const { SWSENpcLevelUpEntry } = await import('/systems/foundryvtt-swse/scripts/apps/levelup/npc-levelup-entry.js');
          new SWSENpcLevelUpEntry(this.actor).render(true);
        } catch (err) {
          ui?.notifications?.error?.(`NPC Level-Up failed to open: ${err.message}`);
        }
      }, { signal });
    });

    // Phase 5A fix: rendered in npc-progression-panel.hbs, npc-owner-panel.hbs,
    // and npc-related-actor-card.hbs (all included by npc-concept-content.hbs)
    // but previously had no listener anywhere in the sheet controllers.
    root.querySelectorAll('[data-action="revert-npc-progression"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          const ok = await Dialog.confirm({
            title: 'Revert NPC Progression',
            content: '<p>This restores this NPC to its last saved progression snapshot. Continue?</p>',
            yes: () => true,
            no: () => false,
            defaultYes: false
          });
          if (!ok) return;
          await NpcProgressionEngine.revertToSnapshot(this.actor);
          await this.requestSurfaceRender({ reason: 'npc-progression-revert' });
        } catch (err) {
          ui?.notifications?.error?.(`Could not revert NPC progression: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="open-follower-advancement"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const ownerActorId = button.dataset.ownerActorId;
        const ownerActor = ownerActorId ? game.actors?.get?.(ownerActorId) : null;
        if (!ownerActor) {
          ui?.notifications?.warn?.('This follower\'s owner could not be resolved.');
          return;
        }
        try {
          await launchFollowerProgression(ownerActor, { existingFollowerId: this.actor?.id });
        } catch (err) {
          ui?.notifications?.error?.(`Could not open follower advancement: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="open-related-actor"]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        const relatedActor = actorId ? game.actors?.get?.(actorId) : null;
        if (!relatedActor) {
          ui?.notifications?.warn?.('That related actor could not be found.');
          return;
        }
        relatedActor.sheet?.render?.(true);
      }, { signal });
    });

    root.querySelectorAll('[data-action="npc-repair-safe-normalize"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          const { NpcReviewRepairEngine } = await import('/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcReviewRepairEngine.js');
          const result = await NpcReviewRepairEngine.applySafeFixes(this.actor);
          ui?.notifications?.info?.(result?.applied
            ? `NPC Review & Repair applied ${result.updateCount} safe normalization update(s).`
            : 'No safe NPC normalization updates were needed.');
          await this.requestSurfaceRender({ reason: 'npc-review-repair' });
        } catch (err) {
          ui?.notifications?.error?.(`NPC Review & Repair failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="npc-repair-gm-approve"]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          const ok = await Dialog.confirm({
            title: 'GM Approve NPC Overrides',
            content: '<p>This marks the NPC as table-approved with overrides. It does not recalculate progression legality.</p>',
            yes: () => true,
            no: () => false,
            defaultYes: false
          });
          if (!ok) return;
          const { NpcReviewRepairEngine } = await import('/systems/foundryvtt-swse/scripts/engine/npc-legal-review/NpcReviewRepairEngine.js');
          await NpcReviewRepairEngine.markGmApproved(this.actor);
          ui?.notifications?.info?.('NPC marked GM-approved with overrides.');
          await this.requestSurfaceRender({ reason: 'npc-gm-approval' });
        } catch (err) {
          ui?.notifications?.error?.(`NPC GM approval failed: ${err.message}`);
        }
      }, { signal });
    });
  }

  _wireNpcConceptFieldPersistence(root, signal) {
    if (!(root instanceof HTMLElement) || this.actor?.type !== 'npc') return;

    root.addEventListener('change', async (ev) => {
      const field = ev.target instanceof HTMLElement
        ? ev.target.closest('input[name], textarea[name], select[name]')
        : null;
      if (!(field instanceof HTMLElement)) return;
      if (!canUseActorSheetEditControls(this, this.actor)) return;
      if (!field.name || field.hasAttribute('data-action') || field.disabled || field.hasAttribute('readonly')) return;

      const statblockAuthority = field.dataset?.npcStatblockAuthority === 'true' || isNpcStatblockAuthorityPath(field.name);
      if (!statblockAuthority && !isNpcSheetWritablePath(field.name)) return;

      const rawValue = field.matches('input[type="checkbox"]') ? field.checked : field.value;
      const update = {
        [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
      };

      try {
        if (statblockAuthority) {
          await this._updateNpcConceptStatblockAuthority(update, { fieldName: field.name });
          return;
        }

        const quiet = isQuietNpcSheetPath(field.name);
        await ActorEngine.updateActor(this.actor, update, {
          source: quiet ? 'npc-concept-direct-field-quiet' : 'npc-concept-direct-field',
          render: quiet ? false : undefined,
          suppressAppRefresh: quiet,
          meta: { guardKey: `npc-concept-field:${field.name}` }
        });
      } catch (err) {
        swseLogger.error('[NPC Sheet] Field update failed', { actor: this.actor?.name, fieldName: field.name, error: err?.message });
        ui?.notifications?.error?.(`NPC field update failed: ${err.message}`);
      }
    }, { signal });
  }

  async _updateNpcConceptStatblockAuthority(update = {}, { fieldName = '' } = {}) {
    const flat = { ...(update ?? {}) };
    if (!Object.keys(flat).length) return;

    const mirror = {};
    for (const [path, value] of Object.entries(flat)) {
      if (path === 'name') mirror['system.npcStatblock.core.name'] = value;
      if (path === 'img') mirror['system.npcStatblock.core.img'] = value;
      if (path === 'system.hp.value') mirror['system.npcStatblock.core.hpCurrent'] = value;
      if (path === 'system.hp.max') mirror['system.npcStatblock.core.hpMax'] = value;
      if (path === 'system.baseAttackBonus' || path === 'system.bab') mirror['system.npcStatblock.core.bab'] = value;
      if (path === 'system.damageThreshold') mirror['system.npcStatblock.core.dt'] = value;
      if (path === 'system.speed') mirror['system.npcStatblock.core.speed'] = value;
      if (path === 'system.challengeLevel' || path === 'system.cl') mirror['system.npcStatblock.core.cl'] = value;
      if (path === 'system.level') mirror['system.npcStatblock.core.level'] = value;
      if (path === 'system.conditionTrack.current' || path === 'system.conditionTrack.value') mirror['system.npcStatblock.core.condition'] = value;
    }

    const quiet = Object.keys(flat).every(path => isQuietNpcSheetPath(path));
    await ActorEngine.updateActor(this.actor, { ...flat, ...mirror }, {
      source: 'npc-statblock-authority-edit',
      render: quiet ? false : undefined,
      suppressAppRefresh: quiet,
      meta: { guardKey: `npc-statblock-authority:${fieldName}` }
    });
  }

  _parseNpcSheetSignedNumber(value) {
    const match = String(value ?? '').match(/[+-]?\d+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  _normalizeNpcSheetDiceFormula(value) {
    const formula = String(value ?? '')
      .trim()
      .replace(/[–—−]/g, '-')
      .replace(/×/g, '*')
      .replace(/\s+/g, '');
    if (!formula || !/\d+d\d+/i.test(formula)) return '';
    if (!/^[0-9dD+\-*/().]+$/.test(formula)) return '';
    return formula;
  }

  async _rollNpcSheetFlatFormula(formula, { title = 'NPC Roll', kind = 'npc-roll', sourceElement = null } = {}) {
    const rollData = this.actor?.getRollData?.() ?? {};
    const roll = await new Roll(formula, rollData).evaluate({ async: true });
    await SWSEChat.postRoll({
      roll,
      actor: this.actor,
      flavor: title,
      context: {
        kind,
        title,
        sourceElement,
        companionSource: sourceElement
      },
      flags: {
        swse: {
          source: kind,
          actorId: this.actor?.id ?? null
        }
      }
    });
    return roll;
  }
}
