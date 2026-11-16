// Prestige Q2 connective sentences: one per class, appended to a shared strength stem (owner authorization 2026-11-16, MSV-RD-014).
// EDITORIAL DRAFTS. Each speaks of the class as one the player is BECOMING (acquisition may still be pending) and claims no mission,
// rank, organization, vehicle, feat or other owned thing.
export const CONNECTIVE = {
  ace_pilot: 'the way I fly',
  bounty_hunter: 'the way I work a contract',
  crime_lord: 'the way I build my influence',
  elite_trooper: 'the way I fight',
  force_adept: 'the way I follow my path',
  force_disciple: 'the way I seek deeper understanding',
  gunslinger: 'the way I handle a fight',
  jedi_knight: 'the way I serve',
  jedi_master: 'the way I guide others',
  officer: 'the way I lead',
  sith_apprentice: 'the way I train',
  sith_lord: 'the way I use authority',
  corporate_agent: 'the way I use my position',
  gladiator: 'the way I fight in the arena',
  melee_duelist: 'the way I fight up close',
  enforcer: 'the way I uphold the law',
  independent_droid: 'the way I direct my own existence',
  infiltrator: 'the way I operate unseen',
  master_privateer: 'the way I command',
  medic: 'the way I care for others',
  saboteur: 'the way I disrupt my targets',
  outlaw: 'the way I stay free',
  droid_commander: 'the way I command my units',
  military_engineer: 'the way I build and repair',
  vanguard: 'the way I move ahead of my allies',
  martial_arts_master: 'the way I practice my art',
  imperial_knight: 'the way I uphold my duty',
  shaper: 'the way I shape living technology',
  assassin: 'the way I approach a target',
  charlatan: 'the way I work a crowd',
  improviser: 'the way I solve problems',
  pathfinder: 'the way I find a way forward',
};
export const connectiveSentence = (classId, className) => `I want to carry that into ${CONNECTIVE[classId]} as the ${className} I am becoming.`;
// E and F reuse the owner-approved multiclass wording, adapted only from "path" to "role" (draft until approved for prestige).
export const PRESTIGE_E = 'I want to explore a different way my previous training could connect with this new role.';
export const PRESTIGE_F = "I'm not sure yet which part of my experience I want to build on.";
