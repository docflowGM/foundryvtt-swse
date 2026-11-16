// Prestige Q2 connective sentences: one per class, appended to a shared strength stem (owner authorization 2026-11-16, MSV-RD-014).
// EDITORIAL DRAFTS (revised 2026-11-16 after owner review). Each speaks of the class as one the player is BECOMING and names a way of
// working, never a possession: no units, position, employer, arena, apprentice, crew, targets, rank or organization is assumed.
export const CONNECTIVE = {
  ace_pilot: 'the way I fly',
  bounty_hunter: 'the way I approach a hunt',
  crime_lord: 'the way I approach influence',
  elite_trooper: 'the way I fight',
  force_adept: 'the way I follow my path',
  force_disciple: 'the way I seek deeper understanding',
  gunslinger: 'the way I handle a fight',
  jedi_knight: 'the way I approach service',
  jedi_master: 'the way I approach teaching and counsel',
  officer: 'the way I approach leadership',
  sith_apprentice: 'the way I approach training',
  sith_lord: 'the way I approach power and command',
  corporate_agent: 'the way I work in corporate and business settings',
  gladiator: 'the way I face combat before an audience',
  melee_duelist: 'the way I fight up close',
  enforcer: 'the way I handle enforcement work',
  independent_droid: 'the way I make my own choices',
  infiltrator: 'the way I approach covert work',
  master_privateer: 'the way I approach raiding and ship command',
  medic: 'the way I approach caring for others',
  saboteur: 'the way I approach sabotage',
  outlaw: 'the way I approach staying free',
  droid_commander: 'the way I coordinate droids and teams',
  military_engineer: 'the way I build and repair',
  vanguard: 'the way I scout ahead',
  martial_arts_master: 'the way I approach martial discipline',
  imperial_knight: 'the way I approach duty',
  shaper: 'the way I shape living technology',
  assassin: 'the way I approach precise, deliberate work',
  charlatan: 'the way I approach persuasion and illusion',
  improviser: 'the way I solve problems',
  pathfinder: 'the way I find a way forward',
};
export const connectiveSentence = (classId, className) => `I want to carry that into ${CONNECTIVE[classId]} as the ${className} I am becoming.`;
// E and F reuse the owner-approved multiclass wording, adapted only from "path" to "role" (draft until approved for prestige).
export const PRESTIGE_E = 'I want to explore a different way my previous training could connect with this new role.';
export const PRESTIGE_F = "I'm not sure yet which part of my experience I want to build on.";
