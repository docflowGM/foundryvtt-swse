import JediSurvey from './definitions/L1_Jedi_Survey.js';
import NobleSurvey from './definitions/L1_Noble_Survey.js';
import ScoutSurvey from './definitions/L1_Scout_Survey.js';
import SoldierSurvey from './definitions/L1_Soldier_Survey.js';
import ScoundrelSurvey from './definitions/L1_Scoundrel_Survey.js';

const REGISTRY = {
  jedi: JediSurvey,
  noble: NobleSurvey,
  scout: ScoutSurvey,
  soldier: SoldierSurvey,
  scoundrel: ScoundrelSurvey,
};

function normalizeClassId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  const aliases = {
    'jedi': 'jedi',
    'noble': 'noble',
    'scout': 'scout',
    'soldier': 'soldier',
    'scoundrel': 'scoundrel',
  };
  return aliases[lowered] || lowered;
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
