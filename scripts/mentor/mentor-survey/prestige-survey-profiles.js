/**
 * Prestige survey profile coverage.
 *
 * Phase 2 turns the prestige survey's specialization question into a real
 * talent-tree steering signal. The class DB already owns the available trees;
 * this file mirrors those tree ids into player-facing career language and soft
 * recommendation weights without granting anything or bypassing prerequisites.
 */

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

const TREE_COPY = {
  advanced_medicine: ['Advanced Medicine', 'Turn medical expertise into defining battlefield support and recovery.', { support: 0.8, utility: 0.4 }, { int: 0.35, wis: 0.35 }],
  armor_specialist: ['Armor Specialist', 'Lean into protection, armor discipline, and surviving focused attacks.', { defender: 0.7, combat: 0.4 }, { con: 0.35, str: 0.25 }],
  assassin: ['Assassin', 'Bias toward discreet elimination, precision timing, and choosing the decisive moment.', { striker: 0.8, stealth: 0.45 }, { dex: 0.45, int: 0.2 }],
  autonomy: ['Autonomy', 'Emphasize self-direction, independent action, and resisting outside control.', { utility: 0.5, survivor: 0.4 }, { wis: 0.3, int: 0.25 }],
  awareness: ['Awareness', 'Read the field early, notice danger first, and turn perception into advantage.', { utility: 0.6, scout: 0.4 }, { wis: 0.45, dex: 0.2 }],
  beastwarden: ['Beastwarden', 'Guide living allies and creatures through instinct, empathy, and Force-touched control.', { support: 0.5, controller: 0.35 }, { wis: 0.45, cha: 0.25 }],
  blockade_runner: ['Blockade Runner', 'Push vehicles through danger with speed, nerve, and escape-route instincts.', { pilot: 0.7, mobility: 0.45 }, { dex: 0.45, int: 0.2 }],
  bothan_spynet: ['Bothan SpyNet', 'Leverage contacts, intelligence channels, and secrets gathered before the fight begins.', { skills: 0.6, social: 0.45 }, { int: 0.35, cha: 0.3 }],
  bounty_hunter: ['Bounty Hunter', 'Track, pressure, and claim a target with relentless professional focus.', { controller: 0.45, striker: 0.45 }, { wis: 0.35, dex: 0.3 }],
  brawler: ['Brawler', 'Favor close-quarters punishment, dirty angles, and turning any fight physical.', { striker: 0.65, combat: 0.45 }, { str: 0.45, con: 0.3 }],
  camouflage: ['Camouflage', 'Disappear before contact, shape the battlefield, and strike from concealment.', { stealth: 0.65, scout: 0.35 }, { dex: 0.4, wis: 0.25 }],
  carbineer: ['Carbineer', 'Fight with mobile ranged pressure and practical battlefield marksmanship.', { striker: 0.6, combat: 0.35 }, { dex: 0.45, con: 0.2 }],
  commando: ['Commando', 'Bias toward raids, hard entries, disciplined violence, and mission-first tactics.', { combat: 0.65, striker: 0.45 }, { str: 0.3, dex: 0.3, con: 0.25 }],
  corporate_power: ['Corporate Power', 'Use institutional authority, leverage, and resources as career weapons.', { social: 0.6, utility: 0.4 }, { cha: 0.4, int: 0.3 }],
  critical_master: ['Critical Master', 'Maximize decisive strikes and punish enemies when openings appear.', { striker: 0.85 }, { dex: 0.35, str: 0.25 }],
  dark_side_devotee: ['Dark Side Devotee', 'Embrace dangerous Force techniques, ambition, and uncompromising power.', { force: 0.65, striker: 0.35 }, { cha: 0.4, wis: 0.25 }],
  disgrace: ['Disgrace', 'Weaponize scandal, reputation, and social pressure against vulnerable targets.', { social: 0.55, controller: 0.35 }, { cha: 0.45, int: 0.25 }],
  droid_commander: ['Droid Commander', 'Coordinate droid allies as a networked command asset.', { leader: 0.65, support: 0.45 }, { int: 0.45, cha: 0.25 }],
  duelist: ['Duelist', 'Develop single-opponent mastery, blade control, and refined melee pressure.', { striker: 0.55, defender: 0.35 }, { dex: 0.35, str: 0.25 }],
  elite_droid: ['Elite Droid', 'Improve the chassis into a superior independent combat platform.', { combat: 0.55, defender: 0.35 }, { str: 0.25, dex: 0.25, int: 0.25 }],
  enforcement: ['Enforcement', 'Pursue suspects, control scenes, and make authority stick under pressure.', { controller: 0.55, skills: 0.35 }, { wis: 0.35, cha: 0.25 }],
  expert_pilot: ['Expert Pilot', 'Turn piloting skill into the central expression of the class.', { pilot: 0.8, mobility: 0.35 }, { dex: 0.45, int: 0.25 }],
  force_adept: ['Force Adept', 'Follow a non-Jedi Force tradition through intuition, mystery, and discipline.', { force: 0.7, utility: 0.35 }, { wis: 0.45, cha: 0.25 }],
  force_hunter: ['Force Hunter', 'Study Force-users as quarry and build counters to their advantages.', { controller: 0.5, combat: 0.4 }, { wis: 0.35, int: 0.25 }],
  force_item: ['Force Item', 'Shape the path around relics, crafted tools, and Force-imbued objects.', { force: 0.45, utility: 0.45 }, { int: 0.35, wis: 0.3 }],
  fortune: ['Fortune', 'Lean into luck, timing, and improbable openings that keep the character alive.', { utility: 0.45, striker: 0.25 }, { dex: 0.25, cha: 0.25 }],
  fringer: ['Fringer', 'Keep the edge of survival, improvisation, and life outside civilized safety.', { survivor: 0.6, skills: 0.35 }, { wis: 0.3, con: 0.25 }],
  fugitive_commander: ['Fugitive Commander', 'Lead people under pressure when every safe harbor is temporary.', { leader: 0.55, survivor: 0.35 }, { cha: 0.35, wis: 0.25 }],
  gand_findsman: ['Gand Findsman', 'Treat the hunt as ritual, intuition, and mystical pursuit.', { scout: 0.45, force: 0.35 }, { wis: 0.5 }],
  genoharadan: ['GenoHaradan', 'Favor secret orders, silent contracts, and influence from hidden places.', { stealth: 0.55, social: 0.35 }, { int: 0.35, dex: 0.25 }],
  gladiatorial_combat: ['Gladiatorial Combat', 'Fight for the arena: spectacle, pain tolerance, and direct dominance.', { combat: 0.7, striker: 0.4 }, { str: 0.4, con: 0.35 }],
  gunner: ['Gunner', 'Make vehicle weapons and heavy fire solutions the signature contribution.', { striker: 0.65, pilot: 0.35 }, { dex: 0.35, int: 0.25 }],
  gunslinger: ['Gunslinger', 'Win with quick draws, pistol discipline, and speed under pressure.', { striker: 0.75, combat: 0.35 }, { dex: 0.5 }],
  imperial_inquisitor: ['Imperial Inquisitor', 'Hunt enemies through fear, investigation, and Force-backed authority.', { force: 0.45, controller: 0.45 }, { cha: 0.35, wis: 0.3 }],
  implant: ['Implant', 'Advance through biotechnology, body modification, and engineered adaptation.', { utility: 0.55, defender: 0.25 }, { int: 0.4, con: 0.25 }],
  improviser: ['Improviser', 'Solve urgent problems with whatever tools, parts, or leverage are available.', { utility: 0.75, skills: 0.4 }, { int: 0.45, wis: 0.25 }],
  infamy: ['Infamy', 'Make reputation, fear, and notoriety do work before weapons are drawn.', { social: 0.55, controller: 0.35 }, { cha: 0.5 }],
  infiltration: ['Infiltration', 'Enter protected places, move unseen, and complete objectives from inside.', { stealth: 0.75, skills: 0.35 }, { dex: 0.4, int: 0.3 }],
  influence: ['Influence', 'Shift people, politics, and outcomes through presence and persuasion.', { social: 0.75, support: 0.25 }, { cha: 0.5 }],
  inspiration: ['Inspiration', 'Make allies better through confidence, timing, and active support.', { support: 0.7, leader: 0.35 }, { cha: 0.45, wis: 0.2 }],
  jedi_archivist: ['Jedi Archivist', 'Seek lore, preserve knowledge, and turn study into guidance.', { force: 0.35, skills: 0.5 }, { int: 0.45, wis: 0.3 }],
  jedi_artisan: ['Jedi Artisan', 'Shape Jedi identity through craft, tools, and Force-guided creation.', { force: 0.4, utility: 0.45 }, { int: 0.4, wis: 0.25 }],
  jedi_battlemaster: ['Jedi Battlemaster', 'Train as the martial exemplar of the Jedi path.', { combat: 0.65, leader: 0.3 }, { str: 0.3, dex: 0.3, wis: 0.2 }],
  jedi_healer: ['Jedi Healer', 'Use the Force to protect life, restore allies, and answer harm with care.', { support: 0.75, force: 0.4 }, { wis: 0.5 }],
  jedi_instructor: ['Jedi Instructor', 'Guide others, teach discipline, and turn mastery into legacy.', { leader: 0.55, support: 0.45 }, { cha: 0.35, wis: 0.35 }],
  jedi_investigator: ['Jedi Investigator', 'Combine patience, evidence, and Force insight to uncover truth.', { skills: 0.6, force: 0.35 }, { wis: 0.4, int: 0.3 }],
  jedi_refugee: ['Jedi Refugee', 'Survive exile, protect what remains, and adapt Jedi training to hard times.', { survivor: 0.55, force: 0.35 }, { wis: 0.35, con: 0.25 }],
  jedi_shadow: ['Jedi Shadow', 'Enter darkness carefully to expose corruption and hidden threats.', { stealth: 0.5, force: 0.45 }, { dex: 0.3, wis: 0.35 }],
  jedi_watchman: ['Jedi Watchman', 'Serve as a local guardian, investigator, and quiet defender.', { support: 0.4, skills: 0.4, force: 0.3 }, { wis: 0.4, cha: 0.25 }],
  jedi_weapon_master: ['Jedi Weapon Master', 'Pursue the blade as disciplined mastery rather than simple violence.', { combat: 0.75, striker: 0.35 }, { dex: 0.35, str: 0.3 }],
  knights_armor: ['Knight Armor', 'Make armor, duty, and visible resolve part of the Imperial Knight identity.', { defender: 0.65, combat: 0.3 }, { con: 0.35, str: 0.25 }],
  knights_resolve: ['Knight Resolve', 'Hold the line through discipline, loyalty, and resistance to fear.', { defender: 0.45, force: 0.35 }, { wis: 0.4, cha: 0.2 }],
  leadership: ['Leadership', 'Command allies, set direction, and make the group more effective.', { leader: 0.75, support: 0.35 }, { cha: 0.5 }],
  lightsaber_combat: ['Lightsaber Combat', 'Center the path on Jedi or Sith blade work under real pressure.', { combat: 0.7, force: 0.3 }, { dex: 0.35, str: 0.25, wis: 0.2 }],
  lightsaber_forms: ['Lightsaber Forms', 'Choose a disciplined form and let it define the style of battle.', { combat: 0.65, defender: 0.25 }, { dex: 0.35, wis: 0.25 }],
  lineage: ['Lineage', 'Use family, patronage, and social position as part of the career path.', { social: 0.55, utility: 0.25 }, { cha: 0.4, int: 0.2 }],
  malkite_poisoner: ['Malkite Poisoner', 'Favor patience, toxins, and meticulous preparation over open violence.', { stealth: 0.5, controller: 0.4 }, { int: 0.35, dex: 0.25 }],
  mandalorian_warrior: ['Mandalorian Warrior', 'Fight with warrior culture, armor, and disciplined aggression.', { combat: 0.75, defender: 0.35 }, { str: 0.35, con: 0.3 }],
  mastermind: ['Mastermind', 'Win through planning, networks, and pressure applied at the right point.', { leader: 0.45, social: 0.45 }, { int: 0.4, cha: 0.35 }],
  master_of_ter_s_k_si: ['Master of Teras Kasi', 'Turn the body itself into the weapon through disciplined martial training.', { combat: 0.75, striker: 0.4 }, { str: 0.45, con: 0.3 }],
  melee_duelist: ['Melee Duelist', 'Specialize in duels, feints, weapon discipline, and controlled melee pressure.', { combat: 0.7, striker: 0.35 }, { dex: 0.4, str: 0.25 }],
  melee_specialist: ['Melee Specialist', 'Stay dangerous up close with practical melee offense and defense.', { combat: 0.65, defender: 0.25 }, { str: 0.35, con: 0.25 }],
  military_engineer: ['Military Engineer', 'Keep equipment, vehicles, and battlefield systems working under fire.', { utility: 0.65, support: 0.35 }, { int: 0.5 }],
  military_tactics: ['Military Tactics', 'Shape the fight with orders, positioning, and tactical foresight.', { leader: 0.55, controller: 0.35 }, { int: 0.4, cha: 0.25 }],
  misfortune: ['Misfortune', 'Exploit enemy mistakes, unlucky turns, and moments of weakness.', { controller: 0.45, striker: 0.35 }, { dex: 0.3, cha: 0.25 }],
  mystic: ['Mystic', 'Let vision, mystery, and deeper Force intuition steer the path.', { force: 0.75, utility: 0.25 }, { wis: 0.5 }],
  naval_officer: ['Naval Officer', 'Command crews, ships, and operations on a larger tactical stage.', { leader: 0.65, pilot: 0.3 }, { cha: 0.35, int: 0.35 }],
  outlaw: ['Outlaw', 'Thrive outside the law through reputation, nerve, and survival instincts.', { survivor: 0.45, social: 0.35 }, { dex: 0.25, cha: 0.25 }],
  outlaw_tech: ['Outlaw Tech', 'Build, patch, and weaponize technology outside official channels.', { utility: 0.65, skills: 0.35 }, { int: 0.5 }],
  pathfinder: ['Pathfinder', 'Find safe routes, establish positions, and prepare allies for hostile terrain.', { scout: 0.65, support: 0.3 }, { wis: 0.4, dex: 0.25 }],
  piracy: ['Piracy', 'Lean into raiding, intimidation, boarding actions, and outlaw opportunity.', { striker: 0.45, social: 0.35 }, { cha: 0.3, dex: 0.3 }],
  pistoleer: ['Pistoleer', 'Refine pistol skill into reliable close and mid-range control.', { striker: 0.65, combat: 0.3 }, { dex: 0.5 }],
  privateer: ['Privateer', 'Operate as a sanctioned raider, blending legitimacy with predatory action.', { pilot: 0.45, social: 0.35 }, { dex: 0.3, cha: 0.3 }],
  procurement: ['Procurement', 'Acquire the tools, contacts, and resources that make impossible plans possible.', { utility: 0.65, social: 0.25 }, { int: 0.35, cha: 0.3 }],
  protection: ['Protection', 'Bias toward keeping allies alive and absorbing danger meant for others.', { defender: 0.75, support: 0.35 }, { con: 0.4, wis: 0.25 }],
  rebel_recruiter: ['Rebel Recruiter', 'Build causes, rally people, and turn belief into organized resistance.', { leader: 0.55, social: 0.4 }, { cha: 0.45, wis: 0.2 }],
  republic_commando: ['Republic Commando', 'Operate as an elite strike-unit professional with mission discipline.', { combat: 0.65, support: 0.25 }, { dex: 0.3, con: 0.3 }],
  sabotage: ['Sabotage', 'Disable systems, ruin infrastructure, and make enemy plans collapse quietly.', { utility: 0.6, controller: 0.45 }, { int: 0.45, dex: 0.25 }],
  shaper: ['Shaper', 'Direct biotechnology, living tools, and body-altering science toward a purpose.', { utility: 0.65, support: 0.25 }, { int: 0.5 }],
  sith: ['Sith', 'Pursue domination, passion, and the ruthless use of Force power.', { force: 0.75, striker: 0.35 }, { cha: 0.45, wis: 0.25 }],
  sith_alchemy: ['Sith Alchemy', 'Transform matter, creatures, and relics through dangerous dark knowledge.', { force: 0.55, utility: 0.45 }, { int: 0.4, cha: 0.3 }],
  sith_commander: ['Sith Commander', 'Command through fear, ambition, and Dark Side authority.', { leader: 0.55, force: 0.35 }, { cha: 0.5 }],
  slicer: ['Slicer', 'Win through systems access, computers, and hidden control of information.', { utility: 0.75, skills: 0.35 }, { int: 0.5 }],
  spacer: ['Spacer', 'Make starship life, vacuum instincts, and crew survival central.', { pilot: 0.45, survivor: 0.35 }, { dex: 0.3, wis: 0.25 }],
  specialized_droid: ['Specialized Droid', 'Lean into the droid body as a purpose-built expert platform.', { utility: 0.55, specialist: 0.35 }, { int: 0.45 }],
  spy: ['Spy', 'Gather information, maintain covers, and let secrets decide the encounter.', { stealth: 0.55, skills: 0.45 }, { int: 0.35, cha: 0.3 }],
  squadron_leader: ['Squadron Leader', 'Coordinate pilots and turn individual vehicles into a formation.', { leader: 0.55, pilot: 0.45 }, { cha: 0.35, dex: 0.25 }],
  survivor: ['Survivor', 'Stay alive, endure hardship, and keep functioning when plans fail.', { survivor: 0.75, defender: 0.25 }, { con: 0.4, wis: 0.25 }],
  telepath: ['Telepath', 'Bias toward minds, impressions, and subtle Force communication.', { force: 0.6, social: 0.35 }, { wis: 0.4, cha: 0.3 }],
  trickery: ['Trickery', 'Misdirect, con, and manipulate expectations before trouble notices.', { social: 0.5, stealth: 0.35 }, { cha: 0.4, int: 0.25 }],
  turret: ['Turret', 'Use emplacements, devices, and controlled lanes to dominate space.', { controller: 0.55, utility: 0.35 }, { int: 0.35, dex: 0.25 }],
  vanguard: ['Vanguard', 'Scout ahead, locate the enemy, and bring actionable information home.', { scout: 0.7, support: 0.25 }, { wis: 0.4, dex: 0.3 }],
  weapon_master: ['Weapon Master', 'Turn chosen weapons into reliable dominance and disciplined lethality.', { combat: 0.75, striker: 0.35 }, { str: 0.3, dex: 0.3 }],
  weapon_specialist: ['Weapon Specialist', 'Narrow the focus to a favorite weapon and make it decisive.', { combat: 0.65, striker: 0.35 }, { dex: 0.35, str: 0.25 }],
  wingman: ['Wingman', 'Support allies in vehicle combat and keep the formation alive.', { support: 0.55, pilot: 0.45 }, { dex: 0.35, cha: 0.25 }],
};

const PRESTIGE_CLASS_PROFILES = {
  medic: { displayName: 'Medic', role: 'field healer', opening: 'You have reached an advanced support path. This survey will decide whether medicine is your calling, your survival tool, or the way you hold the team together.', trees: ['survivor', 'advanced_medicine'] },
  jedi_master: { displayName: 'Jedi Master', role: 'upper-tier Jedi mentor', intermediary: false, upperTier: true, opening: 'You are entering a path of teaching, serenity, and responsibility. The question is no longer whether you are a Jedi, but what kind of wisdom you will pass on.', trees: ['duelist'] },
  gunslinger: { displayName: 'Gunslinger', role: 'pistol ace', opening: 'This path turns ranged skill into reputation. Decide whether the gun is your answer, your signature, or the first step toward a larger legend.', trees: ['awareness', 'fortune', 'gunslinger', 'pistoleer', 'carbineer'] },
  outlaw: { displayName: 'Outlaw', role: 'fugitive operator', opening: 'The galaxy has placed you outside clean lines. Decide whether outlaw life is survival, rebellion, opportunity, or the identity you now claim.', trees: ['fringer', 'survivor', 'slicer', 'outlaw'] },
  sith_apprentice: { displayName: 'Sith Apprentice', role: 'dark-side intermediary', intermediary: true, opening: 'This path may be a weapon, a trial, or a bridge to darker mastery. Your answers tell the system whether to treat Sith training as an endpoint or a passage.', trees: ['armor_specialist', 'duelist', 'lightsaber_combat', 'sith', 'sith_alchemy', 'sith_commander'] },
  force_adept: { displayName: 'Force Adept', role: 'non-Jedi Force intermediary', intermediary: true, opening: 'You are following a Force tradition outside the usual orders. Decide whether this is home, survival, mystery, or a bridge toward deeper Force discipline.', trees: ['dark_side_devotee', 'force_adept', 'force_item', 'imperial_inquisitor', 'beastwarden', 'mystic', 'telepath'] },
  sith_lord: { displayName: 'Sith Lord', role: 'upper-tier Sith endpoint', upperTier: true, opening: 'This is an apex path of ambition and dominion. The survey will determine how completely the Dark Side should eclipse earlier build signals.', trees: ['sith'] },
  officer: { displayName: 'Officer', role: 'battlefield commander', opening: 'You have stepped into command. Decide whether leadership is your duty, your tactic, your burden, or the role that now defines you.', trees: ['commando', 'leadership', 'military_tactics', 'naval_officer', 'fugitive_commander', 'rebel_recruiter'] },
  crime_lord: { displayName: 'Crime Lord', role: 'underworld leader', opening: 'Power now moves through networks, fear, favors, and leverage. Decide whether this empire is a tool, a mask, or the character you are becoming.', trees: ['infamy', 'influence', 'mastermind'] },
  bounty_hunter: { displayName: 'Bounty Hunter', role: 'professional tracker', opening: 'The hunt has become a profession. Decide whether this path is about the quarry, the contract, survival, reputation, or a future beyond the next target.', trees: ['awareness', 'bounty_hunter', 'misfortune', 'gand_findsman', 'force_hunter'] },
  independent_droid: { displayName: 'Independent Droid', role: 'self-directed droid', opening: 'This path is about more than upgrades. It asks what independence means for a droid that no longer accepts a simple owner-function reading.', trees: ['specialized_droid', 'elite_droid', 'autonomy'] },
  martial_arts_master: { displayName: 'Martial Arts Master', role: 'unarmed combat master', opening: 'You are making the body the weapon. Decide whether this is discipline, defense, spectacle, or the purest expression of combat identity.', trees: ['awareness', 'master_of_ter_s_k_si'] },
  pathfinder: { displayName: 'Pathfinder', role: 'advanced scout', opening: 'This path turns survival and reconnaissance into a career. Decide whether you are finding routes, protecting others, or becoming the eyes of a larger cause.', trees: ['awareness', 'survivor', 'pathfinder'] },
  gladiator: { displayName: 'Gladiator', role: 'arena fighter', opening: 'The fight is now performance, endurance, and dominance. Decide whether the arena made you, trapped you, or gave you a stage to master.', trees: ['armor_specialist', 'awareness', 'gladiatorial_combat'] },
  shaper: { displayName: 'Shaper', role: 'biotech engineer', opening: 'You have entered a path of biotechnology and living craft. Decide whether creation, adaptation, or control is the center of this prestige identity.', trees: ['advanced_medicine', 'implant', 'shaper'] },
  enforcer: { displayName: 'Enforcer', role: 'law officer or security agent', opening: 'Authority has become your arena. Decide whether you are preserving order, exploiting position, or using enforcement methods to survive a harsher galaxy.', trees: ['survivor', 'enforcement'] },
  assassin: { displayName: 'Assassin', role: 'contract killer', opening: 'You are entering a path of final decisions. Decide whether assassination is precision, necessity, secrecy, or the new identity that replaces older restraint.', trees: ['misfortune', 'malkite_poisoner', 'assassin', 'genoharadan'] },
  droid_commander: { displayName: 'Droid Commander', role: 'droid battlefield leader', opening: 'You are becoming a command node, not just another unit. Decide whether leadership, coordination, or networked survival defines the path.', trees: ['inspiration', 'leadership', 'droid_commander'] },
  charlatan: { displayName: 'Charlatan', role: 'confidence artist', opening: 'This path makes deception a profession. Decide whether the con is survival, intelligence work, social warfare, or the character you are willing to become.', trees: ['disgrace', 'trickery'] },
  ace_pilot: { displayName: 'Ace Pilot', role: 'vehicle combat specialist', opening: 'The cockpit has become your proving ground. Decide whether you fly to survive, to lead, to destroy, or to become a legend written in engine trails.', trees: ['expert_pilot', 'gunner', 'spacer', 'squadron_leader', 'blockade_runner', 'wingman'] },
  vanguard: { displayName: 'Vanguard', role: 'advance scout', opening: 'You are stepping ahead of the line. Decide whether this path is about finding the enemy, guiding allies, or becoming the first warning before disaster.', trees: ['awareness', 'survivor', 'vanguard'] },
  military_engineer: { displayName: 'Military Engineer', role: 'combat technician', opening: 'The mission now depends on keeping systems alive under stress. Decide whether your path is repair, improvisation, support, or battlefield control.', trees: ['outlaw_tech', 'military_engineer'] },
  elite_trooper: { displayName: 'Elite Trooper', role: 'advanced combatant', opening: 'You have entered an advanced combat identity. Decide whether you are a weapon specialist, a commando, a protector, or a disciplined survivor of hard missions.', trees: ['camouflage', 'commando', 'weapon_master', 'master_of_ter_s_k_si', 'mandalorian_warrior', 'critical_master', 'melee_specialist', 'republic_commando', 'protection'] },
  melee_duelist: { displayName: 'Melee Duelist', role: 'single-combat specialist', opening: 'The duel has become your classroom. Decide whether this path is honor, survival, artistry, or the fastest way to end close combat.', trees: ['brawler', 'weapon_specialist', 'melee_duelist'] },
  improviser: { displayName: 'Improviser', role: 'resourceful problem-solver', opening: 'You have made quick thinking into a career. Decide whether this path preserves your flexibility, makes you a technical expert, or prepares you for worse odds.', trees: ['outlaw_tech', 'procurement', 'improviser'] },
  saboteur: { displayName: 'Saboteur', role: 'covert disruptor', opening: 'You are entering a path of precise disruption. Decide whether you break systems, slice control, build traps, or collapse enemy plans from the inside.', trees: ['misfortune', 'slicer', 'sabotage', 'turret'] },
  infiltrator: { displayName: 'Infiltrator', role: 'covert operative', opening: 'You are becoming the person who gets inside. Decide whether cover, stealth, intelligence, or surgical action should define the next talent choices.', trees: ['camouflage', 'bothan_spynet', 'infiltration', 'spy'] },
  imperial_knight: { displayName: 'Imperial Knight', role: 'Force bodyguard', opening: 'Duty and the Force now share the same blade. Decide whether armor, resolve, service, or martial discipline is the heart of this path.', trees: ['armor_specialist', 'duelist', 'lightsaber_combat', 'knights_armor', 'knights_resolve'] },
  force_disciple: { displayName: 'Force Disciple', role: 'upper-tier Force mystic', upperTier: true, opening: 'This path is about deep Force understanding beyond ordinary doctrine. Decide whether it completes your tradition, expands it, or reshapes everything before it.', trees: ['force_adept'] },
  jedi_knight: { displayName: 'Jedi Knight', role: 'Jedi intermediary', intermediary: true, opening: 'You have entered the trusted path of the Knight. Decide whether this is a destination, a bridge to mastery, or the discipline that will define your service.', trees: ['armor_specialist', 'duelist', 'lightsaber_combat', 'lightsaber_forms', 'jedi_battlemaster', 'jedi_shadow', 'jedi_watchman', 'jedi_archivist', 'jedi_healer', 'jedi_artisan', 'jedi_instructor', 'jedi_investigator', 'jedi_refugee', 'jedi_weapon_master'] },
  corporate_agent: { displayName: 'Corporate Agent', role: 'corporate operator', opening: 'You now operate through institutional power, contracts, and leverage. Decide whether the company is a mask, a weapon, or the real chain of command.', trees: ['leadership', 'lineage', 'corporate_power'] },
  master_privateer: { displayName: 'Master Privateer', role: 'licensed raider', opening: 'This path walks the line between legitimacy and piracy. Decide whether you are a captain, raider, negotiator, or survivor in disputed space.', trees: ['infamy', 'spacer', 'privateer', 'piracy'] },
};

function inferTreeCopy(treeId) {
  const key = normalizeKey(treeId);
  const copy = TREE_COPY[key];
  if (copy) {
    return {
      id: key,
      name: copy[0],
      notes: copy[1],
      roleBias: { ...(copy[2] || {}) },
      attributeBias: { ...(copy[3] || {}) },
      mechanicalBias: { talentTreeFocus: 0.8, classFeatureFocus: 0.35 },
    };
  }
  const label = toTitleCase(key);
  return {
    id: key,
    name: label,
    notes: `Focus talent choices around the ${label} discipline and the part of the prestige class it represents.`,
    roleBias: { specialist: 0.65, utility: 0.2 },
    attributeBias: {},
    mechanicalBias: { talentTreeFocus: 0.7 },
  };
}

export function getPrestigeSurveyProfile(classNameOrId) {
  const key = normalizeKey(classNameOrId);
  const profile = PRESTIGE_CLASS_PROFILES[key];
  if (!profile) return null;
  return {
    classId: key,
    ...profile,
    specializations: (profile.trees || []).map(inferTreeCopy),
  };
}

export function hasPrestigeSurveyProfile(classNameOrId) {
  return Boolean(getPrestigeSurveyProfile(classNameOrId));
}

export default PRESTIGE_CLASS_PROFILES;
