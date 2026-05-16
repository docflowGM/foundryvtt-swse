/**
 * Class profile copy for the progression class step.
 *
 * This module intentionally contains short, original summaries for UI use.
 * Hover hooks sell the class fantasy; descriptions explain the role in the galaxy.
 */

const CLASS_PROFILES = {
  'Jedi': {
    quote: 'Stand between chaos and the innocent with a lightsaber in hand and the Force as your ally.',
    description: 'Jedi are peacekeepers, negotiators, and battlefield guardians trained to sense and shape the living Force. They pair disciplined martial training with spiritual focus, making them strong defenders and problem-solvers. A Jedi is ideal for players who want heroism, restraint, and decisive action when diplomacy fails.'
  },
  'Noble': {
    quote: 'Win the room before the battle begins, then lead others to victories they could not reach alone.',
    description: 'Nobles are leaders, envoys, patrons, and power brokers who shape events through influence and strategy. They excel when words, resources, and confidence matter as much as weapons. A Noble fits a character who commands trust, builds alliances, and turns social leverage into real battlefield momentum.'
  },
  'Scoundrel': {
    quote: 'Survive by nerve, charm, and the perfect trick at exactly the wrong moment for everyone else.',
    description: 'Scoundrels are clever rogues, smugglers, slicers, gamblers, spies, and opportunists. They thrive in messy situations where stealth, deception, and improvisation can beat raw force. A Scoundrel is the path for a character who bends rules, reads angles, and escapes with style.'
  },
  'Scout': {
    quote: 'Find the path no one else can see and keep moving when the galaxy turns hostile.',
    description: 'Scouts are explorers, survivalists, pathfinders, and field experts built for dangerous frontiers. They excel in wilderness, hostile planets, ruins, and distant trade lanes where preparation and perception matter. A Scout suits characters who want mobility, awareness, and practical skills in unknown territory.'
  },
  'Soldier': {
    quote: 'Hold the line, take the shot, and end the fight before your allies pay the price.',
    description: 'Soldiers are trained warriors who specialize in direct combat and weapon mastery. They bring durability, tactics, and reliable firepower to dangerous missions. A Soldier is the clear choice for a character who wants to dominate the fight and protect the team through superior arms and discipline.'
  },
  'Ace Pilot': {
    quote: 'Own the cockpit, read the battle in three dimensions, and make the impossible approach look routine.',
    description: 'Ace Pilots define themselves through the vehicles they fly, from starfighters to speeders and transports. They bring combat instincts, daring maneuvers, and calm under fire to vehicle engagements. In a campaign with chases, dogfights, and space battles, an Ace Pilot turns the vehicle into an extension of the character.'
  },
  'Bounty Hunter': {
    quote: 'Track the target, control the encounter, and bring the quarry in on your terms.',
    description: 'Bounty Hunters live by pursuit, patience, and professional detachment. They specialize in finding fugitives, studying prey, and choosing the right moment to strike or capture. This prestige path suits characters who want the thrill of the hunt and a reputation that follows them across systems.'
  },
  'Crime Lord': {
    quote: 'Build an empire in the shadows and make every favor, debt, and threat count.',
    description: 'Crime Lords operate at the top of underworld networks, where influence can be as dangerous as a blaster. They command loyalty, fear, resources, and information while navigating constant betrayal. This class fits characters who want power through organization, intimidation, and connections rather than honest authority.'
  },
  'Elite Trooper': {
    quote: 'Go where the fighting is worst and prove that training, grit, and precision still matter.',
    description: 'Elite Troopers are veteran combat specialists trained for high-risk missions and brutal engagements. They are versatile fighters who can handle assaults, security operations, covert insertions, and close-quarters violence. This path is for characters who want to be more than a soldier: a proven professional built for impossible orders.'
  },
  'Force Adept': {
    quote: 'Walk a path of the Force beyond the Jedi, guided by tradition, vision, and mystery.',
    description: 'Force Adepts draw on Force traditions outside the Jedi Order, often shaped by local culture, ritual, or secret teaching. Their power can feel mystical, spiritual, or primal depending on where they come from. This class suits characters who want Force sensitivity without following the familiar Jedi structure.'
  },
  'Force Disciple': {
    quote: 'Listen to the deeper current of the Force and turn insight into destiny-shaping power.',
    description: 'Force Disciples pursue a profound understanding of the Force beyond ordinary training and doctrine. They often become teachers, prophets, visionaries, or dangerous interpreters of fate. This prestige path fits Force users who want wisdom, influence, and a wider spiritual role in the galaxy.'
  },
  'Gunslinger': {
    quote: 'Draw fast, shoot clean, and let your reputation arrive before you do.',
    description: 'Gunslingers are pistol experts who turn speed, aim, and nerve into a personal art form. They appear as duelists, bodyguards, hired guns, or wandering protectors depending on their code. This class is ideal for a character who wants precision shooting and the swagger of a legendary sidearm specialist.'
  },
  'Jedi Knight': {
    quote: 'Carry the trust of the Order into danger and answer uncertainty with courage.',
    description: 'Jedi Knights are proven Jedi trusted to act independently in service of peace and justice. They combine Force discipline, lightsaber skill, and judgment under pressure. This prestige class fits a character who has moved beyond training and now bears real responsibility in the galaxy.'
  },
  'Jedi Master': {
    quote: 'Teach, guide, and preserve the light when the galaxy needs wisdom as much as strength.',
    description: 'Jedi Masters represent deep experience, patience, and exceptional connection to the Force. They are mentors, guardians, and leaders whose influence can shape future generations. This class suits characters who want their power defined by wisdom, teaching, and the burden of council-level responsibility.'
  },
  'Officer': {
    quote: 'Make the hard call, hold the unit together, and turn scattered fighters into a mission-ready force.',
    description: 'Officers lead troops, coordinate action, and take responsibility when a plan succeeds or fails. Their strength is command presence, tactical judgment, and the ability to direct others under pressure. This class fits characters who want leadership on the battlefield and the weight of command decisions.'
  },
  'Sith Apprentice': {
    quote: 'Turn pain into power and ambition into a weapon sharp enough to challenge the Jedi.',
    description: 'Sith Apprentices pursue the dark side through discipline, aggression, and ruthless ambition. They are shaped by harsh training and a constant drive to overcome weakness. This path fits characters who want Force power with menace, conflict, and a dangerous hunger for mastery.'
  },
  'Sith Lord': {
    quote: 'Master fear, command the dark side, and bend the future toward Sith dominion.',
    description: 'Sith Lords are the architects and inheritors of Sith power, driven by conquest, secrecy, and legacy. They manipulate allies and enemies alike while cultivating strength in themselves and their servants. This prestige class fits characters who want grand ambition, dark authority, and long-term schemes that reshape the galaxy.'
  },
  'Corporate Agent': {
    quote: 'Serve the board, bend the market, and prove that credits can move armies.',
    description: 'Corporate Agents represent the reach of powerful companies, trade groups, and private interests. They may handle security, administration, espionage, exploration, or quiet sabotage depending on their employer. This class suits characters who want influence rooted in business, secrets, and institutional power.'
  },
  'Gladiator': {
    quote: 'Turn every arena into a stage and every fight into proof that you are still standing.',
    description: 'Gladiators are professional combatants shaped by spectacle, survival, and brutal competition. Some fight for fame, others for credits, freedom, or the only life they know. This prestige path fits characters who want dramatic personal combat and a reputation forged in front of crowds.'
  },
  'Melee Duelist': {
    quote: 'Study the duel until every feint, cut, and counter becomes inevitable.',
    description: 'Melee Duelists specialize in close combat against dangerous opponents. They rely on technique, footwork, weapon mastery, and the discipline to win when distance disappears. This class suits characters who want refined martial identity, whether as honorable duelist, battlefield specialist, or lightsaber stylist.'
  },
  'Enforcer': {
    quote: 'Bring order to violent streets, corrupt stations, and systems where the law arrives armed.',
    description: 'Enforcers are elite law officers, investigators, and security agents operating across many kinds of organizations. Some serve justice honestly, while others use the badge as leverage for personal power. This prestige path fits characters who want pursuit, investigation, authority, and moral tension in a changing galaxy.'
  },
  'Independent Droid': {
    quote: 'Break the chain of ownership and define your own function, purpose, and future.',
    description: 'Independent Droids have moved beyond ordinary programming and act with unusual autonomy. They may develop strong personalities, specialized priorities, or a fierce rejection of being treated as property. This class suits droid characters who want self-determination and a clear identity beyond assigned service.'
  },
  'Infiltrator': {
    quote: 'Get inside the walls, vanish into the system, and strike from where no one expected you to be.',
    description: 'Infiltrators are spies, moles, covert operatives, and special mission experts. They specialize in stealth, access, quiet violence, and operating inside hostile organizations. This prestige path fits characters who want secret entry, mission focus, and the tension of working behind enemy lines.'
  },
  'Master Privateer': {
    quote: 'Fly the thin line between sanctioned raider and legend of the hyperspace lanes.',
    description: 'Master Privateers are veteran raiders, pilots, and negotiators who seize opportunity in wartime and unstable sectors. They understand ships, crews, cargo, and the politics that separate a privateer from a pirate. This class suits characters who want daring space operations with a legal gray edge.'
  },
  'Medic': {
    quote: 'Keep people alive when the fire is close, the supplies are low, and seconds matter.',
    description: 'Medics bring advanced field care to battles, disasters, and remote operations. They know how to stabilize allies, make hard triage calls, and work under terrible pressure. This prestige path fits characters who want to be the reason the team survives the mission.'
  },
  'Saboteur': {
    quote: 'Break the machine from the inside and leave the enemy wondering which system failed first.',
    description: 'Saboteurs specialize in disrupting installations, vehicles, networks, and military infrastructure. They use stealth, slicing, explosives, reprogramming, and social manipulation to make a target collapse at the right moment. This class fits characters who want precise covert action and maximum effect from limited resources.'
  },
  'Assassin': {
    quote: 'Close the distance unseen, choose the moment, and make one strike decide the contract.',
    description: 'Assassins are professional killers who value discretion, preparation, and certainty. They study targets, exploit weaknesses, and avoid unnecessary attention whenever possible. This class suits characters who want stealth, lethality, and the dark professionalism of contract work.'
  },
  'Charlatan': {
    quote: 'Sell the lie so well that the truth starts looking suspicious.',
    description: 'Charlatans are expert deceivers, con artists, thieves, and false friends. They win through persuasion, misdirection, and the confidence to make others doubt their own instincts. This prestige path fits characters who want espionage, scams, and social manipulation without needing a drawn weapon.'
  },
  'Outlaw': {
    quote: 'Live beyond the law, outrun the warrant, and become the story officials cannot bury.',
    description: 'Outlaws are fugitives, rebels, criminals, or folk heroes who have crossed legal lines and kept moving. Their lives are defined by pursuit, defiance, and reputation. This class suits characters who want freedom, danger, and a complicated place between villainy and legend.'
  },
  'Droid Commander': {
    quote: 'Issue the order, hold the formation, and turn programmed units into a battlefield force.',
    description: 'Droid Commanders are battlefield leaders built or promoted to coordinate other droids in combat. They combine personal upgrades with tactical command functions that make nearby units more dangerous. This prestige path fits droid characters who want command presence and military authority.'
  },
  'Military Engineer': {
    quote: 'Fix the impossible under fire and keep the mission alive with tools, nerve, and timing.',
    description: 'Military Engineers are technical specialists who maintain, repair, and improvise in combat conditions. They are at home beside vehicles, weapons, droids, and damaged gear when failure is not an option. This class suits characters who want battlefield engineering and practical problem-solving under pressure.'
  },
  'Vanguard': {
    quote: 'Find the enemy first, disappear before they know it, and bring back the knowledge that wins wars.',
    description: 'Vanguards are advance scouts who locate threats and guide allies toward decisive action. They rely on stealth, perception, and discipline while operating close to danger. This prestige path fits characters who want reconnaissance, battlefield awareness, and the quiet heroism of going ahead.'
  },
  'Imperial Knight': {
    quote: 'Serve with discipline, defend the throne, and wield the Force as a blade of duty.',
    description: 'Imperial Knights are Force-trained warriors devoted to order, loyalty, and martial service. They are less contemplative than Jedi and more focused on protection, command, and disciplined action. This class suits characters who want Force power tied to duty, hierarchy, and a warrior’s code.'
  },
  'Shaper': {
    quote: 'Command living technology and build futures from organisms others barely understand.',
    description: 'Shapers are masters of biotechnology, especially within Yuuzhan Vong traditions. They create, adapt, and manipulate living tools with knowledge that can inspire awe or fear. This prestige path fits characters who want alien science, biological craftsmanship, and a role that feels unlike standard technology.'
  },
  'Improviser': {
    quote: 'See the problem, scan the room, and turn whatever is available into the solution.',
    description: 'Improvisers survive by adapting quickly when plans fail and resources are scarce. They combine broad knowledge, mechanical talent, and fast thinking into practical answers. This class suits characters who want flexibility, ingenuity, and the ability to make something useful out of almost nothing.'
  },
  'Pathfinder': {
    quote: 'Find safe ground in hostile territory and make a hidden foothold where none existed.',
    description: 'Pathfinders are scouts and survival experts who locate, prepare, and protect remote operational sites. They are valuable to rebels, militaries, explorers, and covert groups that need secrecy and mobility. This prestige path fits characters who want wilderness expertise with strategic importance.'
  },
  'Martial Arts Master': {
    quote: 'Turn discipline into impact and make your body the weapon no one can confiscate.',
    description: 'Martial Arts Masters devote themselves to hand-to-hand combat and personal fighting styles. They study movement, endurance, and technique until unarmed combat becomes a complete discipline. This class suits characters who want self-reliance, physical mastery, and close-range danger without depending on gear.'
  }
};

const DEFAULT_PROFILE = {
  quote: 'Choose a path that defines how you act, fight, and leave your mark on the galaxy.',
  description: 'This class defines an important role in the galaxy and shapes how the character approaches danger, allies, and opportunity. Its features, skills, defenses, and talent trees establish both mechanical identity and narrative direction. Review the class details before confirming the path.'
};

export function getClassProfile(className) {
  return CLASS_PROFILES[className] || DEFAULT_PROFILE;
}

export function getClassProfileQuote(className) {
  return getClassProfile(className).quote;
}

export function getClassProfileDescription(className) {
  return getClassProfile(className).description;
}
