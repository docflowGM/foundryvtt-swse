/**
 * Built-in Star Wars location seed library.
 *
 * These records are intentionally lightweight starter dossiers. Importing a seed
 * creates GM-only LocationRegistry records that can be customized, revealed to
 * Atlas, linked to Jobs/Intel/Factions/NPCs, and connected to real Foundry
 * Scenes/Actors/Journals later. The library stores no mechanical ownership of
 * those systems.
 */

export const LOCATION_LIBRARY_BIOMES = Object.freeze([
  {
    "value": "ancient",
    "label": "Ancient"
  },
  {
    "value": "asteroid",
    "label": "Asteroid"
  },
  {
    "value": "battlefield",
    "label": "Battlefield"
  },
  {
    "value": "bureaucracy",
    "label": "Bureaucracy"
  },
  {
    "value": "canyon",
    "label": "Canyon"
  },
  {
    "value": "capital",
    "label": "Capital"
  },
  {
    "value": "city",
    "label": "City / Urban"
  },
  {
    "value": "clan",
    "label": "Clan / Culture"
  },
  {
    "value": "cloning",
    "label": "Cloning"
  },
  {
    "value": "commerce",
    "label": "Commerce"
  },
  {
    "value": "crystal",
    "label": "Crystal"
  },
  {
    "value": "desert",
    "label": "Desert"
  },
  {
    "value": "espionage",
    "label": "Espionage"
  },
  {
    "value": "facility",
    "label": "Facility"
  },
  {
    "value": "force",
    "label": "Force Mystery"
  },
  {
    "value": "forest",
    "label": "Forest"
  },
  {
    "value": "frontier",
    "label": "Frontier"
  },
  {
    "value": "fungal",
    "label": "Fungal"
  },
  {
    "value": "gas",
    "label": "Gas Giant"
  },
  {
    "value": "grassland",
    "label": "Grassland"
  },
  {
    "value": "hidden",
    "label": "Hidden"
  },
  {
    "value": "hive",
    "label": "Hive"
  },
  {
    "value": "holy",
    "label": "Holy Site"
  },
  {
    "value": "hunter",
    "label": "Hunter"
  },
  {
    "value": "hutt",
    "label": "Hutt Space"
  },
  {
    "value": "ice",
    "label": "Ice / Arctic"
  },
  {
    "value": "imperial",
    "label": "Imperial"
  },
  {
    "value": "industrial",
    "label": "Industrial"
  },
  {
    "value": "jedi",
    "label": "Jedi / Force"
  },
  {
    "value": "jungle",
    "label": "Jungle"
  },
  {
    "value": "lava",
    "label": "Lava / Volcanic"
  },
  {
    "value": "military",
    "label": "Military"
  },
  {
    "value": "mine",
    "label": "Mine"
  },
  {
    "value": "mining",
    "label": "Mining"
  },
  {
    "value": "mobile",
    "label": "Mobile"
  },
  {
    "value": "mountain",
    "label": "Mountain"
  },
  {
    "value": "neutral",
    "label": "Neutral Zone"
  },
  {
    "value": "noble",
    "label": "Noble / Politics"
  },
  {
    "value": "outer-rim",
    "label": "Outer Rim"
  },
  {
    "value": "palace",
    "label": "Palace"
  },
  {
    "value": "pleasure",
    "label": "Pleasure World"
  },
  {
    "value": "rain",
    "label": "Rain / Storm"
  },
  {
    "value": "rakata",
    "label": "Rakata"
  },
  {
    "value": "rebel",
    "label": "Rebel"
  },
  {
    "value": "remote",
    "label": "Remote"
  },
  {
    "value": "restoration",
    "label": "Restoration"
  },
  {
    "value": "ruin",
    "label": "Ruins"
  },
  {
    "value": "rural",
    "label": "Rural"
  },
  {
    "value": "shipyard",
    "label": "Shipyard"
  },
  {
    "value": "sinkhole",
    "label": "Sinkhole"
  },
  {
    "value": "sith",
    "label": "Sith / Dark Side"
  },
  {
    "value": "space",
    "label": "Space"
  },
  {
    "value": "storm",
    "label": "Storm"
  },
  {
    "value": "strange",
    "label": "Strange"
  },
  {
    "value": "swamp",
    "label": "Swamp"
  },
  {
    "value": "temple",
    "label": "Temple"
  },
  {
    "value": "tropical",
    "label": "Tropical"
  },
  {
    "value": "undercity",
    "label": "Undercity"
  },
  {
    "value": "underworld",
    "label": "Underworld"
  },
  {
    "value": "wasteland",
    "label": "Wasteland"
  },
  {
    "value": "water",
    "label": "Water / Ocean"
  },
  {
    "value": "wildlife",
    "label": "Wildlife"
  },
  {
    "value": "wreckage",
    "label": "Wreckage"
  }
]);

export const LOCATION_LIBRARY_SEEDS = Object.freeze([
  {
    "id": "dantooine",
    "name": "Dantooine",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Raioballo sector",
    "system": "Dantooine system",
    "biomes": [
      "forest",
      "grassland",
      "rural",
      "rebel"
    ],
    "tags": [
      "Outer Rim",
      "forests",
      "farms",
      "Rebel history"
    ],
    "summary": "Remote green world of farms, ruins, and quiet rebel hideouts.",
    "children": [
      {
        "id": "dantooine-abandoned-rebel-base",
        "name": "Abandoned Rebel Base",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "forest",
          "grassland",
          "rural"
        ],
        "tags": [
          "Outer Rim",
          "forests",
          "farms",
          "seed POI"
        ],
        "summary": "Seed location under Dantooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dantooine-khoonda-settlement",
        "name": "Khoonda Settlement",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "forest",
          "grassland",
          "rural"
        ],
        "tags": [
          "Outer Rim",
          "forests",
          "farms",
          "seed POI"
        ],
        "summary": "Seed location under Dantooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dantooine-ancient-grove",
        "name": "Ancient Grove",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "forest",
          "grassland",
          "rural"
        ],
        "tags": [
          "Outer Rim",
          "forests",
          "farms",
          "seed POI"
        ],
        "summary": "Seed location under Dantooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Rebel Evacuation Routes",
        "teaser": "Old Alliance routes and caches may still be hidden in the plains.",
        "body": "Old Alliance routes and caches may still be hidden in the plains.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 15,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "alderaan",
    "name": "Alderaan",
    "type": "planet",
    "region": "Core Worlds",
    "sector": "Alderaan sector",
    "system": "Alderaan system",
    "biomes": [
      "mountain",
      "forest",
      "city",
      "noble"
    ],
    "tags": [
      "Core Worlds",
      "mountains",
      "nobility",
      "peaceful"
    ],
    "summary": "Cultured Core world known for mountains, high politics, and refined civic traditions.",
    "children": [
      {
        "id": "alderaan-aldera-palace-district",
        "name": "Aldera Palace District",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "mountain",
          "forest",
          "city"
        ],
        "tags": [
          "Core Worlds",
          "mountains",
          "nobility",
          "seed POI"
        ],
        "summary": "Seed location under Alderaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "alderaan-aldera-university-archives",
        "name": "Aldera University Archives",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "mountain",
          "forest",
          "city"
        ],
        "tags": [
          "Core Worlds",
          "mountains",
          "nobility",
          "seed POI"
        ],
        "summary": "Seed location under Alderaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "alderaan-mountain-refuge",
        "name": "Mountain Refuge",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "mountain",
          "forest",
          "city"
        ],
        "tags": [
          "Core Worlds",
          "mountains",
          "nobility",
          "seed POI"
        ],
        "summary": "Seed location under Alderaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Organa Diplomatic Channels",
        "teaser": "Alderaanian houses maintain quiet diplomatic and relief networks.",
        "body": "Alderaanian houses maintain quiet diplomatic and relief networks.",
        "category": "general",
        "skill": "knowledgeBureaucracy",
        "dc": 15,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "yavin-iv",
    "name": "Yavin IV",
    "type": "moon",
    "region": "Outer Rim",
    "sector": "Gordian Reach",
    "system": "Yavin system",
    "biomes": [
      "jungle",
      "temple",
      "rebel",
      "ancient"
    ],
    "tags": [
      "jungle moon",
      "Rebel base",
      "ancient temples"
    ],
    "summary": "Dense jungle moon orbiting Yavin, dotted with ancient temples and rebel-era sites.",
    "children": [
      {
        "id": "yavin-iv-great-temple",
        "name": "Great Temple",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "temple",
          "rebel"
        ],
        "tags": [
          "jungle moon",
          "Rebel base",
          "ancient temples",
          "seed POI"
        ],
        "summary": "Seed location under Yavin IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "yavin-iv-jungle-landing-zone",
        "name": "Jungle Landing Zone",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "jungle",
          "temple",
          "rebel"
        ],
        "tags": [
          "jungle moon",
          "Rebel base",
          "ancient temples",
          "seed POI"
        ],
        "summary": "Seed location under Yavin IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "yavin-iv-massassi-ruins",
        "name": "Massassi Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "temple",
          "rebel"
        ],
        "tags": [
          "jungle moon",
          "Rebel base",
          "ancient temples",
          "seed POI"
        ],
        "summary": "Seed location under Yavin IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Temple Sublevels",
        "teaser": "Old temple chambers may conceal routes, relics, or sleeping threats.",
        "body": "Old temple chambers may conceal routes, relics, or sleeping threats.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 18,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "manaan",
    "name": "Manaan",
    "type": "planet",
    "region": "Inner Rim",
    "sector": "Pyrshak system",
    "system": "Manaan system",
    "biomes": [
      "water",
      "city",
      "commerce",
      "neutral"
    ],
    "tags": [
      "ocean world",
      "Selkath",
      "kolto",
      "neutral zone"
    ],
    "summary": "Ocean world of floating cities, deep-water mysteries, and valuable medical commerce.",
    "children": [
      {
        "id": "manaan-ahto-city",
        "name": "Ahto City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "water",
          "city",
          "commerce"
        ],
        "tags": [
          "ocean world",
          "Selkath",
          "kolto",
          "seed POI"
        ],
        "summary": "Seed location under Manaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "manaan-kolto-harvest-platform",
        "name": "Kolto Harvest Platform",
        "category": "planetary",
        "type": "facility",
        "scale": "site",
        "biomes": [
          "water",
          "city",
          "commerce"
        ],
        "tags": [
          "ocean world",
          "Selkath",
          "kolto",
          "seed POI"
        ],
        "summary": "Seed location under Manaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "manaan-deep-reef-trench",
        "name": "Deep Reef Trench",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "water",
          "city",
          "commerce"
        ],
        "tags": [
          "ocean world",
          "Selkath",
          "kolto",
          "seed POI"
        ],
        "summary": "Seed location under Manaan; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Kolto Supply Rumors",
        "teaser": "Independent buyers may be moving restricted kolto through false manifests.",
        "body": "Independent buyers may be moving restricted kolto through false manifests.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "tatooine",
    "name": "Tatooine",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Arkanis sector",
    "system": "Tatoo system",
    "biomes": [
      "desert",
      "underworld",
      "frontier",
      "hutt"
    ],
    "tags": [
      "desert",
      "twin suns",
      "Hutt influence",
      "smugglers"
    ],
    "summary": "Harsh desert world with scattered settlements, underworld traffic, and frontier survival pressure.",
    "children": [
      {
        "id": "tatooine-mos-eisley",
        "name": "Mos Eisley",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "desert",
          "underworld",
          "frontier"
        ],
        "tags": [
          "desert",
          "twin suns",
          "Hutt influence",
          "seed POI"
        ],
        "summary": "Seed location under Tatooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "tatooine-jundland-wastes",
        "name": "Jundland Wastes",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "desert",
          "underworld",
          "frontier"
        ],
        "tags": [
          "desert",
          "twin suns",
          "Hutt influence",
          "seed POI"
        ],
        "summary": "Seed location under Tatooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "tatooine-docking-bay-94",
        "name": "Docking Bay 94",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "underworld",
          "frontier"
        ],
        "tags": [
          "desert",
          "twin suns",
          "Hutt influence",
          "seed POI"
        ],
        "summary": "Seed location under Tatooine; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Underworld Shipping Lanes",
        "teaser": "Quiet cargo moves through the starports when local authorities look away.",
        "body": "Quiet cargo moves through the starports when local authorities look away.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 15,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "malachor-v",
    "name": "Malachor V",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Chorlian sector",
    "system": "Malachor system",
    "biomes": [
      "sith",
      "wasteland",
      "storm",
      "strange"
    ],
    "tags": [
      "Legends",
      "Sith",
      "graveyard world",
      "Mandalorian Wars"
    ],
    "summary": "Broken dark-side world of jagged ruins, storms, and battlefield scars.",
    "children": [
      {
        "id": "malachor-v-trayus-academy-ruins",
        "name": "Trayus Academy Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "sith",
          "wasteland",
          "storm"
        ],
        "tags": [
          "Legends",
          "Sith",
          "graveyard world",
          "seed POI"
        ],
        "summary": "Seed location under Malachor V; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "malachor-v-mass-shadow-crater",
        "name": "Mass Shadow Crater",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "sith",
          "wasteland",
          "storm"
        ],
        "tags": [
          "Legends",
          "Sith",
          "graveyard world",
          "seed POI"
        ],
        "summary": "Seed location under Malachor V; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "malachor-v-storm-beast-ravine",
        "name": "Storm Beast Ravine",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "sith",
          "wasteland",
          "storm"
        ],
        "tags": [
          "Legends",
          "Sith",
          "graveyard world",
          "seed POI"
        ],
        "summary": "Seed location under Malachor V; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Mass Shadow Echo",
        "teaser": "The planet still carries tactical and Force scars from an ancient catastrophe.",
        "body": "The planet still carries tactical and Force scars from an ancient catastrophe.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 22,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "korriban",
    "name": "Korriban",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Sith Worlds",
    "system": "Horuset system",
    "biomes": [
      "desert",
      "sith",
      "tomb",
      "ancient"
    ],
    "tags": [
      "Legends",
      "Sith homeworld",
      "tombs",
      "dark side"
    ],
    "summary": "Ancient Sith tomb world of red deserts, burial valleys, and forbidden archives.",
    "children": [
      {
        "id": "korriban-valley-of-the-dark-lords",
        "name": "Valley of the Dark Lords",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "sith",
          "tomb"
        ],
        "tags": [
          "Legends",
          "Sith homeworld",
          "tombs",
          "seed POI"
        ],
        "summary": "Seed location under Korriban; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "korriban-sith-academy-ruins",
        "name": "Sith Academy Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "sith",
          "tomb"
        ],
        "tags": [
          "Legends",
          "Sith homeworld",
          "tombs",
          "seed POI"
        ],
        "summary": "Seed location under Korriban; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "korriban-tomb-approach",
        "name": "Tomb Approach",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "sith",
          "tomb"
        ],
        "tags": [
          "Legends",
          "Sith homeworld",
          "tombs",
          "seed POI"
        ],
        "summary": "Seed location under Korriban; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Tomb Lineage",
        "teaser": "Sith tomb architecture can reveal which dynasty claimed a ruin.",
        "body": "Sith tomb architecture can reveal which dynasty claimed a ruin.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 20,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "coruscant",
    "name": "Coruscant",
    "type": "planet",
    "region": "Core Worlds",
    "sector": "Corusca sector",
    "system": "Coruscant system",
    "biomes": [
      "city",
      "bureaucracy",
      "underworld",
      "capital"
    ],
    "tags": [
      "ecumenopolis",
      "Senate",
      "Jedi Temple",
      "underlevels"
    ],
    "summary": "Galactic city-world layered with politics, bureaucracy, wealth, and deep underworld strata.",
    "children": [
      {
        "id": "coruscant-senate-district",
        "name": "Senate District",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "city",
          "bureaucracy",
          "underworld"
        ],
        "tags": [
          "ecumenopolis",
          "Senate",
          "Jedi Temple",
          "seed POI"
        ],
        "summary": "Seed location under Coruscant; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "coruscant-jedi-temple-precinct",
        "name": "Jedi Temple Precinct",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "bureaucracy",
          "underworld"
        ],
        "tags": [
          "ecumenopolis",
          "Senate",
          "Jedi Temple",
          "seed POI"
        ],
        "summary": "Seed location under Coruscant; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "coruscant-level-1313",
        "name": "Level 1313",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "bureaucracy",
          "underworld"
        ],
        "tags": [
          "ecumenopolis",
          "Senate",
          "Jedi Temple",
          "seed POI"
        ],
        "summary": "Seed location under Coruscant; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Underlevel Contacts",
        "teaser": "A legitimate permit trail may hide black-market passage into the underlevels.",
        "body": "A legitimate permit trail may hide black-market passage into the underlevels.",
        "category": "general",
        "skill": "knowledgeBureaucracy",
        "dc": 17,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "corellia",
    "name": "Corellia",
    "type": "planet",
    "region": "Core Worlds",
    "sector": "Corellian sector",
    "system": "Corellian system",
    "biomes": [
      "city",
      "shipyard",
      "industrial",
      "commerce"
    ],
    "tags": [
      "shipyards",
      "pilots",
      "trade",
      "Corellian Run"
    ],
    "summary": "Industrial Core world famed for starships, pilots, trade lanes, and proud local identity.",
    "children": [
      {
        "id": "corellia-coronet-city",
        "name": "Coronet City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "city",
          "shipyard",
          "industrial"
        ],
        "tags": [
          "shipyards",
          "pilots",
          "trade",
          "seed POI"
        ],
        "summary": "Seed location under Corellia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "corellia-corellian-engineering-yard",
        "name": "Corellian Engineering Yard",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "shipyard",
          "industrial"
        ],
        "tags": [
          "shipyards",
          "pilots",
          "trade",
          "seed POI"
        ],
        "summary": "Seed location under Corellia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "corellia-old-spaceport",
        "name": "Old Spaceport",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "shipyard",
          "industrial"
        ],
        "tags": [
          "shipyards",
          "pilots",
          "trade",
          "seed POI"
        ],
        "summary": "Seed location under Corellia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Shipyard Schedule",
        "teaser": "A maintenance window could expose a normally secure berth.",
        "body": "A maintenance window could expose a normally secure berth.",
        "category": "general",
        "skill": "useComputer",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "naboo",
    "name": "Naboo",
    "type": "planet",
    "region": "Mid Rim",
    "sector": "Chommell sector",
    "system": "Naboo system",
    "biomes": [
      "water",
      "forest",
      "city",
      "noble"
    ],
    "tags": [
      "plains",
      "lakes",
      "Theed",
      "Gungan cities"
    ],
    "summary": "Scenic Mid Rim world of elegant cities, lake country, forests, and hidden underwater settlements.",
    "children": [
      {
        "id": "naboo-theed",
        "name": "Theed",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "water",
          "forest",
          "city"
        ],
        "tags": [
          "plains",
          "lakes",
          "Theed",
          "seed POI"
        ],
        "summary": "Seed location under Naboo; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "naboo-lake-country",
        "name": "Lake Country",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "forest",
          "city"
        ],
        "tags": [
          "plains",
          "lakes",
          "Theed",
          "seed POI"
        ],
        "summary": "Seed location under Naboo; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "naboo-otoh-gunga-approach",
        "name": "Otoh Gunga Approach",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "forest",
          "city"
        ],
        "tags": [
          "plains",
          "lakes",
          "Theed",
          "seed POI"
        ],
        "summary": "Seed location under Naboo; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Submerged Passage",
        "teaser": "Older underwater transit paths may bypass surface checkpoints.",
        "body": "Older underwater transit paths may bypass surface checkpoints.",
        "category": "general",
        "skill": "knowledgePhysicalSciences",
        "dc": 16,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "kashyyyk",
    "name": "Kashyyyk",
    "type": "planet",
    "region": "Mid Rim",
    "sector": "Mytaranor sector",
    "system": "Kashyyyk system",
    "biomes": [
      "forest",
      "jungle",
      "wildlife",
      "wookiee"
    ],
    "tags": [
      "Wookiees",
      "wroshyr forest",
      "canopy cities",
      "wildlife"
    ],
    "summary": "Vast forest world of towering wroshyr trees, Wookiee settlements, and dangerous lower levels.",
    "children": [
      {
        "id": "kashyyyk-rwookrrorro",
        "name": "Rwookrrorro",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "forest",
          "jungle",
          "wildlife"
        ],
        "tags": [
          "Wookiees",
          "wroshyr forest",
          "canopy cities",
          "seed POI"
        ],
        "summary": "Seed location under Kashyyyk; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kashyyyk-shadowlands-trail",
        "name": "Shadowlands Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "forest",
          "jungle",
          "wildlife"
        ],
        "tags": [
          "Wookiees",
          "wroshyr forest",
          "canopy cities",
          "seed POI"
        ],
        "summary": "Seed location under Kashyyyk; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kashyyyk-wroshyr-canopy-platform",
        "name": "Wroshyr Canopy Platform",
        "category": "planetary",
        "type": "facility",
        "scale": "site",
        "biomes": [
          "forest",
          "jungle",
          "wildlife"
        ],
        "tags": [
          "Wookiees",
          "wroshyr forest",
          "canopy cities",
          "seed POI"
        ],
        "summary": "Seed location under Kashyyyk; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Shadowlands Predators",
        "teaser": "The lower forest contains predators that avoid heavily traveled canopy routes.",
        "body": "The lower forest contains predators that avoid heavily traveled canopy routes.",
        "category": "general",
        "skill": "survival",
        "dc": 17,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "hoth",
    "name": "Hoth",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Anoat sector",
    "system": "Hoth system",
    "biomes": [
      "ice",
      "wilderness",
      "rebel",
      "hazard"
    ],
    "tags": [
      "ice world",
      "Rebel base",
      "wampas",
      "extreme cold"
    ],
    "summary": "Frozen Outer Rim world of lethal weather, hidden caverns, and abandoned military traces.",
    "children": [
      {
        "id": "hoth-echo-base-remnants",
        "name": "Echo Base Remnants",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "wilderness",
          "rebel"
        ],
        "tags": [
          "ice world",
          "Rebel base",
          "wampas",
          "seed POI"
        ],
        "summary": "Seed location under Hoth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "hoth-ice-canyon",
        "name": "Ice Canyon",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "ice",
          "wilderness",
          "rebel"
        ],
        "tags": [
          "ice world",
          "Rebel base",
          "wampas",
          "seed POI"
        ],
        "summary": "Seed location under Hoth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "hoth-wampa-caverns",
        "name": "Wampa Caverns",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "wilderness",
          "rebel"
        ],
        "tags": [
          "ice world",
          "Rebel base",
          "wampas",
          "seed POI"
        ],
        "summary": "Seed location under Hoth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Sensor Ghosts",
        "teaser": "Old shield generator debris can create false sensor returns in blizzards.",
        "body": "Old shield generator debris can create false sensor returns in blizzards.",
        "category": "general",
        "skill": "knowledgeTechnology",
        "dc": 15,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "dagobah",
    "name": "Dagobah",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Sluis sector",
    "system": "Dagobah system",
    "biomes": [
      "swamp",
      "forest",
      "force",
      "wildlife"
    ],
    "tags": [
      "swamp",
      "Force mystery",
      "isolation",
      "wildlife"
    ],
    "summary": "Remote swamp world thick with fog, dangerous wildlife, and strange Force resonance.",
    "children": [
      {
        "id": "dagobah-swamp-landing-clearing",
        "name": "Swamp Landing Clearing",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "swamp",
          "forest",
          "force"
        ],
        "tags": [
          "swamp",
          "Force mystery",
          "isolation",
          "seed POI"
        ],
        "summary": "Seed location under Dagobah; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dagobah-dark-cave",
        "name": "Dark Cave",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "swamp",
          "forest",
          "force"
        ],
        "tags": [
          "swamp",
          "Force mystery",
          "isolation",
          "seed POI"
        ],
        "summary": "Seed location under Dagobah; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dagobah-root-bog-trail",
        "name": "Root-Bog Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "swamp",
          "forest",
          "force"
        ],
        "tags": [
          "swamp",
          "Force mystery",
          "isolation",
          "seed POI"
        ],
        "summary": "Seed location under Dagobah; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Living Mists",
        "teaser": "The terrain itself can distort direction, memory, and sensor readings.",
        "body": "The terrain itself can distort direction, memory, and sensor readings.",
        "category": "general",
        "skill": "survival",
        "dc": 18,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "endor",
    "name": "Endor",
    "type": "moon",
    "region": "Outer Rim",
    "sector": "Moddell sector",
    "system": "Endor system",
    "biomes": [
      "forest",
      "wildlife",
      "ewok",
      "imperial"
    ],
    "tags": [
      "forest moon",
      "Ewoks",
      "Imperial bunker",
      "wildlife"
    ],
    "summary": "Forest moon with tribal settlements, dense canopy, ruins, and remnants of Imperial operations.",
    "children": [
      {
        "id": "endor-bright-tree-village",
        "name": "Bright Tree Village",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "forest",
          "wildlife",
          "ewok"
        ],
        "tags": [
          "forest moon",
          "Ewoks",
          "Imperial bunker",
          "seed POI"
        ],
        "summary": "Seed location under Endor; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "endor-shield-bunker-ruins",
        "name": "Shield Bunker Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "forest",
          "wildlife",
          "ewok"
        ],
        "tags": [
          "forest moon",
          "Ewoks",
          "Imperial bunker",
          "seed POI"
        ],
        "summary": "Seed location under Endor; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "endor-forest-moon-trail",
        "name": "Forest Moon Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "forest",
          "wildlife",
          "ewok"
        ],
        "tags": [
          "forest moon",
          "Ewoks",
          "Imperial bunker",
          "seed POI"
        ],
        "summary": "Seed location under Endor; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Bunker Salvage",
        "teaser": "Imperial bunker wreckage still contains sealed maintenance passages.",
        "body": "Imperial bunker wreckage still contains sealed maintenance passages.",
        "category": "general",
        "skill": "mechanics",
        "dc": 16,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "bespin",
    "name": "Bespin",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Anoat sector",
    "system": "Bespin system",
    "biomes": [
      "gas",
      "city",
      "mining",
      "commerce"
    ],
    "tags": [
      "gas giant",
      "Cloud City",
      "tibanna gas",
      "mining"
    ],
    "summary": "Gas giant known for floating settlements, tibanna mining, luxury districts, and hidden industrial decks.",
    "children": [
      {
        "id": "bespin-cloud-city",
        "name": "Cloud City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "gas",
          "city",
          "mining"
        ],
        "tags": [
          "gas giant",
          "Cloud City",
          "tibanna gas",
          "seed POI"
        ],
        "summary": "Seed location under Bespin; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "bespin-tibanna-processing-vane",
        "name": "Tibanna Processing Vane",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "gas",
          "city",
          "mining"
        ],
        "tags": [
          "gas giant",
          "Cloud City",
          "tibanna gas",
          "seed POI"
        ],
        "summary": "Seed location under Bespin; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "bespin-lower-maintenance-decks",
        "name": "Lower Maintenance Decks",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "gas",
          "city",
          "mining"
        ],
        "tags": [
          "gas giant",
          "Cloud City",
          "tibanna gas",
          "seed POI"
        ],
        "summary": "Seed location under Bespin; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Gas Contract Leverage",
        "teaser": "Mining contracts can expose who is quietly buying tibanna off-ledger.",
        "body": "Mining contracts can expose who is quietly buying tibanna off-ledger.",
        "category": "general",
        "skill": "knowledgeBureaucracy",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "mustafar",
    "name": "Mustafar",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Atravis sector",
    "system": "Mustafar system",
    "biomes": [
      "lava",
      "mining",
      "sith",
      "hazard"
    ],
    "tags": [
      "lava world",
      "mining",
      "Sith traces",
      "extreme heat"
    ],
    "summary": "Volcanic world of lava flows, mining platforms, black stone, and dark legends.",
    "children": [
      {
        "id": "mustafar-lava-mining-platform",
        "name": "Lava Mining Platform",
        "category": "planetary",
        "type": "facility",
        "scale": "site",
        "biomes": [
          "lava",
          "mining",
          "sith"
        ],
        "tags": [
          "lava world",
          "mining",
          "Sith traces",
          "seed POI"
        ],
        "summary": "Seed location under Mustafar; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mustafar-obsidian-flats",
        "name": "Obsidian Flats",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "lava",
          "mining",
          "sith"
        ],
        "tags": [
          "lava world",
          "mining",
          "Sith traces",
          "seed POI"
        ],
        "summary": "Seed location under Mustafar; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mustafar-fortress-approach",
        "name": "Fortress Approach",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "lava",
          "mining",
          "sith"
        ],
        "tags": [
          "lava world",
          "mining",
          "Sith traces",
          "seed POI"
        ],
        "summary": "Seed location under Mustafar; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Thermal Blind Spots",
        "teaser": "Ore processors create windows where scanners are unreliable.",
        "body": "Ore processors create windows where scanners are unreliable.",
        "category": "general",
        "skill": "knowledgeTechnology",
        "dc": 16,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "geonosis",
    "name": "Geonosis",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Arkanis sector",
    "system": "Geonosis system",
    "biomes": [
      "desert",
      "hive",
      "industrial",
      "battlefield"
    ],
    "tags": [
      "hive world",
      "droid factories",
      "arena",
      "Clone Wars"
    ],
    "summary": "Rocky hive world with catacombs, foundries, arenas, and Clone Wars battlefields.",
    "children": [
      {
        "id": "geonosis-petranaki-arena",
        "name": "Petranaki Arena",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "hive",
          "industrial"
        ],
        "tags": [
          "hive world",
          "droid factories",
          "arena",
          "seed POI"
        ],
        "summary": "Seed location under Geonosis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "geonosis-droid-foundry",
        "name": "Droid Foundry",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "hive",
          "industrial"
        ],
        "tags": [
          "hive world",
          "droid factories",
          "arena",
          "seed POI"
        ],
        "summary": "Seed location under Geonosis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "geonosis-catacomb-nest",
        "name": "Catacomb Nest",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "hive",
          "industrial"
        ],
        "tags": [
          "hive world",
          "droid factories",
          "arena",
          "seed POI"
        ],
        "summary": "Seed location under Geonosis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Dormant Assembly Lines",
        "teaser": "A sealed foundry wing may still hold partial droid production data.",
        "body": "A sealed foundry wing may still hold partial droid production data.",
        "category": "general",
        "skill": "mechanics",
        "dc": 19,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "kamino",
    "name": "Kamino",
    "type": "planet",
    "region": "Wild Space",
    "sector": "Abrion sector",
    "system": "Kamino system",
    "biomes": [
      "water",
      "storm",
      "facility",
      "cloning"
    ],
    "tags": [
      "ocean world",
      "cloners",
      "storms",
      "research facilities"
    ],
    "summary": "Storm-lashed ocean world of remote platforms, genetic expertise, and secretive laboratories.",
    "children": [
      {
        "id": "kamino-tipoca-city-platform",
        "name": "Tipoca City Platform",
        "category": "planetary",
        "type": "facility",
        "scale": "site",
        "biomes": [
          "water",
          "storm",
          "facility"
        ],
        "tags": [
          "ocean world",
          "cloners",
          "storms",
          "seed POI"
        ],
        "summary": "Seed location under Kamino; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kamino-clone-archive-wing",
        "name": "Clone Archive Wing",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "storm",
          "facility"
        ],
        "tags": [
          "ocean world",
          "cloners",
          "storms",
          "seed POI"
        ],
        "summary": "Seed location under Kamino; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kamino-storm-landing-pad",
        "name": "Storm Landing Pad",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "storm",
          "facility"
        ],
        "tags": [
          "ocean world",
          "cloners",
          "storms",
          "seed POI"
        ],
        "summary": "Seed location under Kamino; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Archived Growth Logs",
        "teaser": "Old clone development logs may contain names someone wants erased.",
        "body": "Old clone development logs may contain names someone wants erased.",
        "category": "general",
        "skill": "useComputer",
        "dc": 20,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "utapau",
    "name": "Utapau",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Tarabba sector",
    "system": "Utapau system",
    "biomes": [
      "sinkhole",
      "city",
      "wilderness",
      "battlefield"
    ],
    "tags": [
      "sinkhole cities",
      "Pauans",
      "Utai",
      "Clone Wars"
    ],
    "summary": "Wind-carved world of sinkhole cities, exposed cliffs, and vertical settlements.",
    "children": [
      {
        "id": "utapau-pau-city",
        "name": "Pau City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "sinkhole",
          "city",
          "wilderness"
        ],
        "tags": [
          "sinkhole cities",
          "Pauans",
          "Utai",
          "seed POI"
        ],
        "summary": "Seed location under Utapau; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "utapau-sinkhole-hangar",
        "name": "Sinkhole Hangar",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "sinkhole",
          "city",
          "wilderness"
        ],
        "tags": [
          "sinkhole cities",
          "Pauans",
          "Utai",
          "seed POI"
        ],
        "summary": "Seed location under Utapau; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "utapau-wind-cave-route",
        "name": "Wind-Cave Route",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "sinkhole",
          "city",
          "wilderness"
        ],
        "tags": [
          "sinkhole cities",
          "Pauans",
          "Utai",
          "seed POI"
        ],
        "summary": "Seed location under Utapau; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Vertical Smuggling",
        "teaser": "Service lifts and beast pens can hide movement between city levels.",
        "body": "Service lifts and beast pens can hide movement between city levels.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 16,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "jakku",
    "name": "Jakku",
    "type": "planet",
    "region": "Western Reaches",
    "sector": "Jakku system",
    "system": "Jakku system",
    "biomes": [
      "desert",
      "wreckage",
      "scavenger",
      "frontier"
    ],
    "tags": [
      "desert",
      "ship graveyard",
      "scavengers",
      "frontier"
    ],
    "summary": "Remote desert world scattered with starship wreckage, salvage camps, and hidden war debris.",
    "children": [
      {
        "id": "jakku-niima-outpost",
        "name": "Niima Outpost",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "desert",
          "wreckage",
          "scavenger"
        ],
        "tags": [
          "desert",
          "ship graveyard",
          "scavengers",
          "seed POI"
        ],
        "summary": "Seed location under Jakku; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "jakku-starship-graveyard",
        "name": "Starship Graveyard",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "wreckage",
          "scavenger"
        ],
        "tags": [
          "desert",
          "ship graveyard",
          "scavengers",
          "seed POI"
        ],
        "summary": "Seed location under Jakku; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "jakku-buried-destroyer",
        "name": "Buried Destroyer",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "wreckage",
          "scavenger"
        ],
        "tags": [
          "desert",
          "ship graveyard",
          "scavengers",
          "seed POI"
        ],
        "summary": "Seed location under Jakku; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Salvage Claim Dispute",
        "teaser": "A wreck\u2019s transponder could prove ownership of valuable hidden cargo.",
        "body": "A wreck\u2019s transponder could prove ownership of valuable hidden cargo.",
        "category": "general",
        "skill": "mechanics",
        "dc": 15,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "scarif",
    "name": "Scarif",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Abrion sector",
    "system": "Scarif system",
    "biomes": [
      "tropical",
      "water",
      "military",
      "archive"
    ],
    "tags": [
      "tropical",
      "Imperial archives",
      "beaches",
      "shield gate"
    ],
    "summary": "Tropical archive world once tied to high-security Imperial military data operations.",
    "children": [
      {
        "id": "scarif-citadel-tower-ruins",
        "name": "Citadel Tower Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "tropical",
          "water",
          "military"
        ],
        "tags": [
          "tropical",
          "Imperial archives",
          "beaches",
          "seed POI"
        ],
        "summary": "Seed location under Scarif; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "scarif-tropical-landing-beach",
        "name": "Tropical Landing Beach",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "tropical",
          "water",
          "military"
        ],
        "tags": [
          "tropical",
          "Imperial archives",
          "beaches",
          "seed POI"
        ],
        "summary": "Seed location under Scarif; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "scarif-shield-gate-debris-field",
        "name": "Shield Gate Debris Field",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "tropical",
          "water",
          "military"
        ],
        "tags": [
          "tropical",
          "Imperial archives",
          "beaches",
          "seed POI"
        ],
        "summary": "Seed location under Scarif; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Data Vault Remnant",
        "teaser": "A damaged archive node may still hold fragmentary Imperial project data.",
        "body": "A damaged archive node may still hold fragmentary Imperial project data.",
        "category": "general",
        "skill": "useComputer",
        "dc": 22,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "lothal",
    "name": "Lothal",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Lothal sector",
    "system": "Lothal system",
    "biomes": [
      "grassland",
      "city",
      "imperial",
      "force"
    ],
    "tags": [
      "grasslands",
      "Loth-cats",
      "Imperial occupation",
      "Jedi temple"
    ],
    "summary": "Outer Rim world of plains, industrial pressure, rebel cells, and hidden Force sites.",
    "children": [
      {
        "id": "lothal-capital-city",
        "name": "Capital City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "grassland",
          "city",
          "imperial"
        ],
        "tags": [
          "grasslands",
          "Loth-cats",
          "Imperial occupation",
          "seed POI"
        ],
        "summary": "Seed location under Lothal; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "lothal-lothal-plains",
        "name": "Lothal Plains",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "grassland",
          "city",
          "imperial"
        ],
        "tags": [
          "grasslands",
          "Loth-cats",
          "Imperial occupation",
          "seed POI"
        ],
        "summary": "Seed location under Lothal; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "lothal-jedi-temple-approach",
        "name": "Jedi Temple Approach",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "grassland",
          "city",
          "imperial"
        ],
        "tags": [
          "grasslands",
          "Loth-cats",
          "Imperial occupation",
          "seed POI"
        ],
        "summary": "Seed location under Lothal; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Temple Pattern",
        "teaser": "Ancient iconography points toward a hidden path across the plains.",
        "body": "Ancient iconography points toward a hidden path across the plains.",
        "category": "general",
        "skill": "useTheForce",
        "dc": 18,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "mandalore",
    "name": "Mandalore",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Mandalore sector",
    "system": "Mandalore system",
    "biomes": [
      "desert",
      "city",
      "military",
      "clan"
    ],
    "tags": [
      "Mandalorians",
      "domes",
      "clans",
      "war legacy"
    ],
    "summary": "War-scarred Mandalorian world of clan politics, domed cities, and martial history.",
    "children": [
      {
        "id": "mandalore-sundari-dome",
        "name": "Sundari Dome",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "city",
          "military"
        ],
        "tags": [
          "Mandalorians",
          "domes",
          "clans",
          "seed POI"
        ],
        "summary": "Seed location under Mandalore; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mandalore-clan-training-ground",
        "name": "Clan Training Ground",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "city",
          "military"
        ],
        "tags": [
          "Mandalorians",
          "domes",
          "clans",
          "seed POI"
        ],
        "summary": "Seed location under Mandalore; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mandalore-wastes-outpost",
        "name": "Wastes Outpost",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "desert",
          "city",
          "military"
        ],
        "tags": [
          "Mandalorians",
          "domes",
          "clans",
          "seed POI"
        ],
        "summary": "Seed location under Mandalore; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Clan Debt",
        "teaser": "An old clan compact can turn a routine favor into a political obligation.",
        "body": "An old clan compact can turn a routine favor into a political obligation.",
        "category": "general",
        "skill": "knowledgeSocialSciences",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "dathomir",
    "name": "Dathomir",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Quelii sector",
    "system": "Dathomir system",
    "biomes": [
      "forest",
      "swamp",
      "force",
      "wildlife"
    ],
    "tags": [
      "Nightsisters",
      "rancors",
      "dark magic",
      "forests"
    ],
    "summary": "Dangerous world of red forests, rancor territory, witch clans, and ominous Force traditions.",
    "children": [
      {
        "id": "dathomir-nightsister-ruins",
        "name": "Nightsister Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "forest",
          "swamp",
          "force"
        ],
        "tags": [
          "Nightsisters",
          "rancors",
          "dark magic",
          "seed POI"
        ],
        "summary": "Seed location under Dathomir; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dathomir-rancor-trail",
        "name": "Rancor Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "forest",
          "swamp",
          "force"
        ],
        "tags": [
          "Nightsisters",
          "rancors",
          "dark magic",
          "seed POI"
        ],
        "summary": "Seed location under Dathomir; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dathomir-red-forest-clearing",
        "name": "Red Forest Clearing",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "forest",
          "swamp",
          "force"
        ],
        "tags": [
          "Nightsisters",
          "rancors",
          "dark magic",
          "seed POI"
        ],
        "summary": "Seed location under Dathomir; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Spirit Wardings",
        "teaser": "Old ward marks distinguish safe paths from cursed hunting grounds.",
        "body": "Old ward marks distinguish safe paths from cursed hunting grounds.",
        "category": "general",
        "skill": "useTheForce",
        "dc": 20,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "onderon",
    "name": "Onderon",
    "type": "planet",
    "region": "Inner Rim",
    "sector": "Japrael sector",
    "system": "Onderon system",
    "biomes": [
      "jungle",
      "city",
      "beast",
      "politics"
    ],
    "tags": [
      "Iziz",
      "beast riders",
      "politics",
      "jungle"
    ],
    "summary": "Jungle world centered on fortified cities, beast riders, and volatile political history.",
    "children": [
      {
        "id": "onderon-iziz",
        "name": "Iziz",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "city",
          "beast"
        ],
        "tags": [
          "Iziz",
          "beast riders",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Onderon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "onderon-beast-rider-camp",
        "name": "Beast Rider Camp",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "city",
          "beast"
        ],
        "tags": [
          "Iziz",
          "beast riders",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Onderon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "onderon-royal-quarter",
        "name": "Royal Quarter",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "city",
          "beast"
        ],
        "tags": [
          "Iziz",
          "beast riders",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Onderon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Beast Rider Alliance",
        "teaser": "Outsider factions may be courting the beast riders against the capital.",
        "body": "Outsider factions may be courting the beast riders against the capital.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 17,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "dxun",
    "name": "Dxun",
    "type": "moon",
    "region": "Inner Rim",
    "sector": "Japrael sector",
    "system": "Onderon system",
    "biomes": [
      "jungle",
      "wildlife",
      "mandalorian",
      "ruin"
    ],
    "tags": [
      "jungle moon",
      "Mandalorian camp",
      "dangerous wildlife",
      "ruins"
    ],
    "summary": "Predatory jungle moon of Onderon, rich with old camps, ruins, and lethal ecosystems.",
    "children": [
      {
        "id": "dxun-mandalorian-camp",
        "name": "Mandalorian Camp",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "wildlife",
          "mandalorian"
        ],
        "tags": [
          "jungle moon",
          "Mandalorian camp",
          "dangerous wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Dxun; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dxun-beast-ravine",
        "name": "Beast Ravine",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "jungle",
          "wildlife",
          "mandalorian"
        ],
        "tags": [
          "jungle moon",
          "Mandalorian camp",
          "dangerous wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Dxun; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "dxun-ancient-tomb-trail",
        "name": "Ancient Tomb Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "jungle",
          "wildlife",
          "mandalorian"
        ],
        "tags": [
          "jungle moon",
          "Mandalorian camp",
          "dangerous wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Dxun; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Camp Relocation",
        "teaser": "Old Mandalorian markers can reveal hidden supply paths.",
        "body": "Old Mandalorian markers can reveal hidden supply paths.",
        "category": "general",
        "skill": "survival",
        "dc": 18,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "felucia",
    "name": "Felucia",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Thanium sector",
    "system": "Felucia system",
    "biomes": [
      "jungle",
      "fungal",
      "wildlife",
      "hazard"
    ],
    "tags": [
      "fungal jungle",
      "bright flora",
      "wildlife",
      "Clone Wars"
    ],
    "summary": "Vivid fungal jungle world with toxic growth, hidden villages, and dangerous fauna.",
    "children": [
      {
        "id": "felucia-fungal-basin",
        "name": "Fungal Basin",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "fungal",
          "wildlife"
        ],
        "tags": [
          "fungal jungle",
          "bright flora",
          "wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Felucia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "felucia-jungle-village",
        "name": "Jungle Village",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "jungle",
          "fungal",
          "wildlife"
        ],
        "tags": [
          "fungal jungle",
          "bright flora",
          "wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Felucia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "felucia-spore-cave",
        "name": "Spore Cave",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "fungal",
          "wildlife"
        ],
        "tags": [
          "fungal jungle",
          "bright flora",
          "wildlife",
          "seed POI"
        ],
        "summary": "Seed location under Felucia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Spore Bloom Cycle",
        "teaser": "A predictable bloom creates both a hazard and cover for movement.",
        "body": "A predictable bloom creates both a hazard and cover for movement.",
        "category": "general",
        "skill": "knowledgeLifeSciences",
        "dc": 17,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "mygeeto",
    "name": "Mygeeto",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Albarrio sector",
    "system": "Mygeeto system",
    "biomes": [
      "ice",
      "city",
      "banking",
      "battlefield"
    ],
    "tags": [
      "crystal world",
      "cold",
      "banking clan",
      "battlefield"
    ],
    "summary": "Cold crystalline world with bridge-cities, financial interests, and battlefield ruins.",
    "children": [
      {
        "id": "mygeeto-crystal-bridge-city",
        "name": "Crystal Bridge City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "ice",
          "city",
          "banking"
        ],
        "tags": [
          "crystal world",
          "cold",
          "banking clan",
          "seed POI"
        ],
        "summary": "Seed location under Mygeeto; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mygeeto-banking-vault-annex",
        "name": "Banking Vault Annex",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "city",
          "banking"
        ],
        "tags": [
          "crystal world",
          "cold",
          "banking clan",
          "seed POI"
        ],
        "summary": "Seed location under Mygeeto; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mygeeto-frozen-ravine",
        "name": "Frozen Ravine",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "ice",
          "city",
          "banking"
        ],
        "tags": [
          "crystal world",
          "cold",
          "banking clan",
          "seed POI"
        ],
        "summary": "Seed location under Mygeeto; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Vault Schedule",
        "teaser": "Cold-chain security rotations expose a brief access gap.",
        "body": "Cold-chain security rotations expose a brief access gap.",
        "category": "general",
        "skill": "knowledgeBureaucracy",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "cato-neimoidia",
    "name": "Cato Neimoidia",
    "type": "planet",
    "region": "Colonies",
    "sector": "Quellor sector",
    "system": "Cato Neimoidia system",
    "biomes": [
      "city",
      "bridge",
      "commerce",
      "noble"
    ],
    "tags": [
      "bridge cities",
      "Neimoidian",
      "wealth",
      "Trade Federation"
    ],
    "summary": "Wealthy bridge-city world of commerce, suspended architecture, and guarded estates.",
    "children": [
      {
        "id": "cato-neimoidia-bridge-city-estate",
        "name": "Bridge City Estate",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "city",
          "bridge",
          "commerce"
        ],
        "tags": [
          "bridge cities",
          "Neimoidian",
          "wealth",
          "seed POI"
        ],
        "summary": "Seed location under Cato Neimoidia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "cato-neimoidia-trade-vault",
        "name": "Trade Vault",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "bridge",
          "commerce"
        ],
        "tags": [
          "bridge cities",
          "Neimoidian",
          "wealth",
          "seed POI"
        ],
        "summary": "Seed location under Cato Neimoidia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "cato-neimoidia-landing-arcade",
        "name": "Landing Arcade",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "bridge",
          "commerce"
        ],
        "tags": [
          "bridge cities",
          "Neimoidian",
          "wealth",
          "seed POI"
        ],
        "summary": "Seed location under Cato Neimoidia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Accountant\u2019s Route",
        "teaser": "Servant corridors and bonded freight lifts bypass the formal reception levels.",
        "body": "Servant corridors and bonded freight lifts bypass the formal reception levels.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 16,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "christophsis",
    "name": "Christophsis",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Savareen sector",
    "system": "Christophsis system",
    "biomes": [
      "crystal",
      "city",
      "battlefield",
      "commerce"
    ],
    "tags": [
      "crystal cities",
      "Clone Wars",
      "urban battlefield",
      "trade"
    ],
    "summary": "Crystalline city-world with valuable mineral formations and scars from major battles.",
    "children": [
      {
        "id": "christophsis-crystal-city-plaza",
        "name": "Crystal City Plaza",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "crystal",
          "city",
          "battlefield"
        ],
        "tags": [
          "crystal cities",
          "Clone Wars",
          "urban battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Christophsis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "christophsis-abandoned-separatist-cache",
        "name": "Abandoned Separatist Cache",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "crystal",
          "city",
          "battlefield"
        ],
        "tags": [
          "crystal cities",
          "Clone Wars",
          "urban battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Christophsis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "christophsis-shattered-avenue",
        "name": "Shattered Avenue",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "crystal",
          "city",
          "battlefield"
        ],
        "tags": [
          "crystal cities",
          "Clone Wars",
          "urban battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Christophsis; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Crystal Signal Bounce",
        "teaser": "Comms can ricochet through the crystal skyline, masking the true sender.",
        "body": "Comms can ricochet through the crystal skyline, masking the true sender.",
        "category": "general",
        "skill": "useComputer",
        "dc": 17,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "ryloth",
    "name": "Ryloth",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Gaulus sector",
    "system": "Ryloth system",
    "biomes": [
      "desert",
      "canyon",
      "city",
      "resistance"
    ],
    "tags": [
      "Twi'lek",
      "canyons",
      "spice",
      "resistance"
    ],
    "summary": "Twi\u2019lek homeworld of harsh climates, canyon settlements, resistance cells, and exploitation.",
    "children": [
      {
        "id": "ryloth-lessu",
        "name": "Lessu",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "desert",
          "canyon",
          "city"
        ],
        "tags": [
          "Twi'lek",
          "canyons",
          "spice",
          "seed POI"
        ],
        "summary": "Seed location under Ryloth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ryloth-canyon-village",
        "name": "Canyon Village",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "desert",
          "canyon",
          "city"
        ],
        "tags": [
          "Twi'lek",
          "canyons",
          "spice",
          "seed POI"
        ],
        "summary": "Seed location under Ryloth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ryloth-spice-route",
        "name": "Spice Route",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "desert",
          "canyon",
          "city"
        ],
        "tags": [
          "Twi'lek",
          "canyons",
          "spice",
          "seed POI"
        ],
        "summary": "Seed location under Ryloth; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Canyon Safehouses",
        "teaser": "Resistance-era shelters still connect hidden routes through the canyons.",
        "body": "Resistance-era shelters still connect hidden routes through the canyons.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 16,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "mon-cala",
    "name": "Mon Cala",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Calamari sector",
    "system": "Mon Cala system",
    "biomes": [
      "water",
      "city",
      "shipyard",
      "politics"
    ],
    "tags": [
      "ocean world",
      "Mon Calamari",
      "Quarren",
      "shipyards"
    ],
    "summary": "Ocean world of underwater cities, shipbuilding skill, and tense political currents.",
    "children": [
      {
        "id": "mon-cala-dac-city-reef",
        "name": "Dac City Reef",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "water",
          "city",
          "shipyard"
        ],
        "tags": [
          "ocean world",
          "Mon Calamari",
          "Quarren",
          "seed POI"
        ],
        "summary": "Seed location under Mon Cala; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mon-cala-shipyard-enclave",
        "name": "Shipyard Enclave",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "city",
          "shipyard"
        ],
        "tags": [
          "ocean world",
          "Mon Calamari",
          "Quarren",
          "seed POI"
        ],
        "summary": "Seed location under Mon Cala; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "mon-cala-quarren-warrens",
        "name": "Quarren Warrens",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "city",
          "shipyard"
        ],
        "tags": [
          "ocean world",
          "Mon Calamari",
          "Quarren",
          "seed POI"
        ],
        "summary": "Seed location under Mon Cala; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Shipyard Prototype",
        "teaser": "A yard quietly retrofitted a hull under civilian registry.",
        "body": "A yard quietly retrofitted a hull under civilian registry.",
        "category": "general",
        "skill": "knowledgeTechnology",
        "dc": 19,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "kessel",
    "name": "Kessel",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Kessel sector",
    "system": "Kessel system",
    "biomes": [
      "mine",
      "desert",
      "underworld",
      "hazard"
    ],
    "tags": [
      "spice mines",
      "underworld",
      "prison labor",
      "danger"
    ],
    "summary": "Mining world associated with spice, prisons, dangerous routes, and criminal logistics.",
    "children": [
      {
        "id": "kessel-spice-mine-shaft",
        "name": "Spice Mine Shaft",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "mine",
          "desert",
          "underworld"
        ],
        "tags": [
          "spice mines",
          "underworld",
          "prison labor",
          "seed POI"
        ],
        "summary": "Seed location under Kessel; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kessel-processing-yard",
        "name": "Processing Yard",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "mine",
          "desert",
          "underworld"
        ],
        "tags": [
          "spice mines",
          "underworld",
          "prison labor",
          "seed POI"
        ],
        "summary": "Seed location under Kessel; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "kessel-smuggler-cut",
        "name": "Smuggler Cut",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "mine",
          "desert",
          "underworld"
        ],
        "tags": [
          "spice mines",
          "underworld",
          "prison labor",
          "seed POI"
        ],
        "summary": "Seed location under Kessel; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Unlogged Shipment",
        "teaser": "A mine manifest shows one shipment that never reached official inventory.",
        "body": "A mine manifest shows one shipment that never reached official inventory.",
        "category": "general",
        "skill": "useComputer",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "ord-mantell",
    "name": "Ord Mantell",
    "type": "planet",
    "region": "Mid Rim",
    "sector": "Bright Jewel sector",
    "system": "Ord Mantell system",
    "biomes": [
      "urban",
      "junkyard",
      "underworld",
      "battlefield"
    ],
    "tags": [
      "scrapyards",
      "bounty hunters",
      "underworld",
      "war debris"
    ],
    "summary": "Rough Mid Rim world of scrapyards, smugglers, bounty hunters, and scattered war relics.",
    "children": [
      {
        "id": "ord-mantell-worlport",
        "name": "Worlport",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "urban",
          "junkyard",
          "underworld"
        ],
        "tags": [
          "scrapyards",
          "bounty hunters",
          "underworld",
          "seed POI"
        ],
        "summary": "Seed location under Ord Mantell; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ord-mantell-junkyard-sector",
        "name": "Junkyard Sector",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "urban",
          "junkyard",
          "underworld"
        ],
        "tags": [
          "scrapyards",
          "bounty hunters",
          "underworld",
          "seed POI"
        ],
        "summary": "Seed location under Ord Mantell; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ord-mantell-bounty-office",
        "name": "Bounty Office",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "urban",
          "junkyard",
          "underworld"
        ],
        "tags": [
          "scrapyards",
          "bounty hunters",
          "underworld",
          "seed POI"
        ],
        "summary": "Seed location under Ord Mantell; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Scrap Yard Witness",
        "teaser": "A droid memory core may identify who moved stolen cargo.",
        "body": "A droid memory core may identify who moved stolen cargo.",
        "category": "general",
        "skill": "mechanics",
        "dc": 15,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "nar-shaddaa",
    "name": "Nar Shaddaa",
    "type": "moon",
    "region": "Outer Rim",
    "sector": "Hutt Space",
    "system": "Y'Toub system",
    "biomes": [
      "city",
      "underworld",
      "hutt",
      "vertical"
    ],
    "tags": [
      "Smuggler\u2019s Moon",
      "Hutt Space",
      "ecumenopolis",
      "crime"
    ],
    "summary": "The Smuggler\u2019s Moon: dense city layers, syndicates, neon markets, and dangerous favors.",
    "children": [
      {
        "id": "nar-shaddaa-corellian-sector",
        "name": "Corellian Sector",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "city",
          "underworld",
          "hutt"
        ],
        "tags": [
          "Smuggler\u2019s Moon",
          "Hutt Space",
          "ecumenopolis",
          "seed POI"
        ],
        "summary": "Seed location under Nar Shaddaa; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "nar-shaddaa-refugee-landing-pads",
        "name": "Refugee Landing Pads",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "underworld",
          "hutt"
        ],
        "tags": [
          "Smuggler\u2019s Moon",
          "Hutt Space",
          "ecumenopolis",
          "seed POI"
        ],
        "summary": "Seed location under Nar Shaddaa; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "nar-shaddaa-black-market-arcade",
        "name": "Black Market Arcade",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "underworld",
          "hutt"
        ],
        "tags": [
          "Smuggler\u2019s Moon",
          "Hutt Space",
          "ecumenopolis",
          "seed POI"
        ],
        "summary": "Seed location under Nar Shaddaa; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Shell Company Trail",
        "teaser": "A logistics shell hides ownership of warehouses in the lower levels.",
        "body": "A logistics shell hides ownership of warehouses in the lower levels.",
        "category": "general",
        "skill": "knowledgeBureaucracy",
        "dc": 20,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "nal-hutta",
    "name": "Nal Hutta",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Hutt Space",
    "system": "Y'Toub system",
    "biomes": [
      "swamp",
      "hutt",
      "underworld",
      "palace"
    ],
    "tags": [
      "Hutt homeworld",
      "swamp",
      "cartels",
      "palaces"
    ],
    "summary": "Swampy Hutt homeworld where cartel politics, palace intrigue, and underworld law dominate.",
    "children": [
      {
        "id": "nal-hutta-hutt-palace-district",
        "name": "Hutt Palace District",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "swamp",
          "hutt",
          "underworld"
        ],
        "tags": [
          "Hutt homeworld",
          "swamp",
          "cartels",
          "seed POI"
        ],
        "summary": "Seed location under Nal Hutta; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "nal-hutta-swamp-causeway",
        "name": "Swamp Causeway",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "swamp",
          "hutt",
          "underworld"
        ],
        "tags": [
          "Hutt homeworld",
          "swamp",
          "cartels",
          "seed POI"
        ],
        "summary": "Seed location under Nal Hutta; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "nal-hutta-cartel-counting-house",
        "name": "Cartel Counting House",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "swamp",
          "hutt",
          "underworld"
        ],
        "tags": [
          "Hutt homeworld",
          "swamp",
          "cartels",
          "seed POI"
        ],
        "summary": "Seed location under Nal Hutta; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Cartel Favor Ledger",
        "teaser": "A favor recorded in an old ledger can open doors or start a feud.",
        "body": "A favor recorded in an old ledger can open doors or start a feud.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 19,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "taris",
    "name": "Taris",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Taris system",
    "system": "Taris system",
    "biomes": [
      "city",
      "ruin",
      "undercity",
      "plague"
    ],
    "tags": [
      "ecumenopolis ruins",
      "undercity",
      "rakghouls",
      "reconstruction"
    ],
    "summary": "Layered city-world with ruined underlevels, old wars, scavengers, and dangerous outbreaks.",
    "children": [
      {
        "id": "taris-upper-city-ruins",
        "name": "Upper City Ruins",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "city",
          "ruin",
          "undercity"
        ],
        "tags": [
          "ecumenopolis ruins",
          "undercity",
          "rakghouls",
          "seed POI"
        ],
        "summary": "Seed location under Taris; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "taris-undercity-gate",
        "name": "Undercity Gate",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "city",
          "ruin",
          "undercity"
        ],
        "tags": [
          "ecumenopolis ruins",
          "undercity",
          "rakghouls",
          "seed POI"
        ],
        "summary": "Seed location under Taris; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "taris-collapsed-transit-hub",
        "name": "Collapsed Transit Hub",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "ruin",
          "undercity"
        ],
        "tags": [
          "ecumenopolis ruins",
          "undercity",
          "rakghouls",
          "seed POI"
        ],
        "summary": "Seed location under Taris; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Undercity Map",
        "teaser": "A damaged civil defense map marks access tunnels under the modern sector.",
        "body": "A damaged civil defense map marks access tunnels under the modern sector.",
        "category": "general",
        "skill": "useComputer",
        "dc": 17,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "telos-iv",
    "name": "Telos IV",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Kwymar sector",
    "system": "Telos system",
    "biomes": [
      "restoration",
      "city",
      "polar",
      "wilderness"
    ],
    "tags": [
      "restoration zone",
      "Citadel Station",
      "polar academy",
      "war scars"
    ],
    "summary": "World of restoration projects, orbiting infrastructure, and scars from older conflicts.",
    "children": [
      {
        "id": "telos-iv-citadel-station",
        "name": "Citadel Station",
        "category": "planetary",
        "type": "space-station",
        "scale": "site",
        "biomes": [
          "restoration",
          "city",
          "polar"
        ],
        "tags": [
          "restoration zone",
          "Citadel Station",
          "polar academy",
          "seed POI"
        ],
        "summary": "Seed location under Telos IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "telos-iv-restoration-zone",
        "name": "Restoration Zone",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "restoration",
          "city",
          "polar"
        ],
        "tags": [
          "restoration zone",
          "Citadel Station",
          "polar academy",
          "seed POI"
        ],
        "summary": "Seed location under Telos IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "telos-iv-polar-academy-ruins",
        "name": "Polar Academy Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "restoration",
          "city",
          "polar"
        ],
        "tags": [
          "restoration zone",
          "Citadel Station",
          "polar academy",
          "seed POI"
        ],
        "summary": "Seed location under Telos IV; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Restoration Bypass",
        "teaser": "Environmental control stations can hide unauthorized ecological changes.",
        "body": "Environmental control stations can hide unauthorized ecological changes.",
        "category": "general",
        "skill": "knowledgePhysicalSciences",
        "dc": 18,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "peragus-ii",
    "name": "Peragus II",
    "type": "asteroid",
    "region": "Outer Rim",
    "sector": "Peragus sector",
    "system": "Peragus system",
    "biomes": [
      "space",
      "mine",
      "asteroid",
      "hazard"
    ],
    "tags": [
      "asteroid mining",
      "fuel depot",
      "droids",
      "isolation"
    ],
    "summary": "Asteroid mining facility location suited for isolated survival, sabotage, and fuel-route mysteries.",
    "children": [
      {
        "id": "peragus-ii-mining-administration",
        "name": "Mining Administration",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "space",
          "mine",
          "asteroid"
        ],
        "tags": [
          "asteroid mining",
          "fuel depot",
          "droids",
          "seed POI"
        ],
        "summary": "Seed location under Peragus II; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "peragus-ii-fuel-depot-ring",
        "name": "Fuel Depot Ring",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "space",
          "mine",
          "asteroid"
        ],
        "tags": [
          "asteroid mining",
          "fuel depot",
          "droids",
          "seed POI"
        ],
        "summary": "Seed location under Peragus II; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "peragus-ii-maintenance-tunnel",
        "name": "Maintenance Tunnel",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "space",
          "mine",
          "asteroid"
        ],
        "tags": [
          "asteroid mining",
          "fuel depot",
          "droids",
          "seed POI"
        ],
        "summary": "Seed location under Peragus II; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "space",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Droid Log Fragment",
        "teaser": "A maintenance droid\u2019s route log records movement after the station should have been sealed.",
        "body": "A maintenance droid\u2019s route log records movement after the station should have been sealed.",
        "category": "general",
        "skill": "useComputer",
        "dc": 16,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "ilum",
    "name": "Ilum",
    "type": "planet",
    "region": "Unknown Regions",
    "sector": "Ilum system",
    "system": "Ilum system",
    "biomes": [
      "ice",
      "crystal",
      "jedi",
      "sacred"
    ],
    "tags": [
      "kyber crystals",
      "Jedi tradition",
      "ice caves",
      "sacred"
    ],
    "summary": "Frigid crystal world tied to Jedi traditions, hidden caves, and kyber mysteries.",
    "children": [
      {
        "id": "ilum-crystal-cave",
        "name": "Crystal Cave",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "crystal",
          "jedi"
        ],
        "tags": [
          "kyber crystals",
          "Jedi tradition",
          "ice caves",
          "seed POI"
        ],
        "summary": "Seed location under Ilum; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ilum-frozen-pilgrim-path",
        "name": "Frozen Pilgrim Path",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "crystal",
          "jedi"
        ],
        "tags": [
          "kyber crystals",
          "Jedi tradition",
          "ice caves",
          "seed POI"
        ],
        "summary": "Seed location under Ilum; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ilum-ancient-shrine",
        "name": "Ancient Shrine",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ice",
          "crystal",
          "jedi"
        ],
        "tags": [
          "kyber crystals",
          "Jedi tradition",
          "ice caves",
          "seed POI"
        ],
        "summary": "Seed location under Ilum; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Crystal Song",
        "teaser": "Some caves resonate only when approached with calm intent.",
        "body": "Some caves resonate only when approached with calm intent.",
        "category": "general",
        "skill": "useTheForce",
        "dc": 18,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "ahch-to",
    "name": "Ahch-To",
    "type": "planet",
    "region": "Unknown Regions",
    "sector": "Ahch-To system",
    "system": "Ahch-To system",
    "biomes": [
      "water",
      "island",
      "jedi",
      "remote"
    ],
    "tags": [
      "ocean world",
      "islands",
      "Jedi origins",
      "isolation"
    ],
    "summary": "Remote oceanic world of island sanctuaries, old Jedi traces, and difficult approaches.",
    "children": [
      {
        "id": "ahch-to-temple-island",
        "name": "Temple Island",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "island",
          "jedi"
        ],
        "tags": [
          "ocean world",
          "islands",
          "Jedi origins",
          "seed POI"
        ],
        "summary": "Seed location under Ahch-To; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ahch-to-sea-cave",
        "name": "Sea Cave",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "water",
          "island",
          "jedi"
        ],
        "tags": [
          "ocean world",
          "islands",
          "Jedi origins",
          "seed POI"
        ],
        "summary": "Seed location under Ahch-To; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ahch-to-caretaker-village",
        "name": "Caretaker Village",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "water",
          "island",
          "jedi"
        ],
        "tags": [
          "ocean world",
          "islands",
          "Jedi origins",
          "seed POI"
        ],
        "summary": "Seed location under Ahch-To; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "First Temple Markers",
        "teaser": "Weathered markers align with a hidden route through the island cliffs.",
        "body": "Weathered markers align with a hidden route through the island cliffs.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 20,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "exegol",
    "name": "Exegol",
    "type": "planet",
    "region": "Unknown Regions",
    "sector": "Sith Citadel sector",
    "system": "Exegol system",
    "biomes": [
      "sith",
      "storm",
      "wasteland",
      "hidden"
    ],
    "tags": [
      "Sith world",
      "storms",
      "hidden fleet",
      "dark side"
    ],
    "summary": "Hidden Sith world of storms, ritual architecture, and dangerous secret approaches.",
    "children": [
      {
        "id": "exegol-sith-citadel",
        "name": "Sith Citadel",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "sith",
          "storm",
          "wasteland"
        ],
        "tags": [
          "Sith world",
          "storms",
          "hidden fleet",
          "seed POI"
        ],
        "summary": "Seed location under Exegol; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "exegol-storm-wastes",
        "name": "Storm Wastes",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "sith",
          "storm",
          "wasteland"
        ],
        "tags": [
          "Sith world",
          "storms",
          "hidden fleet",
          "seed POI"
        ],
        "summary": "Seed location under Exegol; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "exegol-hidden-docking-chasm",
        "name": "Hidden Docking Chasm",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "sith",
          "storm",
          "wasteland"
        ],
        "tags": [
          "Sith world",
          "storms",
          "hidden fleet",
          "seed POI"
        ],
        "summary": "Seed location under Exegol; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Navigation Scar",
        "teaser": "Approach vectors leave a signature only specialized charts can decode.",
        "body": "Approach vectors leave a signature only specialized charts can decode.",
        "category": "general",
        "skill": "useComputer",
        "dc": 23,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "jedha",
    "name": "Jedha",
    "type": "moon",
    "region": "Mid Rim",
    "sector": "Jedha system",
    "system": "Jedha system",
    "biomes": [
      "desert",
      "holy",
      "city",
      "ruin"
    ],
    "tags": [
      "holy city",
      "kyber",
      "pilgrims",
      "Imperial occupation"
    ],
    "summary": "Sacred desert moon of pilgrims, kyber history, ruined holy sites, and occupation scars.",
    "children": [
      {
        "id": "jedha-holy-city-ruins",
        "name": "Holy City Ruins",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "desert",
          "holy",
          "city"
        ],
        "tags": [
          "holy city",
          "kyber",
          "pilgrims",
          "seed POI"
        ],
        "summary": "Seed location under Jedha; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "jedha-pilgrim-causeway",
        "name": "Pilgrim Causeway",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "holy",
          "city"
        ],
        "tags": [
          "holy city",
          "kyber",
          "pilgrims",
          "seed POI"
        ],
        "summary": "Seed location under Jedha; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "jedha-kyber-vault",
        "name": "Kyber Vault",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "desert",
          "holy",
          "city"
        ],
        "tags": [
          "holy city",
          "kyber",
          "pilgrims",
          "seed POI"
        ],
        "summary": "Seed location under Jedha; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Pilgrim Cipher",
        "teaser": "A pilgrim chant hides directions to a sealed reliquary.",
        "body": "A pilgrim chant hides directions to a sealed reliquary.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 18,
        "output": "reveal-location"
      }
    ]
  },
  {
    "id": "eadu",
    "name": "Eadu",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Eadu system",
    "system": "Eadu system",
    "biomes": [
      "rain",
      "facility",
      "research",
      "hazard"
    ],
    "tags": [
      "rain world",
      "research facility",
      "Imperial science",
      "storms"
    ],
    "summary": "Bleak storm world ideal for hidden research bases, covert projects, and difficult insertions.",
    "children": [
      {
        "id": "eadu-research-platform",
        "name": "Research Platform",
        "category": "planetary",
        "type": "facility",
        "scale": "site",
        "biomes": [
          "rain",
          "facility",
          "research"
        ],
        "tags": [
          "rain world",
          "research facility",
          "Imperial science",
          "seed POI"
        ],
        "summary": "Seed location under Eadu; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "eadu-rain-slick-landing-field",
        "name": "Rain-Slick Landing Field",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "rain",
          "facility",
          "research"
        ],
        "tags": [
          "rain world",
          "research facility",
          "Imperial science",
          "seed POI"
        ],
        "summary": "Seed location under Eadu; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "eadu-power-relay-ridge",
        "name": "Power Relay Ridge",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "rain",
          "facility",
          "research"
        ],
        "tags": [
          "rain world",
          "research facility",
          "Imperial science",
          "seed POI"
        ],
        "summary": "Seed location under Eadu; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Project Power Draw",
        "teaser": "Energy usage suggests a hidden lab wing is active below the main facility.",
        "body": "Energy usage suggests a hidden lab wing is active below the main facility.",
        "category": "general",
        "skill": "knowledgeTechnology",
        "dc": 18,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "sullust",
    "name": "Sullust",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Sullust sector",
    "system": "Sullust system",
    "biomes": [
      "lava",
      "cave",
      "industrial",
      "commerce"
    ],
    "tags": [
      "volcanic",
      "Sullustan",
      "underground cities",
      "industry"
    ],
    "summary": "Volcanic world with underground settlements, industrial corridors, and strong trade links.",
    "children": [
      {
        "id": "sullust-underground-city",
        "name": "Underground City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "lava",
          "cave",
          "industrial"
        ],
        "tags": [
          "volcanic",
          "Sullustan",
          "underground cities",
          "seed POI"
        ],
        "summary": "Seed location under Sullust; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "sullust-lava-tube-transit",
        "name": "Lava Tube Transit",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "lava",
          "cave",
          "industrial"
        ],
        "tags": [
          "volcanic",
          "Sullustan",
          "underground cities",
          "seed POI"
        ],
        "summary": "Seed location under Sullust; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "sullust-industrial-port",
        "name": "Industrial Port",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "lava",
          "cave",
          "industrial"
        ],
        "tags": [
          "volcanic",
          "Sullustan",
          "underground cities",
          "seed POI"
        ],
        "summary": "Seed location under Sullust; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Cave Transit Strike",
        "teaser": "A labor dispute in the tunnels could mask a syndicate move.",
        "body": "A labor dispute in the tunnels could mask a syndicate move.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 16,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "rodia",
    "name": "Rodia",
    "type": "planet",
    "region": "Tyrius system",
    "sector": "Tyrius system",
    "system": "Tyrius system",
    "biomes": [
      "jungle",
      "swamp",
      "hunter",
      "city"
    ],
    "tags": [
      "Rodians",
      "jungle",
      "hunters",
      "clans"
    ],
    "summary": "Jungle homeworld of Rodian clans, hunters, dangerous wetlands, and competitive city politics.",
    "children": [
      {
        "id": "rodia-equator-city",
        "name": "Equator City",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "jungle",
          "swamp",
          "hunter"
        ],
        "tags": [
          "Rodians",
          "jungle",
          "hunters",
          "seed POI"
        ],
        "summary": "Seed location under Rodia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "rodia-clan-hunting-grounds",
        "name": "Clan Hunting Grounds",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "jungle",
          "swamp",
          "hunter"
        ],
        "tags": [
          "Rodians",
          "jungle",
          "hunters",
          "seed POI"
        ],
        "summary": "Seed location under Rodia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "rodia-marsh-trail",
        "name": "Marsh Trail",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "jungle",
          "swamp",
          "hunter"
        ],
        "tags": [
          "Rodians",
          "jungle",
          "hunters",
          "seed POI"
        ],
        "summary": "Seed location under Rodia; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Hunter Code",
        "teaser": "A local hunting custom can identify whether a bounty is legitimate or bait.",
        "body": "A local hunting custom can identify whether a bounty is legitimate or bait.",
        "category": "general",
        "skill": "knowledgeSocialSciences",
        "dc": 15,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "bothawui",
    "name": "Bothawui",
    "type": "planet",
    "region": "Mid Rim",
    "sector": "Bothan Space",
    "system": "Both system",
    "biomes": [
      "city",
      "espionage",
      "commerce",
      "politics"
    ],
    "tags": [
      "Bothans",
      "spynet",
      "politics",
      "trade"
    ],
    "summary": "Bothan world of political maneuvering, information brokering, commerce, and layered loyalties.",
    "children": [
      {
        "id": "bothawui-drev-starn",
        "name": "Drev'starn",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "city",
          "espionage",
          "commerce"
        ],
        "tags": [
          "Bothans",
          "spynet",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Bothawui; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "bothawui-spynet-dead-drop",
        "name": "Spynet Dead Drop",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "espionage",
          "commerce"
        ],
        "tags": [
          "Bothans",
          "spynet",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Bothawui; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "bothawui-trade-forum",
        "name": "Trade Forum",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "espionage",
          "commerce"
        ],
        "tags": [
          "Bothans",
          "spynet",
          "politics",
          "seed POI"
        ],
        "summary": "Seed location under Bothawui; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Dead Drop Rotation",
        "teaser": "A public art schedule doubles as an intelligence exchange timetable.",
        "body": "A public art schedule doubles as an intelligence exchange timetable.",
        "category": "general",
        "skill": "gatherInformation",
        "dc": 20,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "zeltros",
    "name": "Zeltros",
    "type": "planet",
    "region": "Inner Rim",
    "sector": "Zel system",
    "system": "Zel system",
    "biomes": [
      "city",
      "pleasure",
      "diplomacy",
      "commerce"
    ],
    "tags": [
      "Zeltrons",
      "resorts",
      "diplomacy",
      "nightlife"
    ],
    "summary": "Pleasure world of bright urban centers, festivals, negotiation, and social complexity.",
    "children": [
      {
        "id": "zeltros-zeltros-resort-district",
        "name": "Zeltros Resort District",
        "category": "planetary",
        "type": "region",
        "scale": "local",
        "biomes": [
          "city",
          "pleasure",
          "diplomacy"
        ],
        "tags": [
          "Zeltrons",
          "resorts",
          "diplomacy",
          "seed POI"
        ],
        "summary": "Seed location under Zeltros; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "zeltros-festival-promenade",
        "name": "Festival Promenade",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "pleasure",
          "diplomacy"
        ],
        "tags": [
          "Zeltrons",
          "resorts",
          "diplomacy",
          "seed POI"
        ],
        "summary": "Seed location under Zeltros; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "zeltros-private-negotiation-suite",
        "name": "Private Negotiation Suite",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "city",
          "pleasure",
          "diplomacy"
        ],
        "tags": [
          "Zeltrons",
          "resorts",
          "diplomacy",
          "seed POI"
        ],
        "summary": "Seed location under Zeltros; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Guest Registry Leak",
        "teaser": "A resort guest list connects a diplomat to an underworld intermediary.",
        "body": "A resort guest list connects a diplomat to an underworld intermediary.",
        "category": "general",
        "skill": "useComputer",
        "dc": 17,
        "output": "job-draft"
      }
    ]
  },
  {
    "id": "ossus",
    "name": "Ossus",
    "type": "planet",
    "region": "Outer Rim",
    "sector": "Auril sector",
    "system": "Adeptas system",
    "biomes": [
      "ruin",
      "jedi",
      "forest",
      "desert"
    ],
    "tags": [
      "Jedi ruins",
      "archives",
      "ancient battlefield",
      "Force lore"
    ],
    "summary": "Ancient Jedi world of ruined archives, surviving enclaves, and buried knowledge.",
    "children": [
      {
        "id": "ossus-great-jedi-library-ruins",
        "name": "Great Jedi Library Ruins",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ruin",
          "jedi",
          "forest"
        ],
        "tags": [
          "Jedi ruins",
          "archives",
          "ancient battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Ossus; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ossus-archive-vault",
        "name": "Archive Vault",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ruin",
          "jedi",
          "forest"
        ],
        "tags": [
          "Jedi ruins",
          "archives",
          "ancient battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Ossus; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "ossus-dry-river-camp",
        "name": "Dry River Camp",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "ruin",
          "jedi",
          "forest"
        ],
        "tags": [
          "Jedi ruins",
          "archives",
          "ancient battlefield",
          "seed POI"
        ],
        "summary": "Seed location under Ossus; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Archive Index",
        "teaser": "A fragmentary catalog can identify which archive wing survived.",
        "body": "A fragmentary catalog can identify which archive wing survived.",
        "category": "general",
        "skill": "knowledgeGalacticLore",
        "dc": 21,
        "output": "intel-draft"
      }
    ]
  },
  {
    "id": "lehon",
    "name": "Lehon",
    "type": "planet",
    "region": "Unknown Regions",
    "sector": "Rakata system",
    "system": "Lehon system",
    "biomes": [
      "tropical",
      "ancient",
      "rakata",
      "ruin"
    ],
    "tags": [
      "Rakata Prime",
      "ancient ruins",
      "tropical islands",
      "Legends"
    ],
    "summary": "Remote tropical ruin world associated with ancient technology and lost Rakatan history.",
    "children": [
      {
        "id": "lehon-temple-of-the-ancients",
        "name": "Temple of the Ancients",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "tropical",
          "ancient",
          "rakata"
        ],
        "tags": [
          "Rakata Prime",
          "ancient ruins",
          "tropical islands",
          "seed POI"
        ],
        "summary": "Seed location under Lehon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "lehon-rakata-settlement",
        "name": "Rakata Settlement",
        "category": "planetary",
        "type": "city",
        "scale": "local",
        "biomes": [
          "tropical",
          "ancient",
          "rakata"
        ],
        "tags": [
          "Rakata Prime",
          "ancient ruins",
          "tropical islands",
          "seed POI"
        ],
        "summary": "Seed location under Lehon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      },
      {
        "id": "lehon-tropical-wreck-shore",
        "name": "Tropical Wreck Shore",
        "category": "planetary",
        "type": "poi",
        "scale": "site",
        "biomes": [
          "tropical",
          "ancient",
          "rakata"
        ],
        "tags": [
          "Rakata Prime",
          "ancient ruins",
          "tropical islands",
          "seed POI"
        ],
        "summary": "Seed location under Lehon; customize factions, NPCs, jobs, maps, and encounter seeds for your campaign."
      }
    ],
    "category": "planetary",
    "scale": "planetary",
    "revealState": "hidden",
    "knownToPlayers": false,
    "atlasFacts": [
      {
        "title": "Infinite Empire Device",
        "teaser": "Ancient mechanisms may still respond to star-map harmonics.",
        "body": "Ancient mechanisms may still respond to star-map harmonics.",
        "category": "general",
        "skill": "knowledgeTechnology",
        "dc": 23,
        "output": "intel-draft"
      }
    ]
  }
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeImportOptions(options = {}) {
  return {
    includeChildren: options.includeChildren !== false,
    includeAtlasFacts: options.includeAtlasFacts !== false,
    revealState: text(options.revealState || 'hidden'),
    knownToPlayers: options.knownToPlayers === true,
    importedAt: text(options.importedAt || new Date().toISOString())
  };
}

export function getLocationLibrarySeed(seedId = '') {
  const id = text(seedId).toLowerCase();
  return LOCATION_LIBRARY_SEEDS.find(seed => seed.id === id || seed.name.toLowerCase() === id) || null;
}

export function filterLocationLibrarySeeds({ search = '', biome = '', category = '' } = {}) {
  const q = text(search).toLowerCase();
  const terms = q.split(/[,;|\s]+/g).map(term => term.trim()).filter(Boolean);
  const b = text(biome).toLowerCase();
  const c = text(category).toLowerCase();
  return LOCATION_LIBRARY_SEEDS.filter((seed) => {
    if (b && !asArray(seed.biomes).includes(b)) return false;
    if (c && seed.category !== c) return false;
    if (!terms.length) return true;
    const haystack = [seed.name, seed.region, seed.sector, seed.system, seed.summary, ...asArray(seed.tags), ...asArray(seed.biomes)].join(' ').toLowerCase();
    return terms.some(term => haystack.includes(term));
  });
}

function seedFactToAtlasFact(fact = {}, seed = {}) {
  return {
    id: `${seed.id}-${String(fact.title || 'fact').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
    title: fact.title || 'Seed Atlas Fact',
    teaser: fact.teaser || 'There is something more to learn here.',
    body: fact.body || fact.teaser || '',
    category: fact.category || 'general',
    revealState: 'hidden',
    knownToPlayers: false,
    checks: [{ skill: fact.skill || 'knowledgeGalacticLore', dc: Number(fact.dc || 15) || 15 }],
    onReveal: {
      output: fact.output || 'none',
      createIntel: fact.output === 'intel-draft',
      createJob: fact.output === 'job-draft',
      jobTitle: fact.output === 'job-draft' ? `Follow up: ${fact.title || seed.name}` : '',
      jobObjective: fact.teaser || '',
      intelTitle: fact.output === 'intel-draft' ? `${seed.name}: ${fact.title || 'Local Intel'}` : ''
    },
    tags: [...asArray(seed.tags), ...asArray(seed.biomes)].slice(0, 8)
  };
}

function seedToLocationRecord(seed = {}, options = {}) {
  const opts = normalizeImportOptions(options);
  return {
    id: seed.id,
    name: seed.name,
    category: seed.category || 'planetary',
    type: seed.type || 'planet',
    scale: seed.scale || 'planetary',
    parentLocationId: seed.parentLocationId || '',
    region: seed.region || '',
    sector: seed.sector || '',
    system: seed.system || '',
    coordinates: seed.coordinates || '',
    image: seed.image || '',
    tags: [...asArray(seed.tags), ...asArray(seed.biomes), 'library-seed'],
    librarySeedId: seed.id,
    libraryBiomes: asArray(seed.biomes),
    revealState: opts.revealState,
    knownToPlayers: opts.knownToPlayers,
    publicSummary: seed.summary || '',
    gmNotes: `Imported from the built-in Location Library. Customize POIs, factions, encounter seeds, maps, jobs, and Atlas facts before revealing to players.`,
    hazards: seed.hazards || '',
    rumors: seed.rumors || '',
    commerceNotes: seed.commerceNotes || '',
    travelNotes: seed.travelNotes || '',
    atlasFacts: opts.includeAtlasFacts ? asArray(seed.atlasFacts).map(fact => seedFactToAtlasFact(fact, seed)) : [],
    history: [{ id: `library-${seed.id}`, at: opts.importedAt, type: 'library-seed-imported', note: `Imported ${seed.name} from Location Library.` }]
  };
}

function childToLocationRecord(child = {}, parentSeed = {}, options = {}) {
  const opts = normalizeImportOptions(options);
  return {
    id: child.id,
    name: child.name,
    category: child.category || parentSeed.category || 'planetary',
    type: child.type || 'poi',
    scale: child.scale || 'site',
    parentLocationId: parentSeed.id,
    region: parentSeed.region || '',
    sector: parentSeed.sector || '',
    system: parentSeed.system || '',
    tags: [...asArray(child.tags), ...asArray(child.biomes), 'library-seed', 'seed-child'],
    librarySeedId: parentSeed.id,
    libraryBiomes: asArray(child.biomes).length ? asArray(child.biomes) : asArray(parentSeed.biomes),
    revealState: opts.revealState,
    knownToPlayers: opts.knownToPlayers,
    publicSummary: child.summary || `Seed child location under ${parentSeed.name}.`,
    gmNotes: `Imported as a starter child Location under ${parentSeed.name}.`,
    atlasFacts: [],
    history: [{ id: `library-${child.id}`, at: opts.importedAt, type: 'library-seed-child-imported', note: `Imported ${child.name} under ${parentSeed.name}.` }]
  };
}

export function buildLocationLibraryRecords(seedId = '', options = {}) {
  const seed = getLocationLibrarySeed(seedId);
  if (!seed) return [];
  const records = [seedToLocationRecord(clone(seed), options)];
  const opts = normalizeImportOptions(options);
  if (opts.includeChildren) {
    for (const child of asArray(seed.children)) records.push(childToLocationRecord(clone(child), seed, options));
  }
  return records;
}
