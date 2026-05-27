/**
 * Data-backed Pazaak AI personality and table-dialogue helpers.
 *
 * The canonical authored content lives in data/games/pazaak-ai-personalities.json
 * so future games can reuse and expand the same voice tables without hardcoding
 * dialogue inside the engine.
 */

const MODULE_ID = 'foundryvtt-swse';
const DATA_PATH = `systems/${MODULE_ID}/data/games/pazaak-ai-personalities.json`;

const FALLBACK_PERSONALITIES = Object.freeze({
  cautious: {
    id: 'cautious',
    label: 'Cautious',
    quality: 'Avoids busting and protects small advantages.',
    modifiers: { standThreshold: -1, riskTolerance: -2, conserveCards: 2, exactTwentyBias: 0, unpredictability: 0 },
    dialogue: {}
  },
  aggressive: {
    id: 'aggressive',
    label: 'Aggressive',
    quality: 'Pushes hard for twenty and pressures the opponent.',
    modifiers: { standThreshold: 1, riskTolerance: 2, conserveCards: -1, exactTwentyBias: 2, unpredictability: 1 },
    dialogue: {}
  },
  reckless: {
    id: 'reckless',
    label: 'Reckless',
    quality: 'Makes risky, emotional, swingy choices.',
    modifiers: { standThreshold: 2, riskTolerance: 3, conserveCards: -2, exactTwentyBias: 3, unpredictability: 3 },
    dialogue: {}
  },
  methodical: {
    id: 'methodical',
    label: 'Methodical',
    quality: 'Plays mathematically and values consistency.',
    modifiers: { standThreshold: 0, riskTolerance: -1, conserveCards: 1, exactTwentyBias: 1, unpredictability: -1 },
    dialogue: {}
  },
  opportunist: {
    id: 'opportunist',
    label: 'Opportunist',
    quality: 'Conserves resources until an opponent exposes a weakness.',
    modifiers: { standThreshold: 0, riskTolerance: 1, conserveCards: 1, exactTwentyBias: 2, unpredictability: 1 },
    dialogue: {}
  },
  showboat: {
    id: 'showboat',
    label: 'Showboat',
    quality: 'Prefers dramatic, stylish plays and exact totals.',
    modifiers: { standThreshold: 1, riskTolerance: 1, conserveCards: -1, exactTwentyBias: 4, unpredictability: 2 },
    dialogue: {}
  },
  grinder: {
    id: 'grinder',
    label: 'Grinder',
    quality: 'Conserves resources and plays the long match.',
    modifiers: { standThreshold: -1, riskTolerance: -1, conserveCards: 3, exactTwentyBias: 0, unpredictability: 0 },
    dialogue: {}
  },
  desperate: {
    id: 'desperate',
    label: 'Desperate',
    quality: 'Becomes riskier when behind or near elimination.',
    modifiers: { standThreshold: 0, riskTolerance: 2, conserveCards: -1, exactTwentyBias: 2, unpredictability: 2 },
    dialogue: {}
  },
  deceptive: {
    id: 'deceptive',
    label: 'Deceptive',
    quality: 'Randomizes choices and hides intent.',
    modifiers: { standThreshold: 0, riskTolerance: 1, conserveCards: 0, exactTwentyBias: 1, unpredictability: 4 },
    dialogue: {}
  },
  forceTouched: {
    id: 'forceTouched',
    label: 'Force-Touched',
    quality: 'Mostly normal play, with rare intuition about danger or opportunity.',
    modifiers: { standThreshold: 0, riskTolerance: 0, conserveCards: 1, exactTwentyBias: 1, unpredictability: 1 },
    dialogue: {}
  }
});

const FALLBACK_DATA = Object.freeze({
  version: 1,
  forceSensitive: {
    defaultNpcChance: 0.02,
    defaultIntuitionChance: 0.05,
    feelings: {
      excellent: ['The next draw feels unusually clear.'],
      safe: ['The next draw feels steady.'],
      dangerous: ['The next draw feels dangerous.'],
      unclear: ['The feeling fades before it becomes useful.']
    }
  },
  personalities: FALLBACK_PERSONALITIES,
  opponentProfile: {
    professions: ['wandering gambler', 'sabacc dealer', 'pazaak hustler', 'dockyard mechanic'],
    tableFacts: ['keeps a lucky chip near the table', 'smells faintly like blue milk']
  }
});

let cachedData = null;
let loadPromise = null;

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomItem(items = [], fallback = null) {
  const list = Array.isArray(items) ? items.filter(item => item != null && String(item).trim()) : [];
  if (!list.length) return fallback;
  return list[Math.floor(Math.random() * list.length)];
}

function normalizeData(raw = {}) {
  const personalities = { ...clone(FALLBACK_PERSONALITIES) };
  for (const [id, entry] of Object.entries(raw.personalities || {})) {
    personalities[id] = {
      id,
      label: String(entry.label || FALLBACK_PERSONALITIES[id]?.label || id),
      quality: String(entry.quality || FALLBACK_PERSONALITIES[id]?.quality || ''),
      modifiers: { ...(FALLBACK_PERSONALITIES[id]?.modifiers || {}), ...(entry.modifiers || {}) },
      dialogue: entry.dialogue && typeof entry.dialogue === 'object' ? clone(entry.dialogue) : {}
    };
  }
  return {
    version: Number(raw.version || 1),
    forceSensitive: {
      ...clone(FALLBACK_DATA.forceSensitive),
      ...(raw.forceSensitive || {}),
      feelings: { ...clone(FALLBACK_DATA.forceSensitive.feelings), ...(raw.forceSensitive?.feelings || {}) }
    },
    personalities,
    opponentProfile: {
      professions: Array.isArray(raw.opponentProfile?.professions) ? raw.opponentProfile.professions.slice() : FALLBACK_DATA.opponentProfile.professions.slice(),
      tableFacts: Array.isArray(raw.opponentProfile?.tableFacts) ? raw.opponentProfile.tableFacts.slice() : FALLBACK_DATA.opponentProfile.tableFacts.slice()
    }
  };
}

export async function loadPazaakAiPersonalityData() {
  if (cachedData) return cachedData;
  if (!loadPromise) {
    loadPromise = fetch(DATA_PATH)
      .then(response => response.ok ? response.json() : FALLBACK_DATA)
      .then(json => {
        cachedData = normalizeData(json);
        return cachedData;
      })
      .catch(() => {
        cachedData = normalizeData(FALLBACK_DATA);
        return cachedData;
      });
  }
  return loadPromise;
}

export function getPazaakAiPersonalityData() {
  return cachedData || normalizeData(FALLBACK_DATA);
}

export function pazaakPersonalityIds() {
  return Object.keys(getPazaakAiPersonalityData().personalities || {});
}

export function randomPazaakPersonalityId({ allowForceTouched = true } = {}) {
  const ids = pazaakPersonalityIds().filter(id => allowForceTouched || id !== 'forceTouched');
  return randomItem(ids, 'methodical');
}

export function resolvePazaakAiPersonality(id = 'methodical') {
  const data = getPazaakAiPersonalityData();
  const key = String(id || 'methodical');
  return data.personalities[key] || data.personalities.methodical || Object.values(data.personalities)[0] || FALLBACK_PERSONALITIES.methodical;
}

export function getPazaakPersonalityModifier(id, key, fallback = 0) {
  const personality = resolvePazaakAiPersonality(id);
  return Number(personality.modifiers?.[key] ?? fallback) || 0;
}

export function randomPazaakDialogue(personalityId, eventKey, fallback = '') {
  const personality = resolvePazaakAiPersonality(personalityId);
  const lines = personality.dialogue?.[eventKey];
  return randomItem(lines, fallback || 'I am watching the table.');
}

export function randomPazaakProfession() {
  return randomItem(getPazaakAiPersonalityData().opponentProfile.professions, 'wandering gambler');
}

export function randomPazaakTableFact() {
  return randomItem(getPazaakAiPersonalityData().opponentProfile.tableFacts, 'keeps a lucky chip near the table');
}

export function forceFeelingForNextCard(currentScore, nextCardValue) {
  const score = Number(currentScore || 0);
  const value = Number(nextCardValue || 0);
  if (!Number.isFinite(value)) return 'unclear';
  const after = score + value;
  if (after === 20) return 'excellent';
  if (after > 20) return 'dangerous';
  if (after >= 17) return 'safe';
  return 'unclear';
}

export function randomForceFeelingLine(feeling = 'unclear') {
  const lines = getPazaakAiPersonalityData().forceSensitive.feelings?.[feeling]
    || getPazaakAiPersonalityData().forceSensitive.feelings?.unclear
    || FALLBACK_DATA.forceSensitive.feelings.unclear;
  return randomItem(lines, 'The table goes quiet in the wrong way.');
}

export function defaultForceSensitiveNpcChance() {
  return Number(getPazaakAiPersonalityData().forceSensitive.defaultNpcChance || 0.02) || 0.02;
}

export function defaultForceIntuitionChance() {
  return Number(getPazaakAiPersonalityData().forceSensitive.defaultIntuitionChance || 0.05) || 0.05;
}
