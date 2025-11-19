/**
 * Script to rebuild weapons.db with correct SWSE weapon data
 * Run with: node scripts/fix-weapons-data.js
 */

const fs = require('fs');
const path = require('path');

// Complete weapon data from SWSE rulebooks
const weaponData = [
  // ===== PISTOLS (9) =====
  {
    id: 'weapon-blaster-pistol',
    name: 'Blaster Pistol',
    damage: '3d6',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 500,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>The standard sidearm used throughout the galaxy. Reliable, common, and effective at close to medium range.</p>`,
    properties: []
  },
  {
    id: 'weapon-disruptor-pistol',
    name: 'Disruptor Pistol',
    damage: '3d6',
    damageType: 'energy',
    critical: 20,
    range: 10,
    cost: 2500,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>An illegal weapon that disrupts matter at the molecular level. Ignores most armor defenses.</p>
      <p><strong>Special:</strong> Disruptor weapons ignore damage reduction and are illegal in most jurisdictions.</p>`,
    properties: ['Disruptor', 'Illegal']
  },
  {
    id: 'weapon-heavy-blaster-pistol',
    name: 'Heavy Blaster Pistol',
    damage: '3d8',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 750,
    weight: 1.3,
    attackAttribute: 'dex',
    description: `<p>A more powerful variant of the standard blaster pistol, delivering higher damage at the cost of increased weight and power consumption.</p>`,
    properties: []
  },
  {
    id: 'weapon-hold-out-blaster',
    name: 'Hold-out Blaster',
    damage: '2d4',
    damageType: 'energy',
    critical: 20,
    range: 8,
    cost: 250,
    weight: 0.5,
    attackAttribute: 'dex',
    description: `<p>A small, easily concealed blaster pistol. Popular among spies, assassins, and those who need discrete protection.</p>
      <p><strong>Special:</strong> +5 bonus to Stealth checks to conceal the weapon.</p>`,
    properties: ['Concealable']
  },
  {
    id: 'weapon-ion-blaster',
    name: 'Ion Blaster',
    damage: '3d6',
    damageType: 'ion',
    critical: 20,
    range: 10,
    cost: 550,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>Fires ionized bolts that are particularly effective against droids and electronic systems.</p>
      <p><strong>Special:</strong> Deals ion damage, which is especially effective against droids and vehicles.</p>`,
    properties: ['Ion']
  },
  {
    id: 'weapon-slugthrower-pistol',
    name: 'Slugthrower Pistol',
    damage: '2d6',
    damageType: 'kinetic',
    critical: 20,
    range: 10,
    cost: 250,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A primitive ballistic weapon that fires solid projectiles. Uses physical ammunition rather than energy cells.</p>
      <p><strong>Special:</strong> Requires ammunition (bullets). Bypasses some energy-based defenses.</p>`,
    properties: ['Projectile', 'Ammunition Required']
  },
  {
    id: 'weapon-sonic-pistol',
    name: 'Sonic Pistol',
    damage: '2d6',
    damageType: 'sonic',
    critical: 20,
    range: 10,
    cost: 600,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>Emits concentrated sonic waves that can damage targets. Sonic weapons ignore most forms of physical armor.</p>
      <p><strong>Special:</strong> Sonic damage ignores armor bonuses not from natural armor.</p>`,
    properties: ['Sonic']
  },
  {
    id: 'weapon-sporting-blaster-pistol',
    name: 'Sporting Blaster Pistol',
    damage: '2d6',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 300,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A civilian-grade blaster pistol designed for sport shooting and personal defense. Less powerful than military models but widely available.</p>`,
    properties: ['Civilian']
  },
  {
    id: 'weapon-verpine-shatter-pistol',
    name: 'Verpine Shatter Pistol',
    damage: '3d6',
    damageType: 'kinetic',
    critical: '19-20',
    range: 10,
    cost: 2000,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A magnetically-accelerated projectile weapon created by the Verpine. Nearly silent and armor-piercing.</p>
      <p><strong>Special:</strong> Armor-piercing, silent operation. Critical threat range 19-20.</p>`,
    properties: ['Silent', 'Armor-Piercing', 'Critical 19-20']
  },

  // ===== RIFLES & CARBINES (14) =====
  {
    id: 'weapon-blaster-carbine',
    name: 'Blaster Carbine',
    damage: '3d8',
    damageType: 'energy',
    critical: 20,
    range: 30,
    cost: 900,
    weight: 2.5,
    attackAttribute: 'dex',
    description: `<p>A compact rifle suitable for close-quarters combat. Favored by scouts and vehicle crews.</p>`,
    properties: []
  },
  {
    id: 'weapon-blaster-rifle',
    name: 'Blaster Rifle',
    damage: '3d10',
    damageType: 'energy',
    critical: 20,
    range: 40,
    cost: 1000,
    weight: 4,
    attackAttribute: 'dex',
    description: `<p>The standard military rifle used by armed forces across the galaxy. Reliable and effective at medium to long range.</p>`,
    properties: []
  },
  {
    id: 'weapon-clone-dc15a-blaster-rifle',
    name: 'Clone DC-15A Blaster Rifle',
    damage: '3d12',
    damageType: 'energy',
    critical: 20,
    range: 40,
    cost: 2400,
    weight: 5,
    attackAttribute: 'dex',
    description: `<p>The long-range variant of the DC-15 series used by Clone Troopers during the Clone Wars. Exceptional range and damage.</p>`,
    properties: ['Military']
  },
  {
    id: 'weapon-clone-dc15s-blaster-carbine',
    name: 'Clone DC-15S Blaster Carbine',
    damage: '3d8',
    damageType: 'energy',
    critical: 20,
    range: 30,
    cost: 1200,
    weight: 3,
    attackAttribute: 'dex',
    description: `<p>The carbine version of the DC-15 series. More compact than the rifle variant, suitable for close-quarters operations.</p>`,
    properties: ['Military']
  },
  {
    id: 'weapon-disruptor-rifle',
    name: 'Disruptor Rifle',
    damage: '4d6',
    damageType: 'energy',
    critical: 20,
    range: 30,
    cost: 4000,
    weight: 4,
    attackAttribute: 'dex',
    description: `<p>A highly illegal weapon that completely disrupts matter. Banned by most civilized governments due to its destructive nature.</p>
      <p><strong>Special:</strong> Disruptor weapons ignore damage reduction and are extremely illegal.</p>`,
    properties: ['Disruptor', 'Illegal', 'Banned']
  },
  {
    id: 'weapon-heavy-blaster-rifle',
    name: 'Heavy Blaster Rifle',
    damage: '3d12',
    damageType: 'energy',
    critical: 20,
    range: 30,
    cost: 1500,
    weight: 6,
    attackAttribute: 'dex',
    description: `<p>A powerful rifle that sacrifices range for increased damage output. Heavy but devastating.</p>`,
    properties: []
  },
  {
    id: 'weapon-slugthrower-rifle',
    name: 'Slugthrower Rifle',
    damage: '2d8',
    damageType: 'kinetic',
    critical: 20,
    range: 50,
    cost: 300,
    weight: 3,
    attackAttribute: 'dex',
    description: `<p>A simple ballistic rifle. Primitive but effective, and bypasses some energy-based defenses.</p>
      <p><strong>Special:</strong> Requires ammunition (bullets).</p>`,
    properties: ['Projectile', 'Ammunition Required']
  },
  {
    id: 'weapon-sniper-rifle',
    name: 'Sniper Rifle',
    damage: '3d8',
    damageType: 'kinetic',
    critical: '19-20',
    range: 80,
    cost: 1500,
    weight: 7,
    attackAttribute: 'dex',
    description: `<p>A precision long-range rifle with an integrated scope. Excellent for taking down targets from extreme distances.</p>
      <p><strong>Special:</strong> +2 equipment bonus to attack rolls when aiming. Critical threat range 19-20.</p>`,
    properties: ['Scoped', 'Critical 19-20', 'Projectile']
  },
  {
    id: 'weapon-sonic-rifle',
    name: 'Sonic Rifle',
    damage: '2d8',
    damageType: 'sonic',
    critical: 20,
    range: 30,
    cost: 1400,
    weight: 4,
    attackAttribute: 'dex',
    description: `<p>Fires concentrated sonic energy that ignores most physical armor.</p>
      <p><strong>Special:</strong> Sonic damage ignores armor bonuses not from natural armor.</p>`,
    properties: ['Sonic']
  },
  {
    id: 'weapon-stealth-carbine',
    name: 'Stealth Carbine',
    damage: '3d8',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 3500,
    weight: 2.5,
    attackAttribute: 'dex',
    description: `<p>A specialized carbine designed for covert operations. Features low-sound emission technology.</p>
      <p><strong>Special:</strong> Nearly silent when fired, ideal for stealth missions.</p>`,
    properties: ['Silent', 'Stealth']
  },
  {
    id: 'weapon-trandoshan-repeater-rifle',
    name: 'Trandoshan Repeater Rifle',
    damage: '3d10',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 2000,
    weight: 7,
    attackAttribute: 'dex',
    description: `<p>A heavy repeating blaster favored by Trandoshan hunters. Can fire in automatic mode.</p>
      <p><strong>Special:</strong> Can be used for autofire attacks.</p>`,
    properties: ['Autofire']
  },
  {
    id: 'weapon-tusken-cycler-rifle',
    name: 'Tusken Cycler Rifle',
    damage: '2d8',
    damageType: 'kinetic',
    critical: 20,
    range: 40,
    cost: 150,
    weight: 4,
    attackAttribute: 'dex',
    description: `<p>A primitive projectile rifle used by Tusken Raiders. Despite its simple construction, it is deadly in skilled hands.</p>
      <p><strong>Special:</strong> Requires ammunition. Primitive but effective.</p>`,
    properties: ['Primitive', 'Projectile', 'Ammunition Required']
  },
  {
    id: 'weapon-verpine-shatter-rifle',
    name: 'Verpine Shatter Rifle',
    damage: '4d6',
    damageType: 'kinetic',
    critical: '19-20',
    range: 30,
    cost: 5000,
    weight: 3,
    attackAttribute: 'dex',
    description: `<p>A magnetically-accelerated rifle created by the Verpine. Silent and armor-piercing with superior accuracy.</p>
      <p><strong>Special:</strong> Silent operation, armor-piercing. Critical threat range 19-20.</p>`,
    properties: ['Silent', 'Armor-Piercing', 'Critical 19-20']
  },
  {
    id: 'weapon-verpine-sniper-rifle',
    name: 'Verpine Sniper Rifle',
    damage: '4d8',
    damageType: 'kinetic',
    critical: '19-20',
    range: 60,
    cost: 8000,
    weight: 5,
    attackAttribute: 'dex',
    description: `<p>The elite long-range variant of Verpine shatter weapons. Combines extreme range with silent operation and devastating accuracy.</p>
      <p><strong>Special:</strong> Silent, armor-piercing, exceptional range. Critical threat range 19-20.</p>`,
    properties: ['Silent', 'Armor-Piercing', 'Critical 19-20', 'Scoped']
  },

  // ===== HEAVY WEAPONS (6) =====
  {
    id: 'weapon-bowcaster',
    name: 'Bowcaster',
    damage: '3d10',
    damageType: 'kinetic',
    critical: '19-20',
    range: 20,
    cost: 1500,
    weight: 7,
    attackAttribute: 'str',
    description: `<p>The traditional weapon of the Wookiees. Fires explosive quarrels propelled by magnetic acceleration.</p>
      <p><strong>Special:</strong> Requires Strength 13+ to use effectively. Critical threat range 19-20.</p>`,
    properties: ['Wookiee', 'Critical 19-20', 'Strength Required']
  },
  {
    id: 'weapon-charric',
    name: 'Charric',
    damage: '3d10',
    damageType: 'energy',
    critical: 20,
    range: 30,
    cost: 4500,
    weight: 4,
    attackAttribute: 'dex',
    description: `<p>The sophisticated energy weapon used by the Chiss Ascendancy. Fires maser beams that are difficult to detect.</p>
      <p><strong>Special:</strong> Chiss military weapon. Difficult to trace.</p>`,
    properties: ['Chiss', 'Military']
  },
  {
    id: 'weapon-heavy-laser-cannon',
    name: 'Heavy Laser Cannon',
    damage: '4d10',
    damageType: 'energy',
    critical: 20,
    range: 50,
    cost: 6000,
    weight: 10,
    attackAttribute: 'dex',
    description: `<p>A crew-served heavy weapon typically mounted on vehicles or emplacements. Devastating firepower.</p>
      <p><strong>Special:</strong> Requires setup, typically crew-served. Cannot be fired while moving.</p>`,
    properties: ['Crew-Served', 'Heavy']
  },
  {
    id: 'weapon-laser-cannon',
    name: 'Laser Cannon',
    damage: '3d10',
    damageType: 'energy',
    critical: 20,
    range: 40,
    cost: 3500,
    weight: 8,
    attackAttribute: 'dex',
    description: `<p>A portable heavy weapon used by infantry for anti-vehicle and heavy fire support roles.</p>
      <p><strong>Special:</strong> Heavy weapon, difficult to use while moving.</p>`,
    properties: ['Heavy']
  },
  {
    id: 'weapon-repeating-blaster',
    name: 'Repeating Blaster',
    damage: '3d12',
    damageType: 'energy',
    critical: 20,
    range: 20,
    cost: 2500,
    weight: 12,
    attackAttribute: 'dex',
    description: `<p>A heavy automatic blaster capable of laying down suppressive fire. Extremely heavy but devastating.</p>
      <p><strong>Special:</strong> Can make autofire attacks. Requires setup or bracing.</p>`,
    properties: ['Autofire', 'Heavy']
  },

  // ===== LAUNCHERS (4) =====
  {
    id: 'weapon-concussion-missile-launcher',
    name: 'Concussion Missile Launcher',
    damage: 'varies',
    damageType: 'explosive',
    critical: 20,
    range: 60,
    cost: 8000,
    weight: 12,
    attackAttribute: 'dex',
    description: `<p>Fires concussion missiles that create devastating explosive blasts. Area effect weapon.</p>
      <p><strong>Special:</strong> Damage varies by missile type. Area effect: 2-square radius. Requires missiles.</p>`,
    properties: ['Launcher', 'Area Effect', 'Ammunition Required']
  },
  {
    id: 'weapon-miniature-missile-launcher',
    name: 'Miniature Missile Launcher',
    damage: 'varies',
    damageType: 'explosive',
    critical: 20,
    range: 40,
    cost: 5000,
    weight: 6,
    attackAttribute: 'dex',
    description: `<p>A compact launcher system integrated into armor or weapons platforms.</p>
      <p><strong>Special:</strong> Damage varies by missile type. Requires missiles.</p>`,
    properties: ['Launcher', 'Integrated', 'Ammunition Required']
  },
  {
    id: 'weapon-proton-torpedo-launcher',
    name: 'Proton Torpedo Launcher',
    damage: 'varies',
    damageType: 'explosive',
    critical: 20,
    range: 60,
    cost: 12000,
    weight: 15,
    attackAttribute: 'dex',
    description: `<p>Fires proton torpedoes - high-yield explosives typically used against vehicles and fortifications.</p>
      <p><strong>Special:</strong> Damage varies by torpedo type. Massive area effect. Requires torpedoes.</p>`,
    properties: ['Launcher', 'Heavy', 'Area Effect', 'Ammunition Required']
  },
  {
    id: 'weapon-wrist-rocket-launcher',
    name: 'Wrist Rocket Launcher',
    damage: 'varies',
    damageType: 'explosive',
    critical: 20,
    range: 10,
    cost: 2000,
    weight: 1.5,
    attackAttribute: 'dex',
    description: `<p>A small wrist-mounted launcher system often used by Mandalorians. Fires small rockets.</p>
      <p><strong>Special:</strong> Wrist-mounted, doesn't occupy hands. Damage varies by rocket type.</p>`,
    properties: ['Wrist-Mounted', 'Launcher', 'Ammunition Required']
  },

  // ===== MELEE WEAPONS (13) =====
  {
    id: 'weapon-cortosis-sword',
    name: 'Cortosis Sword',
    damage: '2d8',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 8000,
    weight: 3,
    attackAttribute: 'str',
    description: `<p>A blade forged from cortosis, a rare mineral that can resist lightsaber blades.</p>
      <p><strong>Special:</strong> Immune to being destroyed by lightsabers. Can block lightsaber attacks. Critical threat range 19-20.</p>`,
    properties: ['Cortosis', 'Lightsaber Resistant', 'Critical 19-20']
  },
  {
    id: 'weapon-electrostaff',
    name: 'Electrostaff',
    damage: '2d6',
    damageType: 'bludgeoning',
    critical: 20,
    range: 'melee',
    cost: 5000,
    weight: 6,
    attackAttribute: 'str',
    description: `<p>A staff weapon that generates an electrical field. Can block lightsaber attacks without being destroyed.</p>
      <p><strong>Special:</strong> Deals additional electrical damage. Can block lightsabers. Two-handed.</p>`,
    properties: ['Electric', 'Lightsaber Resistant', 'Two-Handed']
  },
  {
    id: 'weapon-gungan-electropole',
    name: 'Gungan Electropole',
    damage: '2d6',
    damageType: 'bludgeoning',
    critical: 20,
    range: 'melee',
    cost: 500,
    weight: 3,
    attackAttribute: 'str',
    description: `<p>The traditional weapon of Gungan warriors. Can be set to stun or lethal modes.</p>
      <p><strong>Special:</strong> Can deal normal or stun damage (wielder's choice). Two-handed.</p>`,
    properties: ['Electric', 'Stun Option', 'Two-Handed']
  },
  {
    id: 'weapon-monomolecular-knife',
    name: 'Monomolecular Knife',
    damage: '1d4',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 350,
    weight: 0.5,
    attackAttribute: 'str',
    description: `<p>A knife with an incredibly sharp monomolecular edge. Extremely sharp and armor-piercing.</p>
      <p><strong>Special:</strong> Armor-piercing. Critical threat range 19-20.</p>`,
    properties: ['Armor-Piercing', 'Critical 19-20']
  },
  {
    id: 'weapon-sith-sword',
    name: 'Sith Sword',
    damage: '2d8',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 6000,
    weight: 3,
    attackAttribute: 'str',
    description: `<p>A blade forged through Sith alchemy. Imbued with dark side energy and can resist lightsabers.</p>
      <p><strong>Special:</strong> Sith alchemical weapon. Can block lightsabers. Critical threat range 19-20.</p>`,
    properties: ['Sith Alchemy', 'Lightsaber Resistant', 'Critical 19-20']
  },
  {
    id: 'weapon-sith-tremor-sword',
    name: 'Sith Tremor Sword',
    damage: '2d6',
    damageType: 'sonic',
    critical: 20,
    range: 'melee',
    cost: 8000,
    weight: 4,
    attackAttribute: 'str',
    description: `<p>A Sith weapon that generates powerful sonic vibrations. Deals sonic damage and can shatter armor.</p>
      <p><strong>Special:</strong> Deals sonic damage. Ignores armor bonuses not from natural armor.</p>`,
    properties: ['Sonic', 'Sith']
  },
  {
    id: 'weapon-stun-baton',
    name: 'Stun Baton',
    damage: '1d6',
    damageType: 'stun',
    critical: 20,
    range: 'melee',
    cost: 250,
    weight: 1.5,
    attackAttribute: 'str',
    description: `<p>A non-lethal weapon that delivers an electrical shock to stun targets.</p>
      <p><strong>Special:</strong> Deals stun damage only. Target must make Fortitude save or be stunned.</p>`,
    properties: ['Stun', 'Non-Lethal']
  },
  {
    id: 'weapon-tusken-gaderffii-stick',
    name: 'Tusken Gaderffii Stick',
    damage: '1d6',
    damageType: 'bludgeoning',
    critical: 20,
    range: 'melee',
    cost: 25,
    weight: 4,
    attackAttribute: 'str',
    description: `<p>The traditional weapon of the Tusken Raiders. A dual-ended staff with a bludgeoning head and a piercing spike.</p>
      <p><strong>Special:</strong> Can deal bludgeoning (1d6) or piercing (1d8) damage. Two-handed. Double weapon.</p>`,
    properties: ['Double Weapon', 'Two-Handed', 'Primitive']
  },
  {
    id: 'weapon-vibroblade',
    name: 'Vibroblade',
    damage: '2d6',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 500,
    weight: 2,
    attackAttribute: 'str',
    description: `<p>A blade weapon enhanced with ultrasonic vibrations that increase its cutting power.</p>
      <p><strong>Special:</strong> Vibroweapon. Critical threat range 19-20.</p>`,
    properties: ['Vibroweapon', 'Critical 19-20']
  },
  {
    id: 'weapon-vibrodagger',
    name: 'Vibrodagger',
    damage: '2d4',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 250,
    weight: 0.5,
    attackAttribute: 'str',
    description: `<p>A small vibroweapon easily concealed. Popular with assassins and spies.</p>
      <p><strong>Special:</strong> Vibroweapon. Critical threat range 19-20. Can be thrown (range 6 squares).</p>`,
    properties: ['Vibroweapon', 'Critical 19-20', 'Concealable']
  },
  {
    id: 'weapon-vibrosword',
    name: 'Vibrosword',
    damage: '2d8',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 1000,
    weight: 3,
    attackAttribute: 'str',
    description: `<p>A full-length sword enhanced with ultrasonic vibrations. The weapon of choice for many melee combatants.</p>
      <p><strong>Special:</strong> Vibroweapon. Critical threat range 19-20.</p>`,
    properties: ['Vibroweapon', 'Critical 19-20']
  },
  {
    id: 'weapon-wookiee-ryyk-blade',
    name: 'Wookiee Ryyk Blade',
    damage: '2d8',
    damageType: 'slashing',
    critical: '19-20',
    range: 'melee',
    cost: 1000,
    weight: 5,
    attackAttribute: 'str',
    description: `<p>A curved Wookiee blade with an elegant yet brutal design. Traditionally wielded by Wookiee warriors.</p>
      <p><strong>Special:</strong> Wookiee weapon. Critical threat range 19-20.</p>`,
    properties: ['Wookiee', 'Critical 19-20']
  },
  {
    id: 'weapon-zabrak-combat-staff',
    name: 'Zabrak Combat Staff',
    damage: '1d8',
    damageType: 'bludgeoning',
    critical: 20,
    range: 'melee',
    cost: 200,
    weight: 3,
    attackAttribute: 'str',
    description: `<p>A traditional Zabrak quarterstaff used in combat training and martial arts.</p>
      <p><strong>Special:</strong> Two-handed. Double weapon (can be used for two-weapon fighting).</p>`,
    properties: ['Two-Handed', 'Double Weapon']
  },

  // ===== LIGHTSABERS (4) =====
  {
    id: 'weapon-lightsaber',
    name: 'Lightsaber',
    damage: '2d8',
    damageType: 'energy',
    critical: '19-20',
    range: 'melee',
    cost: 12000,
    weight: 1,
    attackAttribute: 'str',
    description: `<p>The elegant weapon of the Jedi and Sith. A blade of pure energy capable of cutting through nearly anything.</p>
      <p><strong>Special:</strong> Ignores armor bonuses to Reflex Defense. Can deflect blaster bolts. Critical threat range 19-20. Requires exotic weapon proficiency.</p>`,
    properties: ['Lightsaber', 'Critical 19-20', 'Exotic', 'Armor-Piercing']
  },
  {
    id: 'weapon-double-bladed-lightsaber',
    name: 'Double-Bladed Lightsaber',
    damage: '2d8',
    damageType: 'energy',
    critical: '19-20',
    range: 'melee',
    cost: 24000,
    weight: 2,
    attackAttribute: 'str',
    description: `<p>A lightsaber with blades on both ends. Wielded by some Sith and Jedi, most famously Darth Maul.</p>
      <p><strong>Special:</strong> Double weapon. Ignores armor bonuses. Can deflect blaster bolts. Critical threat range 19-20. Requires exotic weapon proficiency.</p>`,
    properties: ['Lightsaber', 'Double Weapon', 'Critical 19-20', 'Exotic', 'Armor-Piercing']
  },
  {
    id: 'weapon-lightfoil',
    name: 'Lightfoil',
    damage: '2d6',
    damageType: 'energy',
    critical: '19-20',
    range: 'melee',
    cost: 10000,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A refined lightsaber variant designed for finesse and dueling. Favored by aristocratic Force users.</p>
      <p><strong>Special:</strong> Uses Dexterity for attack rolls. Ignores armor bonuses. Can deflect blaster bolts. Critical threat range 19-20. Requires exotic weapon proficiency.</p>`,
    properties: ['Lightsaber', 'Finesse', 'Critical 19-20', 'Exotic', 'Armor-Piercing']
  },
  {
    id: 'weapon-jedi-training-saber',
    name: 'Jedi Training Saber',
    damage: '2d4',
    damageType: 'stun',
    critical: 20,
    range: 'melee',
    cost: 500,
    weight: 1,
    attackAttribute: 'str',
    description: `<p>A modified lightsaber used for Jedi training. Set to deal non-lethal stun damage.</p>
      <p><strong>Special:</strong> Deals stun damage only. Non-lethal. Used by Younglings and Padawans during training.</p>`,
    properties: ['Lightsaber', 'Training', 'Stun', 'Non-Lethal']
  },

  // ===== EXOTIC WEAPONS (5) =====
  {
    id: 'weapon-electro-net',
    name: 'Electro-net',
    damage: 'Special',
    damageType: 'electric',
    critical: 20,
    range: 5,
    cost: 300,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A weighted net that delivers an electrical shock to ensnare and disable targets.</p>
      <p><strong>Special:</strong> Target is entangled (Reflex save DC 15 to avoid). Deals 2d6 electrical damage per round while entangled. Escape DC 20.</p>`,
    properties: ['Exotic', 'Entangling', 'Electric', 'Single Use']
  },
  {
    id: 'weapon-electro-whip',
    name: 'Electro-whip',
    damage: '1d6',
    damageType: 'electric',
    critical: 20,
    range: 2,
    cost: 500,
    weight: 1,
    attackAttribute: 'str',
    description: `<p>A flexible whip that delivers electrical shocks. Has reach and can be used to trip opponents.</p>
      <p><strong>Special:</strong> Reach weapon (2 squares). Can make trip attacks. Deals additional electrical damage.</p>`,
    properties: ['Exotic', 'Reach', 'Electric', 'Trip']
  },
  {
    id: 'weapon-flamethrower',
    name: 'Flamethrower',
    damage: '2d10',
    damageType: 'fire',
    critical: 20,
    range: 6,
    cost: 1500,
    weight: 6,
    attackAttribute: 'dex',
    description: `<p>A weapon that projects a cone of flame. Area effect weapon that sets targets on fire.</p>
      <p><strong>Special:</strong> Cone template (6 squares). Reflex save DC 15 for half damage. May catch targets on fire (1d6 ongoing fire damage).</p>`,
    properties: ['Exotic', 'Area Effect', 'Fire', 'Cone']
  },
  {
    id: 'weapon-sith-lanvarok',
    name: 'Sith Lanvarok',
    damage: '2d6',
    damageType: 'kinetic',
    critical: 20,
    range: 6,
    cost: 2000,
    weight: 3,
    attackAttribute: 'dex',
    description: `<p>An ancient Sith weapon that fires razor-sharp discs. Can fire multiple discs in a spread.</p>
      <p><strong>Special:</strong> Can fire single disc or spread of 3 discs (attacks multiple targets within cone). Exotic weapon.</p>`,
    properties: ['Exotic', 'Sith', 'Multi-Target']
  },
  {
    id: 'weapon-zeltron-neural-whip',
    name: 'Zeltron Neural Whip',
    damage: '1d6',
    damageType: 'electric',
    critical: 20,
    range: 2,
    cost: 1000,
    weight: 1,
    attackAttribute: 'str',
    description: `<p>A specialized whip that targets the nervous system. Can ensnare and stun opponents.</p>
      <p><strong>Special:</strong> Reach weapon. Target must make Fort save DC 15 or be stunned for 1 round. Can entangle.</p>`,
    properties: ['Exotic', 'Reach', 'Electric', 'Ensnaring', 'Stun']
  },

  // ===== WRIST-MOUNTED (2) =====
  {
    id: 'weapon-mandalorian-ripper',
    name: 'Mandalorian Ripper',
    damage: '3d6',
    damageType: 'kinetic',
    critical: 20,
    range: 10,
    cost: 3500,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A wrist-mounted weapon that fires magnetically-accelerated projectiles. Silent and armor-piercing.</p>
      <p><strong>Special:</strong> Wrist-mounted, doesn't occupy hands. Silent, armor-piercing. Mandalorian weapon.</p>`,
    properties: ['Wrist-Mounted', 'Silent', 'Armor-Piercing', 'Mandalorian']
  },
  {
    id: 'weapon-wrist-laser',
    name: 'Wrist Laser',
    damage: '2d6',
    damageType: 'energy',
    critical: 20,
    range: 10,
    cost: 2000,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>A concealed wrist-mounted laser weapon. Often integrated into armor or gauntlets.</p>
      <p><strong>Special:</strong> Wrist-mounted, doesn't occupy hands. Concealed.</p>`,
    properties: ['Wrist-Mounted', 'Concealed']
  },

  // ===== GRENADES & EXPLOSIVES (4) =====
  {
    id: 'weapon-cryoban-grenade',
    name: 'CryoBan Grenade',
    damage: '4d6',
    damageType: 'cold',
    critical: 20,
    range: 6,
    cost: 500,
    weight: 0.5,
    attackAttribute: 'dex',
    description: `<p>A grenade that releases cryogenic chemicals, freezing everything in the blast area.</p>
      <p><strong>Special:</strong> 2-square radius burst. Reflex save DC 15 for half damage. Target may be frozen (Fortitude save DC 15 or immobilized).</p>`,
    properties: ['Grenade', 'Area Effect', 'Cold', 'Single Use']
  },
  {
    id: 'weapon-frag-grenade',
    name: 'Frag Grenade',
    damage: '4d6',
    damageType: 'explosive',
    critical: 20,
    range: 6,
    cost: 200,
    weight: 0.5,
    attackAttribute: 'dex',
    description: `<p>A standard fragmentation grenade. The most common explosive device in the galaxy.</p>
      <p><strong>Special:</strong> 2-square radius burst. Reflex save DC 15 for half damage.</p>`,
    properties: ['Grenade', 'Area Effect', 'Explosive', 'Single Use']
  },
  {
    id: 'weapon-stun-grenade',
    name: 'Stun Grenade',
    damage: '4d6',
    damageType: 'stun',
    critical: 20,
    range: 6,
    cost: 150,
    weight: 0.5,
    attackAttribute: 'dex',
    description: `<p>A non-lethal grenade that releases a burst of stunning energy.</p>
      <p><strong>Special:</strong> 2-square radius burst. Fortitude save DC 15 or take full stun damage and be dazed 1 round. Half damage on save.</p>`,
    properties: ['Grenade', 'Area Effect', 'Stun', 'Non-Lethal', 'Single Use']
  },
  {
    id: 'weapon-thermal-detonator',
    name: 'Thermal Detonator',
    damage: '8d6',
    damageType: 'explosive',
    critical: 20,
    range: 6,
    cost: 2000,
    weight: 1,
    attackAttribute: 'dex',
    description: `<p>An extremely powerful explosive device. Creates a massive blast that can level buildings.</p>
      <p><strong>Special:</strong> 4-square radius burst. Reflex save DC 20 for half damage. Extremely dangerous and often illegal.</p>`,
    properties: ['Grenade', 'Area Effect', 'Explosive', 'Single Use', 'Restricted']
  },
];

/**
 * Generate a Foundry VTT pack entry for weapon
 */
function generateWeaponEntry(weapon) {
  // Convert range to proper format
  let rangeStr = weapon.range;
  if (typeof weapon.range === 'number') {
    rangeStr = `${weapon.range} squares`;
  } else if (weapon.range === 'melee') {
    rangeStr = 'Melee';
  }

  return {
    _id: weapon.id,
    name: weapon.name,
    type: 'weapon',
    img: 'icons/svg/sword.svg',
    system: {
      damage: weapon.damage,
      damageType: weapon.damageType,
      attackBonus: 0,
      attackAttribute: weapon.attackAttribute,
      range: rangeStr,
      weight: weapon.weight,
      cost: weapon.cost,
      equipped: false,
      description: weapon.description,
      properties: weapon.properties,
      ammunition: {
        type: weapon.properties.includes('Ammunition Required') ? 'standard' : 'none',
        current: 0,
        max: 0
      }
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
}

/**
 * Main function to rebuild weapons.db
 */
function rebuildWeaponsPack() {
  const packPath = path.join(__dirname, '..', 'packs', 'weapons.db');

  // Generate all weapon entries
  const entries = weaponData.map(weapon => generateWeaponEntry(weapon));

  // Convert to NDJSON format (one JSON object per line)
  const ndjson = entries.map(entry => JSON.stringify(entry)).join('\n');

  // Write to file
  fs.writeFileSync(packPath, ndjson + '\n', 'utf8');

  console.log(`✓ Successfully rebuilt weapons.db with ${entries.length} weapon entries`);

  // Count by category
  const categories = {
    pistols: entries.filter(e => e.name.includes('Pistol') || e.name.includes('Blaster') && !e.name.includes('Rifle')).length,
    rifles: entries.filter(e => e.name.includes('Rifle') || e.name.includes('Carbine')).length,
    heavy: entries.filter(e => ['Bowcaster', 'Charric', 'Cannon', 'Repeating Blaster'].some(h => e.name.includes(h))).length,
    launchers: entries.filter(e => e.name.includes('Launcher')).length,
    melee: entries.filter(e => e.system.range === 'Melee' && !e.name.includes('Lightsaber')).length,
    lightsabers: entries.filter(e => e.name.includes('Lightsaber') || e.name.includes('Lightfoil')).length,
    exotic: entries.filter(e => e.system.properties.includes('Exotic')).length,
    grenades: entries.filter(e => e.name.includes('Grenade') || e.name.includes('Detonator')).length
  };

  console.log(`  - Pistols: ${categories.pistols}`);
  console.log(`  - Rifles/Carbines: ${categories.rifles}`);
  console.log(`  - Heavy Weapons: ${categories.heavy}`);
  console.log(`  - Launchers: ${categories.launchers}`);
  console.log(`  - Melee Weapons: ${categories.melee}`);
  console.log(`  - Lightsabers: ${categories.lightsabers}`);
  console.log(`  - Exotic Weapons: ${categories.exotic}`);
  console.log(`  - Grenades/Explosives: ${categories.grenades}`);
}

// Run the script
try {
  rebuildWeaponsPack();
} catch (error) {
  console.error('Error rebuilding weapons pack:', error);
  process.exit(1);
}
