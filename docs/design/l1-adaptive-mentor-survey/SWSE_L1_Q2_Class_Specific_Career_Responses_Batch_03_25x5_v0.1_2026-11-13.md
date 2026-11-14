# SWSE L1 Q2 — Class-Specific Career Responses, Batch 3 (Parents 51–75)

**Local working draft | 2026-11-13 | No Git commit/push | Editorial review pending**

## Authority and player display contract

- Source: 97-parent universal Q2 bank v0.4. This batch contains its **parents 51–75** and preserves each universal response verbatim.
- Exactly **five original first-person class variants** per career: Jedi, Noble, Scoundrel, Scout, Soldier (**125 newly authored lines**).
- Every response is keyed to the **same canonical parent ID**, independent of starting class. Unconventional class/career combinations remain selectable.
- Player UI displays **only the chosen class-specific quote**, without parent name, ID, numbering, scoring tags, or class labels.
- These are **character response choices**, not Mentor dialogue. The approved five fixed Q2 Mentor introductions remain separate.
- Statements express a future desired calling. They do **not** imply that a starting character has already acquired a skill, talent, feat, Force power, rank, institution membership, prestige class, or equipment.
- Career-intent evidence is recorded only after explicit player selection, never from suggestions or browsing.
- `data/archetypes.json` is the SSOT for parent identity; this document is an editorial wording layer only, not a second archetype registry or a production implementation.
- Parent IDs match the previously verified canonical 97-parent registry snapshot. Mechanics and legal prerequisites still require validation at implementation time.

## All 125 first-person responses

### 51. Scavenger (`scavenger`)

**Universal base (unchanged):** “I want to search wrecks and abandoned places, finding useful treasures in what everyone else leaves behind.”

- **Jedi:** “I want to recover useful things from wrecks and forgotten places, making careful use of what others discard.”
- **Noble:** “I want to turn abandoned equipment and old wrecks into a salvage operation that supports the people depending on it.”
- **Scoundrel:** “I want to pick through derelicts and junk heaps, finding the parts everyone else overlooked before another crew gets there.”
- **Scout:** “I want to explore old wrecks and deserted outposts, spotting what can be saved without getting myself buried alongside it.”
- **Soldier:** “I want to salvage equipment from dangerous wreck sites and get it working again for people who need it.”

### 52. Courier (`courier`)

**Universal base (unchanged):** “I want to carry important messages and cargo through dangerous routes, reaching places others cannot.”

- **Jedi:** “I want to carry messages and supplies to people who need them, even when the journey is dangerous or uncertain.”
- **Noble:** “I want to be trusted with urgent deliveries, arranging dependable routes and making sure important cargo arrives on time.”
- **Scoundrel:** “I want to make a living delivering the things people cannot afford to lose, moving fast and keeping my word.”
- **Scout:** “I want to find a way through bad terrain and unfamiliar routes so urgent deliveries reach their destinations.”
- **Soldier:** “I want to deliver critical orders and supplies through dangerous territory, getting them there no matter how rough the road becomes.”

### 53. Sector Ranger (`sector_ranger`)

**Universal base (unchanged):** “I want to pursue criminals across worlds and sectors, following a trail wherever it leads until justice catches up.”

- **Jedi:** “I want to investigate dangerous fugitives across whole sectors and learn how to bring them to justice without losing my judgment.”
- **Noble:** “I want to serve as a sector ranger, working across jurisdictions to find criminals who think a border will protect them.”
- **Scoundrel:** “I want to track criminals from one system to the next and bring them in, even when they have friends in high places.”
- **Scout:** “I want to follow fugitive trails across distant worlds, reading signs that local patrols might miss.”
- **Soldier:** “I want to become a sector ranger, pursuing dangerous offenders wherever they run and bringing them back to face the law.”

### 54. Security Specialist (`security_specialist`)

**Universal base (unchanged):** “I want to anticipate threats and build defenses that keep people and important places safe before trouble begins.”

- **Jedi:** “I want to understand how threats get through defenses and learn to keep vulnerable places and people secure.”
- **Noble:** “I want to design security arrangements that protect people, balancing good judgment with the resources available.”
- **Scoundrel:** “I want to learn how to spot weak points in a security system and close them before someone less honest finds them.”
- **Scout:** “I want to survey sites for hidden approaches and make sure no threat slips through because a route was overlooked.”
- **Soldier:** “I want to develop reliable security plans, positioning people and equipment so trouble is stopped before it reaches anyone.”

### 55. Force Hunter (`force_hunter`)

**Universal base (unchanged):** “I want to track dangerous Force-users and learn how to face abilities most people don't understand.”

- **Jedi:** “I want to track Force-users who pose a danger, learning to counter their methods without underestimating them.”
- **Noble:** “I want to investigate dangerous Force-users and coordinate the people and resources needed to confront them.”
- **Scoundrel:** “I want to follow the trail of dangerous Force-users and learn the tricks that keep a hunter alive around them.”
- **Scout:** “I want to track Force-users through unfamiliar terrain and learn to recognize the signs they leave behind.”
- **Soldier:** “I want to train to face dangerous Force-users, preparing for threats that ordinary weapons drills do not cover.”

### 56. Veteran (`veteran`)

**Universal base (unchanged):** “I want to become someone others can rely on after years of hard service, using experience and composure to help the next generation survive.”

- **Jedi:** “I want to earn the kind of experience that makes others trust my judgment when a hard choice must be made.”
- **Noble:** “I want to spend years in meaningful service, becoming someone who can guide others through trouble with steady judgment.”
- **Scoundrel:** “I want to survive enough hard jobs to know what matters, then put that experience to use for the next crew.”
- **Scout:** “I want to become a seasoned hand who can read danger early and teach less experienced travelers how to survive it.”
- **Soldier:** “I want to become a veteran others can count on, passing down what I have learned so fewer people make fatal mistakes.”

### 57. Warrior (`warrior`)

**Universal base (unchanged):** “I want to live by a warrior's code, honing my strength and skill until I can meet any challenge without fear.”

- **Jedi:** “I want to live by a warrior code, training myself to meet violence with courage and restraint.”
- **Noble:** “I want to earn respect as a warrior, showing through discipline and conduct what my commitments mean.”
- **Scoundrel:** “I want to make my name as a warrior who can stand his ground when every clever escape has failed.”
- **Scout:** “I want to become a warrior who knows the land, chooses the right moment, and does not waste a fight.”
- **Soldier:** “I want to hone my strength and fighting discipline until I can meet an enemy face to face and hold my ground.”

### 58. Sniper (`sniper`)

**Universal base (unchanged):** “I want to master patience, concealment, and long-range marksmanship, knowing exactly when a single shot will matter.”

- **Jedi:** “I want to become a patient long-range marksman, learning when one precise shot is truly necessary.”
- **Noble:** “I want to learn to observe the whole field and put an accurate shot where it can change the outcome.”
- **Scoundrel:** “I want to master the long shot, picking the right position and making a single clean hit when it counts.”
- **Scout:** “I want to scout ahead, find a concealed firing position, and make every careful shot count.”
- **Soldier:** “I want to train as a sniper, holding steady under pressure and hitting the target that matters from far away.”

### 59. Combat Medic (`combat_medic`)

**Universal base (unchanged):** “I want to keep people alive under fire, treating the wounded when there's no safe place to stop.”

- **Jedi:** “I want to learn to treat the wounded under fire, helping people survive long enough to reach safety.”
- **Noble:** “I want to become a combat medic, organizing care when casualties mount and supplies are running low.”
- **Scoundrel:** “I want to keep people breathing in the middle of a firefight, using whatever supplies I can carry.”
- **Scout:** “I want to reach the wounded in dangerous ground and learn to stabilize them before help can arrive.”
- **Soldier:** “I want to serve as a combat medic, moving toward the injured when everyone else has to find cover.”

### 60. Combat Engineer (`combat_engineer`)

**Universal base (unchanged):** “I want to solve technical problems in the middle of a fight, repairing what breaks and overcoming obstacles others can't pass.”

- **Jedi:** “I want to learn the practical engineering needed to keep a team moving when the battlefield breaks its equipment.”
- **Noble:** “I want to coordinate engineering support in the field, ensuring crews have the tools to overcome obstacles and keep operating.”
- **Scoundrel:** “I want to fix damaged gear and improvise a way through obstacles before a mission goes completely sideways.”
- **Scout:** “I want to solve engineering problems in rough terrain, building what a team needs out of what we can carry.”
- **Soldier:** “I want to become a combat engineer, clearing obstacles, repairing equipment, and keeping my unit moving under fire.”

### 61. Saboteur (`saboteur`)

**Universal base (unchanged):** “I want to disable an enemy's equipment and infrastructure, making their plans unravel before the fighting even starts.”

- **Jedi:** “I want to learn how a hostile system works so I can disable it precisely and stop a threat before it spreads.”
- **Noble:** “I want to disrupt an enemy operation by finding the right point of failure and organizing a careful strike against it.”
- **Scoundrel:** “I want to slip into places I should not be and leave their machinery useless before anyone knows I was there.”
- **Scout:** “I want to reach hidden infrastructure, learn its weak points, and shut it down without being detected.”
- **Soldier:** “I want to specialize in disabling enemy equipment and supply routes, making sure their plans fall apart before they attack.”

### 62. Fleet Strategist (`fleet_strategist`)

**Universal base (unchanged):** “I want to plan campaigns across the stars, positioning entire fleets so the right battle is won before the first shot is fired.”

- **Jedi:** “I want to understand battles on a larger scale, learning how fleet movements can prevent needless losses.”
- **Noble:** “I want to plan the movements of entire fleets, turning intelligence and logistics into a decisive advantage.”
- **Scoundrel:** “I want to become the strategist who spots the gap in an enemy fleet and gives our ships the opening they need.”
- **Scout:** “I want to chart routes and positions for fleets, using what the terrain of space can tell us about the coming fight.”
- **Soldier:** “I want to plan fleet engagements, placing ships where they can support each other and bring their crews home.”

### 63. Starship Gunner (`starship_gunner`)

**Universal base (unchanged):** “I want to become an expert with starship weapons, protecting my crew by landing the shots that matter in battle.”

- **Jedi:** “I want to master starship weapons, keeping a clear mind when the crew depends on my aim.”
- **Noble:** “I want to become a trusted starship gunner, learning to coordinate my fire with the captain and the rest of the crew.”
- **Scoundrel:** “I want to run a shipboard gun, picking my shots fast and keeping trouble off our hull.”
- **Scout:** “I want to learn to read a ship battle from the gunner station and hit targets as they cross my sights.”
- **Soldier:** “I want to master shipboard gunnery, protecting my crew with accurate fire even when the deck is shaking.”

### 64. Partisan (`partisan`)

**Universal base (unchanged):** “I want to fight for a cause with whatever people and resources we can gather, striking where a stronger enemy least expects us.”

- **Jedi:** “I want to help a resistance survive against stronger forces, using patience and local knowledge to make every effort count.”
- **Noble:** “I want to organize a partisan movement, bringing scattered people and supplies together for a cause worth defending.”
- **Scoundrel:** “I want to fight from the shadows with people who know their own streets, hitting an occupying force where it hurts.”
- **Scout:** “I want to join a partisan band that knows the terrain, striking from concealment and disappearing before the enemy responds.”
- **Soldier:** “I want to fight as a partisan, using small-unit tactics and local support against an enemy with more troops than we have.”

### 65. Astrogator (`astrogator`)

**Universal base (unchanged):** “I want to chart hyperspace routes others wouldn't risk, guiding ships safely through unfamiliar stretches of the galaxy.”

- **Jedi:** “I want to learn the hidden patterns of hyperspace and guide travelers safely between distant worlds.”
- **Noble:** “I want to become an astrogator whose precise routes keep expeditions and commercial voyages on course.”
- **Scoundrel:** “I want to plot jumps that other navigators would never try, getting a ship through when the usual route is closed.”
- **Scout:** “I want to chart unfamiliar hyperspace passages, checking every calculation before we risk the jump.”
- **Soldier:** “I want to plan dependable hyperspace routes, making sure the ships carrying my people reach their destination.”

### 66. Outlaw Tech (`outlaw_tech`)

**Universal base (unchanged):** “I want to push machines beyond their intended limits, modifying and repairing equipment when official methods aren't enough.”

- **Jedi:** “I want to learn to repair and modify machines that official workshops refuse to touch, using my knowledge responsibly.”
- **Noble:** “I want to establish a discreet workshop where unusual equipment can be repaired or adapted when ordinary suppliers say no.”
- **Scoundrel:** “I want to tinker with forbidden modifications and odd parts, getting machines to do things their makers never intended.”
- **Scout:** “I want to keep battered frontier equipment alive with inventive repairs, even when the proper parts are nowhere nearby.”
- **Soldier:** “I want to adapt nonstandard gear for difficult missions and make repairs long after the manuals stop being useful.”

### 67. Armorer (`armorer`)

**Universal base (unchanged):** “I want to build and maintain weapons and armor that people can trust when their lives depend on them.”

- **Jedi:** “I want to learn the craft of making protective equipment that can save lives when words are no longer enough.”
- **Noble:** “I want to oversee the making and maintenance of dependable armor, ensuring people have protection suited to their duties.”
- **Scoundrel:** “I want to make custom armor and gear that fits the wearer and survives whatever trouble they get into.”
- **Scout:** “I want to design armor that holds up on long expeditions, where a broken plate can be the end of the road.”
- **Soldier:** “I want to build and maintain armor people can trust in combat, fitting it to the job rather than just making it heavier.”

### 68. Electronic Warfare Specialist (`electronic_warfare_specialist`)

**Universal base (unchanged):** “I want to control the flow of a battle through sensors, signals, and computer systems, keeping our side connected while the enemy goes blind.”

- **Jedi:** “I want to learn to disrupt hostile communications and sensors so people can act without being exposed.”
- **Noble:** “I want to coordinate electronic warfare, managing signals and information so an entire operation gains the advantage.”
- **Scoundrel:** “I want to jam enemy channels and fool their sensors, turning their expensive electronics against them.”
- **Scout:** “I want to read the electronic terrain, finding blind spots in sensors and communications that let us move unseen.”
- **Soldier:** “I want to control the information battle, keeping friendly systems working while enemy sensors and communications fail.”

### 69. Shipwright (`shipwright`)

**Universal base (unchanged):** “I want to design and construct starships, turning plans and raw materials into vessels capable of crossing the galaxy.”

- **Jedi:** “I want to understand how starships are built, helping turn careful designs into vessels people can safely trust.”
- **Noble:** “I want to oversee the construction of starships, bringing together skilled crews, materials, and sound designs.”
- **Scoundrel:** “I want to build ships that can take a beating and still fly, improving the design every time something breaks.”
- **Scout:** “I want to design vessels that can survive rough routes and long journeys beyond the repair yards.”
- **Soldier:** “I want to help construct durable starships, making sure their systems and hulls can stand up to real danger.”

### 70. Disaster Responder (`disaster_responder`)

**Universal base (unchanged):** “I want to reach people when catastrophe strikes, organizing relief and helping communities recover from the worst.”

- **Jedi:** “I want to reach people in the aftermath of catastrophe, bringing calm and practical help when everything seems lost.”
- **Noble:** “I want to organize disaster relief, making sure supplies and help reach those who need them most.”
- **Scoundrel:** “I want to work disaster zones, finding whatever tools and transport can get people out before things get worse.”
- **Scout:** “I want to reach isolated survivors after a disaster, finding safe routes and guiding rescue crews through.”
- **Soldier:** “I want to become a disaster responder, securing dangerous areas and helping people get to safety.”

### 71. Pathfinder (`pathfinder`)

**Universal base (unchanged):** “I want to find safe routes through hostile and unexplored terrain, guiding others beyond the last familiar trail.”

- **Jedi:** “I want to find safe ways through unknown places, learning to read danger before others step into it.”
- **Noble:** “I want to establish routes into unsettled regions, opening reliable paths for communities and expeditions.”
- **Scoundrel:** “I want to find shortcuts through dangerous country that no official guide would ever put on a map.”
- **Scout:** “I want to become a pathfinder, reading the terrain and leading people through places few travelers understand.”
- **Soldier:** “I want to scout routes ahead of a team, finding safe approaches before anyone walks into danger.”

### 72. Jedi Guardian (`jedi_guardian`)

**Universal base (unchanged):** “I want to walk the path of a Jedi Guardian, standing against danger when others need someone to defend them.”

- **Jedi:** “I want to follow the Guardian path, studying both the blade and the discipline it takes to shield others.”
- **Noble:** “I want to earn the training to become a Jedi Guardian, bringing my instinct to lead into service of those in danger.”
- **Scoundrel:** “I want to seek Jedi Guardian training and learn to stand between trouble and the people who cannot escape it.”
- **Scout:** “I want to pursue Jedi Guardian training, sharpening my awareness and learning to protect people far from safety.”
- **Soldier:** “I want to train as a Jedi Guardian, learning to bring courage and control to the front line when people need defending.”

### 73. Jedi Consular (`jedi_consular`)

**Universal base (unchanged):** “I want to follow the path of a Jedi Consular, using insight and the Force to help others find understanding before conflict begins.”

- **Jedi:** “I want to develop as a Jedi Consular, learning to guide difficult decisions with patience and knowledge of the Force.”
- **Noble:** “I want to pursue the Jedi Consular path, combining diplomacy with the understanding of the Force I hope to gain.”
- **Scoundrel:** “I want to learn the ways of a Jedi Consular, using careful words and a growing knowledge of the Force to settle trouble without a fight.”
- **Scout:** “I want to study as a Jedi Consular, traveling between communities and finding ways to resolve disputes before they spread.”
- **Soldier:** “I want to become a Jedi Consular, helping rival sides find peace before another battle becomes inevitable.”

### 74. Jedi Sentinel (`jedi_sentinel`)

**Universal base (unchanged):** “I want to become a Jedi Sentinel, investigating hidden threats and using both practical skills and the Force to confront them.”

- **Jedi:** “I want to walk the Sentinel path, learning to uncover threats and apply both practical skills and the Force to stop them.”
- **Noble:** “I want to pursue the Jedi Sentinel path, using investigation and judgment to find threats hidden behind respectable appearances.”
- **Scoundrel:** “I want to seek Sentinel training, learning to investigate secrets and face danger with more than a clever lie.”
- **Scout:** “I want to become a Jedi Sentinel, following subtle clues into places where ordinary searches come up empty.”
- **Soldier:** “I want to train as a Jedi Sentinel, tracking hidden enemies and dealing with dangers that a straightforward assault will not solve.”

### 75. Sith Warrior (`sith_warrior`)

**Universal base (unchanged):** “I want to pursue the path of a Sith Warrior, mastering combat and the Force until I can overcome any rival.”

- **Jedi:** “I want to pursue the Sith Warrior path, sharpening my combat skills and drawing ever greater power from the dark side.”
- **Noble:** “I want to become a Sith Warrior, turning my ambition into martial power and commanding respect through victory.”
- **Scoundrel:** “I want to train as a Sith Warrior, trading tricks and quick escapes for the power to face rivals head-on.”
- **Scout:** “I want to seek the Sith Warrior path, pursuing hard training and the dark side until I can overcome any foe.”
- **Soldier:** “I want to become a Sith Warrior, mastering weapons and the dark side to defeat those who stand against me.”

## Completion checks

- Parents in this batch: **25** (unique, numbered 51–75).
- Original class-variant lines in this batch: **125** (no exact duplicates).
- Canonical parent IDs are disjoint from Batches 1 and 2.
- The previous 50-career JSON entries are preserved byte-for-byte in content after deserialization; no previous variant text is changed.
- Combined reference: 75 distinct canonical parents, 375 class-specific player responses.
- No GitHub writes, commits, pushes, or merges.
