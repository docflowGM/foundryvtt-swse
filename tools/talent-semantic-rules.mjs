/**
 * Phase 3H-2 — evidence rules: what a talent's PUBLISHED RULE TEXT must say to earn each Phase 11 tag.
 *
 * Direction of authority: published rule -> canonical meaning -> semantic tag. These rules read ONLY the talent's own benefit/description
 * (and, where a tree is genuinely semantic, its tree). Archetype recommendations, legacy tags, prerequisites and class/role labels are never evidence.
 *
 * `confidence` HIGH  = the text names the concept explicitly (a skill, weapon group, named mechanic).
 *            MEDIUM = the text expresses the concept in general wording; included, but itemised for owner review.
 * Every assignment records the matched snippet. A tag without a matching rule is never assigned.
 */
const A = (re, id) => ({ re, id });
const ABIL = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const abilityRe = name => new RegExp(`\\b${name}\\s+(?:modifier|score|bonus|ability)\\b|\\b(?:your|their|its)\\s+${name}\\b(?!\\s+(?:check|defense))|\\binstead of (?:your )?${name}\\b|\\b${name}-based\\b`, 'i');

export const RULES = {
  ...Object.fromEntries(ABIL.map(n => [`ability_${n.slice(0, 3)}`, { confidence: 'HIGH', patterns: [A(abilityRe(n), `names the ${n} ability`)] }])),
  accuracy: { confidence: 'HIGH', patterns: [A(/\b(?:bonus|\+\d+)\s+(?:to|on)\s+(?:your\s+|its\s+)?(?:\w+\s+)?attack rolls?\b/i, 'bonus on attack rolls'), A(/\breroll\s+(?:the\s+|an?\s+|your\s+)?(?:\w+\s+)?attack roll/i, 'attack-roll reroll'), A(/\bignore\s+(?:the\s+)?(?:effects? of\s+)?(?:cover|concealment)\b/i, 'ignores cover/concealment'), A(/\bno penalty (?:on|to) (?:your )?(?:\w+ )?attack rolls?\b|\b(?:reduce|reduces)\b[^.]{0,20}\bpenalty\b[^.]{0,20}\battack rolls?\b|\baim action\b|\bpoint blank shot\b/i, 'attack-roll penalty relief / aiming')] },
  advanced_melee: { confidence: 'HIGH', patterns: [A(/\badvanced melee weapons?\b/i, 'names advanced melee weapons')] },
  ally_support: { confidence: 'MEDIUM', patterns: [A(/\b(?:an|one|any|each|every|your|nearby|adjacent|willing)\s+(?:willing\s+|nearby\s+|adjacent\s+)?ally\b|\ballies\b/i, 'benefits allies')], not: /(?:enem(?:y|ies)|target|opponent)(?:'s|’s)?\s+allies/i },
  area_damage: { confidence: 'HIGH', patterns: [A(/\barea attacks?\b|\bautofire\b|\bburst\b|\bsplash\b|\bcone\b|\d+x\d+ (?:area|square)|\bblast\b/i, 'area / burst / autofire attack')] },
  climb: { confidence: 'HIGH', patterns: [A(/\bclimb(?:ing|s)?\b/i, 'names climbing')] },
  control: { confidence: 'MEDIUM', patterns: [A(/\b(?:move[sd]?|moves)\b[^.]{0,30}\b(?:down|up)\b[^.]{0,20}condition track|\bcondition track\b[^.]{0,40}\b(?:target|enem|opponent|creature)|\b(?:target|enem(?:y|ies)|opponent|creature)\b[^.]{0,60}\bcondition track\b/i, 'imposes condition-track effects'), A(/\b(?:stun(?:s|ned)?|daze[sd]?|immobiliz\w+|paraly[sz]\w+|entangl\w+|restrain\w*|knocked? (?:\w+ )?prone|grabbed|pinned|disarm\w*|taunt\w*|frighten\w*|panic\w*|slowed)\b/i, 'imposes a restricting effect'), A(/\b(?:cannot|can't|unable to)\s+(?:take|move|attack|act)\b[^.]{0,40}\b(?:target|enem|opponent)|\b(?:target|enem(?:y|ies)|opponent)s?\b[^.]{0,40}\b(?:cannot|can't|unable to|loses?|must)\b|\b(?:takes?|suffers?)\s+an?\s+-\d+\s+penalty\b/i, 'restricts or penalizes enemies')] },
  damage: { confidence: 'MEDIUM', patterns: [A(/\b(?:deal|deals|inflict|inflicts|cause|causes)\b[^.]{0,50}\bdamage\b|\b(?:extra|additional|bonus|double|triple)\b[^.]{0,25}\bdamage\b|\bdamage (?:roll|bonus|dice)s?\b|\b\d+d\d+\b[^.]{0,20}\bdamage\b|\bdamage equal to\b/i, 'increases or deals damage')] },
  dark_side: { confidence: 'HIGH', patterns: [A(/\bdark side\b/i, 'names the dark side')], trees: ['Dark Side Devotee', 'Dark Side'] },
  deception: { confidence: 'HIGH', patterns: [A(/\bdeception\b|\bfeint\w*|\bdisguis\w+|\bbluff\w*|\bforger(?:y|ies)\b|\bmisdirect\w*/i, 'names deception')] },
  defense: { confidence: 'MEDIUM', patterns: [A(/(?:bonus|\+\d|-\d|penalt\w+|increase\w*|reduce\w*)[^.]{0,30}\b(?:(?:reflex|fortitude|will)\s+)?defenses?\b|\b(?:reflex|fortitude|will) defense\b[^.]{0,20}\b(?:bonus|increase\w*)|\bdamage reduction\b|\bparr(?:y|ies)\b|\bdeflect\w*|\bblock(?:s|ing)?\b|\bdodge\w*|\bevad\w+|\bevasion\b|\bcover\b|\bnegate\b[^.]{0,20}\b(?:attack|damage|hit)|\bcalculating your (?:reflex|fortitude|will) defense\b|\bcannot be flanked\b/i, 'improves defenses / negates attacks')] },
  droid: { confidence: 'HIGH', patterns: [A(/\bdroids?\b/i, 'names droids')], trees: ['First-Degree Droid', 'Second-Degree Droid', 'Third-Degree Droid', 'Fourth-Degree Droid', 'Fifth-Degree Droid', 'Specialized Droid', 'Elite Droid', 'Droid Commander', 'Independent Droid'] },
  endurance: { confidence: 'HIGH', patterns: [A(/\bendurance\b|\bfatigue\w*|\bexhaust\w*|\bforced march\b|\bhold(?:ing)? (?:your|their) breath\b/i, 'names endurance')] },
  equipment: { confidence: 'MEDIUM', patterns: [A(/\b(?:equipment|gear)\b(?! bonus)/i, 'concerns equipment / gear')] },
  fieldcraft: { confidence: 'MEDIUM', patterns: [A(/(?<!condition )\btrack(?:ing|s)?\b(?! of)|\bnavigat\w+|\bwilderness\b|\bterrain\b|\bcamouflag\w+|\bforag\w+|\btrail\b|\bhazard\w*/i, 'wilderness / tracking / terrain')] },
  finesse: { confidence: 'HIGH', patterns: [A(/\bweapon finesse\b|\bfinesse\b|\bdexterity\b[^.]{0,40}\binstead of\b[^.]{0,20}\bstrength\b|\bdexterity (?:modifier|bonus)\b[^.]{0,30}\b(?:melee|damage)\b/i, 'finesse / Dexterity in place of Strength')] },
  force: { confidence: 'MEDIUM', patterns: [A(/\bthe force\b|\bforce[- ](?:points?|powers?|techniques?|secrets?|training|sensitiv\w+|talents?|users?|adept|lightning|regimens?)\b/i, 'concerns the Force')] },
  force_power: { confidence: 'HIGH', patterns: [A(/\bforce powers?\b|\bforce techniques?\b/i, 'names Force powers / techniques')] },
  force_training: { confidence: 'HIGH', patterns: [A(/\bforce training\b/i, 'names the Force Training feat')] },
  gather_information: { confidence: 'HIGH', patterns: [A(/\bgather information\b/i, 'names Gather Information')] },
  hacking: { confidence: 'HIGH', patterns: [A(/\bslic(?:e|ing|er)\b|\bhack\w*|\bdecrypt\w*|\bsecurity (?:system|protocol)s?\b/i, 'slicing / hacking / security systems')] },
  healing: { confidence: 'MEDIUM', patterns: [A(/\bheal(?:s|ed|ing)?\b|\bfirst aid\b|\brevive\w*|\b(?:regain|regains|restore|restores|recover|recovers)\b[^.]{0,40}\bhit points\b/i, 'restores hit points / heals')] },
  heavy_weapon: { confidence: 'HIGH', patterns: [A(/\bheavy weapons?\b/i, 'names heavy weapons')] },
  initiative: { confidence: 'HIGH', patterns: [A(/\binitiative\b/i, 'names initiative')] },
  jump: { confidence: 'HIGH', patterns: [A(/\bjump(?:ing|s)?\b|\bleap\w*/i, 'names jumping')] },
  knowledge: { confidence: 'HIGH', patterns: [A(/\bknowledge\s*\(|\bknowledge (?:skill|check)s?\b|\buntrained knowledge\b/i, 'names a Knowledge skill')] },
  leadership: { confidence: 'MEDIUM', patterns: [A(/\binspir\w+|\brall(?:y|ies|ying)\b|\bmorale\b|\bsubordinates?\b|\bcommanding\b|\bcommand (?:an?|your|the|a)\b|\bissue (?:an? )?orders?\b|\byour (?:followers?|minions?|troops)\b|\bcoordinat\w+|\bsquad\b/i, 'commands / inspires / coordinates others')] },
  lightsaber: { confidence: 'HIGH', patterns: [A(/\blightsabers?\b/i, 'names lightsabers')], trees: ['Lightsaber Forms', 'Lightsaber Combat'] },
  lightsaber_form: { confidence: 'HIGH', patterns: [A(/\blightsaber forms?\b|\bforms?\s+(?:talent|power)\b|\b(?:makashi|shii-?cho|soresu|ataru|djem so|niman|juyo|vaapad|sokan|trakata|jar'?kai)\b/i, 'names lightsaber forms')], trees: ['Lightsaber Forms'] },
  mechanics: { confidence: 'HIGH', patterns: [A(/\bmechanics\b|\bjury[- ]?rig\w*|\brepairs?\b|\bsabotag\w+|\bconstruct\w*/i, 'names Mechanics / repair / construction')] },
  medical: { confidence: 'HIGH', patterns: [A(/\btreat injury\b|\bmedical\b|\bsurgery\b|\bmedpacs?\b|\bdiseases?\b|\bantidotes?\b|\bmedic\b|\bpoison\w*|\btoxin\w*/i, 'names Treat Injury / medical care')] },
  melee: { confidence: 'HIGH', patterns: [A(/\bmelee\b|\bunarmed\b|\bmartial arts\b|\bnatural weapons?\b/i, 'names melee / unarmed attacks')] },
  mobility: { confidence: 'MEDIUM', patterns: [A(/\b(?:speed|movement|difficult terrain|double move|withdraw|charge|squares? of movement)\b|\bmove (?:\d+|up to|your speed|a distance|through|away)\b|\bmove action\b|\bwhen you move\b|\bmoving (?:through|across|up to|away|\d)\b|\btumbl\w+/i, 'movement / speed')] },
  perception: { confidence: 'HIGH', patterns: [A(/\bperception\b|\bnotice\b|\bdarkvision\b|\blow-light vision\b|\bblindsight\b|\bspot(?:ting)?\b/i, 'names Perception / noticing')] },
  persuasion: { confidence: 'HIGH', patterns: [A(/\bpersuasion\b|\bpersuad\w+|\bnegotiat\w+|\bbargain\w*|\bdiplomac\w+|\battitude\b/i, 'names Persuasion / attitude')] },
  pilot: { confidence: 'HIGH', patterns: [A(/\bpilot(?:ing|ed|s)?\b/i, 'names Pilot')], trees: ['Expert Pilot'] },
  pistol: { confidence: 'HIGH', patterns: [A(/\bpistols?\b/i, 'names pistols')] },
  ranged: { confidence: 'HIGH', patterns: [A(/\branged\b|\bblasters?\b|\bbowcasters?\b|\bthrown weapons?\b|\bfirearms?\b|\bpistols?\b|\brifles?\b|\bheavy weapons?\b|\bautofire\b|\breload\w*|\bfiring\b|\bscopes?\b/i, 'names ranged attacks / weapons')] },
  ride: { confidence: 'HIGH', patterns: [A(/\bride\b|\bmounts?\b|\bmounted\b/i, 'names Ride / mounts')] },
  rifle: { confidence: 'HIGH', patterns: [A(/\brifles?\b/i, 'names rifles')] },
  sniper: { confidence: 'HIGH', patterns: [A(/\bsnip(?:er|e|ing)\b/i, 'names sniping')] },
  social: { confidence: 'MEDIUM', patterns: [A(/\bpersuasion\b|\bdeception\b|\bgather information\b|\battitude\b|\bintimidat\w+|\bnegotiat\w+|\bcharm\w*|\bdiplomac\w+|\bcontacts?\b|\bsocial\b/i, 'social interaction')] },
  starship: { confidence: 'HIGH', patterns: [A(/\bstarships?\b|\bstarfighters?\b|\bcapital ships?\b|\bhyperdrive\b/i, 'names starships')] },
  stealth: { confidence: 'HIGH', patterns: [A(/\bstealth\b|\bsneak(?:ing)?\b|\bhid(?:e|ing)\b|\bconcealment\b|\bunobserved\b/i, 'names Stealth / hiding')] },
  support: { confidence: 'MEDIUM', patterns: [A(/\baid another\b|\b(?:an|one|any|each|every|your|nearby|adjacent|willing)\s+(?:willing\s+|nearby\s+|adjacent\s+)?(?:ally|allies)\b|\ballies\b|\banother character\b|\bone other\b|\bwilling (?:creature|character)\b/i, 'assists another character')] },
  survivability: { confidence: 'MEDIUM', patterns: [A(/\b(?:bonus|temporary) hit points\b|\bsecond wind\b|\bdamage reduction\b|\bimmun\w+|\bresist(?:ance|s|ed)?\b|\b(?:increase|gain|add|raise)\w*\b[^.]{0,30}\b(?:your|their|its) damage threshold\b|\bavoid\w* (?:death|dying)\b|\bsurviv\w+/i, 'bonus hit points / DR / resistance / second wind')] },
  survival: { confidence: 'HIGH', patterns: [A(/\bsurvival\b|\bforag\w+|\bwilderness\b/i, 'names Survival / wilderness')] },
  swim: { confidence: 'HIGH', patterns: [A(/\bswim(?:ming|s)?\b/i, 'names swimming')] },
  tech: { confidence: 'MEDIUM', patterns: [A(/\btechnolog\w+|\bdevices?\b|\bgadgets?\b|(?<!use )\bcomputers?\b|\bcybernetic\w*|\bimplants?\b|\belectronic\w*|\bsensors?\b|\bdatapads?\b|\bcomlinks?\b|\bscanners?\b|\bcircuitry\b|\btechnician\b/i, 'technological devices')] },
  use_computer: { confidence: 'HIGH', patterns: [A(/\buse computer\b/i, 'names Use Computer')] },
  use_the_force: { confidence: 'HIGH', patterns: [A(/\buse the force\b/i, 'names Use the Force')] },
  vehicle: { confidence: 'HIGH', patterns: [A(/\bvehicles?\b|\bspeeders?\b|\bwalkers?\b|\bvehicular\b/i, 'names vehicles')] }
};

const clip = (text, m) => { const a = Math.max(0, m.index - 28), b = Math.min(text.length, m.index + m[0].length + 28); return text.slice(a, b).replace(/\s+/g, ' ').trim(); };

/** @returns {{tag, confidence, evidence:{source, rule, snippet}[]}[]} sorted by tag (deterministic) */
export function deriveTags({ benefit = '', description = '', treeName = '' }, vocab) {
  const out = [];
  const texts = [['benefit', String(benefit ?? '')]]; if (String(description ?? '').trim() && String(description).trim() !== String(benefit).trim()) texts.push(['description', String(description)]);
  for (const tag of [...vocab].sort()) {
    const rule = RULES[tag]; if (!rule) continue;
    const evidence = [];
    for (const [source, text] of texts) for (const p of rule.patterns) { const m = p.re.exec(text); if (m && !(rule.not && rule.not.test(text))) { evidence.push({ source, rule: p.id, snippet: clip(text, m) }); } }
    if (rule.trees?.includes(treeName)) evidence.push({ source: 'tree/domain', rule: `tree "${treeName}" is a ${tag} domain`, snippet: treeName });
    if (evidence.length) out.push({ tag, confidence: rule.confidence, evidence: evidence.slice(0, 3) });
  }
  return out;
}
