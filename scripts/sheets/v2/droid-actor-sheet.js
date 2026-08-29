import { SWSEV2CharacterLikeSheet } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { getDroidPartDefinition, getSelfDestructBurstSquares, getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { DroidSheetContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/context-builder.js";
import { ActorPerfDiagnostics } from "/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js";

// ---------------------------------------------------------------------------
// Droid-only module-level helpers. These were used exclusively by the
// droid-only sheet methods below (never referenced by the shared
// SWSEV2CharacterLikeSheet code), so they moved down with those methods
// verbatim rather than staying behind as dead code in the shared file.
// ---------------------------------------------------------------------------

function getDroidActorSize(actor) {
  return String(actor?.system?.size ?? actor?.system?.droidSystems?.size ?? actor?.system?.droidSize ?? 'medium').toLowerCase();
}

async function createDroidSelfDestructTemplate(actor, part) {
  const token = actor?.getActiveTokens?.()?.[0] ?? actor?.token?.object ?? null;
  const scene = token?.scene ?? canvas?.scene;
  if (!scene || !token) return null;

  const radiusSquares = getSelfDestructBurstSquares(getDroidActorSize(actor), {
    miniaturized: part?.weaponProfile?.miniaturized === true
  });
  if (!radiusSquares) return null;

  const distance = canvas?.grid?.distance ?? scene.grid?.distance ?? 1;
  const radiusDistance = radiusSquares * distance;
  const x = token.center?.x ?? token.x ?? 0;
  const y = token.center?.y ?? token.y ?? 0;

  try {
    const created = await scene.createEmbeddedDocuments('MeasuredTemplate', [{
      t: 'circle',
      user: game.user?.id,
      x,
      y,
      direction: 0,
      distance: radiusDistance,
      borderColor: game.user?.color ?? '#ff6400',
      fillColor: game.user?.color ?? '#ff6400',
      flags: {
        swse: {
          droidSelfDestruct: true,
          actorUuid: actor.uuid,
          partId: part?.ruleId ?? part?.id
        }
      }
    }]);
    return created?.[0] ?? null;
  } catch (err) {
    swseLogger.warn('[Droid Systems] Failed to create self-destruct template', err);
    return null;
  }
}

function buildDroidPartVirtualWeapon(actor, part) {
  const profile = part?.weaponProfile ?? {};
  const damage = profile.damageBySize
    ? getSelfDestructDamage(getDroidActorSize(actor), { miniaturized: profile.miniaturized === true })
    : (profile.damage ?? '1d6');

  return {
    id: `swse-droid-part-${part?.ruleId ?? part?.id ?? 'weapon'}`,
    name: profile.name ?? part?.name ?? 'Droid Part',
    type: 'weapon',
    img: part?.img ?? actor?.img ?? 'icons/svg/aura.svg',
    flags: {
      swse: {
        virtual: true,
        droidPart: true,
        droidPartId: part?.ruleId ?? part?.id,
        selfDestruct: profile.selfDestruct === true
      }
    },
    system: {
      damage: damage || '1d6',
      damageType: profile.damageType ?? 'normal',
      attackAttribute: profile.mode === 'ranged' || profile.mode === 'area' ? 'dex' : 'str',
      meleeOrRanged: profile.mode === 'ranged' || profile.mode === 'area' ? 'ranged' : 'melee',
      weaponType: profile.weaponType ?? 'simple',
      proficiency: profile.weaponType ?? 'simple',
      range: profile.range ?? '',
      attackBonus: profile.attackBonus ?? 0,
      equipped: true,
      integrated: true,
      description: part?.description ?? ''
    }
  };
}

function listToHtml(label, values) {
  return Array.isArray(values) && values.length
    ? `<h4>${label}</h4><ul>${values.map(value => `<li>${String(value)}</li>`).join('')}</ul>`
    : '';
}

async function postDroidPartChat(actor, part, { roll = null, destroyed = false } = {}) {
  const modifiers = (part.modifiers ?? []).filter(mod => mod.active !== false);
  const modifierHtml = modifiers.length
    ? `<ul>${modifiers.map(mod => `<li><strong>${mod.target}</strong>: ${mod.value !== undefined ? `${Number(mod.value) >= 0 ? '+' : ''}${mod.value}` : 'special'} ${mod.type ?? ''}</li>`).join('')}</ul>`
    : '<p class="muted">No automatic modifier is active for this use.</p>';
  const weaponHtml = part.weaponProfile
    ? `<p><strong>Weapon profile:</strong> ${part.weaponProfile.name ?? part.name}${part.weaponProfile.damage ? `, ${part.weaponProfile.damage} damage` : ''}${part.weaponProfile.range ? `, ${part.weaponProfile.range}` : ''}${part.weaponProfile.defense ? `, targets ${part.weaponProfile.defense}` : ''}</p>`
    : '';
  const prerequisiteHtml = listToHtml('Prerequisites', [
    ...(part.prerequisiteIds ?? []),
    ...((part.prerequisiteAnyIds ?? []).length ? [`Any: ${(part.prerequisiteAnyIds ?? []).join(', ')}`] : [])
  ]);
  const featureHtml = listToHtml('Features', part.features);
  const restrictionHtml = listToHtml('Restrictions', part.restrictions);
  const content = `
    <div class="swse-chat-card swse-droid-part-chat">
      <h3><i class="fa-solid fa-robot"></i> ${actor.name} uses ${part.name}</h3>
      ${part.description ? `<p>${part.description}</p>` : ''}
      ${weaponHtml}
      ${featureHtml}
      ${restrictionHtml}
      ${prerequisiteHtml}
      <h4>Rules / Modifiers</h4>
      ${modifierHtml}
      ${destroyed ? '<p class="swse-danger"><strong>Result:</strong> Droid destroyed. This Droid cannot be repaired or salvaged.</p>' : ''}
    </div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: roll ? [roll] : [] });
}

/**
 * SWSEV2DroidSheet — the actor sheet controller for `type: "droid"` actors.
 *
 * Extends SWSEV2CharacterLikeSheet, which owns every listener/context method
 * shared by Character, NPC, and Droid actors (the ~130-listener chain,
 * activateListeners, combat/inventory/skills/force/abilities UI). This class
 * holds only the Droid-exclusive part-usage and Stock-Statblock
 * Authority/Reconciliation controls that were proven Droid-only (each guards
 * `actor.type !== 'droid'` internally, and were wired only from a
 * droid-gated click-delegation block on the shared base).
 *
 * Do NOT add shared listener/context logic here — it belongs on
 * SWSEV2CharacterLikeSheet so Character/NPC/Droid keep sharing one
 * implementation.
 */
export class SWSEV2DroidSheet extends SWSEV2CharacterLikeSheet {

  /**
   * Phase 6: override of SWSEV2CharacterLikeSheet's no-op default. Character/
   * NPC renders never call this (the shared default short-circuits before
   * even evaluating isDroidActor's true branch), so DroidSheetContextBuilder
   * is only ever imported and constructed by this file.
   *
   * Phase 7: DroidSheetContextBuilder no longer builds its own, second
   * health/defense/secondWind/biography/abilities panels via an internal
   * `PanelContextBuilder(actor, { isEditable: actor?.isOwner === true })`.
   * Tracing every consumer proved those panels were computed but never read
   * (the shared `panelContexts.*` built by `new PanelContextBuilder(
   * this.document, this)` earlier in `_prepareContextForActorSheet` are the
   * values every live Droid template actually renders) — see
   * docs/audits/v2-phase-7-droid-context-convergence.md §5/§6. The Droid-
   * specific panels this builder still owns (garage/source-status/degree/
   * resolved-systems presentation flags) now consume the same authoritative
   * `this.isEditable` (this sheet's real ApplicationV2 getter — GM-aware,
   * `options.editable`-aware) instead of a raw `actor.isOwner` guess, so a
   * GM viewing a droid it does not personally own gets the same edit
   * affordances the rest of the sheet already grants it.
   */
  _buildDroidSheetContext(actor) {
    try {
      return ActorPerfDiagnostics.time(
        // Distinct label from the buildConceptSheetViewModel() droid entry
        // (Phase 3 live-benchmark seam) so the two builders' costs, previously
        // both aggregated under 'droid', can be read separately from
        // SWSE.debug.performance.summary().sheetContext.
        ms => ActorPerfDiagnostics.recordSheetContext('droid-panel-builder', ms),
        () => new DroidSheetContextBuilder(actor, { isEditable: this.isEditable === true }).build()
      );
    } catch (err) {
      swseLogger.warn('[SWSEV2DroidSheet] Failed to build droid systems tab context', {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message
      });
      return {
        droid: {
          degree: { label: '', category: '', isConfigured: false },
          // Phase 7: fallback consistency (§7H) — use the same authoritative
          // editability value the success path now uses, not raw ownership.
          garage: { canOpenGarage: this.isEditable === true, systemsLocked: false },
          resolvedSystems: null,
          sourceStatus: { sourceLabel: 'Unavailable', validationMessages: [], hasValidationMessages: false }
        },
        droidPanels: {},
        combatWeapons: { hasIntegrated: false, hasHandheld: false, integrated: [], handheld: [] }
      };
    }
  }

  async _useDroidPartFromButton(button) {
    if (!button || !this.actor || this.actor.type !== 'droid') return null;

    const partId = button.dataset?.partId ?? button.dataset?.itemId ?? button.dataset?.weaponId ?? null;
    const partName = button.dataset?.partName ?? button.dataset?.weaponName ?? null;
    const item = partId ? this.actor.items?.get?.(partId) : null;
    const lookupId = item?.system?.droidPartId
      ?? item?.flags?.swse?.droidPartId
      ?? button.dataset?.partRuleId
      ?? partName
      ?? partId;

    const datasetWeaponProfile = {
      name: partName ?? item?.name ?? 'Integrated Weapon',
      damage: button.dataset?.damage ?? item?.system?.damage ?? item?.system?.damageFormula ?? '',
      damageType: button.dataset?.damageType ?? item?.system?.damageType ?? 'normal',
      range: button.dataset?.range ?? item?.system?.range ?? '',
      mode: button.dataset?.mode ?? item?.system?.meleeOrRanged ?? '',
      attackBonus: button.dataset?.attackBonus ?? item?.system?.attackBonus ?? 0,
      weaponType: button.dataset?.weaponType ?? item?.system?.weaponType ?? 'simple'
    };
    const hasDatasetWeaponProfile = Boolean(datasetWeaponProfile.damage || datasetWeaponProfile.range);

    const hydrated = hydrateDroidPart({
      id: lookupId,
      name: item?.name ?? partName,
      description: item?.system?.description ?? button.dataset?.description,
      weaponProfile: item?.system?.weaponProfile ?? (hasDatasetWeaponProfile ? datasetWeaponProfile : undefined),
      img: item?.img
    });
    const definition = getDroidPartDefinition(hydrated.ruleId ?? hydrated.id ?? hydrated.name) ?? hydrated;
    const part = {
      ...definition,
      ...hydrated,
      id: partId ?? hydrated.id ?? definition.id,
      name: hydrated.name ?? definition.name ?? partName ?? item?.name ?? 'Droid Part',
      img: item?.img ?? hydrated.img ?? definition.img,
      description: item?.system?.description ?? hydrated.description ?? definition.description ?? '',
      weaponProfile: item?.system?.weaponProfile
        ?? hydrated.weaponProfile
        ?? definition.weaponProfile
        ?? (hasDatasetWeaponProfile ? datasetWeaponProfile : null)
    };

    if (part.weaponProfile?.selfDestruct === true) {
      const confirmed = await Dialog.confirm({
        title: 'Confirm Droid Self-Destruct',
        content: `<p><strong>${this.actor.name}</strong> will be marked destroyed. This cannot be repaired or salvaged.</p><p>Continue?</p>`,
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      if (!confirmed) return null;

      const damage = getSelfDestructDamage(getDroidActorSize(this.actor), { miniaturized: part.weaponProfile.miniaturized === true });
      const burst = getSelfDestructBurstSquares(getDroidActorSize(this.actor), { miniaturized: part.weaponProfile.miniaturized === true });
      const template = await createDroidSelfDestructTemplate(this.actor, part);
      const roll = await new Roll(damage).evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${this.actor.name} - ${part.name} Damage${burst ? ` (${burst}-square burst)` : ''}`
      });
      if (template) ui.notifications?.info?.(`${part.name}: placed ${burst}-square burst template.`);
      await ActorEngine.updateActor(this.actor, {
        'system.hp.value': 0,
        'system.conditionTrack.current': 5,
        'system.droidState.status': 'destroyed',
        'system.droidState.destroyed': true,
        'system.droidState.disabled': false,
        'system.droidState.destroyedBy': part.name
      }, { source: 'droid-self-destruct' });
      await postDroidPartChat(this.actor, part, { destroyed: true });
      return roll;
    }

    if (part.weaponProfile?.damage || part.weaponProfile?.damageBySize || datasetWeaponProfile.damage) {
      await postDroidPartChat(this.actor, part);
      return this._runCanonicalAttackWithPreroll(buildDroidPartVirtualWeapon(this.actor, part), {
        source: 'droid-systems-tab',
        sourceElement: button,
        companionSource: button,
        sheet: this,
        showRollCompanion: true
      });
    }

    await postDroidPartChat(this.actor, part);
    return null;
  }

  /**
   * PHASE 3 — Droid Stock-Statblock Authority controls. Thin sheet-side
   * wrappers around scripts/domain/droids/droid-statblock-conversion-service.js
   * — all permission checks and mutation logic live in the service; these
   * only format its results for the actor sheet.
   */
  async _inspectDroidConversion() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const { inspectConversion } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-statblock-conversion-service.js');
    const report = await inspectConversion(this.actor);
    const lines = [
      `<p><strong>Mode:</strong> ${report.calculationMode?.mode ?? 'unknown'}</p>`,
      `<p><strong>Source:</strong> ${report.stockImportSource?.sourceName ?? 'Unknown'}</p>`,
      report.discrepancies?.length
        ? `<p><strong>Discrepancies vs. classless-derived math:</strong></p><ul>${report.discrepancies.map(d => `<li>${d.field}: published ${d.published}, derived would be ${d.reproducedDerived}</li>`).join('')}</ul>`
        : `<p>No discrepancies computed against classless-derived math.</p>`,
      report.warnings?.length ? `<p><strong>Warnings:</strong></p><ul>${report.warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : ''
    ];
    await SWSEDialogV2.prompt({
      title: `Inspect Conversion — ${this.actor.name}`,
      content: lines.join(''),
      label: 'Close'
    });
  }

  async _convertDroidToPlayable() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const confirmed = await SWSEDialogV2.confirm({
      title: 'Convert to Playable Mode',
      content: `<p>Convert <strong>${this.actor.name}</strong> from its published statblock to normal playable-derived rules?</p><p>This does not add classes, levels, feats, or talents — it only stops the published totals from being protected from derived recalculation. A snapshot is taken first and can be rolled back.</p>`,
      defaultYes: false
    });
    if (!confirmed) return;
    const { convertToPlayableDerived } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-statblock-conversion-service.js');
    const result = await convertToPlayableDerived(this.actor);
    if (result.success) {
      ui.notifications?.info?.(`${this.actor.name} converted to playable-derived mode.`);
    } else {
      ui.notifications?.error?.(`Conversion failed: ${result.error}`);
    }
  }

  async _viewOriginalDroidStatblock() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const importState = this.actor.flags?.swse?.stockDroidImport;
    if (!importState) {
      ui.notifications?.warn?.('No original statblock snapshot found on this droid.');
      return;
    }
    const totals = importState.publishedTotals ?? {};
    const content = `
      <p><strong>Source:</strong> ${importState.sourceName ?? 'Unknown'}</p>
      <p><strong>BAB:</strong> ${totals.bab ?? '—'} | <strong>Damage Threshold:</strong> ${totals.threshold ?? '—'}</p>
      <p><strong>Defenses:</strong> Fort ${totals.defenses?.fortitude ?? '—'} / Ref ${totals.defenses?.reflex ?? '—'} / Will ${totals.defenses?.will ?? '—'}</p>
      <p><strong>HP:</strong> ${totals.hp?.max ?? '—'} | <strong>Initiative:</strong> ${totals.initiative ?? '—'}</p>
    `;
    await SWSEDialogV2.prompt({
      title: `Original Statblock — ${this.actor.name}`,
      content,
      label: 'Close'
    });
  }

  async _rollbackDroidConversion() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const confirmed = await SWSEDialogV2.confirm({
      title: 'Roll Back Conversion',
      content: `<p>Restore <strong>${this.actor.name}</strong> to its pre-conversion published statblock? Any changes made since converting will be lost.</p>`,
      defaultYes: false
    });
    if (!confirmed) return;
    const { rollbackConversion } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-statblock-conversion-service.js');
    const result = await rollbackConversion(this.actor);
    if (result.success) {
      ui.notifications?.info?.(`${this.actor.name} rolled back to its published statblock.`);
    } else {
      ui.notifications?.error?.(`Rollback failed: ${result.error}`);
    }
  }

  /**
   * PHASE 4 — Converted-System Reconciliation controls. Thin sheet-side
   * wrappers around scripts/domain/droids/droid-converted-system-reconciliation-service.js
   * — all classification, permission checks, and mutation logic live in
   * the service; these only format its results for the actor sheet.
   */
  async _inspectDroidReconciliation() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const { inspectReconciliation } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js');
    const report = await inspectReconciliation(this.actor);
    const rows = (report.candidates ?? []).map(c => {
      const label = c.canonicalId ?? c.sourcePaths?.[0] ?? 'unknown';
      return `<li><strong>${label}</strong> — ${c.classification}${c.alreadyInstalled ? ' (already represented)' : ''}${c.selectedByDefault ? ' (auto-applicable)' : ''}</li>`;
    });
    const content = `
      <p><strong>Mode:</strong> ${report.calculationMode?.mode ?? 'unknown'}</p>
      ${rows.length ? `<ul>${rows.join('')}</ul>` : '<p>No unresolved published systems found.</p>'}
      ${report.warnings?.length ? `<p><strong>Warnings:</strong></p><ul>${report.warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : ''}
    `;
    await SWSEDialogV2.prompt({
      title: `Inspect Published Systems — ${this.actor.name}`,
      content,
      label: 'Close'
    });
  }

  async _reconcileDroidSystems() {
    if (!this.actor || this.actor.type !== 'droid') return;
    // P1-5 — this sheet handler submits INTENT (actorId/selectedCanonicalIds/
    // inspectionRevision) only. It never builds or holds a mutation plan;
    // applyReconciliation() rereads the actor's current state and rebuilds
    // the plan itself, using this call's inspectionRevision only to detect
    // whether anything changed since inspection ran a moment ago.
    const { inspectReconciliation, applyReconciliation } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js');
    const inspection = await inspectReconciliation(this.actor);
    const autoApplicable = (inspection.candidates ?? []).filter(c => c.selectedByDefault && !c.alreadyInstalled);
    if (autoApplicable.length === 0) {
      ui.notifications?.info?.(`${this.actor.name} has no auto-applicable published systems to reconcile. Ambiguous or descriptive-only entries require manual review and are not reconciled from this button.`);
      return;
    }
    const confirmed = await SWSEDialogV2.confirm({
      title: 'Reconcile Published Systems',
      content: `<p>Reconcile ${autoApplicable.length} published system(s) into <strong>${this.actor.name}</strong>'s canonical installation ledger?</p><p>This only applies unambiguous canonical/alias matches. Ambiguous or purely descriptive entries are left untouched. A snapshot is taken first and can be rolled back.</p>`,
      defaultYes: false
    });
    if (!confirmed) return;
    const intent = {
      actorId: this.actor.id,
      selectedCanonicalIds: autoApplicable.map(c => c.canonicalId),
      inspectionRevision: inspection.inspectionRevision
    };
    const result = await applyReconciliation(this.actor, intent);
    if (result.success) {
      ui.notifications?.info?.(`${this.actor.name}: reconciled ${result.appliedCanonicalIds.length} system(s).`);
    } else if (result.code === 'RECONCILIATION_STALE') {
      // Never silently retry with the stale selection — force a fresh
      // review instead.
      ui.notifications?.warn?.(result.error);
    } else {
      ui.notifications?.error?.(`Reconciliation failed: ${result.error}`);
    }
  }

  async _rollbackDroidReconciliation() {
    if (!this.actor || this.actor.type !== 'droid') return;
    const confirmed = await SWSEDialogV2.confirm({
      title: 'Roll Back Reconciliation',
      content: `<p>Restore <strong>${this.actor.name}</strong> to its pre-reconciliation state? Any changes made since reconciling will be lost.</p>`,
      defaultYes: false
    });
    if (!confirmed) return;
    const { rollbackReconciliation } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js');
    const result = await rollbackReconciliation(this.actor);
    if (result.success) {
      ui.notifications?.info?.(`${this.actor.name} rolled back to its pre-reconciliation state.`);
    } else {
      ui.notifications?.error?.(`Rollback failed: ${result.error}`);
    }
  }
}
