import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { SWSEV2ActorSheetBase, canUseActorSheetEditControls, applySheetInteractionMode, setStoredSheetMode } from "/systems/foundryvtt-swse/scripts/sheets/v2/actor-sheet-base.js";
import { ActorPerfDiagnostics } from "/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import MobileMode from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-manager.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { AmmoSystem } from "/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js";
import { handleSetDarkSideScore } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/dsp-click-handler.js";
// CombatRollConfigDialog (Tactical Targeting Console) intentionally removed — deprecated, orphaned, pending deletion.
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { openForceAlchemyWorkbench } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-workbench-app.js";
import { launchFollowerProgression, launchMinionCreation } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { isFollowerSlotOccupied, resolveFollowerSlotActorId } from "/systems/foundryvtt-swse/scripts/domain/followers/follower-slot-occupancy.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";
import { MentorNotesApp } from "/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js";
import { CombatExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js";
import { CombatEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatEngine.js";
import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { AbilityCombatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/ability-combat-action-resolver.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { GuardianSpiritActions } from "/systems/foundryvtt-swse/scripts/engine/talent/guardian-spirit-actions.js";
import { ConsularTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/consular-talent-actions.js";
import { SentinelTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/sentinel-talent-actions.js";
import { LightsaberTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-talent-actions.js";
import { JediPrestigeTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/jedi-prestige-talent-actions.js";
import { SithTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/sith-talent-actions.js";
import { ForceAdeptTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/force-adept-talent-actions.js";
import { LightsaberFormEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-form-engine.js";
import { ArmorTalentActions } from "/systems/foundryvtt-swse/scripts/engine/talent/armor-talent-actions.js";
import { promptForcePowerRollOptions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-roll-dialog.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { bindV2CharacterSheetTooltips } from "/systems/foundryvtt-swse/scripts/sheets/v2/TooltipIntegration.js";
import { bindV2SheetBreakdowns, closeBreakdown } from "/systems/foundryvtt-swse/scripts/sheets/v2/BreakdownIntegration.js";
import { HelpModeManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/HelpModeManager.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { buildUnarmedAttackContext, buildVirtualUnarmedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { GrappleLegalityEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js";
import { getDroidPartDefinition, getSelfDestructBurstSquares, getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { SWSEActiveEffectsManager } from "/systems/foundryvtt-swse/scripts/combat/active-effects-manager.js";
import { CombatStatusResolver } from "/systems/foundryvtt-swse/scripts/combat/combat-status.js";
import { PanelContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js";
import { XP_LEVEL_THRESHOLDS } from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";
import { PANEL_REGISTRY } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PANEL_REGISTRY.js";
import { PostRenderAssertions } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PostRenderAssertions.js";
import { buildHpViewModel, buildDefensesViewModel, buildHeaderHpSegments } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/context.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SkillUseFilter } from "/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js";
import { CustomLanguageDialog } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/custom-language-dialog.js";
import { DroidSheetContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/context-builder.js";
import { NpcProfileBuilder } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-profile-builder.js";
import { buildNpcConceptAbilities, buildNpcConceptSheetContext, isNpcSheetWritablePath, isNpcStatblockAuthorityPath, isQuietNpcSheetPath } from "/systems/foundryvtt-swse/scripts/sheets/v2/npc/npc-sheet-helpers.js";
// Phase 7: Shared platform layer imports (reusable across all V2 sheets)
import { applyResourceBarAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-bar-animations.js";
import { PortraitUploadController } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js";
import { applyResourceNumberAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-number-animations.js";
import { ExtraSkillUseRegistry } from "/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js";
import { traceLog, actorSummary, payloadSummary } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";
import { SWSEPerf } from "/systems/foundryvtt-swse/scripts/utils/performance-utils.js";
import { captureHydrationSnapshot, emitHydrationError, emitHydrationWarning, getRecentHydrationMutation, recordHydrationMutation, summarizeBiographyPanel, summarizeDefensePanel } from "/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js";
// Phase 8: Character sheet decomposition - import focused modules
import { registerListeners } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/listeners.js";
import { coerceSingleFieldValue, handleFormSubmission, isDirectFieldMutationPath } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
// Diagnostics: runtime inspection of resize/scroll behavior
import { characterSheetDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet-diagnostics.js";
// Phase 11: Shell system for surface routing (progression, chargen, upgrade)
import { mutateAndRepaint, mutateShellOnly } from "/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js";
// Contract Enforcement: validate sheet architecture at runtime
import { CharacterSheetContractEnforcer } from "/systems/foundryvtt-swse/scripts/sheets/v2/contract-enforcer.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
// Phase 8: Contract observability and runtime verification
import {
  warnSheetFallback,
  warnConceptDivergence,
  warnMissingDerivedOutput,
  getWarningsSummary
} from "/systems/foundryvtt-swse/scripts/debug/contract-warning-helper.js";
// Theme and motion control imports
import { getActorSheetThemeGroups } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { ShellSurfaceRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceRegistry.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { activateCustomSkillsUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/custom-skills-ui.js";
import { FeatChoiceDialog } from "/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js";
import { FeatChoiceResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";
import { isForcePowerItem } from "/systems/foundryvtt-swse/scripts/utils/item-classification.js";
import { registerCustomSkillsHelpers } from "/systems/foundryvtt-swse/scripts/sheets/v2/custom-skills-helpers.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
import { createSafeEmbeddedItem, createSafeItemData } from "/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js";
import { EntityCreateBrowser } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/entity-create-browser.js";
import { CombinedFeatActionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combined-feat-action-resolver.js";
import { FullAttackExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-executor.js";
import { SWSEGrappling } from "/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js";
import { CombatWorkflowRegistry } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-workflow-registry.js";
import { FULL_ATTACK_PACKAGES } from "/systems/foundryvtt-swse/scripts/combat/multi-attack.js";
import { addItemEditorTrace, installItemEditorTrace, summarizeActorItems } from "/systems/foundryvtt-swse/scripts/debug/item-editor-trace.js";


function toActionStateLabel(state, fallback = 'Available') {
  const key = String(state || '').toLowerCase();
  if (key === 'used' || key === 'spent' || key === 'unavailable') return 'Spent';
  if (key === 'degraded') return 'Degraded';
  if (key === 'readonly') return 'Read Only';
  if (key === 'reference') return 'Reference';
  return fallback;
}

function buildActionPips(count = 1, current = count) {
  const max = Math.max(1, Number(count) || 1);
  const onCount = Math.max(0, Math.min(max, Number(current) || 0));
  return Array.from({ length: max }, (_unused, index) => ({ on: index < onCount }));
}

function buildSheetActionEconomyContext({ turnState = null, state = null, breakdown = [], enforcementMode = 'loose', active = false } = {}) {
  const visual = state ?? {
    full: 'available',
    standard: 'available',
    move: 'available',
    swift: 'available'
  };
  const remaining = turnState?.remaining ?? {};
  const reactions = turnState?.reactions ?? {};
  const reactionMax = Math.max(1, Number(reactions.max ?? 1) || 1);
  const reactionCurrent = active ? Math.max(0, Math.min(reactionMax, Number(reactions.current ?? reactionMax) || 0)) : reactionMax;
  const freeStep = {
    key: 'free',
    label: 'Free',
    cssClass: 'is-free is-available',
    state: 'always',
    stateLabel: 'Always',
    canSpend: false,
    infinite: true,
    pips: [],
    tooltip: 'Free actions are unlimited, subject to GM discretion.'
  };

  const actionSteps = [
    { key: 'full-round', stateKey: 'full', label: 'Full-Round', fallbackAvailable: active ? ((remaining.standard ?? 1) > 0 && (remaining.move ?? 1) > 0) : true },
    { key: 'standard', stateKey: 'standard', label: 'Standard', fallbackAvailable: active ? (remaining.standard ?? 1) > 0 : true },
    { key: 'move', stateKey: 'move', label: 'Move', fallbackAvailable: active ? (remaining.move ?? 1) > 0 : true },
    { key: 'swift', stateKey: 'swift', label: 'Swift', fallbackAvailable: active ? (remaining.swift ?? 1) > 0 : true }
  ].map((step) => {
    const stateValue = active ? (visual[step.stateKey] || (step.fallbackAvailable ? 'available' : 'used')) : 'reference';
    const available = stateValue === 'available' || stateValue === 'degraded';
    return {
      key: step.key,
      label: step.label,
      state: stateValue,
      cssClass: `is-${stateValue}${available ? ' is-available' : ' is-spent'}`,
      stateLabel: active ? toActionStateLabel(stateValue) : 'Available',
      canSpend: active && available,
      infinite: false,
      pips: buildActionPips(1, available ? 1 : 0),
      tooltip: active ? `${step.label} action is ${toActionStateLabel(stateValue).toLowerCase()}.` : `${step.label} action is normally available on your turn.`
    };
  });

  const reactionStep = {
    key: 'reaction',
    label: 'Reactions',
    state: reactionCurrent > 0 ? 'available' : 'used',
    cssClass: `is-reaction ${reactionCurrent > 0 ? 'is-available' : 'is-spent'}`,
    stateLabel: active ? `${reactionCurrent} Left` : `${reactionMax} Left`,
    canSpend: active && reactionCurrent > 0,
    infinite: false,
    pips: buildActionPips(reactionMax, reactionCurrent),
    tooltip: active ? `${reactionCurrent} reaction(s) remaining this round.` : 'Reactions refresh on your turn.'
  };

  const summaryParts = [];
  for (const step of actionSteps) {
    if (!active || step.canSpend) summaryParts.push(step.label.replace('-Round', ''));
  }
  summaryParts.push('Free');
  if (!active || reactionCurrent > 0) summaryParts.push(`RX ${reactionCurrent}`);

  return {
    active,
    state: visual,
    turnState,
    breakdown: Array.isArray(breakdown) ? breakdown : [],
    enforcementMode,
    enforcementModeLabel: String(enforcementMode || 'loose').toUpperCase(),
    steps: [...actionSteps, freeStep, reactionStep],
    summary: summaryParts.length ? summaryParts.join(' · ') : 'No actions remaining',
    canUndo: active && Array.isArray(turnState?.history) && turnState.history.length > 0,
    canReset: active,
    reactionCurrent,
    reactionMax,
    readOnlyReason: active ? '' : 'Reference mode: add this actor to the current combat tracker to spend actions.'
  };
}

function buildCombatStatusViewModel(actor, { canEdit = true } = {}) {
  const status = CombatStatusResolver.getStatus(actor);
  const coverOptions = [
    { value: 'none', label: 'None', bonusLabel: '—' },
    { value: 'cover', label: 'Cover', bonusLabel: '+5 REF' },
    { value: 'improved', label: 'Improved', bonusLabel: '+10 REF' },
    { value: 'total', label: 'Total', bonusLabel: 'BLOCK' }
  ].map((option) => ({ ...option, selected: status.cover === option.value }));

  const defensiveModes = [
    { value: 'normal', label: 'Normal', detail: 'Clear prone and defensive stances' },
    { value: 'fightingDefensively', label: 'Fight Defensively', detail: '+2 Ref · −5 attacks this turn' },
    { value: 'fullDefense', label: 'Full Defense', detail: '+5 Ref · no attacks' }
  ].map((mode) => ({ ...mode, active: status.defensiveMode === mode.value }));
  const defensiveNormalMode = defensiveModes.find((mode) => mode.value === 'normal') ?? defensiveModes[0];
  const defensiveStanceModes = defensiveModes.filter((mode) => mode.value !== 'normal');

  return {
    ...status,
    canEdit,
    coverOptions,
    defensiveModes,
    defensiveNormalMode,
    defensiveStanceModes,
    coverIsTotal: status.cover === 'total',
    attackLocked: status.defensiveMode === 'fullDefense',
    attackLockLabel: 'Full Defense is active. Attacks are locked until this mode is cleared or the GM overrides it.',
    coverLabel: coverOptions.find((option) => option.selected)?.label || 'None',
    defensiveModeLabel: defensiveModes.find((mode) => mode.active)?.label || 'Normal'
  };
}

function formatSignedValue(value) {
  const numeric = Number(value) || 0;
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

function buildEffectiveDefensesViewModel(actor, defensePanel = null) {
  const defenses = Array.isArray(defensePanel?.defenses) ? defensePanel.defenses : [];
  const mapDefenseType = (def) => {
    const key = String(def?.key || def?.systemKey || '').toLowerCase();
    if (key.startsWith('ref')) return 'reflex';
    if (key.startsWith('will')) return 'will';
    return 'fortitude';
  };

  const rows = defenses.map((def) => {
    const defenseType = mapDefenseType(def);
    const base = Number(def?.total ?? 10) || 10;
    const resolved = CombatStatusResolver.resolveTargetDefense(actor, defenseType, base, { attackType: 'ranged' });
    const chips = Array.isArray(resolved.mods) ? resolved.mods.map((mod) => ({
      key: mod.key || 'mod',
      label: mod.label || 'Modifier',
      value: Number(mod.value) || 0,
      valueLabel: mod.blocked ? '' : formatSignedValue(mod.value),
      tone: mod.blocked ? 'danger' : (Number(mod.value) || 0) > 0 ? 'positive' : (Number(mod.value) || 0) < 0 ? 'negative' : 'neutral'
    })) : [];

    return {
      key: def?.key || defenseType,
      systemKey: def?.systemKey || defenseType,
      label: def?.label || defenseType,
      abbrev: def?.key?.toUpperCase?.() || def?.label || defenseType,
      base,
      effective: Number(resolved.value ?? base) || base,
      adjustment: Number(resolved.adjustment ?? 0) || 0,
      boosted: (Number(resolved.adjustment ?? 0) || 0) > 0,
      blocked: resolved.blocked === true,
      chips,
      parts: [
        { label: 'Base', value: 10, readonly: true },
        {
          label: 'Heroic/Armor',
          value: Number(def?.levelContribution ?? 0) + (String(def?.systemKey || '').toLowerCase() === 'reflex' ? 0 : Number(def?.armorBonus ?? 0)),
          readonly: true
        },
        {
          label: 'Ability', value: Number(def?.abilityMod ?? 0),
          isSelect: true,
          path: def?.abilityPath || '',
          options: [
            { value: 'str', label: 'STR' },
            { value: 'dex', label: 'DEX' },
            { value: 'con', label: 'CON' },
            { value: 'int', label: 'INT' },
            { value: 'wis', label: 'WIS' },
            { value: 'cha', label: 'CHA' }
          ].map(o => ({ ...o, selected: o.value === (def?.abilityKey ?? '') }))
        },
        { label: 'Class', value: Number(def?.classDef ?? 0), path: def?.classBonusPath || '' },
        { label: 'Misc', value: Number(def?.miscMod ?? 0), path: def?.miscPath || '' }
      ].filter((part) => part.readonly || part.path || part.isSelect),
      canEdit: def?.canEdit !== false
    };
  });

  return {
    rows,
    hasRows: rows.length > 0
  };
}

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

function isDroidActorLikeForCombat(actor) {
  return String(actor?.type ?? '').toLowerCase() === 'droid'
    || actor?.system?.isDroid === true
    || String(actor?.system?.actorMode ?? '').toLowerCase() === 'droid';
}

function listTextValuesForCombat(...values) {
  const out = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      out.push(...value.map((entry) => String(entry ?? '').trim()).filter(Boolean));
    } else if (value && typeof value === 'object') {
      out.push(...Object.values(value).map((entry) => String(entry ?? '').trim()).filter(Boolean));
    } else {
      const text = String(value ?? '').trim();
      if (text) out.push(text);
    }
  }
  return out;
}

function isNaturalWeaponItemForCombat(item) {
  const system = item?.system ?? {};
  const swseFlags = item?.flags?.swse ?? {};
  if (swseFlags.isNaturalWeapon === true || swseFlags.alwaysArmed === true) return true;

  const naturalFields = listTextValuesForCombat(
    system.category,
    system.subcategory,
    system.proficiency,
    system.weaponCategory,
    system.weaponType,
    system.source
  );
  if (naturalFields.some((value) => value.toLowerCase() === 'natural')) return true;

  const descriptors = listTextValuesForCombat(system.properties, system.traits, system.tags);
  return descriptors.some((value) => /natural\s+weapon/i.test(value));
}

function isAutoEquippedNaturalWeaponForCombat(item, truthy = null) {
  const readTruthy = typeof truthy === 'function'
    ? truthy
    : (value) => value === true || Number(value) === 1 || ['true', '1', 'yes', 'equipped', 'natural'].includes(String(value ?? '').toLowerCase());
  const swseFlags = item?.flags?.swse ?? {};
  return isNaturalWeaponItemForCombat(item)
    && (readTruthy(swseFlags.autoEquipped) || swseFlags.alwaysArmed === true);
}

function isIntegratedDroidAttackItem(item, actor, truthy = null) {
  if (!isDroidActorLikeForCombat(actor) || !item) return false;
  const readTruthy = typeof truthy === 'function'
    ? truthy
    : (value) => value === true || Number(value) === 1 || ['true', '1', 'yes', 'integrated'].includes(String(value ?? '').toLowerCase());
  const system = item.system ?? {};
  const typeText = [item.type, item.name, system.type, system.weaponType, system.weaponCategory, system.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const looksWeapon = ['weapon', 'lightsaber'].includes(item.type)
    || /weapon|lightsaber|blaster|rifle|pistol|melee|ranged|thrown|grenade|vibroblade/.test(typeText);
  return looksWeapon
    && (readTruthy(system.integrated)
      || readTruthy(system.droidIntegrated)
      || readTruthy(item?.flags?.swse?.integrated));
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


function hasForceSensitivityAccess(actor) {
  if (!actor) return false;

  try {
    if (CapabilityRegistry.isForceSensitive(actor)) return true;
  } catch (_err) {
    // Fall through to direct shape checks; sheet rendering must never fail on capability lookup.
  }

  const system = actor.system ?? {};
  if (system.forceSensitive === true || system.progression?.forceSensitive === true) return true;

  const unlockedDomains = system.progression?.unlockedDomains;
  if (Array.isArray(unlockedDomains) && unlockedDomains.includes('force')) return true;

  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isForcePositiveText = (value) => {
    const text = normalize(value);
    return !!text && (text.includes('force sensitive') || text.includes('force sensitivity') || text.includes('force training')) && !text.includes('non force sensitive');
  };

  const speciesVariant = system.speciesVariant || actor.flags?.swse?.speciesVariant;
  if (speciesVariant) {
    if (isForcePositiveText(speciesVariant.label || speciesVariant.name || speciesVariant.id)) return true;
    const variantSpecial = Array.isArray(speciesVariant.special) ? speciesVariant.special : [];
    if (variantSpecial.some(isForcePositiveText)) return true;
  }

  const speciesRules = system.speciesRules || {};
  const speciesTraits = [
    ...(Array.isArray(system.speciesTraits) ? system.speciesTraits : []),
    ...(Array.isArray(speciesRules.traits) ? speciesRules.traits : []),
    ...(Array.isArray(speciesRules.special) ? speciesRules.special : [])
  ];
  if (speciesTraits.some((trait) => isForcePositiveText(trait?.name || trait?.label || trait))) return true;

  const itemList = Array.from(actor.items ?? []);
  return itemList.some((item) => {
    if (!item) return false;
    if (item.type === 'class') {
      const classTags = [
        ...(Array.isArray(item.system?.tags) ? item.system.tags : []),
        ...(Array.isArray(item.system?.metadata?.tags) ? item.system.metadata.tags : []),
        ...(Array.isArray(item.system?.startingFeats) ? item.system.startingFeats : []),
        ...(Array.isArray(item.system?.features) ? item.system.features : [])
      ];
      if (item.system?.forceSensitive === true || classTags.some((entry) => isForcePositiveText(entry?.name || entry?.label || entry))) return true;
    }
    if (item.type === 'species') {
      const special = Array.isArray(item.system?.special) ? item.system.special : [];
      const traits = Array.isArray(item.system?.traits) ? item.system.traits : [];
      const canonicalTraits = Array.isArray(item.system?.canonicalTraits) ? item.system.canonicalTraits : [];
      if ([...special, ...traits, ...canonicalTraits].some((trait) => isForcePositiveText(trait?.name || trait?.label || trait))) return true;
    }
    return item.type === 'feat' && isForcePositiveText(item.name);
  });
}

import { buildConceptSheetViewModel } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js";
import { maybePromptForDatapadRegistration } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/chargen-onboarding.js";

/**
 * AppV2 render contexts must be plain structured-cloneable data. The live
 * Foundry Actor/Item documents and inline shell adapters can hold Application
 * instances, DOM windows, listeners, and debounced callbacks. Those objects are
 * useful at runtime but fatal when placed directly in a Handlebars context.
 */
function duplicateDataForContext(value, fallback = {}) {
  if (value == null) return value;
  try {
    return foundry?.utils?.duplicate?.(value) ?? structuredClone(value);
  } catch (_err) {
    try {
      return structuredClone(value);
    } catch (_cloneErr) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_jsonErr) {
        return fallback;
      }
    }
  }
}

function documentToTemplateData(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const type = doc.type ?? doc.documentName ?? doc.constructor?.documentName ?? '';
  const system = duplicateDataForContext(doc.system ?? {}, {});
  const flags = duplicateDataForContext(doc.flags ?? {}, {});
  const ownership = duplicateDataForContext(doc.ownership ?? {}, {});
  const out = {
    id: doc.id ?? doc._id ?? null,
    _id: doc.id ?? doc._id ?? null,
    uuid: doc.uuid ?? null,
    name: doc.name ?? '',
    type,
    img: doc.img ?? '',
    system,
    flags,
    ownership,
    isOwner: doc.isOwner === true,
    limited: doc.limited === true
  };

  // Some legacy/partial templates still read actor.items directly. Provide a
  // safe item list instead of the live Collection/Document graph.
  if ((doc.documentName === 'Actor' || doc.constructor?.documentName === 'Actor' || doc.items) && doc.items) {
    try {
      out.items = Array.from(doc.items ?? []).map(item => documentToTemplateData(item));
    } catch (_err) {
      out.items = [];
    }
  }

  if ((doc.documentName === 'Actor' || doc.constructor?.documentName === 'Actor' || doc.effects) && doc.effects) {
    try {
      out.effects = Array.from(doc.effects ?? []).map(effect => documentToTemplateData(effect));
    } catch (_err) {
      out.effects = [];
    }
  }

  return out;
}

function sanitizeSheetRenderContext(value, options = {}) {
  const seen = new WeakSet();
  const rootKey = options.rootKey || 'context';

  const sanitize = (entry, key = rootKey) => {
    if (entry == null) return entry;

    const type = typeof entry;
    if (type === 'string' || type === 'number' || type === 'boolean') return entry;
    if (type === 'bigint') return String(entry);
    if (type === 'function' || type === 'symbol') return undefined;

    if (entry instanceof Date) return entry.toISOString();
    if (typeof window !== 'undefined' && entry === window) return undefined;
    if (typeof globalThis !== 'undefined' && entry === globalThis) return undefined;
    if (typeof Window !== 'undefined' && entry instanceof Window) return undefined;
    if (typeof Document !== 'undefined' && entry instanceof Document) return undefined;
    if (typeof HTMLElement !== 'undefined' && entry instanceof HTMLElement) return undefined;
    if (typeof Node !== 'undefined' && entry instanceof Node) return undefined;
    if (typeof AbortController !== 'undefined' && entry instanceof AbortController) return undefined;
    if (typeof AbortSignal !== 'undefined' && entry instanceof AbortSignal) return undefined;

    if (entry?.documentName || entry?.constructor?.documentName) {
      return sanitize(documentToTemplateData(entry), key);
    }

    if (seen.has(entry)) return undefined;
    seen.add(entry);

    if (Array.isArray(entry)) {
      return entry.map((child, index) => sanitize(child, `${key}[${index}]`)).filter(child => child !== undefined);
    }

    if (entry instanceof Map) {
      return Object.fromEntries(
        Array.from(entry.entries())
          .map(([mapKey, mapValue]) => [String(mapKey), sanitize(mapValue, String(mapKey))])
          .filter(([, mapValue]) => mapValue !== undefined)
      );
    }

    if (entry instanceof Set) {
      return Array.from(entry.values()).map((child, index) => sanitize(child, `${key}<${index}>`)).filter(child => child !== undefined);
    }

    const out = {};
    for (const [entryKey, entryValue] of Object.entries(entry)) {
      if (entryKey === 'app' || entryKey === 'document' || entryKey === 'shellHost') continue;
      if (entryKey === 'window' || entryKey === 'ownerDocument' || entryKey === 'defaultView' || entryKey === 'view') continue;
      if (entryKey === 'element' || entryKey === 'html' || entryKey === 'form' || entryKey === 'listeners') continue;
      if (entryKey.startsWith('_') && entryKey !== '_id') continue;
      const clean = sanitize(entryValue, entryKey);
      if (clean !== undefined) out[entryKey] = clean;
    }
    return out;
  };

  return sanitize(value, rootKey);
}

/**
 * Field type schema for form coercion
 * Maps field names or patterns to their expected types: 'number', 'boolean', 'string'
 * Used instead of string pattern matching for reliable type coercion
 */
const FORM_FIELD_SCHEMA = {
  // HP/Health
  'system.hp.value': 'number',
  'system.hp.max': 'number',
  'system.hp.temp': 'number',
  'system.hpBonus': 'number',
  'system.conditionTrack.current': 'number',
  'system.damageReduction': 'number',
  'system.baseAttackBonus': 'number',
  'system.secondWind.healing': 'number',
  'system.secondWind.uses': 'number',
  'system.secondWind.max': 'number',

  // Abilities — writes go to system.attributes.* (canonical source)
  // system.abilities.* is a derived mirror rebuilt from attributes each prepare cycle
  'system.attributes.str.base': 'number',
  'system.attributes.str.racial': 'number',
  'system.attributes.str.enhancement': 'number',
  'system.attributes.str.temp': 'number',
  'system.attributes.dex.base': 'number',
  'system.attributes.dex.racial': 'number',
  'system.attributes.dex.enhancement': 'number',
  'system.attributes.dex.temp': 'number',
  'system.attributes.con.base': 'number',
  'system.attributes.con.racial': 'number',
  'system.attributes.con.enhancement': 'number',
  'system.attributes.con.temp': 'number',
  'system.attributes.int.base': 'number',
  'system.attributes.int.racial': 'number',
  'system.attributes.int.enhancement': 'number',
  'system.attributes.int.temp': 'number',
  'system.attributes.wis.base': 'number',
  'system.attributes.wis.racial': 'number',
  'system.attributes.wis.enhancement': 'number',
  'system.attributes.wis.temp': 'number',
  'system.attributes.cha.base': 'number',
  'system.attributes.cha.racial': 'number',
  'system.attributes.cha.enhancement': 'number',
  'system.attributes.cha.temp': 'number',

  // Defense modifiers
  'system.defenses.fortitude.classBonus': 'number',
  'system.defenses.fortitude.misc.user.extra': 'number',
  'system.defenses.fortitude.ability': 'string',
  'system.defenses.reflex.classBonus': 'number',
  'system.defenses.reflex.misc.user.extra': 'number',
  'system.defenses.reflex.ability': 'string',
  'system.defenses.reflex.armor': 'number',
  'system.defenses.will.classBonus': 'number',
  'system.defenses.will.misc.user.extra': 'number',
  'system.defenses.will.ability': 'string',

  // Skills
  'system.skills.acrobatics.miscMod': 'number',
  'system.skills.climb.miscMod': 'number',
  'system.skills.deception.miscMod': 'number',
  'system.skills.endurance.miscMod': 'number',
  'system.skills.gatherInformation.miscMod': 'number',
  'system.skills.initiative.miscMod': 'number',
  'system.skills.jump.miscMod': 'number',
  'system.skills.knowledgeBureaucracy.miscMod': 'number',
  'system.skills.knowledgeGalacticLore.miscMod': 'number',
  'system.skills.knowledgeLifeSciences.miscMod': 'number',
  'system.skills.knowledgePhysicalSciences.miscMod': 'number',
  'system.skills.knowledgeSocialSciences.miscMod': 'number',
  'system.skills.knowledgeTactics.miscMod': 'number',
  'system.skills.knowledgeTechnology.miscMod': 'number',
  'system.skills.mechanics.miscMod': 'number',
  'system.skills.perception.miscMod': 'number',
  'system.skills.persuasion.miscMod': 'number',
  'system.skills.pilot.miscMod': 'number',
  'system.skills.ride.miscMod': 'number',
  'system.skills.stealth.miscMod': 'number',
  'system.skills.survival.miscMod': 'number',
  'system.skills.swim.miscMod': 'number',
  'system.skills.treatInjury.miscMod': 'number',
  'system.skills.useComputer.miscMod': 'number',
  'system.skills.useTheForce.miscMod': 'number',

  // Progression and Resources
  'system.level': 'number',
  // Phase 3D: Canonical XP path is system.xp.total (not deprecated system.experience)
  'system.xp.total': 'number',
  'system.credits': 'number',
  'system.speed': 'number',
  'system.destinyPoints.value': 'number',
  'system.destinyPoints.max': 'number',
  'system.forcePoints.value': 'number',
  'system.forcePoints.max': 'number',
  'system.forcePointDie': 'string',

  // Biography and Notes
  'system.notes': 'string',
  'system.biography': 'string',
  'flags.swse.character.player': 'string',
  'flags.swse.character.age': 'string',
  'flags.swse.character.gender': 'string',
  'flags.swse.character.height': 'string',
  'flags.swse.character.weight': 'string',
  'flags.swse.character.biography': 'string',
  'flags.swse.character.campaignLog': 'string',
  'flags.swse.character.profileSummary': 'string',

  // Identity Fields
  'system.species': 'string',

  // Origin Fields (Background Step)
  'system.background': 'string',
  'system.event': 'string',
  'system.profession': 'string',
  'system.planetOfOrigin': 'string'
};

/**
 * Check if a field should be coerced to a specific type
 * @param {string} fieldName - Form field name (e.g. 'system.hp.value')
 * @returns {string|null} - Type ('number', 'boolean', 'string') or null if unknown
 */
function getFieldType(fieldName) {
  // Exact match first
  if (fieldName in FORM_FIELD_SCHEMA) {
    return FORM_FIELD_SCHEMA[fieldName];
  }

  // Dynamic skill booleans and fields
  if (/^system\.skills\.[^.]+\.(trained|focused|favorite)$/.test(fieldName)) {
    return 'boolean';
  }
  if (/^system\.skills\.[^.]+\.miscMod$/.test(fieldName)) {
    return 'number';
  }
  if (/^system\.skills\.[^.]+\.selectedAbility$/.test(fieldName)) {
    return 'string';
  }

  // Other boolean-backed checkboxes that may not be listed explicitly
  if (fieldName === 'system.conditionTrack.persistent') {
    return 'boolean';
  }

  // Pattern matching as fallback (conservative: only if explicit pattern exists)
  // This prevents over-aggressive coercion from field name heuristics
  if (fieldName.includes('notes') || fieldName.includes('description') || fieldName.includes('text')) {
    return 'string';
  }

  return null;
}

/**
 * GUARDRAIL 1: Context Contract Validator
 * Detects missing context keys that would cause silent template failures.
 *
 * This catches hydration bugs before they reach the template layer.
 * Also reports violations to Sentinel for system-wide tracking.
 */
function _swseDiagnosticsEnabled() {
  try {
    return game?.settings?.get?.('foundryvtt-swse', 'debugMode') === true
      || game?.settings?.get?.('foundryvtt-swse', 'postRenderDiagnostics') === true;
  } catch { return false; }
}

function validateContextContract(context, sheetName) {
  if (!_swseDiagnosticsEnabled()) return;
  const requiredKeys = [
    'equipment', 'armor', 'weapons',           // Inventory spread
    'followerSlots', 'followerTalentBadges',  // Follower context
    'xpEnabled', 'isLevel0', 'isGM',          // UI flags
    'fpAvailable', 'derived', 'abilities'     // Core data
  ];

  const missing = [];
  for (const key of requiredKeys) {
    if (!(key in context)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // Log to console for immediate feedback
    console.warn(
      `[SWSE Sheet] ${sheetName} missing context keys: ${missing.join(', ')}`,
      { context }
    );

    // Report to Sentinel for governance tracking
    SentinelSheetGuardrails.reportMissingContextKeys(sheetName, missing, context);
  }
}

/**
 * GUARDRAIL 2: Listener Watcher
 * Monitors for listener accumulation (common cause of memory leaks).
 *
 * If listeners exceed threshold, logs a warning to help catch render-loop leaks.
 * Also reports violations to Sentinel for governance tracking.
 */
function verifyListenerCleanup(element, sheetName, signal) {
  if (!element || !signal) return;

  // Check if the AbortSignal is still active (listeners should be cleaned up when aborted)
  // This is the real safeguard against listener leaks: AbortController signal cleanup
  if (signal.aborted) {
    swseLogger.debug(`[SWSE Sheet] ${sheetName} listeners have been cleaned up (signal aborted)`);
  } else {
    // swseLogger.debug(`[SWSE Sheet] ${sheetName} listeners are active; will be cleaned on next render via AbortController`);
  }

  // Note: Actual listener count requires browser internal APIs. Rely on AbortController
  // cleanup mechanism instead of heuristic checks.
}

export class SWSEV2CharacterSheet extends SWSEV2ActorSheetBase {

  /**
   * Character/npc/droid-specific render wiring, called by
   * SWSEV2ActorSheetBase._onRender after its shared preamble. Mirrors the
   * original _onRender non-vehicle branch verbatim.
   */
  _onRenderActorSheet(root, signal) {
    // Wire listeners to the sheet root
    this.activateListeners(root, { signal });
    if (this.document?.type === 'npc') {
      this._wireNpcConceptSheetEvents(root, signal);
    }
    activateCustomSkillsUI(this, root, { signal });
    applyResourceNumberAnimations(this, root);
    applyResourceBarAnimations(this, root);

    if (!['chargen', 'progression'].includes(this._shellSurface)) {
      maybePromptForDatapadRegistration(this).catch((err) => {
        swseLogger.warn('[Datapad Registration] Onboarding prompt failed', err);
      });
    }

    const recentHydrationMutation = getRecentHydrationMutation(this);
    if (recentHydrationMutation) {
      emitHydrationWarning('POST_RENDER_DOM_STATE', {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        mutation: recentHydrationMutation,
        dom: {
          header: !!root.querySelector('.sheet-header'),
          biographyPanel: !!root.querySelector('.character-record-header, .swse-panel--identity'),
          defensePanel: !!root.querySelector('.swse-panel--defenses'),
          healthPanel: !!root.querySelector('.swse-panel--health')
        },
        snapshot: captureHydrationSnapshot(this.actor),
        defensePanel: summarizeDefensePanel(this._currentContext?.defensePanel),
        biographyPanel: summarizeBiographyPanel(this._currentContext?.biographyPanel)
      });
    }
    // Portrait upload + auto-apply (click-to-pick via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    // Wire tooltip bindings for micro-tooltips
    bindV2CharacterSheetTooltips(this.document, root, this._renderAbort);

    // Run post-render assertions only for visible panels (phase 2 audit: contract verification)
    const visiblePanels = this.visibilityManager.getPanelsToBuild(this.document);
    PostRenderAssertions.runAll(root, this._currentContext || {}, visiblePanels);

    // Wire pinned breakdown card interactions
    bindV2SheetBreakdowns(this.document, root, this._renderAbort);

    // Close any open breakdown card on rerender (cleanup)
    closeBreakdown();

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(root, this.document);

    // Verify listener cleanup mechanism is in place (AbortController signal cleanup)
    verifyListenerCleanup(root, "SWSEV2CharacterSheet", signal);

    // ═══ DIAGNOSTICS: Final snapshot after all listeners wired ═══
    characterSheetDiagnostics.snapshot('_onRender COMPLETE (all listeners wired)', this);

    // ═══ COMPREHENSIVE VISIBILITY DUMP ═══
    // Uncomment to debug visibility issues: this._logVisibilityDump(root);

    // ═══ AUTO-DIAGNOSTICS: Run detailed analysis on every open ═══
    setTimeout(() => {
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');
      // swseLogger.debug('[SWSE SheetDiag] AUTO-RUNNING CHARACTER SHEET DIAGNOSTICS');
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');
      characterSheetDiagnostics.inspectHeightChain(this);
      characterSheetDiagnostics.listOverflowingElements(this);
      characterSheetDiagnostics.inspectAppState(this);
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');

      if (this._shellSurface === 'sheet') {
        // ═══ CONTRACT ENFORCEMENT: Validate architecture compliance ═══
        // swseLogger.debug('[CHARACTER SHEET CONTRACT] RUNNING ENFORCEMENT VALIDATION');
        CharacterSheetContractEnforcer.validateAndReport(this.element);

        // ═══ DEBUG: Print exact violation details for fixing ═══
        // swseLogger.debug('\n');
        // swseLogger.debug('╔════════════════════════════════════════════════════════════════╗');
        // swseLogger.debug('║          EXACT VIOLATIONS FOR DEBUGGING AND FIXING             ║');
        // swseLogger.debug('╚════════════════════════════════════════════════════════════════╝');
        CharacterSheetContractEnforcer.debugScrollOwners(this.element);
        CharacterSheetContractEnforcer.debugIllegalPanelScrollers(this.element);
        CharacterSheetContractEnforcer.debugWindowContentMinHeight(this.element);
        CharacterSheetContractEnforcer.debugHeightChain(this.element);
      }
    }, 100);

    // ─── Phase 11: Shell Host Registration + Event Wiring ─────────────────
    // Register only once per session (first render) to avoid redundant re-registration
    if (this.actor?.id && !this._shellRouterRegistered) {
      ShellRouter.register(this.actor.id, this);
      this._shellRouterRegistered = true;
    }
    this._wireShellEvents(root, signal);
  }

  /**
   * Character/npc/droid-specific context assembly, called by
   * SWSEV2ActorSheetBase._prepareContext after its shared preamble (which
   * already resolved the vehicle branch before reaching here -- see
   * SWSEV2VehicleSheet._prepareContextForActorSheet). Mirrors the original
   * _prepareContext non-vehicle body verbatim.
   */
  async _prepareContextForActorSheet({
    actor,
    system,
    sheetEditable,
    actorModeContext,
    isDroidActor,
    isNpcActor,
    isVehicleActor,
    isNpcActorDocument,
    isPromotedHeroicNpcActor,
    useNpcConceptSheet,
    useVehicleSheet,
    context,
    derived,
    contextTimer
  }) {
    let panelContexts = {};

    if (useNpcConceptSheet) {
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

    // Define ability constants used for multiple safeguards
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const ABILITY_LABELS = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma'
    };
    const sheetAbilityKeys = isDroidActor ? ABILITY_KEYS.filter((key) => key !== 'con') : ABILITY_KEYS;

    // Normalize critical derived structures to prevent undefined path errors in templates
    derived.talents ??= {};
    derived.talents.groups ??= [];
    derived.talents.list ??= [];

    const canonicalDerivedSkills = (
      derived.skills &&
      typeof derived.skills === 'object' &&
      !Array.isArray(derived.skills)
    ) ? foundry.utils.duplicate(derived.skills) : {};
    const hasCanonicalSkillMap = Object.keys(canonicalDerivedSkills).length > 0;
    const derivedAttributesMap = (
      derived.attributes &&
      typeof derived.attributes === 'object' &&
      !Array.isArray(derived.attributes)
    ) ? derived.attributes : {};

    derived.skills ??= {};

    derived.attacks ??= {};
    derived.attacks.list ??= [];

    derived.actions ??= {};
    derived.actions.groups ??= [];

    derived.identity ??= {};
    derived.identity.level ??= Number(system.level ?? system.progression?.level ?? 1) || 1;
    derived.identity.halfLevel = Math.floor(Math.max(1, Number(derived.identity.level) || 1) / 2);
    // Provide ability array for skills panel selectors (used in skills-panel.hbs line 75)
    derived.identity.abilities ??= sheetAbilityKeys.map(key => ({
      key,
      label: ABILITY_LABELS[key]
    }));

    derived.encumbrance ??= {};
    derived.encumbrance.state ??= "normal";
    derived.encumbrance.label ??= "Unencumbered";
    derived.encumbrance.total ??= 0;
    derived.encumbrance.lightLoad ??= 0;
    derived.encumbrance.mediumLoad ??= 0;
    derived.encumbrance.heavyLoad ??= 0;

    // Ensure defenses object has all required defense keys initialized to defaults
    // PHASE 6: Defense contract normalized through defensePanel builder
    // Header and body both use defensePanel for canonical defense display model
    // This removes the sheet-local normalization hack and uses engine-owned derived data directly
    // Ensure damage threshold has default
    // CRITICAL: DerivedCalculator stores at derived.damageThreshold (flat), not derived.damage.threshold
    derived.damageThreshold ??= 10;  // Default to Fortitude value (usually 10)
    derived.damage ??= {};
    derived.damage.conditionHelpless ??= false;

    // SWSE Skills Registry - CANONICAL: Must match Actor data model / derived calculator keys exactly.
    // Athletics consolidation house rule: Acrobatics + Climb + Jump + Swim → Athletics.
    const _athleticsOn = (() => { try { return game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true; } catch { return false; } })();
    const SWSE_SKILL_DEFINITIONS = {
      ...(!_athleticsOn ? { acrobatics: { label: 'Acrobatics', ability: 'dex' } } : {}),
      ...(!_athleticsOn ? { climb: { label: 'Climb', ability: 'str' } } : {}),
      deception: { label: 'Deception', ability: 'cha' },
      endurance: { label: 'Endurance', ability: 'con' },
      gatherInformation: { label: 'Gather Information', ability: 'cha' },
      initiative: { label: 'Initiative', ability: 'dex' },
      ...(!_athleticsOn ? { jump: { label: 'Jump', ability: 'str' } } : {}),
      ...(_athleticsOn ? { athletics: { label: 'Athletics', ability: 'dex', _consolidated: true } } : {}),
      knowledgeBureaucracy: { label: 'Knowledge (Bureaucracy)', ability: 'int' },
      knowledgeGalacticLore: { label: 'Knowledge (Galactic Lore)', ability: 'int' },
      knowledgeLifeSciences: { label: 'Knowledge (Life Sciences)', ability: 'int' },
      knowledgePhysicalSciences: { label: 'Knowledge (Physical Sciences)', ability: 'int' },
      knowledgeSocialSciences: { label: 'Knowledge (Social Sciences)', ability: 'int' },
      knowledgeTactics: { label: 'Knowledge (Tactics)', ability: 'int' },
      knowledgeTechnology: { label: 'Knowledge (Technology)', ability: 'int' },
      mechanics: { label: 'Mechanics', ability: 'int' },
      perception: { label: 'Perception', ability: 'wis' },
      persuasion: { label: 'Persuasion', ability: 'cha' },
      pilot: { label: 'Pilot', ability: 'dex' },
      ride: { label: 'Ride', ability: 'dex' },
      stealth: { label: 'Stealth', ability: 'dex' },
      survival: { label: 'Survival', ability: 'wis' },
      ...(!_athleticsOn ? { swim: { label: 'Swim', ability: 'str' } } : {}),
      treatInjury: { label: 'Treat Injury', ability: 'wis' },
      useComputer: { label: 'Use Computer', ability: 'int' },
      useTheForce: { label: 'Use the Force', ability: 'cha' }
    };

    // FIRST: Build abilities map from canonical stored components plus derived totals.
    // The actor stores base/species/misc/temp in system.abilities, while the live
    // modifier/total contract is emitted by the derived engine. If derived is late
    // during a repaint, compute from stored components instead of defaulting to 10/+0.
    const abilitiesMap = system.attributes ?? system.abilities ?? {};
    const legacyAbilitiesMap = system.abilities ?? {};
    const abilityMap = {
      'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution',
      'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma'
    };

    const toFiniteNumber = (value, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    const toSignedText = (value) => {
      const n = Number(value) || 0;
      return n >= 0 ? `+${n}` : String(n);
    };

    const buildSkillMathTooltip = (label, total, derivedData = {}, fallbackParts = {}) => {
      const parts = Array.isArray(derivedData?.math?.parts)
        ? derivedData.math.parts
        : (Array.isArray(derivedData?.breakdown) ? derivedData.breakdown : []);
      const sourceParts = parts.length ? parts : [
        { key: 'ability', label: `${String(fallbackParts.selectedAbility || '').toUpperCase()} modifier`, value: fallbackParts.abilityMod },
        { key: 'halfLevel', label: '1/2 heroic level', value: fallbackParts.halfLevel },
        { key: 'trained', label: 'Trained', value: fallbackParts.trained ? 5 : 0 },
        { key: 'focus', label: 'Skill Focus', value: fallbackParts.focused ? 5 : 0 },
        { key: 'misc', label: 'Misc', value: fallbackParts.miscMod }
      ];
      const shown = sourceParts
        .filter(part => (Number(part?.value) || 0) !== 0 || ['ability', 'halfLevel', 'trained', 'focus', 'misc'].includes(part?.key))
        .map(part => `${part?.label || part?.key || 'Modifier'}: ${toSignedText(part?.value)}`)
        .join(' | ');
      const note = derivedData?.substitutionNote ? ` | ${derivedData.substitutionNote}` : '';
      return `${label || 'Skill'} = ${toSignedText(total)}${shown ? ` (${shown})` : ''}${note}`;
    };

    const abilities = sheetAbilityKeys.map(key => {
      const ability = abilitiesMap[key] ?? {};
      const legacyAbility = legacyAbilitiesMap[key] ?? {};
      const derivedAbility = derivedAttributesMap[key] ?? {};
      const base = toFiniteNumber(ability.base ?? legacyAbility.base ?? derivedAbility.base, 10);
      const racial = toFiniteNumber(ability.racial ?? ability.species ?? legacyAbility.racial ?? legacyAbility.species ?? derivedAbility.racial ?? derivedAbility.species, 0);
      const enhancement = toFiniteNumber(ability.enhancement ?? ability.misc ?? legacyAbility.enhancement ?? legacyAbility.misc ?? derivedAbility.enhancement ?? derivedAbility.misc, 0);
      const temp = toFiniteNumber(ability.temp ?? legacyAbility.temp ?? derivedAbility.temp, 0);
      const total = Number.isFinite(Number(derivedAbility.total))
        ? Number(derivedAbility.total)
        : Number.isFinite(Number(ability.total))
          ? Number(ability.total)
          : base + racial + enhancement + temp;
      const mod = Number.isFinite(Number(derivedAbility.mod))
        ? Number(derivedAbility.mod)
        : Number.isFinite(Number(ability.mod))
          ? Number(ability.mod)
          : Math.floor((total - 10) / 2);
      return {
        key,
        label: ABILITY_LABELS[key],
        base,
        racial,
        enhancement,
        temp,
        total,
        mod,
        // SEMANTIC: Visual state class for modifier
        modClass: mod > 0 ? 'mod--positive' : mod < 0 ? 'mod--negative' : 'mod--zero'
      };
    });
    const abilityByKey = new Map(abilities.map((ability) => [ability.key, ability]));

    // Build skills array from system.derived.skills (SSOT) - NO CALCULATIONS HERE
    // The derived engine has already calculated all skill bonuses
    const systemSkills = system.skills ?? {};
    const derivedSkills = canonicalDerivedSkills;

    const _athleticsComponentKeys = ['acrobatics', 'climb', 'jump', 'swim'];
    const skillsList = Object.entries(SWSE_SKILL_DEFINITIONS).map(([key, definition]) => {
      // Athletics consolidation: derive from max of component skills
      const isConsolidated = definition._consolidated === true;
      const skillData = isConsolidated
        ? {
            trained: _athleticsComponentKeys.some(k => systemSkills[k]?.trained === true),
            focused: _athleticsComponentKeys.some(k => systemSkills[k]?.focused === true),
            favorite: _athleticsComponentKeys.some(k => systemSkills[k]?.favorite === true),
            classSkill: _athleticsComponentKeys.some(k => systemSkills[k]?.classSkill === true),
            miscMod: _athleticsComponentKeys.reduce((sum, k) => sum + (Number(systemSkills[k]?.miscMod) || 0), 0),
            extraUses: []
          }
        : (systemSkills[key] ?? {});
      const derivedData = isConsolidated
        ? { total: Math.max(..._athleticsComponentKeys.map(k => Number((derivedSkills[k] ?? systemSkills[k])?.total ?? 0)), 0) }
        : (derivedSkills[key] ?? {});

      // Get selected ability from user data
      const selectedAbilityKey = skillData.selectedAbility ?? definition.ability ?? 'str';
      const selectedAbilityLabel = abilityMap[selectedAbilityKey] ?? 'Unknown';

      // Get ability modifier from the hardened ability VM, not directly from
      // system.abilities.*.mod. The stored ability object often has no .mod during
      // Foundry's repaint cycle.
      const selectedAbility = abilityByKey.get(selectedAbilityKey) ?? {};
      const abilityMod = Number.isFinite(Number(derivedData.abilityMod))
        ? Number(derivedData.abilityMod)
        : Number.isFinite(Number(selectedAbility.mod))
          ? Number(selectedAbility.mod)
          : 0;

      // Use the derived engine's exact half-level contribution when present.
      // This may be 0 when a house rule disables half-level skill bonuses.
      const fallbackHalfLevel = Math.max(0, Math.floor((system.level ?? 1) / 2));
      const halfLevel = Number.isFinite(Number(derivedData.halfLevel)) ? Number(derivedData.halfLevel) : fallbackHalfLevel;

      // Ensure all numeric values are safe for template rendering
      const safeMiscMod = toFiniteNumber(skillData.miscMod, 0);

      // Derived is authoritative for skill totals when present. During a direct
      // sheet edit repaint, however, derived can be momentarily unavailable. Use a
      // stable display fallback from the canonical stored components so one checkbox
      // cannot repaint the whole skill ledger as zero.
      const focusedBonus = skillData.focused ? 5 : 0;
      const trainedBonus = skillData.trained ? 5 : 0;
      const fallbackTotal = abilityMod + halfLevel + safeMiscMod + trainedBonus + focusedBonus;
      const safeTotal = Number.isFinite(Number(derivedData.total))
        ? Number(derivedData.total)
        : Number.isFinite(Number(skillData.total))
          ? Number(skillData.total)
          : fallbackTotal;
      const mathTooltip = buildSkillMathTooltip(definition.label, safeTotal, derivedData, {
        selectedAbility: selectedAbilityKey,
        abilityMod,
        halfLevel,
        trained: Boolean(skillData.trained),
        focused: Boolean(skillData.focused),
        miscMod: safeMiscMod
      });

      return {
        key,
        label: definition.label,
        // Prefer derived total when present; otherwise use stable fallback display total
        total: safeTotal,
        trained: Boolean(skillData.trained),
        focused: Boolean(skillData.focused),
        favorite: Boolean(skillData.favorite),
        selectedAbility: selectedAbilityKey,
        selectedAbilityLabel,
        // Display the ability modifier (from the abilities, not calculated here)
        abilityMod,
        abilityModClass: abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero',
        // Display half-level (not calculated, just displayed)
        halfLevel,
        miscMod: safeMiscMod,
        extraUses: Array.isArray(skillData.extraUses) ? skillData.extraUses : [],
        mathTooltip,
        breakdownParts: Array.isArray(derivedData?.math?.parts) ? derivedData.math.parts : (Array.isArray(derivedData?.breakdown) ? derivedData.breakdown : [])
      };
    });

    derived.skillsByKey = canonicalDerivedSkills;
    derived.skills = skillsList;

    // Phase 10+: Populate extraUses from ExtraSkillUseRegistry with enhanced UX
    // Adds expandable skill uses with intelligent grouping, status awareness, and filtering.
    //
    // Hydration is staged so one bad skill never wipes the whole panel:
    //  1. Registry init is its own failure domain — if it throws, the registry is
    //     unusable, so every skill fails closed. This is a hard prereq.
    //  2. Per-skill hydration runs inside its own try/catch, so a single skill's
    //     failure is isolated to that row. Errors are logged with skill key,
    //     actor id/name, and stack so live runs produce a concrete trail.
    let registryReady = true;
    try {
      await ExtraSkillUseRegistry.initialize();
    } catch (err) {
      registryReady = false;
      swseLogger.error("[CharacterSheet] ExtraSkillUseRegistry.initialize() failed; every skill will have empty extraUses", {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message,
        stack: err?.stack
      });
    }

    for (const skill of derived.skills) {
      if (!registryReady) {
        skill.extraUses = [];
        skill.extraUsesGrouped = {};
        skill.extraUsesCount = 0;
        skill.hasExtraUses = false;
        continue;
      }

      try {
        const skillUses = await ExtraSkillUseRegistry.getForSkill(skill.key, { actor, includeInaccessible: true });
        const rawCount = skillUses.length;
        const accessibleCount = skillUses.filter(u => u.accessible !== false).length;
        const inaccessibleCount = rawCount - accessibleCount;

        // Normalize each skill use with enhanced metadata
        const normalizedUses = skillUses.map(use => {
          const timeClass = this._getTimeClass(use.time);
          const timeLabel = this._getTimeLabel(use.time);
          const actionType = this._classifyActionType(use);
          const actionTypeLabel = this._getActionTypeLabel(use);
          const isBlocked = use.trainedOnly && !skill.trained;
          const blockedReason = isBlocked ? "Requires training" : "";
          const sourceType =
            use.sourceType ??
            use.source ??
            (use.trainedOnly ? "trained" : "core");
          const sourceLabel =
            use.sourceLabel ??
            use.sourceName ??
            (use.trainedOnly ? "Trained Use" : "Core Use");

          return {
            key: use.key,
            useKey: use.key,
            label: use.label,
            name: use.name,
            dc: use.dc,
            time: use.time,
            description: use.description || use.effect || '',
            effect: use.effect,
            trainedOnly: use.trainedOnly,
            // Action economy styling
            timeClass,
            timeLabel,
            // Action type classification
            actionType,
            actionTypeLabel,
            // Status awareness
            requiresTrained: use.trainedOnly,
            skillTrained: skill.trained,
            isBlocked,
            canUseNow: !isBlocked,
            blockedReason,
            // Provenance / runtime stability
            sourceType,
            sourceLabel,
            // Grouping category
            category: this._categorizeSkillUse(use, skill.key)
          };
        });

        // Group uses by category for better scanning
        const grouped = {};
        normalizedUses.forEach(use => {
          const cat = use.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(use);
        });

        // Store both flat array (for backwards compatibility) and grouped structure
        skill.extraUses = normalizedUses;
        skill.extraUsesGrouped = grouped;
        skill.extraUsesCount = normalizedUses.length;
        skill.hasExtraUses = normalizedUses.length > 0;

        // Targeted instrumentation: always log useTheForce (the primary offender),
        // and log any skill that lost entries between registry and template
        // (raw>0 but grouped==0 means something dropped silently mid-pipeline).
        const groupedCount = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);
        const hasSilentDrop = rawCount > 0 && groupedCount === 0;
        if (skill.key === 'useTheForce' || hasSilentDrop) {
          swseLogger.debug("[CharacterSheet] Skill extra-use hydration metrics", {
            actorId: actor?.id,
            actorName: actor?.name,
            skillKey: skill.key,
            skillLabel: skill.label,
            trained: skill.trained,
            rawCount,
            accessibleCount,
            inaccessibleCount,
            normalizedCount: normalizedUses.length,
            groupedCount,
            hasExtraUses: skill.hasExtraUses,
            silentDrop: hasSilentDrop
          });
        }
      } catch (err) {
        swseLogger.error("[CharacterSheet] extra-use hydration failed for skill", {
          actorId: actor?.id,
          actorName: actor?.name,
          skillKey: skill.key,
          skillLabel: skill.label,
          error: err?.message,
          stack: err?.stack
        });
        skill.extraUses = [];
        skill.extraUsesGrouped = {};
        skill.extraUsesCount = 0;
        skill.hasExtraUses = false;
      }
    }

    // PHASE 7.5: Defenses view-model note
    // buildDefensesViewModel() is used by PanelContextBuilder.buildDefensePanel()
    // Header defenses are read directly from defensePanel.defenses (which is built by that helper)
    // No separate headerDefenses computation needed — one canonical source

    // PHASE 7: Read class display from canonical derived.identity bundle
    // character-actor.js.mirrorIdentity() builds this — sheet should never rebuild it
    let classDisplay = derived.identity?.classDisplay ?? '—';

    // Identity + visual customization
    const forceSensitive = hasForceSensitivityAccess(actor);
    const identityGlowColor = forceSensitive ? '#88cfff' : '#666666';

    // Condition track steps (0-5 numeric → visual array)
    const conditionCurrent = system.conditionTrack?.current ?? 0;
    const conditionLabels = ["Normal", "−1", "−2", "−5", "−10", "Helpless"];
    const conditionSteps = [];
    for (let i = 0; i < 6; i++) {
      conditionSteps.push({
        step: i,
        label: conditionLabels[i],
        active: i === conditionCurrent
      });
    }

    // Initiative total (from derived calculation)
    const initiativeTotal = Number(derived?.initiative?.total ?? derived?.initiative ?? 0) || 0;

    // Combat attacks context
    // PHASE 6: Derived is authoritative for item-backed attacks.
    // PHASE 10: Removed happy-path fallback rebuild. If derived.attacks.list is missing
    // while equipped/auto-equipped weapon sources exist, report it instead of rebuilding from items.
    //
    // Important: the always-available Unarmed Attack is intentionally built as a virtual
    // sheet/action context below, not as an item-backed entry in derived.attacks.list.
    // Therefore a character with no equipped weapons should NOT be treated as a missing
    // derived-attacks failure.
    const attacksBundle = derived?.attacks;
    let attacksList = Array.isArray(attacksBundle?.list) ? attacksBundle.list : [];
    const actorItems = Array.from(actor?.items ?? []);
    const isEquippedForAttack = (item) => {
      const truthy = (value) => {
        if (value === true || Number(value) === 1) return true;
        if (value && typeof value === 'object') return truthy(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
        return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active', 'activated', 'natural'].includes(String(value || '').toLowerCase());
      };
      const system = item?.system ?? {};
      return truthy(system.equipped)
        || truthy(system.isEquipped)
        || truthy(system.equipStatus)
        || truthy(system.status)
        || truthy(system.state)
        || truthy(system.active)
        || truthy(system.readied)
        || truthy(system.equippable?.equipped)
        || truthy(system.equippable?.active)
        || truthy(system.activation?.active)
        || truthy(item?.flags?.swse?.equipped)
        || isAutoEquippedNaturalWeaponForCombat(item, truthy)
        || isIntegratedDroidAttackItem(item, actor, truthy);
    };
    const hasWeaponDamageProfile = (item) => {
      const system = item?.system ?? {};
      return [system.damage, system.damageFormula, system.damageRoll, system.formula, system.weapon?.damage, system.attack?.damage, system.rolls?.damage]
        .some((value) => value !== undefined && value !== null && value !== '');
    };
    const isAttackItemForSheet = (item) => {
      if (!item) return false;
      if (['weapon', 'lightsaber'].includes(item.type)) return true;
      if (!hasWeaponDamageProfile(item)) return false;
      const system = item.system ?? {};
      const text = [item.type, item.name, system.type, system.itemType, system.category, system.itemCategory, system.equipmentType, system.weaponType, system.weaponCategory, system.weaponGroup, system.group, system.subtype]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return /weapon|lightsaber|blaster|rifle|pistol|melee|ranged|thrown|grenade|simple|advanced|heavy/.test(text);
    };
    const equippedAttackItemIds = new Set(actorItems
      .filter(item => isAttackItemForSheet(item) && isEquippedForAttack(item))
      .map(item => item.id));

    // The Gear tab is the user-facing evidence that a weapon is equipped. If the
    // inventory panel sees an equipped weapon row, treat that as an expected combat
    // attack even when actor preparation is between derived passes.
    const inventoryWeaponRows = Array.isArray(panelContexts?.inventoryPanel?.grouped?.Weapons)
      ? panelContexts.inventoryPanel.grouped.Weapons
      : [];
    for (const row of inventoryWeaponRows) {
      if (row?.equipped === true && row?.id) {
        equippedAttackItemIds.add(row.id);
      }
    }

    const expectedItemBackedAttackCount = equippedAttackItemIds.size;
    const missingAttackBundle = !attacksBundle || !Array.isArray(attacksBundle.list);
    const derivedAttackWeaponIds = new Set(attacksList.map((attack) => attack?.weaponId ?? attack?.itemId ?? attack?.sourceId).filter(Boolean));
    const missingExpectedItemBackedAttacks = expectedItemBackedAttackCount > 0
      && Array.from(equippedAttackItemIds).some((id) => !derivedAttackWeaponIds.has(id));

    // Derived remains authoritative, but the combat tab must stay usable during
    // the short prepare/render window before async derived attacks have landed.
    // Use the legacy builder as a display-only rescue when equipped weapon
    // sources exist but no item-backed derived attacks were emitted.
    if (missingAttackBundle || missingExpectedItemBackedAttacks) {
      swseLogger.debug(`[Attacks] Derived item-backed attacks missing for ${actor.name}; using display rescue.`, {
        actor: actor.name,
        expectedItemBackedAttackCount,
        derivedAttacks: attacksBundle
      });
      attacksList = this._buildAttacksFallback(actor, { inventoryPanel: panelContexts?.inventoryPanel });

      if (CONFIG?.SWSE?.debug?.contractObservability) {
        warnMissingDerivedOutput('Attacks', 'derived.attacks.list', actor.name);
      }
    }

    const unarmedAttack = buildUnarmedAttackContext(actor);
    const combat = {
      attacks: attacksList,
      unarmedAttack
    };

    // PHASE 7.5: Resources Display Unification
    // Canonical sources: system.forcePoints.{value,max}, system.destinyPoints.{value,max}
    // All UI surfaces (header, biography panel, resources panel) read from these same sources
    // Force Points visual array (value as dots, with used state)
    const fpValue = Number(system.forcePoints?.value ?? 0) || 0;
    const fpMax = Number(system.forcePoints?.max ?? 0) || 0;
    const bonusForcePoints = GuardianSpiritActions.getBonusForcePoints(actor);
    const hasGuardianSpiritTalent = GuardianSpiritActions.hasTalent(actor, 'Guardian Spirit');

    const destinyPointsValue = Number(system.destinyPoints?.value ?? 0) || 0;
    const destinyPointsMax = Number(system.destinyPoints?.max ?? 0) || 0;

    const speed = Number(
      derived?.speed?.walk ??
      derived?.speed?.total ??
      derived?.identity?.speed ??
      system.speed?.total ??
      system.speed?.value ??
      system.speed ??
      system.movement?.walk ??
      system.movement?.speed ??
      0
    ) || 0;

    const perceptionTotal = Number(
      canonicalDerivedSkills?.perception?.total ??
      skillsList.find((skill) => skill.key === 'perception')?.total ??
      0
    ) || 0;

    const bab = Number(
      derived.bab ??
      system.bab?.total ??
      system.bab ??
      system.baseAttackBonus ??
      0
    ) || 0;

    const grappleBonus = Number(derived.grappleBonus ?? 0) || 0;
const forcePoints = [];
    for (let i = 1; i <= fpMax; i++) {
      forcePoints.push({
        index: i,
        used: i <= fpValue
      });
    }

    // Force suite context (hand/discard zones + tag filtering).  Existing actors
    // can carry legacy typed FORCE_POWER items, so classify semantically.
    const forcePowers = (actor?.items ?? []).filter(i => isForcePowerItem(i));
    const forceTags = [...new Set(forcePowers.flatMap(p => p.system?.tags ?? []))].sort();
    const toPlain = p => ({ id: p.id, name: p.name, img: p.img, system: foundry.utils.duplicate(p.system ?? {}) });
    const forceSuite = {
      hand: forcePowers.filter(p => !p.system?.discarded).map(toPlain),
      discard: forcePowers.filter(p => p.system?.discarded).map(toPlain),
      forcePowerExecutionEnabled: true
    };

    const lightsaberConstructionEligibility = LightsaberConstructionEngine.getEligibility(actor);
    const lightsaberHasSelfBuilt = LightsaberConstructionEngine.hasSelfBuiltLightsaber(actor);
    const lightsaberConstructionDeferred = actor.getFlag?.('foundryvtt-swse', 'lightsaberConstructionDeferred') === true;
    const lightsaberConstructionAvailable = !lightsaberHasSelfBuilt && !!lightsaberConstructionEligibility?.eligible;

    // Build mode (free build = prerequisites not enforced, typically set during chargen)
    const buildMode = actor.system?.buildMode ?? "normal";

    // Action Economy Context (for combat tab)
    let actionEconomyTurnState = null;
    let actionEconomyEngine = null;
    let actionEconomy = buildSheetActionEconomyContext({ active: false });
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

      const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
      actionEconomyTurnState = turnState;
      actionEconomyEngine = ActionEngine;
      const state = ActionEngine.getVisualState(turnState);
      const breakdown = ActionEngine.getTooltipBreakdown(turnState);
      const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');

      actionEconomy = buildSheetActionEconomyContext({
        turnState,
        state,
        breakdown,
        enforcementMode,
        active: true
      });
    }

    // Header Second Wind Context (always visible in header area)
    const swBaseHealing = Math.max(1, Math.ceil((Number(system.hp?.max ?? system.derived?.hp?.max ?? 1) || 1) * 0.25));
    const swRawMax = Number(system.secondWind?.max);
    const swMax = Math.max(1, Number.isFinite(swRawMax) && swRawMax > 0 ? swRawMax : 1);
    const swRawUses = Number(system.secondWind?.uses);
    const swUses = Math.max(0, Math.min(swMax, Number.isFinite(swRawUses) ? swRawUses : swMax));
    const swRawHealing = Number(system.secondWind?.healing);
    const swHealing = Number.isFinite(swRawHealing) && swRawHealing > 0 ? swRawHealing : swBaseHealing;
    const headerSecondWind = {
      canUse: swUses > 0,
      usesRemaining: swUses,
      maxUses: swMax,
      healingAmount: swHealing,
      label: `Regain ${swHealing} HP`
    };

    // Combat Actions Context (for combat tab - actions browser)
    // Primary source: combat-action compendium through CombatActionsMapper.
    // Fallback: data/combat-actions.json.  The sheet keeps a lookup map so
    // clicking a card has the same hydrated data that rendered the card.
    let combatActions = { groups: [] };
    let combatActionLookup = {};
    const economyOrder = ['full-round', 'standard', 'move', 'swift', 'free', 'reaction'];
    const economyLabel = (value) => String(value || 'standard')
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const slugAction = (value) => String(value || 'combat-action')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'combat-action';
    const normalizeActionEconomy = (value) => this._normalizeActionEconomyType(value || 'standard');
    const economyViolationLabel = (code) => ({
      FULL_ROUND_NOT_AVAILABLE: 'Full-round unavailable',
      FULL_ROUND_ALREADY_USED: 'Full-round already used',
      INSUFFICIENT_STANDARD: 'No standard action',
      INSUFFICIENT_MOVE: 'No move action',
      INSUFFICIENT_SWIFT: 'No swift action',
      INSUFFICIENT_REACTION: 'No reaction available'
    }[code] ?? String(code || 'Unavailable'));
    const previewActionEconomy = (actionType, row = {}) => {
      const normalized = normalizeActionEconomy(actionType);
      if (!actionEconomyTurnState || row.spendAction === false || ['free', 'passive'].includes(normalized)) {
        return { available: true, label: row.spendAction === false ? 'No action spent' : 'Available' };
      }
      if (normalized === 'reaction') {
        const current = Number(actionEconomyTurnState.reactions?.current ?? 1) || 0;
        return current > 0
          ? { available: true, label: 'Available' }
          : { available: false, label: 'No reaction available', violations: ['INSUFFICIENT_REACTION'] };
      }
      const cost = actionEconomyEngine?.costForActionType?.(normalized) ?? this._actionEconomyCostForType?.(normalized, actionEconomyEngine) ?? {};
      const preview = actionEconomyEngine?.previewConsume?.(actionEconomyTurnState, cost) ?? { allowed: true, violations: [] };
      return {
        available: preview.allowed !== false,
        label: preview.allowed === false ? economyViolationLabel(preview.violations?.[0]) : 'Available',
        violations: preview.violations ?? [],
        preview
      };
    };
    const registerAction = (grouped, action) => {
      const key = action.key || action.id || slugAction(action.name);
      const actionType = normalizeActionEconomy(action.actionType || action.type || action.action?.type || action.costType || 'standard');
      const relatedSkills = action.relatedSkills || action.system?.relatedSkills || [];
      const manualResolution = action.manualResolution === true || action.resolutionMode === 'manual' || action.resolutionMode === 'reference';
      const economyPreview = previewActionEconomy(actionType, action);
      const strictEconomy = actionEconomy?.enforcementMode === 'strict';
      const row = {
        key,
        id: key,
        name: action.name || action.label || 'Combat Action',
        sourceName: action.sourceName || action.source || action.system?.source || 'Combat Action',
        sourceType: action.sourceType || action.itemType || action.system?.sourceType || '',
        sourceActionId: action.sourceActionId || action.actionId || '',
        actionType,
        type: actionType,
        cost: action.cost ?? action.actionCost ?? action.action?.cost ?? 1,
        actionCost: action.actionCost ?? action.system?.actionCost ?? null,
        notes: action.notes || action.description || action.system?.notes || action.system?.description || '',
        description: action.description || action.notes || action.system?.description || action.system?.notes || '',
        relatedSkills,
        hasRelatedSkills: Array.isArray(relatedSkills) ? relatedSkills.length > 0 : !!relatedSkills,
        resources: action.resources || [],
        contextTags: action.contextTags || action.tags || [],
        automationBoundary: action.automationBoundary || action.boundary || null,
        gmManaged: action.gmManaged === true,
        itemId: action.itemId || action.sourceItemId || '',
        executable: action.executable !== false,
        useLabel: action.useLabel || (manualResolution ? 'Use / Note' : 'Use'),
        economyAvailable: economyPreview.available,
        availabilityLabel: economyPreview.label,
        economyViolations: economyPreview.violations ?? [],
        disabled: action.executable !== false && action.spendAction !== false && strictEconomy && economyPreview.available === false,
        manualResolution,
        resolutionMode: action.resolutionMode || (manualResolution ? 'manual' : 'auto'),
        spendAction: action.spendAction !== false,
        requiresSelectedChoice: action.requiresSelectedChoice === true,
        requiredContext: action.requiredContext || [],
        targetHint: action.targetHint || '',
        ruleData: action.ruleData || null,
        isAttack: action.isAttack === true
      };
      const grappleRestriction = GrappleStateEngine.evaluateAction(this.actor, row);
      if (grappleRestriction?.restricted) {
        row.grappleRestricted = true;
        row.restrictionState = grappleRestriction.state ?? '';
        row.restrictionLabel = grappleRestriction.label ?? '';
        row.restrictionReason = grappleRestriction.reason ?? '';
        row.availabilityLabel = grappleRestriction.allowed === false
          ? (grappleRestriction.label ?? row.availabilityLabel)
          : row.availabilityLabel;
        if (grappleRestriction.allowed === false && row.executable !== false) {
          row.disabled = true;
          row.economyAvailable = false;
          row.economyViolations = [...(row.economyViolations ?? []), `GRAPPLE_${String(grappleRestriction.state ?? 'RESTRICTED').toUpperCase()}`];
        }
      }
      if (!grouped[actionType]) grouped[actionType] = [];
      grouped[actionType].push(row);
      combatActionLookup[key] = row;
    };

    const combatActionCacheKey = this._buildCombatActionCacheKey({ actor, actionEconomyTurnState });
    const cachedCombatActions = this._getCachedCombatActionContext(combatActionCacheKey);
    if (cachedCombatActions) {
      combatActions = foundry.utils.duplicate(cachedCombatActions.combatActions ?? { groups: [] });
      combatActionLookup = foundry.utils.duplicate(cachedCombatActions.combatActionLookup ?? {});
    } else try {
      const combatTimer = SWSEPerf.start('CharacterSheet.combatActionsContext', {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        surface: this._shellSurface,
        activeTab: this.visibilityManager?.currentTab ?? null
      });
      const grouped = {};
      let loadedAny = false;

      try {
        await CombatActionsMapper.init?.();
        const mappedActions = CombatActionsMapper.getAllCombatActions?.() || [];
        mappedActions.forEach((action, index) => {
          registerAction(grouped, {
            ...action,
            key: action.key || `combat:${index}`,
            sourceName: 'Combat Actions Compendium',
            executable: action.executable !== false,
            useLabel: action.executable === false ? 'Review' : (action.relatedSkills?.length ? 'Roll / Use' : 'Use')
          });
        });
        loadedAny = mappedActions.length > 0;
      } catch (mapperErr) {
        console.warn('[SWSE] CombatActionsMapper unavailable, using JSON fallback:', mapperErr);
      }

      if (!loadedAny) {
        const response = await fetch('/systems/foundryvtt-swse/data/combat-actions.json');
        if (response.ok) {
          const actionsData = await response.json();
          actionsData.forEach((action, index) => registerAction(grouped, {
            ...action,
            key: action.key || action.id || `combat:${index}`,
            name: action.name,
            actionType: action.action?.type ?? action.actionType ?? action.type,
            cost: action.action?.cost ?? action.cost,
            notes: action.notes,
            description: action.description ?? action.notes,
            relatedSkills: action.relatedSkills || [],
            sourceName: 'Core Combat Action',
            executable: action.executable !== false,
            useLabel: action.executable === false ? 'Review' : (action.relatedSkills?.length ? 'Roll / Use' : 'Use')
          }));
        }
      }

      // Include actor-owned executable combat-action items, such as species abilities.
      for (const item of this.actor?.items || []) {
        if (item?.type !== 'combat-action') continue;
        const isActorAbility = item.flags?.swse?.isSpeciesAbility === true
          || item.flags?.swse?.isActorAbility === true
          || item.system?.executionModel === 'actor-special-ability'
          || item.system?.executionModel === 'species-activated-ability';
        if (!isActorAbility) continue;
        registerAction(grouped, {
          key: `item:${item.id}:use`,
          itemId: item.id,
          name: item.name,
          actionType: item.system?.actionType ?? item.system?.speciesAbility?.actionType ?? 'standard',
          cost: 1,
          notes: item.system?.description ?? item.system?.speciesAbility?.description ?? '',
          description: item.system?.description ?? item.system?.speciesAbility?.description ?? '',
          relatedSkills: item.system?.relatedSkills ?? [],
          sourceName: item.flags?.swse?.sourceSpecies ?? item.flags?.swse?.sourceName ?? item.system?.specialAbility?.sourceName ?? 'Special Ability',
          executable: true,
          useLabel: 'Use'
        });
      }

      // Include action cards exposed by owned feats and talents. These are
      // source-item-owned action cards, not bespoke tree-specific code.
      for (const action of AbilityCombatActionResolver.getActions(this.actor)) {
        registerAction(grouped, action);
      }
      // Combined-feat synthetic action cards (cross-feat interactions).
      for (const action of CombinedFeatActionResolver.getActions(this.actor)) {
        registerAction(grouped, action);
      }


      for (const eco of economyOrder) {
        const items = grouped[eco] || [];
        if (!items.length) continue;
        items.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        const availableCount = items.filter(item => item.economyAvailable !== false && item.disabled !== true).length;
        combatActions.groups.push({
          key: eco,
          id: eco,
          economy: eco,
          label: economyLabel(eco),
          count: items.length,
          availableCount,
          availabilityLabel: actionEconomy ? `${availableCount}/${items.length} available` : 'Not tracking',
          actions: items,
          items,
          subgroups: [{
            label: economyLabel(eco),
            count: items.length,
            items
          }]
        });
      }
      this._setCachedCombatActionContext(combatActionCacheKey, { combatActions, combatActionLookup });
      combatTimer.end({ groups: combatActions.groups.length, actions: Object.keys(combatActionLookup).length });
    } catch (err) {
      console.warn('[SWSE] Failed to load combat actions:', err);
      // Gracefully degrade - will show empty state
    }
    this._combatActionLookup = combatActionLookup;
    /* ============================================================
       MISSING CONTEXT KEYS (REMEDIATION)
    ============================================================ */

    // XP System Configuration and Progress
    const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
    const xpEnabled = xpSystem !== 'disabled' && HouseRuleService.get('enableExperienceSystem') !== false;
    const xpDerived = derived.xp ?? { total: 0, progressPercent: 0, xpToNext: 0, level: actor.system.level ?? 1 };
    const xpDisplayLevel = Math.max(1, Number(actor.system.level ?? xpDerived.level ?? 1));
    const xpTotal = Number(xpDerived.total ?? actor.system?.xp?.total ?? 0) || 0;
    const xpPercent = Math.max(0, Math.min(100, Math.round(Number(xpDerived.progressPercent ?? 0) || 0)));
    const nextLevelAtDisplay = XP_LEVEL_THRESHOLDS[Math.min(20, xpDisplayLevel + 1)] ?? null;
    const xpLevelReady = !xpEnabled || xpPercent >= 100;
    const xpSegments = Array.from({ length: 20 }, (_, index) => ({
      index,
      filled: ((index + 1) / 20) * 100 <= xpPercent + 0.0001
    }));

    const xpData = {
      level: xpDisplayLevel,
      total: xpTotal,
      nextLevelAt: nextLevelAtDisplay,
      xpToNext: nextLevelAtDisplay !== null ? Math.max(0, nextLevelAtDisplay - xpTotal) : 0,
      percentRounded: xpPercent,
      segments: xpSegments,
      stateClass: xpLevelReady ? 'state--ready-levelup' : xpPercent >= 75 ? 'state--nearly-ready' : 'state--in-progress',
      advisoryOnly: !xpEnabled
    };

    // PHASE 7.5: HEADER SEGMENTS: Consume canonical HP view-model
    // buildHeaderHpSegments() uses the same HP data as all other HP displays
    const headerHpSegments = buildHeaderHpSegments(actor);

    // panelContexts is declared at the top of _prepareContext so early references
    // (e.g. equipped-weapon checks) don't throw "cannot access before initialization".
    panelContexts = {};

    // ═════════════════════════════════════════════════════════════════
    // PHASE 8: CONTRACT OBSERVABILITY — CRITICAL LITMUS TESTS
    // These four checks verify that Phase 7-7.5 unification actually landed
    // ═════════════════════════════════════════════════════════════════

    // PHASE 8.1: HP Bundle Divergence Check
    // Verify that HP bar and HP numeric display use same source
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const healthPanelHp = panelContexts.healthPanel?.hp;
      if (healthPanelHp && (healthPanelHp.value !== headerHpSegments[0]?.hpValue)) {
        // Note: This is a basic check — more sophisticated checks would verify they both came from buildHpViewModel
        // Currently both use buildHpViewModel so this check passes
      }
    }

    // PHASE 8.2: Defense Source Unification Check
    // Verify header defenses and defense panel use same source (both should use buildDefensesViewModel)
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const defensePanel = panelContexts.defensePanel;
      if (!defensePanel || !defensePanel.defenses) {
        warnMissingDerivedOutput('Defenses', 'defensePanel.defenses', actor.name);
      }
    }

    // PHASE 8.3: Missing Derived Outputs Check
    // Verify all expected derived bundles are present
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const missingBundles = [];
      if (!derived.defenses) missingBundles.push('system.derived.defenses');
      if (!derived.skills || Object.keys(derived.skills).length === 0) missingBundles.push('system.derived.skills');
      if (!derived.attacks || !derived.attacks.list) missingBundles.push('system.derived.attacks.list');
      if (!derived.identity || !derived.identity.classDisplay) missingBundles.push('system.derived.identity.classDisplay');

      if (missingBundles.length > 0) {
        missingBundles.forEach(path => {
          warnMissingDerivedOutput('Sheet', path, actor.name);
        });
      }
    }

    const xpFilledSegments = Math.round((xpPercent / 100) * 20);
    const headerXpSegments = Array.from({ length: 20 }, (_, index) => ({
      filled: index < xpFilledSegments
    }));

    // Character Level Checks
    const level = actor.system.level ?? 1;
    const isLevel0 = level === 0;
    const chargenCompleted = actor.getFlag?.('foundryvtt-swse', 'chargen.completed') === true
      || system?.progression?.chargenComplete === true
      || system?.swse?.chargenComplete === true
      || Number(level) > 0;

    // DIAGNOSTIC: Log level info (disabled to reduce console spam)
    // swseLogger.debug('[CHARGEN DEBUG] Character level info:', {
    //   'actor.system.level': actor.system.level,
    //   'level (after default)': level,
    //   'isLevel0': isLevel0,
    //   'actor name': actor.name
    // });

    // User Permission (GM status)
    const isGM = game.user.isGM;

    // Force Points Availability (fpMax and fpValue already computed above)
    const fpAvailable = fpValue < fpMax;

    // Encumbrance Display Data
    const encumbranceState = derived.encumbrance?.state ?? 'normal';
    const encumbranceLabel = derived.encumbrance?.label ?? 'Unencumbered';
    const encumbranceStateCss = encumbranceState === 'heavy'
      ? 'color: #ff6b35;'
      : encumbranceState === 'overloaded'
      ? 'color: #cc0000;'
      : '';

    // Inventory Weight Calculation
    let totalWeight = 0;
    for (const item of actor.items) {
      if (['equipment', 'armor', 'weapon'].includes(item.type)) {
        const weight = item.system?.weight ?? 0;
        const qty = item.system?.quantity ?? 1;
        totalWeight += weight * qty;
      }
    }

    // Inventory Search Filter (initially empty, populated by user input)
    const inventorySearch = '';

    // Follower Context (from flags and system)
    const followerSlots = actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
    const linkedFollowers = actor.getFlag('foundryvtt-swse', 'followers') || [];
    const linkedMinions = actor.getFlag('foundryvtt-swse', 'minions') || [];
    const ownedActorMap = {};
    for (const entry of [...(actor.system.ownedActors || []), ...linkedFollowers, ...linkedMinions]) {
      if (!entry?.id) continue;
      const liveActor = game.actors?.get?.(entry.id);
      ownedActorMap[entry.id] = {
        id: entry.id,
        name: liveActor?.name || entry.name,
        type: liveActor?.type || entry.type,
        img: liveActor?.img || entry.img,
        system: liveActor?.system || entry.system || entry
      };
    }

    // Aggregate follower talent badges
    const followerTalentBadges = [];
    const seenTalents = new Set();
    try {
      const { FOLLOWER_TALENT_CONFIG } = await import(
        '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js'
      ).catch(() => ({ FOLLOWER_TALENT_CONFIG: {} }));

      for (const slot of followerSlots) {
        if (!seenTalents.has(slot.talentName)) {
          seenTalents.add(slot.talentName);
          const cfg = FOLLOWER_TALENT_CONFIG[slot.talentName];
          const filled = followerSlots
            .filter(s => s.talentName === slot.talentName)
            .filter(isFollowerSlotOccupied).length;

          followerTalentBadges.push({
            talentName: slot.talentName,
            current: filled,
            max: cfg?.maxCount ?? 0
          });
        }
      }
    } catch (err) {
      // Silently fail follower aggregation if import fails
    }

    // Enrich follower slots with actor data
    const enrichedFollowerSlots = followerSlots.map(slot => {
      const slotActorId = resolveFollowerSlotActorId(slot);
      const actorData = slotActorId ? ownedActorMap[slotActorId] : null;
      return {
        ...slot,
        actor: actorData ? { id: actorData.id, name: actorData.name, type: actorData.type } : null,
        tokenImg: actorData?.img || '',
        roleLabel: slot.templateChoices?.[0] || 'Standard',
        level: actorData?.system.level || 1,
        hp: { value: actorData?.system.hp?.value || 0, max: actorData?.system.hp?.max || 1 },
        tags: slot.templateChoices || [],
        isLocked: false
      };
    });

    // Phase 3.5: Check if owner has available (unfilled) follower slots for UI visibility
    const hasAvailableFollowerSlots = followerSlots.some(slot => !isFollowerSlotOccupied(slot) && (!slot.dependentKind || slot.dependentKind === 'follower'));
    const hasAvailableMinionSlots = followerSlots.some(slot => !isFollowerSlotOccupied(slot) && ['minion', 'privateer'].includes(slot.dependentKind));
    const hasAvailableDependentSlots = hasAvailableFollowerSlots || hasAvailableMinionSlots;

    // Calculate total talent count for ledger display
    const totalTalentCount = derived.talents?.groups?.reduce((sum, group) => sum + (group.items?.length || 0), 0) || 0;

    // ═════════════════════════════════════════════════════════════════
    // PANEL CONTEXT HYDRATION (Unified panel view models)
    // ═════════════════════════════════════════════════════════════════
    //
    // Phase 6 Optimization: Selective/lazy panel building
    // - Only visible panels are built on every render
    // - Hidden panels are built on demand when user navigates to them
    // - This reduces render overhead from ~5-15ms to ~2-5ms in typical use
    //
    this.panelDiagnostics.startSession(`render-${this._renderCount}`);

    const panelBuilder = new PanelContextBuilder(this.document, this);
    const panelsToBuild = this.visibilityManager.getPanelsToBuild(this.document);
    const panelsToSkip = this.visibilityManager.getPanelsSkipped(this.document);

    // CRITICAL: The sheet surface keeps tab DOM alive while switching tabs
    // client-side, so it still needs full panel hydration. Shell-hosted apps
    // (home/progression/customization/store/etc.) do not expose those hidden
    // sheet tabs and should not pay the cost of rebuilding every ledger panel.
    const shouldHydrateFullSheetPanels = this._shellSurface === 'sheet';
    const alwaysHydratedPanels = shouldHydrateFullSheetPanels ? [
      'portraitPanel',
      'biographyPanel',
      'healthPanel',
      'defensePanel',
      'secondWindPanel',
      'talentPanel',
      'featPanel',
      'racialAbilitiesPanel',
      'inventoryPanel',
      'armorSummaryPanel',
      'equipmentLedgerPanel',
      'forcePowersPanel',
      'starshipManeuversPanel',
      'languagesPanel',
      'darkSidePanel',
      'resourcesPanel'
    ] : [
      'portraitPanel',
      'healthPanel',
      'defensePanel',
      'resourcesPanel'
    ];
    for (const requiredPanel of alwaysHydratedPanels) {
      if (!panelsToBuild.includes(requiredPanel)) panelsToBuild.push(requiredPanel);
    }

    installItemEditorTrace();
    addItemEditorTrace('sheet-panel-build-plan', {
      actor: summarizeActorItems(actor),
      activeTab: this.visibilityManager?.currentTab ?? null,
      panelsToBuild: [...panelsToBuild],
      panelsToSkip: [...panelsToSkip],
      shellSurface: this._shellSurface
    });

    // Build visible panels + cached hidden panels.  Panel contexts are display
    // view-models and can be reused across rerenders when the actor/item
    // revision signature is unchanged.
    const panelCacheSignature = this._buildPanelViewModelCacheSignature(actor);
    panelContexts = {};
    for (const panelName of panelsToBuild) {
      const startTime = performance.now();
      const builderMethod = `build${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`;
      const panelCacheKey = panelCacheSignature ? `${panelName}::${panelCacheSignature}` : null;

      if (typeof panelBuilder[builderMethod] === 'function') {
        const cachedPanel = this._getCachedPanelViewModel(panelName, panelCacheKey);
        if (cachedPanel) {
          panelContexts[panelName] = cachedPanel;
          this.panelDiagnostics.recordPanelBuild(panelName, 0);
          this.visibilityManager.markPanelBuilt(panelName);
          continue;
        }

        try {
          panelContexts[panelName] = panelBuilder[builderMethod]();
          this._setCachedPanelViewModel(panelName, panelCacheKey, panelContexts[panelName]);
          const duration = performance.now() - startTime;
          this.panelDiagnostics.recordPanelBuild(panelName, duration);
          this.visibilityManager.markPanelBuilt(panelName);
        } catch (err) {
          // console.error(`[PANEL BUILD ERROR] ${panelName}:`, err);
          this.panelDiagnostics.recordError(panelName, err.message);
          emitHydrationError('PANEL_BUILD_FAILED', {
            actorId: this.actor?.id,
            actorName: this.actor?.name,
            panelName,
            builderMethod,
            error: err?.message,
            stack: err?.stack,
            mutation: getRecentHydrationMutation(this),
            snapshot: captureHydrationSnapshot(this.actor)
          });
          // Provide empty fallback to prevent template errors
          panelContexts[panelName] = {};
        }
      } else {
        console.warn(`[PANEL BUILD] No builder found for ${panelName}`);
      }
    }

    // Header fallback safety: never let the chrome render an unbound/broken
    // portrait if a lazy panel selection missed the portrait builder.
    panelContexts.portraitPanel ??= {
      img: actor?.img || 'icons/svg/mystery-man.svg',
      name: actor?.name || 'Unnamed',
      canEdit: this.isEditable
    };
    panelContexts.biographyPanel ??= {
      identity: {
        name: actor?.name || 'Unnamed',
        player: actor?.system?.details?.player || '',
        canEdit: this.isEditable
      }
    };

    // Log skipped panels for diagnostics
    if (panelsToSkip.length > 0) {
      for (const panelName of panelsToSkip) {
        this.panelDiagnostics.recordPanelSkipped(panelName, 'not visible');
      }
    }

    this.panelDiagnostics.endSession();

    registerCustomSkillsHelpers();

    const _safeCloneVm = (vm) => {
      if (!vm) return null;

      const seen = new WeakSet();
      const sanitize = (value, key = '') => {
        if (value == null) return value;

        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') return value;
        if (type === 'bigint') return String(value);
        if (type === 'function' || type === 'symbol') return undefined;

        // Shell/progression VMs are template payloads. They must never carry
        // live Foundry Documents, Application instances, DOM nodes, AbortSignals,
        // or callback objects into the character sheet render context. Those
        // objects are useful to the adapter internally, but they are not needed by
        // the inline surface partials and they fail structuredClone().
        if (value instanceof Date) return value.toISOString();
        if (typeof window !== 'undefined' && value === window) return undefined;
        if (typeof globalThis !== 'undefined' && value === globalThis) return undefined;
        if (typeof Window !== 'undefined' && value instanceof Window) return undefined;
        if (typeof Document !== 'undefined' && value instanceof Document) return undefined;
        if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return undefined;
        if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
        if (typeof AbortController !== 'undefined' && value instanceof AbortController) return undefined;
        if (typeof AbortSignal !== 'undefined' && value instanceof AbortSignal) return undefined;
        if (value?.documentName || value?.constructor?.documentName) {
          return {
            id: value.id ?? value._id ?? null,
            uuid: value.uuid ?? null,
            name: value.name ?? '',
            type: value.type ?? value.documentName ?? value.constructor?.documentName ?? key
          };
        }

        if (seen.has(value)) return undefined;
        seen.add(value);

        if (Array.isArray(value)) {
          return value.map((entry) => sanitize(entry)).filter((entry) => entry !== undefined);
        }

        if (value instanceof Map) {
          return Object.fromEntries(
            Array.from(value.entries())
              .map(([mapKey, mapValue]) => [String(mapKey), sanitize(mapValue, String(mapKey))])
              .filter(([, mapValue]) => mapValue !== undefined)
          );
        }

        if (value instanceof Set) {
          return Array.from(value.values()).map((entry) => sanitize(entry)).filter((entry) => entry !== undefined);
        }

        const out = {};
        for (const [entryKey, entryValue] of Object.entries(value)) {
          if (entryKey === 'app' || entryKey === 'actor' || entryKey === 'document' || entryKey === 'shellHost') continue;
          if (entryKey === 'window' || entryKey === 'ownerDocument' || entryKey === 'defaultView' || entryKey === 'view') continue;
          if (entryKey === 'element' || entryKey === 'html' || entryKey === 'form' || entryKey === 'listeners') continue;
          if (entryKey.startsWith('_') && entryKey !== '_id') continue;
          const clean = sanitize(entryValue, entryKey);
          if (clean !== undefined) out[entryKey] = clean;
        }
        return out;
      };

      const sanitized = sanitize(vm);
      try {
        structuredClone(sanitized);
        return sanitized;
      } catch (err) {
        swseLogger.warn('[SWSEV2CharacterSheet] Shell surface VM sanitizer dropped non-serializable payload', {
          error: err?.message,
          surface: vm?.id,
          mode: vm?.mode
        });
        return {
          id: vm?.id ?? 'unknown',
          title: vm?.title ?? 'Holopad Surface',
          mode: vm?.mode ?? null,
          error: 'Surface data could not be prepared for inline rendering.'
        };
      }
    };

    let shellSurfaceVm = null;
    let shellOverlayVm = null;
    let shellDrawerVm = null;

    if (this._shellSurface !== 'sheet') {
      try {
        const raw = await ShellSurfaceRegistry.buildSurfaceVm({
          actor,
          surfaceId: this._shellSurface,
          surfaceOptions: this._shellSurfaceOptions,
          shellHost: this
        });
        shellSurfaceVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Surface VM build failed:', err);
        shellSurfaceVm = { error: err.message, surfaceId: this._shellSurface };
      }
    }

    if (this._shellOverlay) {
      try {
        const raw = await ShellSurfaceRegistry.buildOverlayVm({
          actor,
          overlayId: this._shellOverlay.overlayId,
          overlayOptions: this._shellOverlay.options,
          shellHost: this
        });
        shellOverlayVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Overlay VM build failed:', err);
        shellOverlayVm = { error: err.message };
      }
    }

    if (this._shellDrawer) {
      try {
        const raw = await ShellSurfaceRegistry.buildDrawerVm({
          actor,
          drawerId: this._shellDrawer.drawerId,
          drawerOptions: this._shellDrawer.options,
          shellHost: this
        });
        shellDrawerVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Drawer VM build failed:', err);
        shellDrawerVm = { error: err.message };
      }
    }

    const safeShellSurfaceOptions = sanitizeSheetRenderContext(this._shellSurfaceOptions, { rootKey: 'shellSurfaceOptions' }) || {};
    const safeShellOverlay = sanitizeSheetRenderContext(this._shellOverlay, { rootKey: 'shellOverlay' }) || null;
    const safeShellDrawer = sanitizeSheetRenderContext(this._shellDrawer, { rootKey: 'shellDrawer' }) || null;

    // Log panel contract version for debugging
    const _sheetContractVersion = 1;

    let droidSheetContext = null;
    if (isDroidActor) {
      try {
        droidSheetContext = ActorPerfDiagnostics.time(
          // Distinct label from the buildConceptSheetViewModel() droid entry below
          // (Phase 3 live-benchmark seam) so the two builders' costs, previously
          // both aggregated under 'droid', can be read separately from
          // SWSE.debug.performance.summary().sheetContext.
          ms => ActorPerfDiagnostics.recordSheetContext('droid-panel-builder', ms),
          () => new DroidSheetContextBuilder(actor).build()
        );
      } catch (err) {
        swseLogger.warn('[SWSEV2CharacterSheet] Failed to build droid systems tab context', {
          actorId: actor?.id,
          actorName: actor?.name,
          error: err?.message
        });
        droidSheetContext = {
          droid: {
            degree: { label: '', category: '', isConfigured: false },
            garage: { canOpenGarage: actor?.isOwner === true, systemsLocked: false },
            resolvedSystems: null,
            sourceStatus: { sourceLabel: 'Unavailable', validationMessages: [], hasValidationMessages: false }
          },
          droidPanels: {},
          combatWeapons: { hasIntegrated: false, hasHandheld: false, integrated: [], handheld: [] }
        };
      }
    }

    const combatStatus = buildCombatStatusViewModel(actor, { canEdit: this.isEditable });
    const effectiveDefenses = buildEffectiveDefensesViewModel(actor, panelContexts.defensePanel);

    // Phase 3B: buildConceptSheetViewModel() is statically proven unused for
    // useNpcConceptSheet actors — character-sheet.hbs's root
    // {{#if useVehicleSheet}}...{{else if useNpcConceptSheet}}...{{else}}
    // chain renders npc-concept-content.hbs for these actors instead, and
    // that branch (and every partial it includes) never references
    // `conceptLayout`. buildNpcConceptSheetContext() below also receives
    // `conceptLayout` as an input but never reads it (verified: zero
    // references to `conceptLayout` anywhere in npc-sheet-helpers.js).
    // Skipping the ~1,971-line builder for these actors is therefore a
    // provably-unused-output elimination, not a behavior change. See
    // docs/audits/v2-phase-3-derived-performance.md, "Static Closure Review".
    const conceptLayout = useNpcConceptSheet ? null : ActorPerfDiagnostics.time(
      // Phase 3 live-benchmark seam: '-concept-layout' suffix keeps this
      // distinct from the 'droid-panel-builder'/'npc-context-builder' entries
      // above/below, so buildConceptSheetViewModel()'s own cost per actor
      // type is separately readable from SWSE.debug.performance.summary().
      ms => ActorPerfDiagnostics.recordSheetContext(`${actor?.type ?? 'character'}-concept-layout`, ms),
      () => buildConceptSheetViewModel({
      ...context,
      ...panelContexts,
      isGM,
      isLevel0,
      chargenCompleted,
      buildMode,
      actionEconomy,
      combatStatus,
      effectiveDefenses,
      xpLevelReady,
      combat,
      combatActions,
      derived,
      abilities,
      xpData,
      headerHpSegments,
      headerXpSegments,
      speed,
      initiativeTotal,
      perceptionTotal,
      bab,
      grappleBonus,
      forcePointsValue: fpValue,
      forcePointsMax: fpMax,
      destinyPointsValue,
      destinyPointsMax,
      classDisplay,
      forceSensitive,
      actor,
      ...(droidSheetContext ? {
        droid: droidSheetContext.droid,
        droidPanels: droidSheetContext.droidPanels,
        combatWeapons: droidSheetContext.combatWeapons
      } : {}),
      isDroidActor,
      isNpcActor,
      isNpcActorDocument,
      isPromotedHeroicNpcActor,
      useNpcConceptSheet
    }));

    if (useNpcConceptSheet) {
      try {
        context.npcConcept = ActorPerfDiagnostics.time(
          // Distinct label from the buildConceptSheetViewModel() 'npc-concept-layout'
          // entry above (Phase 3 live-benchmark seam) — see that call site's comment.
          ms => ActorPerfDiagnostics.recordSheetContext('npc-context-builder', ms),
          () => buildNpcConceptSheetContext(actor, {
            ...context,
            derived,
            conceptLayout,
            actionEconomy
          })
        );
      } catch (err) {
        swseLogger.warn('[SWSEV2CharacterSheet] NPC concept sheet context failed', {
          actorId: actor?.id,
          actorName: actor?.name,
          error: err?.message
        });
        context.npcConcept = {
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

    const sheetThemeContext = ThemeResolutionService.buildSurfaceContext({ actor });

    const finalContext = {
      ...context,
      _sheetContractVersion,
      _panels: {
        health: true,
        defense: true,
        biography: true,
        inventory: true,
        talent: true,
        feat: true,
        maneuver: true
      },
      // ═════════════════════════════════════════════════════════════════
      // PHASE 5: Removed legacy flat context
      // All data is now provided through panelized contexts above.
      // The following are essential state/permission flags with no panel equivalent:
      // ═════════════════════════════════════════════════════════════════
      isGM,
      isLevel0,
      chargenCompleted,
      buildMode,
      actionEconomy,
      combatStatus,
      effectiveDefenses,
      xpLevelReady,
      derived,  // Complex computed stats (defenses, damage, etc.)
      // Phase 9: Tier-aware help system context
      helpLevel: this._helpLevel,
      helpLevelLabel: HelpModeManager.getHelpLevelLabel(this._helpLevel),
      helpLevelDescription: HelpModeManager.getHelpLevelDescription(this._helpLevel),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 11: THEME & MOTION CONTROL CONTEXT
      // ═════════════════════════════════════════════════════════════════
      sheetTheme: sheetThemeContext.themeKey,
      sheetThemeGroups: getActorSheetThemeGroups(sheetThemeContext.themeKey),
      sheetMotionStyle: sheetThemeContext.motionStyle,
      sheetMotionOptions: ThemeResolutionService.getMotionOptions(),
      sheetThemeStyleInline: sheetThemeContext.themeStyleInline,
      sheetMotionStyleInline: sheetThemeContext.motionStyleInline,
      sheetSurfaceStyleInline: sheetThemeContext.surfaceStyleInline,
      editable: sheetEditable,
      system: foundry.utils.duplicate(system ?? {}),
      ...actorModeContext,
      isDroidActor,
      isNpcActor,
      isNpcActorDocument,
      isPromotedHeroicNpcActor,
      useNpcConceptSheet,
      useVehicleSheet,
      isVehicleActor,
      actorSheetModeLabel: actorModeContext.actorSheetMode?.label ?? (isDroidActor ? 'Droid Actor' : (isNpcActor ? 'NPC Actor' : 'Character Actor')),
      ...(droidSheetContext ? {
        droid: droidSheetContext.droid,
        droidPanels: droidSheetContext.droidPanels,
        combatWeapons: droidSheetContext.combatWeapons,
        droidSystemsReadOnly: true
      } : {}),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 2: MISSING CONTEXT KEYS (REMEDIATION)
      // ═════════════════════════════════════════════════════════════════
      xpEnabled,                    // XP system active/disabled flag
      xpPercent,                    // XP progress percentage for bar fill
      fpAvailable,                  // Force points available for use
      abilities,                    // Array of ability objects with modifiers
      followerSlots,                // Follower slots from actor flags
      followerTalentBadges,         // Aggregated follower talent badges
      enrichedFollowerSlots,        // Follower slots enriched with actor data
      hasAvailableFollowerSlots,    // Whether any follower slots are unfilled
      hasAvailableMinionSlots,      // Whether any minion/privateer slots are unfilled
      hasAvailableDependentSlots,   // Any dependent actor slot
      xpData,                       // XP progress data for display
      headerHpSegments,             // 20-step segmented HP bar
      headerXpSegments,             // 20-step segmented XP bar
      // Inventory categorized items (for inventory panel legacy support)
      equipment: Object.values(actor.items).filter(i => i.type === 'equipment'),
      armor: Object.values(actor.items).filter(i => i.type === 'armor'),
      weapons: Object.values(actor.items).filter(i => i.type === 'weapon'),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 6: Combat & Resources Display Data
      // ═════════════════════════════════════════════════════════════════
      speed,                        // Movement speed (ft./round)
      initiativeTotal,              // Initiative modifier
      perceptionTotal,              // Perception skill total
      bab,                          // Base attack bonus
      grappleBonus,                 // Grapple bonus (BAB + STR + size modifiers)
      forcePointsValue: fpValue,    // Current force points (from system.forcePoints.value)
      forcePointsMax: fpMax,        // Max force points (from system.forcePoints.max)
      bonusForcePoints,
      hasGuardianSpiritTalent,
      destinyPointsValue,           // Current destiny points (from system.destinyPoints.value)
      destinyPointsMax,             // Max destiny points (from system.destinyPoints.max)
      forcePoints,                  // Visual array of force point dots
      headerSecondWind,             // Header condensed Second Wind control data
      lightsaberConstructionAvailable,
      lightsaberConstructionDeferred,
      lightsaberConstructionEligibleNow: !!lightsaberConstructionEligibility?.eligible,
      lightsaberConstructionBlockedReason: lightsaberConstructionEligibility?.reason ?? null,
      // ═════════════════════════════════════════════════════════════════
      // PHASE 7.5: Identity Summary Data (multiclass format)
      // ═════════════════════════════════════════════════════════════════
      // PHASE 8: classDisplay is canonical from system.derived.identity.classDisplay
      // Built by character-actor.js buildClassDisplay() — preserves exact actor class progression order
      // No heroic-first sorting. All displays read this single source.
      classDisplay,                 // Multiclass display format (e.g. "Jedi 3 / Soldier 2")
      identityGlowColor,            // Force-sensitive glow color
      forceSensitive,               // Whether character is force-sensitive
      // ═════════════════════════════════════════════════════════════════
      // PHASE 9: Combat Actions Browser (in-tab)
      // ═════════════════════════════════════════════════════════════════
      combatActions,                // Organized combat actions by economy type
      combatActionLookup,            // Flat hydrated combat action map for click/roll handlers
      unarmedAttack,                // Always-available SWSE unarmed attack option
      // ═════════════════════════════════════════════════════════════════
      // UNIFIED PANEL CONTEXTS (Primary data source)
      // Panels now own all character data through dedicated view models
      // ═════════════════════════════════════════════════════════════════
      ...panelContexts,
      // ─── Phase 11: Shell Host Context ──────────────────────────────────
      customSkillsEditable: sheetEditable,
      shellSurface: this._shellSurface,
      shellSurfaceOptions: safeShellSurfaceOptions,
      shellOverlay: safeShellOverlay,
      shellDrawer: safeShellDrawer,
      shellIsSheet: this._shellSurface === 'sheet',
      shellSurfaceVm,
      shellOverlayVm,
      shellDrawerVm,
      conceptLayout
    };

    // Final AppV2 safety barrier. Keep live sheet/actor/application objects out
    // of the template payload; they can hold Window, DOM, and debounced callback
    // references that structuredClone cannot copy.
    const serializableContext = sanitizeSheetRenderContext(finalContext, { rootKey: 'context' });

    // Verify context is serializable (no Document refs, circular refs, etc.)
    RenderAssertions.assertContextSerializable(serializableContext, "SWSEV2CharacterSheet");

    // GUARDRAIL 1: Validate context contract to prevent silent template failures
    validateContextContract(serializableContext, "SWSEV2CharacterSheet");

    // Store context for post-render assertions
    this._currentContext = serializableContext;

    contextTimer.end({ mode: 'character', panelCount: Object.keys(panelContexts || {}).length });
    return serializableContext;
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

  /* ============================================================
     INVENTORY VIEW MODEL (READ-ONLY)
  ============================================================ */

  _buildInventoryModel(actor) {
    const items = Array.from(actor.items);

    // Map of item type -> display category
    const typeToCategory = {
      weapon: "Weapons",
      armor: "Armor",
      shield: "Armor",
      equipment: "Equipment",
      consumable: "Consumables",
      misc: "Miscellaneous",
      ammo: "Ammunition"
    };

    // Build inventory groups
    const inventory = new Map();

    // Initialize standard groups
    ["Weapons", "Armor", "Equipment", "Consumables"].forEach(group => {
      inventory.set(group, []);
    });

    // Sort items into groups with full data
    items.forEach(item => {
      const category = typeToCategory[item.type] || "Miscellaneous";

      // Ensure category exists in map
      if (!inventory.has(category)) {
        inventory.set(category, []);
      }

      const itemData = {
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.type,
        img: item.img,
        quantity: item.system?.quantity ?? 1,
        weight: item.system?.weight ?? 0,
        cost: item.system?.cost ?? 0,
        equipped: item.system?.equipped ?? false
      };

      inventory.get(category).push(itemData);
    });

    // Remove empty groups
    for (const [key, items] of inventory.entries()) {
      if (items.length === 0) {
        inventory.delete(key);
      }
    }

    // Convert to object for Handlebars iteration
    return Object.fromEntries(inventory);
  }

  /* ============================================================
     LISTENERS (UI ONLY)
  ============================================================ */

  activateListeners(html, { signal } = {}) {
    // Phase 8: Delegate listener registration to focused listeners module
    return registerListeners(this, html, { signal });
  }

  /**
   * Internal listener activation - moved from activateListeners by Phase 8 refactoring
   * Contains all inline listener registration logic for the character sheet
   * @param {HTMLElement} html - The rendered sheet element
   * @param {AbortSignal} signal - Abort signal for cleanup
   * @private
   */
  _activateListenersInternal(html, { signal } = {}) {

    // === HP INPUT HANDLING ===
    html.querySelectorAll('.hp-input').forEach(input => {
      input.addEventListener('change', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const el = event.currentTarget;
        const path = el.dataset.path;
        const value = Number(el.value);

        if (!path || Number.isNaN(value)) return;

        try {
          // Current HP: Clamp between 0 and max
          if (path === "system.hp.value") {
            const max = foundry.utils.getProperty(this.actor, "system.hp.max") ?? 0;
            const clamped = Math.clamped(value, 0, max);
            await ActorEngine.updateActor(this.actor, { [path]: clamped }, {
              source: 'character-sheet-hp-input',
              render: false,
              suppressAppRefresh: true
            });
            return;
          }

          // Temp HP: Clamp ≥ 0 only
          if (path === "system.hp.temp") {
            await ActorEngine.updateActor(this.actor, { [path]: Math.max(0, value) }, {
              source: 'character-sheet-hp-input',
              render: false,
              suppressAppRefresh: true
            });
            return;
          }

          // Max HP: Use ActorEngine.recomputeHP (governance constraint)
          // This recalculates from class + level + CON + bonuses
          if (path === "system.hp.max") {
            // Clamp current HP if it exceeds new max
            const current = foundry.utils.getProperty(this.actor, "system.hp.value") ?? 0;
            const newMax = Math.max(1, value);
            if (current > newMax) {
              await ActorEngine.updateActor(this.actor, { "system.hp.value": newMax }, {
                source: 'character-sheet-hp-input',
                render: false,
                suppressAppRefresh: true
              });
            }
            // Trigger recomputation (will be overridden by actual class-based calc)
            await ActorEngine.recomputeHP(this.actor, {
              source: 'character-sheet-hp-input',
              render: false,
              suppressAppRefresh: true
            });
            return;
          }
        } catch (err) {
          // console.error('[HP-INPUT] Error updating HP:', err);
          ui.notifications.error(`Failed to update HP: ${err.message}`);
        }
      }, { signal });
    });

    // swseLogger.debug('[LIFECYCLE] activateListeners called with html element:', {
    //   htmlTag: html?.tagName,
    //   htmlClasses: html?.className,
    //   signalExists: !!signal
    // });

    // CRITICAL: Attach form submit listener directly to the form element
    // Template guarantees a stable form selector: .swse-character-sheet-form
    // This single resolution approach prevents ambiguity and silent failures
    // swseLogger.debug('[LIFECYCLE] Resolving form: looking for .swse-character-sheet-form');

    let form = null;
    // If html IS the form, use it directly
    if (html.tagName === 'FORM' && html.classList.contains('swse-character-sheet-form')) {
      form = html;
      // swseLogger.debug('[LIFECYCLE] ✓ html IS the form (by tag + class)');
    } else {
      // Otherwise find it via stable selector (now a div, not a form)
      form = html.querySelector('.swse-character-sheet-form');
      if (!form) {
        // swseLogger.debug('[LIFECYCLE] Form not found in html, trying appRoot');
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector('.swse-character-sheet-form') ?? null;
      }
    }

    // swseLogger.debug('[LIFECYCLE] Form resolution result:', {
    //   found: !!form,
    //   formTag: form?.tagName,
    //   formClasses: form?.className,
    //   isConnected: form?.isConnected
    // });

    if (form) {
      // swseLogger.debug('[LIFECYCLE] Form found, attaching submit listener');
      // swseLogger.debug('[LIFECYCLE] Form element details:', {
      //   tag: form.tagName,
      //   classes: form.className,
      //   childCount: form.children.length,
      //   isConnected: form.isConnected  // Critical: is it in the DOM?
      // });

      const submitHandler = async (ev) => {
        // swseLogger.debug('[PERSISTENCE] ─── SUBMIT EVENT FIRED ───');
        // swseLogger.debug('[PERSISTENCE] Event target:', ev.target.tagName, ev.target.className);
        // swseLogger.debug('[PERSISTENCE] defaultPrevented BEFORE:', ev.defaultPrevented);

        ev.preventDefault();
        ev.stopPropagation();

        // swseLogger.debug('[PERSISTENCE] defaultPrevented AFTER:', ev.defaultPrevented);
        // swseLogger.debug('[PERSISTENCE] Calling _onSubmitForm now');

        // Route to our update handler
        try {
          await this._onSubmitForm({ target: form, preventDefault: () => {} });
          // swseLogger.debug('[PERSISTENCE] _onSubmitForm completed successfully');
        } catch (err) {
          // console.error('[PERSISTENCE] _onSubmitForm threw error:', err);
        }
      };

      form.addEventListener("submit", submitHandler, { signal, capture: false });

      // swseLogger.debug('[LIFECYCLE] Submit listener attached successfully');
      swseLogger.debug('[LIFECYCLE] Will listener survive? Checking signal status:', {
        signalAborted: signal?.aborted ?? 'N/A'
      });
    } else {
      // console.error('[LIFECYCLE] ❌ CRITICAL: Could not find form element to attach submit listener');
      // console.error('[LIFECYCLE] This means NO submit interception will happen');
    }

    // DELEGATED: Help Mode Cycling (OFF → CORE → STANDARD → ADVANCED → OFF)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='toggle-help-mode']");
      if (!button) return;

      ev.preventDefault();

      // Cycle to next help level
      this._helpLevel = HelpModeManager.getNextLevel(this._helpLevel);

      // Persist to actor flags
      await HelpModeManager.setHelpLevel(this.document, this._helpLevel);

      // Update button text with current help level label
      button.textContent = HelpModeManager.getHelpLevelLabel(this._helpLevel);
      button.setAttribute("title", HelpModeManager.getHelpLevelDescription(this._helpLevel));

      // Update sheet root class for CSS styling
      // Remove all help-level classes first
      HelpModeManager.getLevels().forEach(level => {
        html.classList.remove(`help-level--${level.toLowerCase()}`);
      });
      // Add current help level class
      html.classList.add(`help-level--${this._helpLevel.toLowerCase()}`);

      // Update the TooltipRegistry help mode state (for tier-aware tooltip visibility)
      const { TooltipRegistry } = await import("/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js");
      TooltipRegistry.setHelpMode(HelpModeManager.isActive(this._helpLevel));

      // swseLogger.debug(`[HELP-MODE] Cycled to: ${this._helpLevel}`);
    }, { signal });

    // DELEGATED: Theme Dropdown - Update actor flag and apply theme
    html.addEventListener("change", async ev => {
      const select = ev.target.closest("select[data-control='theme']");
      if (!select) return;
      ev.preventDefault();
      const themeKey = select.value;
      if (!themeKey) return;
      try {
        await mutateShellOnly(this, () => this.document.setFlag('foundryvtt-swse', 'sheetTheme', themeKey), { reason: 'sheet-theme-change', surfaceId: this._shellSurface });
        const sheetShell = html.querySelector('.sheet-shell');
        if (sheetShell) {
          ThemeResolutionService.applyToElement(sheetShell, { actor: this.document, themeKey });
        }
        await this.requestSurfaceRender({ reason: 'sheet-theme-change' });
      } catch (err) {
        swseLogger.error('[THEME] Error setting sheet theme:', err);
        ui.notifications?.error?.(`Failed to set theme: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Motion Style Dropdown - Update actor flag and apply motion
    html.addEventListener("change", async ev => {
      const select = ev.target.closest("select[data-control='motion']");
      if (!select) return;
      ev.preventDefault();
      const motionStyle = select.value;
      if (!motionStyle) return;
      try {
        await mutateShellOnly(this, () => this.document.setFlag('foundryvtt-swse', 'sheetMotionStyle', motionStyle), { reason: 'sheet-motion-change', surfaceId: this._shellSurface });
        const sheetShell = html.querySelector('.sheet-shell');
        if (sheetShell) {
          ThemeResolutionService.applyToElement(sheetShell, { actor: this.document, motionStyle });
        }
        await this.requestSurfaceRender({ reason: 'sheet-motion-change' });
      } catch (err) {
        swseLogger.error('[MOTION] Error setting motion style:', err);
        ui.notifications?.error?.(`Failed to set motion style: ${err.message}`);
      }
    }, { signal });
    // DELEGATED: Tab Switching - Route through shared UI state manager
    // This prevents "blank body" states where DOM classes and remembered state diverge.
    html.addEventListener("click", ev => {
      const tabLink = ev.target.closest("[data-action='sheet-tab'], [data-action='tab']");
      if (!tabLink) return;

      const tabName = tabLink.dataset.sheetTab || tabLink.dataset.tab;
      if (!tabName) return;

      ev.preventDefault();
      ev.stopPropagation();

      // swseLogger.debug(`[TAB SWITCH] Switching to tab: ${tabName}`);

      // PHASE 2: UIStateManager is the sole owner of tab activation.
      // Visibility manager tracks which panels should be built for this tab.
      this.visibilityManager?.setActiveTab?.(tabName);
      addItemEditorTrace('sheet-tab-switch', {
        actor: summarizeActorItems(this.actor),
        tabName,
        panelState: this.visibilityManager?.getState?.() ?? null
      });
      // UIStateManager manages all DOM updates (active classes, panel visibility).
      this.uiStateManager?._activateTab?.(tabLink);
      // Removed hard DOM toggle: UIStateManager._activateTab already handles all necessary DOM changes.
    }, { signal });


    // DELEGATED: Play/Edit Mode - keep the pretty play surface default while exposing maintenance controls on demand.
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-sheet-mode']");
      if (!button) return;

      ev.preventDefault();
      if (html.dataset.actorSheetMode === 'npc' || html.classList.contains('swse-sheet-actor-mode--npc')) {
        applySheetInteractionMode(html, 'edit');
        return;
      }
      const currentMode = button.dataset.mode === 'edit' ? 'edit' : 'play';
      const nextMode = currentMode === 'edit' ? 'play' : 'edit';
      setStoredSheetMode(this.document, nextMode);
      applySheetInteractionMode(html, nextMode);
    }, { signal });


    // DELEGATED: Droid Systems tab → Garage/customization surface handoff.
    // The sheet tab remains read-only/operational; Garage owns paid modifications.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".edit-droid-systems, [data-action='customize-droid']");
      if (!button || this.actor?.type !== 'droid') return;

      ev.preventDefault();
      ev.stopPropagation();

      if (typeof this.setSurface !== 'function') {
        ui.notifications?.warn?.('Droid Garage is unavailable for this sheet.');
        return;
      }

      try {
        await this.setSurface('customization', {
          source: 'droid-systems-tab',
          bayMode: 'garage',
          mode: 'garage',
          contextMode: 'modifyExisting',
          focusCategory: button.dataset.garageRegion ?? button.dataset.region ?? null,
          focusSlot: button.dataset.garageSlot ?? button.dataset.slotId ?? null,
          focusMode: button.dataset.garageMode ?? null
        });
        await this.requestSurfaceRender?.({ reason: 'droid-systems-open-garage', surfaceId: 'customization' });
      } catch (err) {
        swseLogger.error('[Droid Systems] Failed to open Garage from actor sheet', err);
        ui.notifications?.error?.('Failed to open Droid Garage.');
      }
    }, { signal });

    // DELEGATED: Droid Systems tab operational controls.
    // Read-only/activate-only: item opening, use/describe, and rolls are allowed;
    // installs, removals, purchases, sales, and build changes remain Garage-owned.
    html.addEventListener("click", async ev => {
      if (this.actor?.type !== 'droid') return;

      const useButton = ev.target.closest("[data-action='use-droid-part']");
      if (useButton) {
        ev.preventDefault();
        ev.stopPropagation();
        await this._useDroidPartFromButton(useButton);
        return;
      }

      const rollButton = ev.target.closest("[data-action='roll-weapon'], [data-action='roll-weapon-attack']");
      if (rollButton) {
        ev.preventDefault();
        const itemId = rollButton.dataset.itemId ?? rollButton.dataset.weaponId;
        const item = itemId ? this.actor?.items?.get?.(itemId) : null;
        if (!item) {
          ui.notifications?.warn?.('That integrated weapon could not be found on this droid.');
          return;
        }
        if (typeof item.roll === 'function') {
          await item.roll();
        } else {
          await this._runCanonicalAttack(item, {
            source: 'droid-systems-tab',
            sourceElement: rollButton,
            companionSource: rollButton,
            sheet: this,
            showRollCompanion: true
          });
        }
        return;
      }

      const openChip = ev.target.closest(".swse-v2-open-item, [data-action='open-droid-system-item']");
      if (openChip) {
        ev.preventDefault();
        const itemId = openChip.dataset.itemId;
        const item = itemId ? this.actor?.items?.get?.(itemId) : null;
        if (item?.sheet) item.sheet.render(true);
      }

      // PHASE 3 — Droid Stock-Statblock Authority controls. Distinct action
      // names from the legacy "convert-to-custom-droid" CTA elsewhere on
      // this same card — see droid-build-status-card.hbs's comment.
      const inspectBtn = ev.target.closest("[data-action='inspect-droid-conversion']");
      if (inspectBtn) {
        ev.preventDefault();
        await this._inspectDroidConversion();
        return;
      }

      const convertBtn = ev.target.closest("[data-action='convert-droid-to-playable']");
      if (convertBtn) {
        ev.preventDefault();
        await this._convertDroidToPlayable();
        return;
      }

      const viewOriginalBtn = ev.target.closest("[data-action='view-original-droid-statblock']");
      if (viewOriginalBtn) {
        ev.preventDefault();
        await this._viewOriginalDroidStatblock();
        return;
      }

      const rollbackBtn = ev.target.closest("[data-action='rollback-droid-conversion']");
      if (rollbackBtn) {
        ev.preventDefault();
        await this._rollbackDroidConversion();
        return;
      }

      // PHASE 4 — Converted-System Reconciliation controls.
      const inspectReconciliationBtn = ev.target.closest("[data-action='inspect-droid-reconciliation']");
      if (inspectReconciliationBtn) {
        ev.preventDefault();
        await this._inspectDroidReconciliation();
        return;
      }

      const reconcileBtn = ev.target.closest("[data-action='reconcile-droid-systems']");
      if (reconcileBtn) {
        ev.preventDefault();
        await this._reconcileDroidSystems();
        return;
      }

      const rollbackReconciliationBtn = ev.target.closest("[data-action='rollback-droid-reconciliation']");
      if (rollbackReconciliationBtn) {
        ev.preventDefault();
        await this._rollbackDroidReconciliation();
      }
    }, { signal });

    // DELEGATED: Toggle Abilities Panel - Show/Hide Expanded Views
    // Using delegated listeners from html root for stability across rerenders
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-abilities']");
      if (!button) return;

      // swseLogger.debug("✓ [DEBUG] Abilities toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".abilities-panel");
      // swseLogger.debug("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .abilities-panel parent");
        return;
      }

      // swseLogger.debug("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("abilities-expanded");
      // swseLogger.debug("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each ability
      const rows = panel.querySelectorAll(".ability-row");
      // swseLogger.debug("[DEBUG] Found", rows.length, "ability rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".ability-collapsed");
        const expanded = row.querySelector(".ability-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          // swseLogger.debug(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          const expandedDisplay = expanded.dataset?.expandedDisplay || "flex";
          expanded.style.display = isExpanded ? expandedDisplay : "none";
          // swseLogger.debug(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button state/text
      button.setAttribute("aria-expanded", String(isExpanded));
      button.textContent = isExpanded ? "Collapse" : (button.dataset?.collapsedLabel || "Edit Stats");
      // swseLogger.debug("[DEBUG] Button text updated to:", button.textContent);
    }, { signal });

// DELEGATED: Toggle Defenses Panel - Show/Hide Expanded Views
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-defenses']");
      if (!button) return;

      // swseLogger.debug("✓ [DEBUG] Defenses toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".defenses-panel");
      // swseLogger.debug("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .defenses-panel parent");
        return;
      }

      // swseLogger.debug("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("defenses-expanded");
      // swseLogger.debug("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each defense
      const rows = panel.querySelectorAll(".defense-row");
      // swseLogger.debug("[DEBUG] Found", rows.length, "defense rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".defense-collapsed");
        const expanded = row.querySelector(".defense-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          // swseLogger.debug(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          const expandedDisplay = expanded.dataset?.expandedDisplay || "flex";
          expanded.style.display = isExpanded ? expandedDisplay : "none";
          // swseLogger.debug(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button state/text
      button.setAttribute("aria-expanded", String(isExpanded));
      button.textContent = isExpanded ? "Collapse" : (button.dataset?.collapsedLabel || "Edit Defenses");
      // swseLogger.debug("[DEBUG] Button text updated to:", button.textContent);
    }, { signal });

// DELEGATED: Roll Ability Check (d20 + ability modifier)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-ability']");
      if (!button) return;

      ev.preventDefault();
      const abilityKey = button.dataset.ability;
      if (!abilityKey) return;

      try {
        const result = await SWSERoll.rollAbility(this.actor, abilityKey, { sourceElement: button, companionSource: button, sheet: this, showRollCompanion: true });

      } catch (err) {
        // console.error("Ability roll failed:", err);
        ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Roll Initiative (d20 + initiative bonus) / Take 10
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-initiative'], [data-action=\"roll-initiative-take10\"]");
      if (!button) return;

      ev.preventDefault();
      const mode = button.dataset.action === "roll-initiative-take10" ? "take10" : "roll";

      try {
        await this._runCanonicalInitiative(mode, {
          sourceElement: button,
          companionSource: button,
          sheet: this,
          showRollCompanion: true
        });
      } catch (err) {
        // console.error("Initiative roll failed:", err);
        ui?.notifications?.error?.(`Initiative roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Auto-save form inputs when they change
    // This survives rerender because listener is on stable root element (html)
    // DEBOUNCED: Prevents keystroke spam. Multiple rapid changes batch into one update.
    html.addEventListener("change", async ev => {
      const input = ev.target.closest("input[name], textarea[name], select[name]");
      if (!input) return;

      swseLogger.debug('[PERSISTENCE] ─── CHANGE EVENT FIRED (debounced 500ms) ───');
      ev.preventDefault();

      if (isDirectFieldMutationPath(input.name)) {
        swseLogger.debug('[PERSISTENCE] Direct-field mutation path detected; bypassing broad form serialization', {
          inputName: input.name,
          inputType: input.type
        });
        await this._onSubmitForm(ev);
        return;
      }

      // DIAGNOSTIC: Log the field change
      swseLogger.debug('[PERSISTENCE] Field changed:', {
        inputName: input.name,
        inputValue: input.value,
        inputType: input.type,
        eventTarget: ev.target.tagName
      });

      // Find the form via stable selector (template-guaranteed, now a div)
      // swseLogger.debug('[PERSISTENCE] Resolving form for submission');
      let form = input.closest(".swse-character-sheet-form");

      // If not found by closest, query from app root (now a div, not a form)
      if (!form && this.element) {
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector(".swse-character-sheet-form") ?? null;
      }

      // swseLogger.debug('[PERSISTENCE] Form resolution result:', { found: !!form, formTag: form?.tagName, formClass: form?.className });

      if (form) {
        // swseLogger.debug('[PERSISTENCE] Form found, queuing debounced _onSubmitForm');
        try {
          this._debouncedSubmit({ target: input, preventDefault: () => {} });
          // swseLogger.debug('[PERSISTENCE] Debounced submit queued');
        } catch (err) {
          // console.error('[PERSISTENCE] Debounced submit threw error:', err);
        }
      } else {
        // console.error("[PERSISTENCE] ❌ Could not find form element to submit");
      }
    }, { signal, capture: false });

    // DELEGATED: UI-only preview math for ability pills + auto-save on blur
    // Listen on root so rerender doesn't lose listener
    html.addEventListener("input", ev => {
      const input = ev.target.closest(".ability-expanded input");
      if (!input) return;

      const row = input.closest(".ability-row");
      if (row) {
        this._previewAbilityRow(row);
      }
    }, { signal, capture: false });

    // DELEGATED: Ensure ability input changes save immediately
    // Fire change event when blur occurs on ability inputs
    html.addEventListener("blur", ev => {
      const input = ev.target.closest(".ability-expanded input");
      if (!input) return;

      // Change events already own direct field persistence.  Submitting again on
      // blur caused duplicate ActorEngine writes and duplicate repaint requests
      // for one ability edit.
      if (isDirectFieldMutationPath(input.name)) return;

      const form = input.closest(".swse-character-sheet-form");
      if (form) {
        // swseLogger.debug('[PERSISTENCE] Ability input blur detected, submitting form');
        this._debouncedSubmit({ target: input, preventDefault: () => {} });
      }
    }, { signal, capture: true });

    // DELEGATED: Toggle Skill Favorite
    // Skills content may rerender, so use delegated listener
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='toggle-favorite']");
      if (!button) return;

      ev.preventDefault();
      const skillKey = button.dataset.skill;
      if (skillKey) {
        const currentFavorite = this.actor.system.skills?.[skillKey]?.favorite ?? false;
        const nextFavorite = !currentFavorite;
        button.classList.toggle('favorited', nextFavorite);
        const row = button.closest('.skill-row-container');
        if (row) {
          row.dataset.favorite = nextFavorite ? 'true' : 'false';
          const meta = row.querySelector('.swse-concept-ledger-row__meta');
          let favoriteChip = meta?.querySelector('[data-skill-favorite-chip]');
          if (nextFavorite && meta && !favoriteChip) {
            favoriteChip = document.createElement('span');
            favoriteChip.dataset.skillFavoriteChip = 'true';
            favoriteChip.textContent = 'Favorite';
            meta.appendChild(favoriteChip);
          } else if (!nextFavorite && favoriteChip) {
            favoriteChip.remove();
          }
          const filterControl = html.querySelector('[data-action="filter-skills"]');
          if (filterControl?.value === 'favorited') {
            row.style.display = nextFavorite ? '' : 'none';
            const escapedSkill = globalThis.CSS?.escape ? globalThis.CSS.escape(skillKey) : skillKey;
            const extraUsesSection = html.querySelector(`.skill-extra-uses[data-skill="${escapedSkill}"]`);
            if (extraUsesSection) extraUsesSection.style.display = nextFavorite ? '' : 'none';
          }
        }
        button.setAttribute('aria-pressed', nextFavorite ? 'true' : 'false');

        const plan = {
          update: {
            [`system.skills.${skillKey}.favorite`]: nextFavorite
          }
        };
        await ActorEngine.apply(this.actor, plan);
      }
    }, { signal, capture: false });

    // DELEGATED: Unified Skill Roll Entry Point
    // All skill-roll affordances route through the same canonical pipeline so we do not
    // double-fire rolls or bypass the holo chat/modifier flow.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".skill-roll-btn, .skill-name-btn.rollable, [data-action='roll-skill']");
      if (!button) return;

      ev.preventDefault();
      ev.stopPropagation();

      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      const wantsModifierDialog = button.dataset.modDialog === 'true'
        || button.classList.contains('skill-roll-btn')
        || button.classList.contains('skill-name-btn');

      try {
        let rollOptions = {};
        if (wantsModifierDialog) {
          const skill = this.actor.system.skills?.[skillKey];
          const modResult = await showRollModifiersDialog({
            title: `${skill?.label ?? skillKey} Check`,
            rollType: 'skill',
            actor: this.actor,
            skillKey,
            abilityKey: skill?.ability ?? skill?.abilityKey ?? skill?.attribute,
            sourceElement: button,
            sheet: this
          });

          if (modResult === null) return;

          rollOptions = {
            ...modResult,
            customModifier: Number(modResult.customModifier || 0),
            useForcePoint: modResult.useForcePoint === true,
            sourceElement: button,
            companionSource: button,
            sheet: this,
            showRollCompanion: true
          };
        }

        await this._runCanonicalSkillCheck(skillKey, rollOptions);
      } catch (err) {
        ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // Always-available unarmed attack button (Simple Weapon, Melee)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-unarmed-attack']");
      if (!button) return;

      ev.preventDefault();
      try {
        const weapon = buildVirtualUnarmedWeapon(this.actor);
        const modResult = await showRollModifiersDialog({
          title: `${weapon.name} Attack`,
          rollType: 'attack',
          actor: this.actor,
          weapon,
          sourceElement: button,
          sheet: this
        });
        if (modResult === null) return;
        if (modResult.fightingDefensively) {
          try {
            if (game.settings.get('foundryvtt-swse', 'fightDefensivelyActionMode') === 'swift') {
              const swiftAllowed = await this._applyActionEconomy('swift', { source: 'fighting-defensively', weaponId: weapon?.id ?? null, weaponName: weapon?.name ?? null });
              if (!swiftAllowed) return;
            }
          } catch (_err) {}
          await SWSEActiveEffectsManager.applyCombatActionEffect(this.actor, 'fighting-defensively');
        }
        await this._runCanonicalAttack(weapon, {
          ...modResult,
          customModifier: modResult.customModifier || 0,
          cover: modResult.cover || 'none',
          concealment: modResult.concealment || 'none',
          useForcePoint: modResult.useForcePoint || false,
          sourceElement: button,
          companionSource: button,
          sheet: this,
          showRollCompanion: true
        });
      } catch (err) {
        ui?.notifications?.error?.(`Unarmed attack failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // PHASE 6 Part 3: Combat Attack Button (with modifier dialog)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".attack-btn");
      if (!button) return;

      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
      if (ev.__swseAttackHandled) return;
      ev.__swseAttackHandled = true;
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      try {
        const weapon = this.actor.items.get(itemId);
        if (!weapon) return;

        await this._runCanonicalAttackWithPreroll(weapon, {
          customModifier: 0,
          cover: 'none',
          concealment: 'none',
          sourceElement: button,
          companionSource: button,
          sheet: this,
          showRollCompanion: true
        });
      } catch (err) {
        // console.error("Attack roll failed:", err);
        ui?.notifications?.error?.(`Attack roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // PHASE 6 Part 3: Combat Damage Button (with modifier dialog)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".damage-btn");
      if (!button) return;

      ev.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      try {
        const weapon = this.actor.items.get(itemId);
        if (!weapon) return;

        const modResult = await showRollModifiersDialog({
          title: `${weapon.name} Damage`,
          rollType: 'damage',
          actor: this.actor,
          weapon,
          sourceElement: button,
          sheet: this
        });

        if (modResult === null) return; // Cancelled

        await SWSERoll.rollDamage(this.actor, weapon, {
          ...modResult,
          customModifier: modResult.customModifier || 0,
          useForcePoint: modResult.useForcePoint || false,
          sourceElement: button,
          companionSource: button,
          sheet: this,
          showRollCompanion: true
        });
      } catch (err) {
        // console.error("Damage roll failed:", err);
        ui?.notifications?.error?.(`Damage roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // Force Card Flip
    html.querySelectorAll(".force-card").forEach(card => {
      card.addEventListener("click", ev => {
        card.classList.toggle("flipped");
      }, { signal });
    });

    // Flip Back
    html.querySelectorAll(".flip-back").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const card = ev.currentTarget.closest(".force-card");
        if (card) card.classList.remove("flipped");
      }, { signal });
    });

    // ========== HEADER COMMAND BUTTONS (Delegated) ==========
    // These use delegated listeners to survive re-renders

    // Mentor Button (delegated)
    html.addEventListener("click", ev => {
      const button = ev.target.closest('[data-action="open-mentor"]');
      if (!button) return;
      ev.preventDefault();
      this._openMentorConversation();
    }, { signal, capture: false });

    // Progression buttons (Chargen/LevelUp) — route inline inside this holopad.
    // Level Up: incomplete actors go to chargen, completed actors go to progression.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="cmd-chargen"], [data-action="cmd-levelup"]');
      if (!button) return;
      ev.preventDefault();
      try {
        let surfaceId;
        if (button.dataset.action === 'cmd-chargen') {
          surfaceId = 'chargen';
        } else {
          // cmd-levelup: mirror Home/Training app routing
          const sys = this.actor?.system ?? {};
          const chargenCompleted = this.actor?.getFlag?.('foundryvtt-swse', 'chargen.completed') === true
            || sys?.progression?.chargenComplete === true
            || sys?.swse?.chargenComplete === true
            || Number(sys.level ?? 1) > 0;
          surfaceId = chargenCompleted ? 'progression' : 'chargen';
        }
        await this.setSurface(surfaceId, {
          source: 'sheet',
          skipIntro: surfaceId !== 'chargen'
        });
        await this.requestSurfaceRender({ reason: `${surfaceId}-launch`, surfaceId });
      } catch (err) {
        swseLogger.error('[CharacterSheet] Progression launch failed:', err);
      }
    }, { signal, capture: false });

    // Abilities panel: jump directly to the progression attribute step inline.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="roll-attributes"]');
      if (!button) return;
      ev.preventDefault();
      try {
        await this.setSurface('progression', { source: 'sheet', stepId: 'attribute', currentStep: 'attribute' });
        await this.requestSurfaceRender({ reason: 'progression-attribute-launch', surfaceId: 'progression' });
      } catch (err) {
        swseLogger.error('[CharacterSheet] roll-attributes failed:', err);
      }
    }, { signal, capture: false });

    // Store button (delegated)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="cmd-store"]');
      if (!button) return;
      ev.preventDefault();
      await ShellRouter.openSurface(this.actor, 'store');
    }, { signal, capture: false });

    // Manual refresh button: this is the explicit full recalc/repaint escape hatch.
    // Ordinary field edits persist quietly and do not repaint every surface.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="refresh-sheet"]');
      if (!button) return;
      ev.preventDefault();
      ev.stopPropagation();
      button.disabled = true;
      const previousLabel = button.textContent;
      button.textContent = 'Refreshing...';
      try {
        await ActorEngine.recalcAll(this.actor);
        this.actor?.prepareData?.();
        await this.requestSurfaceRender({
          reason: 'manual-sheet-refresh',
          surfaceId: this._shellSurface ?? 'sheet',
          preserveUi: true
        });
        ui?.notifications?.info?.('Character sheet refreshed.');
      } catch (err) {
        swseLogger.error('[CharacterSheet] Manual refresh failed:', err);
        ui?.notifications?.error?.(`Refresh failed: ${err?.message ?? err}`);
      } finally {
        button.disabled = false;
        button.textContent = previousLabel || 'Refresh';
      }
    }, { signal, capture: false });

    // Character identity selection buttons (Class, Species, Background, Homeworld, Profession)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action^="cmd-select-"]');
      if (!button) return;
      ev.preventDefault();

      const action = button.dataset.action;
      const stepMap = {
        'cmd-select-class': 'class',
        'cmd-select-species': 'species',
        'cmd-select-background': 'background',
        'cmd-select-homeworld': 'background',    // Homeworld is part of background selection
        'cmd-select-profession': 'background'    // Profession is part of background selection
      };

      const targetStep = stepMap[action];
      if (!targetStep) return;

      try {
        await this.setSurface('progression', { source: 'sheet', stepId: targetStep, currentStep: targetStep });
        await this.requestSurfaceRender({ reason: `${action}-launch`, surfaceId: 'progression' });
      } catch (err) {
        swseLogger.error(`[CharacterSheet] ${action} failed:`, err);
      }
    }, { signal, capture: false });

    // Build Follower button (delegated) — Phase 3.5 follower runtime integration
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="build-follower"]');
      if (!button) return;
      ev.preventDefault();
      try {
        const choice = await DialogV2.wait({
          window: { title: 'Add Relationship Actor' },
          content: `
            <div class="swse-generic-dialog">
              <p>Choose what to add to Relationships & Connections.</p>
            </div>
          `,
          buttons: [
            { action: 'follower', label: 'Follower', default: true },
            { action: 'minion', label: 'Minion / Privateer' },
            { action: 'beast', label: 'Beast' },
            { action: 'mount', label: 'Mount' },
            { action: 'droid', label: 'Droid' },
            { action: 'vehicle', label: 'Vehicle' },
            { action: 'cancel', label: 'Cancel' }
          ]
        }).catch(() => 'cancel');

        if (choice === 'cancel' || !choice) return;
        if (choice === 'follower') {
          await launchFollowerProgression(this.actor);
          return;
        }
        if (choice === 'minion') {
          await launchMinionCreation(this.actor);
          return;
        }

        const typeMap = { beast: 'npc', mount: 'npc', droid: 'droid', vehicle: 'vehicle' };
        const actorType = typeMap[choice] || 'npc';
        const [created] = await Actor.createDocuments([{ name: `New ${choice[0].toUpperCase()}${choice.slice(1)}`, type: actorType }]);
        if (created?.sheet) created.sheet.render(true);
      } catch (err) {
        swseLogger.error('[CharacterSheet] Relationship actor creation failed:', err);
      }
    }, { signal, capture: false });

    html.querySelectorAll('[data-action="revalidate-build"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        await this._revalidateBuild();
      }, { signal });
    });

    // Inventory Panel Handlers
    this._activateInventoryUI(html, { signal });

    // SWSE Combat UI Wiring
    this._activateCombatUI(html, { signal });

    // Skills Panel Handlers
    this._activateSkillsUI(html, { signal });

    // Force Suite Handlers
    this._activateForceUI(html, { signal });

    // Feats/Talents Handlers
    this._activateAbilitiesUI(html, { signal });

    // Misc Handlers (languages, rest, DSP)
    this._activateMiscUI(html, { signal });

    // Modal Dialog Handlers (Feat/Talent Selection)
    this._activateModalUI(html, { signal });

    // Phase 4: Mobile Interaction Enhancements
    this._activateMobileActions(html, { signal });

    // ═════════════════════════════════════════════════════════════════════════════════
    // DROP HANDLING — V2 CANONICAL PATH
    // ═════════════════════════════════════════════════════════════════════════════════
    // Bind dragover to allow drop events to fire (default browser behavior prevents drops)
    html.addEventListener("dragover", (e) => {
      e.preventDefault();
    }, { signal });

    // Bind drop event to authoritative _onDrop handler
    // This routes drops through DropResolutionEngine for unified item/actor handling.
    // File drops (e.g. portrait images) are allowed to propagate to child handlers
    // (PortraitUploadController) — only Foundry document drops are intercepted here.
    html.addEventListener("drop", (e) => {
      if (e.dataTransfer?.files?.length) {
        // Let file drops reach portrait dropzone handlers; just block browser default.
        e.preventDefault();
        return;
      }
      // Vehicle crew stations can be rendered inside a shell hosted by a character sheet.
      // Let the station-level vehicle handler receive actor drops instead of treating
      // them as character-sheet relationship/adoption drops.
      if (e.target?.closest?.('[data-drop-zone="crew-station"][data-crew-station]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this._onDrop(e);
    }, { signal, capture: true });
  }

  /* ============================================================
     UI PREVIEW MATH (NON-AUTHORITATIVE)
  ============================================================ */

  _previewAbilityRow(row) {
    if (!row) return;

    const base = Number(row.querySelector('[data-field="base"]')?.value || 0);
    const racial = Number(row.querySelector('[data-field="racial"]')?.value || 0);
    const enhancement = Number(row.querySelector('[data-field="enhancement"], [data-field="misc"]')?.value || 0);
    const temp = Number(row.querySelector('[data-field="temp"]')?.value || 0);

    const total = base + racial + enhancement + temp;
    const mod = Math.floor((total - 10) / 2);

    const totalEl = row.querySelector(".math-result");
    const modEl = row.querySelector(".math-mod");

    if (totalEl) {
      totalEl.textContent = total;
      totalEl.classList.remove("result-positive","result-zero","result-negative");

      if (total > 0) totalEl.classList.add("result-positive");
      else if (total === 0) totalEl.classList.add("result-zero");
      else totalEl.classList.add("result-negative");
    }

    if (modEl) {
      modEl.textContent = mod >= 0 ? "+" + mod : mod;
    }
  }

  /* ============================================================
     FORCE ANIMATION HELPERS (UI ONLY)
  ============================================================ */

  _handleForceDiscardAnimation(itemId) {
    const root = this.element;
    if (!root) return;
    const card = root.querySelector(`.force-card[data-item-id="${itemId}"]`);
    if (!card) return;
    card.classList.add("discarding");
    setTimeout(() => card.classList.remove("discarding"), 500);
  }

  _handleForceRecoveryAnimation(itemIds = [], full = false) {
    const root = this.element;
    if (!root) return;
    const panel = root.querySelector(".force-panel");
    if (!panel) return;

    if (full) {
      panel.classList.add("force-recovery-burst");
      setTimeout(() => panel.classList.remove("force-recovery-burst"), 800);
    }

    itemIds.forEach(id => {
      const card = root.querySelector(`.force-card[data-item-id="${id}"]`);
      if (!card) return;

      card.classList.add("recovering");

      setTimeout(() => {
        card.classList.remove("recovering");
        card.classList.add("recovered");
        setTimeout(() => card.classList.remove("recovered"), 400);
      }, 500);
    });
  }

  /* ============================================================
     INVENTORY UI WIRING
  ============================================================ */

  _activateInventoryUI(html, { signal } = {}) {
    // Equip / Unequip toggle
    html.querySelectorAll(".item-equip").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.toggleEquip(this.actor, itemId);
      }, { signal });
    });

    // Edit item
    html.querySelectorAll(".item-edit").forEach(button => {
      button.addEventListener("click", (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) this.actor.items.get(itemId)?.sheet.render(true);
      }, { signal });
    });

    // Add/increment quantity
    html.querySelectorAll(".item-add").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.incrementQuantity(this.actor, itemId);
      }, { signal });
    });

    // Sell item
    html.querySelectorAll(".item-sell").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) {
            await initiateItemSale(item, this.actor);
          }
        }
      }, { signal });
    });

    // Delete/Remove item
    html.querySelectorAll('[data-action="delete"], [data-action="equip"], [data-action="toggle-activated"], [data-action="edit"], [data-action="configure"], [data-action="toggle-implant-tag"], [data-action="toggle-implant-installed"], [data-action="toggle-implant-active"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const action = button.dataset.action;
        const itemId = button.dataset.itemId || event.currentTarget.closest("[data-item-id]")?.dataset.itemId;

        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        switch (action) {
          case "delete":
            await InventoryEngine.removeItem(this.actor, itemId);
            break;
          case "equip":
            await InventoryEngine.toggleEquip(this.actor, itemId);
            break;
          case "toggle-activated":
            await InventoryEngine.toggleActivated(this.actor, itemId);
            break;
          case "toggle-implant-tag":
            await InventoryEngine.toggleImplantTag(this.actor, itemId);
            break;
          case "toggle-implant-installed":
            await InventoryEngine.toggleImplantInstalled(this.actor, itemId);
            break;
          case "toggle-implant-active":
            await InventoryEngine.toggleImplantActive(this.actor, itemId);
            break;
          case "edit":
            item.sheet.render(true);
            break;
          case "configure":
            openItemCustomization(this.actor, item);
            break;
        }
      }, { signal });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // GEAR TAB HANDLERS (V2 sheet)
    // ═══════════════════════════════════════════════════════════════════════════════

    // Open item sheet
    html.querySelectorAll('[data-action="open-item"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) item.sheet.render(true);
        }
      }, { signal });
    });

    // Equip item
    html.querySelectorAll('[data-action="equip-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) await InventoryEngine.toggleEquip(this.actor, itemId);
      }, { signal });
    });

    // Edit item
    html.querySelectorAll('[data-action="edit-item"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) item.sheet.render(true);
        }
      }, { signal });
    });

    // Delete item
    html.querySelectorAll('[data-action="delete-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) await InventoryEngine.removeItem(this.actor, itemId);
      }, { signal });
    });
  }

  /* ============================================================
     COMBAT UI WIRING
  ============================================================ */

  _activateCombatUI(html, { signal } = {}) {
    // ═════════════════════════════════════════════════════════════════
    // PHASE 9: Combat Actions Panel (In-tab browser)
    // ═════════════════════════════════════════════════════════════════

    // Filter combat actions by search
    const combatSearchInput = html.querySelector('.combat-actions-search');
    if (combatSearchInput) {
      combatSearchInput.addEventListener('input', (event) => {
        const filterText = event.target.value.toLowerCase();
        const actionRows = html.querySelectorAll('.combat-action-row');

        actionRows.forEach(row => {
          const actionName = row.querySelector('.action-name')?.textContent.toLowerCase() ?? '';
          const actionNotes = row.querySelector('.action-notes')?.textContent.toLowerCase() ?? '';
          const matches = actionName.includes(filterText) || actionNotes.includes(filterText);
          row.style.display = matches ? '' : 'none';
        });
      }, { signal });
    }

    // Sort combat actions
    const combatSortSelect = html.querySelector('.combat-actions-sort');
    if (combatSortSelect) {
      combatSortSelect.addEventListener('change', (event) => {
        const sortMode = event.target.value;
        const actionContent = html.querySelector('.combat-actions-content');
        if (!actionContent) return;

        if (sortMode === 'name') {
          // Sort by name within each group
          const groups = actionContent.querySelectorAll('.combat-action-group');
          groups.forEach(group => {
            const rows = Array.from(group.querySelectorAll('.combat-action-row'));
            rows.sort((a, b) => {
              const nameA = a.querySelector('.action-name')?.textContent ?? '';
              const nameB = b.querySelector('.action-name')?.textContent ?? '';
              return nameA.localeCompare(nameB);
            });

            const list = group.querySelector('.combat-action-list');
            if (list) {
              rows.forEach(row => list.appendChild(row));
            }
          });
        }
        // 'economy' is default, groups are already organized by economy
      }, { signal });
    }

    // New Round / Manual Reset Button
    html.querySelectorAll('[data-action="new-round"]').forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!game.combat) {
          ui?.notifications?.warn?.('No active combat');
          return;
        }

        const combatId = game.combat.id;
        const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');

        try {
          // Reset action economy for this actor
          await ActionEconomyPersistence.resetTurnState(this.actor, combatId);
          ui?.notifications?.info?.(`${this.actor.name} actions reset for new round`);

          // Trigger a coordinated re-render to update the action economy indicator
          await this.requestSurfaceRender({ reason: 'action-economy-reset' });
        } catch (err) {
          // console.error('Failed to reset turn state:', err);
          ui?.notifications?.error?.('Failed to reset actions');
        }
      }, { signal });
    });

    // Action economy undo button
    html.querySelectorAll('[data-action="swse-action-economy-undo"]').forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!game.combat) {
          ui?.notifications?.warn?.('No active combat');
          return;
        }
        try {
          const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
          await ActionEconomyPersistence.undoLast?.(this.actor, game.combat.id);
          await this.requestSurfaceRender({ reason: 'action-economy-undo' });
        } catch (err) {
          console.warn('[SWSEV2CharacterSheet] Failed to undo action economy step:', err);
          ui?.notifications?.error?.('Failed to undo the last action economy step.');
        }
      }, { signal });
    });

    // Combat status controls: cover, prone, and defensive stance declarations.
    // Uses event delegation on the root so listeners survive panel re-renders.
    // Active state is read from data-mode-active / data-prone-active attributes
    // (baked in at render time) rather than CSS classes to avoid stale reads.
    html.addEventListener('click', async (event) => {
      // Cover option
      const coverBtn = event.target.closest('[data-action="swse-combat-cover-option"]');
      if (coverBtn && !coverBtn.disabled) {
        event.preventDefault();
        const cover = coverBtn.dataset.cover || 'none';
        try {
          await CombatStatusResolver.setStatus(this.actor, { cover, source: 'combat-tab-cover' });
          await this.requestSurfaceRender({ reason: 'combat-status-cover' });
        } catch (err) {
          console.warn('[SWSEV2CharacterSheet] Failed to set combat cover:', err);
          ui?.notifications?.error?.('Failed to update cover.');
        }
        return;
      }

      // Defensive mode (Normal / Fight Defensively / Full Defense)
      const defBtn = event.target.closest('[data-action="swse-combat-defensive-mode"]');
      if (defBtn && !defBtn.disabled) {
        event.preventDefault();
        const requestedMode = defBtn.dataset.mode || 'normal';
        const isAlreadyActive = defBtn.dataset.modeActive === 'true';
        // Normal always resets all conditions (override reset for Prone + modes).
        // Any other active button clicked again toggles back to normal.
        const isReset = requestedMode === 'normal' || isAlreadyActive;
        const resolvedMode = isReset ? 'normal' : requestedMode;
        const patch = isReset
          ? { defensiveMode: 'normal', prone: false, fightDef: false, fullDef: false, resetConditions: true, source: 'combat-tab-defense-reset' }
          : { defensiveMode: resolvedMode, fightDef: resolvedMode === 'fightingDefensively', fullDef: resolvedMode === 'fullDefense', source: 'combat-tab-defense' };
        try {
          await CombatStatusResolver.setStatus(this.actor, patch);
          await this.requestSurfaceRender({ reason: 'combat-status-defense' });
        } catch (err) {
          console.warn('[SWSEV2CharacterSheet] Failed to set defensive mode:', err);
          ui?.notifications?.error?.('Failed to update defensive mode.');
        }
        return;
      }

      // Prone toggle
      const proneBtn = event.target.closest('[data-action="swse-combat-toggle-prone"]');
      if (proneBtn && !proneBtn.disabled) {
        event.preventDefault();
        const isAlreadyProne = proneBtn.dataset.proneActive === 'true';
        try {
          await CombatStatusResolver.setStatus(this.actor, { prone: !isAlreadyProne, source: 'combat-tab-prone' });
          await this.requestSurfaceRender({ reason: 'combat-status-prone' });
        } catch (err) {
          console.warn('[SWSEV2CharacterSheet] Failed to toggle prone:', err);
          ui?.notifications?.error?.('Failed to update prone state.');
        }
        return;
      }
    }, { signal });

    // ═════════════════════════════════════════════════════════════════
    // EXISTING COMBAT UI HANDLERS
    // ═════════════════════════════════════════════════════════════════

    // Action click (cards and table rows)
    html.querySelectorAll(".swse-combat-action-card, .action-row, .swse-concept-action-row--combat").forEach(element => {
      element.addEventListener("click", async (event) => {
        if (event.target.classList.contains("hide-action") || event.target.closest?.("button, a, input, select, textarea")) return;
        const key = event.currentTarget.dataset.actionKey || event.currentTarget.dataset.actionId;
        if (!key) return;

        const data = this._resolveSheetCombatActionData(key, event.currentTarget);

        await this._runCanonicalCombatAction(key, data, {
          source: "combat-action-card"
        });
      }, { signal });
    });

    // Hide individual action
    html.querySelectorAll(".hide-action").forEach(button => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const el = event.currentTarget.closest(".swse-combat-action-card, .action-row");
        if (el) el.classList.add("collapsed");
      }, { signal });
    });

    // Collapse group (table mode)
    html.querySelectorAll(".collapse-group").forEach(button => {
      button.addEventListener("click", (event) => {
        const groupKey = event.currentTarget.dataset.group;
        if (groupKey) {
          const table = html.querySelector(`table[data-group='${groupKey}']`);
          if (table) table.classList.toggle("collapsed");
        }
      }, { signal });
    });

    // Use action button
    html.querySelectorAll('[data-action="swse-v2-use-action"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const actionId = button.dataset.actionId;
        if (!actionId) return;

        const data = this._resolveSheetCombatActionData(actionId, button);

        await this._runCanonicalCombatAction(actionId, data, {
          source: "combat-action-button"
        });
      }, { signal });
    });

    // Weapon attack roll button (Combat Attacks simplified panel)
    html.querySelectorAll('[data-action="roll-attack"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        if (event.__swseAttackHandled) return;
        event.__swseAttackHandled = true;
        const weaponId = button.dataset.weaponId;
        if (!weaponId) return;

        const weapon = this.actor.items.get(weaponId);
        const isRollableWeapon = !!weapon && (['weapon', 'lightsaber'].includes(weapon.type)
          || weapon.system?.damage
          || weapon.system?.damageFormula
          || weapon.system?.weapon?.damage);
        if (!isRollableWeapon) return;

        await this._runCanonicalAttackWithPreroll(weapon, {
          source: "combat-tab",
          sourceElement: button,
          companionSource: button,
          sheet: this,
          showRollCompanion: true
        });
      }, { signal });
    });

    // Toggle attack breakdown details
    html.querySelectorAll('[data-action="toggle-attack-details"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const attackBlock = button.closest('.swse-attack-block');
        if (!attackBlock) return;

        const breakdown = attackBlock.querySelector('.attack-breakdown');
        if (!breakdown) return;

        const isHidden = breakdown.style.display === 'none';
        breakdown.style.display = isHidden ? 'flex' : 'none';
        button.classList.toggle('active', isHidden);
        button.setAttribute('aria-expanded', isHidden);
      }, { signal });
    });
  }

  /* ============================================================
     SKILLS UI WIRING
  ============================================================ */

  _activateSkillsUI(html, { signal } = {}) {
    const skillsList = html.querySelector('.skills-list');
    const getRows = () => Array.from(html.querySelectorAll('.skill-row-container'));
    const filterControls = Array.from(html.querySelectorAll('[data-action="filter-skills"]'));
    const sortControls = Array.from(html.querySelectorAll('[data-action="sort-skills"]'));
    const escapeSkillKey = (value) => {
      if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(value));
      return String(value);
    };
    const findExtraUsesSection = (skillKey) => {
      if (!skillKey) return null;
      return html.querySelector(`.skill-extra-uses[data-skill="${escapeSkillKey(skillKey)}"]`);
    };

    const applyFiltersAndSort = () => {
      const activeFilter = filterControls[0]?.value || 'all';
      const activeSort = sortControls[0]?.value || 'name';
      const rowPairs = getRows().map(row => ({
        row,
        extraUsesSection: findExtraUsesSection(row.dataset.skill)
      }));
      const visiblePairs = [];

      for (const pair of rowPairs) {
        const { row, extraUsesSection } = pair;
        const trained = row.dataset.trained === 'true';
        const favorite = row.dataset.favorite === 'true';
        const focused = row.dataset.focused === 'true';
        let matches = true;
        if (activeFilter === 'trained') matches = trained;
        else if (activeFilter === 'favorited') matches = favorite;
        else if (activeFilter === 'focused') matches = focused;

        row.style.display = matches ? '' : 'none';
        if (extraUsesSection) {
          extraUsesSection.style.display = matches ? '' : 'none';
        }
        if (matches) visiblePairs.push(pair);
      }

      if (!skillsList) return;
      visiblePairs.sort((a, b) => {
        const rowA = a.row;
        const rowB = b.row;
        switch (activeSort) {
          case 'ability':
            return (rowA.dataset.ability || '').localeCompare(rowB.dataset.ability || '') || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'total-desc':
            return Number(rowB.dataset.total || 0) - Number(rowA.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'total-asc':
            return Number(rowA.dataset.total || 0) - Number(rowB.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'name':
          default:
            return (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
        }
      });

      for (const { row, extraUsesSection } of visiblePairs) {
        skillsList.appendChild(row);
        if (extraUsesSection) {
          skillsList.appendChild(extraUsesSection);
        }
      }
    };

    filterControls.forEach(select => {
      select.addEventListener('change', applyFiltersAndSort, { signal });
    });

    sortControls.forEach(select => {
      select.addEventListener('change', applyFiltersAndSort, { signal });
    });

    const syncSkillAbilitySelectorState = (select) => {
      const nextAbility = String(select?.value || '').trim();
      if (!nextAbility) return;
      const row = select.closest('.skill-row-container');
      if (row) {
        const previous = row.dataset.ability || select.dataset.abilitySelect || '';
        row.dataset.ability = nextAbility;
        if (previous) row.classList.remove(`swse-concept-skill-row--${previous}`);
        row.classList.add(`swse-concept-skill-row--${nextAbility}`);
      }
      select.dataset.abilitySelect = nextAbility;
      applyFiltersAndSort();
    };

    html.querySelectorAll('.swse-concept-skill-row__math .ability-select').forEach(select => {
      select.addEventListener('click', (event) => event.stopPropagation(), { signal });
      select.addEventListener('pointerdown', (event) => event.stopPropagation(), { signal });
      select.addEventListener('change', () => syncSkillAbilitySelectorState(select), { signal });
    });

    html.querySelectorAll('[data-action="reset-skills-tools"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        filterControls.forEach(select => { select.value = 'all'; });
        sortControls.forEach(select => { select.value = 'name'; });
        applyFiltersAndSort();
      }, { signal });
    });


    html.querySelectorAll('[data-action="toggle-skill-expand"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        if (!skillKey) return;

        const extraUsesSection = findExtraUsesSection(skillKey);
        if (!extraUsesSection?.classList.contains('skill-extra-uses')) {
          swseLogger.warn('[CharacterSheet] Extra skill uses section not found for toggle', {
            actorId: this.actor?.id,
            actorName: this.actor?.name,
            skillKey
          });
          return;
        }

        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        const nextExpanded = !isExpanded;
        const label = nextExpanded ? 'Hide extra skill uses' : 'Show extra skill uses';
        const chevronGlyph = nextExpanded ? '▴' : '▾';
        const legacyGlyph = chevronGlyph;

        html.querySelectorAll(`[data-action="toggle-skill-expand"][data-skill="${escapeSkillKey(skillKey)}"]`).forEach(toggleButton => {
          toggleButton.setAttribute('aria-expanded', String(nextExpanded));
          toggleButton.setAttribute('title', label);
          toggleButton.classList.toggle('skill-expand-toggle--expanded', nextExpanded);

          const labelNode = toggleButton.querySelector('.expand-label');
          if (labelNode) labelNode.textContent = label;

          const chevronNode = toggleButton.querySelector('.expand-chevron');
          if (chevronNode) chevronNode.textContent = chevronGlyph;

          const countBadge = toggleButton.querySelector('.expand-count');
          if (!countBadge && !labelNode) toggleButton.textContent = legacyGlyph;
        });

        if (isExpanded) {
          extraUsesSection.classList.remove('skill-extra-uses--expanded');
          extraUsesSection.classList.add('skill-extra-uses--collapsed');
          const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
          if (filterBar) filterBar.classList.add('skill-extra-uses-hidden');
        } else {
          extraUsesSection.classList.remove('skill-extra-uses--collapsed');
          extraUsesSection.classList.add('skill-extra-uses--expanded');
          const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
          if (filterBar) filterBar.classList.remove('skill-extra-uses-hidden');
        }
      }, { signal });
    });

    html.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const filterType = btn.dataset.filter;
        const filterBar = btn.closest('.extra-uses-filter-bar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
        btn.classList.add('filter-btn--active');

        const extrasSection = filterBar.closest('.skill-extra-uses');
        const useRows = extrasSection?.querySelectorAll('.extra-use-row') ?? [];
        useRows.forEach(row => {
          if (filterType === 'all') row.style.display = '';
          else if (filterType === 'available') row.style.display = row.classList.contains('use-blocked') ? 'none' : '';
          else if (filterType === 'combat') row.style.display = (row.dataset.category === 'Combat' || row.dataset.category === 'Defensive') ? '' : 'none';
        });
      }, { signal });
    });

    applyFiltersAndSort();
  }

  /* ============================================================
     FORCE SUITE UI WIRING
  ============================================================ */

  _activateForceUI(html, { signal } = {}) {
    // Force sort dropdown
    html.querySelectorAll('[data-action="force-sort"]').forEach(select => {
      select.addEventListener("change", (event) => {
        const sortBy = event.target.value;
        const cardGrid = html.querySelector(".force-card-grid");
        if (!cardGrid) return;

        const cards = Array.from(cardGrid.querySelectorAll(".force-card:not(.discarded)"));
        cards.sort((a, b) => {
          const aName = a.querySelector(".force-name")?.textContent || "";
          const aTagString = a.dataset.tags || "";
          const bName = b.querySelector(".force-name")?.textContent || "";
          const bTagString = b.dataset.tags || "";

          switch (sortBy) {
            case "tag":
              return aTagString.localeCompare(bTagString);
            case "name":
            default:
              return aName.localeCompare(bName);
          }
        });

        cards.forEach(card => cardGrid.appendChild(card));
      }, { signal });
    });

    // Force tag filter buttons
    html.querySelectorAll('[data-action="force-tag-filter"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const tag = button.dataset.tag;
        if (!tag) return;

        // Toggle button active state
        button.classList.toggle("active");

        // Filter cards
        const activeFilters = Array.from(html.querySelectorAll('[data-action="force-tag-filter"].active'))
          .map(b => b.dataset.tag);

        const cards = html.querySelectorAll(".force-card:not(.discarded)");
        cards.forEach(card => {
          if (activeFilters.length === 0) {
            card.style.display = "";
          } else {
            const cardTags = (card.dataset.tags || "").split(" ");
            const matches = activeFilters.some(f => cardTags.includes(f));
            card.style.display = matches ? "" : "none";
          }
        });
      }, { signal });
    });

    // Activate force button
    html.querySelectorAll('[data-action="activate-force"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();

        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const power = this.actor.items.get(itemId);
        if (!power || (power.type !== "force-power" && power.type !== "force-power")) return;

        // Determine if this is a recovery or activation
        const isRecovery = power.system?.discarded ?? false;

        try {
          const rollOptions = isRecovery
            ? null
            : await promptForcePowerRollOptions({ actor: this.actor, power, sourceElement: button });
          if (!isRecovery && !rollOptions) return;

          const result = await mutateAndRepaint(this, () => (
            isRecovery
              ? ForceExecutor.activateForce(this.actor, itemId, true)
              : ForceExecutor.executeForcePower(this.actor, itemId, rollOptions)
          ), {
            reason: isRecovery ? 'force-power-recover' : 'force-power-use',
            surfaceId: this._shellSurface ?? 'sheet',
            preserveUi: true
          });
          if (result?.success !== false) {
            ui?.notifications?.info?.(`${power.name} ${isRecovery ? "recovered" : "used"}`);
          }
        } catch (err) {
          // console.error("Force activation failed:", err);
          ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
        }
      }, { signal });
    });

    html.querySelectorAll('[data-action="open-force-alchemy-workbench"]').forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await openForceAlchemyWorkbench(this.actor, {
            launchSource: button.dataset.launchSource || 'force-suite',
            riteId: button.dataset.riteId || null,
            activeCategory: button.dataset.category || null,
            targetId: button.dataset.itemId || null
          });
        } catch (err) {
          ui?.notifications?.error?.(`Force artifact workbench failed: ${err.message}`);
        }
      }, { signal });
    });

    html.querySelectorAll('[data-action="claim-guardian-bonus-fp"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await mutateAndRepaint(this, () => GuardianSpiritActions.claimGuardianBonusForcePoint(this.actor), {
            reason: 'guardian-spirit-bonus-force-point',
            surfaceId: this._shellSurface ?? 'sheet',
            preserveUi: true
          });
        } catch (err) {
          ui?.notifications?.error?.(`Guardian Spirit bonus Force Point failed: ${err.message}`);
        }
      }, { signal });
    });

    html.querySelectorAll('[data-action="gain-bonus-force-point"], [data-action="spend-bonus-force-point"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const delta = button.dataset.action === 'gain-bonus-force-point' ? 1 : -1;
        try {
          await mutateAndRepaint(this, () => GuardianSpiritActions.adjustBonusForcePoints(this.actor, delta, 'Manual'), {
            reason: 'adjust-bonus-force-points',
            surfaceId: this._shellSurface ?? 'sheet',
            preserveUi: true
          });
        } catch (err) {
          ui?.notifications?.error?.(`Bonus Force Point adjustment failed: ${err.message}`);
        }
      }, { signal });
    });

    // Item action bar: Customize item
    html.querySelectorAll('[data-action="customize-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        try {
          openItemCustomization(this.actor, item);
        } catch (err) {
          // console.error("Customization workbench failed:", err);
          ui?.notifications?.error?.("Failed to open customization workbench");
        }
      }, { signal });
    });

    // Item action bar: Open overflow menu
    html.querySelectorAll('[data-action="open-item-menu"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        new Dialog({
          title: item.name,
          content: `<p>Select action for ${item.name}:</p>`,
          buttons: {
            edit: {
              label: "Edit",
              callback: () => item.sheet.render(true)
            },
            delete: {
              label: "Delete",
              callback: () => ActorEngine.deleteEmbeddedDocuments(this.actor, 'Item', [item.id])
            },
            close: {
              label: "Close"
            }
          }
        }).render(true);
      }, { signal });
    });

    // NOTE: Quick attack/damage rolls via [data-action="roll-attack"] and [data-action="roll-damage"]
    // are now REMOVED (dead code). Use the working class-based handlers instead:
    // - .attack-btn (uses showRollModifiersDialog + SWSERoll.rollAttack)
    // - .damage-btn (uses showRollModifiersDialog + SWSERoll.rollDamage)
    // Both handlers create chat messages correctly via createChatMessage() or SWSEChat.postRoll()
  }

  /* ============================================================
     FEATS/TALENTS/ABILITIES UI WIRING
  ============================================================ */

  _activateAbilitiesUI(html, { signal } = {}) {
    // Open ability/feat/talent sheet
    html.querySelectorAll('[data-action="open-ability"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (item) {
          item.sheet.render(true);
        }
      }, { signal });
    });

    // === INVENTORY: CREATE ENTITY / ADD ITEM BUTTONS (Gear tab) ===
    html.addEventListener("click", async (event) => {
      const browserButton = event.target.closest('[data-action="open-entity-browser"]');
      if (!browserButton) return;
      event.preventDefault();
      event.stopPropagation();
      new EntityCreateBrowser({
        actor: this.actor,
        initialType: browserButton.dataset.initialType || 'weapon'
      }).render(true);
    }, { signal, capture: false });

    html.addEventListener("click", async (event) => {
      const button = event.target.closest('[data-action="add-item"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const itemType = button.dataset.itemType;
      if (!itemType) return;

      this._pendingAddItemTypes ??= new Set();
      if (this._pendingAddItemTypes.has(itemType) || button.dataset.swseBusy === 'true') {
        return;
      }

      button.dataset.swseBusy = 'true';
      button.disabled = true;
      this._pendingAddItemTypes.add(itemType);

      try {
        await this._createAndOpenBlankItem(itemType);
      } catch (err) {
        ui.notifications.error(`Failed to create item: ${err.message}`);
      } finally {
        this._pendingAddItemTypes.delete(itemType);
        delete button.dataset.swseBusy;
        button.disabled = false;
      }
    }, { signal, capture: false });

    // Summary audit rows can jump the player to the sheet area that explains the problem.
    html.addEventListener("click", async (event) => {
      const target = event.target.closest('[data-action="open-audit-target"]');
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        await this._openAuditTarget(target.dataset);
      } catch (err) {
        swseLogger.error('[SWSEV2CharacterSheet] Audit navigation failed:', err);
        ui?.notifications?.warn?.(`Could not open audit target: ${err.message}`);
      }
    }, { signal, capture: false });

    // Progression reconciliation audit actions
    html.addEventListener("click", async (event) => {
      const button = event.target.closest('[data-action="resolve-progression-slot"], [data-action="classify-progression-slot"], [data-action="review-progression-slot"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        const action = button.dataset.action;
        if (action === 'resolve-progression-slot') {
          await this._openProgressionReconciliationStep(button.dataset);
        } else if (action === 'classify-progression-slot') {
          await this._classifyProgressionSlot(button.dataset);
        } else if (action === 'review-progression-slot') {
          await this._reviewProgressionSlot(button.dataset);
        }
      } catch (err) {
        swseLogger.error('[SWSEV2CharacterSheet] Progression reconciliation action failed:', err);
        ui?.notifications?.error?.(`Progression reconciliation action failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // Add feat button
    html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this._showAddAbilityDialog('feat');
      }, { signal });
    });

    // Resolve or change feat choices from the sheet. Missing/invalid choices warn only; they never block play.
    html.querySelectorAll('[data-action="resolve-feat-choice"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const itemId = button.dataset.itemId;
        const item = itemId ? this.actor.items.get(itemId) : null;
        if (!item) return;
        const changed = await FeatChoiceDialog.promptAndApply(this.actor, item);
        if (changed) await this.requestSurfaceRender({ reason: 'feat-choice-resolved' });
      }, { signal });
    });

    // Delete feat button
    html.querySelectorAll('[data-action="delete-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;
        await InventoryEngine.removeItem(this.actor, itemId);
        await this.requestSurfaceRender({ reason: 'feat-deleted' });
      }, { signal });
    });

    // Add talent button
    html.querySelectorAll('[data-action="add-talent"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this._showAddAbilityDialog('talent');
      }, { signal });
    });

    // Delete talent button
    html.querySelectorAll('[data-action="delete-talent"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;
        await InventoryEngine.removeItem(this.actor, itemId);
        await this.requestSurfaceRender({ reason: 'talent-deleted' });
      }, { signal });
    });
  }


  async _openAuditTarget(dataset = {}) {
    const tabName = String(dataset.tabTarget || dataset.tab || 'abilities').trim() || 'abilities';
    const sheetAnchor = String(dataset.sheetAnchor || '').trim();
    const rowId = String(dataset.rowId || '').trim();
    const root = this.element instanceof HTMLElement
      ? this.element
      : (this.element?.[0] || document);
    const escapeSelector = (value) => {
      if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(value));
      return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    };

    const tabLink = root?.querySelector?.(`[data-action='sheet-tab'][data-sheet-tab='${escapeSelector(tabName)}'], [data-action='tab'][data-tab='${escapeSelector(tabName)}']`);
    if (tabLink) {
      this.visibilityManager?.setActiveTab?.(tabName);
      this.uiStateManager?._activateTab?.(tabLink);
    }

    await new Promise(resolve => setTimeout(resolve, 0));
    const anchorSelector = sheetAnchor ? `[data-sheet-anchor='${escapeSelector(sheetAnchor)}']` : '';
    const rowSelector = rowId ? `[data-audit-row-id='${escapeSelector(rowId)}']` : '';
    const target = (rowSelector && root?.querySelector?.(rowSelector))
      || (anchorSelector && root?.querySelector?.(anchorSelector))
      || null;
    target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    target?.classList?.add?.('swse-audit-target-pulse');
    target?.classList?.add?.('swse-route-anchor-pulse');
    if (target) setTimeout(() => {
      target.classList?.remove?.('swse-audit-target-pulse');
      target.classList?.remove?.('swse-route-anchor-pulse');
    }, 1600);
  }


  async _openProgressionReconciliationStep(dataset = {}) {
    const slotType = String(dataset.slotType || '').trim();
    const stepId = String(dataset.stepId || this._stepIdForProgressionSlot(slotType)).trim() || 'summary';
    const reconciliation = {
      source: 'sheet-audit',
      slotId: dataset.slotId || null,
      slotType,
      classId: dataset.classId || '',
      className: dataset.className || '',
      classLevel: Number(dataset.classLevel || 0) || 0,
      characterLevel: Number(dataset.characterLevel || 0) || 0,
      openedAt: new Date().toISOString(),
    };

    await this.setSurface('progression', {
      source: 'sheet-reconciliation',
      mode: 'reconcile',
      stepId: 'reconciliation-overview',
      currentStep: 'reconciliation-overview',
      targetStep: 'reconciliation-overview',
      targetStepId: 'reconciliation-overview',
      routeIntent: 'progression-reconciliation',
      singleStep: false,
      skipIntro: true,
      forceFreshAdapter: true,
      reconciliation,
    });
    await this.requestSurfaceRender({ reason: `progression-reconciliation-${slotType || stepId}`, surfaceId: 'progression' });
    ui?.notifications?.info?.('Opening progression recovery briefing. Missing choices will resolve in level order.');
  }

  async _classifyProgressionSlot(dataset = {}) {
    const itemId = String(dataset.itemId || '').trim();
    const item = itemId ? this.actor.items.get(itemId) : null;
    if (!item) {
      ui?.notifications?.warn?.('The item selected for classification could not be found on this actor.');
      return;
    }

    const slotType = String(dataset.slotType || '').trim();
    const itemType = String(item.type || '').trim();
    if ((slotType.includes('feat') && itemType !== 'feat') || (slotType.includes('talent') && itemType !== 'talent')) {
      ui?.notifications?.warn?.(`${item.name} is a ${itemType || 'unknown item'}, so it cannot satisfy ${slotType || 'this slot'}.`);
      return;
    }

    const confirmed = await new Promise((resolve) => {
      new Dialog({
        title: `Classify ${item.name}`,
        content: `
          <p style="margin:0 0 8px;">Classify <strong>${item.name}</strong> as <strong>${this._labelForProgressionSlot(slotType)}</strong>?</p>
          <p style="margin:0;color:rgba(255,255,255,.72);font-size:12px;">This writes acquisition metadata only. It does not grant a new item or remove anything.</p>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Classify',
            callback: () => resolve(true),
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(false),
          },
        },
        default: 'confirm',
        close: () => resolve(false),
      }, {
        classes: ['swse', 'swse-dialog'],
        width: 420,
      }).render(true);
    });

    if (!confirmed) return;

    const stepId = String(dataset.stepId || this._stepIdForProgressionSlot(slotType)).trim() || '';
    const slotSource = this._slotSourceForProgressionSlot(slotType);
    const classLevel = Number(dataset.classLevel || 0) || 0;
    const characterLevel = Number(dataset.characterLevel || 0) || 0;
    const acquisition = {
      source: slotType,
      sourceType: slotType,
      slotType: slotSource,
      selectionKey: stepId,
      slotId: dataset.slotId || null,
      classId: dataset.classId || '',
      className: dataset.className || '',
      classLevel,
      sourceClassLevel: classLevel,
      characterLevel,
      classifiedAt: new Date().toISOString(),
      classifiedBy: game?.user?.id || null,
      classificationSource: 'sheet-reconciliation',
    };

    const update = {
      _id: item.id,
      'system.acquisition': acquisition,
      'system.slotType': slotSource,
      'system.sourceType': slotType,
      'flags.swse.acquisition': acquisition,
      'flags.swse.progression.slotType': slotSource,
      'flags.swse.progression.selectionKey': stepId,
      'flags.swse.progression.reconciledSlotId': dataset.slotId || null,
      'flags.swse.progression.classId': dataset.classId || '',
      'flags.swse.progression.className': dataset.className || '',
      'flags.swse.progression.classLevel': classLevel,
      'flags.swse.progression.characterLevel': characterLevel,
      'flags.swse.progression.classifiedByReconciler': true,
    };

    await ActorEngine.updateEmbeddedDocuments(this.actor, 'Item', [update], {
      source: 'progression-reconciliation-classify-item',
      render: false,
      suppressAppRefresh: true,
    });
    await this.requestSurfaceRender({ reason: 'progression-reconciliation-classified', preserveUi: true });
    ui?.notifications?.info?.(`${item.name} classified as ${this._labelForProgressionSlot(slotType)}.`);
  }

  async _reviewProgressionSlot(dataset = {}) {
    const itemId = String(dataset.itemId || '').trim();
    const item = itemId ? this.actor.items.get(itemId) : null;
    if (item) {
      item.sheet.render(true);
      return;
    }
    ui?.notifications?.warn?.('The extra item could not be found on this actor.');
  }

  _stepIdForProgressionSlot(slotType = '') {
    switch (String(slotType || '').toLowerCase()) {
      case 'ability-increase': return 'attribute';
      case 'class-feat': return 'class-feat';
      case 'class-talent': return 'class-talent';
      case 'heroic-talent': return 'general-talent';
      case 'general-feat':
      case 'feat': return 'general-feat';
      case 'talent': return 'general-talent';
      default: return 'summary';
    }
  }

  _slotSourceForProgressionSlot(slotType = '') {
    switch (String(slotType || '').toLowerCase()) {
      case 'class-feat':
      case 'class-talent': return 'class';
      case 'heroic-talent': return 'heroic';
      case 'general-feat':
      case 'feat': return 'general';
      case 'talent': return 'heroic';
      default: return String(slotType || 'manual');
    }
  }

  _labelForProgressionSlot(slotType = '') {
    switch (String(slotType || '').toLowerCase()) {
      case 'ability-increase': return 'ability score increase';
      case 'class-feat': return 'class feat';
      case 'class-talent': return 'class talent';
      case 'heroic-talent': return 'heroic talent';
      case 'general-feat':
      case 'feat': return 'general feat';
      case 'talent': return 'heroic talent';
      default: return 'progression slot';
    }
  }

  _labelForProgressionStep(stepId = '') {
    switch (String(stepId || '').toLowerCase()) {
      case 'attribute': return 'the attribute step';
      case 'class-feat': return 'the class feat step';
      case 'class-talent': return 'the class talent step';
      case 'general-talent': return 'the heroic talent step';
      case 'general-feat': return 'the general feat step';
      default: return 'progression';
    }
  }

  /**
   * Show a two-option dialog when the player clicks Add Feat / Add Talent.
   * - "Pick from Compendium" → opens the progression feat/talent step inline
   * - "Add Custom" → creates a blank item and opens its sheet for editing
   */
  async _showAddAbilityDialog(itemType) {
    const label = itemType === 'feat' ? 'Feat' : 'Talent';
    const stepId = itemType === 'feat' ? 'general-feat' : 'general-talent';

    return new Promise((resolve) => {
      new Dialog({
        title: `Add ${label}`,
        content: `
          <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,.75);">
            How would you like to add a ${label.toLowerCase()}?
          </p>`,
        buttons: {
          legal: {
            icon: '<i class="fa-solid fa-book-open"></i>',
            label: `Pick from Compendium`,
            callback: async () => {
              try {
                await this.setSurface('progression', {
                  source: 'sheet-free-add',
                  stepId,
                  currentStep: stepId,
                  targetStep: stepId,
                  targetStepId: stepId,
                  mode: 'freeAdd',
                  singleStep: true,
                  singleStepDomain: itemType === 'talent' ? 'talents' : 'feats',
                  singleStepJob: itemType === 'talent' ? 'add-talent-from-compendium' : 'add-feat-from-compendium',
                  skipIntro: true,
                  forceFreshAdapter: true,
                });
                await this.requestSurfaceRender({ reason: `${itemType}-single-step-launch`, surfaceId: 'progression' });
              } catch (err) {
                swseLogger.error(`[CharacterSheet] ${label} step launch failed:`, err);
              }
              resolve();
            }
          },
          custom: {
            icon: '<i class="fa-solid fa-pen"></i>',
            label: `Add Custom ${label}`,
            callback: async () => {
              await this._createAndOpenBlankItem(itemType);
              resolve();
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve()
          }
        },
        default: 'legal'
      }, {
        classes: ['swse', 'swse-dialog'],
        width: 340
      }).render(true);
    });
  }

  async _createAndOpenBlankItem(itemType) {
    const safeType = String(itemType || '').trim();
    if (!safeType) return null;

    const itemData = createSafeItemData(safeType, {
      shieldMode: safeType === 'shield',
      name: safeType === 'shield' ? 'New Energy Shield' : undefined
    });
    const label = itemData.name.replace(/^New\s+/, '') || safeType;

    try {
      addItemEditorTrace('sheet-create-and-open-before', { actor: summarizeActorItems(this.actor), itemType: safeType, label });
      const doc = await createSafeEmbeddedItem(this.actor, safeType, {
        shieldMode: safeType === 'shield',
        name: safeType === 'shield' ? 'New Energy Shield' : undefined,
        source: `character-sheet-add-${safeType}`
      });
      addItemEditorTrace('sheet-create-and-open-after-create', {
        actor: summarizeActorItems(this.actor),
        itemType: safeType,
        created: doc ? { id: doc.id, name: doc.name, type: doc.type } : null
      });
      if (doc?.sheet) {
        doc.sheet._entityDialogMode = 'create';
        doc.sheet.render(true);
      }
      await this.requestSurfaceRender({ reason: 'embedded-item-created' });
      return doc ?? null;
    } catch (err) {
      addItemEditorTrace('sheet-create-and-open-error', { actor: summarizeActorItems(this.actor), itemType: safeType, error: err });
      ui?.notifications?.error?.(`Failed to create ${label}: ${err?.message ?? err}`);
      return null;
    }
  }

  /* ============================================================
     MODAL DIALOG FOR ITEM SELECTION (FEATS/TALENTS)
  ============================================================ */

  _showItemSelectionModal(itemType) {
    const root = this.element;
    if (!root) return false;
    const modal = root.querySelector('#item-selection-modal');
    const titleEl = root.querySelector('#modal-title');
    const messageEl = root.querySelector('#modal-message');
    if (!modal || !titleEl || !messageEl) return false;

    const capitalType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
    titleEl.textContent = `Add ${capitalType}`;
    messageEl.textContent = `Would you like to choose a ${itemType} from the compendium?`;

    this._currentItemType = itemType;
    modal.style.display = 'flex';

    // Wire overlay click using render-cycle signal so it tears down on rerender.
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay && !overlay._clickHandlerAttached) {
      overlay.addEventListener('click', () => this._hideItemSelectionModal(), {
        signal: this._renderAbort?.signal
      });
      overlay._clickHandlerAttached = true;
    }

    return true;
  }

  _hideItemSelectionModal() {
    const root = this.element;
    if (!root) return;
    const modal = root.querySelector('#item-selection-modal');
    if (!modal) return;
    modal.style.display = 'none';
    this._currentItemType = null;
  }

  async _handleModalYes() {
    const itemType = this._currentItemType;
    if (!itemType) return;

    this._hideItemSelectionModal();

    await this._addAbilityItemFromCompendium(itemType);
  }

  /**
   * Search/browse the canonical feat or talent compendium and create a full owned copy
   * of the selected document on this actor.
   *
   * The list is driven by the canonical registries (FeatRegistry / TalentRegistry) and the
   * created item is cloned from the real compendium document, so the owned item keeps its
   * description, benefit, prerequisites, source, page, tree identity, and choice metadata.
   *
   * @param {string} itemType - "feat" or "talent"
   * @returns {Promise<Item|null>} The created owned item, or null when cancelled/failed.
   */
  async _addAbilityItemFromCompendium(itemType) {
    const registry = itemType === 'feat' ? FeatRegistry : TalentRegistry;
    await registry.initialize?.();

    const entries = (registry.getAll?.() || [])
      .filter(entry => entry?.id && entry?.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    if (!entries.length) {
      ui?.notifications?.error?.(`${itemType} registry/compendium not available!`);
      return null;
    }

    const label = itemType === 'feat' ? 'Feat' : 'Talent';
    const listId = `swse-${itemType}-pick-list`;
    const fieldName = `swse-${itemType}-pick`;
    const escape = (value) => foundry.utils.escapeHTML(String(value ?? ''));
    const optionsMarkup = entries.map((entry) => {
      const group = entry.treeName || entry.talentTree || entry.category || entry.source || '';
      return `<option value="${escape(entry.name)}"${group ? ` label="${escape(group)}"` : ''}></option>`;
    }).join('');

    const content = `
      <div class="swse-ability-pick">
        <p>Search the ${escape(label)} compendium and pick the entry to add to ${escape(this.actor?.name || 'this character')}.</p>
        <input type="text" name="${fieldName}" list="${listId}" placeholder="Type to search ${entries.length} ${escape(label.toLowerCase())}s…" autofocus />
        <datalist id="${listId}">${optionsMarkup}</datalist>
      </div>`;

    const chosenName = await SWSEDialogV2.prompt({
      title: `Add ${label} from Compendium`,
      content,
      label: `Add ${label}`,
      callback: (html) => String(html?.find?.(`[name="${fieldName}"]`)?.val?.() ?? '').trim()
    });

    if (!chosenName) return null;

    const entry = registry.getByName?.(chosenName) || registry.getById?.(chosenName) || null;
    if (!entry) {
      ui?.notifications?.warn?.(`No ${itemType} named "${chosenName}" exists in the compendium.`);
      return null;
    }

    const doc = await registry.getDocumentById?.(entry.id);
    if (!doc) {
      ui?.notifications?.error?.(`Could not load the "${entry.name}" ${itemType} document from the compendium.`);
      return null;
    }

    try {
      const source = doc.toObject ? doc.toObject() : foundry.utils.deepClone(doc);
      delete source._id;
      const [created] = await ActorEngine.createEmbeddedDocuments(this.actor, 'Item', [source], {
        source: `character-sheet-compendium-add-${itemType}`
      });

      // Repeatable, choice-bearing abilities (Exceptional Skill, Weapon Focus, ...) resolve
      // their selection through the existing choice dialog rather than a bespoke prompt.
      if (created && FeatChoiceResolver.requiresChoice?.(created)) {
        await FeatChoiceDialog.promptAndApply?.(this.actor, created);
      }

      await this.requestSurfaceRender({ reason: 'embedded-item-created' });
      ui?.notifications?.info?.(`Added ${entry.name} to ${this.actor?.name ?? 'the actor'}.`);
      return created ?? null;
    } catch (err) {
      swseLogger.error(`[CharacterSheet] Failed to add ${itemType} from compendium:`, err);
      ui?.notifications?.error?.(`Failed to add ${entry.name}: ${err?.message ?? err}`);
      return null;
    }
  }

  async _handleModalNo() {
    if (!this._currentItemType) return;

    this._hideItemSelectionModal();

    try {
      const doc = await createSafeEmbeddedItem(this.actor, this._currentItemType, {
        source: `character-sheet-modal-custom-${this._currentItemType}`
      });
      if (doc?.sheet) {
        doc.sheet._entityDialogMode = 'create';
        doc.sheet.render(true);
      }
      await this.requestSurfaceRender({ reason: 'embedded-item-created' });
    } catch (err) {
      ui?.notifications?.error?.(`Failed to create ${this._currentItemType}: ${err.message}`);
    }
  }

  /* ============================================================
     MODAL UI WIRING
  ============================================================ */

  _activateModalUI(html, { signal } = {}) {
    // Modal Yes button
    html.querySelectorAll('[data-action="modal-yes"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._handleModalYes();
      }, { signal });
    });

    // Modal No button
    html.querySelectorAll('[data-action="modal-no"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._handleModalNo();
      }, { signal });
    });
  }

  /* ============================================================
     MISCELLANEOUS UI WIRING (LANGUAGES, REST, DSP, ETC)
  ============================================================ */

  _activateMiscUI(html, { signal } = {}) {
    // Add language button
    html.querySelectorAll('[data-action="add-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const languages = this.actor.system?.languages ?? [];
        try {
          const newLang = await CustomLanguageDialog.prompt({ suggestedName: '' });
          if (newLang) {
            const merged = Array.from(new Set([...languages, newLang]));
            const plan = { update: { "system.languages": merged } };
            await ActorEngine.apply(this.actor, plan);
          }
        } catch (err) {
          ui?.notifications?.error?.(`Failed to add language: ${err.message}`);
        }
      }, { signal });
    });

    // Remove language button
    html.querySelectorAll('[data-action="remove-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const langName = button.dataset.language;
        if (!langName) return;

        const languages = (this.actor.system?.languages ?? []).filter(l => l !== langName);
        const plan = {
          update: {
            "system.languages": languages
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
        } catch (err) {
          // console.error("Failed to remove language:", err);
          ui?.notifications?.error?.(`Failed to remove language: ${err.message}`);
        }
      }, { signal });
    });

    // Rest / Second Wind button
    html.querySelectorAll('[data-action="rest-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await ActorEngine.resetSecondWind(this.actor);
          ui?.notifications?.info?.("Second Wind restored!");
        } catch (err) {
          // console.error("Rest failed:", err);
          ui?.notifications?.error?.(`Rest failed: ${err.message}`);
        }
      }, { signal });
    });

    // Use Second Wind button
    html.querySelectorAll('[data-action="use-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          const result = await ActorEngine.applySecondWind(this.actor);
          if (result?.success === false) {
            ui?.notifications?.warn?.(result.reason || "No Second Wind uses remaining");
            return;
          }
          ui?.notifications?.info?.(`Regained ${result?.healed ?? 0} HP!`);
        } catch (err) {
          // console.error("Second Wind use failed:", err);
          ui?.notifications?.error?.(`Second Wind use failed: ${err.message}`);
        }
      }, { signal });
    });

    const getStatusFeed = () => {
      const direct = this.actor?.flags?.swse?.character?.statusFeed;
      return Array.isArray(direct) ? [...direct] : [];
    };
    const prependStatusFeed = (entry) => [entry, ...getStatusFeed()].slice(0, 20);
    const findNearestNumericInput = (button, selector) => {
      const panel = button.closest?.('.swse-concept-panel') || button.closest?.('.swse-concept-dashboard') || button.parentElement;
      return panel?.querySelector?.(selector) || null;
    };

    // Add XP button: increments canonical XP and records the award in the dossier status feed.
    html.querySelectorAll('[data-action="add-xp-to-actor"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const input = findNearestNumericInput(button, '[data-role="xp-add-amount"]');
        const amount = Math.max(0, Number(input?.value ?? 0) || 0);
        if (amount <= 0) {
          ui?.notifications?.warn?.('Enter an XP amount greater than 0.');
          return;
        }
        const current = Number(this.actor.system?.xp?.total ?? 0) || 0;
        const next = current + amount;
        try {
          await mutateAndRepaint(this, () => ActorEngine.updateActor(this.actor, {
            'system.xp.total': next,
            'flags.swse.character.statusFeed': prependStatusFeed({
              id: `xp-${Date.now()}`,
              label: 'XP Awarded',
              detail: `Added ${amount.toLocaleString()} XP`,
              value: `${next.toLocaleString()} total XP`,
              tone: 'ok',
              timestamp: new Date().toISOString()
            })
          }, {
            source: 'character-sheet-add-xp',
            meta: { guardKey: 'character-sheet-add-xp' },
            render: false
          }), {
            reason: 'character-sheet-add-xp',
            surfaceId: this._shellSurface ?? 'sheet',
            preserveUi: true
          });
          if (input) input.value = '';
          ui?.notifications?.info?.(`Added ${amount.toLocaleString()} XP.`);
        } catch (err) {
          ui?.notifications?.error?.(`Failed to add XP: ${err.message}`);
        }
      }, { signal });
    });

    // Add credits button: adjusts the current credit ledger and records it in the status feed.
    html.querySelectorAll('[data-action="add-credits-to-actor"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const input = findNearestNumericInput(button, '[data-role="credits-add-amount"]');
        const amount = Number(input?.value ?? 0) || 0;
        if (amount === 0) {
          ui?.notifications?.warn?.('Enter a credit adjustment other than 0.');
          return;
        }
        const current = Number(this.actor.system?.credits ?? 0) || 0;
        const next = Math.max(0, current + amount);
        try {
          await ActorEngine.updateActor(this.actor, {
            'system.credits': next,
            'flags.swse.character.statusFeed': prependStatusFeed({
              id: `credits-${Date.now()}`,
              label: amount > 0 ? 'Credits Added' : 'Credits Spent',
              detail: `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount).toLocaleString()} credits`,
              value: `${next.toLocaleString()} current credits`,
              tone: amount > 0 ? 'accent' : 'warn',
              timestamp: new Date().toISOString()
            })
          }, {
            source: 'character-sheet-add-credits',
            meta: { guardKey: 'character-sheet-add-credits' }
          });
          if (input) input.value = '';
          ui?.notifications?.info?.(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount).toLocaleString()} credits.`);
        } catch (err) {
          ui?.notifications?.error?.(`Failed to adjust credits: ${err.message}`);
        }
      }, { signal });
    });

    // Gain Force Point button
    html.querySelectorAll('[data-action="gain-force-point"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = this.actor.system?.forcePoints?.value ?? 0;
        const max = this.actor.system?.forcePoints?.max ?? 0;
        const newValue = Math.min(current + 1, max);

        const plan = {
          update: {
            "system.forcePoints.value": newValue
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Force Point restored!");
        } catch (err) {
          // console.error("Force Point restore failed:", err);
          ui?.notifications?.error?.(`Force Point restore failed: ${err.message}`);
        }
      }, { signal });
    });

    // Spend Force Point button
    html.querySelectorAll('[data-action="spend-force-point"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = this.actor.system?.forcePoints?.value ?? 0;
        const newValue = Math.max(0, current - 1);

        const plan = {
          update: {
            "system.forcePoints.value": newValue
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Force Point spent!");
        } catch (err) {
          // console.error("Force Point spend failed:", err);
          ui?.notifications?.error?.(`Force Point spend failed: ${err.message}`);
        }
      }, { signal });
    });

    // Set Condition Step button (delegated)
    html.addEventListener("click", async (event) => {
      const button = event.target.closest('[data-action="set-condition-step"]');
      if (!button) return;

      event.preventDefault();
      const step = parseInt(button.dataset.step, 10);
      if (isNaN(step) || step < 0 || step > 5) return;

      // No-op guard: skip if already at this step
      const current = this.actor?.system?.conditionTrack?.current ?? 0;
      if (step === current) return;

      addItemEditorTrace('condition-click', {
        actorId: this.actor?.id,
        from: current,
        to: step
      });

      try {
        addItemEditorTrace('condition-update-start', {
          actorId: this.actor?.id,
          step
        });
        // Route through the canonical helper — has its own no-op guard, uses
        // updateActor (which runs recalcAll then _refreshOpenActorApps), and
        // does NOT suppress the final corrective render.
        await ActorEngine.setConditionStep(this.actor, step, 'character-sheet-condition-button');
        addItemEditorTrace('recalc-finish', {
          actorId: this.actor?.id,
          step
        });
        addItemEditorTrace('post-recalc-render-requested', {
          actorId: this.actor?.id
        });
        ui?.notifications?.info?.("Condition updated!");
      } catch (err) {
        addItemEditorTrace('condition-update-failure', {
          actorId: this.actor?.id,
          step,
          error: String(err?.message)
        });
        emitHydrationError("CONDITION_BUTTON_MUTATION_FAILED", {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          error: err?.message,
          stack: err?.stack
        });
        ui?.notifications?.error?.('Condition update failed: ' + err.message);
      }
    }, { signal, capture: false });

    // Set dark side score button — authorization is recomputed fresh on
    // every click inside handleSetDarkSideScore; never trust the DOM's
    // disabled attribute or cached render context.
    html.querySelectorAll('[data-action="set-dark-side-score"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await handleSetDarkSideScore(this.actor, event.currentTarget?.dataset?.index, {
          sheetEditable: this.isEditable,
          user: game.user
        });
      }, { signal });
    });

    // Use extra skill button
    html.querySelectorAll('[data-action="execute-extra-skill-use"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const skillKey = button.dataset.skill;
        const useKey = button.dataset.useKey || button.dataset.key || button.dataset.use;
        const blocked = button.dataset.blocked === "true";
        const actionType = button.dataset.actionType || null;
        const sourceType = button.dataset.sourceType || null;
        const sourceLabel = button.dataset.sourceLabel || null;

        if (!skillKey) return;
        if (blocked) {
          ui?.notifications?.warn?.("This skill use is currently blocked.");
          return;
        }

        try {
          await this._runCanonicalExtraSkillUse(skillKey, useKey, {
            source: "skills-tab",
            actionType,
            sourceType,
            sourceLabel,
            sourceElement: button,
            companionSource: button,
            sheet: this,
            showRollCompanion: true
          });
        } catch (err) {
          // console.error("Failed to use extra skill:", err);
          ui?.notifications?.error?.(`Failed to use extra skill: ${err.message}`);
        }
      }, { signal });
    });
  }
  /* ============================================================
     PHASE 4: MOBILE INTERACTION ENHANCEMENTS
     Right-click replacements + touch feedback
  ============================================================ */

  _activateMobileActions(html, { signal } = {}) {
    // Only activate on mobile mode (safely check if MobileMode exists and is enabled)
    if (!MobileMode || !MobileMode.enabled) return;

    // Add toggle listener to all .item-actions-toggle buttons
    html.addEventListener("click", (event) => {
      const toggleBtn = event.target.closest(".item-actions-toggle");
      if (!toggleBtn) return;

      event.preventDefault();
      event.stopPropagation();

      // Find the parent row/card
      const row = toggleBtn.closest("[data-item-id]") ||
                  toggleBtn.closest(".item-row") ||
                  toggleBtn.closest(".skill-row") ||
                  toggleBtn.closest(".ability-row") ||
                  toggleBtn.closest("[data-action-container]");

      if (!row) {
        console.warn("[Mobile] Could not find parent row for actions toggle", toggleBtn);
        return;
      }

      // Toggle the show-actions class
      row.classList.toggle("show-mobile-actions");
    }, { signal, capture: false });

    // Close actions menu when clicking outside (sheet-scoped)
    html.addEventListener("click", (event) => {
      // Only close if NOT clicking inside an actions menu or toggle button
      if (event.target.closest(".mobile-actions-menu")) return;
      if (event.target.closest(".item-actions-toggle")) return;

      // Close all open actions menus in this sheet
      html.querySelectorAll(".show-mobile-actions").forEach(row => {
        row.classList.remove("show-mobile-actions");
      });
    }, { signal, capture: false });

    // Global close handler (prevent stuck-open menus across page)
    // Use document listener as fallback for clicks outside html element
    const globalClose = (event) => {
      // Don't close if clicking on action menu or toggle
      if (event.target.closest(".mobile-actions-menu")) return;
      if (event.target.closest(".item-actions-toggle")) return;

      // Close any open mobile actions in the sheet
      html.querySelectorAll(".show-mobile-actions").forEach(row => {
        row.classList.remove("show-mobile-actions");
      });
    };

    // Add global listener with signal-based cleanup (automatic teardown on rerender)
    document.addEventListener("click", globalClose, { capture: false, signal });
  }

  /* ============================================================
     MENTOR CONVERSATION
  ============================================================ */

  _openMentorConversation() {
    const actor = this.actor;
    new MentorChatDialog(actor).render(true);
  }

  /* ============================================================
     PHASE 7: SKILL FALLBACK HELPERS
  ============================================================ */

  /**
   * PHASE 7: Build skill total fallback (transitional rescue only)
   *
   * This should NEVER be the main path — DerivedCalculator is authoritative.
   * Only called if derived.skills[key].total is missing/invalid.
   * Logs warning when fallback is needed (indicates upstream failure).
   *
   * @param {number} abilityMod - Ability modifier from abilities
   * @param {number} halfLevel - Half character level
   * @param {number} miscMod - Misc modifiers from stored skill data
   * @param {Object} skillData - Stored skill data (trained, focused)
   * @returns {number} Fallback computed total
   */
  /**
   * PHASE 10: LEGACY RESCUE ONLY — DO NOT CALL FROM HAPPY PATH
   *
   * Skill total fallback (removed from _prepareContext in Phase 10)
   * Kept for potential emergency use with legacy/corrupted actors only.
   * If this is called, it indicates DerivedCalculator failed to compute.
   *
   * @deprecated Not called from happy path. Use only in explicit error recovery.
   */
  _buildSkillFallbackTotal(abilityMod, halfLevel, miscMod, skillData) {
    swseLogger.error(`[Phase 10] LEGACY FALLBACK: Skill total rebuild used — derived.skills[].total missing!`, {
      abilityMod,
      halfLevel,
      miscMod,
      trained: skillData.trained,
      focused: skillData.focused,
      warning: 'This indicates DerivedCalculator did not properly compute skill totals'
    });

    // PHASE 8: Emit contract observability warning
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      warnSheetFallback(
        'Skills',
        'LEGACY FALLBACK: skill total rebuilt (should not happen in Phase 10+)',
        { abilityMod, halfLevel, miscMod, skillTrained: skillData.trained },
        this.actor.name
      );
    }

    const trainingBonus = skillData.trained ? 5 : 0;
    const focusBonus = skillData.focused ? 5 : 0;
    return abilityMod + halfLevel + miscMod + trainingBonus + focusBonus;
  }

  /**
   * PHASE 10: LEGACY RESCUE ONLY — DO NOT CALL FROM HAPPY PATH
   *
   * Build attacks from equipped weapons (removed from _prepareContext in Phase 10)
   * Kept only for emergency legacy/corrupted actor recovery.
   * Character-actor.js.mirrorAttacks() should be the authoritative source.
   *
   * If this is called, it indicates DerivedCalculator failed to populate derived.attacks.list.
   *
   * @deprecated Not called from happy path. Use only in explicit error recovery.
   * @param {Actor} actor - The character actor
   * @returns {Array} Array of basic attack objects from equipped weapons
   */
  _buildAttacksFallback(actor, options = {}) {
    const truthy = (value) => {
      if (value === true || Number(value) === 1) return true;
      if (value && typeof value === 'object') return truthy(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
      return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active', 'activated', 'natural'].includes(String(value || '').toLowerCase());
    };
    const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
    const normalizeDamageFormula = (value, fallback = '1d6') => {
      let candidate = value;
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        candidate = firstDefined(candidate.formula, candidate.value, candidate.base, candidate.dice, candidate.roll, candidate.primary);
      }
      return candidate !== undefined && candidate !== null && candidate !== '' ? String(candidate) : fallback;
    };
    const hasWeaponDamageProfile = (item) => {
      const system = item?.system ?? {};
      return firstDefined(system.damage, system.damageFormula, system.damageRoll, system.formula, system.weapon?.damage, system.attack?.damage, system.rolls?.damage) !== undefined;
    };
    const isAttackItem = (item) => {
      if (!item) return false;
      if (['weapon', 'lightsaber'].includes(item.type)) return true;
      if (!hasWeaponDamageProfile(item)) return false;
      const system = item.system ?? {};
      const text = [item.type, item.name, system.type, system.itemType, system.category, system.itemCategory, system.equipmentType, system.weaponType, system.weaponCategory, system.weaponGroup, system.group, system.subtype]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return /weapon|lightsaber|blaster|rifle|pistol|melee|ranged|thrown|grenade|simple|advanced|heavy/.test(text);
    };
    const isEquipped = (item) => {
      const system = item?.system ?? {};
      return truthy(system.equipped)
        || truthy(system.isEquipped)
        || truthy(system.equipStatus)
        || truthy(system.status)
        || truthy(system.state)
        || truthy(system.active)
        || truthy(system.readied)
        || truthy(system.equippable?.equipped)
        || truthy(system.equippable?.active)
        || truthy(system.activation?.active)
        || truthy(item?.flags?.swse?.equipped)
        || isAutoEquippedNaturalWeaponForCombat(item, truthy)
        || isIntegratedDroidAttackItem(item, actor, truthy);
    };

    const actorItems = Array.from(actor?.items ?? []);
    const byId = new Map(actorItems.map((item) => [item.id, item]));
    const equippedWeapons = new Map();

    for (const item of actorItems) {
      if (isAttackItem(item) && isEquipped(item)) equippedWeapons.set(item.id, item);
    }

    const inventoryWeaponRows = Array.isArray(options?.inventoryPanel?.grouped?.Weapons)
      ? options.inventoryPanel.grouped.Weapons
      : [];
    for (const row of inventoryWeaponRows) {
      if (row?.equipped !== true || !row?.id) continue;
      const item = byId.get(row.id);
      if (item && isAttackItem(item)) equippedWeapons.set(item.id, item);
    }

    swseLogger.debug(`[Attacks] Display rescue rebuild used because derived.attacks.list is not ready.`, {
      actor: actor.name,
      equippedWeapons: equippedWeapons.size,
      warning: 'This indicates DerivedCalculator did not properly compute attacks'
    });

    // PHASE 8: Emit contract observability warning
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      warnSheetFallback(
        'Attacks',
        'LEGACY FALLBACK: attack list rebuilt (should not happen in Phase 10+)',
        { reason: 'derived.attacks.list was empty or missing' },
        actor.name
      );
    }

    const babValue = actor.system?.derived?.bab;
    const baseAttackBonus = Number(
      typeof babValue === 'object' ? (babValue.total ?? babValue.value ?? 0) :
      (babValue ?? actor.system?.baseAttackBonus ?? actor.system?.bab ?? 0)
    ) || 0;

    return Array.from(equippedWeapons.values()).map(weapon => {
      const system = weapon.system ?? {};
      const itemAttackBonus = Number(firstDefined(system.attackTotal, system.attackBonus, system.toHit, 0)) || 0;
      const weaponType = firstDefined(system.weaponType, system.weaponCategory, system.weaponGroup, system.category, weapon.type, 'weapon');
      return {
        id: `attack-${weapon.id}`,
        name: weapon.name,
        sourceType: 'weapon',
        sourceId: weapon.id,
        weaponId: weapon.id,
        itemId: weapon.id,
        weaponName: weapon.name,
        weaponType,
        type: weaponType,
        attackBonus: itemAttackBonus + baseAttackBonus,
        attackTotal: itemAttackBonus + baseAttackBonus,
        attackAttribute: system.attackAttribute ?? 'str',
        damageFormula: normalizeDamageFormula(firstDefined(system.damageFormula, system.damage, system.damageRoll, system.formula, system.weapon?.damage, system.attack?.damage, system.rolls?.damage)),
        damageBonus: system.damageBonus ?? '',
        critRange: firstDefined(system.critRange, system.criticalRange, system.weapon?.critRange, '20'),
        critMult: firstDefined(system.critMult, system.criticalMultiplier, system.weapon?.critMult, 'x2'),
        range: firstDefined(system.rangeFormatted, typeof system.range === 'string' ? system.range : system.range?.value, system.range?.label, system.weapon?.range, 'Melee'),
        tags: Array.isArray(system.tags) ? system.tags : Array.isArray(system.properties) ? system.properties : [],
        weaponProperties: Array.isArray(system.weaponProperties) ? system.weaponProperties : Array.isArray(system.properties) ? system.properties : [],
        breakdown: {
          attack: system.attackBreakdown ?? [],
          damage: system.damageBreakdown ?? [],
          conditional: []
        }
      };
    });
  }


  /* ============================================================
     PHASE 10: SKILL USE HELPERS
  ============================================================ */

  /**
   * Map action economy time value to CSS class for visual styling
   * @param {string|null} timeValue - The time field from extra skill use
   * @returns {string} CSS class name
   */
  _getTimeClass(timeValue) {
    if (!timeValue) return 'time--unknown';

    const normalized = String(timeValue).toLowerCase().trim();

    // Map common action economy designations
    if (normalized.includes('swift')) return 'time--swift';
    if (normalized.includes('move')) return 'time--move';
    if (normalized.includes('standard')) return 'time--standard';
    if (normalized.includes('full')) return 'time--full';
    if (normalized.includes('free')) return 'time--free';
    if (normalized.includes('reaction')) return 'time--reaction';
    if (normalized.includes('round')) return 'time--full';

    return 'time--unknown';
  }

  /**
   * Map action economy time value to human-readable label
   * @param {string|null} timeValue - The time field from extra skill use
   * @returns {string} Human-readable label with icon
   */
  _getTimeLabel(timeValue) {
    if (!timeValue) return '—';

    const normalized = String(timeValue).toLowerCase().trim();

    // Map to readable labels with icons
    if (normalized.includes('swift')) return '⚡ Swift';
    if (normalized.includes('move')) return '▶ Move';
    if (normalized.includes('standard')) return '⬤ Standard';
    if (normalized.includes('full') || normalized.includes('round')) return '⟲ Full Round';
    if (normalized.includes('free')) return '∞ Free';
    if (normalized.includes('reaction')) return '↩ Reaction';

    // Return as-is if not matched
    return timeValue;
  }

  /**
   * Classify the action type of a skill use for UI clarity
   * @param {Object} use - The skill use object
   * @returns {string} Action type: 'check', 'opposed', 'use', 'roll', 'reference', or 'unknown'
   */
  _classifyActionType(use) {
    const label = String(use.label || '').toLowerCase();
    const dc = String(use.dc || '').toLowerCase();
    const effect = String(use.effect || '').toLowerCase();
    const time = String(use.time || '').toLowerCase();

    // Opposed checks: explicitly stated as opposed
    if (dc.includes('opposed')) return 'opposed';
    if (label.includes('feint') || label.includes('deception')) return 'opposed';

    // Combat actions: combat terminology
    if (label.includes('attack') || label.includes('feint') || label.includes('dodge') || label.includes('parry')) return 'roll';
    if (effect.includes('attack') || effect.includes('damage')) return 'roll';

    // Uses/invocations: applying an effect
    if (label.includes('use') || label.includes('apply') || label.includes('activate')) return 'use';
    if (effect.includes('gain') || effect.includes('apply')) return 'use';

    // Rolls/checks: skill rolls with DC
    if (dc && !dc.includes('none') && !dc.includes('n/a')) return 'check';
    if (effect.includes('check') || effect.includes('roll')) return 'check';

    // Reference/informational: no action needed
    if (label.includes('reference') || label.includes('information') || label.includes('know')) return 'reference';
    if (time.includes('none') || time.includes('n/a') || time.includes('instant')) return 'reference';

    return 'check'; // Default to check
  }

  /**
   * Get human-readable label for action type
   * @param {Object} use - The skill use object
   * @returns {Object} { type: string, label: string, icon: string }
   */
  _getActionTypeLabel(use) {
    const type = this._classifyActionType(use);
    const map = {
      'check': { label: 'Check', icon: '🎲', action: 'check' },
      'opposed': { label: 'Opposed', icon: '⚔', action: 'opposed' },
      'roll': { label: 'Roll', icon: '🎲', action: 'roll' },
      'use': { label: 'Use', icon: '✓', action: 'use' },
      'reference': { label: 'Info', icon: 'ℹ', action: 'reference' },
      'unknown': { label: 'Action', icon: '→', action: 'unknown' }
    };
    return map[type] || map['unknown'];
  }

  /**
   * Categorize a skill use for grouped display
   * Derives display grouping based on metadata signals
   * @param {Object} use - The skill use object
   * @param {string} skillKey - The skill key
   * @returns {string} Category: 'Core', 'Combat', 'Social', 'Utility', or 'Special'
   */
  _categorizeSkillUse(use, skillKey) {
    const label = (use.label || '').toLowerCase();
    const effect = (use.effect || '').toLowerCase();
    const time = (use.time || '').toLowerCase();

    // Combat-specific uses
    const combatSkills = ['gatherInformation', 'deception', 'persuasion', 'endurance', 'acrobatics'];
    const combatTerms = ['feint', 'dodge', 'parry', 'attack', 'defend', 'distract', 'demoralize', 'intimidate'];
    if (combatSkills.includes(skillKey) && combatTerms.some(t => label.includes(t) || effect.includes(t))) {
      return 'Combat';
    }
    if (label.includes('feint') || label.includes('dodge') || label.includes('parry')) {
      return 'Combat';
    }
    if (effect.includes('attack') || effect.includes('defend') || effect.includes('flat-footed')) {
      return 'Combat';
    }

    // Social uses
    const socialSkills = ['persuasion', 'deception', 'gatherInformation'];
    const socialTerms = ['persuade', 'bargain', 'bribe', 'intimidate', 'deception', 'deceptive', 'innuendo', 'haggle'];
    if (socialSkills.includes(skillKey) && socialTerms.some(t => label.includes(t) || effect.includes(t))) {
      return 'Social';
    }

    // Special uses with explicit markers
    if (label.includes('(trained)') || use.trainedOnly) {
      return 'Special';
    }
    if (label.includes('(feat)') || label.includes('(talent)') || label.includes('(class)')) {
      return 'Special';
    }

    // Check if it's a core/fundamental use (no special conditions)
    // Core uses don't have "trained only", don't require special setup
    if (!use.trainedOnly && !label.includes('(trained)') && !label.includes('(feat)')) {
      return 'Core';
    }

    // Default to utility for everything else
    return 'Utility';
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

  /* ============================================================
     PHASE C/E/F/H: CANONICAL INVOCATION + ACTION ECONOMY WRAPPERS
  ============================================================ */

  async _runCanonicalInitiative(mode = "roll", options = {}) {
    if (mode === "take10") {
      try {
        return await CombatExecutor.executeInitiative(this.actor, { mode: "take10", ...options });
      } catch (err) {
        console.warn("[PHASE C] CombatExecutor.executeInitiative take10 path failed, falling back once:", err);
        if (typeof this.actor.swseTake10Initiative === "function") {
          return await this.actor.swseTake10Initiative();
        }
        throw err;
      }
    }

    let rollOptions = { ...options };
    if (options?.showDialog !== false && options?.skipModifierDialog !== true) {
      const modResult = await showRollModifiersDialog({
        title: 'Roll Initiative',
        rollType: 'initiative',
        actor: this.actor,
        showCover: false,
        showConcealment: false,
        showForcePoint: true,
        sourceElement: options?.sourceElement ?? null,
        companionSource: options?.companionSource ?? options?.sourceElement ?? null,
        sheet: this
      });
      if (modResult === null) return null;
      rollOptions = {
        ...rollOptions,
        ...modResult,
        useForce: modResult.useForcePoint === true
      };
    }

    return await CombatExecutor.executeInitiative(this.actor, { mode: "roll", ...rollOptions });
  }

  async _runCanonicalSkillCheck(skillKey, options = {}) {
    return await rollSkillCheck(this.actor, skillKey, options);
  }

  async _runCanonicalExtraSkillUse(skillKey, useKey, options = {}) {
    if (!skillKey) return null;

    const uses = await ExtraSkillUseRegistry.getForSkill(skillKey, { actor: this.actor });
    const selectedUse = uses.find(u => u.key === useKey) ?? uses[0] ?? null;
    if (!selectedUse) {
      ui?.notifications?.warn?.(`No extra skill uses found for ${skillKey}`);
      return null;
    }

    const trainedOnly = selectedUse.trainedOnly === true;
    const trained = this.actor?.system?.skills?.[skillKey]?.trained === true;
    if (trainedOnly && !trained) {
      ui?.notifications?.warn?.(`${selectedUse.label ?? selectedUse.name ?? "This use"} requires training.`);
      return null;
    }

    const payload = {
      ...options,
      skillUse: selectedUse,
      useKey: selectedUse.key ?? useKey,
      actionType: options?.actionType ?? selectedUse.actionType ?? null,
      sourceType: options?.sourceType ?? selectedUse.sourceType ?? null,
      sourceLabel: options?.sourceLabel ?? selectedUse.sourceLabel ?? null
    };

    if (options?.skipModifierDialog !== true && options?.showDialog !== false) {
      const rollSkillKey = SkillUseFilter.getSkillKeyForApplication?.(selectedUse) || skillKey;
      const rawSkill = this.actor?.system?.skills?.[rollSkillKey] ?? {};
      const derivedSkills = this.actor?.system?.derived?.skills;
      const derivedSkill = Array.isArray(derivedSkills?.list)
        ? derivedSkills.list.find((row) => row?.key === rollSkillKey)
        : derivedSkills?.[rollSkillKey];
      const configSkill = CONFIG?.SWSE?.skills?.[rollSkillKey] ?? {};
      const skillLabel = derivedSkill?.label
        ?? rawSkill?.label
        ?? configSkill?.label
        ?? configSkill?.name
        ?? String(rollSkillKey || skillKey).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[\-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const useLabel = selectedUse?.label ?? selectedUse?.name ?? selectedUse?.application ?? payload.sourceLabel ?? 'Skill Use';

      const modResult = await showRollModifiersDialog({
        title: `${useLabel} (${skillLabel})`,
        rollType: 'skill',
        actor: this.actor,
        skillKey: rollSkillKey,
        abilityKey: derivedSkill?.ability ?? derivedSkill?.selectedAbility ?? rawSkill?.selectedAbility ?? rawSkill?.ability ?? configSkill?.ability,
        sourceElement: options?.sourceElement ?? null,
        sheet: this
      });

      if (modResult === null) return null;

      Object.assign(payload, {
        ...modResult,
        customModifier: Number(modResult.customModifier || 0),
        useForcePoint: modResult.useForcePoint === true,
        sourceElement: options?.sourceElement ?? modResult.sourceElement ?? null,
        companionSource: options?.companionSource ?? options?.sourceElement ?? modResult.sourceElement ?? null,
        sheet: options?.sheet ?? this,
        showRollCompanion: options?.showRollCompanion !== false
      });
    }

    if (typeof SkillUseFilter?.rollSkillUseApplication === "function") {
      return await SkillUseFilter.rollSkillUseApplication(this.actor, selectedUse, payload);
    }

    return await rollSkillCheck(this.actor, skillKey, payload);
  }

  _resolveSheetCombatActionData(actionId, element = null) {
    const key = String(actionId || '');
    const actorActions = this.actor?.getFlag?.(game.system.id, "combatActions") ?? {};
    const fromFlag = actorActions[key];
    const fromSheet = this._combatActionLookup?.[key];
    const row = element?.closest?.('[data-action-key], .swse-concept-action-row, .combat-action-row');
    const fromDataset = row ? {
      key,
      name: row.querySelector?.('.swse-concept-action-row__copy strong, .action-name')?.textContent?.trim?.() || key,
      actionType: row.dataset.actionType || element?.dataset?.actionType || 'standard',
      type: row.dataset.actionType || element?.dataset?.actionType || 'standard',
      notes: row.querySelector?.('small, .action-notes')?.textContent?.trim?.() || ''
    } : null;

    return {
      ...(fromDataset || {}),
      ...(fromSheet || {}),
      ...(fromFlag || {})
    };
  }

  _createCombatWorkflowHandlers(options = {}) {
    const routeLegacy = async (context) => this._runCanonicalCombatAction(context?.action?.id ?? context?.actionId, context?.action ?? {}, {
      ...options,
      __combatWorkflowRouted: true,
      combatContext: context,
      actionRecord: context?.action ?? null
    });

    return {
      fullAttack: async (context) => this._executeFullAttackCombatWorkflow(context, options),
      manual: async (context) => this._executeManualCombatWorkflow(context, options),
      reference: async (context) => this._executeManualCombatWorkflow(context, options),
      skillAction: async (context) => this._executeSkillActionCombatWorkflow(context, options),
      attack: routeLegacy,
      combatState: routeLegacy,
      secondWind: routeLegacy,
      grapple: async (context) => this._executeGrappleCombatWorkflow(context, options),
      aidAnother: routeLegacy,
      ammoReload: async (context) => this._executeReloadCombatWorkflow(context, options),
      actorItem: routeLegacy,
      reaction: routeLegacy,
      legacy: routeLegacy
    };
  }

  _resolveCombatWorkflowTargetActor(context = {}, options = {}) {
    const direct = options?.target?.actor ?? options?.target ?? context?.target?.actor ?? context?.target ?? null;
    if (direct?.type) return direct;

    const targetId = context?.targetId
      ?? context?.target?.id
      ?? context?.attack?.targetId
      ?? context?.damage?.targetId
      ?? context?.ruleData?.targetId
      ?? null;
    if (targetId) {
      const byActor = game?.actors?.get?.(targetId);
      if (byActor) return byActor;
      const byToken = canvas?.tokens?.placeables?.find?.(token =>
        token?.id === targetId || token?.document?.id === targetId || token?.actor?.id === targetId
      );
      if (byToken?.actor) return byToken.actor;
    }

    try {
      const targets = Array.from(game?.user?.targets ?? []);
      if (targets.length === 1) return targets[0]?.actor ?? null;
      if (targets.length > 1) {
        ui?.notifications?.warn?.('Select only one target for this grapple action.');
        return null;
      }
    } catch (_err) {
      // Canvas may be unavailable outside a scene; fall through to null.
    }

    return null;
  }

  async _executeGrappleCombatWorkflow(context = {}, options = {}) {
    const actionData = context?.action ?? {};
    const actionId = actionData?.id ?? context?.actionId ?? 'grapple';
    const target = this._resolveCombatWorkflowTargetActor(context, options);

    if (!target) {
      ui?.notifications?.warn?.('Target one creature before using a grapple action.');
      return null;
    }

    const actorId = this.actor?.id ?? this.actor?._id ?? null;
    const targetId = target?.id ?? target?._id ?? null;
    if (actorId && targetId && actorId === targetId) {
      ui?.notifications?.warn?.('A creature cannot grapple itself.');
      return null;
    }

    const mode = String(actionData?.ruleData?.grappleMode ?? '').trim().toLowerCase();
    const legality = mode === 'release' || mode === 'escape'
      ? GrappleLegalityEngine.validateTargetPair(this.actor, target)
      : mode && mode !== 'grab'
        ? GrappleLegalityEngine.validateExistingGrapple(this.actor, target, { ruleData: actionData?.ruleData ?? {} })
        : GrappleLegalityEngine.validateInitiate(this.actor, target, { ruleData: actionData?.ruleData ?? {} });
    if (!await GrappleLegalityEngine.confirm(legality, { actionName: actionData?.name ?? actionId })) return null;

    const actionType = this._deriveCombatActionEconomyType(actionData);
    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? context?.source?.invocation ?? 'grapple',
        actionId,
        actionName: actionData?.name ?? actionId,
        combatContext: context
      });
      if (!allowed) return null;
    }

    const nameText = String(`${actionId} ${actionData?.name ?? ''} ${actionData?.ruleData?.grappleMode ?? ''}`).toLowerCase();
    const workflowOptions = {
      ...options,
      target,
      actionId,
      combatContext: context,
      workflowContext: context,
      ruleData: actionData?.ruleData ?? {},
      grabPenalty: actionData?.ruleData?.grabAttackPenalty,
      maxTargetSizeDelta: actionData?.ruleData?.maxTargetSizeDelta,
      requiresReach: actionData?.ruleData?.requiresReach,
      requiresFreeLimb: actionData?.ruleData?.requiresFreeLimb,
      escapeMode: actionData?.ruleData?.escapeMode ?? options?.escapeMode ?? null,
      promptEscapeMode: actionData?.ruleData?.promptEscapeMode ?? true,
      skipLegalityConfirm: true
    };

    if (nameText.includes('release')) return await SWSEGrappling.releaseGrapple(this.actor, target, workflowOptions);
    if (nameText.includes('escape')) return await SWSEGrappling.escapeGrapple(this.actor, target, workflowOptions);
    if (nameText.includes('crush')) return await SWSEGrappling.crushPinnedOpponent(this.actor, target, workflowOptions);
    if (nameText.includes('throw')) return await SWSEGrappling.throwGrappledOpponent(this.actor, target, workflowOptions);
    if (nameText.includes('trip')) return await SWSEGrappling.tripGrappledOpponent(this.actor, target, workflowOptions);
    if (nameText.includes('pin')) return await SWSEGrappling.attemptPin(this.actor, target, workflowOptions);
    if (nameText.includes('check') || nameText.includes('opposed')) return await SWSEGrappling.grappleCheck(this.actor, target, workflowOptions);
    return await SWSEGrappling.attemptGrab(this.actor, target, workflowOptions);
  }

  async _executeFullAttackCombatWorkflow(context = {}, options = {}) {
    const actionData = context?.action ?? {};
    const actionId = actionData?.id ?? context?.actionId ?? 'full-attack';
    const grappleActionAllowed = await GrappleStateEngine.confirmAction(this.actor, { ...actionData, id: actionId, key: actionId, resolutionMode: 'fullAttack' }, { title: 'Confirm Full Attack' });
    if (!grappleActionAllowed) return null;
    const pkgFromId = {
      'double-attack':       FULL_ATTACK_PACKAGES.DOUBLE_ATTACK,
      'triple-attack':       FULL_ATTACK_PACKAGES.TRIPLE_ATTACK,
      'two-weapon-fighting': FULL_ATTACK_PACKAGES.TWO_WEAPON,
      'double-weapon-attack':FULL_ATTACK_PACKAGES.DOUBLE_WEAPON,
    };
    const requestedPackage =
      actionData?.ruleData?.requestedPackage ??
      pkgFromId[actionId] ??
      FULL_ATTACK_PACKAGES.NORMAL;
    const actionCostOverride = actionData?.cost ?? actionData?.actionCost ?? null;
    return await FullAttackExecutor.execute(this.actor, {
      requestedPackage,
      actionCostOverride,
      actionId,
      actionName: actionData?.name ?? actionId,
      actionData,
      combatContext: context,
      source: options?.source ?? context?.source?.invocation ?? "full-attack",
      sourceElement: options?.sourceElement ?? context?.source?.element ?? null,
      sheet: this
    });
  }

  async _executeManualCombatWorkflow(context = {}, options = {}) {
    const actionData = context?.action ?? {};
    const actionId = actionData?.id ?? context?.actionId ?? 'manual-combat-action';
    const actionType = this._deriveCombatActionEconomyType(actionData);
    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? context?.source?.invocation ?? "ability-combat-action",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? null,
        sourceType: actionData?.sourceType ?? null,
        combatContext: context
      });
      if (!allowed) return null;
    }

    return await this._announceManualCombatAction(actionId, actionData, {
      ...options,
      combatContext: context,
      actionType
    });
  }


  async _executeReloadCombatWorkflow(context = {}, options = {}) {
    const actionData = context?.action ?? {};
    const actionId = actionData?.id ?? context?.actionId ?? 'reload';

    if (!AmmoSystem.isTrackingEnabled()) {
      ui?.notifications?.info?.('Ammunition tracking is disabled; reload does not need to be resolved.');
      return { skipped: true, reason: 'ammo-tracking-disabled', actionId };
    }

    const weaponId = actionData?.weaponId ?? actionData?.itemId ?? context?.weaponId ?? null;
    let weapon = weaponId ? (this.actor.items.get(weaponId) ?? null) : null;
    if (!weapon) {
      weapon = this.actor.items.find(i =>
        ['weapon', 'lightsaber'].includes(i.type) && i.system?.equipped && AmmoSystem.weaponUsesAmmunition(i)
      ) ?? null;
    }

    if (!weapon) {
      ui?.notifications?.warn?.('No reloadable equipped weapon found.');
      return null;
    }

    if (!AmmoSystem.weaponUsesAmmunition(weapon)) {
      ui?.notifications?.warn?.(`${weapon.name} does not use tracked ammunition.`);
      return null;
    }

    const currentAmmo = Number(weapon.system?.ammunition?.current ?? 0) || 0;
    const maxAmmo = Number(weapon.system?.ammunition?.max ?? 0) || 0;
    if (maxAmmo <= 0 || currentAmmo >= maxAmmo) {
      ui?.notifications?.info?.(`${weapon.name} is already fully loaded.`);
      return { skipped: true, reason: 'already-full', weaponId: weapon.id };
    }

    const actionType = this._deriveCombatActionEconomyType(actionData);
    const allowed = await this._applyActionEconomy(actionType, {
      source: options?.source ?? context?.source?.invocation ?? 'reload',
      actionId,
      actionName: actionData?.name ?? 'Reload',
      combatContext: context
    });
    if (!allowed) return null;

    const result = await AmmoSystem.reloadWeapon(this.actor, weapon);
    if (result?.success === false) {
      ui?.notifications?.error?.(result.message || 'Reload failed.');
      return null;
    }

    ui?.notifications?.info?.(result.message || `${weapon.name} reloaded.`);
    try {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `<section class="swse-chat-card"><header><strong>${this.actor.name} reloads ${weapon.name}</strong></header><p>${result.message ?? 'Weapon reloaded.'}</p></section>`,
        flags: { swse: { combatAction: 'reload', weaponId: weapon.id, workflowContext: context } }
      });
    } catch (err) {
      console.warn('[SWSE] Failed to post reload chat card:', err);
    }
    return result;
  }

  async _executeSkillActionCombatWorkflow(context = {}, options = {}) {
    const actionData = context?.action ?? {};
    const actionId = actionData?.id ?? context?.actionId ?? 'skill-combat-action';
    const skillKey = this._resolveCombatActionSkillKey(actionData);
    if (!skillKey) {
      return await this._runCanonicalCombatAction(actionId, actionData, {
        ...options,
        __combatWorkflowRouted: true,
        combatContext: context,
        actionRecord: actionData
      });
    }

    const modResult = await showRollModifiersDialog({
      title: `${actionData?.name ?? actionId} — ${this._labelSkillKey(skillKey)}`,
      rollType: skillKey === 'useTheForce' ? 'force' : 'skill',
      actor: this.actor,
      skillKey,
      sourceElement: options?.sourceElement ?? context?.source?.element ?? null,
      sheet: this,
      showCover: false,
      showConcealment: false
    });
    if (modResult === null) return null;

    const actionType = this._deriveCombatActionEconomyType(actionData);
    const allowed = await this._applyActionEconomy(actionType, {
      source: options?.source ?? context?.source?.invocation ?? "combat-action",
      actionId,
      actionName: actionData?.name ?? actionId,
      skillKey,
      combatContext: context
    });
    if (!allowed) return null;

    const dc = this._extractCombatActionDc(actionData);
    return await rollSkillCheck(this.actor, skillKey, {
      ...modResult,
      dc,
      actionId,
      actionData,
      combatContext: context,
      source: options?.source ?? context?.source?.invocation ?? "combat-action",
      sourceElement: options?.sourceElement ?? context?.source?.element ?? null,
      companionSource: options?.sourceElement ?? context?.source?.element ?? null,
      sheet: this,
      showRollCompanion: true
    });
  }

  async _runCanonicalCombatAction(actionId, actionData = {}, options = {}) {
    // Phase 1B: route combat actions through the thin workflow registry first.
    // The registry owns normalization/context preservation, while this sheet
    // method remains the legacy execution adapter for existing authorities.
    if (options?.__combatWorkflowRouted !== true) {
      const registry = CombatWorkflowRegistry.getDefault();
      const result = await registry.execute({
        actor: this.actor,
        actionId,
        actionData,
        options,
        sheet: this,
        handlers: this._createCombatWorkflowHandlers(options)
      });
      if (result?.cancelled === true) return null;
      return result?.payload ?? result;
    }

    if (options?.combatContext) {
      actionData = {
        ...actionData,
        workflowContext: options.combatContext
      };
    }

    const grappleActionAllowed = await GrappleStateEngine.confirmAction(this.actor, { ...actionData, id: actionId, key: actionId }, { title: 'Confirm Grapple-Limited Action' });
    if (!grappleActionAllowed) return null;

    if (this._isAimCombatAction(actionId, actionData)) {
      return await this._executeAimCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'guardianSpirit' || actionData?.guardianSpiritAction) {
      return await this._executeGuardianSpiritCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'forceTalent' || actionData?.forceTalentAction || actionData?.ruleData?.forceTalentAction) {
      return await this._executeForceTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'consularTalent' || actionData?.consularTalentAction || actionData?.ruleData?.consularTalentAction) {
      return await this._executeConsularTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'sentinelTalent' || actionData?.sentinelTalentAction || actionData?.ruleData?.sentinelTalentAction) {
      return await this._executeSentinelTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'lightsaberTalent' || actionData?.lightsaberTalentAction || actionData?.ruleData?.lightsaberTalentAction) {
      return await this._executeLightsaberTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'jediPrestigeTalent' || actionData?.jediPrestigeTalentAction || actionData?.ruleData?.jediPrestigeTalentAction) {
      return await this._executeJediPrestigeTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'sithTalent' || actionData?.sithTalentAction || actionData?.ruleData?.sithTalentAction) {
      return await this._executeSithTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'forceAdeptTalent' || actionData?.forceAdeptTalentAction || actionData?.ruleData?.forceAdeptTalentAction) {
      return await this._executeForceAdeptTalentCombatAction(actionId, actionData, options);
    }

    if (actionData?.resolutionMode === 'armorTalent' || actionData?.armorTalentAction || actionData?.ruleData?.armorTalentAction) {
      return await this._executeArmorTalentCombatAction(actionId, actionData, options);
    }

    // --- Manual/reference ability action cards ---
    // Multi-action feats/talents often unlock named actions whose real effect
    // still needs table or future engine resolution. Surface and track the
    // correct action economy without pretending a passive modifier or single
    // generic attack fully resolves the canon text.
    // --- Full Attack routing ---
    if (actionData?.resolutionMode === 'fullAttack') {
      const pkgFromId = {
        'double-attack':       FULL_ATTACK_PACKAGES.DOUBLE_ATTACK,
        'triple-attack':       FULL_ATTACK_PACKAGES.TRIPLE_ATTACK,
        'two-weapon-fighting': FULL_ATTACK_PACKAGES.TWO_WEAPON,
        'double-weapon-attack':FULL_ATTACK_PACKAGES.DOUBLE_WEAPON,
      };
      const requestedPackage =
        actionData?.ruleData?.requestedPackage ??
        pkgFromId[actionId] ??
        FULL_ATTACK_PACKAGES.NORMAL;
      const actionCostOverride = actionData?.cost ?? actionData?.actionCost ?? null;
      return await FullAttackExecutor.execute(this.actor, {
        requestedPackage,
        actionCostOverride,
        actionId,
        actionData,
        source: options?.source ?? "full-attack",
        sourceElement: options?.sourceElement ?? null,
        sheet: this,
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null,
        actionRecord: options?.actionRecord ?? actionData ?? null
      });
    }

    if (actionData?.manualResolution === true || actionData?.resolutionMode === 'manual' || actionData?.resolutionMode === 'reference') {
      const actionType = this._deriveCombatActionEconomyType(actionData);
      if (actionData?.spendAction !== false) {
        const allowed = await this._applyActionEconomy(actionType, {
          source: options?.source ?? "ability-combat-action",
          actionId,
          actionName: actionData?.name ?? actionId,
          sourceName: actionData?.sourceName ?? null,
          sourceType: actionData?.sourceType ?? null
        });
        if (!allowed) return null;
      }

      return await this._announceManualCombatAction(actionId, actionData, {
        ...options,
        actionType
      });
    }

    // --- Attack routing via Roll Configurator V2 ---
    // Show the preroller FIRST so cancelling never spends the combat action.
    const weaponId = actionData?.weaponId ?? actionData?.itemId ?? null;
    const isAttackAction = actionData?.isAttack === true
      || actionData?.domain === 'attack'
      || String(actionData?.category ?? '').toLowerCase() === 'attack'
      || this._combatActionLooksLikeAttack(actionData)
      || Boolean(weaponId);

    if (isAttackAction) {
      // 1. Resolve weapon: direct ID → equipped weapon/lightsaber → virtual unarmed fallback
      let weapon = weaponId ? (this.actor.items.get(weaponId) ?? null) : null;
      if (!weapon) {
        weapon = this.actor.items.find(i =>
          ['weapon', 'lightsaber'].includes(i.type)
          && (i.system?.equipped || isIntegratedDroidAttackItem(i, this.actor))
        ) ?? null;
      }
      if (!weapon) {
        weapon = buildVirtualUnarmedWeapon(this.actor);
      }

      // 2. Show preroller — do NOT spend economy until user confirms
      const modResult = await showRollModifiersDialog({
        title: weapon?.name ? `${weapon.name} Attack` : 'Attack',
        rollType: 'attack',
        actor: this.actor,
        weapon,
        sourceElement: options?.sourceElement ?? null,
        sheet: this
      });
      if (modResult === null) return null; // Cancelled — economy untouched

      // 3. Preflight ammunition before action economy is spent. The roll path
      // performs the actual spend/rollback through AmmoSystem.
      const workflowForAmmo = options?.combatContext ?? actionData?.workflowContext ?? null;
      const ammoCost = AmmoSystem.resolveAmmoCost({
        weapon,
        workflowContext: workflowForAmmo,
        options: { ...modResult, actionData, actionId }
      });
      const ammoCheck = AmmoSystem.preflightAmmunition(this.actor, weapon, ammoCost, { ...modResult, actionData, actionId });
      if (ammoCheck?.ok === false) {
        ui?.notifications?.error?.(ammoCheck.message || `${weapon.name} does not have enough ammunition.`);
        return null;
      }

      // 4. Now spend the economy
      const attackEconomyType = this._deriveCombatActionEconomyType(actionData);
      const allowed = await this._applyActionEconomy(attackEconomyType, {
        source: options?.source ?? "combat-action",
        actionId,
        actionName: actionData?.name ?? actionId,
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;

      // 5. Roll
      return await SWSERoll.rollAttack(this.actor, weapon, {
        ...modResult,
        source: options?.source ?? "combat-action",
        sourceElement: options?.sourceElement ?? null,
        sheet: this,
        showRollCompanion: true,
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null,
        actionData,
        actionId,
        showDialog: false,
        skipModifierDialog: true
      });
    }

    // --- Skill-backed combat action routing via Roll Configurator V2 ---
    // Core combat-action rows are often reference data, not actor item actions.
    // If the row names a related skill, open the same preroller used by the rest
    // of the sheet and roll that skill after the player confirms.
    const skillKey = this._resolveCombatActionSkillKey(actionData);
    if (skillKey) {
      const modResult = await showRollModifiersDialog({
        title: `${actionData?.name ?? actionId} — ${this._labelSkillKey(skillKey)}`,
        rollType: skillKey === 'useTheForce' ? 'force' : 'skill',
        actor: this.actor,
        skillKey,
        sourceElement: options?.sourceElement ?? null,
        sheet: this,
        showCover: false,
        showConcealment: false
      });
      if (modResult === null) return null;

      const actionType = this._deriveCombatActionEconomyType(actionData);
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "combat-action",
        actionId,
        actionName: actionData?.name ?? actionId,
        skillKey,
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;

      const dc = this._extractCombatActionDc(actionData);
      const combinedFeatBonus = CombinedFeatActionResolver.getSkillBonus(this.actor, skillKey, actionId);
      return await rollSkillCheck(this.actor, skillKey, {
        ...modResult,
        dc,
        actionId,
        actionData,
        source: options?.source ?? "combat-action",
        sourceElement: options?.sourceElement ?? null,
        companionSource: options?.sourceElement ?? null,
        sheet: this,
        showRollCompanion: true
      });
    }

    // --- Standard (non-attack) path ---
    const actionType = this._deriveCombatActionEconomyType(actionData);
    const allowed = await this._applyActionEconomy(actionType, {
      source: options?.source ?? "combat-action",
      actionId,
      actionName: actionData?.name ?? actionId,
      combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
    });
    if (!allowed) return null;

    const payload = {
      actor: this.actor,
      actionId,
      ...actionData,
      ...options,
      combatContext: options?.combatContext ?? actionData?.workflowContext ?? null,
      actionRecord: options?.actionRecord ?? actionData ?? null
    };

    try {
      if (typeof CombatEngine?.executeAction === "function") {
        const engineResult = await CombatEngine.executeAction(payload);
        if (engineResult) return engineResult;
      }
    } catch (err) {
      console.warn("[PHASE E] CombatEngine.executeAction failed, falling through:", err);
    }

    // Item-backed derived actions route through the actor.
    if (String(actionId || '').startsWith('item:') && typeof this.actor?.useAction === 'function') {
      const result = await this.actor.useAction(actionId, { ...options, actionData });
      if (result) return result;
    }

    if (typeof this.actor?.useAction === 'function') {
      const result = await this.actor.useAction(actionId, options);
      if (result) return result;
    }

    ui?.notifications?.warn?.("Combat action could not be executed.");
    return null;
  }


  async _executeConsularTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.consularTalentAction ?? actionData?.ruleData?.consularTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "consular-talent",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Jedi Consular Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'adeptNegotiator') return ConsularTalentActions.promptAdeptNegotiator(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'skilledAdvisor') return ConsularTalentActions.promptSkilledAdvisor(this.actor);
    if (kind === 'adversaryLore') return ConsularTalentActions.promptAdversaryLore(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'cleanseMind') return ConsularTalentActions.promptCleanseMind(this.actor);
    if (kind === 'consularsVitality') return ConsularTalentActions.promptConsularsVitality(this.actor);
    if (kind === 'consularsWisdom') return ConsularTalentActions.promptConsularsWisdom(this.actor);
    if (kind === 'collectiveVisions') return ConsularTalentActions.announceCollectiveVisions(this.actor);
    if (kind === 'aggressiveNegotiator') return ConsularTalentActions.announceAggressiveNegotiator(this.actor);
    if (kind === 'entreatAid') return ConsularTalentActions.promptEntreatAid(this.actor);
    if (kind === 'forceOfWill') return ConsularTalentActions.promptForceOfWill(this.actor);
    if (kind === 'guidingStrikes') return ConsularTalentActions.promptGuidingStrikes(this.actor);
    if (kind === 'improvedConsularsVitality') return ConsularTalentActions.promptImprovedConsularsVitality(this.actor);
    if (kind === 'renewVision') return ConsularTalentActions.promptRenewVision(this.actor);
    if (kind === 'visionaryAttack') return ConsularTalentActions.promptVisionaryAttack(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'visionaryDefense') return ConsularTalentActions.promptVisionaryDefense(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'watchcircleInitiate') return ConsularTalentActions.promptWatchCircleInitiate(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'acrobaticRecovery') return ConsularTalentActions.promptAcrobaticRecovery(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'battleMeditation') return ConsularTalentActions.promptBattleMeditation(this.actor, { improved: false });
    if (kind === 'improvedBattleMeditation') return ConsularTalentActions.promptBattleMeditation(this.actor, { improved: true });
    if (kind === 'resilience') return ConsularTalentActions.promptResilience(this.actor);
    if (kind === 'closeManeuvering') return ConsularTalentActions.promptCloseManeuvering(this.actor);
    if (kind === 'exposingStrike') return ConsularTalentActions.promptExposingStrike(this.actor);
    if (kind === 'grenadeDefense') return ConsularTalentActions.promptGrenadeDefense(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'immovable') return ConsularTalentActions.promptImmovable(this.actor);
    if (kind === 'mobileCombatant') return ConsularTalentActions.promptMobileCombatant(this.actor);
    if (kind === 'coverEscape') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Cover Escape', '<p>When you successfully spend a Force Point to negate an attack against an adjacent ally with Block or Deflect, that ally can move up to 2 squares as a Free Action without provoking Attacks of Opportunity.</p>');
    if (kind === 'defensiveAcuity') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Defensive Acuity', '<p>When you take the Fight Defensively action, your lightsaber attacks deal +1 die of damage and you gain +2 circumstance bonus on Use the Force checks to negate attacks with Block or Deflect until the end of your next turn.</p>');
    if (kind === 'elusiveTarget') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Elusive Target', '<p>When you are fighting one or more opponents in melee, other opponents take an additional -5 penalty on ranged attacks targeting you. This stacks with the normal -5 firing-into-melee penalty.</p>');
    if (kind === 'guardianStrike') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Guardian Strike', '<p>Passive: when you damage a target with a lightsaber, that target takes -2 on attack rolls against any target other than you until the beginning of your next turn. The attack hook tags targets when it can prove the lightsaber damage event.</p>');
    if (kind === 'holdTheLine') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Hold the Line', "<p>When you make a successful Attack of Opportunity against a target leaving your threatened area, you stop the target's movement and end its action.</p>");
    if (kind === 'forcefulWarrior') return ConsularTalentActions.announcePassiveTalent(this.actor, 'Forceful Warrior', '<p>Passive: when you score a critical hit with a lightsaber, you gain 1 temporary Force Point that expires at the end of the encounter.</p>');

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }


  async _executeSentinelTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.sentinelTalentAction ?? actionData?.ruleData?.sentinelTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "sentinel-talent",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Jedi Sentinel Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'clearMind') return SentinelTalentActions.announceClearMind(this.actor);
    if (kind === 'darkDeception') return SentinelTalentActions.promptDarkDeception(this.actor);
    if (kind === 'darkSideSense') return SentinelTalentActions.announceDarkSideSense(this.actor);
    if (kind === 'darkSideScourge') return SentinelTalentActions.announceDarkSideScourge(this.actor);
    if (kind === 'forceHaze') return SentinelTalentActions.promptForceHaze(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'resistTheDarkSide') return SentinelTalentActions.announceResistTheDarkSide(this.actor);
    if (kind === 'dampenPresence') return SentinelTalentActions.promptDampenPresence(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'darkRetaliation') return SentinelTalentActions.promptDarkRetaliation(this.actor);
    if (kind === 'darkSideBane') return SentinelTalentActions.announceDarkSideBane(this.actor);
    if (kind === 'gradualResistance') return SentinelTalentActions.promptGradualResistance(this.actor);
    if (kind === 'masterOfTheGreatHunt') return SentinelTalentActions.announceMasterOfTheGreatHunt(this.actor);
    if (kind === 'persistentHaze') return SentinelTalentActions.announcePersistentHaze(this.actor);
    if (kind === 'primeTargets') return SentinelTalentActions.announcePrimeTargets(this.actor);
    if (kind === 'reapRetribution') return SentinelTalentActions.promptReapRetribution(this.actor);
    if (kind === 'sensePrimalForce') return SentinelTalentActions.announceSensePrimalForce(this.actor);
    if (kind === 'rebukeTheDark') return SentinelTalentActions.announceRebukeTheDark(this.actor);
    if (kind === 'sentinelStrike') return SentinelTalentActions.announceSentinelStrike(this.actor);
    if (kind === 'improvedSentinelStrike') return SentinelTalentActions.announceImprovedSentinelStrike(this.actor);
    if (kind === 'improvedSentinelsGambit') return SentinelTalentActions.announceImprovedSentinelsGambit(this.actor);
    if (kind === 'sentinelsGambit') return SentinelTalentActions.promptSentinelsGambit(this.actor);
    if (kind === 'sentinelsObservation') return SentinelTalentActions.announceSentinelsObservation(this.actor);
    if (kind === 'steelResolve') return SentinelTalentActions.promptSteelResolve(this.actor);
    if (kind === 'taintOfTheDarkSide') return SentinelTalentActions.promptTaintOfTheDarkSide(this.actor);
    if (kind === 'unseenEyes') return SentinelTalentActions.announceUnseenEyes(this.actor);

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }

  async _executeJediPrestigeTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.jediPrestigeTalentAction ?? actionData?.ruleData?.jediPrestigeTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? 'jedi-prestige-talent',
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Jedi Prestige Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    return JediPrestigeTalentActions.execute(this.actor, kind, actionData, options);
  }


  async _executeSithTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.sithTalentAction ?? actionData?.ruleData?.sithTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? 'sith-talent',
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Sith Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    return SithTalentActions.execute(this.actor, kind, actionData, options);
  }


  async _executeForceAdeptTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.forceAdeptTalentAction ?? actionData?.ruleData?.forceAdeptTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? 'force-adept-talent',
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Force Adept Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    return ForceAdeptTalentActions.execute(this.actor, kind, actionData, options);
  }

  async _executeLightsaberTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.lightsaberTalentAction ?? actionData?.ruleData?.lightsaberTalentAction ?? actionId;
    let actionType = this._deriveCombatActionEconomyType(actionData);
    if (kind === 'trakata') {
      if (actionData?.spendAction !== false) {
        for (let i = 0; i < 2; i += 1) {
          const allowed = await this._applyActionEconomy('swift', {
            source: options?.source ?? 'lightsaber-form',
            actionId,
            actionName: actionData?.name ?? 'Trakata',
            sourceName: actionData?.sourceName ?? 'Lightsaber Form',
            sourceType: 'talent',
            swiftIndex: i + 1,
            swiftCount: 2,
            combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
          });
          if (!allowed) return null;
        }
      }
      return LightsaberFormEngine.promptTrakata(this.actor);
    }
    if (kind === 'lightsaberDefense') {
      const hasShotoMaster = this.actor?.items?.some?.(item => item?.type === 'talent' && String(item?.name ?? '').trim().toLowerCase().replace(/\s*\(\d+\)\s*$/, '') === 'shoto master');
      if (hasShotoMaster) actionType = 'free';
    }

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "lightsaber-talent",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Lightsaber Combat Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'block') return LightsaberTalentActions.promptBlock(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'deflect') return LightsaberTalentActions.promptDeflect(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'lightsaberDefense') return LightsaberTalentActions.promptLightsaberDefense(this.actor);
    if (kind === 'lightsaberThrow') return LightsaberTalentActions.promptLightsaberThrow(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'redirectShot') return LightsaberTalentActions.promptRedirectShot(this.actor);
    if (kind === 'cortosisGauntletBlock') return LightsaberTalentActions.announceCortosisGauntletBlock(this.actor);
    if (kind === 'preciseRedirect') return LightsaberTalentActions.announcePreciseRedirect(this.actor);
    if (kind === 'precision') return LightsaberTalentActions.promptPrecision(this.actor);
    if (kind === 'riposte') return LightsaberTalentActions.promptRiposte(this.actor);
    if (kind === 'forceFortification') return LightsaberTalentActions.promptForceFortification(this.actor);
    if (kind === 'improvedLightsaberThrow') return LightsaberTalentActions.promptImprovedLightsaberThrow(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'severingStrike') return LightsaberTalentActions.promptSeveringStrike(this.actor);
    if (kind === 'greaterWeaponFocusLightsabers') return LightsaberTalentActions.announceGreaterWeaponFocusLightsabers(this.actor);
    if (kind === 'greaterWeaponSpecializationLightsabers') return LightsaberTalentActions.announceGreaterWeaponSpecializationLightsabers(this.actor);
    if (kind === 'multiattackProficiencyLightsabers') return LightsaberTalentActions.announceMultiattackProficiencyLightsabers(this.actor);
    if (kind === 'improvedRiposte') return LightsaberTalentActions.announceImprovedRiposte(this.actor);
    if (kind === 'improvedRedirect') return LightsaberTalentActions.announceImprovedRedirect(this.actor);
    if (kind === 'thrownLightsaberMastery') return LightsaberTalentActions.announceThrownLightsaberMastery(this.actor);
    if (kind === 'shotoFocus') return LightsaberTalentActions.announceShotoFocus(this.actor);
    if (kind === 'shotoMaster') return LightsaberTalentActions.announceShotoMaster(this.actor);
    if (kind === 'weaponSpecializationLightsabers') return LightsaberTalentActions.announceWeaponSpecializationLightsabers(this.actor);
    if (kind === 'improvedQuickDrawLightsabers') return LightsaberTalentActions.announceImprovedQuickDrawLightsabers(this.actor);
    if (kind === 'slashingCharge') return LightsaberTalentActions.announceSlashingCharge(this.actor);
    if (kind === 'mobileAttackLightsabers') return LightsaberTalentActions.announceMobileAttackLightsabers(this.actor);
    if (kind === 'masterworkLightsaber') return LightsaberTalentActions.announceMasterworkLightsaber(this.actor);
    if (kind === 'perfectAttunement') return LightsaberTalentActions.announcePerfectAttunement(this.actor);
    if (kind === 'quickModification') return LightsaberTalentActions.announceQuickModification(this.actor);

    if (kind?.startsWith?.('setLightsaberForm:')) {
      const form = kind.split(':')[1];
      return LightsaberFormEngine.setActiveForm(this.actor, form);
    }
    if (kind === 'djemSo') return LightsaberFormEngine.promptDjemSo(this.actor);
    if (kind === 'juyo') return LightsaberFormEngine.promptJuyo(this.actor);
    if (kind === 'sokan') return LightsaberFormEngine.announceSokan(this.actor);
    if (kind === 'trakata') return LightsaberFormEngine.promptTrakata(this.actor);
    if (kind === 'ataru') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'ataru');
    if (kind === 'jarKai') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'jar-kai');
    if (kind === 'makashi') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'makashi');
    if (kind === 'niman') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'niman');
    if (kind === 'shien') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'shien');
    if (kind === 'shiiCho') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'shii-cho');
    if (kind === 'soresu') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'soresu');
    if (kind === 'vaapad') return LightsaberFormEngine.announceActiveFormBenefit(this.actor, 'vaapad');

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }


  async _executeArmorTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.armorTalentAction ?? actionData?.ruleData?.armorTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "armor-talent",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Armor Specialist Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'shieldExpert') return ArmorTalentActions.promptShieldExpert(this.actor);

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }

  async _executeForceTalentCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.forceTalentAction ?? actionData?.ruleData?.forceTalentAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "force-talent",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Force Talent',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'aversion') return ForceExecutor.activateAversion(this.actor);
    if (kind === 'illusion') return ForceExecutor.promptIllusion(this.actor, { sourceElement: options?.sourceElement ?? null });
    if (kind === 'link') return ForceExecutor.promptLink(this.actor);
    if (kind === 'suppressForce') return ForceExecutor.promptSuppressForce(this.actor);
    if (kind === 'telepathicLink') return ForceExecutor.promptTelepathicLink(this.actor);

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }

  async _executeGuardianSpiritCombatAction(actionId, actionData = {}, options = {}) {
    const kind = actionData?.guardianSpiritAction ?? actionData?.ruleData?.guardianSpiritAction ?? actionId;
    const actionType = this._deriveCombatActionEconomyType(actionData);

    if (actionData?.spendAction !== false) {
      const allowed = await this._applyActionEconomy(actionType, {
        source: options?.source ?? "guardian-spirit",
        actionId,
        actionName: actionData?.name ?? actionId,
        sourceName: actionData?.sourceName ?? 'Guardian Spirit',
        sourceType: 'talent',
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    if (kind === 'claimBonusForcePoint') return GuardianSpiritActions.claimGuardianBonusForcePoint(this.actor);
    if (kind === 'manifest') return GuardianSpiritActions.manifest(this.actor);
    if (kind === 'vitalEncouragement') return GuardianSpiritActions.vitalEncouragement(this.actor);
    if (kind === 'crucialAdvice') return GuardianSpiritActions.promptCrucialAdvice(this.actor);

    return this._announceManualCombatAction(actionId, actionData, { ...options, actionType });
  }

  async _announceManualCombatAction(actionId, actionData = {}, options = {}) {
    const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

    const title = escape(actionData?.name ?? actionId ?? 'Combat Action');
    const source = escape(actionData?.sourceName ?? actionData?.source ?? 'Ability');
    const actionType = escape(this._normalizeActionEconomyType(options?.actionType ?? actionData?.actionType ?? actionData?.type ?? 'standard'));
    const description = escape(actionData?.description ?? actionData?.notes ?? 'Resolve this action using the source ability text.');
    const resources = Array.isArray(actionData?.resources) ? actionData.resources.filter(Boolean).map(escape) : [];
    const requirements = Array.isArray(actionData?.requiredContext) ? actionData.requiredContext.filter(Boolean).map(escape) : [];

    const content = `
      <section class="swse-chat-card swse-chat-card--manual-action">
        <header class="swse-chat-card__header">
          <strong>${title}</strong>
          <span>${source}</span>
        </header>
        <div class="swse-chat-card__body">
          <p><strong>Action:</strong> ${actionType}</p>
          ${resources.length ? `<p><strong>Use:</strong> ${resources.join(', ')}</p>` : ''}
          ${requirements.length ? `<p><strong>Requirements:</strong> ${requirements.join(', ')}</p>` : ''}
          <p>${description}</p>
        </div>
      </section>`;

    try {
      return await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content
      });
    } catch (err) {
      console.warn('[SWSE] Failed to create manual combat action chat card:', err);
      ui?.notifications?.info?.(`${actionData?.name ?? actionId}: ${actionData?.description ?? actionData?.notes ?? 'Resolve manually.'}`);
      return { manual: true, actionId, actionData };
    }
  }

  _isAimCombatAction(actionId, actionData = {}) {
    const text = `${actionId || ''} ${actionData?.id || ''} ${actionData?.key || ''} ${actionData?.name || ''}`.toLowerCase();
    return /(^|\b)aim(\b|$)/.test(text);
  }

  async _executeAimCombatAction(actionId, actionData = {}, options = {}) {
    const swiftCount = Math.max(1, Number(actionData?.ruleData?.requiredSwiftCount ?? actionData?.swiftCount ?? 1) || 1);
    for (let i = 0; i < swiftCount; i += 1) {
      const allowed = await this._applyActionEconomy('swift', {
        source: options?.source ?? 'aim',
        actionId,
        actionName: actionData?.name ?? 'Aim',
        swiftIndex: i + 1,
        swiftCount,
        combatContext: options?.combatContext ?? actionData?.workflowContext ?? null
      });
      if (!allowed) return null;
    }

    return await this._announceManualCombatAction(actionId, {
      ...actionData,
      name: actionData?.name ?? 'Aim',
      sourceName: actionData?.sourceName ?? 'Combat Action',
      notes: actionData?.notes || "The character aims. Their next applicable ranged attack may ignore the target's cover bonus to Reflex Defense, subject to the Aim action rules.",
      description: actionData?.description || actionData?.notes || "The character aims. Their next applicable ranged attack may ignore the target's cover bonus to Reflex Defense, subject to the Aim action rules."
    }, {
      ...options,
      actionType: swiftCount > 1 ? `${swiftCount} Swift Actions` : 'swift'
    });
  }

  _combatActionLooksLikeAttack(actionData = {}) {
    if (this._isAimCombatAction(actionData?.id ?? actionData?.key, actionData)) return false;
    const values = [];
    const pushValue = (value) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(pushValue);
        return;
      }
      if (typeof value === 'object') {
        pushValue(value.skill ?? value.key ?? value.id ?? value.name ?? value.label ?? value.value);
        return;
      }
      values.push(String(value));
    };
    pushValue(actionData?.name);
    pushValue(actionData?.category);
    pushValue(actionData?.domain);
    pushValue(actionData?.relatedSkill);
    pushValue(actionData?.relatedSkills);
    const text = values.join(' ').toLowerCase();
    return /\battack( roll)?\b/.test(text) || /\bautofire\b/.test(text) || /\bburst fire\b/.test(text);
  }

  _resolveCombatActionSkillKey(actionData = {}) {
    const values = [];
    const pushValue = (value) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(pushValue);
        return;
      }
      if (typeof value === 'object') {
        pushValue(value.skill ?? value.key ?? value.id ?? value.name ?? value.label ?? value.value);
        return;
      }
      values.push(String(value));
    };

    pushValue(actionData?.skillKey);
    pushValue(actionData?.skill);
    pushValue(actionData?.relatedSkill);
    pushValue(actionData?.relatedSkills);

    // Combat action data often says "Attack Roll". That should stay in the
    // attack preroller path and not be treated as a skill check.
    const combined = values.join(' ').toLowerCase();
    if (combined.includes('attack') || combined.includes('grapple')) return null;

    for (const value of values) {
      const key = this._normalizeCombatActionSkillKey(value);
      if (key) return key;
    }
    return null;
  }

  _normalizeCombatActionSkillKey(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const byPackId = {
      '2b9e43f710664b31': 'useTheForce',
      '34a9c3f170eb9f40': 'climb',
      '35df8faa4878f2c5': 'endurance',
      '426945d1fc765a5d': 'survival',
      '43c5941072ec78af': 'perception',
      '633a13c5fa6101d7': 'treatInjury',
      '6d2ac22d9fcf402f': 'stealth',
      '745a5686d6f21e8c': 'mechanics',
      '8f5e21f92d6d976b': 'useComputer',
      '9410ce2dfb6cefcb': 'deception',
      '97f68d85ad68b921': 'jump',
      'a3855d8f08016487': 'knowledge',
      'a6c5e98148aad9a9': 'acrobatics',
      'b554f3e5a55ad53f': 'persuasion',
      'b8dad0c963f046c6': 'pilot',
      'c9bf381579013b18': 'gatherInformation',
      'cb5493f65f0bdb62': 'initiative',
      'd0b0f5e45327b476': 'ride',
      'f77c3576d22552fe': 'swim'
    };
    if (byPackId[raw]) return byPackId[raw];

    const compact = raw
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    const aliases = [
      ['use the force', 'useTheForce'],
      ['use computer', 'useComputer'],
      ['treat injury', 'treatInjury'],
      ['gather information', 'gatherInformation'],
      ['sleight of hand', 'stealth'],
      ['stealth', 'stealth'],
      ['acrobatics', 'acrobatics'],
      ['deception', 'deception'],
      ['endurance', 'endurance'],
      ['initiative', 'initiative'],
      ['jump', 'jump'],
      ['knowledge', 'knowledge'],
      ['mechanics', 'mechanics'],
      ['perception', 'perception'],
      ['persuasion', 'persuasion'],
      ['pilot', 'pilot'],
      ['ride', 'ride'],
      ['survival', 'survival'],
      ['swim', 'swim'],
      ['climb', 'climb']
    ];

    for (const [needle, key] of aliases) {
      if (compact.includes(needle)) return key;
    }
    return null;
  }

  _extractCombatActionDc(actionData = {}) {
    const dc = actionData?.dc ?? actionData?.DC ?? actionData?.system?.dc ?? null;
    if (typeof dc === 'number' && Number.isFinite(dc)) return dc;
    if (typeof dc === 'object' && dc) {
      const value = dc.value ?? dc.target ?? null;
      if (Number.isFinite(Number(value))) return Number(value);
      return null;
    }
    const match = String(dc ?? '').match(/-?\d+/);
    return match ? Number(match[0]) : null;
  }

  _labelSkillKey(skillKey) {
    const skills = CONFIG?.SWSE?.skills ?? {};
    const label = skills?.[skillKey]?.label ?? skills?.[skillKey]?.name;
    if (label) return label;
    return String(skillKey || 'Skill')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[\-_]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ============================================================
     DROP HANDLING (TAB-AGNOSTIC)
  ============================================================ */

  async _onDrop(event) {
    if (event.target?.closest?.('[data-drop-zone="crew-station"][data-crew-station]')) {
      return;
    }
    event.preventDefault();

    // File drops (images, etc.) are handled by PortraitUploadController on the
    // portrait dropzone. They should not reach here — but guard just in case.
    if (event.dataTransfer?.files?.length) return;

    // Extract drag data
    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    // Check if this is an actor drop
    let droppedDocument = null;
    if (data.uuid) {
      try {
        droppedDocument = await fromUuid(data.uuid);
      } catch (err) {
        // Not a valid UUID, treat as item drop
      }
    }

    // ACTOR DROP: Check if GM can adopt
    if (droppedDocument && droppedDocument.documentName === 'Actor') {
      return this._handleActorDrop(droppedDocument);
    }

    // ITEM DROP: Use standard resolution
    const result = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!result || !result.mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, result.mutationPlan);
      // UI feedback: pulse the target tab
      if (result.uiTargetTab) {
        this._pulseTab(result.uiTargetTab);
      }
    } catch (err) {
      // console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  /**
   * Handle actor drop: Show modal for GM, simple add for players
   *
   * @private
   * @param {Actor} droppedActor
   */
  async _handleActorDrop(droppedActor) {
    // Cross-type or player drop: only add (no adoption)
    if (droppedActor.type !== this.actor.type || !game.user.isGM) {
      return this._addActorRelationship(droppedActor);
    }

    // Same type + GM: show modal
    new AdoptOrAddDialog(droppedActor, async (choice) => {
      if (choice === "add") {
        await this._addActorRelationship(droppedActor);
      } else if (choice === "adopt") {
        await this._adoptActor(droppedActor);
      }
    }).render(true);
  }

  /**
   * Add actor as relationship (linked reference)
   *
   * @private
   * @param {Actor} actor
   */
  async _addActorRelationship(actor) {
    const relationships = this.actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);

    if (alreadyLinked) {
      // swseLogger.debug(`Already linked: ${actor.name}`);
      return;
    }

    const mutationPlan = {
      update: {
        'system.relationships': [
          ...relationships,
          {
            uuid: actor.uuid,
            name: actor.name,
            type: actor.type
          }
        ]
      }
    };

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      // console.error('Failed to add actor relationship:', err);
      ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
    }
  }

  /**
   * Adopt actor stat block (identity mutation)
   *
   * @private
   * @param {Actor} sourceActor
   */
  async _adoptActor(sourceActor) {
    const mutationPlan = AdoptionEngine.buildAdoptionPlan({
      targetActor: this.actor,
      sourceActor: sourceActor
    });

    if (!mutationPlan) {
      ui?.notifications?.warn?.(`Cannot adopt from ${sourceActor.name}`);
      return;
    }

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
      ui?.notifications?.info?.(`${this.actor.name} adopted stat block from ${sourceActor.name}`);
    } catch (err) {
      // console.error('Adoption failed:', err);
      ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
    }
  }

  /**
   * Pulse tab for UI feedback on drop success
   *
   * @private
   * @param {string} tabName - tab identifier to pulse
   */
  _pulseTab(tabName) {
    if (!tabName) return;

    const tabButton = this.element?.querySelector(`[data-sheet-tab="${tabName}"], [data-tab="${tabName}"]`);
    if (!tabButton) return;

    tabButton.classList.add('tab-pulse');

    setTimeout(() => {
      tabButton.classList.remove('tab-pulse');
    }, 800);
  }

  /**
   * Revalidate character build by switching from free build mode to normal mode.
   * This enforces prerequisites and restrictions that were bypassed in free build.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _revalidateBuild() {
    try {
      // Switch from free build mode to normal mode (prerequisites enforced)
      const plan = {
        update: {
          'system.buildMode': 'normal'
        }
      };

      await ActorEngine.apply(this.actor, plan);
      ui?.notifications?.info?.('Build revalidated — prerequisites now enforced');
    } catch (err) {
      // console.error('Build revalidation failed:', err);
      ui?.notifications?.error?.(`Build revalidation failed: ${err.message}`);
    }
  }

  async _onSubmitForm(event) {
    if (this.document?.type === 'vehicle') {
      return await this._onSubmitVehicleActorForm(event);
    }
    // Phase 8: Delegate form submission to focused form module
    return await handleFormSubmission(this, event);
  }

  // ============================================================
  // DEPRECATED: Old form submission helpers (kept for reference)
  // These are now in character-sheet/form.js
  // ============================================================

  async _onSubmitForm_OLD(event) {
    // swseLogger.debug('[PERSISTENCE] ════════════════════════════════════════');
    // swseLogger.debug('[PERSISTENCE] _onSubmitForm CALLED');
    swseLogger.debug('[PERSISTENCE] Event:', {
      type: event?.type,
      target: event?.target?.tagName,
      targetClass: event?.target?.className
    });

    try {
      event.preventDefault();
      // swseLogger.debug('[PERSISTENCE] Prevented default');
    } catch (err) {
      console.warn('[PERSISTENCE] Could not preventDefault:', err);
    }

    // Get the form element
    const form = event.target;
    swseLogger.debug('[PERSISTENCE] Form to submit:', {
      tag: form?.tagName,
      class: form?.className,
      isConnected: form?.isConnected,
      childCount: form?.children?.length
    });

    // DIAGNOSTIC: Log form data collection
    // swseLogger.debug('[PERSISTENCE] Collecting FormData from form');
    let formData;
    try {
      formData = new FormData(form);
      // swseLogger.debug('[PERSISTENCE] FormData created successfully');
    } catch (err) {
      // console.error('[PERSISTENCE] Failed to create FormData:', err);
      return;
    }

    // Convert FormData to plain object, then expand nested paths
    const formDataObj = Object.fromEntries(formData.entries());

    // CRITICAL: HTML FormData omits unchecked checkboxes and checked boxes default to "on".
    // For boolean-backed sheet fields (especially trained/focused skill flags), explicitly
    // serialize checkbox state so the engine receives true/false and derived skill totals
    // can correctly apply trained (+5) and focused (+5) bonuses.
    for (const checkbox of form.querySelectorAll('input[type="checkbox"][name]')) {
      formDataObj[checkbox.name] = checkbox.checked ? 'true' : 'false';
    }
    swseLogger.debug('[PERSISTENCE] FormData entries count:', Object.keys(formDataObj).length);
    swseLogger.debug('[PERSISTENCE] Raw form data (strings):', formDataObj);

    // CRITICAL FIX: Convert numeric string values to actual numbers
    // FormData collects all values as strings, but numeric fields need numbers
    const coercedData = this._coerceFormData(formDataObj);

    swseLogger.debug('[PERSISTENCE] Coerced form data (with types):', coercedData);

    const expanded = foundry.utils.expandObject(coercedData);

    // swseLogger.debug('[PERSISTENCE] Expanded form data:', expanded);

    const sanitized = this._sanitizeExpandedFormData(expanded);
    // swseLogger.debug('[PERSISTENCE] Sanitized form data:', sanitized);

    // CRITICAL: Filter out SSOT-protected fields that cannot be updated directly
    // These fields are enforced by ActorEngine governance and must be recalculated
    const filtered = this._filterSSotProtectedFields(sanitized);

    // DIAGNOSTIC: Compare sanitized vs filtered to identify what's being removed
    const removedKeys = [];
    for (const [key, value] of Object.entries(foundry.utils.flattenObject(sanitized))) {
      const filteredFlat = foundry.utils.flattenObject(filtered);
      if (!(key in filteredFlat) && value !== undefined) {
        removedKeys.push(key);
      }
    }
    if (removedKeys.length > 0) {
      // swseLogger.debug('[PERSISTENCE] Keys removed by filter:', removedKeys);
    }

    if (!filtered || Object.keys(filtered).length === 0) {
      console.warn('[PERSISTENCE] No updatable data after filtering protected fields');
      return;
    }

    try {
      // CRITICAL: Get fresh world actor to prevent stale reference issues
      // The actor reference in the sheet can become stale; we must fetch the
      // current instance from the world actors collection before updating
      const currentActorId = this.actor?.id;
      if (!currentActorId) {
        throw new Error('[PERSISTENCE] Cannot get actor ID from sheet context');
      }

      const freshActor = game.actors?.get?.(currentActorId);
      if (!freshActor) {
        throw new Error(`[PERSISTENCE] Actor "${currentActorId}" not found in world actors collection`);
      }

      swseLogger.debug('[PERSISTENCE] Actor reference verified:', {
        sheetActorId: this.actor.id,
        freshActorId: freshActor.id,
        isSameReference: this.actor === freshActor,
        freshActorCollection: freshActor.collection ? 'world' : 'null'
      });

      // Route directly through governance layer
      // This bypasses Foundry's _processSubmitData → actor.update() entirely
      swseLogger.debug('[PERSISTENCE] Calling ActorEngine.updateActor with:', {
        actorName: freshActor.name,
        actorId: freshActor.id,
        expandedKeys: Object.keys(filtered)
      });

      // [MUTATION TRACE] SHEET — handoff boundary to ActorEngine
      traceLog('SHEET', '_onSubmitForm handoff to ActorEngine.updateActor', {
        actor:   actorSummary(freshActor),
        payload: payloadSummary(filtered),
        sheetActorIsFresh: this.actor === freshActor
      });

      await ActorEngine.updateActor(freshActor, filtered);

      // swseLogger.debug('[PERSISTENCE] ActorEngine.updateActor completed successfully');

      // CRITICAL: If level was changed, trigger full recalculation of derived data
      // This ensures halfLevel, defenses, and all derived stats are recalculated
      if (filtered['system.level'] !== undefined) {
        // swseLogger.debug('[PERSISTENCE] Level changed detected, triggering full actor recalculation');
        try {
          await ActorEngine.recalcAll(freshActor);
          // swseLogger.debug('[PERSISTENCE] Full actor recalculation completed');
          // Re-render sheet to show updated derived values
          await this.requestSurfaceRender({ reason: 'level-change-recalc' });
          // swseLogger.debug('[PERSISTENCE] Sheet re-rendered with updated derived data');
        } catch (recalcErr) {
          // console.error('[PERSISTENCE] Recalculation failed:', recalcErr);
        }
      }
    } catch (err) {
      // console.error('[PERSISTENCE] Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }

  /**
   * Coerce form data values to appropriate types
   * FormData collects all values as strings, but some fields need type conversion
   *
   * Uses FORM_FIELD_SCHEMA for reliable, schema-driven coercion instead of pattern matching.
   * Only converts fields explicitly listed in the schema; unknown fields remain strings.
   *
   * @param {Object} formDataObj - Raw form data with string values
   * @returns {Object} Form data with coerced types
   */
  _coerceFormData(formDataObj) {
    swseLogger.debug('[PERSISTENCE] _coerceFormData called with', Object.keys(formDataObj).length, 'fields');
    const coerced = {};

    for (const [key, value] of Object.entries(formDataObj)) {
      // Schema-driven type lookup instead of pattern matching
      const expectedType = getFieldType(key);

      if (expectedType === 'number' && value !== '' && value !== null) {
        // Try to convert to number
        const numValue = Number(value);
        coerced[key] = !isNaN(numValue) ? numValue : value;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (number, schema-driven)`);
      } else if (expectedType === 'boolean' && (value === 'true' || value === 'false')) {
        coerced[key] = value === 'true';
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (boolean)`);
      } else if (value === 'true') {
        // Fallback: convert string 'true'/'false' even if not in schema
        coerced[key] = true;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → true (boolean, fallback)`);
      } else if (value === 'false') {
        coerced[key] = false;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → false (boolean, fallback)`);
      } else {
        // Unknown type or not in schema: keep as string
        coerced[key] = value;
      }
    }

    swseLogger.debug('[PERSISTENCE] _coerceFormData returning', Object.keys(coerced).length, 'coerced fields');
    return coerced;
  }


  /**
   * Remove placeholder/display-only values and unsafe writeback paths from expanded form data.
   *
   * Rules:
   * - strip literal em dash placeholder values
   * - strip empty-string pseudo values where appropriate
   * - strip most flags.* writes except SWSE-owned flags
   * - recurse and prune empty objects
   *
   * @param {Object} expanded
   * @returns {Object}
   */
  _sanitizeExpandedFormData(expanded) {
    const clone = foundry.utils.deepClone(expanded ?? {});

    const isPlaceholder = (value) => {
      if (value === '—') return true;
      if (value === '––') return true;
      if (value === '— —') return true;
      return false;
    };

    const walk = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return obj;

      for (const key of Object.keys(obj)) {
        const nextPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'string' && isPlaceholder(value)) {
          delete obj[key];
          continue;
        }

        // Strip unsafe flags by default, except explicit SWSE namespace flags.
        if (path === 'flags') {
          if (key !== 'swse' && key !== 'foundryvtt-swse') {
            delete obj[key];
            continue;
          }
        }

        if (value && typeof value === 'object') {
          walk(value, nextPath);
          if (Object.keys(value).length === 0) {
            delete obj[key];
            continue;
          }
        }
      }

      return obj;
    };

    return walk(clone);
  }

  /**
   * Filter out fields that are protected by SSOT (Single Source of Truth) governance.
   * These fields cannot be updated directly through ActorEngine.updateActor().
   *
   * Protected fields:
   * - system.derived.* → Only DerivedCalculator may write these
   * - system.hp.max → Only ActorEngine.recomputeHP() may write this
   *
   * Dependencies that affect HP (and trigger recomputeHP via hooks):
   * - Attributes (CON, STR, DEX, etc.) ✓ NOT protected
   * - Level ✓ NOT protected
   * - Class ✓ NOT protected
   * - HP bonus ✓ NOT protected
   *
   * The form should allow editing these dependencies; the governance layer
   * will automatically trigger HP recomputation via hooks.
   *
   * @param {Object} expanded - Expanded form data (nested)
   * @returns {Object} Filtered data without SSOT-protected fields
   */
  _filterSSotProtectedFields(expanded) {
    const filtered = foundry.utils.deepClone(expanded ?? {});

    // Remove protected derived fields
    if (filtered.system?.derived) {
      delete filtered.system.derived;
    }

    // Remove protected hp.max (only hp.value and hp.temp are editable)
    if (filtered.system?.hp?.max !== undefined) {
      delete filtered.system.hp.max;
    }

    // Keep only SWSE-owned flags if present
    if (filtered.flags) {
      const safeFlags = {};
      if (filtered.flags.swse) safeFlags.swse = filtered.flags.swse;
      if (filtered.flags["foundryvtt-swse"]) safeFlags["foundryvtt-swse"] = filtered.flags["foundryvtt-swse"];
      filtered.flags = safeFlags;
      if (Object.keys(filtered.flags).length === 0) {
        delete filtered.flags;
      }
    }

    // CRITICAL: Remove top-level fields that should not be in partial updates
    // Only include `name` if it's actually defined and different from the current value
    // This prevents payload corruption from undefined or empty name values
    if (filtered.name === '—' || filtered.name === undefined || filtered.name === null) {
      delete filtered.name;
    }
    if (typeof filtered.name === 'string' && filtered.name.trim() === '') {
      delete filtered.name;
      console.warn('[PERSISTENCE] Filtered out empty name field - partial updates should omit untouched fields');
    }
    if (filtered.name !== undefined && typeof filtered.name !== 'string') {
      delete filtered.name;
      console.warn('[PERSISTENCE] Filtered out non-string name field from partial update payload');
    }

    // Remove system-protected fields that cause collection errors
    delete filtered._id;
    delete filtered.type;
    delete filtered.ownership;
    delete filtered.permission;
    delete filtered.sort;
    delete filtered.folder;
    delete filtered.img;
    delete filtered._stats;

    return filtered;
  }
}
