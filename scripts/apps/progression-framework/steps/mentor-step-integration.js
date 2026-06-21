/**
 * Mentor Step Integration
 *
 * ARCHITECTURE: Mentor Dialogue vs Suggestion Authority
 *
 * This module maintains a clean separation between two distinct mentor systems:
 *
 * 1. MENTOR DIALOGUE AUTHORITY (dialogue JSON files)
 *    - Source: data/dialogue/mentors/{mentor_id}/{mentor_id}_dialogue*.json
 *    - Contains: voice, instructions, contextual guidance, character philosophy
 *    - Used for: step guidance, mentorContext (in-character instructions)
 *    - Examples:
 *      * classGuidance - "Choose the path that aligns..."
 *      * speciesGuidance - "Yer bloodline shapes what ye can do..."
 *      * talentGuidance - "Every talent is a tool..."
 *      * levelGreetings - Achievement commentary
 *
 * 2. SUGGESTION ENGINE + ADVISORY STUB (engine + advisory JSON)
 *    - Engine: Logic that analyzes build and produces recommendations
 *    - Advisory Stub: data/dialogue/mentors/{mentor_id}/{mentor_id}_advisory_stub.json
 *    - Advisory stub contains: templates to wrap recommendations in mentor voice
 *    - Used for: "Ask Mentor" recommendations, build analysis feedback
 *    - Flow: Engine → recommendation → advisory stub template → mentor voice
 *
 * CRITICAL RULE: Do not mix these systems.
 *    ✓ Instructions come from dialogue files
 *    ✗ Do not hardcode instructions when dialogue authority exists
 *    ✓ Recommendations come from suggestion engine + advisory stub
 *    ✗ Do not author recommendations directly in dialogue files
 *
 * This allows mentor dialogue to remain consistent voice/character while
 * letting the suggestion engine be the authoritative recommendation logic.
 *
 * Common helper for step plugins to integrate with the mentor system.
 * Provides Ask Mentor functionality and guidance context.
 */

import { getMentorGuidance, getMentorForClass, MENTORS, getMentorKey, resolveMentorData } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { MentorAdvisoryCoordinator } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-advisory-coordinator.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { MentorSuggestionPickerDialog } from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-suggestion-picker-dialog.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Extract mentor ID from mentor object.
 * Uses multiple fallbacks to ensure we always have a valid ID.
 * @param {Object} mentor - The mentor object
 * @returns {string} The mentor ID (e.g., "ol_salty", "miraj")
 */
function getMentorIdFromObject(mentor) {
  if (!mentor) return 'scoundrel'; // Safe default

  // First try: direct id fields from loaded mentor data
  if (mentor.id) return mentor.id;
  if (mentor.mentorId) return mentor.mentorId;
  if (mentor.mentor_id) return mentor.mentor_id;

  // Second try: look up by name in MENTORS
  if (mentor.name) {
    const key = getMentorKey(mentor.name);
    if (key) return key.toLowerCase().replace(/\s+/g, '_');
  }

  // Third try: normalize the name directly
  if (mentor.name) {
    return mentor.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // Fallback to safe default
  return 'scoundrel';
}

/**
 * Maps step choice types to mentor guidance keys.
 * Used by step plugins to request appropriate guidance.
 */
export const STEP_TO_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'profile-class': 'class',
  'profile-archetype': 'class',
  'profile-review': 'summary',
  'attribute': 'ability',
  'ability': 'ability',
  'ability-scores': 'ability',
  'l1-survey': 'survey',
  'base-class-survey': 'survey',
  'background': 'background',
  'skills': 'skill',
  'languages': 'language',
  'general-feat': 'feat',
  'class-feat': 'feat',
  'general-talent': 'talent',
  'class-talent': 'talent',
  'force-powers': 'force_power',
  'force-secrets': 'force_secret',
  'force-techniques': 'force_technique',
  'medical-secrets': 'skill',
  'starship-maneuver': 'starship_maneuver',
  'starship-maneuvers': 'starship_maneuver',
  'summary': 'summary',
  'confirm': 'summary',
};


const MENTOR_GUIDANCE_FIELDS = {
  species: ['speciesGuidance'],
  class: ['classGuidance'],
  background: ['backgroundGuidance'],
  feat: ['featGuidance'],
  talent: ['talentGuidance'],
  ability: ['abilityGuidance', 'attributeGuidance', 'abilityScoreGuidance'],
  skill: ['skillGuidance'],
  language: ['languageGuidance'],
  force_power: ['forcePowerGuidance', 'forceGuidance'],
  force_secret: ['forceSecretGuidance', 'forcePowerGuidance', 'forceGuidance'],
  force_technique: ['forceTechniqueGuidance', 'forcePowerGuidance', 'forceGuidance'],
  starship_maneuver: ['starshipManeuverGuidance', 'starshipGuidance', 'pilotGuidance'],
  summary: ['summaryGuidance'],
  survey: ['surveyGuidance', 'classGuidance'],
};

const REQUIRED_MENTOR_STEP_TYPES = [
  'species',
  'class',
  'background',
  'ability',
  'skill',
  'language',
  'feat',
  'talent',
  'force_power',
  'starship_maneuver',
  'summary',
  'survey',
];

const _mentorDiagnosticsState = {
  registryValidated: false,
  warnedKeys: new Set(),
  missingDialogueKeys: new Set(),
};

function _warnOnce(key, message, payload = null) {
  const warnKey = String(key || message || 'mentor-warning');
  if (_mentorDiagnosticsState.warnedKeys.has(warnKey)) return;
  _mentorDiagnosticsState.warnedKeys.add(warnKey);
  if (payload !== null && payload !== undefined) swseLogger.warn(message, payload);
  else swseLogger.warn(message);
}

function _readGuidanceField(mentor, fieldNames = []) {
  if (!mentor) return '';
  for (const fieldName of fieldNames) {
    const text = String(mentor?.[fieldName] || '').trim();
    if (text) return text;
  }
  return '';
}

function _guidanceFieldCandidates(choiceType) {
  const key = String(choiceType || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return MENTOR_GUIDANCE_FIELDS[key] || [];
}

function _hasAnyGenericGuidance(mentor) {
  return !!String(mentor?.summaryGuidance || mentor?.classGuidance || mentor?.surveyGuidance || '').trim();
}

/**
 * Validate mentor dialogue shape once per client session. This is intentionally
 * non-blocking: bad or incomplete dialogue data should produce diagnostics, not
 * break progression. The report is useful when a mentor appears to be speaking
 * generic lines too often.
 *
 * @param {Object} options
 * @param {boolean} options.force - Re-run even if validation already happened
 * @param {boolean} options.log - Emit a summarized warning/debug message
 * @returns {Object} coverage report
 */
export function validateMentorDialogueRegistry(options = {}) {
  const { force = false, log = true } = options;
  if (_mentorDiagnosticsState.registryValidated && !force) {
    return getMentorDialogueCoverageReport();
  }

  _mentorDiagnosticsState.registryValidated = true;
  const report = getMentorDialogueCoverageReport();
  if (!log) return report;

  if (report.missingGeneric.length || report.missingRequiredGuidance.length || report.missingPortrait.length) {
    _warnOnce('mentor-dialogue-registry-coverage', '[MentorStepIntegration] Mentor dialogue registry has coverage gaps; mentor identity will be preserved and same-mentor/neutral lines will be used as needed.', {
      mentorsChecked: report.mentorsChecked,
      missingGenericCount: report.missingGeneric.length,
      missingRequiredGuidanceCount: report.missingRequiredGuidance.length,
      missingPortraitCount: report.missingPortrait.length,
      sampleMissingRequiredGuidance: report.missingRequiredGuidance.slice(0, 12),
    });
  } else {
    swseLogger.debug?.('[MentorStepIntegration] Mentor dialogue registry coverage validated', {
      mentorsChecked: report.mentorsChecked,
      requiredStepTypes: REQUIRED_MENTOR_STEP_TYPES,
    });
  }

  return report;
}

/**
 * Build a non-mutating dialogue coverage report for developer diagnostics.
 * @returns {Object}
 */
export function getMentorDialogueCoverageReport() {
  const missingGeneric = [];
  const missingRequiredGuidance = [];
  const missingPortrait = [];
  const mentorKeys = Object.keys(MENTORS || {});

  for (const [mentorKey, mentor] of Object.entries(MENTORS || {})) {
    if (!mentor?.portrait) missingPortrait.push({ mentorKey, mentorName: mentor?.name || mentorKey });
    if (!_hasAnyGenericGuidance(mentor)) missingGeneric.push({ mentorKey, mentorName: mentor?.name || mentorKey });

    for (const choiceType of REQUIRED_MENTOR_STEP_TYPES) {
      const fields = _guidanceFieldCandidates(choiceType);
      if (!fields.length) continue;
      if (!_readGuidanceField(mentor, fields) && !_hasAnyGenericGuidance(mentor)) {
        missingRequiredGuidance.push({ mentorKey, mentorName: mentor?.name || mentorKey, choiceType, attemptedFields: fields });
      }
    }
  }

  return {
    mentorsChecked: mentorKeys.length,
    requiredStepTypes: [...REQUIRED_MENTOR_STEP_TYPES],
    missingGeneric,
    missingRequiredGuidance,
    missingPortrait,
  };
}

/**
 * Get the mentor object for the current actor/class.
 * Falls back to Scoundrel's Ol' Salty if class unknown.
 *
 * @param {Actor} actor - The actor being created
 * @returns {Object|null} The mentor data object
 */
function _readFlag(actor, namespace, key) {
  try {
    return actor?.getFlag?.(namespace, key) || null;
  } catch (_err) {
    return null;
  }
}

function _sameActor(a, b) {
  if (!a || !b) return false;
  return (a.id && b.id && a.id === b.id) || (a.uuid && b.uuid && a.uuid === b.uuid);
}

function _getActiveProgressionShell(actor, shell = null) {
  if (shell) return shell;
  const active = globalThis.game?.__swseActiveProgressionShell || null;
  if (!active) return null;
  if (!actor || _sameActor(active.actor, actor)) return active;
  return null;
}

function _classNameFrom(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value !== 'object') return null;

  const direct = value.name
    || value.className
    || value.label
    || value.title
    || value.id
    || value.classId
    || null;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  return _classNameFrom(value.classData)
    || _classNameFrom(value.system?.class)
    || _classNameFrom(value.system?.class?.primary)
    || null;
}

function _actorPrimaryClassName(actor) {
  return _classNameFrom(actor?.system?.class?.primary)
    || _classNameFrom(actor?.system?.details?.class)
    || _classNameFrom(actor?.system?.classes?.primary)
    || _classNameFrom(actor?.system?.class)
    || _readFlag(actor, 'foundryvtt-swse', 'startingClass')
    || _readFlag(actor, 'foundryvtt-swse', 'level1Class')
    || _readFlag(actor, 'swse', 'startingClass')
    || _readFlag(actor, 'swse', 'level1Class')
    || null;
}

function _normalizeMentorToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/["'`.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function _isScoundrelFallbackFor(className, mentorKey) {
  if (!className || !mentorKey) return false;
  const classToken = _normalizeMentorToken(className);
  const mentorToken = _normalizeMentorToken(mentorKey);
  return mentorToken === 'scoundrel' && !['scoundrel', 'ol_salty', 'ol_salty'].includes(classToken);
}

function _resolveMentorForClassName(className) {
  if (!className) return null;

  const mentor = resolveMentorData(className) || getMentorForClass(className);
  const mentorKey = getMentorKey(mentor || className);

  // getMentorForClass intentionally falls back to Scoundrel. Keep that final
  // fallback, but mark it low confidence so it cannot overwrite a known mentor.
  if (_isScoundrelFallbackFor(className, mentorKey)) {
    return { mentor, mentorKey, isExact: false };
  }

  return { mentor, mentorKey, isExact: !!mentor };
}

function _buildMentorContext({ mentor, mentorKey, className = null, stepId = null, source = 'fallback', confidence = 0.25, reason = null, fallback = false } = {}) {
  const resolvedMentor = mentor || resolveMentorData('Scoundrel') || MENTORS.Scoundrel || Object.values(MENTORS)[0] || null;
  const resolvedKey = mentorKey || getMentorKey(resolvedMentor || 'Scoundrel');
  return {
    mentorId: resolvedKey,
    mentorKey: resolvedKey,
    className: className || null,
    stepId: stepId || null,
    source,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : 0.25,
    reason: reason || source,
    fallback: !!fallback,
    lastResolvedAt: Date.now(),
    mentor: resolvedMentor,
  };
}

function _getSessionMentorContext(shell = null) {
  return shell?.progressionSession?.getMentorContext?.()
    || shell?.progressionSession?.mentorContext
    || shell?.mentorContext
    || null;
}

function _writeSessionMentorContext(shell = null, context = null, options = {}) {
  if (!shell || !context) return context;
  if (typeof shell.progressionSession?.updateMentorContext === 'function') {
    return shell.progressionSession.updateMentorContext(context, options);
  }
  if (shell.progressionSession) {
    shell.progressionSession.mentorContext = context;
  } else {
    shell.mentorContext = context;
  }
  return context;
}

function _sourcePriority(source) {
  const priorities = {
    'manual': 100,
    'class-selection': 95,
    'profile-selection': 94,
    'session': 90,
    'prestige-selection': 88,
    'draftSelections.class': 85,
    'committedSelections.class': 80,
    'buildIntent.class': 72,
    'projection.class': 68,
    'actorSnapshot.class': 62,
    'actor.class': 58,
    'focused-class': 50,
    'build-intent-signal': 42,
    'fallback': 10,
  };
  return priorities[source] ?? 30;
}

function _shouldKeepExistingMentor(existing = null, next = null) {
  if (!existing || !next) return false;
  if (next.source === 'manual' || next.source === 'class-selection' || next.source === 'prestige-selection') return false;

  const existingConfidence = Number(existing.confidence ?? 0) || 0;
  const nextConfidence = Number(next.confidence ?? 0) || 0;
  const existingSource = String(existing.source || '');

  if (existingConfidence >= 0.85 && nextConfidence < 0.65) return true;
  if (existingSource === 'class-selection' && next.fallback === true) return true;
  if (existing.className && next.className && _normalizeMentorToken(existing.className) === _normalizeMentorToken(next.className)) {
    return _sourcePriority(existing.source) >= _sourcePriority(next.source) && existingConfidence >= nextConfidence;
  }

  return false;
}

function _extractMentorContextFromSession(shell = null, stepId = null) {
  const existing = _getSessionMentorContext(shell);
  if (!existing?.mentorId && !existing?.mentorKey) return null;
  const mentor = existing.mentor || resolveMentorData(existing.mentorId || existing.mentorKey);
  if (!mentor) return null;
  return _buildMentorContext({
    mentor,
    mentorKey: existing.mentorKey || existing.mentorId || getMentorKey(mentor),
    className: existing.className || null,
    stepId,
    source: 'session',
    confidence: Math.max(Number(existing.confidence ?? 0.9) || 0.9, 0.9),
    reason: existing.reason || 'existing mentorContext',
    fallback: existing.fallback === true,
  });
}

function _candidateContextFromClass(classValue, source, stepId) {
  const className = _classNameFrom(classValue);
  if (!className) return null;
  const resolved = _resolveMentorForClassName(className);
  if (!resolved?.mentor) return null;

  const exactConfidence = {
    'class-selection': 0.98,
    'draftSelections.class': 0.94,
    'committedSelections.class': 0.92,
    'buildIntent.class': 0.82,
    'projection.class': 0.78,
    'actorSnapshot.class': 0.72,
    'actor.class': 0.70,
    'focused-class': 0.50,
  }[source] ?? 0.65;

  return _buildMentorContext({
    mentor: resolved.mentor,
    mentorKey: resolved.mentorKey,
    className,
    stepId,
    source,
    confidence: resolved.isExact ? exactConfidence : 0.28,
    reason: resolved.isExact ? `resolved from ${source}` : `Scoundrel fallback for unknown class ${className}`,
    fallback: !resolved.isExact,
  });
}

function _classSignalFromBuildIntent(shell = null) {
  const signals = [
    shell?.buildIntent?.primaryArchetype,
    shell?.buildIntent?.archetype,
    shell?.buildIntent?.intent,
    shell?.progressionSession?.draftSelections?.survey?.archetype,
    shell?.progressionSession?.draftSelections?.survey?.path,
  ].map(v => String(v || '').toLowerCase()).join(' ');

  if (/force|jedi|sith|lightsaber|wisdom|charisma/.test(signals)) return 'Jedi';
  if (/soldier|martial|weapon|armor|combat|trooper/.test(signals)) return 'Soldier';
  if (/scout|survival|wilderness|explor/.test(signals)) return 'Scout';
  if (/noble|leader|diplomat|social|command/.test(signals)) return 'Noble';
  if (/scoundrel|rogue|pilot|sneak|trick|criminal/.test(signals)) return 'Scoundrel';
  return null;
}

function _directGuidanceForMentor(mentor, choiceType) {
  if (!mentor) return '';
  return _readGuidanceField(mentor, _guidanceFieldCandidates(choiceType));
}

function _sameMentorGenericGuidance(mentor, choiceType) {
  if (!mentor) return '';
  const preferred = [
    ...(_guidanceFieldCandidates(choiceType) || []),
    'summaryGuidance',
    'classGuidance',
    'surveyGuidance',
  ];
  return _readGuidanceField(mentor, [...new Set(preferred)]);
}

function _genericStepGuidance(stepId, choiceType) {
  const stepLabel = String(stepId || choiceType || 'this step').replace(/[-_]+/g, ' ');
  const byType = {
    species: 'Your species shapes your first strengths, instincts, and opportunities. Choose the origin that fits the story you want to tell.',
    class: 'Your class defines your first lane of play. Pick the path that matches how you want to solve problems at the table.',
    background: 'A background should explain where your character learned to move through the galaxy before the campaign began.',
    ability: 'Ability scores are the foundation. Favor the abilities that support the role you want to play most often.',
    skill: 'Train skills that your character will actually lean on when danger, mystery, or negotiation starts.',
    language: 'Languages are access. Choose the tongues most likely to open doors, decode trouble, or fit your origin.',
    feat: 'Feats are commitments. Pick one that strengthens the character you are already becoming.',
    talent: 'Talents define your style inside the class. Choose the one you will be excited to use at the table.',
    force_power: 'Force powers are tools under pressure. Choose options that match how your character reaches for the Force.',
    force_secret: 'Force secrets refine power into mastery. Choose the lesson that fits the way your character uses the Force.',
    force_technique: 'Force techniques shape how your discipline expresses itself. Choose the refinement that fits your path.',
    starship_maneuver: 'Starship maneuvers define how you move when the fight leaves the ground. Choose what you will actually use in a chase or dogfight.',
    summary: 'Review the build as a whole. Make sure the choices still tell the character story you meant to create.',
    survey: 'Answer from instinct. The system can build around a clear character impulse better than a perfect spreadsheet answer.',
  };
  return byType[choiceType] || `You are at the ${stepLabel} step. Keep the choice aligned with your character concept.`;
}

function _getMentorClassName(actor, shell = null) {
  const liveShell = _getActiveProgressionShell(actor, shell);
  const currentStepId = liveShell?.currentDescriptor?.stepId || liveShell?.steps?.[liveShell?.currentStepIndex]?.stepId || null;
  const focusedClass = currentStepId === 'class' ? liveShell?.focusedItem : null;

  const candidates = [
    liveShell?.progressionSession?.getSelection?.('class'),
    liveShell?.progressionSession?.draftSelections?.class,
    liveShell?.committedSelections?.get?.('class'),
    liveShell?.buildIntent?.getSelection?.('class'),
    liveShell?.progressionSession?.currentProjection?.identity?.class,
    liveShell?.progressionSession?.projectedCharacter?.identity?.class,
    liveShell?.progressionSession?.actorSnapshot?.className,
    focusedClass,
    _actorPrimaryClassName(actor),
  ];

  for (const candidate of candidates) {
    const className = _classNameFrom(candidate);
    if (className) return className;
  }

  return null;
}

/**
 * Resolve the mentor object for the current actor/class/session.
 *
 * Important: during chargen the live Actor normally has no class item yet. The
 * selected class lives in ProgressionSession.draftSelections, so callers must
 * pass the active shell. For legacy callers that omit shell, this helper also
 * checks the active progression shell for the same actor before falling back to
 * actor flags/live data.
 *
 * @param {Actor} actor - The actor being created or advanced
 * @param {import('../shell/progression-shell.js').ProgressionShell|null} shell
 * @returns {Object|null} The mentor data object
 */
export function resolveStepMentorContext(actor, shell = null, options = {}) {
  validateMentorDialogueRegistry({ log: options.validateRegistry !== false });

  const liveShell = _getActiveProgressionShell(actor, shell);
  const stepId = options.stepId
    || liveShell?.currentDescriptor?.stepId
    || liveShell?.steps?.[liveShell?.currentStepIndex]?.stepId
    || null;
  const currentStepId = stepId;
  const allowFocusedClass = options.allowFocusedClass ?? currentStepId === 'class';
  const focusedClass = allowFocusedClass ? liveShell?.focusedItem : null;

  const classCandidates = [
    [liveShell?.progressionSession?.getSelection?.('class'), 'draftSelections.class'],
    [liveShell?.progressionSession?.draftSelections?.class, 'draftSelections.class'],
    [liveShell?.committedSelections?.get?.('class'), 'committedSelections.class'],
    [liveShell?.buildIntent?.getSelection?.('class'), 'buildIntent.class'],
    [liveShell?.progressionSession?.currentProjection?.identity?.class, 'projection.class'],
    [liveShell?.progressionSession?.projectedCharacter?.identity?.class, 'projection.class'],
    [liveShell?.progressionSession?.actorSnapshot?.className, 'actorSnapshot.class'],
    [focusedClass, 'focused-class'],
    [_actorPrimaryClassName(actor), 'actor.class'],
  ];

  let best = null;
  for (const [value, source] of classCandidates) {
    const context = _candidateContextFromClass(value, source, stepId);
    if (!context) continue;
    if (!best || context.confidence > best.confidence || _sourcePriority(context.source) > _sourcePriority(best.source)) {
      best = context;
    }
    if (context.confidence >= 0.9 && context.fallback !== true) break;
  }

  if (!best) {
    const signaledClass = _classSignalFromBuildIntent(liveShell);
    best = _candidateContextFromClass(signaledClass, 'build-intent-signal', stepId);
  }

  if (!best) {
    best = _extractMentorContextFromSession(liveShell, stepId);
  }

  if (!best) {
    best = _buildMentorContext({
      mentor: resolveMentorData('Scoundrel') || MENTORS.Scoundrel || Object.values(MENTORS)[0],
      mentorKey: 'Scoundrel',
      stepId,
      source: 'fallback',
      confidence: 0.15,
      reason: 'no class or intent context available',
      fallback: true,
    });
  }

  const existing = _getSessionMentorContext(liveShell);
  let finalContext = best;
  if (!options.force && _shouldKeepExistingMentor(existing, best)) {
    const mentor = existing.mentor || resolveMentorData(existing.mentorId || existing.mentorKey);
    finalContext = _buildMentorContext({
      mentor,
      mentorKey: existing.mentorKey || existing.mentorId || getMentorKey(mentor),
      className: existing.className || best.className || null,
      stepId,
      source: existing.source || 'session',
      confidence: Math.max(Number(existing.confidence ?? 0) || 0, Number(best.confidence ?? 0) || 0),
      reason: `kept existing mentorContext over ${best.source}`,
      fallback: existing.fallback === true,
    });
  }

  const written = _writeSessionMentorContext(liveShell, finalContext, {
    force: options.force === true || ['manual', 'class-selection', 'prestige-selection'].includes(finalContext.source),
  }) || finalContext;

  if (best.fallback === true || finalContext.fallback === true) {
    _warnOnce(`mentor-identity-fallback:${stepId || 'unknown'}:${best.source}:${best.className || 'none'}`, '[MentorStepIntegration] Mentor identity resolved through fallback', {
      stepId,
      source: best.source,
      className: best.className,
      mentorId: best.mentorId,
      confidence: best.confidence,
      reason: best.reason,
    });
  } else {
    swseLogger.debug?.('[MentorStepIntegration] Mentor context resolved', {
      stepId,
      source: written.source,
      className: written.className,
      mentorId: written.mentorId,
      confidence: written.confidence,
    });
  }

  return written;
}

export function setSessionMentorContext(shell, context = {}, options = {}) {
  if (!shell) return null;
  const mentor = context.mentor || resolveMentorData(context.mentorId || context.mentorKey || context.className || 'Scoundrel');
  const mentorKey = context.mentorKey || context.mentorId || getMentorKey(mentor || context.className || 'Scoundrel');
  const next = _buildMentorContext({
    mentor,
    mentorKey,
    className: context.className || null,
    stepId: context.stepId || shell?.currentDescriptor?.stepId || null,
    source: context.source || 'manual',
    confidence: context.confidence ?? 1,
    reason: context.reason || 'explicit mentor context update',
    fallback: context.fallback === true,
  });
  return _writeSessionMentorContext(shell, next, { force: options.force !== false });
}

/**
 * Resolve the mentor object for the current actor/class/session.
 *
 * Important: during chargen the live Actor normally has no class item yet. The
 * selected class lives in ProgressionSession.draftSelections, so callers must
 * pass the active shell. For legacy callers that omit shell, this helper also
 * checks the active progression shell for the same actor before falling back to
 * actor flags/live data.
 *
 * @param {Actor} actor - The actor being created or advanced
 * @param {import('../shell/progression-shell.js').ProgressionShell|null} shell
 * @returns {Object|null} The mentor data object
 */
export function getStepMentorObject(actor, shell = null) {
  return resolveStepMentorContext(actor, shell)?.mentor
    || resolveMentorData('Scoundrel')
    || MENTORS.Scoundrel
    || Object.values(MENTORS)[0];
}

export function resolveStepMentorGuidance(actor, stepId, shell = null, options = {}) {
  const context = resolveStepMentorContext(actor, shell, { ...options, stepId });
  const mentor = context?.mentor || getStepMentorObject(actor, shell);
  const choiceType = STEP_TO_CHOICE_TYPE[stepId];

  if (!mentor) {
    return {
      mentor: null,
      mentorContext: context,
      choiceType,
      text: _genericStepGuidance(stepId, choiceType),
      textSource: 'neutral-generic',
    };
  }

  const direct = choiceType ? _directGuidanceForMentor(mentor, choiceType) : '';
  if (direct) {
    return { mentor, mentorContext: context, choiceType, text: direct, textSource: 'mentor-step-direct' };
  }

  const attemptedFields = _guidanceFieldCandidates(choiceType);
  const missingKey = `${context?.mentorId || mentor?.name || 'unknown'}:${stepId || 'unknown'}:${choiceType || 'unknown'}`;
  const genericForMentor = _sameMentorGenericGuidance(mentor, choiceType);
  if (genericForMentor) {
    _mentorDiagnosticsState.missingDialogueKeys.add(missingKey);
    _warnOnce(`mentor-missing-step-dialogue:${missingKey}`, '[MentorStepIntegration] Missing mentor dialogue for step; using same-mentor generic guidance', {
      mentorId: context?.mentorId,
      mentorName: mentor.name,
      className: context?.className,
      stepId,
      choiceType,
      attemptedFields,
      textSource: 'mentor-generic',
    });
    return { mentor, mentorContext: context, choiceType, text: genericForMentor, textSource: 'mentor-generic', attemptedFields };
  }

  const neutral = _genericStepGuidance(stepId, choiceType);
  _mentorDiagnosticsState.missingDialogueKeys.add(missingKey);
  _warnOnce(`mentor-missing-generic-dialogue:${missingKey}`, '[MentorStepIntegration] Missing mentor generic dialogue; using neutral progression guidance', {
    mentorId: context?.mentorId,
    mentorName: mentor.name,
    className: context?.className,
    stepId,
    choiceType,
    attemptedFields,
    textSource: 'neutral-generic',
  });
  return { mentor, mentorContext: context, choiceType, text: neutral, textSource: 'neutral-generic', attemptedFields };
}

/**
 * Get guidance text for a step.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @returns {string} The guidance text
 */
export function getStepGuidance(actor, stepId, shell = null) {
  return resolveStepMentorGuidance(actor, stepId, shell)?.text || 'Make your choice wisely.';
}

/**
 * Prepare Ask Mentor handler for a step plugin.
 * Call this in onStepEnter() to set up mentor integration.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @param {import('./shell/progression-shell.js').ProgressionShell} shell - The progression shell
 * @returns {Promise<void>}
 */
export async function handleAskMentor(actor, stepId, shell) {
  const mentor = getStepMentorObject(actor, shell);
  const guidance = getStepGuidance(actor, stepId, shell);

  if (guidance && shell?.mentorRail) {
    shell.mentorRail.queueSpeak?.(guidance, 'encouraging', { source: 'mentor-step-integration' }) ?? void shell.mentorRail.speak?.(guidance, 'encouraging');
  }
}

/**
 * Get step context message that uses mentor guidance.
 * Suitable for getMentorContext() implementation.
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID
 * @param {string} fallback - Fallback message if no guidance found
 * @returns {string} The context message
 */
export function getStepMentorContext(actor, stepId, fallback = '', shell = null) {
  const guidance = getStepGuidance(actor, stepId, shell);
  return guidance || fallback || 'Make your choice wisely.';
}

/**
 * Phase 8: Handle Ask Mentor with suggestion advisory.
 * Gets suggestions from a step, formats them as mentor dialogue, and speaks them.
 *
 * This is the preferred Ask Mentor handler for steps with suggestions.
 * Steps call this instead of handleAskMentor when they have _suggestedXXX data.
 *
 * Flow: suggestions → MentorAdvisoryCoordinator.generateSuggestionAdvisory()
 *       → mentor advisory object → mentorRail.speak()
 *
 * @param {Actor} actor - The actor being created
 * @param {string} stepId - The step ID (for context/fallback)
 * @param {Array} suggestions - Suggestion objects from SuggestionService
 * @param {import('./shell/progression-shell.js').ProgressionShell} shell - The progression shell
 * @param {Object} context - Additional context (domain, archetype, relatedGrowth, etc.)
 * @returns {Promise<void>}
 */
export async function handleAskMentorWithSuggestions(actor, stepId, suggestions, shell, context = {}) {
  try {
    if (!shell?.mentorRail) return;

    // Get mentor ID from actor/class
    const mentor = getStepMentorObject(actor, shell);
    if (!mentor) return;

    // Get mentor ID from the mentor object with robust fallback chain
    let mentorId = getMentorIdFromObject(mentor);

    // Generate suggestion advisory
    const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
      actor,
      mentorId,
      suggestions || [],
      {
        stepId,
        domain: context.domain || stepId,
        archetype: context.archetype || 'your path',
        relatedGrowth: context.relatedGrowth || 'further growth',
        ...context
      }
    );

    if (advisory) {
      // Speak the advisory through mentor rail with mood based on confidence
      const advisoryText = `${advisory.observation} ${advisory.impact} ${advisory.guidance}`;
      const mood = advisory.mood || 'encouraging'; // Use confidence-based mood from advisor
      shell.mentorRail.queueSpeak?.(advisoryText, mood, { source: 'mentor-advisory' }) ?? void shell.mentorRail.speak?.(advisoryText, mood);

      swseLogger.log(
        `[MentorStepIntegration] Spoke suggestion advisory for ${stepId} (${suggestions.length} suggestions, mood: ${mood})`
      );
    } else {
      // Fallback to standard guidance if no advisory generated
      const guidance = getStepGuidance(actor, stepId, shell);
      if (guidance) {
        shell.mentorRail.queueSpeak?.(guidance, 'encouraging', { source: 'mentor-step-integration' }) ?? void shell.mentorRail.speak?.(guidance, 'encouraging');
      }
    }
  } catch (err) {
    swseLogger.warn('[MentorStepIntegration] Error in handleAskMentorWithSuggestions:', err);
    // Fallback to standard guidance on error
    const guidance = getStepGuidance(actor, stepId, shell);
    if (guidance && shell?.mentorRail) {
      shell.mentorRail.queueSpeak?.(guidance, 'encouraging', { source: 'mentor-step-integration' }) ?? void shell.mentorRail.speak?.(guidance, 'encouraging');
    }
  }
}


function hasPickerSuggestionSignal(entry = {}) {
  const tier = Number(entry?.suggestion?.tier ?? entry?.tier ?? 0) || 0;
  if (tier > 0) return true;

  // Some early chargen domains, especially Species, intentionally produce
  // curated opening recommendations before the build has enough signal for a
  // formal tier. Those entries carry confidence/reasons instead of tier. The
  // Ask Mentor picker should still open for them instead of silently falling
  // back to plain rail dialogue.
  const confidence = Number(entry?.suggestion?.confidence ?? entry?.confidence ?? 0) || 0;
  if (confidence > 0) return true;

  if (entry?.suggestion?.curatedOpening === true || entry?.curatedOpening === true) return true;
  if (Array.isArray(entry?.suggestion?.reasons) && entry.suggestion.reasons.length > 0) return true;
  if (Array.isArray(entry?.reasons) && entry.reasons.length > 0) return true;
  if (entry?.suggestion?.reason || entry?.reason || entry?.reasonSummary || entry?.reasonText) return true;

  return false;
}

function sortSuggestionsForPicker(suggestions = []) {
  return SuggestionService.sortBySuggestion(suggestions || []).filter(hasPickerSuggestionSignal);
}

function humanizeStepLabel(stepId) {
  return String(stepId || 'this step').replace(/[-_]+/g, ' ');
}

export async function handleAskMentorWithPicker(actor, stepId, suggestions, shell, context = {}, applySuggestion = null) {
  try {
    const rankedSuggestions = sortSuggestionsForPicker(suggestions).slice(0, context.limit ?? 5);
    if (!rankedSuggestions.length) {
      await handleAskMentor(actor, stepId, shell);
      return null;
    }

    const mentor = getStepMentorObject(actor, shell);
    if (!mentor) {
      await handleAskMentor(actor, stepId, shell);
      return null;
    }

    let mentorId = getMentorIdFromObject(mentor);
    const advisory = await MentorAdvisoryCoordinator.generateSuggestionAdvisory(
      actor,
      mentorId,
      rankedSuggestions,
      {
        stepId,
        domain: context.domain || stepId,
        archetype: context.archetype || 'your path',
        relatedGrowth: context.relatedGrowth || 'future growth',
        ...context,
      }
    );

    const selected = await MentorSuggestionPickerDialog.show({
      mentor,
      advisory,
      suggestions: rankedSuggestions,
      stepLabel: context.stepLabel || humanizeStepLabel(stepId),
      title: `${mentor.name || 'Mentor'}'s Top Picks`,
    });

    if (selected && typeof applySuggestion === 'function') {
      await applySuggestion(selected);
    }

    return selected;
  } catch (err) {
    swseLogger.warn('[MentorStepIntegration] Error in handleAskMentorWithPicker:', err);
    await handleAskMentor(actor, stepId, shell);
    return null;
  }
}
