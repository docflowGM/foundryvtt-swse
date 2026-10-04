// Pass 3B evidence detectors. A detector only identifies records whose canonical mechanic text explicitly invokes a mechanic;
// it NEVER assigns a tag. `tag` is the shared-vocabulary tag that would represent the mechanic (the comparison target).
// confidence: HIGH = unambiguous published phrase; MEDIUM = strong structural phrase, some prose false positives expected;
// LOW = broad lexical evidence only (never promoted to owner review by itself).
// Prerequisite text is never scanned (evidence is Benefit/rules text only).
export const FAMILIES = {
  A: 'Action economy', B: 'Rerolls / reliability', C: 'Resource mechanics', D: 'Damage mechanics', E: 'Critical mechanics',
  F: 'Targeting / setup', G: 'Battlefield control', H: 'Reactive combat', I: 'Defense', J: 'Recovery / medicine',
  K: 'Support / command', L: 'Technology', M: 'Vehicle / space', N: 'Force mechanics', O: 'Weapon / combat mode'
};
const D = (id, family, tag, confidence, re, extra = {}) => ({ id, family, tag, confidence, re, ...extra });
const COST = (kind) => new RegExp(`(?:\\bas an? |\\b(?:spend|spends|spent|use|uses|using|take|takes|taking|costs?|requires?|expend|expends) (?:an? )?)${kind} action\\b`, 'i');

export const DETECTORS = [
  // A. Action economy (explicit costs; granted actions kept separate)
  D('A.cost_reaction', 'A', 'reaction', 'HIGH', /\bas a reaction\b|\bwhen you (?:take|use) a reaction\b|\bspend(?:s)? a reaction\b|\btakes? a reaction\b/i),
  D('A.cost_swift', 'A', 'swift_action', 'HIGH', COST('swift')),
  D('A.cost_move', 'A', 'move_action', 'HIGH', COST('move')),
  D('A.cost_standard', 'A', 'standard_action', 'HIGH', COST('standard')),
  D('A.grants_action', 'A', 'action_economy', 'MEDIUM', /(?:grant|grants|allow|allows|give|gives)\b[^.]{0,70}\b(?:an? |one )?(?:extra |additional |immediate )?(?:swift|move|standard|full-round) action|\b(?:extra|additional) (?:swift|move|standard|full-round) action|\bimmediate(?:ly)? (?:take|make) an? (?:swift|move|standard) action/i, { note: 'Grants another creature (or yourself) an action; distinct from paying the cost.' }),
  D('A.any_action_cost', 'A', 'action_economy', 'HIGH', /(?:\bas an? |\b(?:spend|spends|use|uses|using|take|takes|taking|costs?|requires?) (?:an? )?)(?:swift|move|standard|full-round) action\b|\bas a reaction\b/i),
  // B. Rerolls / reliability
  D('B.reroll', 'B', 'reroll', 'HIGH', /\bre-?roll/i),
  D('B.roll_twice_keep', 'B', 'reliability', 'MEDIUM', /\broll(?:s)? (?:twice|two dice)|(?:keep|use|take) the (?:better|higher|best)|(?:better|higher) of (?:the )?two (?:rolls|results)/i),
  D('B.take_10_20', 'B', 'reliability', 'MEDIUM', /\btak(?:e|ing|es) (?:10|20)\b|\btake ten\b/i),
  D('B.automatic_success', 'B', 'reliability', 'MEDIUM', /automatic(?:ally)? succe|(?:cannot|can't|never) (?:fail|roll (?:a )?(?:natural )?1)|treat (?:the )?(?:natural )?(?:1|roll) as/i),
  D('B.skill_mastery', 'B', 'skill_mastery', 'MEDIUM', /\bskill mastery\b/i),
  // C. Resource mechanics
  D('C.force_point_spend', 'C', 'force_point_spend', 'HIGH', /\b(?:spend|spends|spent|spending|expend|expends)\b[^.]{0,30}\bForce Points?\b|\bForce Point\b[^.]{0,25}\b(?:to activate|to gain|to use)|\bby spending a Force Point/i),
  D('C.resource_spend', 'C', 'resource_spend', 'MEDIUM', /\b(?:spend|spends|expend|expends|sacrifice)\b[^.]{0,50}\b(?:Force Points?|Destiny Points?|Force Powers?|use of|uses of|daily use|hit points)\b/i),
  D('C.resource_recovery', 'C', 'resource_recovery', 'MEDIUM', /\b(?:regain|regains|replenish|replenishes|refresh|refreshes)\b[^.]{0,50}\b(?:Force Points?|Force Powers?|spent|use of|uses of|daily|expended|talent)|\breturn(?:s)? (?:to your|a spent)[^.]{0,30}(?:Force Power|suite)|\bnot (?:be )?(?:spent|expended)/i),
  D('C.once_per_encounter', 'C', 'once-per-encounter', 'HIGH', /\bonce per encounter\b|\bonce each encounter\b|\bonce during (?:an|each|the) encounter\b/i),
  D('C.force_capacity', 'C', 'force_capacity', 'MEDIUM', /(?:additional|extra|more) Force Powers?\b|\bForce Power suite\b|\badditional Force Points?\b|\bnumber of Force Powers\b/i),
  // D. Damage mechanics
  D('D.damage_bonus', 'D', 'damage_bonus', 'MEDIUM', /(?:\+|plus )\d+ (?:bonus )?(?:to |on )?(?:damage|your damage)|bonus (?:to|on) damage|\+\d+ (?:points? of )?(?:bonus )?damage|\bextra damage\b|\bbonus damage\b|add [^.]{0,30}to (?:your |the )?damage/i),
  D('D.burst_damage', 'D', 'burst_damage', 'MEDIUM', /\b(?:extra|additional|bonus) \d*d\d+\b|\b(?:extra|additional) dice of damage|\bdouble(?:s|d)? (?:the )?(?:damage|result)|\b(?:deal|deals) (?:double|triple|maximum) damage|\bmaximum damage\b/i),
  D('D.sustained_damage', 'D', 'sustained_damage', 'MEDIUM', /(?:each|every) (?:subsequent |following )?(?:round|turn)[^.]{0,60}\bdamage\b|\bongoing damage\b|\bpersistent damage\b|\bdamage (?:each|every) (?:round|turn)\b|subsequent (?:rounds|attacks)[^.]{0,30}damage/i),
  D('D.precision', 'D', 'precision', 'HIGH', /\bprecis(?:e|ion)\b|\baimed? (?:shot|attack)\b|\bprecise shot\b/i),
  D('D.precision_damage', 'D', 'precision_damage', 'MEDIUM', /\bprecision damage\b|(?:extra|additional|bonus) damage[^.]{0,60}(?:flat-footed|denied (?:his|her|its|their) Dexterity|unaware|aim|within \d+ squares)/i),
  D('D.damage_threshold', 'D', 'damage_threshold', 'HIGH', /\bdamage threshold\b/i),
  D('D.damage_generic', 'D', 'damage', 'LOW', /\bdeals? (?:extra |additional |bonus |\d+d\d+ )?(?:points of )?damage\b|\bdamage roll/i),
  // E. Critical mechanics
  D('E.critical_hit', 'E', 'critical_hit', 'HIGH', /\bcritical hit\b|\bcritical threat\b|\bthreat range\b|\bscores? a critical\b|\bcritical (?:range|damage|multiplier)\b/i),
  D('E.natural_20', 'E', 'critical_success', 'HIGH', /\bnatural 20\b|\bnatural twenty\b|\bnatural 20s\b|\bcritical success\b/i),
  // F. Targeting / setup
  D('F.designate', 'F', 'target-designation', 'HIGH', /\bdesignate[sd]?\b|\bmarked? (?:an? |one |the )?(?:target|enemy|opponent)|\bchosen (?:target|opponent|enemy)\b/i),
  D('F.targeting', 'F', 'targeting', 'LOW', /\btargeting\b|\bweak point|\bvital (?:spot|area)|\bspecific (?:target|location)/i),
  D('F.setup', 'F', 'setup', 'LOW', /\bbefore (?:your|the) (?:next )?attack\b|\bprepar(?:e|ation|ing)\b|\bset up\b|\bon your next (?:turn|attack)\b[^.]{0,40}\bif you\b/i),
  D('F.ambush', 'F', 'ambush', 'MEDIUM', /\bambush|\bflat-footed\b|\bunaware of (?:you|your)\b|\bdenied (?:his|her|its|their) Dexterity\b|\bsneak attack\b/i),
  D('F.ambush_defense', 'F', 'ambush_defense', 'MEDIUM', /\b(?:not|never|cannot be|can't be) (?:be )?(?:considered )?(?:flat-footed|surprised|ambushed)|\bretain your Dexterity bonus\b|\bflat-footed\b[^.]{0,40}\b(?:against you|you are)\b|\bwhen you are (?:surprised|ambushed|flat-footed)/i),
  D('F.surprise_round', 'F', 'surprise_round', 'HIGH', /\bsurprise round\b/i),
  // G. Battlefield control
  D('G.grab', 'G', 'grab', 'HIGH', /\bgrab(?:s|bed|bing)?\b|\bgrabbed\b/i),
  D('G.grapple', 'G', 'grapple', 'HIGH', /\bgrappl(?:e|es|ed|ing)\b/i),
  D('G.restrain', 'G', 'restrain', 'HIGH', /\bpin(?:s|ned|ning)\b|\brestrain|\bimmobiliz|\bentangle|\bimmobile\b/i),
  D('G.forced_movement', 'G', 'battlefield_control', 'MEDIUM', /\bpush(?:es|ed)? [^.]{0,30}(?:squares?|away|back)|\bpull(?:s|ed)? [^.]{0,30}(?:squares?|toward)|\bmoves? (?:the |that |your )?(?:target|opponent|enemy|creature)[^.]{0,30}squares?|\bknock(?:s|ed)? [^.]{0,25}(?:back|prone)|\bfall(?:s)? prone\b|\bgrants? the target (?:the )?prone/i),
  D('G.speed_change', 'G', 'movement', 'MEDIUM', /\b(?:increase|increases|reduce|reduces|decrease|decreases)\b[^.]{0,25}\bspeed\b|\+\d+ squares? to (?:your )?speed|\bspeed (?:is |becomes )?(?:reduced|increased)|\bbonus to (?:your )?speed/i),
  D('G.mobility', 'G', 'mobility', 'MEDIUM', /\bdifficult terrain\b|\bwithout provoking\b|\bdoes(?:n't| not) provoke\b|\bmove through (?:a )?threatened\b|\bmove through (?:an? )?(?:enemy|opponent)'?s? (?:square|space)/i),
  D('G.pursuit', 'G', 'pursuit', 'HIGH', /\bmoves? (?:with|along with) (?:that|the|an?) (?:opponent|enemy|creature|target)|\bfollow(?:s|ing)? (?:that |the )?(?:opponent|enemy|target|creature)|\bpursu(?:e|es|ing|it)\b/i),
  D('G.positioning', 'G', 'positioning', 'MEDIUM', /\bswap(?:s)? places|\bchange(?:s)? places|\bshift(?:s)? (?:\d+ squares?|one square|yourself)|\breposition|\bmove (?:your|an? ally's|the) [^.]{0,15}(?:position|square)/i),
  // H. Reactive combat
  D('H.attack_of_opportunity', 'H', 'attack_of_opportunity', 'HIGH', /attacks? of opportunity/i),
  D('H.counterattack', 'H', 'counterattack', 'HIGH', /\bcounter-?attack|\bretaliat|\bmake an? (?:immediate )?(?:melee |ranged )?attack against (?:that|the) (?:attacker|opponent|enemy|creature)|\battack(?:s)? (?:that|the) (?:attacker|opponent|enemy) (?:immediately|in return)/i),
  D('H.overwatch', 'H', 'overwatch', 'HIGH', /\boverwatch\b|\bready (?:an )?(?:action|attack)|\breadied (?:action|attack)|\bwhen an? (?:enemy|opponent|creature) (?:moves|enters|leaves)[^.]{0,80}(?:make|take) an? (?:attack|ranged attack)/i),
  // I. Defense
  D('I.defense_generic', 'I', 'defense', 'LOW', /\b(?:Reflex|Fortitude|Will) Defense\b/i),
  D('I.melee_defense', 'I', 'melee_defense', 'MEDIUM', /\bmelee attacks? (?:made )?against you\b|\bagainst melee attacks\b|\bmelee attacks?\b[^.]{0,30}\bReflex Defense\b/i),
  D('I.ranged_defense', 'I', 'ranged_defense', 'MEDIUM', /\branged attacks? (?:made )?against you\b|\bagainst ranged attacks\b|\branged attacks?\b[^.]{0,30}\bReflex Defense\b/i),
  D('I.damage_reduction', 'I', 'damage_reduction', 'HIGH', /\bdamage reduction\b|\bDR\s?\d+|\bDR\b/),
  D('I.cover', 'I', 'cover', 'MEDIUM', /\bcover\b/i),
  D('I.concealment', 'I', 'concealment', 'HIGH', /\bconcealment\b/i),
  D('I.evasion', 'I', 'evasion', 'MEDIUM', /\bevasion\b|(?:take|takes) (?:no|half) damage[^.]{0,40}(?:area|Reflex|miss)|\barea attacks?[^.]{0,50}(?:half|no) damage/i),
  D('I.resilience', 'I', 'resilience', 'LOW', /\bresilien/i),
  D('I.survivability_hp', 'I', 'survivability', 'LOW', /\b(?:bonus|temporary) hit points\b/i),
  // J. Recovery / medicine
  D('J.healing', 'J', 'healing', 'MEDIUM', /\bheal(?:s|ing|ed)?\b|\bregain(?:s)? (?:\d+|a number|hit|an amount)[^.]{0,25}hit points|\bsecond wind\b/i),
  D('J.recovery', 'J', 'recovery', 'MEDIUM', /\brecover(?:s|y|ed)?\b|\bsecond wind\b|\bcondition track\b[^.]{0,30}\b(?:up|improve|step)|\b(?:up|improve)\b[^.]{0,30}\bcondition track\b/i),
  D('J.condition_removal', 'J', 'condition_removal', 'MEDIUM', /\b(?:remove|removes|end|ends|negate|negates|cure|cures)\b[^.]{0,40}\b(?:condition|poison|disease|persistent)\b|\bmoves? [^.]{0,15}(?:\+?\d|one|two) steps? (?:up|along)[^.]{0,20}condition track/i),
  D('J.medical', 'J', 'medical', 'MEDIUM', /\bmedical\b|\bmedpac|\bmedical (?:kit|supplies)/i),
  D('J.medicine', 'J', 'medicine', 'MEDIUM', /\bmedicine\b|\bphysician\b|\bsurg(?:ery|eon)\b/i),
  D('J.treat_injury', 'J', 'treat_injury', 'HIGH', /\bTreat Injury\b/i),
  D('J.poison', 'J', 'poison', 'HIGH', /\bpoison(?:s|ed|ous)?\b|\bvenom|\btoxin/i),
  D('J.self_repair', 'J', 'self_repair', 'MEDIUM', /\brepair(?:s)? (?:yourself|itself|himself|herself)|\bself-repair|(?:repair|heal) (?:your own|its own)/i),
  D('J.repair', 'J', 'repair', 'HIGH', /\brepair(?:s|ed|ing)?\b/i),
  // K. Support / command
  D('K.ally', 'K', 'ally_support', 'MEDIUM', /\b(?:an? |one |each |all |any |your |adjacent |nearby )(?:ally|allies)\b|\ballied\b/i),
  D('K.teamwork', 'K', 'teamwork', 'MEDIUM', /\bteamwork\b|\baid another\b|\bcoordinat(?:e|ed|ion)\b|\bflank/i),
  D('K.leadership', 'K', 'leadership', 'MEDIUM', /\bleadership\b|\binspire[sd]?\b|\brall(?:y|ies)\b/i),
  D('K.command', 'K', 'command', 'MEDIUM', /\bcommand(?:s|ed|ing)?\b[^.]{0,40}\b(?:ally|allies|droid|follower|minion|creature|soldier)|\bgive(?:s)? (?:an? )?order|\byour commanded\b/i),
  D('K.morale', 'K', 'morale', 'MEDIUM', /\bmorale\b|\bfear\b|\binspire/i),
  D('K.followers', 'K', 'followers', 'HIGH', /\bfollowers?\b/i),
  D('K.minion', 'K', 'minion', 'HIGH', /\bminions?\b/i),
  // L. Technology
  D('L.tech_generic', 'L', 'tech', 'LOW', /\btechnolog|\bdevice|\belectronic|\bcomputer/i),
  D('L.mechanics_skill', 'L', 'mechanics', 'HIGH', /\bMechanics\b/),
  D('L.use_computer', 'L', 'use_computer', 'HIGH', /\buse computer\b/i),
  D('L.crafting', 'L', 'crafting', 'MEDIUM', /\bcraft(?:s|ed|ing)?\b|\bconstruct(?:s|ed|ing)?\b|\bbuild(?:s|ing)? (?:an? |the )?(?:item|device|weapon|armor|droid|vehicle)/i),
  D('L.modification', 'L', 'modification', 'HIGH', /\bmodif(?:y|ies|ied|ication|ications)\b/i),
  D('L.jury_rig', 'L', 'jury_rig', 'HIGH', /\bjury[- ]?rig/i),
  D('L.slicing', 'L', 'slicing', 'HIGH', /\bslic(?:e|es|ed|ing|er)\b|\bhack(?:s|ed|ing)?\b/i),
  D('L.sensors', 'L', 'sensors', 'HIGH', /\bsensors?\b/i),
  D('L.power_systems', 'L', 'power_systems', 'MEDIUM', /\bpower (?:systems?|cell|pack|source|plant)\b|\bgenerator\b|\breactor\b|\bengines?\b/i),
  // M. Vehicle / space
  D('M.vehicle', 'M', 'vehicle', 'HIGH', /\bvehicles?\b|\bstarships?\b|\bspeeder|\bwalker\b|\bstarfighter/i),
  D('M.space', 'M', 'space', 'MEDIUM', /\bstarship|\bhyperspace\b|\bin space\b|\bspace combat\b|\bcapital ship|\bstarfighter|\bvacuum\b/i),
  D('M.pilot_skill', 'M', 'pilot', 'HIGH', /\bPilot (?:checks?|skill|modifier)\b|\b(?:make|made|makes|with) (?:a |an )?Pilot\b|\bPilot\)|\bPilot check/ ),
  D('M.shields', 'M', 'shields', 'HIGH', /\bshields?\b|\bshield rating\b/i),
  // N. Force mechanics
  D('N.use_the_force_skill', 'N', 'use_the_force', 'HIGH', /\bUse the Force (?:checks?|skill|modifier|result|bonus)\b|\b(?:make|made|makes|with|your) (?:a |an )?Use the Force\b|\bUse the Force\)/i, { note: '"use the Force" prose is not the skill; only skill phrasing is detected.' }),
  D('N.force_power', 'N', 'force_power', 'HIGH', /\bForce powers?\b/i),
  D('N.force_power_synergy', 'N', 'force_power_synergy', 'MEDIUM', /\b(?:when|whenever|if) you (?:use|activate|successfully use)[^.]{0,40}Force power|\bForce power[^.]{0,40}\b(?:you can|reroll|regain|add)\b|\baffected by (?:a )?Force power/i),
  D('N.force_defense', 'N', 'force_defense', 'MEDIUM', /\bForce powers?[^.]{0,40}(?:target(?:ing|s)? you|against you)|\bresist(?:s|ing)? [^.]{0,20}Force|\bUse the Force check[^.]{0,30}against you/i),
  D('N.force_training', 'N', 'force_training', 'MEDIUM', /\bForce Training\b|\bForce Sensitiv/i),
  D('N.anti_force', 'N', 'anti-force', 'MEDIUM', /\banti-Force\b|\bnegate[sd]? [^.]{0,30}Force power|\bsuppress(?:es|ed)? [^.]{0,20}Force|\bForce immun|\bcannot be affected by (?:the )?Force/i),
  D('N.light_side', 'N', 'light_side', 'HIGH', /\blight side\b/i),
  D('N.dark_side', 'N', 'dark_side', 'HIGH', /\bdark side\b/i),
  D('N.dark_side_score', 'N', 'dark_side_score', 'HIGH', /\bdark side score\b/i),
  D('N.force_generic', 'N', 'force', 'LOW', /\bthe Force\b|\bForce (?:power|point|training|sensitiv)/i),
  // O. Weapon / combat mode
  D('O.melee', 'O', 'melee', 'HIGH', /\bmelee\b/i),
  D('O.ranged', 'O', 'ranged', 'HIGH', /\branged\b/i),
  D('O.unarmed', 'O', 'unarmed', 'HIGH', /\bunarmed\b/i),
  D('O.martial_arts', 'O', 'martial_arts', 'HIGH', /\bmartial arts\b/i),
  D('O.lightsaber', 'O', 'lightsaber', 'HIGH', /\blightsabers?\b/i),
  D('O.pistol', 'O', 'pistol', 'HIGH', /\bpistols?\b/i),
  D('O.heavy_weapon', 'O', 'heavy_weapon', 'HIGH', /\bheavy weapons?\b/i),
  D('O.improvised_weapon', 'O', 'improvised_weapon', 'HIGH', /\bimprovised weapons?\b/i),
  D('O.exotic_weapon', 'O', 'exotic_weapon', 'HIGH', /\bexotic weapons?\b/i),
  D('O.double_weapon', 'O', 'double_weapon', 'HIGH', /\bdouble weapons?\b|\bdouble-bladed\b|\bdouble lightsaber/i),
  D('O.dual_wield', 'O', 'dual_wield', 'MEDIUM', /\btwo weapons\b|\bdual[- ]wield|\btwo-weapon\b|\bboth weapons\b|\b(?:second|off)[- ]hand\b/i),
  D('O.full_attack', 'O', 'full_attack', 'HIGH', /\bfull attack\b/i),
  D('O.fighting_defensively', 'O', 'fighting_defensively', 'HIGH', /\bfight(?:ing)? defensively\b/i),
  D('O.flanking', 'O', 'flanking', 'HIGH', /\bflank/i),
  D('O.stun', 'O', 'stun', 'HIGH', /\bstun(?:s|ned|ning)?\b|\bion damage\b/i),
  D('O.nonlethal', 'O', 'nonlethal', 'HIGH', /\bnon-?lethal\b/i)
];

// Mechanic detectors used only inside bundles (not themselves compared against a tag).
export const AUX = {
  persistent_condition: /\bpersistent condition\b/i,
  attack_bonus: /(?:\+|plus )\d+ (?:bonus |competence )?(?:to|on) (?:your )?attack|\battack rolls?\b/i,
  defense_bonus: /(?:\+|plus )\d+ (?:bonus |dodge |deflection )?(?:to|on) (?:your )?(?:Reflex Defense|Defense|Fortitude Defense|Will Defense)|\bdamage reduction\b|\bconcealment\b|\bcover\b/i,
  second_wind: /\bsecond wind\b/i,
  condition_track: /\bcondition track\b/i,
  skill_substitute: /\binstead of (?:your |the )?(?:\w+ ){0,3}(?:modifier|check)|\bsubstitut/i,
  ally_trigger: /\bwhen (?:an? |one of your )?ally\b|\bif an? ally\b|\ballies?[^.]{0,30}\bwhen\b/i,
  prone: /\bprone\b/i
};

// Cross-domain mechanic bundles: a bundle member must fire EVERY listed detector/aux key. `tight: true` bundles are specific enough to produce
// record-level mismatch candidates; loose bundles (a bare keyword such as condition track or prone) are shown as tables only.
export const BUNDLES = [
  { id: 'reroll_keep_better', tight: true, label: 'Reroll with keep-better / roll-twice', all: ['B.reroll'], any: ['B.roll_twice_keep'], comparedTags: ['reroll', 'reliability'] },
  { id: 'reroll', tight: true, label: 'Explicit reroll', all: ['B.reroll'], comparedTags: ['reroll', 'reliability'] },
  { id: 'persistent_condition_treat_injury', tight: true, label: 'Persistent condition removed by Treat Injury', all: ['aux:persistent_condition', 'J.treat_injury'], comparedTags: ['treat_injury'] },
  { id: 'fp_spend_attack_modifier', tight: true, label: 'Force Point expenditure + attack modifier', all: ['C.force_point_spend', 'aux:attack_bonus'], comparedTags: ['force_point_spend', 'resource_spend'] },
  { id: 'reaction_defensive_benefit', tight: true, label: 'Reaction + defensive benefit', all: ['A.cost_reaction', 'aux:defense_bonus'], comparedTags: ['reaction', 'action_economy', 'defense'] },
  { id: 'grapple_forced_movement', tight: true, label: 'Grapple attack + forced movement', all: ['G.grapple', 'G.forced_movement'], comparedTags: ['grapple', 'battlefield_control', 'movement'] },
  { id: 'natural20_resource_recovery', tight: true, label: 'Natural 20 + resource recovery', all: ['E.natural_20', 'C.resource_recovery'], comparedTags: ['critical_success', 'resource_recovery'] },
  { id: 'aoo_generation_modification', tight: true, label: 'Attack of opportunity generation / modification', all: ['H.attack_of_opportunity'], comparedTags: ['attack_of_opportunity'] },
  { id: 'second_wind_healing', label: 'Second wind', all: ['aux:second_wind'], comparedTags: ['healing', 'recovery'] },
  { id: 'condition_track_movement', label: 'Condition track movement', all: ['aux:condition_track'], comparedTags: ['recovery', 'condition_removal', 'healing'] },
  { id: 'skill_substitution', tight: true, label: 'Skill / modifier substitution', all: ['aux:skill_substitute'], comparedTags: ['skill_substitution'] },
  { id: 'ally_trigger', label: 'Ally-triggered benefit', all: ['aux:ally_trigger'], comparedTags: ['ally-trigger', 'ally_support'] },
  { id: 'damage_threshold_manipulation', tight: true, label: 'Damage threshold manipulation', all: ['D.damage_threshold'], comparedTags: ['damage_threshold'] },
  { id: 'prone_forced', label: 'Prone / knock-down', all: ['aux:prone'], comparedTags: ['battlefield_control', 'control'] }
];

// Owner-named broad tags receive an expanded reverse audit (Channel 3); the owner defines what they mean.
export const BROAD_TAGS = ['precision', 'setup', 'control', 'battlefield_control', 'resources', 'survivability', 'reliability', 'empowerment', 'targeting', 'target-designation', 'support', 'tech'];

// Recurring wording screened for the literal ontology-gap report (no conclusion is drawn; the owner decides whether any tag is needed; nothing is added).
export const GAP_CONCEPTS = [
  { id: 'condition_track', label: 'Condition Track movement', re: /\bcondition track\b/i },
  { id: 'second_wind', label: 'Second wind', re: /\bsecond wind\b/i },
  { id: 'bonus_hit_points', label: 'Bonus / temporary hit points', re: /\b(?:bonus|temporary) hit points\b/i },
  { id: 'destiny_points', label: 'Destiny Points', re: /\bdestiny points?\b/i },
  { id: 'free_action', label: 'Free action', re: /\bfree action\b/i },
  { id: 'full_round_action', label: 'Full-round action', re: /\bfull-round action\b/i },
  { id: 'prone', label: 'Prone / knocked down', re: /\bprone\b/i },
  { id: 'dodge_bonus', label: 'Dodge bonus', re: /\bdodge bonus\b/i },
  { id: 'size_category', label: 'Size category comparison', re: /\bsize categor/i },
  { id: 'aid_another', label: 'Aid Another', re: /\baid another\b/i },
  { id: 'persistent_condition', label: 'Persistent condition', re: /\bpersistent condition\b/i },
  { id: 'fatigue_stun_daze', label: 'Daze / stun / paralysis conditions', re: /\b(?:dazed?|paraly[sz]ed|blinded|deafened|confused|frightened)\b/i }
];
