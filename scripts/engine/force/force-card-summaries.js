const FORCE_CARD_SUMMARIES = [
  ['Ballistakinesis', 'Spray dangerous debris across an area to damage targets and hinder attacks.'],
  ['Battle Meditation', 'Coordinate allies through the Force to improve their attacks and battle focus.'],
  ['Battle Strike', 'Enhance your next melee attack with bonus Force damage.'],
  ['Blind', 'Hurl debris into a target\'s eyes to impair or remove its sight.'],
  ['Cloak', 'Bend light around yourself to become hidden or invisible.'],
  ['Force Cloak', 'Bend light around yourself to become hidden or invisible.'],
  ['Combustion', 'Ignite the air around a target to burn it with pyrokinetic sparks.'],
  ['Convection', 'Heat your own body so nearby enemies are burned by contact or proximity.'],
  ['Corruption', 'Blast a target with dark side energy that deals damage and weakens it over time.'],
  ['Crucitorn', 'Channel pain through the Force to keep fighting despite injury and hardship.'],
  ['Cryokinesis', 'Drain heat from a target to slow, damage, or freeze it.'],
  ['Dark Rage', 'Embrace the dark side to boost your melee offense for a short time.'],
  ['Dark Transfer', 'Sacrifice your own vitality through the dark side to restore an ally.'],
  ['Detonate', 'Find and rupture an object\'s weak point to shatter or explode it.'],
  ['Drain Energy', 'Sap power from devices, droids, or vehicles through the Force.'],
  ['Energy Resistance', 'Shield yourself or an ally against energy, sonic, fire, cold, or electricity damage.'],
  ['Enlighten', 'Give an ally a burst of foresight to improve a roll or defense.'],
  ['Farseeing', 'Sense distant places, people, or events through the Force.'],
  ['Fear', 'Project dark side terror to frighten or debilitate enemies.'],
  ['Fold Space', 'Bend space to move an object instantly from one place to another.'],
  ['Force Blast', 'Hurl compressed air and debris into an area to damage and push targets.'],
  ['Force Disarm', 'Telekinetically wrench a weapon or object from a target\'s grasp.'],
  ['Force Grip', 'Crush or choke a target telekinetically, potentially costing it actions.'],
  ['Force Light', 'Radiate light side energy that suppresses or purges dark side effects.'],
  ['Force Lightning', 'Unleash lightning from your hands to damage a target.'],
  ['Force Scream', 'Emit a Force-amplified scream that damages and can stun nearby foes.'],
  ['Force Shield', 'Create a telekinetic shield around yourself to absorb incoming damage.'],
  ['Force Slam', 'Slam targets with telekinetic force, damaging and knocking them prone.'],
  ['Force Storm', 'Create a dark side storm that damages creatures in an area.'],
  ['Force Storm (FUCG)', 'Surround yourself with a dark side whirlwind that batters nearby enemies.'],
  ['Force Stun', 'Overwhelm a target\'s mind to stun or impair it.'],
  ['Force Thrust', 'Push a target away with telekinetic force, damaging and knocking it prone.'],
  ['Force Track', 'Mark a target through the Force so you can sense its direction and distance.'],
  ['Force Whirlwind', 'Trap a target in a telekinetic vortex that lifts and batters it.'],
  ['Hatred', 'Feed on hatred to recover Force resources at the cost of embracing the dark side.'],
  ['Inertia', 'Shift your body\'s inertia to soften falls or perform impossible movement.'],
  ['Inspire', 'Bolster an ally\'s confidence with the Force for a key attack or skill check.'],
  ['Intercept', 'Hurl an object into the path of a projectile to block it.'],
  ['Ionize', 'Overload droids or electronic systems with ionizing Force energy.'],
  ['Kinetic Combat', 'Animate a weapon with telekinesis so it fights independently of your grip.'],
  ['Levitate', 'Float vertically through the air using the Force.'],
  ['Lightning Burst', 'Release dark side lightning around yourself to strike adjacent enemies.'],
  ['Malacia', 'Disrupt a target\'s equilibrium to nauseate and hinder it.'],
  ['Memory Walk', 'Force a target to relive traumatic memories, damaging or disabling its mind.'],
  ['Mind Shard', 'Splinter a target\'s thoughts with painful mental force.'],
  ['Mind Trick', 'Influence a creature\'s thoughts, perceptions, or simple choices.'],
  ['Morichro', 'Slow a living target\'s vital functions toward sleep, stasis, or death.'],
  ['Move Object', 'Move creatures or objects through the air with telekinesis.'],
  ['Negate Energy', 'Absorb or deflect a single incoming energy attack.'],
  ['Obscure', 'Cloud a creature\'s perceptions to make attacks miss or lose clarity.'],
  ['Phase', 'Pass yourself through solid objects for a short distance.'],
  ['Plant Surge', 'Command nearby plants to hinder or attack enemies.'],
  ['Prescience', 'Read the near future to improve initiative or defense.'],
  ['Rebuke', 'Overwhelm or counter a Force-sensitive opponent\'s use of the Force.'],
  ['Rend', 'Pull a target in opposing directions to tear it apart telekinetically.'],
  ['Repulse', 'Blast enemies away from you with a wave of telekinetic force.'],
  ['Resist Force', 'Protect yourself against hostile Force powers.'],
  ['Sever Force', 'Cut a Force-user\'s connection to the Force.'],
  ['Shatterpoint', 'Sense a critical weakness and exploit it for a decisive strike.'],
  ['Slow', 'Weigh down enemies with the Force to reduce movement and agility.'],
  ['Stagger', 'Lash out with the Force to make a nearby enemy stumble or lose momentum.'],
  ['Surge', 'Push your body with the Force for sudden speed or movement.'],
  ['Technometry', 'Read or influence technology through the Force.'],
  ['Thought Bomb', 'Release a wave of mental Force damage against nearby minds.'],
  ['Valor', 'Share Force-born courage and resilience with an ally.'],
  ['Vital Transfer', 'Heal another creature by channeling the Force through your own vitality.'],
  ['Wound', 'Crush a target\'s lungs and body with dark side injury.'],

  ['Assured Strike', 'Trade damage for superior accuracy with a Juyo lightsaber attack.'],
  ['Barrier of Blades', 'Use Shien technique to turn a Use the Force check into ranged defense.'],
  ['Circle of Shelter', 'Create a Soresu defensive zone that protects you and nearby allies.'],
  ['Contentious Opportunity', 'Exploit a Makashi opening to dart in and strike.'],
  ['Deflecting Slash', 'Turn a successful deflection into an immediate Soresu counterattack.'],
  ['Disarming Slash', 'Strike an opponent\'s weapon with Shii-Cho precision to disarm them.'],
  ['Draw Closer', 'Pull a foe into reach with the Force and strike with Niman balance.'],
  ['Falling Avalanche', 'Drive a Djem So lightsaber blow through an enemy and force them back.'],
  ['Fluid Riposte', 'Turn aside a melee attack and reposition into a Djem So counterstrike.'],
  ['Hawk-Bat Swoop', 'Leap into an Ataru assault before enemies can fully react.'],
  ['High Ground Defense', 'Use Sokan positioning to turn terrain into a defensive advantage.'],
  ['Makashi Riposte', 'Reduce an incoming melee strike and answer with a precise Makashi counter.'],
  ['Pass the Blade', 'Slip past a block with Trakata blade control and strike through the guard.'],
  ['Pushing Slash', 'Combine Niman swordplay and telekinesis to strike and shove a target.'],
  ['Rising Whirlwind', 'Spin both lightsabers into a Jar\'Kai whirlwind against nearby foes.'],
  ['Saber Swarm', 'Launch a rapid Ataru flurry with multiple lightsaber attacks.'],
  ['Sarlacc Sweep', 'Sweep your lightsaber through multiple enemies with Shii-Cho technique.'],
  ['Shien Deflection', 'Deflect an incoming attack and surge toward the attacker.'],
  ['Swift Flank', 'Use Vaapad speed to move around a foe and strike from a new angle.'],
  ['Tempered Aggression', 'Channel Vaapad aggression into a controlled, hard-hitting attack.'],
  ['Twin Strike', 'Bring two lightsabers down together in a forceful Jar\'Kai attack.'],
  ['Unbalancing Block', 'Use Trakata timing to blunt an attack and leave the foe flat-footed.'],
  ['Unhindered Charge', 'Use Sokan footwork to charge through difficult terrain and obstacles.'],
  ['Vornskr\'s Ferocity', 'Walk the Juyo edge between light and dark to attack with ferocity.'],

  ['Awaken Force Sensitivity', 'Meditate with an ally to awaken temporary Force sensitivity and training insight.'],
  ['Eyes of the Force', 'Practice reading surface thoughts to improve Telepathy checks for 24 hours.'],
  ['Oxygen Bottle', 'Practice environmental control to resist inhaled poisons and atmospheric hazards.'],
  ['Quiet the Mind', 'Meditate deeply to add Farseeing and, at higher results, gain Visions.'],
  ['Telekinetic Practice', 'Practice telekinetic precision to gain temporary Force Points for telekinetic powers.'],
  ['Sparring Practice', 'Practice lightsaber dueling to spend extra Force Points on Block checks.'],
  ['Training Remote', 'Practice deflecting blaster fire to spend extra Force Points on Deflect checks.'],
  ['Vo\'ren\'s First Cadence', 'Practice sensory precision to gain Will Defense and Severing Strike benefits.'],
  ['Vo\'ren\'s Second Cadence', 'Practice spatial awareness to improve lightsaber attacks against flankers.'],
  ['Vo\'ren\'s Third Cadence', 'Practice irregular attack patterns to improve Redirect Shot and defensive Force Point options.'],
  ['Vo\'ren\'s Fourth Cadence', 'Practice composure under pressure to maintain Force powers after taking damage.'],
  ['Vo\'ren\'s Fifth Cadence', 'Practice telekinetic lightsaber mastery to improve Move Light Object and Kinetic Combat.']
];

const SUMMARY_BY_NAME = new Map(FORCE_CARD_SUMMARIES.map(([name, summary]) => [canonicalName(name), summary]));

function canonicalName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&(?:amp|nbsp|rsquo|lsquo|quot);/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function valueToText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value?.value === 'string') return value.value;
  if (typeof value?.text === 'string') return value.text;
  if (typeof value?.description === 'string') return value.description;
  return String(value || '');
}

function cleanText(value) {
  return valueToText(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(value, max = 118) {
  const text = cleanText(value);
  if (!text) return '';
  const sentence = text.match(/^.*?(?:[.!?](?=\s|$)|$)/)?.[0]?.trim() || text;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, '').trim()}...`;
}

export function resolveForceCardSummary(entry, fallback = '') {
  const name = entry?.name || entry?.label || '';
  const direct = SUMMARY_BY_NAME.get(canonicalName(name));
  if (direct) return direct;

  const deparenthesized = String(name || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const alias = SUMMARY_BY_NAME.get(canonicalName(deparenthesized));
  if (alias) return alias;

  const system = entry?.system ?? {};
  return firstSentence(
    system.cardSummary
      || system.frontSummary
      || system.summary
      || entry?.summary
      || fallback
      || system.effect
      || system.descriptionText
      || system.description
      || entry?.description
  ) || 'Review the back of the card for full details.';
}
