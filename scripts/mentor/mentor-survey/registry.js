import SURVEY_DEFINITIONS from './definitions/index.js';
import { buildSurveyDefinition } from './definition-builder.js';
import { getPrestigeSurveyProfile } from './prestige-survey-profiles.js';

const REGISTRY = SURVEY_DEFINITIONS || {};
const GENERATED_PRESTIGE_SURVEYS = new Map();
const BASE_CLASS_KEYS = new Set(['jedi', 'noble', 'scout', 'soldier', 'scoundrel']);

function normalizeClassId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const compact = raw
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const aliases = {
    jedi: 'jedi',
    noble: 'noble',
    scout: 'scout',
    soldier: 'soldier',
    scoundrel: 'scoundrel',
    ace_pilot: 'ace_pilot',
    bounty_hunter: 'bounty_hunter',
    crime_lord: 'crime_lord',
    elite_trooper: 'elite_trooper',
    force_adept: 'force_adept',
    force_disciple: 'force_disciple',
    gunslinger: 'gunslinger',
    jedi_knight: 'jedi_knight',
    jedi_master: 'jedi_master',
    officer: 'officer',
    sith_apprentice: 'sith_apprentice',
    sith_lord: 'sith_lord',
    corporate_agent: 'corporate_agent',
    gladiator: 'gladiator',
    melee_duelist: 'melee_duelist',
    enforcer: 'enforcer',
    independent_droid: 'independent_droid',
    infiltrator: 'infiltrator',
    master_privateer: 'master_privateer',
    medic: 'medic',
    saboteur: 'saboteur',
    assassin: 'assassin',
    charlatan: 'charlatan',
    outlaw: 'outlaw',
    droid_commander: 'droid_commander',
    military_engineer: 'military_engineer',
    vanguard: 'vanguard',
    imperial_knight: 'imperial_knight',
    shaper: 'shaper',
    improviser: 'improviser',
    pathfinder: 'pathfinder',
    martial_arts_master: 'martial_arts_master',
  };
  return aliases[compact] || compact;
}

export function getSurveyDefinition(classNameOrId) {
  const key = normalizeClassId(classNameOrId);
  return key ? REGISTRY[key] || null : null;
}

export function getSurveyDefinitionForActor(actor) {
  const classItems = actor?.items?.filter?.((i) => i.type === 'class') || [];
  const latest = classItems[classItems.length - 1];
  return getSurveyDefinition(latest?.name || actor?.system?.details?.class?.name || null);
}


function titleFromKey(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

function buildFallbackPrestigeSurvey(key, displayName) {
  const profile = getPrestigeSurveyProfile(key || displayName);
  const name = profile?.displayName || displayName || titleFromKey(key);
  const archetypes = profile?.specializations?.length ? profile.specializations : [
    {
      id: 'signature_specialist',
      name: `${name} Specialist`,
      notes: `Focus on the defining talents and signature role of ${name}.`,
      roleBias: { specialist: 0.8, utility: 0.2 },
      mechanicalBias: { classFeatureFocus: 0.8 },
      attributeBias: {},
    },
    {
      id: 'survivor_path',
      name: 'Hard-Won Survivor',
      notes: `Use ${name} training to stay alive and effective when the stakes rise.`,
      roleBias: { defender: 0.35, utility: 0.35, striker: 0.3 },
      mechanicalBias: { defenses: 0.5, efficientPicks: 0.4 },
      attributeBias: { con: 0.3, dex: 0.25, wis: 0.2 },
    },
    {
      id: 'future_calling',
      name: 'Future Calling',
      notes: `Treat ${name} as a bridge toward a larger career goal.`,
      roleBias: { utility: 0.55, specialist: 0.45 },
      mechanicalBias: { prerequisites: 0.8 },
      attributeBias: {},
    },
  ];

  return buildSurveyDefinition({
    surveyId: `PrC_${String(key || name).replace(/[^a-zA-Z0-9]+/g, '_')}`,
    surveyType: 'prestige',
    classId: key,
    displayName: name,
    mentorKey: name,
    archetypes,
  });
}

export function getPrestigeSurveyDefinition(classNameOrId) {
  const key = normalizeClassId(classNameOrId);
  if (!key || BASE_CLASS_KEYS.has(key)) return null;

  const definition = getSurveyDefinition(classNameOrId);
  if (definition?.surveyType === 'prestige') return definition;

  if (!GENERATED_PRESTIGE_SURVEYS.has(key)) {
    GENERATED_PRESTIGE_SURVEYS.set(key, buildFallbackPrestigeSurvey(key, titleFromKey(key)));
  }
  return GENERATED_PRESTIGE_SURVEYS.get(key);
}
