/**
 * PrestigeSurveyStep
 *
 * Phase 1 prestige survey framework.
 * Runs only when level-up selects a new prestige class. The survey is treated as
 * an advanced identity calibration: it prunes stale base-class/L1 bias, captures
 * Dip/Dive/Swim/Bridge commitment depth, biases the upcoming talent step toward
 * the chosen prestige specialization, and asks the player to confirm or correct
 * the mentor's reading of the build so far.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepMentorObject } from './mentor-step-integration.js';
import {
  getPrestigeSurveyDefinition,
  buildSurveyStepData,
  convertSurveyAnswersToBias,
  extractSurveyIntentTags,
  processSurveyAnswers,
} from '/systems/foundryvtt-swse/scripts/apps/mentor/mentor-survey.js';
import { resolveClassModel } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { getMentorForClass, getMentorKey, getMentorIntroText } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const MAX_CHARACTER_LEVEL = 20;
const INTERMEDIARY_PRESTIGE_CLASS_IDS = new Set(['jedi_knight', 'sith_apprentice', 'force_adept']);
const ASCENSION_TRANSITIONS = {
  jedi_knight: 'jedi_master',
  sith_apprentice: 'sith_lord',
  force_adept: 'force_disciple',
};
const ASCENSION_IDS = {
  'jedi_knight_to_jedi_master': 'jediMasterAscension',
  'sith_apprentice_to_sith_lord': 'sithLordAscension',
  'force_adept_to_force_disciple': 'forceDiscipleAscension',
};


function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function getActorClassItems(actor) {
  return actor?.items?.filter?.((item) => item?.type === 'class') || [];
}

function getClassLevel(item) {
  return Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? 1) || 1;
}

function getActorLevel(actor) {
  return Number(actor?.system?.level ?? actor?.system?.details?.level ?? 1) || 1;
}

function buildMentorPortraitMarkup(portrait, mentorName) {
  const safeName = escapeHtml(mentorName || 'Mentor');
  const safePortrait = escapeHtml(portrait || 'systems/foundryvtt-swse/assets/mentors/salty.png');
  return `<img class="prog-l1-survey-stage__mentor-image prog-holo-media__image" src="${safePortrait}" alt="${safeName}" title="${safeName}" onerror="this.onerror=null; this.src='systems/foundryvtt-swse/assets/mentors/salty.png';"/>`;
}

function buildProgressDots(totalQuestions, activeIndex, answeredCount, phase) {
  return Array.from({ length: Math.max(totalQuestions, 0) }, (_, index) => ({
    index: index + 1,
    isDone: index < answeredCount,
    isActive: phase !== 'complete' && index === activeIndex,
  }));
}

function summarizeBiasLayer(layer, prefix) {
  return Object.entries(layer || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 3)
    .map(([key]) => ({
      label: `${prefix}: ${String(key).replace(/[_-]+/g, ' ').replace(/(^|\s)\w/g, (m) => m.toUpperCase())}`,
      cssClass: `is-${prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    }));
}

function clonePlain(value) {
  try {
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value ?? {}));
  } catch (_err) {
    return JSON.parse(JSON.stringify(value ?? {}));
  }
}

function addWeighted(target, key, amount = 1) {
  if (!key) return;
  target[key] = (target[key] || 0) + Number(amount || 0);
}

function scaleWeightedMap(map, multiplier) {
  return Object.entries(map || {}).reduce((out, [key, value]) => {
    const scaled = Number(value || 0) * Number(multiplier || 0);
    if (scaled > 0) out[key] = scaled;
    return out;
  }, {});
}

function sortedKeys(map) {
  return Object.entries(map || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .map(([key]) => key);
}

function mergeWeightedMap(oldMap, newMap, oldMultiplier, newMultiplier) {
  const out = { ...scaleWeightedMap(oldMap, oldMultiplier) };
  for (const [key, value] of Object.entries(newMap || {})) {
    addWeighted(out, key, Number(value || 0) * Number(newMultiplier || 1));
  }
  return out;
}

function includesAny(text, needles) {
  const lower = String(text || '').toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function strongestLabel(weights, fallback) {
  const [key] = Object.entries(weights || {}).sort((a, b) => b[1] - a[1])?.[0] || [];
  return key || fallback;
}

function titleFromKey(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

function analyzeProfileReading(actor, selectedClass) {
  const classItems = getActorClassItems(actor);
  const items = actor?.items?.contents || actor?.items || [];
  const names = [
    ...classItems.map((item) => item.name),
    ...(items || []).filter((item) => ['feat', 'talent', 'weapon', 'equipment'].includes(item?.type)).map((item) => item.name),
    selectedClass?.name,
  ].filter(Boolean).join(' | ');

  const trainedSkillNames = [];
  const skillData = actor?.system?.skills || {};
  for (const [key, value] of Object.entries(skillData || {})) {
    if (value?.trained || value?.isTrained || value?.rank || value?.value > 0) trainedSkillNames.push(key);
  }
  const skillText = trainedSkillNames.join(' | ');

  const combat = {};
  const noncombat = {};

  if (includesAny(names, ['jedi', 'sith', 'force', 'lightsaber'])) {
    combat['Force-guided combat'] = (combat['Force-guided combat'] || 0) + 4;
    noncombat['Force insight and personal discipline'] = (noncombat['Force insight and personal discipline'] || 0) + 3;
  }
  if (includesAny(names, ['soldier', 'elite trooper', 'armor', 'toughness', 'weapon focus', 'martial'])) {
    combat['durable frontline fighting'] = (combat['durable frontline fighting'] || 0) + 4;
  }
  if (includesAny(names, ['gunslinger', 'pistol', 'rifle', 'blaster', 'ace pilot'])) {
    combat['fast ranged pressure'] = (combat['fast ranged pressure'] || 0) + 4;
  }
  if (includesAny(names, ['scoundrel', 'assassin', 'bounty hunter', 'infiltrator', 'sneak', 'stealth'])) {
    combat['precision and opportunistic strikes'] = (combat['precision and opportunistic strikes'] || 0) + 4;
    noncombat['covert problem-solving and underworld instincts'] = (noncombat['covert problem-solving and underworld instincts'] || 0) + 3;
  }
  if (includesAny(names, ['scout', 'pathfinder', 'vanguard', 'survival', 'mobility'])) {
    combat['mobility, awareness, and battlefield positioning'] = (combat['mobility, awareness, and battlefield positioning'] || 0) + 3;
    noncombat['exploration, survival, and reading the terrain'] = (noncombat['exploration, survival, and reading the terrain'] || 0) + 4;
  }
  if (includesAny(names, ['noble', 'officer', 'crime lord', 'commander', 'leader'])) {
    noncombat['leadership, command, and social leverage'] = (noncombat['leadership, command, and social leverage'] || 0) + 4;
  }
  if (includesAny(names, ['mechanics', 'use computer', 'droid', 'engineer', 'slicer', 'saboteur']) || includesAny(skillText, ['mechanics', 'usecomputer', 'use_computer'])) {
    noncombat['technical solutions and systems thinking'] = (noncombat['technical solutions and systems thinking'] || 0) + 4;
  }
  if (includesAny(skillText, ['persuasion', 'deception', 'gather']) || includesAny(names, ['charlatan'])) {
    noncombat['social maneuvering and careful influence'] = (noncombat['social maneuvering and careful influence'] || 0) + 3;
  }
  if (includesAny(skillText, ['perception', 'survival', 'initiative'])) {
    noncombat['awareness, initiative, and practical instincts'] = (noncombat['awareness, initiative, and practical instincts'] || 0) + 3;
  }
  if (includesAny(skillText, ['treatinjury', 'treat_injury']) || includesAny(names, ['medic'])) {
    noncombat['field care and keeping allies alive'] = (noncombat['field care and keeping allies alive'] || 0) + 4;
  }

  const combatIdentity = strongestLabel(combat, 'adaptable combat choices');
  const noncombatIdentity = strongestLabel(noncombat, 'practical problem-solving');

  return {
    combatIdentity: {
      label: combatIdentity,
      themes: Object.keys(combat),
      confidence: Math.min(0.95, Math.max(0.35, (combat[combatIdentity] || 1) / 6)),
    },
    noncombatIdentity: {
      label: noncombatIdentity,
      themes: Object.keys(noncombat),
      confidence: Math.min(0.95, Math.max(0.35, (noncombat[noncombatIdentity] || 1) / 6)),
    },
  };
}

function buildProfileReadingText(profileReading, mentorName) {
  const combat = profileReading?.combatIdentity?.label || 'adaptable combat choices';
  const noncombat = profileReading?.noncombatIdentity?.label || 'practical problem-solving';
  const prefix = mentorName ? `${mentorName} studies your record and says:` : 'Your mentor studies your record and says:';
  return `${prefix} “Before this path reshapes your training, I want to make sure I understand the path behind you. In conflict, you seem to favor ${combat}; outside of battle, you rely on ${noncombat}. Is that the career you believe you have been building?”`;
}

function isPrestigeClassModel(model) {
  return !!model && (model.prestigeClass === true || model.baseClass === false);
}

function resolveClassEntryFromItem(item) {
  if (!item) return null;
  const model = resolveClassModel({
    id: item?.system?.classId || item?.system?.id || item?.id,
    classId: item?.system?.classId || item?.system?.id,
    name: item?.name || item?.system?.name,
    className: item?.name || item?.system?.name,
  });
  const name = model?.name || item?.name || item?.system?.name || null;
  const id = normalizeKey(model?.id || item?.system?.classId || name);
  return {
    item,
    model,
    id,
    name,
    level: getClassLevel(item),
    isPrestige: isPrestigeClassModel(model) || item?.system?.prestigeClass === true || item?.system?.baseClass === false,
  };
}

function getActorClassEntries(actor) {
  return getActorClassItems(actor).map(resolveClassEntryFromItem).filter(Boolean);
}

function getLatestPrestigeSurvey(actor) {
  const responses = Object.values(actor?.system?.swse?.prestigeSurveyResponses || {}).filter((entry) => entry?.completed);
  return responses.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))[0] || null;
}

function buildPrestigeTransition(actor, selectedClass) {
  const selectedId = normalizeKey(selectedClass?.id || selectedClass?.name);
  const entries = getActorClassEntries(actor);
  const previousClass = entries[entries.length - 1] || null;
  const previousPrestigeClass = [...entries].reverse().find((entry) => entry?.isPrestige) || null;
  const previousSurvey = getLatestPrestigeSurvey(actor);
  const ascensionTarget = previousPrestigeClass ? ASCENSION_TRANSITIONS[previousPrestigeClass.id] : null;
  const ascensionKey = previousPrestigeClass && selectedId ? `${previousPrestigeClass.id}_to_${selectedId}` : null;
  const isAscension = !!ascensionTarget && ascensionTarget === selectedId;
  const previousCommitment = previousSurvey?.answers?.commitmentDepth?.metadata?.commitment
    || previousSurvey?.answers?.commitmentDepth?.id
    || previousSurvey?.summary?.commitment
    || null;

  let transitionKind = 'firstPrestige';
  if (isAscension) transitionKind = 'ascension';
  else if (previousCommitment === 'bridge' && previousPrestigeClass) transitionKind = 'bridge';
  else if (previousPrestigeClass) transitionKind = 'prestigeToPrestige';

  return {
    transitionKind,
    ascensionId: isAscension ? ASCENSION_IDS[ascensionKey] || ascensionKey : null,
    isAscension,
    isBridgeContinuation: transitionKind === 'bridge',
    fromType: previousPrestigeClass ? 'prestige' : (previousClass ? 'base' : 'unknown'),
    fromClassId: previousPrestigeClass?.id || previousClass?.id || null,
    fromClassName: previousPrestigeClass?.name || previousClass?.name || null,
    previousClass: previousClass ? {
      id: previousClass.id,
      name: previousClass.name,
      level: previousClass.level,
      isPrestige: previousClass.isPrestige,
    } : null,
    previousPrestigeClass: previousPrestigeClass ? {
      id: previousPrestigeClass.id,
      name: previousPrestigeClass.name,
      level: previousPrestigeClass.level,
    } : null,
    previousPrestigeSurvey: previousSurvey ? {
      classId: previousSurvey.classId,
      className: previousSurvey.className,
      commitment: previousCommitment,
      specialization: previousSurvey.answers?.specialization?.label || previousSurvey.summary?.topMatch?.name || null,
    } : null,
    toType: 'prestige',
    toClassId: selectedId,
    toClassName: selectedClass?.name || titleFromKey(selectedId),
    selectedIsIntermediary: INTERMEDIARY_PRESTIGE_CLASS_IDS.has(selectedId),
  };
}

function getTransitionIntroOverride(transition, className) {
  const fromName = transition?.fromClassName || transition?.previousPrestigeClass?.name || 'your previous path';
  if (transition?.ascensionId === 'jediMasterAscension') {
    return `I have watched you grow from a Padawan into a Knight, and now you stand at the threshold of mastery. This is not a promotion to be taken lightly, but I am glad to meet you here as a friend and peer. Tell me what kind of Master you intend to become.`;
  }
  if (transition?.ascensionId === 'sithLordAscension') {
    return `You survived Darth Malbada. That is not mercy, and it is not luck; it is proof that suffering made you stronger instead of breaking you. I accept you now as my apprentice, and we will see whether that strength can become dominion.`;
  }
  if (transition?.ascensionId === 'forceDiscipleAscension') {
    return `The old teacher brought you to the veil, but this step carries you through it. You are no longer merely learning a tradition; you are listening for the deep current beneath all traditions. Tell me which mystery you are ready to serve.`;
  }
  if (transition?.transitionKind === 'bridge') {
    return `Your last prestige path was never meant to be the final shore. It carried you here. Now we must decide whether ${className} completes that bridge, redirects it, or reveals the next crossing.`;
  }
  if (transition?.transitionKind === 'prestigeToPrestige') {
    return `You have already walked an advanced path as ${fromName}. Moving into ${className} is not a return to basics; it is a career turn. Tell me whether this is a refinement, a pivot, or a new claim on your legend.`;
  }
  return null;
}

function getTransitionQuestionText(question, transition, className) {
  const fromName = transition?.fromClassName || 'your previous path';
  if (!question?.id) return question?.text;
  if (question.id === 'prestigeMeaning') {
    if (transition?.isAscension) return `What does becoming ${className} mean after everything ${fromName} demanded of you?`;
    if (transition?.transitionKind === 'prestigeToPrestige') return `What does moving from ${fromName} into ${className} mean for your career now?`;
    if (transition?.transitionKind === 'bridge') return `How should ${className} carry forward the bridge you started with ${fromName}?`;
    return question.text;
  }
  if (question.id === 'commitmentDepth') {
    if (transition?.isAscension) return `How completely are you embracing this higher calling?`;
    if (transition?.transitionKind === 'prestigeToPrestige') return `How deeply are you committing to ${className} after ${fromName}?`;
    if (transition?.transitionKind === 'bridge') return `Is ${className} the destination, another bridge, or a short lesson on the way?`;
  }
  if (question.id === 'specialization') {
    if (transition?.isAscension) return `Which part of ${className} should define this next stage of your legacy?`;
    if (transition?.transitionKind === 'prestigeToPrestige') return `Which part of ${className} should reshape what ${fromName} already taught you?`;
  }
  return question.text;
}

function getTransitionTag(transition) {
  if (!transition?.transitionKind) return null;
  if (transition.isAscension) return `Transition: ${titleFromKey(transition.ascensionId || 'Ascension')}`;
  if (transition.transitionKind === 'prestigeToPrestige') return 'Transition: Prestige to Prestige';
  if (transition.transitionKind === 'bridge') return 'Transition: Bridge Continuation';
  if (transition.transitionKind === 'firstPrestige') return 'Transition: First Prestige Path';
  return `Transition: ${titleFromKey(transition.transitionKind)}`;
}

function buildPrestigeMetadata(actor, selectedClass, transition = null) {
  const currentLevel = getActorLevel(actor);
  const enteringLevel = Math.min(MAX_CHARACTER_LEVEL, currentLevel + 1);
  const levelsRemainingAfterThisChoice = Math.max(0, MAX_CHARACTER_LEVEL - enteringLevel);
  const classItems = getActorClassItems(actor);
  const selectedKey = normalizeKey(selectedClass?.name || selectedClass?.id);
  const existingItem = classItems.find((item) => normalizeKey(item.name) === selectedKey);
  const currentLevelsInPrestigeClass = existingItem ? getClassLevel(existingItem) : 0;
  const prestigeClassMaxLevels = Array.isArray(selectedClass?.levelProgression) && selectedClass.levelProgression.length
    ? selectedClass.levelProgression.length
    : 10;
  const levelsInClassAfterThisChoice = currentLevelsInPrestigeClass + 1;
  const levelsNeededToFinishPrestigeClass = Math.max(0, prestigeClassMaxLevels - levelsInClassAfterThisChoice);
  const canCompletePrestigeClassBy20 = levelsRemainingAfterThisChoice >= levelsNeededToFinishPrestigeClass;
  const completionPressure = canCompletePrestigeClassBy20
    ? (levelsRemainingAfterThisChoice - levelsNeededToFinishPrestigeClass >= 3 ? 'comfortable' : 'tight')
    : 'impossible-by-20';

  return {
    currentLevel,
    enteringLevel,
    maxCharacterLevel: MAX_CHARACTER_LEVEL,
    levelsRemainingAfterThisChoice,
    prestigeClassId: selectedClass?.id || selectedKey,
    prestigeClassName: selectedClass?.name || null,
    prestigeClassMaxLevels,
    currentLevelsInPrestigeClass,
    levelsInClassAfterThisChoice,
    levelsNeededToFinishPrestigeClass,
    canCompletePrestigeClassBy20,
    completionPressure,
    transition,
  };
}

function mergePrestigeBias({ actor, selectedClass, surveyAnswers, surveySummary, prestigeMetadata, profileReading, prestigeTransition }) {
  const oldBias = clonePlain(actor?.system?.swse?.mentorBuildIntentBiases || {});
  const incoming = extractSurveyIntentTags(surveyAnswers);
  const answers = surveyAnswers || {};
  const meaning = answers.prestigeMeaning?.metadata || {};
  const commitment = answers.commitmentDepth?.metadata || {};
  const specialization = answers.specialization || null;
  const reading = answers.profileReading?.metadata || {};

  const pruneWeight = Number(meaning.pruneWeight ?? 0.5);
  const pruningResistance = Number(reading.pruningResistance ?? 1.0);
  const preservationMultiplier = Number(reading.preservationMultiplier ?? 1.0);
  const prestigeOverride = Number(reading.prestigeOverride ?? 1.0);
  const oldMultiplier = Math.max(0.1, (1 - pruneWeight) * pruningResistance * preservationMultiplier);
  const newMultiplier = Math.max(0.8, Number(commitment.prestigeWeight ?? 1.1) * prestigeOverride);

  const weightedKeys = [
    'skillBiasWeights',
    'featBiasWeights',
    'talentBiasWeights',
    'prestigeClassWeights',
    'attributeBiasWeights',
    'backgroundBiasWeights',
  ];

  const merged = { ...oldBias };
  for (const key of weightedKeys) {
    merged[key] = mergeWeightedMap(oldBias[key], incoming[key], oldMultiplier, newMultiplier);
  }

  addWeighted(merged.prestigeClassWeights, selectedClass?.name, 3 * newMultiplier);
  addWeighted(merged.prestigeClassWeights, selectedClass?.id, 2 * newMultiplier);
  if (specialization?.label) addWeighted(merged.talentBiasWeights, specialization.label, 2 * newMultiplier);
  if (selectedClass?.talentTreeNames) {
    for (const tree of selectedClass.talentTreeNames || []) addWeighted(merged.talentBiasWeights, tree, 0.75 * newMultiplier);
  }

  if (prestigeTransition?.transitionKind === 'ascension') {
    addWeighted(merged.prestigeClassWeights, prestigeTransition.ascensionId, 2.5 * newMultiplier);
    addWeighted(merged.talentBiasWeights, 'legacy', 0.5 * newMultiplier);
  } else if (prestigeTransition?.transitionKind === 'prestigeToPrestige') {
    addWeighted(merged.prestigeClassWeights, 'prestigeToPrestige', 1.5 * newMultiplier);
    addWeighted(merged.talentBiasWeights, 'careerShift', 0.75 * newMultiplier);
  } else if (prestigeTransition?.transitionKind === 'bridge') {
    merged.prioritizePrereqs = true;
    merged.recommendationStyle = 'futureAware';
    addWeighted(merged.prestigeClassWeights, 'bridgeContinuation', 1.5 * newMultiplier);
  }

  merged.skillBias = sortedKeys(merged.skillBiasWeights);
  merged.featBias = sortedKeys(merged.featBiasWeights);
  merged.talentBias = sortedKeys(merged.talentBiasWeights);
  merged.prestigeClassTargets = sortedKeys(merged.prestigeClassWeights);
  merged.prestigeClassTarget = selectedClass?.name || merged.prestigeClassTargets?.[0] || null;
  merged.backgroundBias = sortedKeys(merged.backgroundBiasWeights);
  merged.prestigePrereqWeights = { ...(merged.prestigeClassWeights || {}) };

  merged.prestigeSurvey = {
    classId: selectedClass?.id || null,
    className: selectedClass?.name || null,
    commitment: commitment.commitment || answers.prestigeMeaning?.metadata?.impliedCommitment || null,
    pruneMode: meaning.pruneMode || null,
    pruneWeight,
    oldMetadataMultiplier: oldMultiplier,
    prestigeMultiplier: newMultiplier,
    specialization: specialization ? {
      id: specialization.id,
      label: specialization.label,
      archetypeHint: specialization.archetypeHint || specialization.metadata?.specializationId || null,
    } : null,
    profileReading: {
      ...profileReading,
      playerResponse: answers.profileReading?.id || null,
    },
    metadata: prestigeMetadata,
    transition: prestigeTransition || prestigeMetadata?.transition || null,
    summary: surveySummary,
  };

  if (answers.commitmentDepth?.id === 'bridge' || answers.prestigeMeaning?.id === 'bridgeBeyond') {
    merged.prioritizePrereqs = true;
    merged.recommendationStyle = 'futureAware';
  }

  return merged;
}

export class PrestigeSurveyStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._surveyAnswers = {};
    this._surveyDefinition = null;
    this._selectedClass = null;
    this._profileReading = null;
    this._prestigeMetadata = null;
    this._prestigeTransition = null;
    this._renderAbort = null;
    this._activeQuestionIndex = 0;
    this._lastPromptSpoken = null;
    this._surveyPhase = 'intro';
  }

  async onStepEnter(shell) {
    this._selectedClass = this._resolveSelectedPrestigeClass(shell);
    this._surveyDefinition = getPrestigeSurveyDefinition(this._selectedClass?.name || this._selectedClass?.id);
    this._profileReading = analyzeProfileReading(shell?.actor, this._selectedClass);
    this._prestigeTransition = buildPrestigeTransition(shell?.actor, this._selectedClass);
    this._prestigeMetadata = buildPrestigeMetadata(shell?.actor, this._selectedClass, this._prestigeTransition);

    this._hydrateDraft(shell);
    this._activeQuestionIndex = this._findNextQuestionIndex();
    this._surveyPhase = this._resolveInitialPhase();

    const mentor = getMentorForClass(this._selectedClass?.name);
    if (mentor) {
      const mentorKey = getMentorKey(this._selectedClass?.name);
      shell.mentorRail?.setMentor?.(mentorKey);
      shell.mentor.currentDialogue = getTransitionIntroOverride(this._prestigeTransition, this._selectedClass?.name) || getMentorIntroText(mentor, this._selectedClass?.name);
      shell.mentor.mood = 'focused';
      shell.mentor.mentorId = mentorKey;
      shell.mentor.name = mentor.name;
      shell.mentor.title = mentor.title;
      shell.mentor.portrait = mentor.portrait ?? shell.mentor.portrait;
    }

    shell.mentor.askMentorEnabled = true;
    await this._speakCurrentPhase(shell, true);
  }

  async onDataReady(shell) {
    if (!shell.element) return;
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    shell.element.querySelectorAll('[data-action="survey-start"]').forEach((button) => {
      button.addEventListener('click', () => this._startSurvey(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-choose"]').forEach((button) => {
      button.addEventListener('click', (event) => this._chooseSurveyAnswer(shell, event.currentTarget), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-continue"]').forEach((button) => {
      button.addEventListener('click', () => this._continueSurvey(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-finish"]').forEach((button) => {
      button.addEventListener('click', () => this._finishSurvey(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-change-answer"]').forEach((button) => {
      button.addEventListener('click', () => this._changeCurrentAnswer(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-previous-question"]').forEach((button) => {
      button.addEventListener('click', () => this._goToPreviousQuestion(shell), { signal });
    });

    shell.element.querySelectorAll('[data-action="survey-retake"]').forEach((button) => {
      button.addEventListener('click', () => this._retakeSurvey(shell), { signal });
    });
  }

  async _startSurvey(shell) {
    this._surveyPhase = 'question';
    this._activeQuestionIndex = this._findNextQuestionIndex();
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _chooseSurveyAnswer(shell, target) {
    const questionId = target?.dataset?.questionId;
    const optionId = target?.dataset?.optionId;
    const question = this._getRenderableQuestions()?.find?.((entry) => entry.id === questionId);
    const option = question?.options?.find?.((entry) => entry.id === optionId);
    if (!question || !option) return;

    this._surveyAnswers[questionId] = option;
    this._activeQuestionIndex = this._findQuestionIndex(questionId);
    this._surveyPhase = 'response';
    this._saveDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _continueSurvey(shell) {
    const questions = this._getRenderableQuestions();
    const nextIndex = questions.findIndex((question) => !this._surveyAnswers?.[question.id]);
    if (nextIndex >= 0) {
      this._activeQuestionIndex = nextIndex;
      this._surveyPhase = 'question';
    } else {
      this._activeQuestionIndex = Math.max(questions.length - 1, 0);
      this._surveyPhase = 'complete';
    }
    this._saveDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _finishSurvey(shell) {
    this._surveyPhase = 'complete';
    await this._finalizeSurvey(shell);
    await this._speakCurrentPhase(shell, true);
    await shell?._onNextStep?.();
  }

  async _changeCurrentAnswer(shell) {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    if (!question) return;
    delete this._surveyAnswers[question.id];
    this._surveyPhase = 'question';
    this._saveDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _goToPreviousQuestion(shell) {
    const questions = this._getRenderableQuestions();
    const start = this._surveyPhase === 'complete' ? questions.length : this._activeQuestionIndex;
    for (let i = start - 1; i >= 0; i--) {
      const question = questions[i];
      if (question && this._surveyAnswers?.[question.id]) {
        this._activeQuestionIndex = i;
        this._surveyPhase = 'response';
        await this._speakCurrentPhase(shell, true);
        shell.render();
        return;
      }
    }
    this._surveyPhase = 'intro';
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async _retakeSurvey(shell) {
    this._surveyAnswers = {};
    this._activeQuestionIndex = 0;
    this._surveyPhase = 'intro';
    this._lastPromptSpoken = null;
    this._saveDraft(shell);
    await this._speakCurrentPhase(shell, true);
    shell.render();
  }

  async onStepExit(shell, { direction } = {}) {
    if (direction === 'backward') {
      this._saveDraft(shell);
      return;
    }

    const isComplete = this.getSelection().isComplete;
    if (isComplete) await this._finalizeSurvey(shell);
    else this._saveDraft(shell);
  }

  async getStepData(context) {
    const mentor = getStepMentorObject(context?.shell?.actor ?? null, context?.shell ?? null);
    const surveyData = this._surveyDefinition
      ? buildSurveyStepData(this._surveyDefinition, this._surveyAnswers)
      : { questions: [], topMatches: [], mentor: mentor || null };

    const questions = (surveyData.questions || []).map((question, qIndex) => ({
      ...question,
      text: question.id === 'profileReading'
        ? buildProfileReadingText(this._profileReading, surveyData.mentor?.name || mentor?.name)
        : getTransitionQuestionText(question, this._prestigeTransition, this._selectedClass?.name || surveyData?.classDisplayName || 'this prestige class'),
      displayIndex: qIndex + 1,
      options: (question.options || []).map((option, oIndex) => ({ ...option, displayIndex: oIndex + 1 })),
    }));

    const activeQuestion = questions?.[this._activeQuestionIndex] || null;
    const selectedOption = activeQuestion ? this._surveyAnswers?.[activeQuestion.id] || null : null;
    const answeredCount = Object.keys(this._surveyAnswers).length;
    const totalQuestions = questions.length || 0;
    const isComplete = totalQuestions > 0 && answeredCount >= totalQuestions;
    const surveySummary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    const completionTags = this._buildCompletionTags(surveySummary, surveyData.topMatches);

    return {
      surveyEyebrow: 'Prestige Survey',
      surveyTitle: this._selectedClass?.name ? `${this._selectedClass.name} Career Reading` : 'Prestige Career Reading',
      beginLabel: 'Begin Career Reading',
      finishLabel: 'Continue Level-Up',
      surveyAnswers: { ...this._surveyAnswers },
      mentorName: surveyData.mentor?.name || mentor?.name || null,
      mentorTitle: surveyData.mentor?.title || mentor?.title || mentor?.class || null,
      mentorPortrait: surveyData.mentor?.portrait || mentor?.portrait || null,
      mentorPortraitMarkup: buildMentorPortraitMarkup(
        surveyData.mentor?.portrait || mentor?.portrait || null,
        surveyData.mentor?.name || mentor?.name || 'Mentor'
      ),
      mentorGuidance: surveyData.mentor?.classGuidance || 'Your career has reached a more advanced path. Answer carefully so your mentor can recalibrate the build ahead.',
      surveyDefinition: this._surveyDefinition,
      surveyQuestions: questions,
      activeQuestion,
      selectedOption,
      activeQuestionNumber: Math.min(this._activeQuestionIndex + 1, Math.max(totalQuestions, 1)),
      answeredCount,
      remainingCount: Math.max(totalQuestions - answeredCount, 0),
      totalQuestions,
      isComplete,
      surveyPhase: this._surveyPhase,
      progressDots: buildProgressDots(totalQuestions, this._activeQuestionIndex, answeredCount, this._surveyPhase),
      promptText: this._getPromptText(activeQuestion),
      responseText: this._getResponseText(selectedOption),
      completionText: this._getCompletionText(),
      introText: this._getIntroText(surveyData, mentor),
      surveySummary,
      completionTags,
      topMatches: surveyData.topMatches,
      prestigeMetadata: this._prestigeMetadata,
      prestigeTransition: this._prestigeTransition,
      profileReading: this._profileReading,
    };
  }

  getSelection() {
    const questions = this._getRenderableQuestions();
    const selected = Object.keys(this._surveyAnswers);
    return {
      selected,
      count: selected.length,
      isComplete: questions.length > 0 && selected.length >= questions.length,
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel() {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    const selectedOption = question ? this._surveyAnswers?.[question.id] || null : null;

    if (!question) {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
        data: {
          title: 'Career Reading Logged',
          summary: 'The prestige survey is complete. Your mentor can now weigh the advanced path against older identity signals.',
          tags: [],
        },
      };
    }

    if (!selectedOption) {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
        data: {
          title: `Question ${this._activeQuestionIndex + 1}`,
          summary: question.id === 'profileReading'
            ? 'This question calibrates how strongly the system should preserve or prune the profile it has inferred from your build so far.'
            : (this._prestigeTransition?.transitionKind === 'prestigeToPrestige'
              ? 'Choose the answer that best explains how this prestige path changes or refines your previous prestige career.'
              : this._prestigeTransition?.isAscension
                ? 'Choose the answer that best captures what this ascension means for the character now.'
                : 'Choose the answer that best captures what this prestige class means for the character now.'),
          tags: [],
        },
      };
    }

    const tags = Array.isArray(selectedOption?.detailTags) && selectedOption.detailTags.length
      ? selectedOption.detailTags.map((label) => ({ label: `Tag: ${label}`, cssClass: 'is-tag' }))
      : [
          ...summarizeBiasLayer(selectedOption?.biasLayers?.roleBias, 'Role'),
          ...summarizeBiasLayer(selectedOption?.biasLayers?.mechanicalBias, 'Focus'),
          ...summarizeBiasLayer(selectedOption?.biasLayers?.attributeBias, 'Lean'),
        ].slice(0, 6);

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/l1-survey-details.hbs',
      data: {
        title: selectedOption.detailRailTitle || selectedOption.label,
        summary: selectedOption.detailRailText || selectedOption.hint || 'This answer recalibrates the prestige-class recommendation model.',
        tags,
      },
    };
  }

  async onItemFocused() {}
  async onItemCommitted() {}

  validate() {
    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues() { return []; }
  getRemainingPicks() { return []; }

  async onAskMentor(shell) {
    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    const className = this._selectedClass?.name || 'this prestige class';
    let clarification = `This question helps calibrate how ${className} should steer your next recommendations.`;
    if (question?.id === 'prestigeMeaning') {
      if (this._prestigeTransition?.isAscension) clarification = `This is an ascension question. It asks what ${className} means after the trials that already proved you worthy of this threshold.`;
      else if (this._prestigeTransition?.transitionKind === 'prestigeToPrestige') clarification = `This is not asking why you qualified for ${className}. It asks how this new prestige path changes the advanced career you already began.`;
      else clarification = `This is not just asking why you qualified for ${className}. It asks whether this path expresses who you already were, reshapes that identity, or marks a real change.`;
    } else if (question?.id === 'commitmentDepth') {
      clarification = 'A quick lesson, a serious commitment, an endpoint, and a bridge all deserve different recommendations. Bridge behaves like a careful mix of dip and dive, with extra future-path awareness.';
    } else if (question?.id === 'specialization') {
      clarification = `This answer points the upcoming talent step toward the part of ${className} you actually want to develop first.`;
    } else if (question?.id === 'profileReading') {
      clarification = 'I am checking whether the pattern I see in your past choices still feels true. Your answer tells me how much old metadata to preserve or prune.';
    }
    await shell?.mentorRail?.speak?.(clarification, 'focused');
  }

  getMentorContext() {
    return 'Your prestige class is an advanced career reading. Answer honestly so the mentor can recalibrate old identity signals against the path ahead.';
  }

  getMentorMode() { return 'interactive'; }

  _resolveSelectedPrestigeClass(shell) {
    const selection = shell?.progressionSession?.getSelection?.('class')
      || shell?.progressionSession?.draftSelections?.class
      || shell?.committedSelections?.get?.('class')
      || null;
    const model = resolveClassModel(selection);
    return model?.prestigeClass || model?.baseClass === false ? model : null;
  }

  _getRenderableQuestions() {
    const data = buildSurveyStepData(this._surveyDefinition, this._surveyAnswers);
    return (data?.questions || []).map((question) => ({
      ...question,
      text: question.id === 'profileReading'
        ? buildProfileReadingText(this._profileReading, this._surveyDefinition?.mentor?.name)
        : getTransitionQuestionText(question, this._prestigeTransition, this._selectedClass?.name || this._surveyDefinition?.classDisplayName || 'this prestige class'),
    }));
  }

  _findQuestionIndex(questionId = null) {
    if (!questionId) return 0;
    return Math.max(this._getRenderableQuestions().findIndex((question) => question.id === questionId), 0);
  }

  _findNextQuestionIndex(preferredQuestionId = null) {
    const questions = this._getRenderableQuestions() || [];
    if (!questions.length) return 0;
    if (preferredQuestionId) {
      const preferredIndex = questions.findIndex((question) => question.id === preferredQuestionId);
      if (preferredIndex >= 0 && !this._surveyAnswers[preferredQuestionId]) return preferredIndex;
    }
    const unansweredIndex = questions.findIndex((question) => !this._surveyAnswers?.[question.id]);
    return unansweredIndex >= 0 ? unansweredIndex : Math.max(questions.length - 1, 0);
  }

  _resolveInitialPhase() {
    const questions = this._getRenderableQuestions();
    if (!questions.length) return 'complete';
    const answeredCount = Object.keys(this._surveyAnswers || {}).length;
    if (answeredCount <= 0) return 'intro';
    if (answeredCount >= questions.length) return 'complete';
    return 'question';
  }

  _getPromptText(activeQuestion) {
    if (!activeQuestion) return 'The prestige survey is complete. Your mentor has enough to recalibrate the path ahead.';
    return activeQuestion.text || 'Choose the answer that fits your character best.';
  }

  _getResponseText(selectedOption) {
    if (!selectedOption) return null;
    return selectedOption.detailRailText || selectedOption.hint || 'That answer tells your mentor how to weigh this advanced path.';
  }

  _getCompletionText() {
    const metadata = this._prestigeMetadata || {};
    const pressure = metadata.completionPressure === 'impossible-by-20'
      ? 'There are not enough levels left to finish every part of this class, so the mentor will prioritize defining choices.'
      : metadata.completionPressure === 'tight'
        ? 'There is enough room to pursue this path, but recommendations should be efficient.'
        : 'There is comfortable room to develop this path if you keep choosing it.';
    const transition = this._prestigeTransition?.isAscension
      ? ' This ascension will be treated as a legacy-defining transition.'
      : this._prestigeTransition?.transitionKind === 'prestigeToPrestige'
        ? ' This prestige-to-prestige turn will be treated as an advanced career shift, not a new foundation.'
        : this._prestigeTransition?.transitionKind === 'bridge'
          ? ' This bridge continuation will keep future-path and prerequisite planning active.'
          : '';
    return `Career profile logged. ${pressure}${transition} Your old build identity will now be weighed against the prestige path rather than blindly overriding it.`;
  }

  _getIntroText(surveyData, mentor) {
    const className = this._selectedClass?.name || surveyData?.classDisplayName || 'this prestige class';
    const level = this._prestigeMetadata?.enteringLevel || null;
    const levelsLeft = this._prestigeMetadata?.levelsRemainingAfterThisChoice ?? null;
    const levelLine = level ? ` You are entering this path at level ${level}, with ${levelsLeft} level${levelsLeft === 1 ? '' : 's'} left after this choice.` : '';
    const transitionIntro = getTransitionIntroOverride(this._prestigeTransition, className);
    if (transitionIntro) return `${transitionIntro}${levelLine}`;
    return surveyData?.mentor?.summaryGuidance
      || surveyData?.mentor?.classGuidance
      || mentor?.classGuidance
      || `You have qualified for ${className}. This is no longer a foundation; it is an advanced career path.${levelLine} Tell me what this path should become.`;
  }

  _buildCompletionTags(surveySummary, topMatches = []) {
    const tags = [];
    for (const label of surveySummary?.detailTags || []) {
      if (!label || tags.some((entry) => entry.label === label)) continue;
      tags.push({ label, cssClass: 'is-tag' });
    }
    for (const match of topMatches || []) {
      const name = match?.archetype?.name;
      if (!name || tags.some((entry) => entry.label === name)) continue;
      tags.push({ label: name, cssClass: 'is-match' });
    }
    const transitionTag = getTransitionTag(this._prestigeTransition);
    if (transitionTag) tags.push({ label: transitionTag, cssClass: 'is-tag' });
    const commitment = this._surveyAnswers?.commitmentDepth?.id;
    if (commitment) tags.push({ label: `Commitment: ${titleFromKey(commitment)}`, cssClass: 'is-tag' });
    if (this._prestigeMetadata?.completionPressure) tags.push({ label: `Level Pressure: ${titleFromKey(this._prestigeMetadata.completionPressure)}`, cssClass: 'is-tag' });
    return tags.slice(0, 8);
  }

  _saveDraft(shell) {
    const classId = this._selectedClass?.id;
    if (!classId || !shell?.actor) return;
    if (!shell.actor.system) shell.actor.system = {};
    if (!shell.actor.system.swse) shell.actor.system.swse = {};
    if (!shell.actor.system.swse.prestigeSurveyDrafts) shell.actor.system.swse.prestigeSurveyDrafts = {};
    const draftPayload = {
      completed: false,
      surveyId: this._surveyDefinition?.surveyId || null,
      classId,
      className: this._selectedClass?.name || null,
      currentQuestion: this._activeQuestionIndex,
      phase: this._surveyPhase,
      answers: { ...this._surveyAnswers },
      metadata: this._prestigeMetadata,
      transition: this._prestigeTransition,
      profileReading: this._profileReading,
    };
    shell.actor.system.swse.prestigeSurveyDrafts[classId] = draftPayload;
    shell.progressionSession?.commitSelection?.('prestige-survey', 'prestigeSurvey', draftPayload);
  }

  _hydrateDraft(shell) {
    const classId = this._selectedClass?.id;
    const draft = classId ? shell?.actor?.system?.swse?.prestigeSurveyDrafts?.[classId] : null;
    const completed = classId ? shell?.actor?.system?.swse?.prestigeSurveyResponses?.[classId] : null;
    const sessionDraft = shell?.progressionSession?.draftSelections?.prestigeSurvey;
    const source = (sessionDraft?.classId === classId ? sessionDraft : null) || draft || completed || null;
    if (!source?.answers) return;
    this._surveyAnswers = { ...source.answers };
    this._activeQuestionIndex = Number(source.currentQuestion ?? 0) || 0;
    this._surveyPhase = source.completed ? 'complete' : (source.phase || this._resolveInitialPhase());
  }

  async _finalizeSurvey(shell) {
    if (!this._surveyDefinition || !this._selectedClass || !shell?.actor) return;
    const isComplete = this.getSelection().isComplete;
    if (!isComplete) {
      this._saveDraft(shell);
      return;
    }

    const surveyBias = convertSurveyAnswersToBias(this._surveyAnswers);
    const surveyIntentTags = extractSurveyIntentTags(this._surveyAnswers);
    const surveySummary = processSurveyAnswers(this._surveyAnswers, this._surveyDefinition);
    const mergedBias = mergePrestigeBias({
      actor: shell.actor,
      selectedClass: this._selectedClass,
      surveyAnswers: this._surveyAnswers,
      surveySummary,
      prestigeMetadata: this._prestigeMetadata,
      profileReading: this._profileReading,
      prestigeTransition: this._prestigeTransition,
    });

    if (!shell.actor.system) shell.actor.system = {};
    if (!shell.actor.system.swse) shell.actor.system.swse = {};
    if (!shell.actor.system.swse.prestigeSurveyResponses) shell.actor.system.swse.prestigeSurveyResponses = {};

    shell.actor.system.swse.prestigeSurveyResponses[this._selectedClass.id] = {
      completed: true,
      surveyId: this._surveyDefinition.surveyId,
      classId: this._selectedClass.id,
      className: this._selectedClass.name,
      completedAt: new Date().toISOString(),
      answers: { ...this._surveyAnswers },
      biasLayers: surveyBias,
      intentTags: surveyIntentTags,
      summary: surveySummary,
      metadata: this._prestigeMetadata,
      transition: this._prestigeTransition,
      profileReading: {
        ...this._profileReading,
        playerResponse: this._surveyAnswers?.profileReading?.id || null,
      },
    };

    if (shell.actor.system.swse.prestigeSurveyDrafts?.[this._selectedClass.id]) {
      delete shell.actor.system.swse.prestigeSurveyDrafts[this._selectedClass.id];
    }

    shell.actor.system.swse.mentorBuildIntentBiases = mergedBias;

    const payload = {
      surveyId: this._surveyDefinition.surveyId,
      classId: this._selectedClass.id,
      className: this._selectedClass.name,
      completed: true,
      answers: { ...this._surveyAnswers },
      biasLayers: surveyBias,
      summary: surveySummary,
      intentTags: surveyIntentTags,
      mergedBias,
      metadata: this._prestigeMetadata,
      transition: this._prestigeTransition,
      profileReading: this._profileReading,
    };

    shell.committedSelections?.set?.('prestige-survey', payload);
    shell.progressionSession?.commitSelection?.('prestige-survey', 'prestigeSurvey', payload);

    swseLogger.debug('[PrestigeSurveyStep] Prestige survey finalized', {
      className: this._selectedClass.name,
      commitment: this._surveyAnswers?.commitmentDepth?.id,
      specialization: this._surveyAnswers?.specialization?.label,
      transitionKind: this._prestigeTransition?.transitionKind,
      ascensionId: this._prestigeTransition?.ascensionId,
    });
  }

  async _speakCurrentPhase(shell, force = false) {
    const mentorDialogue = this._getCurrentMentorDialogue();
    if (!mentorDialogue) return;
    if (!force && mentorDialogue === this._lastPromptSpoken) return;
    this._lastPromptSpoken = mentorDialogue;
    await shell?.mentorRail?.speak?.(mentorDialogue, 'focused');
  }

  _getCurrentMentorDialogue() {
    if (this._surveyPhase === 'intro') {
      return getTransitionIntroOverride(this._prestigeTransition, this._selectedClass?.name || 'this prestige class')
        || `You have qualified for ${this._selectedClass?.name || 'an advanced path'}. This is no longer a foundation; it is a career reading. Tell me what this path should become.`;
    }

    if (this._surveyPhase === 'response') {
      const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
      const selectedOption = question ? this._surveyAnswers?.[question.id] || null : null;
      return this._getResponseText(selectedOption);
    }

    if (this._surveyPhase === 'complete') {
      return this._getCompletionText();
    }

    const question = this._getRenderableQuestions()?.[this._activeQuestionIndex] || null;
    if (!question) return this._getCompletionText();
    const questionNumber = this._activeQuestionIndex + 1;
    const totalQuestions = this._getRenderableQuestions()?.length || 0;
    return `${String(question.text || '').trim()} (${questionNumber}/${totalQuestions})`;
  }
}
