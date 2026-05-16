import { MENTORS, resolveMentorData } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { getPrestigeSurveyProfile } from './prestige-survey-profiles.js';

function resolveMentor(mentorKey, displayName) {
  const mentorRef = mentorKey || displayName;
  const mentor = resolveMentorData(mentorRef)
    || resolveMentorData(displayName)
    || resolveMentorData(MENTORS?.default)
    || resolveMentorData('Scoundrel')
    || null;

  return mentor ? {
    name: mentor.name,
    title: mentor.title,
    portrait: mentor.portrait,
    classGuidance: mentor.classGuidance,
    summaryGuidance: mentor.summaryGuidance,
    description: mentor.description,
  } : null;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

function normalizeAttributeBias(attributeBias = {}) {
  const map = {
    str: 'strength', dex: 'dexterity', con: 'constitution',
    int: 'intelligence', wis: 'wisdom', cha: 'charisma'
  };
  const out = {};
  for (const [key, value] of Object.entries(attributeBias || {})) {
    out[map[key] || key] = Number(value || 0);
  }
  return out;
}

function normalizeOption(option = {}) {
  return {
    ...option,
    detailTags: Array.isArray(option.detailTags) ? option.detailTags : [],
    biasLayers: {
      mechanicalBias: { ...(option?.biasLayers?.mechanicalBias || {}) },
      roleBias: { ...(option?.biasLayers?.roleBias || {}) },
      attributeBias: normalizeAttributeBias(option?.biasLayers?.attributeBias || {}),
    },
    biases: { ...(option?.biases || {}) },
  };
}

function normalizeQuestion(question = {}) {
  return {
    ...question,
    options: Array.isArray(question.options) ? question.options.map(normalizeOption) : [],
  };
}


function buildOption({ id, label, hint, detailRailText, detailTags = [], biasLayers = {}, biases = {}, archetypeHint = null, metadata = {} }) {
  return normalizeOption({
    id,
    label,
    hint,
    detailRailTitle: label,
    detailRailText: detailRailText || hint || label,
    detailTags,
    archetypeHint,
    biasLayers,
    biases,
    metadata,
  });
}

function genericQuestions(archetypes = []) {
  if (!archetypes.length) return [];
  return [
    {
      id: 'path',
      text: 'Which path sounds closest to you?',
      options: archetypes.map((entry) => buildOption({
        id: entry.id,
        label: entry.name,
        hint: entry.notes,
        detailRailText: entry.notes,
        detailTags: [entry.name],
        archetypeHint: entry.id,
        biasLayers: {
          mechanicalBias: { ...(entry.mechanicalBias || {}) },
          roleBias: { ...(entry.roleBias || {}) },
          attributeBias: normalizeAttributeBias(entry.attributeBias || {}),
        },
        biases: {}
      }))
    }
  ].map(normalizeQuestion);
}

function prestigeQuestions(displayName, classId, archetypes = [], prestigeProfile = null) {
  const classTag = displayName || prestigeProfile?.displayName || 'this prestige class';
  const specializationSource = prestigeProfile?.specializations?.length ? prestigeProfile.specializations : (archetypes || []);
  const specializationOptions = specializationSource.length
    ? specializationSource.map((entry) => buildOption({
        id: entry.id,
        label: entry.name,
        hint: entry.notes || `Focus this ${classTag} path around ${entry.name}.`,
        detailRailText: entry.notes || `This answer tells the mentor to bias the upcoming talent step toward the ${entry.name} specialization of ${classTag}.`,
        detailTags: [classTag, entry.name, 'Talent Tree Focus'],
        archetypeHint: entry.id,
        biasLayers: {
          mechanicalBias: { talentTreeFocus: 0.75, ...(entry.mechanicalBias || {}) },
          roleBias: { ...(entry.roleBias || {}) },
          attributeBias: normalizeAttributeBias(entry.attributeBias || {}),
        },
        biases: {
          talentBias: [entry.name, entry.id, classTag].filter(Boolean),
          prestigeBias: [classTag, classId].filter(Boolean),
        },
        metadata: {
          prestigeQuestion: 'specialization',
          specializationId: entry.id,
          talentTreeId: entry.id,
          specializationLabel: entry.name,
        }
      }))
    : [
        buildOption({
          id: 'signature_path',
          label: `The signature ${classTag} path`,
          hint: `Lean into what makes ${classTag} distinct.`,
          detailTags: [classTag, 'Signature Path'],
          biasLayers: { roleBias: { specialist: 0.8 }, mechanicalBias: { talentTreeFocus: 0.5 }, attributeBias: {} },
          biases: { talentBias: [classTag], prestigeBias: [classTag, classId].filter(Boolean) },
          metadata: { prestigeQuestion: 'specialization', specializationId: 'signature_path' }
        })
      ];

  return [
    {
      id: 'prestigeMeaning',
      text: `What does becoming ${classTag} mean for your character now?`,
      options: [
        buildOption({
          id: 'culmination',
          label: 'This is the role I have been building toward.',
          hint: 'Your earlier choices were laying the foundation for this identity.',
          detailRailText: 'This lightly prunes old signals and lets the prestige path act as the clearest expression of the build so far.',
          detailTags: ['Identity', 'Culmination'],
          biasLayers: { roleBias: { specialist: 0.9 }, mechanicalBias: {}, attributeBias: {} },
          biases: { prestigeBias: [classTag, classId].filter(Boolean), prestigePruneWeight: 0.35 },
          metadata: { prestigeQuestion: 'meaning', pruneMode: 'light', pruneWeight: 0.35 }
        }),
        buildOption({
          id: 'shapeWhatIAm',
          label: 'This path gives shape to what I have become.',
          hint: 'Your old path still matters, but this advanced training should organize it.',
          detailRailText: 'This keeps old identity as context while making the prestige class the main lens for future suggestions.',
          detailTags: ['Identity', 'Reframe'],
          biasLayers: { roleBias: { specialist: 0.7, adaptable: 0.3 }, mechanicalBias: {}, attributeBias: {} },
          biases: { prestigeBias: [classTag, classId].filter(Boolean), prestigePruneWeight: 0.55 },
          metadata: { prestigeQuestion: 'meaning', pruneMode: 'moderate', pruneWeight: 0.55 }
        }),
        buildOption({
          id: 'neededToSurvive',
          label: 'I need these methods for what comes next.',
          hint: 'This is practical training for harder threats and sharper stakes.',
          detailRailText: 'This biases the mentor toward high-impact survivability and capability picks from the prestige path.',
          detailTags: ['Purpose', 'Survival'],
          biasLayers: { roleBias: { defender: 0.4, utility: 0.35, striker: 0.25 }, mechanicalBias: { defenses: 0.5 }, attributeBias: {} },
          biases: { prestigeBias: [classTag, classId].filter(Boolean), prestigePruneWeight: 0.50 },
          metadata: { prestigeQuestion: 'meaning', pruneMode: 'moderate', pruneWeight: 0.50 }
        }),
        buildOption({
          id: 'bridgeBeyond',
          label: 'This is a step toward something beyond it.',
          hint: 'You are using this prestige class as a bridge to a future calling.',
          detailRailText: 'This treats the class like a bridge: more than a dip, but with extra prerequisite and future-path awareness.',
          detailTags: ['Bridge', 'Future Path'],
          biasLayers: { roleBias: { utility: 0.5, specialist: 0.5 }, mechanicalBias: { prerequisites: 0.8 }, attributeBias: {} },
          biases: { prestigeBias: [classTag, classId].filter(Boolean), prestigePruneWeight: 0.45, prioritizePrereqs: 1 },
          metadata: { prestigeQuestion: 'meaning', pruneMode: 'bridge', pruneWeight: 0.45, impliedCommitment: 'bridge' }
        }),
        buildOption({
          id: 'newIdentity',
          label: 'My character is becoming something new.',
          hint: 'The old read may no longer be the right read.',
          detailRailText: 'This heavily prunes older base-survey assumptions and lets the prestige path steer future recommendations.',
          detailTags: ['Identity Shift', 'Heavy Prune'],
          biasLayers: { roleBias: { specialist: 1.0 }, mechanicalBias: {}, attributeBias: {} },
          biases: { prestigeBias: [classTag, classId].filter(Boolean), prestigePruneWeight: 0.85 },
          metadata: { prestigeQuestion: 'meaning', pruneMode: 'heavy', pruneWeight: 0.85 }
        }),
      ]
    },
    {
      id: 'commitmentDepth',
      text: 'How deeply are you committing to this path?',
      options: [
        buildOption({
          id: 'dip',
          label: 'I need a quick lesson from this path.',
          hint: 'Take the defining early benefit without reshaping the whole character around it.',
          detailRailText: 'Dip mode favors immediate, high-value picks and avoids overcommitting future recommendations.',
          detailTags: ['Dip', '1–2 Levels'],
          biasLayers: { roleBias: { utility: 0.35 }, mechanicalBias: { efficientPicks: 0.9 }, attributeBias: {} },
          biases: { prestigeCommitment: 'dip' },
          metadata: { prestigeQuestion: 'commitment', commitment: 'dip', prestigeWeight: 0.85, oldIdentityRetention: 0.85, prerequisitePlanning: 1.25 }
        }),
        buildOption({
          id: 'dive',
          label: 'I intend to grow into it for a while.',
          hint: 'This is a serious part of the character, even if it may not be the final stop.',
          detailRailText: 'Dive mode biases toward a coherent mid-path specialization while still respecting previous identity.',
          detailTags: ['Dive', 'Several Levels'],
          biasLayers: { roleBias: { specialist: 0.75, adaptable: 0.25 }, mechanicalBias: {}, attributeBias: {} },
          biases: { prestigeCommitment: 'dive' },
          metadata: { prestigeQuestion: 'commitment', commitment: 'dive', prestigeWeight: 1.25, oldIdentityRetention: 0.6, classFeatureFocus: 1.2 }
        }),
        buildOption({
          id: 'swim',
          label: 'This is who I am becoming.',
          hint: 'The prestige class should become the character’s dominant identity.',
          detailRailText: 'Swim mode strongly prioritizes this class’s defining trees, feats, and long-term completion path.',
          detailTags: ['Swim', 'Endpoint'],
          biasLayers: { roleBias: { specialist: 1.2 }, mechanicalBias: { completion: 0.8 }, attributeBias: {} },
          biases: { prestigeCommitment: 'swim' },
          metadata: { prestigeQuestion: 'commitment', commitment: 'swim', prestigeWeight: 1.6, oldIdentityRetention: 0.4, prestigeCompletionFocus: 1.5 }
        }),
        buildOption({
          id: 'bridge',
          label: 'This path is carrying me toward a future calling.',
          hint: 'Treat this as a guided bridge between the current build and a later advanced identity.',
          detailRailText: 'Bridge mode behaves like a mix between dip and dive, with extra prerequisite and milestone awareness.',
          detailTags: ['Bridge', 'Future-Aware'],
          biasLayers: { roleBias: { utility: 0.65, specialist: 0.35 }, mechanicalBias: { prerequisites: 1.0 }, attributeBias: {} },
          biases: { prestigeCommitment: 'bridge', prioritizePrereqs: 1 },
          metadata: { prestigeQuestion: 'commitment', commitment: 'bridge', prestigeWeight: 1.1, futurePathPlanning: 1.5, prerequisitePlanning: 1.4 }
        }),
      ]
    },
    {
      id: 'specialization',
      text: `Which part of ${classTag} calls to you first?`,
      options: specializationOptions
    },
    {
      id: 'profileReading',
      text: 'Before this path reshapes your training, your mentor reads the profile you have built so far. Does that reading feel true?',
      options: [
        buildOption({
          id: 'strongConfirm',
          label: 'That is exactly the path I have been trying to walk.',
          hint: 'Preserve and amplify the existing read of the character.',
          detailRailText: 'This confirms the current build profile and makes old metadata resist prestige pruning.',
          detailTags: ['Profile Confirmed'],
          biases: { profileReadingResponse: 'strongConfirm' },
          metadata: { prestigeQuestion: 'profileReading', preservationMultiplier: 1.35, pruningResistance: 1.25, prestigeOverride: 0.85 }
        }),
        buildOption({
          id: 'softConfirm',
          label: 'That sounds mostly right, though there is more to it.',
          hint: 'Keep the profile, but let this prestige class refine it.',
          detailRailText: 'This preserves the current build profile while leaving room for the prestige path to sharpen it.',
          detailTags: ['Profile Mostly Right'],
          biases: { profileReadingResponse: 'softConfirm' },
          metadata: { prestigeQuestion: 'profileReading', preservationMultiplier: 1.15, pruningResistance: 1.0, prestigeOverride: 1.0 }
        }),
        buildOption({
          id: 'uncertain',
          label: 'Some of that fits, but I am not sure it defines me.',
          hint: 'Lower confidence in the old profile without rejecting it entirely.',
          detailRailText: 'This keeps existing metadata available, but lowers its authority in future recommendations.',
          detailTags: ['Profile Uncertain'],
          biases: { profileReadingResponse: 'uncertain' },
          metadata: { prestigeQuestion: 'profileReading', preservationMultiplier: 0.85, pruningResistance: 0.75, prestigeOverride: 1.1 }
        }),
        buildOption({
          id: 'softReject',
          label: 'That is not really how I see myself anymore.',
          hint: 'Let the prestige path steer more strongly than the old profile.',
          detailRailText: 'This soft-rejects the current reading and asks the mentor to weigh this prestige survey more heavily.',
          detailTags: ['Profile Rejected'],
          biases: { profileReadingResponse: 'softReject' },
          metadata: { prestigeQuestion: 'profileReading', preservationMultiplier: 0.55, pruningResistance: 0.45, prestigeOverride: 1.25 }
        }),
        buildOption({
          id: 'strongReject',
          label: 'No. I need you to stop reading me that way.',
          hint: 'Treat the old profile as actively misleading.',
          detailRailText: 'This strongly prunes older profile signals so the prestige path can redefine the recommendation model.',
          detailTags: ['Profile Reset'],
          biases: { profileReadingResponse: 'strongReject' },
          metadata: { prestigeQuestion: 'profileReading', preservationMultiplier: 0.25, pruningResistance: 0.2, prestigeOverride: 1.45 }
        }),
      ]
    }
  ].map(normalizeQuestion);
}

function resolveBranchedQuestions(questions = [], answers = {}) {
  const resolved = [];
  for (const question of questions || []) {
    if (question?.branchOn && question?.branches) {
      const branchAnswerId = answers?.[question.branchOn]?.id;
      const branchOptions = branchAnswerId ? question.branches?.[branchAnswerId] : null;
      resolved.push(normalizeQuestion({
        id: question.id,
        text: question.text,
        options: Array.isArray(branchOptions) ? branchOptions : []
      }));
      continue;
    }
    resolved.push(normalizeQuestion(question));
  }
  return resolved.filter((entry) => Array.isArray(entry.options) && entry.options.length > 0);
}

export function buildSurveyDefinition({ surveyId, classId, displayName, mentorKey, archetypes = [], questions = [], resolveQuestions = null, surveyType = null }) {
  const resolvedSurveyType = surveyType || (String(surveyId || '').startsWith('PrC_') ? 'prestige' : 'l1');
  const prestigeProfile = resolvedSurveyType === 'prestige' ? getPrestigeSurveyProfile(classId || displayName) : null;
  const archetypeSource = resolvedSurveyType === 'prestige' && prestigeProfile?.specializations?.length
    ? prestigeProfile.specializations
    : (archetypes || []);

  const normalizedArchetypes = (archetypeSource || []).map((entry) => ({
    ...entry,
    name: entry.name || toTitleCase(entry.id),
    mechanicalBias: { ...(entry.mechanicalBias || {}) },
    roleBias: { ...(entry.roleBias || {}) },
    attributeBias: normalizeAttributeBias(entry.attributeBias || {}),
  }));

  const resolvedMentor = resolveMentor(mentorKey || displayName, displayName);
  const definition = {
    surveyId,
    surveyType: resolvedSurveyType,
    classId,
    classDisplayName: prestigeProfile?.displayName || displayName,
    displayName: prestigeProfile?.displayName || displayName,
    mentorKey: mentorKey || displayName,
    mentor: resolvedMentor ? {
      ...resolvedMentor,
      classGuidance: prestigeProfile?.opening || resolvedMentor.classGuidance,
      summaryGuidance: prestigeProfile?.opening || resolvedMentor.summaryGuidance,
    } : null,
    prestigeProfile,
    archetypes: normalizedArchetypes,
    questions: questions?.length
      ? questions.map(normalizeQuestion)
      : (resolvedSurveyType === 'prestige'
          ? prestigeQuestions(prestigeProfile?.displayName || displayName, classId, normalizedArchetypes, prestigeProfile)
          : genericQuestions(normalizedArchetypes)),
  };

  if (typeof resolveQuestions === 'function') {
    definition.resolveQuestions = (answers = {}) => resolveQuestions(answers).map(normalizeQuestion);
  } else if (questions?.some?.((q) => q?.branchOn && q?.branches)) {
    definition.resolveQuestions = (answers = {}) => resolveBranchedQuestions(definition.questions, answers);
  }

  return definition;
}
