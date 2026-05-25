/**
 * Mentor Portrait Registry
 *
 * Small resolver for mentor/NPC portrait paths used outside the structured
 * mentor dialogue data. Keeps store/rail surfaces from hardcoding asset paths.
 *
 * Mentor portraits are standardized on transparent PNG files in assets/mentors.
 * This registry also catches older webp/placeholder aliases that may still be
 * present in cached UI state or legacy dialogue payloads.
 */

const SYSTEM_ID = 'foundryvtt-swse';

export const MENTOR_PORTRAIT_OVERRIDES = Object.freeze({
  axiom: 'assets/mentors/Axiom.png',
  'general-axiom': 'assets/mentors/Axiom.png',
  breach: 'assets/mentors/breach.png',
  captain: 'assets/mentors/captain.png',
  'the-captain': 'assets/mentors/captain.png',
  'darth-malbada': 'assets/mentors/darth_malbada.png',
  malbada: 'assets/mentors/darth_malbada.png',
  delta: 'assets/mentors/delta.png',
  'delta-assassin': 'assets/mentors/delta.png',
  dezmin: 'assets/mentors/dezmin.png',
  'j0-n1': 'assets/mentors/j0n1.png',
  j0n1: 'assets/mentors/j0n1.png',
  jack: 'assets/mentors/Jack.png',
  'lucky-jack': 'assets/mentors/Jack.png',
  kex: 'assets/mentors/Kex.png',
  'kex-varon': 'assets/mentors/Kex.png',
  kharjo: 'assets/mentors/kharjo.png',
  kael: 'assets/mentors/kharjo.png',
  korr: 'assets/mentors/Korr.png',
  'admiral-korr': 'assets/mentors/Korr.png',
  krag: 'assets/mentors/krag.png',
  kyber: 'assets/mentors/Kyber.png',
  lead: 'assets/mentors/lead.png',
  'marl-skindar': 'assets/mentors/Marl_Skindar.png',
  skindar: 'assets/mentors/Marl_Skindar.png',
  mayu: 'assets/mentors/mayu.png',
  miedo: 'assets/mentors/miedo.png',
  'darth-miedo': 'assets/mentors/miedo.png',
  miraj: 'assets/mentors/miraj.png',
  'ol-salty': 'assets/mentors/salty.png',
  salty: 'assets/mentors/salty.png',
  pegar: 'assets/mentors/pegar.png',
  rajma: 'assets/mentors/rajma.png',
  rax: 'assets/mentors/Rax.png',
  'chief-engineer-rax': 'assets/mentors/Rax.png',
  rendarr: 'assets/mentors/Rendarr.png',
  'rendarrs-exchange': 'assets/mentors/Rendarr.png',
  riquis: 'assets/mentors/riquis.png',
  anchorite: 'assets/mentors/riquis.png',
  rogue: 'assets/mentors/Rogue.png',
  sela: 'assets/mentors/Sela.png',
  'silvertongue-sela': 'assets/mentors/Sela.png',
  seraphim: 'assets/mentors/Seraphim.png',
  spark: 'assets/mentors/Spark.png',
  theron: 'assets/mentors/theron.png',
  tideborn: 'assets/mentors/captain.png',
  'shield-captain-theron': 'assets/mentors/theron.png',
  'tio-the-hutt': 'assets/mentors/Tio_the_hutt.png',
  tio: 'assets/mentors/Tio_the_hutt.png',
  broker: 'assets/mentors/Tio_the_hutt.png',
  urza: 'assets/mentors/urza.png',
  vel: 'assets/mentors/urza.png',
  vera: 'assets/mentors/vera.png',
  venn: 'assets/mentors/vera.png',
  zhen: 'assets/mentors/zhen.png'
});

function getSystemBasePath() {
  const systemId = globalThis.game?.system?.id || SYSTEM_ID;
  return `systems/${systemId}`;
}

function normalizeMentorKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAssetAlias(path) {
  const match = String(path || '').match(/assets\/mentors\/([^/?#]+)(?:[?#].*)?$/i);
  if (!match) return '';
  return normalizeMentorKey(match[1].replace(/\.[^.]+$/, ''));
}

export function getMentorPortraitPath(mentorKey, fallbackPath = '') {
  const normalized = normalizeMentorKey(mentorKey);
  const alias = normalizeAssetAlias(fallbackPath);
  const relativePath = MENTOR_PORTRAIT_OVERRIDES[normalized] || MENTOR_PORTRAIT_OVERRIDES[alias];
  if (relativePath) {
    return `${getSystemBasePath()}/${relativePath}`;
  }
  return fallbackPath || '';
}

export function getRendarrPortraitPath() {
  return getMentorPortraitPath('rendarr');
}

export default {
  MENTOR_PORTRAIT_OVERRIDES,
  getMentorPortraitPath,
  getRendarrPortraitPath
};
