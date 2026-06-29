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
  axiom: 'assets/mentors/Axiom.webp',
  'general-axiom': 'assets/mentors/Axiom.webp',
  breach: 'assets/mentors/breach.webp',
  captain: 'assets/mentors/captain.webp',
  'the-captain': 'assets/mentors/captain.webp',
  'darth-malbada': 'assets/mentors/darth_malbada.webp',
  malbada: 'assets/mentors/darth_malbada.webp',
  delta: 'assets/mentors/delta.webp',
  'delta-assassin': 'assets/mentors/delta.webp',
  dezmin: 'assets/mentors/dezmin.webp',
  'j0-n1': 'assets/mentors/j0n1.webp',
  j0n1: 'assets/mentors/j0n1.webp',
  jack: 'assets/mentors/Jack.webp',
  'lucky-jack': 'assets/mentors/Jack.webp',
  kex: 'assets/mentors/Kex.webp',
  'kex-varon': 'assets/mentors/Kex.webp',
  kharjo: 'assets/mentors/kharjo.webp',
  kael: 'assets/mentors/kharjo.webp',
  korr: 'assets/mentors/Korr.webp',
  'admiral-korr': 'assets/mentors/Korr.webp',
  krag: 'assets/mentors/krag.webp',
  kyber: 'assets/mentors/Kyber.webp',
  lead: 'assets/mentors/lead.webp',
  'marl-skindar': 'assets/mentors/Marl_Skindar.webp',
  skindar: 'assets/mentors/Marl_Skindar.webp',
  mayu: 'assets/mentors/mayu.webp',
  miedo: 'assets/mentors/miedo.webp',
  'darth-miedo': 'assets/mentors/miedo.webp',
  miraj: 'assets/mentors/miraj.webp',
  'ol-salty': 'assets/mentors/salty.webp',
  salty: 'assets/mentors/salty.webp',
  pegar: 'assets/mentors/pegar.webp',
  rajma: 'assets/mentors/rajma.webp',
  rax: 'assets/mentors/Rax.webp',
  'chief-engineer-rax': 'assets/mentors/Rax.webp',
  rendarr: 'assets/mentors/Rendarr.webp',
  'rendarrs-exchange': 'assets/mentors/Rendarr.webp',
  riquis: 'assets/mentors/riquis.webp',
  anchorite: 'assets/mentors/riquis.webp',
  rogue: 'assets/mentors/Rogue.webp',
  sela: 'assets/mentors/Sela.webp',
  'silvertongue-sela': 'assets/mentors/Sela.webp',
  seraphim: 'assets/mentors/Seraphim.webp',
  spark: 'assets/mentors/Spark.webp',
  theron: 'assets/mentors/theron.webp',
  tideborn: 'assets/mentors/captain.webp',
  'shield-captain-theron': 'assets/mentors/theron.webp',
  'tio-the-hutt': 'assets/mentors/Tio_the_hutt.webp',
  tio: 'assets/mentors/Tio_the_hutt.webp',
  broker: 'assets/mentors/Tio_the_hutt.webp',
  urza: 'assets/mentors/urza.webp',
  vel: 'assets/mentors/urza.webp',
  vera: 'assets/mentors/vera.webp',
  venn: 'assets/mentors/vera.webp',
  zhen: 'assets/mentors/zhen.webp'
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
