/**
 * PHASE 8D-1 addendum — planet-scale demographic profiles for the
 * built-in Location Library seeds (scripts/locations/location-library-seeds.js).
 *
 * Sourced from Wookieepedia census/percentage data where a usable
 * sapient-species breakdown exists; where none exists, the project
 * fallback template (Human 70% + six contextually-selected supported
 * Species compendium IDs at 5% each) is used instead and flagged via
 * fallbackUsed:true. Policy applied uniformly before this data was
 * written (see each entry's own notes for specifics):
 *   - A named source species NOT in the project Species compendium is
 *     recorded in sourceDemographics (supported:false) for GM-facing
 *     transparency, but excluded from generatorWeightsBySpeciesId and
 *     folded into species-human.
 *   - An unresolved aggregate Other/Various share is folded into
 *     species-human the same way.
 *   - "other" never appears as a rollable key in generatorWeightsBySpeciesId
 *     on any entry — every entry's weights sum to exactly 100.
 *
 * generatorWeightsBySpeciesId is GENERATOR WEIGHTING, not an assertion
 * that any specific numeric split is canon — several entries are
 * explicitly flagged fallbackUsed/eraSensitive/approximationUsed where
 * that distinction matters. sourceDemographics preserves what the
 * source actually said (including unsupported-species labels) so nothing
 * is silently lost.
 *
 * Keyed by the exact Location Library seed id (LOCATION_LIBRARY_SEEDS[].id
 * in location-library-seeds.js) — confirmed all 50 keys here match a real
 * top-level seed id before this file was written.
 */

export const LOCATION_POPULATION_PROFILES_BY_SEED_ID = Object.freeze({
  "ahch-to": {
    "name": "Ahch-To",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-mirialan",
        "weight": 5
      },
      {
        "speciesId": "species-togruta",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Ahch-To",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable sapient-species percentage breakdown was found. The native Lanai are not used in generator weights because they are not in the project Species compendium.",
      "The 70/5x6 mix is the project procedural fallback, not a canon census."
    ]
  },
  "alderaan": {
    "name": "Alderaan",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Alderaan/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 95,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 5,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Source census: 95% Human, 5% other. Aggregate other is excluded from random generation and folded into Human by project policy."
    ]
  },
  "bespin": {
    "name": "Bespin",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Bespin/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 68,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Ugnaught",
        "percent": 8,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Lutrillian",
        "percent": 6,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Other",
        "percent": 18,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Ugnaught and Lutrillian are not present in the current Species compendium; their shares and aggregate other are folded into Human for generator use."
    ]
  },
  "bothawui": {
    "name": "Bothawui",
    "speciesWeights": [
      {
        "speciesId": "species-bothan",
        "weight": 98
      },
      {
        "speciesId": "species-human",
        "weight": 2
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Bothawui/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Bothan",
        "percent": 98,
        "supported": true,
        "speciesId": "species-bothan"
      },
      {
        "label": "Human",
        "percent": 1,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "cato-neimoidia": {
    "name": "Cato Neimoidia",
    "speciesWeights": [
      {
        "speciesId": "species-neimoidian",
        "weight": 99.9
      },
      {
        "speciesId": "species-human",
        "weight": 0.1
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Cato Neimoidia/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Neimoidian",
        "percent": 99.9,
        "supported": true,
        "speciesId": "species-neimoidian"
      },
      {
        "label": "Unspecified remainder",
        "percent": 0.1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia lists 99.9% Neimoidian; the 0.1% remainder is treated as other and folded into Human for generator use."
    ]
  },
  "christophsis": {
    "name": "Christophsis",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 76
      },
      {
        "speciesId": "species-rodian",
        "weight": 13
      },
      {
        "speciesId": "species-kerkoiden",
        "weight": 11
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Christophsis/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 68,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Rodian",
        "percent": 13,
        "supported": true,
        "speciesId": "species-rodian"
      },
      {
        "label": "Kerkoiden",
        "percent": 11,
        "supported": true,
        "speciesId": "species-kerkoiden"
      },
      {
        "label": "Other",
        "percent": 8,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "corellia": {
    "name": "Corellia",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 80
      },
      {
        "speciesId": "species-drall",
        "weight": 20
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Corellia/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 60,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Selonian",
        "percent": 20,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Drall",
        "percent": 20,
        "supported": true,
        "speciesId": "species-drall"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Selonian is not present in the current Species compendium, so its 20% source share is folded into Human for generator use."
    ]
  },
  "coruscant": {
    "name": "Coruscant",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Coruscant/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 68,
        "supported": true,
        "speciesId": "species-human",
        "approximate": true
      },
      {
        "label": "Other",
        "percent": 32,
        "supported": false,
        "generatorDisposition": "fold-to-human",
        "approximate": true
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Legends Wookieepedia reports a 68-78% Human range and 22-32% other. This table uses the 68/32 endpoint for a deterministic source split; all aggregate other is folded into Human by project policy."
    ],
    "sourcePercentRange": {
      "species-human": [
        68,
        78
      ],
      "other": [
        22,
        32
      ]
    }
  },
  "dagobah": {
    "name": "Dagobah",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-ithorian",
        "weight": 5
      },
      {
        "speciesId": "species-wookiee",
        "weight": 5
      },
      {
        "speciesId": "species-trandoshan",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Dagobah/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable sapient-species percentage census was found. The mix is the project procedural fallback, not a lore census."
    ],
    "sourcePopulationStatus": "No stable population percentage by sapient species."
  },
  "dantooine": {
    "name": "Dantooine",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Dantooine/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 35,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Dantari",
        "percent": 18,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Other",
        "percent": 47,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the Galactic Civil War-era 334,000 population split. Dantari is not present in the current Species compendium; Dantari and aggregate other therefore fold into Human."
    ]
  },
  "dathomir": {
    "name": "Dathomir",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Dathomir/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 97,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 3,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "dxun": {
    "name": "Dxun",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-taung",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-trandoshan",
        "weight": 5
      },
      {
        "speciesId": "species-wookiee",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Dxun/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable sapient-species percentage census was found. Taung is included as a contextual historic/Mandalorian slot; the full 70/5x6 mix is procedural."
    ]
  },
  "eadu": {
    "name": "Eadu",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-mirialan",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Eadu",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable sapient-species percentage census was found. Context slots emphasize an offworld Imperial/research workforce; the mix is procedural."
    ]
  },
  "endor": {
    "name": "Endor",
    "speciesWeights": [
      {
        "speciesId": "species-ewok",
        "weight": 95
      },
      {
        "speciesId": "species-human",
        "weight": 5
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Endor/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Ewok",
        "percent": 95,
        "supported": true,
        "speciesId": "species-ewok"
      },
      {
        "label": "Yuzzum",
        "percent": 4,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Yuzzum is not present in the current Species compendium; its 4% share plus 1% other fold into Human."
    ]
  },
  "exegol": {
    "name": "Exegol",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-sith-pureblood",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-miraluka",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-mirialan",
        "weight": 5
      },
      {
        "speciesId": "species-near-human",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Exegol",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable sapient-species percentage census was found. Sith-oriented slots are contextual procedural choices, not a source census."
    ]
  },
  "felucia": {
    "name": "Felucia",
    "speciesWeights": [
      {
        "speciesId": "species-felucian",
        "weight": 75
      },
      {
        "speciesId": "species-human",
        "weight": 25
      }
    ],
    "sourceKind": "wookieepedia-partial-percentage",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Jungle Felucian/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Felucian",
        "percent": 75,
        "supported": true,
        "speciesId": "species-felucian"
      },
      {
        "label": "Unspecified remainder",
        "percent": 25,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia states that Felucians comprised 75% of Felucia total population during the cited post-Great-Jedi-Purge context. The remaining 25% is not broken down and is treated as other, then folded into Human for generation."
    ]
  },
  "geonosis": {
    "name": "Geonosis",
    "speciesWeights": [
      {
        "speciesId": "species-geonosian",
        "weight": 99
      },
      {
        "speciesId": "species-human",
        "weight": 1
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Geonosis/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Geonosian",
        "percent": 99,
        "supported": true,
        "speciesId": "species-geonosian"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "hoth": {
    "name": "Hoth",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-wookiee",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Hoth/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia gives percentages for Hoth fauna rather than a usable sapient NPC census. The 70/5x6 mix is therefore the project procedural fallback."
    ],
    "sourcePopulationStatus": "Very sparse/temporary sapient presence; source percentages are fauna, not NPC species."
  },
  "ilum": {
    "name": "Ilum",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-miraluka",
        "weight": 5
      },
      {
        "speciesId": "species-mirialan",
        "weight": 5
      },
      {
        "speciesId": "species-togruta",
        "weight": 5
      },
      {
        "speciesId": "species-cerean",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-ithorian",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Ilum/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia gives Imperial-era resident-role percentages, not species percentages. The Jedi-oriented 70/5x6 mix is procedural."
    ],
    "sourcePopulationStatus": "5,200 Imperial-era nonpermanent residents; no species percentage split."
  },
  "jakku": {
    "name": "Jakku",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-hutt",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Jakku",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia lists multiple inhabitants and an unknown population below 25,000, but no species percentages. The mix is procedural."
    ]
  },
  "jedha": {
    "name": "Jedha",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Jedha",
    "sourceEdition": "Canon",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 85,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 15,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "kamino": {
    "name": "Kamino",
    "speciesWeights": [
      {
        "speciesId": "species-kaminoan",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Kamino/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Kaminoan",
        "percent": 100,
        "supported": true,
        "speciesId": "species-kaminoan"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "kashyyyk": {
    "name": "Kashyyyk",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-wookiee",
        "weight": 5
      },
      {
        "speciesId": "species-trandoshan",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Kashyyyk/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia identifies Kashyyyk as the Wookiee homeworld but does not give a usable species percentage census. Per project instruction, the fixed 70/5x6 fallback is used despite that qualitative context; this is intentionally procedural rather than lore-accurate."
    ]
  },
  "kessel": {
    "name": "Kessel",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Kessel/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 22,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 78,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "The source split applies to the prisoner population; aggregate other is folded into Human for generator use."
    ]
  },
  "korriban": {
    "name": "Korriban",
    "speciesWeights": [
      {
        "speciesId": "species-sith-pureblood",
        "weight": 94
      },
      {
        "speciesId": "species-human",
        "weight": 6
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Korriban/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Sith",
        "percent": 94,
        "supported": true,
        "speciesId": "species-sith-pureblood",
        "approximate": true
      },
      {
        "label": "Other",
        "percent": 6,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Historic Sith Empire census. Wookieepedia states under 94% Sith; 94% is used as the deterministic procedural approximation. Source Sith is mapped to the project Sith (Pureblood) species entry."
    ],
    "historicalContext": "Sith Empire",
    "approximationUsed": true
  },
  "lehon": {
    "name": "Lehon",
    "speciesWeights": [
      {
        "speciesId": "species-rakata",
        "weight": 90
      },
      {
        "speciesId": "species-human",
        "weight": 10
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Lehon/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Rakata",
        "percent": 90,
        "supported": true,
        "speciesId": "species-rakata"
      },
      {
        "label": "Other slave species",
        "percent": 10,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the historic Infinite Empire population because modern Wookieepedia population is none and the location seed is explicitly Rakata/ancient in character."
    ],
    "historicalContext": "Infinite Empire"
  },
  "lothal": {
    "name": "Lothal",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-bardottan",
        "weight": 5
      },
      {
        "speciesId": "species-feeorin",
        "weight": 5
      },
      {
        "speciesId": "species-houk",
        "weight": 5
      },
      {
        "speciesId": "species-ithorian",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Lothal",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia lists a diverse population but no species percentages. Several listed supported species are used in the 5% contextual slots; the 70% Human share is the project fallback, not a canon census."
    ]
  },
  "malachor-v": {
    "name": "Malachor V",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-sith-pureblood",
        "weight": 5
      },
      {
        "speciesId": "species-taung",
        "weight": 5
      },
      {
        "speciesId": "species-miraluka",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Malachor V/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No usable modern sapient-species percentage census was found. The mix is a procedural ancient/Sith/Mandalorian contextual fallback."
    ]
  },
  "manaan": {
    "name": "Manaan",
    "speciesWeights": [
      {
        "speciesId": "species-selkath",
        "weight": 80
      },
      {
        "speciesId": "species-human",
        "weight": 20
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Manaan/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Selkath",
        "percent": 80,
        "supported": true,
        "speciesId": "species-selkath"
      },
      {
        "label": "Human",
        "percent": 18,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 2,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the 1.8 million population split rather than the Jedi Civil War 99.6% Selkath historic split."
    ]
  },
  "mandalore": {
    "name": "Mandalore",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Mandalore/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 81,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 19,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Mandalorian is a culture, not a Species ID. The source aggregate other share is folded into Human by project policy."
    ]
  },
  "mon-cala": {
    "name": "Mon Cala",
    "speciesWeights": [
      {
        "speciesId": "species-quarren",
        "weight": 60
      },
      {
        "speciesId": "species-mon-calamari",
        "weight": 39
      },
      {
        "speciesId": "species-human",
        "weight": 1
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Dac/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Quarren",
        "percent": 60,
        "supported": true,
        "speciesId": "species-quarren"
      },
      {
        "label": "Mon Calamari",
        "percent": 39,
        "supported": true,
        "speciesId": "species-mon-calamari"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the pre-Genocide-on-Dac 27 billion population split."
    ]
  },
  "mustafar": {
    "name": "Mustafar",
    "speciesWeights": [
      {
        "speciesId": "species-mustafarian",
        "weight": 95
      },
      {
        "speciesId": "species-skakoan",
        "weight": 3
      },
      {
        "speciesId": "species-human",
        "weight": 2
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Mustafar/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Mustafarian",
        "percent": 95,
        "supported": true,
        "speciesId": "species-mustafarian"
      },
      {
        "label": "Skakoan",
        "percent": 3,
        "supported": true,
        "speciesId": "species-skakoan"
      },
      {
        "label": "Other",
        "percent": 2,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "mygeeto": {
    "name": "Mygeeto",
    "speciesWeights": [
      {
        "speciesId": "species-muun",
        "weight": 96
      },
      {
        "speciesId": "species-human",
        "weight": 4
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Mygeeto/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Muun",
        "percent": 96,
        "supported": true,
        "speciesId": "species-muun"
      },
      {
        "label": "Other",
        "percent": 4,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the historic 19 million population split."
    ]
  },
  "naboo": {
    "name": "Naboo",
    "speciesWeights": [
      {
        "speciesId": "species-gungan",
        "weight": 72
      },
      {
        "speciesId": "species-human",
        "weight": 28
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Naboo/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Gungan",
        "percent": 72,
        "supported": true,
        "speciesId": "species-gungan"
      },
      {
        "label": "Human",
        "percent": 27,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "nal-hutta": {
    "name": "Nal Hutta",
    "speciesWeights": [
      {
        "speciesId": "species-hutt",
        "weight": 42.5742574257
      },
      {
        "speciesId": "species-human",
        "weight": 57.4257425743
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Nal Hutta/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Hutt",
        "percent": 43,
        "supported": true,
        "speciesId": "species-hutt"
      },
      {
        "label": "Human",
        "percent": 29,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Vippit",
        "percent": 15,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Various others",
        "percent": 14,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia source percentages total 101% due source rounding. Vippit is not in the Species compendium and various others is aggregate; after folding both into Human, 43 Hutt / 58 Human is proportionally normalized to exactly 100%."
    ],
    "sourcePercentTotal": 101,
    "generatorNormalizationApplied": true
  },
  "nar-shaddaa": {
    "name": "Nar Shaddaa",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Nar Shaddaa/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Various",
        "percent": 79,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      },
      {
        "label": "Human",
        "percent": 20,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "The source does not resolve the 79% various share into individual species, so both aggregate categories are excluded and folded into Human by project policy."
    ]
  },
  "onderon": {
    "name": "Onderon",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Onderon/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 92,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 8,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "ord-mantell": {
    "name": "Ord Mantell",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-mantellian-savrip",
        "weight": 5
      },
      {
        "speciesId": "species-bothan",
        "weight": 5
      },
      {
        "speciesId": "species-ithorian",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Ord Mantell/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "No numeric species-by-species census was found. Wookieepedia describes a highly diverse population; canon additionally states that no single species represents more than 5%. The project-mandated 70/5x6 fallback therefore deliberately does not model that qualitative distribution and should be treated as procedural only."
    ]
  },
  "ossus": {
    "name": "Ossus",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Ossus/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 85,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 15,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses Wookieepedia modern 250 million population split. Other eras on the same page have materially different demographics."
    ],
    "eraSensitive": true
  },
  "peragus-ii": {
    "name": "Peragus II",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-verpine",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Peragus II",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia lists the planet itself as having no population; the existing SWSE quick-location seed represents the mining-facility context. The 70/5x6 values are therefore procedural personnel-generation weights, not planetary census data."
    ],
    "sourcePopulationStatus": "None on the planet; temporary/historic miners at the mining facility."
  },
  "rodia": {
    "name": "Rodia",
    "speciesWeights": [
      {
        "speciesId": "species-rodian",
        "weight": 99.99230828397816
      },
      {
        "speciesId": "species-human",
        "weight": 0.007691716021844474
      }
    ],
    "sourceKind": "wookieepedia-count-derived",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Rodia/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Rodian",
        "percent": 99.99230828397816,
        "supported": true,
        "speciesId": "species-rodian"
      },
      {
        "label": "Other",
        "percent": 0.007691716021844474,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the historic 3 ABY figures of 1.3 billion Rodians and 100,000 others, avoiding the later Yuuzhan Vong-era 91/9 split. Percentages are derived from those counts."
    ],
    "sourceCounts": {
      "Rodian": 1300000000,
      "Other": 100000
    },
    "historicalContext": "3 ABY"
  },
  "ryloth": {
    "name": "Ryloth",
    "speciesWeights": [
      {
        "speciesId": "species-twi-lek",
        "weight": 76
      },
      {
        "speciesId": "species-human",
        "weight": 24
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Ryloth/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Twi'lek",
        "percent": 76,
        "supported": true,
        "speciesId": "species-twi-lek"
      },
      {
        "label": "Other",
        "percent": 24,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "scarif": {
    "name": "Scarif",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      },
      {
        "speciesId": "species-mirialan",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Scarif",
    "sourceEdition": "Canon",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia gives a population of 475,000 and lists Humans, but does not provide a species percentage breakdown. Per project instruction, the 70/5x6 fallback is used rather than inferring 100% Human."
    ]
  },
  "sullust": {
    "name": "Sullust",
    "speciesWeights": [
      {
        "speciesId": "species-sullustan",
        "weight": 96
      },
      {
        "speciesId": "species-human",
        "weight": 3
      },
      {
        "speciesId": "species-bith",
        "weight": 1
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Sullust/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Sullustan",
        "percent": 96,
        "supported": true,
        "speciesId": "species-sullustan"
      },
      {
        "label": "Human",
        "percent": 2,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Bith",
        "percent": 1,
        "supported": true,
        "speciesId": "species-bith"
      },
      {
        "label": "Other",
        "percent": 1,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "taris": {
    "name": "Taris",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Taris/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 30,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 70,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Uses the 3956 BBY 6 billion population split. The 70% aggregate other share is not individually resolvable and is folded into Human by project policy."
    ],
    "historicalContext": "3956 BBY",
    "eraSensitive": true
  },
  "tatooine": {
    "name": "Tatooine",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 90
      },
      {
        "speciesId": "species-tusken-raider",
        "weight": 5
      },
      {
        "speciesId": "species-jawa",
        "weight": 5
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Tatooine/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 70,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Tusken Raider",
        "percent": 5,
        "supported": true,
        "speciesId": "species-tusken-raider"
      },
      {
        "label": "Jawa",
        "percent": 5,
        "supported": true,
        "speciesId": "species-jawa"
      },
      {
        "label": "Other",
        "percent": 20,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "telos-iv": {
    "name": "Telos IV",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 70
      },
      {
        "speciesId": "species-ithorian",
        "weight": 5
      },
      {
        "speciesId": "species-twi-lek",
        "weight": 5
      },
      {
        "speciesId": "species-duros",
        "weight": 5
      },
      {
        "speciesId": "species-rodian",
        "weight": 5
      },
      {
        "speciesId": "species-sullustan",
        "weight": 5
      },
      {
        "speciesId": "species-zabrak",
        "weight": 5
      }
    ],
    "sourceKind": "fallback-no-usable-species-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Telos IV",
    "sourceEdition": "Legends",
    "sourceDemographics": [],
    "fallbackUsed": true,
    "fallbackTemplate": "human-70-six-contextual-supported-species-at-5-each",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia describes the pre-war populace as primarily Human and the Restoration-era population as diverse, but provides no species percentages. The 70/5x6 mix is procedural."
    ]
  },
  "utapau": {
    "name": "Utapau",
    "speciesWeights": [
      {
        "speciesId": "species-pau-an",
        "weight": 30
      },
      {
        "speciesId": "species-utai",
        "weight": 70
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Utapau/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Pau'an",
        "percent": 30,
        "supported": true,
        "speciesId": "species-pau-an"
      },
      {
        "label": "Utai",
        "percent": 70,
        "supported": true,
        "speciesId": "species-utai"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  },
  "yavin-iv": {
    "name": "Yavin IV",
    "speciesWeights": [
      {
        "speciesId": "species-human",
        "weight": 100
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Yavin 4/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Human",
        "percent": 95,
        "supported": true,
        "speciesId": "species-human"
      },
      {
        "label": "Other",
        "percent": 5,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": [
      "Wookieepedia notes the population varies from zero to roughly 1,000; the listed populated-state species split is 95% Human / 5% other."
    ]
  },
  "zeltros": {
    "name": "Zeltros",
    "speciesWeights": [
      {
        "speciesId": "species-zeltron",
        "weight": 91
      },
      {
        "speciesId": "species-human",
        "weight": 9
      }
    ],
    "sourceKind": "wookieepedia-census",
    "sourceSite": "Wookieepedia",
    "sourcePage": "Zeltros/Legends",
    "sourceEdition": "Legends",
    "sourceDemographics": [
      {
        "label": "Zeltron",
        "percent": 91,
        "supported": true,
        "speciesId": "species-zeltron"
      },
      {
        "label": "Other",
        "percent": 9,
        "supported": false,
        "generatorDisposition": "fold-to-human"
      }
    ],
    "fallbackUsed": false,
    "fallbackTemplate": "",
    "otherExcludedFromGeneration": true,
    "notes": []
  }
});
