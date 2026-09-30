# Phase 3E-3 — Publication-to-production reconciliation

Read-only. Generator: `node tools/reconcile-talent-publication-corpus.mjs` · data: `data/audits/talent-phase-3e-publication-reconciliation.json`.

**Invariant:** every certified published claim maps to exactly one canonical production record, and every canonical production record is explained by exactly one certified identity.

Denominator: 1182 certified claims + 7 3E addendum claims = 1189 claims → 1187 identities ↔ 1187 canonical production records. 50 homebrew talents are outside the denominator; 19 same-name cross-tree groups are resolved by tree identity, never by name.

| Finding | Count | Blocking |
|---|---|---|
| CLAIM_WITHOUT_RECORD | 0 | yes |
| RECORD_WITHOUT_CLAIM | 0 | yes |
| DUPLICATE_MAPPING | 0 | yes |
| DUPLICATE_RECORD_IN_TREE | 0 | yes |
| WRONG_TREE | 0 | yes |
| NAME_MISMATCH | 0 | yes |
| UNRESOLVED_SAME_NAME_AMBIGUITY | 0 | yes |
| CLAIM_COUNT_MISMATCH | 0 | yes |
| HOMEBREW_IN_DENOMINATOR | 0 | yes |
| WRONG_SOURCE_PAGE | 0 | no (metadata: source/page repair unit or Phase 3F) |
| STALE_TREE_ID_SLUG | 71 | no (metadata: source/page repair unit or Phase 3F) |
| TREE_DISPLAY_NAME_DRIFT | 72 | no (metadata: source/page repair unit or Phase 3F) |

Source/page agreement: 1187 of 1187 identities carry a production source/page that matches a certified publication.

No blocking findings.

## Source/page metadata findings

- Saga Edition Core Rulebook|Armor Specialist|Armor Mastery: system.treeId "armor-specialist" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Channel Aggression: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Channel Anger: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Crippling Strike: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Embrace the Dark Side: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Dark Side Talisman: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Dark Side Devotee|Greater Dark Side Talisman: system.treeId "dark-side-devotee" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Acrobatic Recovery: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Battle Meditation: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Elusive Target: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Force Intuition: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Resilience: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Exposing Strike: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Guardian Strike: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Forceful Warrior: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Mobile Combatant: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Defensive Acuity: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Improved Battle Meditation: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Cover Escape: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Close Maneuvering: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Immovable: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Grenade Defense: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Guardian|Hold the Line: system.treeId "jedi-guardian" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Sentinel|Prime Targets: system.treeId "jedi-sentinel" is the slug of the correct tree
- Saga Edition Core Rulebook|Jedi Sentinel|Sense Primal Force: system.treeId "jedi-sentinel" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Block: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Deflect: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Lightsaber Defense: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Lightsaber Throw: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Redirect Shot: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Weapon Specialization (Lightsabers): system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Cortosis Gauntlet Block: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Precision: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Riposte: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Precise Redirect: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Combat|Shoto Focus: system.treeId "lightsaber-combat" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Ataru: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Djem So: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Jar'Kai: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Juyo: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Makashi: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Niman: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Shien: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Shii-Cho: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Sokan: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Soresu: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Trakata: system.treeId "lightsaber-forms" is the slug of the correct tree
- Saga Edition Core Rulebook|Lightsaber Forms|Vaapad: system.treeId "lightsaber-forms" is the slug of the correct tree
- Force Unleashed Campaign Guide|Bothan SpyNet|Bothan Resources: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Force Unleashed Campaign Guide|Bothan SpyNet|Knowledge Is Life: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Force Unleashed Campaign Guide|Bothan SpyNet|Knowledge Is Power: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Force Unleashed Campaign Guide|Bothan SpyNet|Knowledge Is Strength: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Force Unleashed Campaign Guide|Bothan SpyNet|Six Questions: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Force Unleashed Campaign Guide|Bothan SpyNet|Spynet Agent: tree d20682671d035cef is named "Bothan Spynet", canonical "Bothan SpyNet"
- Jedi Academy Training Manual|Beastwarden|Charm Beast: system.treeId "beastwarden" is the slug of the correct tree
- Jedi Academy Training Manual|Beastwarden|Bonded Mount: system.treeId "beastwarden" is the slug of the correct tree
- Jedi Academy Training Manual|Beastwarden|Entreat Beast: system.treeId "beastwarden" is the slug of the correct tree
- Jedi Academy Training Manual|Beastwarden|Soothing Presence: system.treeId "beastwarden" is the slug of the correct tree
- Jedi Academy Training Manual|Beastwarden|Wild Sense: system.treeId "beastwarden" is the slug of the correct tree
- Galaxy of Intrigue|Master of Intrigue|Advanced Planning: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Galaxy of Intrigue|Master of Intrigue|Blend In: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Galaxy of Intrigue|Master of Intrigue|Done It All: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Galaxy of Intrigue|Master of Intrigue|Get into Position: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Galaxy of Intrigue|Master of Intrigue|Master Manipulator: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Galaxy of Intrigue|Master of Intrigue|Retaliation: tree 0ffc37dac946477d is named "Master Of Intrigue", canonical "Master of Intrigue"
- Force Unleashed Campaign Guide|First-Degree Droid|Dull the Pain: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Interrogator: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Medical Droid: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Known Vulnerability: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Medical Analyzer: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Science Analyzer: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|First-Degree Droid|Triage Scan: tree a212850887fe41da is named "1stdegree Droid", canonical "First-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Adept Assistant: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Mechanics Mastery: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Vehicle Mechanic: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Burst Transfer: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|On-Board System Link: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Quick Astrogation: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Second-Degree Droid|Scomp Link Slicer: tree ad499981ddb8450e is named "2nddegree Droid", canonical "Second-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Etiquette: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Helpful: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Protocol: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Nuanced: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Observant: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Supervising Droid: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Third-Degree Droid|Talkdroid: tree af077700c1b8433f is named "3rddegree Droid", canonical "Third-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Combat Repairs: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Droid Smash: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Targeting Package: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Just a Scratch: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Target Acquisition: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Target Lock: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fourth-Degree Droid|Weapons Power Surge: tree 73814706c00849c6 is named "4thdegree Droid", canonical "Fourth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Cargo Hauler: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Environmentally Shielded: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Power Supply: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Durable: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Heavy-Duty Actuators: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Load Launcher: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Fifth-Degree Droid|Task Optimization: tree c4e48efaad1f49af is named "5thdegree Droid", canonical "Fifth-Degree Droid"
- Force Unleashed Campaign Guide|Agent of Ossus|Buried Presence: tree 754907ded50d4f46 is named "Agent Of Ossus", canonical "Agent of Ossus"
- Force Unleashed Campaign Guide|Agent of Ossus|Conceal Other: tree 754907ded50d4f46 is named "Agent Of Ossus", canonical "Agent of Ossus"
- Force Unleashed Campaign Guide|Agent of Ossus|Insightful Aim: tree 754907ded50d4f46 is named "Agent Of Ossus", canonical "Agent of Ossus"
- Force Unleashed Campaign Guide|Agent of Ossus|Vanish: tree 754907ded50d4f46 is named "Agent Of Ossus", canonical "Agent of Ossus"
- Jedi Academy Training Manual|Aing-Tii Monk|Aura of Freedom: tree f8e7edab5f234e27 is named "Aingtii Monk", canonical "Aing-Tii Monk"
- Jedi Academy Training Manual|Aing-Tii Monk|Folded Space Mastery: tree f8e7edab5f234e27 is named "Aingtii Monk", canonical "Aing-Tii Monk"
- Jedi Academy Training Manual|Aing-Tii Monk|Liberate: tree f8e7edab5f234e27 is named "Aingtii Monk", canonical "Aing-Tii Monk"
- Jedi Academy Training Manual|Aing-Tii Monk|Many Shades of the Force: tree f8e7edab5f234e27 is named "Aingtii Monk", canonical "Aing-Tii Monk"
- Jedi Academy Training Manual|Aing-Tii Monk|Spatial Integrity: tree f8e7edab5f234e27 is named "Aingtii Monk", canonical "Aing-Tii Monk"
- Clone Wars Campaign Guide|Bando Gora Captain|Bando Gora Surge: system.treeId "bando-gora-captain" is the slug of the correct tree
- Clone Wars Campaign Guide|Bando Gora Captain|Force Fighter: system.treeId "bando-gora-captain" is the slug of the correct tree
- Clone Wars Campaign Guide|Bando Gora Captain|Resist Enervation: system.treeId "bando-gora-captain" is the slug of the correct tree
- Clone Wars Campaign Guide|Bando Gora Captain|Victorious Force Mastery: system.treeId "bando-gora-captain" is the slug of the correct tree
- Clone Wars Campaign Guide|Believer Disciple|Believer Intuition: system.treeId "believer-disciple" is the slug of the correct tree
- Clone Wars Campaign Guide|Believer Disciple|Defense Boost: system.treeId "believer-disciple" is the slug of the correct tree
- Clone Wars Campaign Guide|Believer Disciple|Hardiness: system.treeId "believer-disciple" is the slug of the correct tree
- Clone Wars Campaign Guide|Believer Disciple|High Impact: system.treeId "believer-disciple" is the slug of the correct tree
- Clone Wars Campaign Guide|Believer Disciple|Sith Reverence: system.treeId "believer-disciple" is the slug of the correct tree
- Legacy Era Campaign Guide|Disciple of Twilight|Cloak of Shadow: tree 4da769d7c5f44232 is named "Disciple Of Twilight", canonical "Disciple of Twilight"
- Legacy Era Campaign Guide|Disciple of Twilight|Phantasm: tree 4da769d7c5f44232 is named "Disciple Of Twilight", canonical "Disciple of Twilight"
- Legacy Era Campaign Guide|Disciple of Twilight|Revelation: tree 4da769d7c5f44232 is named "Disciple Of Twilight", canonical "Disciple of Twilight"
- Legacy Era Campaign Guide|Disciple of Twilight|Shadow Armor: tree 4da769d7c5f44232 is named "Disciple Of Twilight", canonical "Disciple of Twilight"
- Legacy Era Campaign Guide|Disciple of Twilight|Shadow Vision: tree 4da769d7c5f44232 is named "Disciple Of Twilight", canonical "Disciple of Twilight"
- Legacy Era Campaign Guide|Ember of Vahl|Initiate of Vahl: tree c6eee4889411411b is named "Ember Of Vahl", canonical "Ember of Vahl"
- Legacy Era Campaign Guide|Ember of Vahl|Reading the Flame: tree c6eee4889411411b is named "Ember Of Vahl", canonical "Ember of Vahl"
- Legacy Era Campaign Guide|Ember of Vahl|Sword of Vahl: tree c6eee4889411411b is named "Ember Of Vahl", canonical "Ember of Vahl"
- Legacy Era Campaign Guide|Ember of Vahl|Vahl's Brand: tree c6eee4889411411b is named "Ember Of Vahl", canonical "Ember of Vahl"
- Legacy Era Campaign Guide|Ember of Vahl|Vahl's Flame: tree c6eee4889411411b is named "Ember Of Vahl", canonical "Ember of Vahl"
- Jedi Academy Training Manual|Iron Knight|Droid Duelist: system.treeId "iron-knight" is the slug of the correct tree
- Jedi Academy Training Manual|Iron Knight|Force Repair: system.treeId "iron-knight" is the slug of the correct tree
- Jedi Academy Training Manual|Iron Knight|Heal Droid: system.treeId "iron-knight" is the slug of the correct tree
- Jedi Academy Training Manual|Iron Knight|Mask Presence: system.treeId "iron-knight" is the slug of the correct tree
- Jedi Academy Training Manual|Iron Knight|Silicon Mind: system.treeId "iron-knight" is the slug of the correct tree
- Knights of the Old Republic Campaign Guide|Order of Shasa|Deception Awareness: system.treeId "order-of-shasa" is the slug of the correct tree
- Knights of the Old Republic Campaign Guide|Order of Shasa|Greater Weapon Focus (Fira): system.treeId "order-of-shasa" is the slug of the correct tree
- Knights of the Old Republic Campaign Guide|Order of Shasa|Progenitor's Call: system.treeId "order-of-shasa" is the slug of the correct tree
- Knights of the Old Republic Campaign Guide|Order of Shasa|Waveform: system.treeId "order-of-shasa" is the slug of the correct tree
- Jedi Academy Training Manual|Warden of the Sky|Brutal Unarmed Strike: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"
- Jedi Academy Training Manual|Warden of the Sky|Martial Resurgence: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"
- Jedi Academy Training Manual|Warden of the Sky|Rebound Leap: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"
- Jedi Academy Training Manual|Warden of the Sky|Simultaneous Strike: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"
- Jedi Academy Training Manual|Warden of the Sky|Telekinetic Strike: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"
- Jedi Academy Training Manual|Warden of the Sky|Telekinetic Throw: tree 899038f739294c81 is named "Warden Of The Sky", canonical "Warden of the Sky"

