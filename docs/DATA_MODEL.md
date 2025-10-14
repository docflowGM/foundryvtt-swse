Star Wars Saga Edition (SWSE) – Data Model
📖 Purpose
This document describes the data structures used to represent characters, NPCs, starships, items, and rules elements in the SWSE system. It serves as a schema reference for template.json and guides implementation of actor/item sheets, compendium data, and automation logic.
🧑 Actors
Common Actor Fields
All actors (PC, NPC, starship) share some base fields:
{
  "name": "string",
  "type": "character | npc | starship",
  "system": {
    "abilities": {
      "str": { "value": 10, "mod": 0 },
      "dex": { "value": 10, "mod": 0 },
      "con": { "value": 10, "mod": 0 },
      "int": { "value": 10, "mod": 0 },
      "wis": { "value": 10, "mod": 0 },
      "cha": { "value": 10, "mod": 0 }
    },
    "hp": { "max": 0, "value": 0 },
    "threshold": 0,
    "defenses": {
      "fort": { "base": 10, "misc": 0, "value": 10 },
      "ref": { "base": 10, "misc": 0, "value": 10 },
      "will": { "base": 10, "misc": 0, "value": 10 }
    },
    "condition": { "track": 0 },
    "initiative": { "value": 0 },
    "skills": {},
    "forcePoints": { "max": 0, "value": 0 },
    "destinyPoints": { "max": 0, "value": 0 },
    "level": 1,
    "xp": { "value": 0 },
    "class": "string",
    "species": "string"
  },
  "items": []
}
Character Actor
Represents a PC or major heroic NPC.
Unique Fields:
trainedSkills: list of trained skills.
talents: embedded item references.
feats: embedded item references.
forcePowers: known powers.
destiny: destiny type.
"system": {
  "trainedSkills": ["Perception", "Use Computer"],
  "talents": [],
  "feats": [],
  "forcePowers": [],
  "destiny": "Destruction"
}
NPC Actor
Simplified stat block representation.
Differences from PCs:
Direct stat entries (skills, defenses, HP) without level/class progression.
Optional feat/talent references.
"system": {
  "role": "minion | elite | boss",
  "statBlock": "raw string reference",
  "feats": [],
  "talents": []
}
Starship Actor
Represents a starship or vehicle.
Fields:
hp: hull points.
threshold: damage threshold.
shields: shield rating.
speed: squares per round.
crew: list of crew roles.
weapons: starship weapon items.
"system": {
  "hp": { "max": 150, "value": 150 },
  "threshold": 30,
  "shields": { "fore": 15, "aft": 15, "port": 15, "starboard": 15 },
  "speed": 4,
  "crew": {
    "pilot": "ActorID",
    "gunners": ["ActorID"]
  },
  "weapons": []
}
🎒 Items
Common Item Fields
{
  "name": "string",
  "type": "weapon | armor | equipment | feat | talent | forcePower | class | species | starshipWeapon",
  "system": {
    "description": "text",
    "source": "book reference"
  }
}
Weapons
"system": {
  "category": "melee | ranged | lightsaber | starship",
  "attackBonus": 0,
  "damage": "2d8",
  "damageType": "energy | kinetic | ion",
  "range": "20",
  "properties": ["autofire", "stun"]
}
Armor
"system": {
  "bonus": 5,
  "maxDex": 3,
  "armorCheckPenalty": -2,
  "weight": "medium",
  "properties": ["vacuum sealed"]
}
Equipment
"system": {
  "slot": "gear | implant",
  "effect": "Provide +2 to Perception",
  "cost": 500
}
Feats
"system": {
  "prerequisites": ["Dex 13", "Point Blank Shot"],
  "benefit": "You gain +1 on attack rolls with ranged weapons at point blank range."
}
Talents
"system": {
  "tree": "Jedi Guardian",
  "prerequisites": ["Jedi class"],
  "benefit": "When wielding a lightsaber, add +1 to Reflex Defense."
}
Force Powers
"system": {
  "effect": "Move object telekinetically",
  "skill": "Use the Force",
  "dc": 15,
  "scales": [
    { "dc": 15, "result": "Move object up to 200kg" },
    { "dc": 20, "result": "Move object up to 500kg" }
  ],
  "usage": "encounter"
}
Classes
"system": {
  "hitDie": "1d10",
  "baseAttackProgression": "high | medium | low",
  "defenseBonuses": { "fort": 2, "ref": 0, "will": 0 },
  "classSkills": ["Use the Force", "Mechanics"],
  "talentTrees": ["Jedi Guardian", "Lightsaber Forms"]
}
Species
"system": {
  "abilityMods": { "str": 2, "cha": -2 },
  "size": "medium",
  "traits": ["Darkvision", "Natural Weapons"]
}
Starship Weapons
"system": {
  "category": "turbolaser | missile",
  "attackBonus": 0,
  "damage": "6d10x2",
  "arc": "fore | aft | port | starboard",
  "properties": ["ion"]
}
📚 Compendiums
feats.db.json – all feats (w/ prereqs, descriptions).
talents.db.json – organized by trees.
classes.db.json – base & prestige classes.
species.db.json – all playable species.
weapons.db.json, armor.db.json, equipment.db.json.
forcepowers.db.json – Force powers + scaling DCs.
starships.db.json – example ships.
🧩 Relationships
Actors embed items (weapons, feats, talents, powers).
Items can reference prerequisites (by ID or by name lookup).
Compendiums provide canonical definitions for import.
🔮 Future Data Extensions
Destiny: structured destiny point rules.
Conditions: unified condition JSON for automation.
Starship crew roles: expanded schema for multi-crew ships.
Macros: saved roll formulas for advanced play.
