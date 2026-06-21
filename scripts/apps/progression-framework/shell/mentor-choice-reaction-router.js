/**
 * MentorChoiceReactionRouter
 *
 * Thin shell-level adapter that lets the hardened mentor rail react to normal
 * player choices without inventing a parallel dialogue system.
 *
 * It reuses the existing suggestion/advisory/reason-atom stack:
 * - current mentor identity from mentor-step-integration / session mentorContext
 * - SuggestionService output when a step has no local suggestion object
 * - local step suggestion arrays/maps when the step already hydrated them
 * - MentorInteractionOrchestrator selection mode
 * - MentorJudgmentEngine + mentor reason atoms as deterministic fallback
 *
 * Language choices are intentionally skipped; language selection is cosmetic
 * and should not make the rail chatter.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { MentorInteractionOrchestrator } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-interaction-orchestrator.js';
import { MentorAdvisoryCoordinator } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-advisory-coordinator.js';
import { MentorJudgmentEngine } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-judgment-engine.js';
import { REASON_ATOMS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js';
import { resolveStepMentorContext, STEP_TO_CHOICE_TYPE } from '../steps/mentor-step-integration.js';

const SYSTEM_ID = 'foundryvtt-swse';

const LANGUAGE_STEPS = new Set(['language', 'languages']);

const PASSIVE_ACTIONS = new Set([
  'toggle-category',
  'focus-tree',
  'enter-tree',
  'exit-tree',
  'set-talent-view',
  'fit-talent-tree',
  'center-talent-node',
  'create-custom-planet',
  'skill-reset',
  'add-language',
  'select-language',
  'remove-language',
  'remove-bonus-language',
]);

const ACTION_TO_REACTION = {
  'focus-item': 'focus',
  'focus-talent': 'focus',
  'commit-item': 'commit',
  'skill-train': 'commit',
  'skill-untrain': 'uncommit',
  'increment-quantity': 'commit',
  'decrement-quantity': 'uncommit',
  'purchase-system': 'commit',
  'remove-system': 'uncommit',
  'select-species-variant': 'commit',
};

const STEP_TO_DOMAIN = {
  species: 'species',
  class: 'classes',
  attribute: 'attributes',
  ability: 'attributes',
  'ability-scores': 'attributes',
  background: 'backgrounds',
  skills: 'skills_l1',
  'general-feat': 'feats',
  'class-feat': 'feats',
  'nonheroic-starting-feats': 'feats',
  'general-talent': 'talents',
  'class-talent': 'talents',
  'force-powers': 'forcepowers',
  'force-secrets': 'force-secrets',
  'force-techniques': 'force-techniques',
  'medical-secrets': 'medical-secrets',
  'starship-maneuver': 'starship-maneuvers',
  'starship-maneuvers': 'starship-maneuvers',
  'droid-builder': 'droid-systems',
  'droid-degree': 'droid-systems',
  'droid-model': 'droid-systems',
  'final-droid-configuration': 'droid-systems',
};

const SEARCH_ARRAY_KEYS = [
  '_suggestedClasses', '_allClasses', '_filteredClasses', '_classes',
  '_suggestedSpecies', '_allSpecies', '_filteredSpecies', '_species', '_variants', '_nearHumanOptions',
  '_suggestedBackgrounds', '_allBackgrounds', '_filteredBackgrounds', '_backgrounds',
  '_suggestedFeats', '_legalFeats', '_allFeats', '_filteredFeats', '_feats',
  '_suggestedTalents', '_legalTalents', '_allTalents', '_filteredTalents', '_talents', '_allTrees', '_filteredTrees', '_trees', '_nodes',
  '_suggestedSkills', '_availableSkills', '_allSkills', '_filteredSkills', '_skills',
  '_suggestedPowers', '_legalPowers', '_allPowers', '_filteredPowers', '_powers',
  '_suggestedSecrets', '_legalSecrets', '_allSecrets', '_filteredSecrets', '_secrets',
  '_suggestedTechniques', '_legalTechniques', '_allTechniques', '_filteredTechniques', '_techniques',
  '_suggestedManeuvers', '_legalManeuvers', '_allManeuvers', '_filteredManeuvers', '_maneuvers',
  '_suggestedSystems', '_allSystems', '_filteredSystems', '_systems',
  '_options', '_items', '_rows',
];

const ITEM_ID_DATASET_KEYS = [
  'itemId', 'featId', 'talentId', 'treeId', 'nodeId', 'skill', 'skillId', 'skillKey',
  'powerId', 'secretId', 'techniqueId', 'maneuverId', 'systemId', 'speciesId',
  'variantId', 'classId', 'backgroundId', 'id', 'key', 'slug', 'name',
];

const VALID_MOODS = new Set(['neutral', 'encouraging', 'cautionary', 'celebratory']);

const REACTION_MODES = new Set(['full', 'important', 'off']);

const NON_CHOICE_STEPS = new Set([
  'intro', 'name', 'summary', 'confirm', 'levelup-review', 'languages', 'language',
]);

const CORE_CLASS_NAMES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];
const CLASS_ROUTE_AFFINITY = {
  Jedi: ['Jedi Knight', 'Jedi Master', 'Force Disciple', 'Force Adept', 'Imperial Knight', 'Sith Apprentice'],
  Noble: ['Officer', 'Crime Lord', 'Corporate Agent', 'Charlatan', 'Medic', 'Droid Commander'],
  Scoundrel: ['Gunslinger', 'Outlaw', 'Crime Lord', 'Infiltrator', 'Master Privateer', 'Assassin', 'Charlatan'],
  Scout: ['Bounty Hunter', 'Ace Pilot', 'Pathfinder', 'Infiltrator', 'Vanguard', 'Saboteur'],
  Soldier: ['Elite Trooper', 'Officer', 'Vanguard', 'Gladiator', 'Melee Duelist', 'Military Engineer', 'Bounty Hunter'],
};
const CLASS_THEME_LABELS = {
  force: 'Force tradition', social: 'social leverage', ranged: 'ranged pressure', exploration: 'mobility and fieldcraft',
  combat: 'front-line combat', vehicle: 'vehicle mastery', stealth: 'infiltration', tracking: 'tracking',
  leader: 'command', support: 'support', tech: 'technical problem-solving', melee: 'melee pressure', general: 'general capability',
};

const HIGH_VALUE_STEPS = new Set([
  'species', 'class', 'background', 'general-feat', 'class-feat', 'nonheroic-starting-feats',
  'general-talent', 'class-talent', 'force-powers', 'force-secrets', 'force-techniques',
  'medical-secrets', 'starship-maneuver', 'starship-maneuvers',
]);

const MEDIUM_VALUE_STEPS = new Set([
  'attribute', 'ability', 'ability-scores', 'skills', 'droid-builder', 'droid-degree',
  'droid-model', 'final-droid-configuration',
]);

const REQUIRED_REACTION_STEPS = new Set([
  'species', 'class', 'attribute', 'ability', 'ability-scores', 'background', 'skills',
  'general-feat', 'class-feat', 'nonheroic-starting-feats',
  'general-talent', 'class-talent', 'force-powers', 'force-secrets', 'force-techniques',
  'medical-secrets', 'starship-maneuver', 'starship-maneuvers',
  'droid-builder', 'droid-degree', 'droid-model', 'final-droid-configuration',
]);

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return Array.from(value.values());
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function getSetting(key, fallback = null) {
  try {
    return globalThis.game?.settings?.get?.(SYSTEM_ID, key) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function isDebugEnabled() {
  return globalThis.game?.user?.isGM === true && getSetting('mentorReactionDebug', false) === true;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function itemName(item, fallback = 'this choice') {
  if (!item) return fallback;
  if (typeof item === 'string') return item;
  return item.name
    || item.label
    || item.title
    || item.className
    || item.skillName
    || item.system?.name
    || item.system?.label
    || fallback;
}

function itemId(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.id
    || item._id
    || item.key
    || item.slug
    || item.uuid
    || item.itemId
    || item.featId
    || item.talentId
    || item.classId
    || item.backgroundId
    || item.skillId
    || item.skillKey
    || item.powerId
    || item.secretId
    || item.techniqueId
    || item.maneuverId
    || item.systemId
    || itemName(item, null);
}

function scoreSuggestion(suggestion) {
  const suggestionBlock = suggestion?.suggestion || suggestion || {};
  const tier = Number(suggestionBlock.tier ?? suggestion.tier ?? 0) || 0;
  const confidence = Number(suggestionBlock.confidence ?? suggestion.confidence ?? 0) || 0;
  return (tier * 100) + confidence;
}

function includesAny(haystack, needles) {
  const text = String(haystack || '').toLowerCase();
  return needles.some(needle => text.includes(needle));
}

function compactText(...parts) {
  return parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripSentencePunctuation(value) {
  return String(value || '').trim().replace(/[.!?]+$/g, '');
}

function actorClassItems(actor) {
  return Array.from(actor?.items?.contents || actor?.items || [])
    .filter(item => item?.type === 'class')
    .map(item => ({ name: item?.name, level: Number(item?.system?.level ?? item?.system?.levels ?? 1) || 1 }))
    .filter(entry => entry.name);
}

function primaryBaseClassName(actor) {
  return actorClassItems(actor)
    .filter(entry => CORE_CLASS_NAMES.some(name => normalizeKey(name) === normalizeKey(entry.name)))
    .sort((a, b) => b.level - a.level)[0]?.name || null;
}

function isClassRouteMatch(baseClass, className) {
  if (!baseClass || !className) return false;
  return (CLASS_ROUTE_AFFINITY[baseClass] || []).some(route => normalizeKey(route) === normalizeKey(className));
}

function isPrestigeClassItem(item) {
  return item?.prestigeClass === true || item?.isPrestige === true || item?.baseClass === false
    || item?.system?.prestigeClass === true || item?.system?.isPrestige === true || item?.dataset?.type === 'prestige';
}

function classThemeText(item, suggestion = null) {
  const raw = String(item?.theme || item?.role || item?.system?.theme || item?.system?.role || suggestion?.theme || suggestion?.suggestion?.theme || '').trim();
  if (raw) return CLASS_THEME_LABELS[normalizeKey(raw)] || raw;
  const text = compactText(item?.tags, item?.system?.tags, suggestion?.tags, suggestion?.reasonText, suggestion?.suggestion?.reason).toLowerCase();
  if (includesAny(text, ['force', 'jedi', 'lightsaber', 'use the force'])) return 'Force tradition';
  if (includesAny(text, ['pilot', 'vehicle', 'starship'])) return 'vehicle mastery';
  if (includesAny(text, ['stealth', 'infiltration', 'slicer'])) return 'infiltration';
  if (includesAny(text, ['leader', 'support', 'noble', 'officer'])) return 'command/support';
  if (includesAny(text, ['tech', 'mechanics', 'computer'])) return 'technical problem-solving';
  if (includesAny(text, ['ranged', 'pistol', 'rifle', 'gunslinger'])) return 'ranged pressure';
  if (includesAny(text, ['melee', 'soldier', 'duelist', 'martial'])) return 'melee pressure';
  return 'a different play pattern';
}

function suggestionMissingText(suggestion) {
  const raw = suggestion?.suggestion?.missingPrereqs || suggestion?.missingPrereqs || suggestion?.missing || [];
  const list = (Array.isArray(raw) ? raw : [raw]).map(entry => {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    return entry.shortDisplay || entry.display || entry.name || entry.label || entry.reason || null;
  }).filter(Boolean);
  return displayInlineList(list, 3);
}

function displayInlineList(values, limit = 3) {
  const cleaned = Array.from(new Set((values || []).filter(Boolean))).slice(0, limit);
  if (!cleaned.length) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

export class MentorChoiceReactionRouter {
  constructor(shell) {
    this.shell = shell;
    this._lastReactionKey = null;
    this._lastReactionAt = 0;
    this._sequence = 0;
    this._lastSkippedReaction = null;
    this._lastFallbackPath = null;
    this._coverageReport = null;
    this._coverageValidated = false;
  }

  reactToInteraction(payload = {}) {
    try {
      const descriptor = this.shell?.steps?.[this.shell?.currentStepIndex] || this.shell?.currentDescriptor || null;
      const stepId = payload.stepId || descriptor?.stepId || this.shell?.progressionSession?.currentStepId || null;
      if (!stepId || LANGUAGE_STEPS.has(stepId)) return;

      const tuning = this.getTuningSnapshot();
      if (!tuning.mentorGuidanceEnabled || tuning.mode === 'off') {
        this._recordSkippedReaction({ stepId, action: payload.action || null, reason: tuning.mode === 'off' ? 'mode-off' : 'mentor-guidance-disabled' });
        return;
      }

      const actionName = payload.actionName || payload.target?.dataset?.action || payload.action || null;
      if (actionName && PASSIVE_ACTIONS.has(actionName)) return;

      const action = this._normalizeAction(payload.action, actionName);
      if (!action) return;
      if (action === 'focus' && !tuning.focusReactionsEnabled) {
        this._recordSkippedReaction({ stepId, action, actionName, reason: 'focus-reactions-disabled' });
        return;
      }

      const target = payload.target || payload.event?.target || null;
      const itemIdValue = payload.itemId || this._itemIdFromTarget(target) || this._itemIdFromTarget(payload.event?.target) || null;
      const plugin = payload.plugin || this.shell?.stepPlugins?.get?.(stepId) || null;
      const item = payload.item || this._resolveItem(plugin, itemIdValue, target) || this._resolveItem(plugin, itemIdValue, payload.event?.target);
      const resolvedId = itemId(item) || itemIdValue;
      if (!resolvedId && !item) return;

      const reactionKey = [stepId, action, normalizeKey(resolvedId || itemName(item)), actionName || ''].join(':');
      const now = Date.now();
      const minInterval = this._throttleMs({ stepId, action });
      if (reactionKey === this._lastReactionKey && now - this._lastReactionAt < minInterval) {
        this._recordSkippedReaction({ stepId, action, actionName, itemId: resolvedId, reason: 'throttled', throttleMs: minInterval });
        return;
      }
      this._lastReactionKey = reactionKey;
      this._lastReactionAt = now;

      const token = ++this._sequence;
      void this._runReaction({
        token,
        descriptor,
        stepId,
        action,
        actionName,
        plugin,
        item: item || this._domItem(target, resolvedId),
        itemId: resolvedId,
        target,
      });
    } catch (err) {
      swseLogger.warn('[MentorChoiceReactionRouter] Failed to queue mentor reaction', err);
    }
  }


  getTuningSnapshot() {
    const mode = String(getSetting('mentorReactionMode', 'full') || 'full').toLowerCase();
    const normalizedMode = REACTION_MODES.has(mode) ? mode : 'full';
    return {
      mode: normalizedMode,
      focusReactionsEnabled: getSetting('mentorFocusReactionsEnabled', true) !== false,
      debugEnabled: isDebugEnabled(),
      mentorGuidanceEnabled: getSetting('mentorGuidanceEnabled', true) !== false,
    };
  }

  getDebugSnapshot() {
    return {
      lastReactionKey: this._lastReactionKey,
      lastReactionAt: this._lastReactionAt,
      lastSkippedReaction: this._lastSkippedReaction,
      lastFallbackPath: this._lastFallbackPath,
      coverageReport: this._coverageReport,
      tuning: this.getTuningSnapshot(),
    };
  }

  canReactToStep(stepId) {
    if (!stepId || LANGUAGE_STEPS.has(stepId) || NON_CHOICE_STEPS.has(stepId)) return false;
    return !!(STEP_TO_DOMAIN[stepId] || STEP_TO_CHOICE_TYPE[stepId] || REQUIRED_REACTION_STEPS.has(stepId));
  }

  validateReactionCoverage(options = {}) {
    const force = options.force === true;
    if (this._coverageValidated && !force) return this._coverageReport;

    const steps = asArray(this.shell?.steps).map(step => step?.stepId).filter(Boolean);
    const relevant = steps.filter(stepId => !LANGUAGE_STEPS.has(stepId) && !NON_CHOICE_STEPS.has(stepId));
    const coverage = relevant.map(stepId => ({
      stepId,
      covered: this.canReactToStep(stepId),
      domain: STEP_TO_DOMAIN[stepId] || STEP_TO_CHOICE_TYPE[stepId] || null,
      importance: this._stepBaseImportance(stepId),
    }));
    const missing = coverage.filter(row => !row.covered).map(row => row.stepId);
    const requiredMissing = Array.from(REQUIRED_REACTION_STEPS)
      .filter(stepId => steps.includes(stepId) && !this.canReactToStep(stepId));

    const report = {
      ok: missing.length === 0 && requiredMissing.length === 0,
      total: coverage.length,
      covered: coverage.filter(row => row.covered).length,
      missing,
      requiredMissing,
      coverage,
      checkedAt: Date.now(),
    };

    this._coverageReport = report;
    this._coverageValidated = true;

    if (!report.ok) {
      this._recordCoverageWarning(report);
      if (isDebugEnabled()) {
        swseLogger.warn('[MentorChoiceReactionRouter] Mentor reaction coverage gaps detected', report);
      }
    }
    return report;
  }

  _normalizeAction(action, actionName) {
    if (action && ['focus', 'commit', 'uncommit'].includes(action)) return action;
    return ACTION_TO_REACTION[actionName] || null;
  }

  async _runReaction(context) {
    try {
      const { token, stepId, action, plugin, item, itemId: resolvedItemId, target } = context;
      if (token !== this._sequence && action === 'focus') return;

      const mentorContext = resolveStepMentorContext(this.shell?.actor ?? null, this.shell, {
        stepId,
        validateRegistry: false,
      });
      const mentorId = mentorContext?.mentorKey || mentorContext?.mentorId || this.shell?.mentor?.mentorId || 'ol_salty';
      const mentorName = mentorContext?.mentor?.name || this.shell?.mentor?.name || mentorId;

      const localSuggestions = this._collectLocalSuggestions(plugin);
      let suggestion = this._matchSuggestion(localSuggestions, item, resolvedItemId);
      if (!suggestion) {
        suggestion = await this._suggestionFromService(stepId, item, resolvedItemId, action);
      }

      const isSuggested = !!suggestion || this._targetLooksSuggested(target);
      const atoms = this._collectAtoms({ suggestion, item, action, stepId, isSuggested });
      const intensity = this._resolveIntensity(suggestion, action, isSuggested);
      const importance = this._resolveImportance({ stepId, action, actionName: context.actionName, item, suggestion, isSuggested, intensity, atoms });
      const tuning = this.getTuningSnapshot();
      if (!this._shouldReactForTuning({ tuning, action, importance, isSuggested, intensity, atoms })) {
        this._recordSkippedReaction({
          stepId,
          action,
          actionName: context.actionName,
          itemId: resolvedItemId,
          itemName: itemName(item),
          reason: tuning.mode === 'important' ? 'below-important-threshold' : 'tuning-suppressed',
          importance,
          intensity,
          mode: tuning.mode,
        });
        return;
      }
      const normalizedSuggestion = this._normalizeSuggestion(suggestion, item, atoms, intensity, action, isSuggested);

      let textSource = 'orchestrator';
      let text = await this._buildOrchestratedText({
        mentorId,
        mentorName,
        stepId,
        action,
        item,
        suggestion: normalizedSuggestion,
        atoms,
        intensity,
      });

      if (!text || this._isEmptyMentorText(text)) {
        textSource = 'metadata-fallback';
        this._recordFallbackPath({ stepId, action, item, mentorId, reason: 'orchestrator-and-advisory-empty', atoms, intensity });
        text = this._buildFallbackText({ mentorId, mentorName, stepId, action, item, atoms, intensity, suggestion: normalizedSuggestion });
      }

      text = this._shapeFinalLine({ text, action, item, suggestion: normalizedSuggestion });
      if (!text || token !== this._sequence && action === 'focus') return;

      await this._speak(text, this._moodFor(atoms, action, intensity));
      this._recordReactionBreadcrumb({ stepId, action, item, mentorId, atoms, intensity, importance, source: suggestion ? textSource : 'metadata', textSource });
    } catch (err) {
      swseLogger.warn('[MentorChoiceReactionRouter] Mentor reaction failed', {
        stepId: context?.stepId || null,
        action: context?.action || null,
        error: err?.message || String(err),
      });
    }
  }

  _readSuggestionText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
      return String(value.fullReason || value.reasonText || value.reasonSummary || value.shortReason || value.text || value.label || '').trim();
    }
    return String(value).trim();
  }

  _isGenericSuggestionText(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return true;
    return [
      'you meet the requirements',
      'you meet this requirement',
      'this adds to your selections',
      'adds to your selections',
      'this relates to your pattern',
      'this relates to your patterns',
      'this relates to your progression',
      'this reflects the path taking shape',
      'it reflects the path taking shape',
      'available',
      'legal option',
    ].some(fragment => text === fragment || text.includes(fragment));
  }

  _concreteSuggestionReason(suggestion) {
    if (!suggestion) return '';
    const block = suggestion?.suggestion || {};
    const packet = suggestion?.reasonPacket || block?.reasonPacket || {};
    const explanation = suggestion?.explanation || block?.explanation || {};
    const candidates = [
      explanation.full,
      packet.fullReason,
      suggestion.reasonText,
      block.reasonText,
      suggestion.reasonSummary,
      block.reasonSummary,
      explanation.short,
      packet.shortReason,
      this._readSuggestionText(suggestion.reason),
      this._readSuggestionText(block.reason),
    ];
    const direct = candidates
      .map(value => this._readSuggestionText(value))
      .find(value => value && !this._isGenericSuggestionText(value));
    if (direct) return direct;

    const bulletSources = [explanation.bullets, packet.bullets, suggestion.reasonBullets, block.reasonBullets, suggestion.reasons, block.reasons, packet.allReasons];
    for (const source of bulletSources) {
      for (const entry of Array.isArray(source) ? source : []) {
        const text = this._readSuggestionText(entry).replace(/^because\s+/i, '');
        if (text && !this._isGenericSuggestionText(text)) return text;
      }
    }
    return '';
  }

  async _buildOrchestratedText({ mentorId, stepId, action, item, suggestion, atoms, intensity }) {
    const concreteReason = this._concreteSuggestionReason(suggestion);
    if (concreteReason) {
      const name = itemName(item, suggestion?.name || 'This choice');
      if (action === 'commit') return compactText(`${name} locked in.`, concreteReason);
      if (action === 'uncommit') return compactText(`${name} set aside.`, concreteReason);
      return compactText(`${name}.`, concreteReason);
    }

    try {
      const result = await MentorInteractionOrchestrator.handle({
        mode: 'selection',
        actor: this.shell?.actor ?? null,
        mentorId,
        suggestion,
        item,
        pendingData: this.shell?.progressionSession?.draftSelections ?? null,
      });
      const primary = result?.primaryAdvice || result?.guidance || null;
      if (primary && !this._isEmptyMentorText(primary)) return primary;
    } catch (err) {
      swseLogger.debug('[MentorChoiceReactionRouter] Orchestrator selection reaction unavailable', err);
    }

    try {
      const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
        this.shell?.actor ?? null,
        mentorId,
        [suggestion],
        {
          domain: STEP_TO_DOMAIN[stepId] || STEP_TO_CHOICE_TYPE[stepId] || stepId,
          stepId,
          action,
          relatedGrowth: this._relatedGrowthFor(stepId),
          archetype: this.shell?.progressionSession?.getSelection?.('class')?.className || 'your path',
          atoms,
          intensity,
        }
      );
      const line = compactText(advisory?.observation, advisory?.guidance || advisory?.impact);
      if (line && !this._isEmptyMentorText(line)) return line;
    } catch (err) {
      swseLogger.debug('[MentorChoiceReactionRouter] Advisory reaction unavailable', err);
    }

    return null;
  }

  _buildFallbackText({ mentorId, mentorName, stepId, action, item, atoms, intensity, suggestion }) {
    const classLine = this._buildClassFallbackText({ stepId, action, item, suggestion });
    if (classLine) return classLine;

    const explanation = MentorJudgmentEngine.buildExplanation(
      atoms,
      this._judgmentMentorName(mentorId, mentorName),
      `${stepId}_${action}`,
      intensity
    );
    const reason = suggestion?.reasonSummary || suggestion?.reasonText || suggestion?.suggestion?.reason || null;
    const name = itemName(item);

    if (action === 'uncommit') {
      return compactText(`${name} set aside.`, explanation);
    }
    if (action === 'commit') {
      return compactText(`${name} becomes part of your path.`, explanation, reason && reason !== explanation ? reason : '');
    }
    return compactText(`${name}.`, explanation);
  }

  _buildClassFallbackText({ stepId, action, item, suggestion }) {
    if (stepId !== 'class' || !item) return '';
    const name = itemName(item, suggestion?.name || 'This class');
    if (!name || normalizeKey(name) === 'this-choice') return '';

    const baseClass = primaryBaseClassName(this.shell?.actor);
    const isPrestige = isPrestigeClassItem(item) || isPrestigeClassItem(suggestion);
    const routeMatch = isClassRouteMatch(baseClass, name);
    const theme = classThemeText(item, suggestion);
    const missing = suggestionMissingText(suggestion);
    const actorClasses = actorClassItems(this.shell?.actor);
    const alreadyHasClass = actorClasses.some(entry => normalizeKey(entry.name) === normalizeKey(name));

    const clauses = [];
    if (isPrestige && routeMatch) {
      clauses.push(`this is the advanced ${baseClass} route your existing chassis points toward`);
    } else if (isPrestige && baseClass) {
      clauses.push(`this is an advanced route, but it shifts emphasis from your ${baseClass} foundation toward ${theme}`);
    } else if (!isPrestige && alreadyHasClass) {
      clauses.push(`staying here deepens the class chassis you already rely on`);
    } else if (!isPrestige && baseClass && normalizeKey(baseClass) !== normalizeKey(name)) {
      clauses.push(`this is cross-training from your ${baseClass} base toward ${theme}`);
    } else {
      clauses.push(`this defines the character around ${theme}`);
    }

    if (isPrestige && missing) {
      clauses.push(`the remaining gates are ${missing}`);
    } else if (isPrestige) {
      clauses.push('the prerequisite question is answered, so the real question is identity and payoff');
    }

    if (/jedi-knight/i.test(normalizeKey(name)) && /jedi/i.test(baseClass || '')) {
      clauses.unshift('your Jedi levels, Force training, and lightsaber foundation already point at Knighthood');
    }

    const prefix = action === 'commit' ? `${name} locked in.` : action === 'uncommit' ? `${name} set aside.` : `${name}.`;
    const body = stripSentencePunctuation(clauses.filter(Boolean).slice(0, 2).join('; '));
    return compactText(prefix, body ? `${body}.` : 'This is a viable class choice.');
  }

  _shapeFinalLine({ text, action, item }) {
    const name = itemName(item, 'This choice');
    let line = compactText(text);
    if (!line) return '';

    // Keep the rail lively, not long-winded. Advisory stubs can be verbose.
    const maxLength = action === 'focus' ? 170 : 240;
    if (line.length > maxLength) {
      const sentenceBreak = line.slice(0, maxLength).lastIndexOf('. ');
      if (sentenceBreak > 80) line = line.slice(0, sentenceBreak + 1);
      else line = `${line.slice(0, maxLength - 1).trim()}…`;
    }

    if (action === 'commit' && !includesAny(line, [name.toLowerCase()])) {
      return compactText(`${name}.`, line);
    }
    if (action === 'uncommit' && !includesAny(line, ['set aside', 'reconsider', 'aside'])) {
      return compactText(`${name} set aside.`, line);
    }
    return sentenceCase(line);
  }

  _isEmptyMentorText(text) {
    const value = String(text || '').trim().toLowerCase();
    return !value
      || value.includes('mentor is silent')
      || value.includes('mentor has nothing to say')
      || value.includes('the mentor is silent')
      || value === 'the mentor considers your choice.';
  }

  async _suggestionFromService(stepId, item, itemIdValue, action) {
    const domain = STEP_TO_DOMAIN[stepId];
    if (!domain) return null;

    try {
      const suggestions = await SuggestionService.getSuggestions(this.shell?.actor ?? null, this.shell?.mode || 'chargen', {
        domain,
        shell: this.shell,
        progressionSession: this.shell?.progressionSession,
        pendingData: this.shell?.progressionSession?.draftSelections || {},
        focus: itemId(item) || itemName(item, null),
        stepId,
        step: stepId,
        selection: item,
        focusedItem: item,
        limit: action === 'focus' ? 12 : 24,
      });
      const list = asArray(suggestions);
      return this._matchSuggestion(list, item, itemIdValue) || list[0] || null;
    } catch (err) {
      swseLogger.debug('[MentorChoiceReactionRouter] SuggestionService lookup skipped', {
        stepId,
        domain,
        error: err?.message || String(err),
      });
      return null;
    }
  }

  _normalizeSuggestion(suggestion, item, atoms, intensity, action, isSuggested) {
    const base = suggestion ? { ...suggestion } : {};
    const suggestionBlock = base.suggestion ? { ...base.suggestion } : {};
    const tier = Number(suggestionBlock.tier ?? base.tier ?? (isSuggested ? 4 : action === 'commit' ? 3 : 2)) || 0;
    const confidence = Number(suggestionBlock.confidence ?? base.confidence ?? (isSuggested ? 0.72 : 0.48)) || 0;

    return {
      ...base,
      id: base.id || itemId(item),
      name: base.name || itemName(item),
      tier,
      confidence,
      reasonCode: base.reasonCode || base.reason?.code || suggestionBlock.reasonCode || (isSuggested ? 'SUGGESTED_CHOICE' : 'PLAYER_CHOICE'),
      reasonSummary: base.reasonSummary || base.reasonText || suggestionBlock.reason || null,
      mentorIntensity: base.mentorIntensity || intensity,
      suggestion: {
        ...suggestionBlock,
        tier,
        confidence,
        reason: suggestionBlock.reason || base.reasonSummary || base.reasonText || 'it reflects the path taking shape',
      },
      reason: {
        ...(base.reason || {}),
        atoms,
      },
    };
  }

  _collectLocalSuggestions(plugin) {
    const collected = [];
    if (!plugin || typeof plugin !== 'object') return collected;

    const seen = new Set();
    const add = (candidate) => {
      if (!candidate) return;
      const key = `${normalizeKey(itemId(candidate))}:${normalizeKey(itemName(candidate, ''))}`;
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(candidate);
    };

    for (const key of Object.keys(plugin)) {
      if (!key || (!key.toLowerCase().includes('suggest') && !key.toLowerCase().includes('recommend'))) continue;
      asArray(plugin[key]).forEach(add);
    }

    for (const key of SEARCH_ARRAY_KEYS) {
      asArray(plugin[key]).forEach(candidate => {
        if (candidate?.suggestion || candidate?.reasonPacket || candidate?.mentorAtoms || candidate?.tier || candidate?.confidence) add(candidate);
      });
    }

    collected.sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a));
    return collected;
  }

  _matchSuggestion(suggestions, item, itemIdValue) {
    const list = asArray(suggestions);
    if (!list.length) return null;
    const ids = new Set([
      normalizeKey(itemIdValue),
      normalizeKey(itemId(item)),
      normalizeKey(itemName(item, '')),
    ].filter(Boolean));

    return list.find(candidate => {
      const candidateKeys = [
        candidate.id,
        candidate._id,
        candidate.key,
        candidate.slug,
        candidate.itemId,
        candidate.featId,
        candidate.talentId,
        candidate.classId,
        candidate.backgroundId,
        candidate.skillId,
        candidate.skillKey,
        candidate.suggestion?.id,
        candidate.suggestion?.itemId,
        candidate.suggestion?.key,
        candidate.name,
        candidate.label,
        candidate.title,
      ].map(normalizeKey).filter(Boolean);
      return candidateKeys.some(key => ids.has(key));
    }) || null;
  }

  _resolveItem(plugin, itemIdValue, target) {
    const normalizedId = normalizeKey(itemIdValue);
    const focused = this.shell?.focusedItem;
    if (focused && (!normalizedId || this._matchesItem(focused, normalizedId))) return focused;

    if (plugin && normalizedId) {
      const directMethods = [
        '_getFeat', '_getTalent', '_getClass', '_getBackground', '_getSpecies', '_getSkill', '_getPower',
        '_getSecret', '_getTechnique', '_getManeuver', '_getSystem', 'getItem', 'getOption', 'getById',
      ];
      for (const method of directMethods) {
        if (typeof plugin[method] !== 'function') continue;
        try {
          const result = plugin[method](itemIdValue, this.shell);
          if (result) return result;
        } catch (_) {
          // Step getters are not standardized; ignore missing incompatible signatures.
        }
      }

      const fromCollections = this._searchPluginCollections(plugin, normalizedId);
      if (fromCollections) return fromCollections;
    }

    return this._domItem(target, itemIdValue);
  }

  _searchPluginCollections(plugin, normalizedId, depth = 0, seen = new Set()) {
    if (!plugin || depth > 2) return null;

    const searchValue = (value) => {
      if (!value || typeof value !== 'object') return null;
      if (seen.has(value)) return null;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry && typeof entry === 'object' && this._matchesItem(entry, normalizedId)) return entry;
        }
        if (depth < 2) {
          for (const entry of value) {
            const nested = searchValue(entry);
            if (nested) return nested;
          }
        }
        return null;
      }

      if (value instanceof Map) {
        const byKey = value.get(normalizedId) || value.get(String(normalizedId));
        if (byKey) return byKey;
        for (const [key, entry] of value.entries()) {
          if (normalizeKey(key) === normalizedId) return entry;
          if (entry && typeof entry === 'object' && this._matchesItem(entry, normalizedId)) return entry;
        }
        return null;
      }

      if (this._matchesItem(value, normalizedId)) return value;
      return null;
    };

    for (const key of SEARCH_ARRAY_KEYS) {
      const result = searchValue(plugin[key]);
      if (result) return result;
    }

    return null;
  }

  _matchesItem(candidate, normalizedId) {
    if (!candidate || !normalizedId) return false;
    const keys = [
      itemId(candidate),
      itemName(candidate, null),
      candidate.id,
      candidate._id,
      candidate.key,
      candidate.slug,
      candidate.lookupId,
      candidate.uuid,
      candidate.name,
      candidate.label,
      candidate.title,
      candidate.system?.id,
      candidate.system?.key,
      candidate.system?.slug,
      candidate.system?.name,
      candidate.system?.label,
    ];
    return keys.map(normalizeKey).some(key => key && key === normalizedId);
  }

  _domItem(target, itemIdValue) {
    const element = target instanceof Element ? target.closest?.('[data-item-id], [data-feat-id], [data-talent-id], [data-skill], [data-skill-id], [data-power-id], [data-secret-id], [data-technique-id], [data-maneuver-id], [data-system-id], [data-class-id], [data-background-id], [data-species-id], [data-variant-id], [data-id]') || target : null;
    const dataset = element?.dataset || {};
    const name = dataset.name
      || dataset.label
      || element?.getAttribute?.('aria-label')
      || element?.querySelector?.('[data-item-name], .item-name, .option-name, .prog-choice-card__title, .feat-name, .talent-name, .skill-name')?.textContent
      || element?.textContent?.trim?.()?.split('\n')?.[0]
      || itemIdValue
      || 'this choice';
    return {
      id: itemIdValue || this._itemIdFromTarget(element),
      name: String(name || 'this choice').trim().slice(0, 80),
      tags: this._tagsFromDataset(dataset),
      dataset,
    };
  }

  _itemIdFromTarget(target) {
    const element = target instanceof Element
      ? target.closest?.('[data-item-id], [data-feat-id], [data-talent-id], [data-tree-id], [data-node-id], [data-skill], [data-skill-id], [data-skill-key], [data-power-id], [data-secret-id], [data-technique-id], [data-maneuver-id], [data-system-id], [data-species-id], [data-variant-id], [data-class-id], [data-background-id], [data-id], [data-key], [data-slug], [data-name]') || target
      : null;
    if (!element?.dataset) return null;
    for (const key of ITEM_ID_DATASET_KEYS) {
      if (element.dataset[key]) return element.dataset[key];
    }
    return null;
  }

  _targetLooksSuggested(target) {
    const element = target instanceof Element ? target : null;
    if (!element) return false;
    const row = element.closest?.('[data-suggested], .is-suggested, .suggested, [data-recommendation-tier], [data-tier]');
    return !!row && row.dataset?.suggested !== 'false';
  }

  _collectAtoms({ suggestion, item, action, stepId, isSuggested }) {
    const atoms = [];
    const add = (...values) => values.flat(Infinity).forEach(value => {
      const atom = typeof value === 'string' ? value : value?.atom || value?.key || value?.id;
      if (atom && Object.values(REASON_ATOMS).includes(atom) && !atoms.includes(atom)) atoms.push(atom);
    });

    add(
      suggestion?.mentorAtoms,
      suggestion?.reason?.atoms,
      suggestion?.suggestion?.reason?.atoms,
      suggestion?.reasonPacket?.atoms,
      suggestion?.reasonPacket?.allReasons?.flatMap(reason => reason?.atoms || []),
      suggestion?.reasons?.flatMap(reason => reason?.atoms || [])
    );

    if (action === 'commit') add(REASON_ATOMS.CommitmentDeclared);
    if (action === 'uncommit') add(REASON_ATOMS.OpportunityCostIncurred, REASON_ATOMS.ExplorationSignal);
    if (action === 'focus') add(REASON_ATOMS.ReadinessMet);
    if (isSuggested) add(REASON_ATOMS.PatternAlignment, REASON_ATOMS.SynergyPresent);

    const text = compactText(
      itemName(item, ''),
      item?.description,
      item?.summary,
      item?.system?.description,
      item?.system?.summary,
      item?.category,
      item?.type,
      item?.tags,
      item?.system?.tags,
      suggestion?.reasonText,
      suggestion?.reasonSummary,
      suggestion?.suggestion?.reason,
      stepId
    ).toLowerCase();

    if (includesAny(text, ['force', 'jedi', 'lightsaber', 'utf', 'use the force'])) add(REASON_ATOMS.GoalAdvancement, REASON_ATOMS.PatternAlignment);
    if (includesAny(text, ['dark side', 'sith', 'rage', 'fear', 'hatred'])) add(REASON_ATOMS.RiskIncreased, REASON_ATOMS.ThresholdApproaching);
    if (includesAny(text, ['defense', 'armor', 'block', 'deflect', 'resistance', 'resilience'])) add(REASON_ATOMS.RiskMitigated);
    if (includesAny(text, ['pilot', 'starship', 'vehicle', 'maneuver', 'astrogate'])) add(REASON_ATOMS.PatternAlignment, REASON_ATOMS.SynergyPresent);
    if (includesAny(text, ['prerequisite', 'requires', 'unlock', 'qualify', 'entry'])) add(REASON_ATOMS.DependencyChain);
    if (includesAny(text, ['rare', 'unusual', 'exotic', 'custom'])) add(REASON_ATOMS.RareChoice);
    if (includesAny(text, ['attack', 'weapon', 'combat', 'damage', 'feat', 'talent', 'power'])) add(REASON_ATOMS.SynergyPresent);

    if (!atoms.length) add(REASON_ATOMS.PatternAlignment, REASON_ATOMS.ReadinessMet);
    return atoms.slice(0, 4);
  }

  _tagsFromDataset(dataset = {}) {
    const raw = dataset.tags || dataset.category || dataset.type || dataset.kind || '';
    return String(raw).split(/[|,;\s]+/).map(tag => tag.trim()).filter(Boolean);
  }

  _resolveIntensity(suggestion, action, isSuggested) {
    const provided = suggestion?.mentorIntensity || suggestion?.intensity || suggestion?.suggestion?.intensity;
    if (['very_low', 'low', 'medium', 'high', 'very_high'].includes(provided)) return provided;

    const confidence = Number(suggestion?.suggestion?.confidence ?? suggestion?.confidence ?? (isSuggested ? 0.72 : 0.45)) || 0;
    const tier = Number(suggestion?.suggestion?.tier ?? suggestion?.tier ?? 0) || 0;
    let intensity = 'medium';
    if (confidence >= 0.88 || tier >= 6) intensity = 'very_high';
    else if (confidence >= 0.72 || tier >= 5) intensity = 'high';
    else if (confidence >= 0.45 || tier >= 3) intensity = 'medium';
    else if (confidence >= 0.25 || tier >= 1) intensity = 'low';
    else intensity = 'very_low';

    if (action === 'commit' && intensity === 'medium') intensity = 'high';
    if (action === 'uncommit' && intensity === 'very_high') intensity = 'high';
    return intensity;
  }


  _throttleMs({ stepId, action }) {
    const baseImportance = this._stepBaseImportance(stepId);
    if (action === 'focus') return baseImportance >= 0.75 ? 1100 : 1750;
    if (action === 'uncommit') return 700;
    return baseImportance >= 0.75 ? 350 : 550;
  }

  _stepBaseImportance(stepId) {
    if (HIGH_VALUE_STEPS.has(stepId)) return 0.9;
    if (MEDIUM_VALUE_STEPS.has(stepId)) return 0.65;
    if (STEP_TO_DOMAIN[stepId] || STEP_TO_CHOICE_TYPE[stepId]) return 0.55;
    return 0.35;
  }

  _resolveImportance({ stepId, action, suggestion, isSuggested, intensity, atoms }) {
    let score = this._stepBaseImportance(stepId);
    if (action === 'commit') score += 0.18;
    if (action === 'uncommit') score += 0.08;
    if (action === 'focus') score -= 0.18;
    if (isSuggested) score += 0.12;
    if (['high', 'very_high'].includes(intensity)) score += 0.1;
    if (['very_low', 'low'].includes(intensity)) score -= 0.08;
    if (atoms?.some?.(atom => [REASON_ATOMS.RiskIncreased, REASON_ATOMS.DependencyChain, REASON_ATOMS.RareChoice, REASON_ATOMS.ThresholdApproaching].includes(atom))) {
      score += 0.1;
    }
    const confidence = Number(suggestion?.suggestion?.confidence ?? suggestion?.confidence ?? 0) || 0;
    if (confidence >= 0.8) score += 0.08;
    return clamp01(score);
  }

  _shouldReactForTuning({ tuning, action, importance, isSuggested, intensity, atoms }) {
    if (!tuning?.mentorGuidanceEnabled || tuning?.mode === 'off') return false;
    if (action === 'focus' && tuning.focusReactionsEnabled === false) return false;
    if (tuning.mode === 'full') {
      if (action === 'focus') return importance >= 0.42 || isSuggested;
      return importance >= 0.35;
    }
    if (tuning.mode === 'important') {
      if (action === 'focus') return importance >= 0.78 || (isSuggested && importance >= 0.65);
      return importance >= 0.72
        || isSuggested
        || ['high', 'very_high'].includes(intensity)
        || atoms?.some?.(atom => [REASON_ATOMS.RiskIncreased, REASON_ATOMS.DependencyChain, REASON_ATOMS.RareChoice].includes(atom));
    }
    return false;
  }

  _moodFor(atoms, action, intensity) {
    if (atoms.some(atom => [REASON_ATOMS.RiskIncreased, REASON_ATOMS.PatternConflict, REASON_ATOMS.ReadinessLacking, REASON_ATOMS.ThresholdApproaching].includes(atom))) {
      return 'cautionary';
    }
    if (action === 'commit' && ['high', 'very_high'].includes(intensity)) return 'celebratory';
    if (action === 'commit' || atoms.includes(REASON_ATOMS.SynergyPresent)) return 'encouraging';
    return VALID_MOODS.has('neutral') ? 'neutral' : null;
  }

  _judgmentMentorName(mentorId, mentorName) {
    const token = normalizeKey(mentorId || mentorName).replace(/-/g, '_');
    if (token.includes('miraj')) return 'Miraj';
    if (token.includes('lead') || token.includes('captain') || token.includes('soldier')) return 'Lead';
    return mentorName || 'default';
  }

  _relatedGrowthFor(stepId) {
    const choiceType = STEP_TO_CHOICE_TYPE[stepId] || STEP_TO_DOMAIN[stepId] || stepId;
    return {
      species: 'your origin',
      class: 'your calling',
      ability: 'your foundations',
      attributes: 'your foundations',
      background: 'the life behind you',
      skill: 'your trained instincts',
      skills_l1: 'your trained instincts',
      feat: 'your tactical identity',
      feats: 'your tactical identity',
      talent: 'your specialization',
      talents: 'your specialization',
      force_power: 'your connection to the Force',
      forcepowers: 'your connection to the Force',
      starship_maneuver: 'your instincts in the cockpit',
    }[choiceType] || 'your path';
  }

  async _speak(text, mood) {
    const rail = this.shell?.mentorRail;
    if (!rail || !text) return;
    rail.queueSpeak?.(text, mood, { bypassSuppression: true, source: 'choice-reaction' })
      ?? void rail.speak?.(text, mood, { bypassSuppression: true, source: 'choice-reaction' });
    this._flashRail(mood);
  }

  _flashRail(mood = 'neutral') {
    const root = this.shell?.element?.querySelector?.('[data-region="mentor-rail"]');
    const rail = root?.querySelector?.('.prog-mentor-rail') || root;
    if (!rail) return;
    rail.setAttribute('data-choice-reaction', 'true');
    rail.setAttribute('data-choice-reaction-mood', mood || 'neutral');
    window.setTimeout(() => {
      rail.removeAttribute('data-choice-reaction');
      rail.removeAttribute('data-choice-reaction-mood');
    }, 850);
  }


  _recordFallbackPath(entry = {}) {
    try {
      const breadcrumb = {
        type: 'choice-reaction-fallback-path',
        ...entry,
        itemId: itemId(entry.item),
        itemName: itemName(entry.item),
        timestamp: Date.now(),
      };
      delete breadcrumb.item;
      this._lastFallbackPath = breadcrumb;
      const session = this.shell?.progressionSession;
      if (typeof session?._recordMentorDiagnostic === 'function') {
        session._recordMentorDiagnostic('fallbackPaths', breadcrumb);
      }
      if (isDebugEnabled()) {
        swseLogger.debug('[MentorChoiceReactionRouter] Fallback path used', breadcrumb);
      }
    } catch (_) {
      // Diagnostics must never affect player interaction.
    }
  }

  _recordSkippedReaction(entry = {}) {
    try {
      const breadcrumb = {
        type: 'choice-reaction-skipped',
        ...entry,
        timestamp: Date.now(),
      };
      this._lastSkippedReaction = breadcrumb;
      const session = this.shell?.progressionSession;
      if (typeof session?._recordMentorDiagnostic === 'function') {
        session._recordMentorDiagnostic('skippedReactions', breadcrumb);
      }
      if (isDebugEnabled()) {
        swseLogger.debug('[MentorChoiceReactionRouter] Reaction skipped', breadcrumb);
      }
    } catch (_) {
      // Diagnostics must never affect player interaction.
    }
  }

  _recordCoverageWarning(report) {
    try {
      const warning = {
        type: 'choice-reaction-coverage',
        missing: report.missing || [],
        requiredMissing: report.requiredMissing || [],
        total: report.total,
        covered: report.covered,
      };
      const session = this.shell?.progressionSession;
      if (typeof session?._recordMentorDiagnostic === 'function') {
        session._recordMentorDiagnostic('coverageWarnings', warning);
      }
    } catch (_) {
      // Diagnostics must never affect player interaction.
    }
  }

  _recordReactionBreadcrumb({ stepId, action, item, mentorId, atoms, intensity, importance, source, textSource }) {
    try {
      const session = this.shell?.progressionSession;
      const breadcrumb = {
        type: 'choice-reaction',
        stepId,
        action,
        itemId: itemId(item),
        itemName: itemName(item),
        mentorId,
        atoms,
        intensity,
        importance,
        source,
        textSource,
        timestamp: Date.now(),
      };
      if (typeof session?._recordMentorDiagnostic === 'function') {
        session._recordMentorDiagnostic('choiceReactions', breadcrumb);
      } else if (typeof session?.recordMentorDiagnostic === 'function') {
        session.recordMentorDiagnostic(breadcrumb);
      } else if (session) {
        if (!session.mentorDiagnostics || typeof session.mentorDiagnostics !== 'object') session.mentorDiagnostics = {};
        if (!Array.isArray(session.mentorDiagnostics.choiceReactions)) session.mentorDiagnostics.choiceReactions = [];
        session.mentorDiagnostics.choiceReactions.push(breadcrumb);
        session.mentorDiagnostics.choiceReactions = session.mentorDiagnostics.choiceReactions.slice(-25);
      }
    } catch (_) {
      // Diagnostics must never affect player interaction.
    }
  }
}

export default MentorChoiceReactionRouter;
