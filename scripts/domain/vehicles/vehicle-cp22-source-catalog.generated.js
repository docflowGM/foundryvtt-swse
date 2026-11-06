/**
 * GENERATED ONLY. CP22 read-only SotG source reference compiled from the
 * immutable CP16 ledger and owner-approved CP21 adjudications.
 *
 * Rebuild: node tools/audits/vehicles/compile_sotg_cp22_reference.mjs --write
 * Verify:  node tools/audits/vehicles/compile_sotg_cp22_reference.mjs --check
 *
 * This is a published BOOK REFERENCE, not authenticated Foundry world-Actor
 * installation provenance. It must never enter the trusted stock registry.
 */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
export const CP22_SOTG_REFERENCE_CATALOG = deepFreeze({
  "schema": "swse.vehicle.sotg.cp22.readonly-source-catalog.v1",
  "sourcePdfSha256": "e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0",
  "cp21ManifestSha": "98eb063d8f05c602806c708024f5108596abfd2e",
  "cp16LedgerSha": "d08ca75b0b30e8b44896588edf3c5ce1cd335557",
  "decisionCount": 15,
  "records": [
    {
      "sourceEntryKey": "sotg-advanced-v-19-torrent-starfighter",
      "cp16Index": 3,
      "printedName": "Advanced V-19 Torrent Starfighter",
      "printedPage": 59,
      "originalPrintedFacts": {
        "type": "Gargantuan starfighter",
        "cl": 12,
        "initiative": 12,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 23,
          "flatFootedReflex": 12,
          "fortitude": 27,
          "armorBonus": 7,
          "damageReduction": 10,
          "shieldRating": 30
        },
        "durability": {
          "hitPoints": 125,
          "threshold": 47
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 4
          },
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "maxVelocityKmH": 1150
        },
        "fightingSpace": {
          "characterScaleSquares": "4x4",
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 34,
          "ranged": "laser cannons +9 OR medium concussion missiles +9",
          "attackOptions": [
            "autofire (laser cannons)",
            "fire-link (medium concussion missiles)"
          ]
        },
        "abilities": {
          "str": 45,
          "dex": 33,
          "con": "—",
          "int": 20
        },
        "skills": {
          "initiative": 8,
          "mechanics": 6,
          "perception": 6,
          "pilot": 12,
          "useComputer": 6
        },
        "crew": {
          "count": 1,
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 70,
          "unit": "kg"
        },
        "consumables": "1 week",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "x1 or x1 with booster ring",
          "navcomputer": "limited, 2-jump memory"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale"
        },
        "payload": {
          "count": 6,
          "type": "medium concussion missiles"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "pilot",
          "attackBonus": 9,
          "damage": "6d10x2",
          "sourcePage": 59,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 4
        },
        {
          "weaponLabel": "medium concussion missiles",
          "station": "pilot",
          "attackBonus": 9,
          "damage": "9d10x2",
          "sourcePage": 59,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "payloadCount": 6,
          "splash": "4-square",
          "fireLinkOption": true
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "SOURCE_CONFLICT",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 1,
        "decisionId": "SOTG-CP21-D01",
        "sourceEntryKey": "sotg-advanced-v-19-torrent-starfighter",
        "cp16Index": 3,
        "printedName": "Advanced V-19 Torrent Starfighter",
        "printedStartPage": 59,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use header Initiative +12 for the stock advanced V-19; leave sample Dex 33 printed, but apply +8 Dex when generating from the base V-19.",
        "confidence": "VERY_HIGH",
        "cp19Disposition": "DUAL_PRINTED_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/initiative/header",
            "printedPage": 59,
            "observed": "Init +12"
          },
          {
            "location": "/skills/initiative",
            "printedPage": 59,
            "observed": "Initiative +8"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "SOURCE_CONFLICT",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/skills/initiative",
            "newValue": 12,
            "reason": "Template +8 Dexterity changes the modifier by +4; stock +8 -> +12.",
            "originalValue": 8
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "ADVANCED_TEMPLATE_GENERATOR",
            "detail": {
              "baseV19Dex": 24,
              "templateDexBonusForGargantuan": 8,
              "derivedDex": 32,
              "printedExampleDex": 33,
              "derivedInitiative": 12
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_PRINTED_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-recusant-class-light-destroyer",
      "cp16Index": 17,
      "printedName": "Recusant-class Light Destroyer",
      "printedPage": 72,
      "originalPrintedFacts": {
        "type": "Colossal (cruiser) capital ship",
        "cl": 19,
        "initiative": -2,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 14,
          "flatFootedReflex": 12,
          "fortitude": 50,
          "armorBonus": 12,
          "damageReduction": 20,
          "shieldRating": 150,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 1290,
          "threshold": 250
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 3
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "2x2",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 62,
          "ranged": "heavy turbolasers +6* AND 2 heavy turbolaser batteries +14* AND 3 point-defense double laser cannon batteries +14 AND 5 point-defense light laser cannon batteries +16 AND 2 point-defense double light laser cannon batteries +14"
        },
        "abilities": {
          "str": 91,
          "dex": 14,
          "con": "—",
          "int": 18
        },
        "skills": {
          "initiative": -2,
          "mechanics": 6,
          "perception": 6,
          "pilot": -2,
          "useComputer": 6
        },
        "crew": {
          "count": 300,
          "quality": "skilled"
        },
        "passengers": {
          "count": 40000,
          "type": "battle droids"
        },
        "cargo": {
          "number": 10000,
          "unit": "tons"
        },
        "consumables": "2 years",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "x2",
          "backup": "x12",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "heavy turbolasers",
          "station": "gunner",
          "attackBonus": 6,
          "damage": "10d10x5",
          "sourcePage": 72,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "vsSmallerThanColossal": -14
        },
        {
          "weaponLabel": "heavy turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 14,
          "damage": "7d10x5",
          "sourcePage": 72,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 2,
          "vsSmallerThanColossal": -6
        },
        {
          "weaponLabel": "point-defense double laser cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 14,
          "damage": "5d10x2",
          "sourcePage": 72,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 3
        },
        {
          "weaponLabel": "point-defense light laser cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 14,
          "damage": "3d10x2",
          "sourcePage": 72,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5,
          "printedRangedLineAttackBonus": 16,
          "printedWeaponRowAttackBonus": 14
        },
        {
          "weaponLabel": "point-defense double light laser cannon battery",
          "station": "battery (4 gunners)",
          "attackBonus": 12,
          "damage": "5d10x2",
          "sourcePage": 72,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 2,
          "printedRangedLineAttackBonus": 14,
          "printedWeaponRowAttackBonus": 12
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "SOURCE_CONFLICT",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 2,
        "decisionId": "SOTG-CP21-D02",
        "sourceEntryKey": "sotg-recusant-class-light-destroyer",
        "cp16Index": 17,
        "printedName": "Recusant-class Light Destroyer",
        "printedStartPage": 72,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use detailed point-defense battery attacks +14 and +12, not Ranged summary +16 and +14.",
        "confidence": "HIGH",
        "cp19Disposition": "DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/ranged/pointDefenseLightLaserBattery",
            "printedPage": 72,
            "observed": "5 point-defense light laser cannon batteries +16"
          },
          {
            "location": "/weaponTable/pointDefenseLightLaserBattery",
            "printedPage": 72,
            "observed": "Atk +14"
          },
          {
            "location": "/ranged/pointDefenseDoubleLightLaserBattery",
            "printedPage": 72,
            "observed": "2 point-defense double light laser cannon batteries +14"
          },
          {
            "location": "/weaponTable/pointDefenseDoubleLightLaserBattery",
            "printedPage": 72,
            "observed": "Atk +12"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "SOURCE_CONFLICT",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "DETAILED_WEAPON_ROW_AUTHORITY",
            "detail": {
              "groupIndices": [
                3,
                4
              ],
              "attackBonuses": [
                14,
                12
              ],
              "rejectedSummaryBonuses": [
                16,
                14
              ],
              "doNotInventExtraGunners": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_ATTACK_PROFILE_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-kuat-drive-yards-pellaeon-class-star-destroyer",
      "cp16Index": 42,
      "printedName": "Kuat Drive Yards Pellaeon-class Star Destroyer",
      "printedPage": 99,
      "originalPrintedFacts": {
        "type": "Colossal (cruiser) capital ship",
        "cl": 28,
        "initiative": -2,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 16,
          "flatFootedReflex": 47,
          "fortitude": 57,
          "armorBonus": 14,
          "damageReduction": 20,
          "shieldRating": 140
        },
        "durability": {
          "hitPoints": 2350,
          "threshold": 257
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 3
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "2x2",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 69,
          "ranged": "5 heavy turbolaser batteries +16; 5 turbolaser batteries +16; 4 heavy ion cannon batteries +16; 3 tractor beam batteries +16; 5 proton torpedo batteries +16"
        },
        "abilities": {
          "str": 105,
          "dex": 14,
          "con": "—",
          "int": 22
        },
        "skills": {
          "initiative": -2,
          "mechanics": 6,
          "perception": 6,
          "pilot": -2,
          "useComputer": 6
        },
        "crew": {
          "count": 8450,
          "quality": "skilled"
        },
        "passengers": "2700 troops",
        "cargo": {
          "number": 11000,
          "unit": "tons"
        },
        "consumables": "6 months",
        "carriedCraft": "48 Predator-class starfighters, 6 shuttles",
        "hyperspace": {
          "hyperdrive": "x.75",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale"
        },
        "payload": {
          "count": 200,
          "type": "proton torpedoes"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "heavy turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 16,
          "damage": "12d10x5",
          "sourcePage": 99,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5,
          "againstSmallerThanColossal": -4
        },
        {
          "weaponLabel": "turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 16,
          "damage": "8d10x5",
          "sourcePage": 99,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5
        },
        {
          "weaponLabel": "heavy ion cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 16,
          "damage": "6d10x5 ion",
          "sourcePage": 99,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 4
        },
        {
          "weaponLabel": "tractor beam battery",
          "station": "battery (5 gunners)",
          "attackBonus": 16,
          "damage": "— (grapple +69)",
          "sourcePage": 99,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 3
        },
        {
          "weaponLabel": "proton torpedo battery",
          "station": "battery (5 gunners)",
          "attackBonus": 16,
          "damage": "10d10x5",
          "sourcePage": 99,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5,
          "splash": "4-square",
          "payloadCount": 200
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "SOURCE_CONFLICT",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 3,
        "decisionId": "SOTG-CP21-D03",
        "sourceEntryKey": "sotg-kuat-drive-yards-pellaeon-class-star-destroyer",
        "cp16Index": 42,
        "printedName": "Kuat Drive Yards Pellaeon-class Star Destroyer",
        "printedStartPage": 99,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use effective flat-footed Reflex 14; leave printed 47 in source evidence.",
        "confidence": "VERY_HIGH",
        "cp19Disposition": "SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/defenses/reflex",
            "printedPage": 99,
            "observed": "Ref 16"
          },
          {
            "location": "/defenses/flatFooted",
            "printedPage": 99,
            "observed": "flat-footed 47"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "SOURCE_CONFLICT",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/defenses/flatFootedReflex",
            "newValue": 14,
            "reason": "10 + Dex 2 - cruiser size 10 + armor 14 - Dex 2 = 14 flat-footed.",
            "originalValue": 47
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "VEHICLE_DEFENSE_FORMULA",
            "detail": {
              "printedReflex": 16,
              "printedFlatFooted": 47,
              "approvedFlatFooted": 14
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "SELF_CONTRADICTORY_DEFENSE_LINE_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-immobilizer-418-interdictor-class-heavy-cruiser",
      "cp16Index": 43,
      "printedName": "Immobilizer 418 Interdictor-class Heavy Cruiser",
      "printedPage": 100,
      "originalPrintedFacts": {
        "type": "Colossal (cruiser) capital ship",
        "cl": 17,
        "initiative": -2,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 17,
          "flatFootedReflex": 15,
          "fortitude": 52,
          "armorBonus": 15,
          "damageReduction": 20,
          "shieldRating": 150,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 1500,
          "threshold": 252
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 2
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "2x2",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 64,
          "ranged": "5 light quad turbolaser batteries +12; 4 gravity well projectors +12"
        },
        "abilities": {
          "str": 94,
          "dex": 14,
          "con": "—",
          "int": 18
        },
        "skills": {
          "initiative": -2,
          "mechanics": 6,
          "perception": 6,
          "pilot": -2,
          "useComputer": 6
        },
        "crew": {
          "count": 2807,
          "quality": "skilled"
        },
        "passengers": "80 troops",
        "cargo": {
          "number": 5500,
          "unit": "tons"
        },
        "consumables": "1.2 years",
        "carriedCraft": "24 starfighters",
        "hyperspace": {
          "hyperdrive": "x2",
          "backup": "x8",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale",
          "blackMarketUsedCredits": 52240000
        },
        "specialDefensesOrRules": {
          "gravityWell": {
            "generatorCount": 4,
            "statblockAreaSquares": "4x4",
            "rulesCalloutAreaSquares": "3x3",
            "attackAgainstReflex": 10,
            "duration": "target ship cannot activate hyperdrive if begins turn in field"
          },
          "tacticalFire": {
            "action": "standard, forgo attacks",
            "radiusSquares": 2,
            "effect": "enemy starships entering area make DC20 Pilot check or stop moving; once in area no further checks until ship exits and reenters"
          }
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "light quad turbolaser battery",
          "station": "battery (4 gunners)",
          "attackBonus": 12,
          "damage": "4d10x5",
          "sourcePage": 100,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5,
          "againstSmallerThanColossal": -8
        },
        {
          "weaponLabel": "gravity well projector",
          "station": "gunner",
          "attackBonus": 12,
          "damage": "special: hyperspace interdiction",
          "sourcePage": 100,
          "hardwareCount": 4,
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "printedRangedGroupCount": 4,
          "areaPrintedWeaponRow": "4x4 starship squares",
          "areaRulesText": "3x3 starship squares",
          "damageType": "non-damage control"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 4,
        "decisionId": "SOTG-CP21-D04",
        "sourceEntryKey": "sotg-immobilizer-418-interdictor-class-heavy-cruiser",
        "cp16Index": 43,
        "printedName": "Immobilizer 418 Interdictor-class Heavy Cruiser",
        "printedStartPage": 100,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Apply official SotG Errata 1.0: Immobilizer 418 gravity-well projector area 3x3, as a non-damage special effect against Reflex 10.",
        "confidence": "DEFINITIVE_ERRATA",
        "cp19Disposition": "WEAPON_ROW_VS_RULE_AREA_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/weaponTable/gravityWellProjector/area",
            "printedPage": 100,
            "observed": "4x4 square starship-scale area attack"
          },
          {
            "location": "/specialRule/gravityWellProjectors/area",
            "printedPage": 101,
            "observed": "3x3-square starship-scale area"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [
          {
            "path": "/specialDefensesOrRules/gravityWell/statblockAreaSquares",
            "newValue": "3x3",
            "reason": "Official errata corrects the p100 weapon row; p101 rule already 3x3.",
            "originalValue": "4x4"
          }
        ],
        "attackGroupOverrides": [
          {
            "rowIndex": 1,
            "field": "areaPrintedWeaponRow",
            "newValue": "3x3 starship squares",
            "reason": "Official errata replaces 4x4 in the weapon row only.",
            "originalPresent": true,
            "originalValue": "4x4 starship squares"
          }
        ],
        "policies": [
          {
            "code": "OFFICIAL_ERRATA_GRAVITY_WELL",
            "detail": {
              "errataTitle": "Starships of the Galaxy Errata 1.0",
              "errataPrintedPage": 100,
              "errataUrl": "https://www.theberserker.net/berserker/sw/rule_books/SW_Saga_Starships_of_the_Galaxy.pdf",
              "areaStarshipSquares": "3x3",
              "attackVsReflex": 10,
              "damageType": "special non-damaging interdiction",
              "generators": 4,
              "independentAttackPermissions": false
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "WEAPON_ROW_VS_RULE_AREA_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-junker-tye-wing",
      "cp16Index": 47,
      "printedName": "Junker TYE-wing",
      "printedPage": 104,
      "originalPrintedFacts": {
        "type": "Huge starfighter",
        "cl": 5,
        "initiative": 2,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 14,
          "flatFootedReflex": 11,
          "fortitude": 20,
          "armorBonus": 3,
          "damageReduction": 10,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 60,
          "threshold": 30
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 5
          },
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "maxVelocityKmH": 1200
        },
        "fightingSpace": {
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 22,
          "ranged": "laser cannons +5",
          "attackOptions": [
            "autofire (laser cannons)"
          ]
        },
        "abilities": {
          "str": 30,
          "dex": 16,
          "con": "—",
          "int": 12
        },
        "skills": {
          "initiative": 8,
          "mechanics": 6,
          "perception": 6,
          "pilot": 7
        },
        "crew": {
          "count": 1,
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 65,
          "unit": "kg"
        },
        "consumables": "2 days",
        "carriedCraft": "none",
        "hyperspace": {},
        "economics": {
          "availability": "Military",
          "newCredits": 60000,
          "usedCredits": 25000
        },
        "specialDefensesOrRules": {
          "junkerTemplate": {
            "clReduction": "20% round down",
            "initiativePenalty": -5,
            "abilitiesReduction": {
              "str": 4,
              "dex": 2,
              "int": 2,
              "minimum": 10
            },
            "failureTrigger": "each -1 condition track step",
            "mechanicsDCReduction": 2,
            "failureD100": {
              "01-30": "hyperdrive",
              "31-60": "engines",
              "61-85": "one randomly selected weapon/group",
              "86-95": "computer core",
              "96-100": "shields"
            }
          }
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "pilot",
          "attackBonus": 5,
          "damage": "4d10x2",
          "sourcePage": 104,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 0
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "SOURCE_CONFLICT",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "SOURCE_CONFLICT",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_SILENT_CONFIRMED",
        "hyperdrive": "SOURCE_SILENT_CONFIRMED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 5,
        "decisionId": "SOTG-CP21-D05",
        "sourceEntryKey": "sotg-junker-tye-wing",
        "cp16Index": 47,
        "printedName": "Junker TYE-wing",
        "printedStartPage": 104,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use Junker TYE-wing stock Initiative +2; apply the template's -5 Initiative penalty after Dex adjustment, not twice.",
        "confidence": "VERY_HIGH",
        "cp19Disposition": "DUAL_PRINTED_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/initiative/header",
            "printedPage": 104,
            "observed": "Init +2"
          },
          {
            "location": "/skills/initiative",
            "printedPage": 104,
            "observed": "Initiative +8"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "SOURCE_CONFLICT",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "SOURCE_CONFLICT",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_SILENT_CONFIRMED",
          "hyperdrive": "SOURCE_SILENT_CONFIRMED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/skills/initiative",
            "newValue": 2,
            "reason": "Base TIE/In +8, Junker -2 Dex gives -1 Init, then -5 template penalty -> +2.",
            "originalValue": 8
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "JUNKER_TEMPLATE_INITIATIVE",
            "detail": {
              "baseTIEInInitiative": 8,
              "dexterityChange": -2,
              "resultingInitiativeShift": -1,
              "templatePenalty": -5,
              "approvedEffectiveInitiative": 2,
              "applyPenaltyExactlyOnce": true,
              "systemsFailureSeparateRule": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_PRINTED_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-koensayr-manufacturing-btl-58-k-wing",
      "cp16Index": 48,
      "printedName": "Koensayr Manufacturing BTL-58 K-wing",
      "printedPage": 105,
      "originalPrintedFacts": {
        "type": "Gargantuan starfighter",
        "cl": 12,
        "initiative": 10,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 18,
          "flatFootedReflex": 13,
          "fortitude": 28,
          "armorBonus": 8,
          "damageReduction": 10,
          "shieldRating": 30,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 160,
          "threshold": 48
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 4
          },
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "maxVelocityKmH": 1000
        },
        "fightingSpace": {
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 35,
          "ranged": "laser cannons +7 AND quad laser cannon +7 AND choice of concussion missiles OR proton torpedoes OR shieldbuster torpedoes +7",
          "attackOptions": [
            "autofire (laser cannon, quad laser cannon)"
          ]
        },
        "abilities": {
          "str": 46,
          "dex": 20,
          "con": "—",
          "int": 20
        },
        "skills": {
          "initiative": 6,
          "mechanics": 6,
          "perception": 6,
          "pilot": 6,
          "useComputer": 6
        },
        "crew": {
          "count": 4,
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 440,
          "unit": "kg"
        },
        "consumables": "1 day",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "none explicitly (carried to battle)"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 250000,
          "usedCredits": 120000
        },
        "payload": {
          "protonTorpedoes": 18,
          "concussionMissiles": 4,
          "plasmaTorpedoes": 6
        },
        "specialDefensesOrRules": {
          "missileReplacement": {
            "mechanicsDC": 10,
            "minutes": 5,
            "mayReplaceMissilePayload": "normal missile/mine payload or starfighter weapon system EP cost <=0"
          },
          "slam": "has SLAM system see p42",
          "cockpit": "detachable escape pod"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "gunner",
          "attackBonus": 7,
          "damage": "4d10x2",
          "sourcePage": 105,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 2
        },
        {
          "weaponLabel": "quad laser cannon",
          "station": "gunner",
          "attackBonus": 7,
          "damage": "6d10x2",
          "sourcePage": 105,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "second generation forward turret; first-generation relationship unspecified",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 2
        },
        {
          "weaponLabel": "medium concussion missiles",
          "station": "gunner",
          "attackBonus": 7,
          "damage": "8d10x2",
          "sourcePage": 105,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 2,
          "payload": 4,
          "splash": "4-square",
          "configuration": "alternate mission ordnance"
        },
        {
          "weaponLabel": "proton torpedoes",
          "station": "gunner",
          "attackBonus": 7,
          "damage": "9d10x2",
          "sourcePage": 105,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 2,
          "payload": 18,
          "splash": "4-square",
          "configuration": "alternate mission ordnance"
        },
        {
          "weaponLabel": "shieldbuster torpedoes",
          "station": "gunner",
          "attackBonus": 7,
          "damage": "8d10x2",
          "sourcePage": 105,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": 2,
          "splash": "4-square",
          "configuration": "alternate mission ordnance"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "SOURCE_CONFLICT",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "SOURCE_CONFLICT",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_CONFLICT",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 6,
        "decisionId": "SOTG-CP21-D06",
        "sourceEntryKey": "sotg-koensayr-manufacturing-btl-58-k-wing",
        "cp16Index": 48,
        "printedName": "Koensayr Manufacturing BTL-58 K-wing",
        "printedStartPage": 105,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use K-wing crew Initiative +6 and a ship-specific six-round plasma/shieldbuster torpedo ammo association, with mutually exclusive ordnance choice.",
        "confidence": "MEDIUM_INIT_HIGH_AMMO",
        "cp19Disposition": "INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/initiative/header",
            "printedPage": 105,
            "observed": "Init +10"
          },
          {
            "location": "/skills/initiative",
            "printedPage": 105,
            "observed": "Initiative +6"
          },
          {
            "location": "/ranged/alternateOrdnance",
            "printedPage": 105,
            "observed": "shieldbuster torpedoes +7"
          },
          {
            "location": "/weaponTable/alternateOrdnance",
            "printedPage": 105,
            "observed": "Shieldbuster torpedoes (gunner)"
          },
          {
            "location": "/payload/thirdOrdnance",
            "printedPage": 105,
            "observed": "6 plasma torpedoes"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "SOURCE_CONFLICT",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "SOURCE_CONFLICT",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_CONFLICT",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [
          {
            "path": "/initiative",
            "newValue": 6,
            "reason": "Approved stock crew Skills Initiative +6 supersedes Header +10.",
            "originalValue": 10
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "K_WING_SHIELDBUSTER_ALIAS",
            "detail": {
              "scope": "THIS_SOURCE_ENTRY_ONLY",
              "printedPayloadKey": "plasmaTorpedoes",
              "printedPayloadCount": 6,
              "attackWeaponFamily": "shieldbuster torpedoes",
              "ammoConsumptionPerShot": 1,
              "applyShieldbusterSrRules": true,
              "ordnanceModes": [
                "medium concussion missiles",
                "proton torpedoes",
                "shieldbuster torpedoes"
              ],
              "mutuallyExclusive": true,
              "requiresInstalledLoadoutSelection": true,
              "prototypeAndLaterVariantsSeparate": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "INITIATIVE_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-sienar-technologies-marauder-corvette",
      "cp16Index": 52,
      "printedName": "Sienar Technologies Marauder Corvette",
      "printedPage": 110,
      "originalPrintedFacts": {
        "type": "Colossal (frigate) capital ship",
        "cl": 14,
        "initiative": -3,
        "sensesPerception": 5,
        "defenses": {
          "reflex": 14,
          "flatFootedReflex": 12,
          "fortitude": 37,
          "armorBonus": 12,
          "damageReduction": 20,
          "shieldRating": 115
        },
        "durability": {
          "hitPoints": 720,
          "threshold": 137
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 3
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 0,
          "grappleBonus": 47,
          "ranged": "2 double turbolaser batteries +10* AND tractor beam battery +8*",
          "attackOptions": [
            "autofire (double turbolasers)"
          ]
        },
        "abilities": {
          "str": 64,
          "dex": 15,
          "con": "—",
          "int": 18
        },
        "skills": {
          "initiative": -3,
          "mechanics": 5,
          "perception": 5,
          "pilot": -3,
          "useComputer": 5
        },
        "crew": {
          "count": 177,
          "quality": "normal"
        },
        "passengers": "80 troops",
        "cargo": {
          "number": 300,
          "unit": "tons"
        },
        "consumables": "3 months",
        "carriedCraft": {
          "starfighters": 12,
          "landingBarges": 2,
          "shuttles": 4
        },
        "hyperspace": {
          "hyperdrive": "x2",
          "backup": "x12",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 2400000,
          "usedCredits": 1450000
        },
        "specialDefensesOrRules": {
          "tacticalFire": {
            "action": "standard, forgo all attacks",
            "area": "all adjacent starship-scale squares",
            "eligibleAllies": "Gargantuan or smaller",
            "attackRollBonus": 2
          }
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "double turbolaser battery",
          "station": "battery (4 gunners)",
          "attackBonus": 10,
          "damage": "4d10x5",
          "sourcePage": 110,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 2,
          "autofireBonus": 5,
          "againstSmallerThanColossal": -10
        },
        {
          "weaponLabel": "tractor beam battery",
          "station": "3 gunners (weapon row calls tractor beam)",
          "attackBonus": 8,
          "damage": "— (grapple +47)",
          "sourcePage": 110,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 1,
          "againstSmallerThanColossal": -12
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_SILENT_CONFIRMED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 7,
        "decisionId": "SOTG-CP21-D07",
        "sourceEntryKey": "sotg-sienar-technologies-marauder-corvette",
        "cp16Index": 52,
        "printedName": "Sienar Technologies Marauder Corvette",
        "printedStartPage": 110,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Marauder's tractor beam is one attack group operated by three gunners, not proven to be a battery or three emitters.",
        "confidence": "MEDIUM_HIGH",
        "cp19Disposition": "TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/ranged/tractor",
            "printedPage": 110,
            "observed": "tractor beam battery +8"
          },
          {
            "location": "/weaponTable/tractor",
            "printedPage": 110,
            "observed": "Tractor beam (3 gunners)"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_SILENT_CONFIRMED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "MARAUDER_TRACTOR_OPERATOR_MODEL",
            "detail": {
              "rowIndex": 1,
              "interpretation": "NON_BATTERY_TRACTOR_GROUP",
              "operatorRole": "gunner",
              "operatorCount": 3,
              "attackBonus": 8,
              "grappleBonus": 47,
              "physicalMountCount": "UNRESOLVED",
              "firingArc": "UNRESOLVED",
              "independentAttackActionsNotInferred": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "TRACTOR_GROUP_LABEL_SCOPE_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-mon-calamari-star-defender",
      "cp16Index": 58,
      "printedName": "Mon Calamari Star Defender",
      "printedPage": 116,
      "originalPrintedFacts": {
        "type": "Colossal (station) space station [printed]",
        "cl": 45,
        "initiative": -3,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 20,
          "flatFootedReflex": 19,
          "fortitude": 72,
          "armorBonus": 19,
          "damageReduction": 20,
          "shieldRating": 400,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 2700,
          "threshold": 572
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 2
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "2x2",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 84,
          "ranged": "25 heavy turbolaser batteries +17* AND 25 turbolaser batteries +17* AND 25 point-defense laser cannon batteries +17 AND 25 heavy ion cannon batteries +19* AND 8 tractor beam batteries +17* AND 5 heavy concussion missile batteries +17*"
        },
        "abilities": {
          "str": 134,
          "dex": 12,
          "con": "—",
          "int": 24
        },
        "skills": {
          "initiative": -3,
          "mechanics": 6,
          "perception": 6,
          "pilot": -3,
          "useComputer": 6
        },
        "crew": {
          "count": 68174,
          "quality": "skilled"
        },
        "passengers": "12500 troops; 200000 support ship crews/refugees",
        "cargo": {
          "number": 200000,
          "unit": "tons"
        },
        "consumables": "6 years",
        "carriedCraft": "168 starfighters, 48 heavy starfighters, up to 10000 small craft",
        "hyperspace": {
          "hyperdrive": "x1",
          "backup": "x12",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale"
        },
        "payload": {
          "count": 6000,
          "type": "medium concussion missiles (payload line); heavy concussion missile batteries (weapon line)"
        },
        "specialDefensesOrRules": {
          "tacticalFire": {
            "action": "standard forgo all attacks",
            "radiusSquares": 3,
            "effect": "allied starships +20 SR and +1 Reflex Defense"
          },
          "specialShields": "backup shield generators; no quantified refresh rate printed"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "heavy turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 17,
          "damage": "11d10x5",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25,
          "againstSmallerThanColossal": -3
        },
        {
          "weaponLabel": "turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 17,
          "damage": "8d10x5",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25,
          "againstSmallerThanColossal": -3
        },
        {
          "weaponLabel": "point-defense laser cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 17,
          "damage": "4d10x2",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25
        },
        {
          "weaponLabel": "heavy ion cannon battery",
          "station": "battery (6 gunners)",
          "attackBonus": 19,
          "damage": "4d10x5 ion",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25,
          "againstSmallerThanColossal": -1
        },
        {
          "weaponLabel": "tractor beam battery",
          "station": "battery (5 gunners)",
          "attackBonus": 17,
          "damage": "— (grapple +84)",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 8,
          "againstSmallerThanColossal": -3
        },
        {
          "weaponLabel": "heavy concussion missile battery",
          "station": "battery (5 gunners)",
          "attackBonus": 17,
          "damage": "12d10x5",
          "sourcePage": 116,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 5,
          "splash": "4-square",
          "againstSmallerThanColossal": -3,
          "payload": 6000
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "SOURCE_CONFLICT",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_CONFLICT",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 8,
        "decisionId": "SOTG-CP21-D08",
        "sourceEntryKey": "sotg-mon-calamari-star-defender",
        "cp16Index": 58,
        "printedName": "Mon Calamari Star Defender",
        "printedStartPage": 116,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Keep Colossal (station) size and printed fly-2 speed, classify as mobile warship, and leave 6,000 medium payload rounds vs heavy launcher labels unresolved.",
        "confidence": "HIGH_MOBILITY_LOW_MISSILE",
        "cp19Disposition": "CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/printedType",
            "printedPage": 116,
            "observed": "Colossal (station) space station"
          },
          {
            "location": "/movement",
            "printedPage": 116,
            "observed": "Speed fly 2 squares"
          },
          {
            "location": "/prose/shipType",
            "printedPage": 116,
            "observed": "Viscount-class Star Defender warship"
          },
          {
            "location": "/payload/missiles",
            "printedPage": 116,
            "observed": "6,000 medium concussion missiles"
          },
          {
            "location": "/weaponTable/missileBattery",
            "printedPage": 116,
            "observed": "Heavy concussion missile battery"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "SOURCE_CONFLICT",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_CONFLICT",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "VISCOUNT_SIZE_ROLE_SPLIT",
            "detail": {
              "printedSizeClass": "Colossal (station)",
              "effectiveRole": "MOBILE_WARSHIP",
              "starshipScaleFlySquares": 2,
              "payload": {
                "count": 6000,
                "printedType": "medium concussion missiles"
              },
              "printedWeaponFamily": "heavy concussion missile battery",
              "ammoTypeEquivalence": "UNRESOLVED",
              "heavyWeaponAutoAmmoAllowed": false,
              "tacticalFire": {
                "action": "standard; forgo attacks",
                "allyRadiusStarshipSquares": 3,
                "shieldRatingBonus": 20,
                "reflexBonus": 1
              }
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "CLASSIFICATION_AND_PAYLOAD_TERMINOLOGY_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-eclipse",
      "cp16Index": 78,
      "printedName": "Eclipse",
      "printedPage": 139,
      "originalPrintedFacts": {
        "type": "Colossal (station) space station [printed]",
        "cl": 50,
        "initiative": -4,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 20,
          "flatFootedReflex": 20,
          "fortitude": 182,
          "armorBonus": 20,
          "damageReduction": 20,
          "shieldRating": 500,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 6000,
          "threshold": 682
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 1
          }
        },
        "fightingSpace": {
          "starshipScaleSquares": "2x2",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 194,
          "ranged": "superlaser +7** [Ranged header] AND 25 heavy turbolaser batteries +15* AND 25 turbolaser batteries +15* AND 25 point-defense laser cannon batteries +15 AND 15 heavy ion cannon batteries +15* AND 20 tractor beam batteries +15*"
        },
        "abilities": {
          "str": 354,
          "dex": 10,
          "con": "-",
          "int": 20
        },
        "skills": {
          "initiative": -4,
          "mechanics": 6,
          "perception": 6,
          "pilot": -4,
          "useComputer": 6
        },
        "crew": {
          "count": 712645,
          "quality": "skilled"
        },
        "passengers": "150000 troops",
        "cargo": {
          "number": 600000,
          "unit": "tons"
        },
        "consumables": "10 years",
        "carriedCraft": "600 starfighters; 96 fighter/bombers; support craft",
        "hyperspace": {
          "hyperdrive": "x2",
          "backup": "x6",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": "not available for sale"
        },
        "specialDefensesOrRules": {
          "axialSuperlaser": {
            "baseDamage": "8d10x50",
            "attackHeader": 7,
            "attackRow": 15,
            "targetingPenaltyAgainstSmallerThanColossalCruiser": -20,
            "aiming": "entire ship must be aligned",
            "planetDestroyer": "not capable of destroying an entire planet"
          }
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "axial superlaser",
          "station": "gunner",
          "attackBonus": 15,
          "damage": "8d10x50",
          "sourcePage": 139,
          "hardwareCount": 1,
          "firingArc": "axial keel mounted, whole-ship alignment",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "againstSmallerThanColossalCruiser": -20,
          "headerAttackBonus": 7,
          "sourceConflict": "Ranged header +7; weapon row +15"
        },
        {
          "weaponLabel": "heavy turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 15,
          "damage": "10d10x5",
          "sourcePage": 139,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25,
          "againstSmallerThanColossal": -5
        },
        {
          "weaponLabel": "turbolaser battery",
          "station": "battery (5 gunners)",
          "attackBonus": 15,
          "damage": "7d10x5",
          "sourcePage": 139,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25,
          "againstSmallerThanColossal": -5
        },
        {
          "weaponLabel": "point-defense laser cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 15,
          "damage": "6d10x2",
          "sourcePage": 139,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 25
        },
        {
          "weaponLabel": "heavy ion cannon battery",
          "station": "battery (5 gunners)",
          "attackBonus": 15,
          "damage": "3d10x5 ion",
          "sourcePage": 139,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 15,
          "againstSmallerThanColossal": -5
        },
        {
          "weaponLabel": "tractor beam battery",
          "station": "battery (5 gunners)",
          "attackBonus": 15,
          "damage": "- (grapple +194)",
          "sourcePage": 139,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": 20,
          "againstSmallerThanColossal": -5
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "SOURCE_CONFLICT",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "SOURCE_CONFLICT"
      },
      "approvedDecision": {
        "order": 9,
        "decisionId": "SOTG-CP21-D09",
        "sourceEntryKey": "sotg-eclipse",
        "cp16Index": 78,
        "printedName": "Eclipse",
        "printedStartPage": 139,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use Eclipse detailed superlaser +15, with -20 size penalty -> -5 vs smaller-than-Colossal-(cruiser) targets. Axial alignment required.",
        "confidence": "VERY_HIGH",
        "cp19Disposition": "DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/ranged/superlaser",
            "printedPage": 139,
            "observed": "superlaser +7**"
          },
          {
            "location": "/weaponTable/superlaser",
            "printedPage": 139,
            "observed": "Superlaser Atk +15"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "SOURCE_CONFLICT",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "SOURCE_CONFLICT"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "ECLIPSE_AXIAL_SUPERLASER_ATTACK",
            "detail": {
              "rowIndex": 0,
              "baseAttackBonus": 15,
              "penaltyAgainstSmallerThanColossalCruiser": -20,
              "conditionalAttackBonus": -5,
              "printedHeaderAttackBonus": 7,
              "alignmentRequired": true,
              "distinctOneGroup": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_SUPERLASER_ATTACK_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-theta-class-shuttle",
      "cp16Index": 80,
      "printedName": "Theta-class Shuttle",
      "printedPage": 141,
      "originalPrintedFacts": {
        "type": "Colossal space transport",
        "cl": 11,
        "initiative": 5,
        "sensesPerception": 5,
        "defenses": {
          "reflex": 15,
          "flatFootedReflex": 12,
          "fortitude": 26,
          "armorBonus": 12,
          "damageReduction": 10,
          "shieldRating": 20,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 120,
          "threshold": 76
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 3
          },
          "characterScale": {
            "mode": "fly",
            "squares": 12
          },
          "maxVelocityKmH": 825
        },
        "fightingSpace": {
          "starshipScaleSquares": "4x4 or 1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 38,
          "ranged": "quad laser cannon +4 AND laser cannons +4",
          "attackOptions": [
            "autofire (quad laser cannon)"
          ]
        },
        "abilities": {
          "str": 42,
          "dex": 16,
          "con": "-",
          "int": 14
        },
        "skills": {
          "initiative": 5,
          "mechanics": 6,
          "perception": 6,
          "pilot": 5,
          "useComputer": 6
        },
        "crew": {
          "count": 5,
          "quality": "skilled"
        },
        "passengers": 16,
        "cargo": {
          "number": 50,
          "unit": "tons"
        },
        "consumables": "2 months",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "x1",
          "backup": "x15",
          "navcomputer": "printed"
        },
        "economics": {
          "availability": "Restricted",
          "newCredits": 1000000,
          "notes": "210000 without luxury upgrades"
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "quad laser cannon",
          "station": "gunner",
          "attackBonus": 4,
          "damage": "6d10x2",
          "sourcePage": 141,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "autofireBonus": -1
        },
        {
          "weaponLabel": "laser cannons",
          "station": "gunner",
          "attackBonus": 4,
          "damage": "4d10x2",
          "sourcePage": 141,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "SOURCE_CONFLICT",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "SOURCE_CONFLICT",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_SILENT_CONFIRMED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 10,
        "decisionId": "SOTG-CP21-D10",
        "sourceEntryKey": "sotg-theta-class-shuttle",
        "cp16Index": 80,
        "printedName": "Theta-class Shuttle",
        "printedStartPage": 141,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use stock Theta Skills Perception +6 for checks, not Senses +5; recompute if crew changes.",
        "confidence": "MEDIUM_HIGH",
        "cp19Disposition": "DUAL_PERCEPTION_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/senses/header",
            "printedPage": 141,
            "observed": "Senses Perception +5"
          },
          {
            "location": "/skills/perception",
            "printedPage": 141,
            "observed": "Perception +6"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "SOURCE_CONFLICT",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "SOURCE_CONFLICT",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_SILENT_CONFIRMED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/sensesPerception",
            "newValue": 6,
            "reason": "Approved stock crew Perception +6 matches Skills row.",
            "originalValue": 5
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "THETA_PERCEPTION_STOCK_CREW",
            "detail": {
              "effectiveStockPerception": 6,
              "sourceHeader": 5,
              "recomputeWhenOperatorChanges": true,
              "luxuryUpgradesNotImplicit": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_PERCEPTION_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-sienar-fleet-systems-tie-bomber",
      "cp16Index": 82,
      "printedName": "Sienar Fleet Systems TIE Bomber",
      "printedPage": 143,
      "originalPrintedFacts": {
        "type": "Gargantuan starfighter",
        "cl": 9,
        "initiative": 7,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 15,
          "flatFootedReflex": 12,
          "fortitude": 26,
          "armorBonus": 7,
          "damageReduction": 10,
          "vehicularCombat": "printed"
        },
        "durability": {
          "hitPoints": 130,
          "threshold": 46
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 3
          },
          "characterScale": {
            "mode": "fly",
            "squares": 12
          },
          "maxVelocityKmH": 850
        },
        "fightingSpace": {
          "starshipScaleSquares": "4x4 or 1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 33,
          "ranged": "laser cannons +7 OR medium concussion missiles +7"
        },
        "abilities": {
          "str": 43,
          "dex": 16,
          "con": "-",
          "int": 17
        },
        "skills": {
          "initiative": 4,
          "mechanics": 6,
          "perception": 6,
          "pilot": 4,
          "useComputer": 6
        },
        "crew": {
          "count": 1,
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 15,
          "unit": "tons, bomb bay"
        },
        "consumables": "2 days",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "not printed"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 150000,
          "usedCredits": 60000
        },
        "payload": {
          "count": 16,
          "type": "medium concussion missiles"
        },
        "specialDefensesOrRules": {
          "alternateMissionLoads": {
            "protonTorpedoes": 8,
            "otherChoices": "up to 8 proton bombs or 6 orbital mines when missile/torpedo complement reduced by half",
            "thermalDetonators": 64,
            "supportCanisters": "propaganda or ground resupply"
          }
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "pilot",
          "attackBonus": 7,
          "damage": "3d10x2",
          "sourcePage": 143,
          "hardwareCount": 2,
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "physicalCountEvidence": "p142 narrative two forward-mounted laser cannons"
        },
        {
          "weaponLabel": "medium concussion missiles",
          "station": "pilot",
          "attackBonus": 7,
          "damage": "9d10x2",
          "sourcePage": 143,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "payload": 16,
          "splash": "4-square"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "SOURCE_CONFLICT",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "PDF_VERIFIED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "SOURCE_CONFLICT",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "SOURCE_SILENT_CONFIRMED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 11,
        "decisionId": "SOTG-CP21-D11",
        "sourceEntryKey": "sotg-sienar-fleet-systems-tie-bomber",
        "cp16Index": 82,
        "printedName": "Sienar Fleet Systems TIE Bomber",
        "printedStartPage": 143,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Use TIE Bomber Skills Initiative +4; retain two forward lasers and 16-missile stock bomb-pod with separate selectable alternatives.",
        "confidence": "MEDIUM_INIT_HIGH_LOADOUT",
        "cp19Disposition": "DUAL_INITIATIVE_VALUES_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/initiative/header",
            "printedPage": 143,
            "observed": "Init +7"
          },
          {
            "location": "/skills/initiative",
            "printedPage": 143,
            "observed": "Initiative +4"
          },
          {
            "location": "/narrative/laserHardware",
            "printedPage": 142,
            "observed": "two forward-mounted laser cannons"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "SOURCE_CONFLICT",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "PDF_VERIFIED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "SOURCE_CONFLICT",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "SOURCE_SILENT_CONFIRMED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/initiative",
            "newValue": 4,
            "reason": "Approved Skills Initiative +4 supersedes printed +7 header.",
            "originalValue": 7
          }
        ],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "TIE_BOMBER_ARMAMENT_VARIANTS",
            "detail": {
              "stockTwoForwardLaserCannons": true,
              "stockConcussionMissiles": 16,
              "alternativeTorpedoes": 8,
              "ordnanceAlternativesNotCumulative": true,
              "physicalWeaponActionsNotGranted": true,
              "laserAttackRowIndex": 0,
              "missileAttackRowIndex": 1,
              "alternativeTorpedoesNotInstalledInStock": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "DUAL_INITIATIVE_VALUES_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-incom-t-65xj3-x-wing-starfighter",
      "cp16Index": 94,
      "printedName": "Incom T-65XJ3 X-wing Starfighter",
      "printedPage": 152,
      "originalPrintedFacts": {
        "type": "Gargantuan starfighter",
        "cl": 11,
        "initiative": 9,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 21,
          "flatFootedReflex": 13,
          "fortitude": 28,
          "armorBonus": 8,
          "damageReduction": 10,
          "vehicularCombat": "printed",
          "shieldRating": 30
        },
        "durability": {
          "hitPoints": 150,
          "threshold": 48
        },
        "movement": {
          "starshipScale": {
            "mode": "fly",
            "squares": 4
          },
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "maxVelocityKmH": 1100
        },
        "fightingSpace": {
          "starshipScaleSquares": "4x4 or 1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 35,
          "ranged": "heavy laser cannons +8 OR proton torpedoes +8",
          "attackOptions": [
            "autofire (heavy laser cannons)",
            "fire-link (proton torpedoes)"
          ]
        },
        "abilities": {
          "str": 46,
          "dex": 26,
          "con": "—",
          "int": 18
        },
        "skills": {
          "initiative": 9,
          "mechanics": 6,
          "perception": 6,
          "pilot": 9,
          "useComputer": 6,
          "mechanicsWithAstromechPrinted": 13,
          "perceptionWithAstromechPrinted": 3,
          "useComputerWithAstromechPrinted": 13
        },
        "crew": {
          "printed": "1 plus astromech droid skilled"
        },
        "passengers": "none",
        "cargo": "35 kg",
        "consumables": "3 days",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "x1, 10-jump memory (astromech droid)"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 315000,
          "usedCredits": 220000
        },
        "specialDefensesOrRules": {
          "sourceArmamentLabelDiscrepancy": "p152 narrative heavy proton torpedoes versus p153 payload plain proton torpedoes",
          "shieldRecharge": {
            "rechargeRateMultiplier": 2,
            "shieldIncrease": 10,
            "maximumShieldRating": 30
          },
          "stutterFire": {
            "against": "Yuuzhan Vong dovin basal shield defenses",
            "targetShieldRatingMultiplier": 0.5
          }
        },
        "payload": "12 proton torpedoes"
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "heavy laser cannons",
          "station": "pilot",
          "attackBonus": 8,
          "damage": "7d10x2",
          "sourcePage": 153,
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED"
        },
        {
          "weaponLabel": "proton torpedoes",
          "station": "pilot",
          "attackBonus": 8,
          "damage": "10d10x2",
          "sourcePage": 153,
          "hardwareCount": 3,
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "batteryCount": "SOURCE_SILENT_CONFIRMED",
          "hardwareEvidence": "p152 narrative 3 proton torpedo tubes"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "SOURCE_SILENT_CONFIRMED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_CONFLICT",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 12,
        "decisionId": "SOTG-CP21-D12",
        "sourceEntryKey": "sotg-incom-t-65xj3-x-wing-starfighter",
        "cp16Index": 94,
        "printedName": "Incom T-65XJ3 X-wing Starfighter",
        "printedStartPage": 152,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Interpret XJ3's 12 proton torpedoes as 3 tubes x 4 HEAVY proton torpedoes, damage 10d10x2, while retaining original generic labels.",
        "confidence": "HIGH",
        "cp19Disposition": "TORPEDO_QUALIFIER_UNRESOLVED",
        "printedAlternatives": [
          {
            "location": "/narrative/ordnance",
            "printedPage": 152,
            "observed": "three proton torpedo tubes; four heavy proton torpedoes apiece"
          },
          {
            "location": "/payload/torpedoes",
            "printedPage": 153,
            "observed": "12 proton torpedoes"
          },
          {
            "location": "/weaponTable/torpedoes",
            "printedPage": 153,
            "observed": "Proton torpedoes (pilot)"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "SOURCE_SILENT_CONFIRMED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_CONFLICT",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [
          {
            "path": "/payload",
            "newValue": "12 heavy proton torpedoes",
            "reason": "Printed narrative p152 specifies heavy torpedoes, three tubes holding four each.",
            "originalValue": "12 proton torpedoes"
          }
        ],
        "attackGroupOverrides": [
          {
            "rowIndex": 1,
            "field": "weaponLabel",
            "newValue": "heavy proton torpedoes",
            "reason": "Approved ship-specific weapon label from narrative p152 and 10d10x2 printed row.",
            "originalPresent": true,
            "originalValue": "proton torpedoes"
          }
        ],
        "policies": [
          {
            "code": "XJ3_HEAVY_PROTON_TORPEDO_LOADOUT",
            "detail": {
              "torpedoType": "heavy proton torpedoes",
              "launcherCount": 3,
              "ammoPerLauncher": 4,
              "totalAmmo": 12,
              "attackBonus": 8,
              "damage": "10d10x2",
              "shipSpecific": true,
              "fireLinkConditional": true,
              "firingArcsUnresolved": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [],
        "unresolvedCanonicalScopes": [
          "TORPEDO_QUALIFIER_UNRESOLVED"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-incom-subpro-arc-170-starfighter",
      "cp16Index": 5,
      "printedName": "Incom/Subpro ARC-170 Starfighter",
      "printedPage": 61,
      "originalPrintedFacts": {
        "type": "Gargantuan starfighter",
        "cl": 11,
        "initiative": 5,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 17,
          "flatFootedReflex": 13,
          "fortitude": 28,
          "armorBonus": 8,
          "vehicularCombat": "printed",
          "damageReduction": 10,
          "shieldRating": 25
        },
        "durability": {
          "hitPoints": 150,
          "threshold": 48
        },
        "movement": {
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "starshipScale": {
            "mode": "fly",
            "squares": 4
          },
          "maxVelocityKmH": 1050
        },
        "fightingSpace": {
          "characterScaleSquares": "4x4",
          "starshipScaleSquares": "1",
          "cover": "total (crew); +5 (astromech droid)"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 35,
          "ranged": "laser cannons +4 AND medium laser cannons +4 AND proton torpedoes +6",
          "attackOptions": [
            "autofire (both laser families)",
            "fire-link (proton torpedoes)"
          ]
        },
        "abilities": {
          "str": 46,
          "dex": 18,
          "con": "—",
          "int": 14
        },
        "skills": {
          "initiative": 5,
          "mechanics": {
            "base": 6,
            "astromech": 13
          },
          "perception": 6,
          "pilot": 5,
          "useComputer": {
            "base": 6,
            "astromech": 13
          }
        },
        "crew": {
          "count": 3,
          "plus": "astromech droid",
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 110,
          "unit": "kg"
        },
        "consumables": "5 days",
        "carriedCraft": "none",
        "payload": "6 proton torpedoes",
        "hyperspace": {
          "hyperdrive": "x1.5",
          "jumpMemory": "10-jump memory (astromech droid)"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 155000,
          "usedCredits": 70000
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "gunner",
          "attackBonus": 4,
          "autofireBonus": -1,
          "damage": "6d10x2",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "hardwareCount": "SOURCE_SILENT_CONFIRMED"
        },
        {
          "weaponLabel": "medium laser cannons",
          "station": "gunner",
          "attackBonus": 4,
          "autofireBonus": -1,
          "damage": "5d10x2",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "hardwareCount": "SOURCE_SILENT_CONFIRMED"
        },
        {
          "weaponLabel": "proton torpedoes",
          "station": "pilot",
          "attackBonus": 6,
          "damage": "9d10x2",
          "splash": "4-square",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "hardwareCount": "SOURCE_SILENT_CONFIRMED",
          "payloadCount": 6,
          "fireLinkOption": true
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "SOURCE_SILENT_CONFIRMED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 13,
        "decisionId": "SOTG-CP21-D13",
        "sourceEntryKey": "sotg-incom-subpro-arc-170-starfighter",
        "cp16Index": 5,
        "printedName": "Incom/Subpro ARC-170 Starfighter",
        "printedStartPage": 61,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "ARC-170: retain three attack families and distinct gunner/gunner/pilot roles; supplement missing row pages only as provenance.",
        "confidence": "HIGH",
        "cp19Disposition": "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE",
        "printedAlternatives": [
          {
            "location": "/weaponTable/groups",
            "printedPage": 61,
            "observed": "Laser cannons (gunner), medium laser cannons (gunner), proton torpedoes (pilot)"
          },
          {
            "location": "/crew",
            "printedPage": 61,
            "observed": "3 plus astromech droid"
          },
          {
            "location": "/payload",
            "printedPage": 61,
            "observed": "6 proton torpedoes"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "SOURCE_SILENT_CONFIRMED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "ARC170_LEGACY_PROVENANCE",
            "detail": {
              "publishedPage": 61,
              "groupRoles": [
                "gunner",
                "gunner",
                "pilot"
              ],
              "groupLabels": [
                "laser cannons",
                "medium laser cannons",
                "proton torpedoes"
              ],
              "missingKeysMustRemainAbsent": true,
              "physicalCountOrArcNotInferred": true,
              "astromechSeparate": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [
          {
            "rowIndex": 0,
            "field": "sourcePage",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 0,
            "field": "batteryCount",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 1,
            "field": "sourcePage",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 1,
            "field": "batteryCount",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 2,
            "field": "sourcePage",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 2,
            "field": "batteryCount",
            "sourcePage": 61,
            "provenance": "KEY_NOT_STORED"
          }
        ],
        "unresolvedCanonicalScopes": [
          "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-alliance-a-wing-starfighter",
      "cp16Index": 7,
      "printedName": "Alliance A-wing Starfighter",
      "printedPage": 63,
      "originalPrintedFacts": {
        "type": "Huge starfighter",
        "cl": 9,
        "initiative": 12,
        "sensesPerception": 6,
        "defenses": {
          "reflex": 19,
          "flatFootedReflex": 11,
          "fortitude": 23,
          "armorBonus": 3,
          "vehicularCombat": "printed",
          "damageReduction": 10,
          "shieldRating": 15
        },
        "durability": {
          "hitPoints": 80,
          "threshold": 33
        },
        "movement": {
          "characterScale": {
            "mode": "fly",
            "squares": 16
          },
          "starshipScale": {
            "mode": "fly",
            "squares": 6
          },
          "maxVelocityKmH": 1300
        },
        "fightingSpace": {
          "characterScaleSquares": "3x3",
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 2,
          "grappleBonus": 25,
          "ranged": "laser cannons +7 OR medium concussion missiles +7",
          "attackOptions": [
            "autofire (laser cannons)",
            "fire-link (medium concussion missiles)"
          ]
        },
        "abilities": {
          "str": 36,
          "dex": 26,
          "con": "—",
          "int": 16
        },
        "skills": {
          "initiative": 12,
          "mechanics": 6,
          "perception": 6,
          "pilot": 12,
          "useComputer": 6
        },
        "crew": {
          "count": 1,
          "quality": "skilled"
        },
        "passengers": "none",
        "cargo": {
          "number": 40,
          "unit": "kg"
        },
        "consumables": "1 week",
        "carriedCraft": "none",
        "payload": "12 medium concussion missiles",
        "hyperspace": {
          "hyperdrive": "x1",
          "navcomputer": "limited navcomputer (2-jump memory)"
        },
        "economics": {
          "availability": "Military",
          "newCredits": 175000,
          "usedCredits": 70000
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "laser cannons",
          "station": "pilot",
          "attackBonus": 7,
          "autofireBonus": 2,
          "damage": "5d10x2",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "hardwareCount": "SOURCE_SILENT_CONFIRMED"
        },
        {
          "weaponLabel": "medium concussion missiles",
          "station": "pilot",
          "attackBonus": 7,
          "damage": "7d10x2",
          "splash": "4-square",
          "payloadCount": 12,
          "fireLinkOption": true,
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "launcherCount": "SOURCE_SILENT_CONFIRMED"
        },
        {
          "weaponLabel": "jammer",
          "deviceType": "ELECTRONIC_WARFARE_NOT_DAMAGE_WEAPON",
          "station": "pilot",
          "attackBonus": "n/a",
          "damage": "special",
          "effect": "adjacent ships Colossal or smaller -5 Intelligence if starfighters; -2 if space transports when active",
          "hardwareCount": "SOURCE_SILENT_CONFIRMED"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "SOURCE_SILENT_CONFIRMED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "PDF_VERIFIED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "PDF_VERIFIED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 14,
        "decisionId": "SOTG-CP21-D14",
        "sourceEntryKey": "sotg-alliance-a-wing-starfighter",
        "cp16Index": 7,
        "printedName": "Alliance A-wing Starfighter",
        "printedStartPage": 63,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "A-wing: early lasers+jammer versus later missile-equipped stock; jammer is electronic warfare, never a third damage gun.",
        "confidence": "HIGH",
        "cp19Disposition": "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE",
        "printedAlternatives": [
          {
            "location": "/weaponTable/groups",
            "printedPage": 63,
            "observed": "Laser cannons (pilot), medium concussion missiles (pilot), Jammer (pilot)"
          },
          {
            "location": "/narrative/earlyConfiguration",
            "printedPage": 63,
            "observed": "earliest A-wings armed only with lasers and jammers"
          },
          {
            "location": "/narrative/laterConfiguration",
            "printedPage": 63,
            "observed": "missile launchers later added and standard by New Republic"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "SOURCE_SILENT_CONFIRMED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "PDF_VERIFIED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "PDF_VERIFIED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [],
        "policies": [
          {
            "code": "A_WING_VARIANTS_AND_JAMMER",
            "detail": {
              "publishedPage": 63,
              "earlyConfiguration": {
                "lasers": true,
                "missiles": false,
                "jammer": true
              },
              "laterStockConfiguration": {
                "lasers": true,
                "missiles": true,
                "jammer": true,
                "missileAmmo": 12
              },
              "jammer": {
                "category": "ELECTRONIC_WARFARE",
                "requiresActivation": true,
                "adjacentShipsOnly": true,
                "eligibleSizes": "Colossal or smaller",
                "starfighterIntelligencePenalty": -5,
                "spaceTransportIntelligencePenalty": -2,
                "damageAttack": false
              },
              "missingKeysMustRemainAbsent": true
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [
          {
            "rowIndex": 0,
            "field": "sourcePage",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 0,
            "field": "batteryCount",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 1,
            "field": "sourcePage",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 1,
            "field": "hardwareCount",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 1,
            "field": "batteryCount",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 2,
            "field": "sourcePage",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 2,
            "field": "firingArc",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 2,
            "field": "batteryCount",
            "sourcePage": 63,
            "provenance": "KEY_NOT_STORED"
          }
        ],
        "unresolvedCanonicalScopes": [
          "LEGACY_MISSING_WEAPON_KEYS_AND_PAGE_PROVENANCE"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    },
    {
      "sourceEntryKey": "sotg-baudo-class-star-yacht",
      "cp16Index": 9,
      "printedName": "Baudo-class Star Yacht",
      "printedPage": 65,
      "originalPrintedFacts": {
        "type": "Colossal space transport",
        "cl": 6,
        "initiative": -3,
        "sensesPerception": 5,
        "defenses": {
          "reflex": 13,
          "flatFootedReflex": 11,
          "fortitude": 22,
          "armorBonus": 11,
          "damageReduction": 15,
          "shieldRating": 15
        },
        "durability": {
          "hitPoints": 60,
          "threshold": 72
        },
        "movement": {
          "characterScale": {
            "mode": "fly",
            "squares": 12
          },
          "starshipScale": {
            "mode": "fly",
            "squares": 5
          },
          "maxVelocityKmH": 1200
        },
        "fightingSpace": {
          "characterScaleSquares": "12x12",
          "starshipScaleSquares": "1",
          "cover": "total"
        },
        "combat": {
          "baseAttackBonus": 0,
          "grappleBonus": 32,
          "ranged": "light laser cannons +2"
        },
        "abilities": {
          "str": 34,
          "dex": 14,
          "con": "—",
          "int": 14
        },
        "skills": {
          "initiative": -3,
          "mechanics": 5,
          "perception": 5,
          "pilot": -3,
          "useComputer": 5
        },
        "crew": {
          "count": 1,
          "quality": "normal"
        },
        "passengers": 8,
        "cargo": {
          "number": 35,
          "unit": "tons"
        },
        "consumables": "1 month",
        "carriedCraft": "none",
        "hyperspace": {
          "hyperdrive": "x2",
          "backup": "x7",
          "navcomputer": "present"
        },
        "economics": {
          "availability": "Licensed",
          "newCredits": 400000,
          "usedCredits": 250000
        }
      },
      "originalAttackGroups": [
        {
          "weaponLabel": "light laser cannons (statblock plural)",
          "station": "gunner",
          "attackBonus": 2,
          "damage": "2d10x2",
          "firingArc": "SOURCE_SILENT_CONFIRMED",
          "narrativePhysicalCount": 1,
          "hardwareCountStatus": "PRINTED_SINGULAR_IN_NARRATIVE"
        }
      ],
      "sourceFieldStates": {
        "printedTypeLine": "PDF_VERIFIED",
        "challenge": "PDF_VERIFIED",
        "initiativeSenses": "PDF_VERIFIED",
        "defenses": "PDF_VERIFIED",
        "durability": "PDF_VERIFIED",
        "speed": "PDF_VERIFIED",
        "rangedAttack": "PDF_VERIFIED",
        "meleeAttack": "SOURCE_SILENT_CONFIRMED",
        "fightingSpace": "PDF_VERIFIED",
        "baseAttack": "PDF_VERIFIED",
        "attackOptions": "SOURCE_SILENT_CONFIRMED",
        "abilities": "PDF_VERIFIED",
        "skills": "PDF_VERIFIED",
        "crew": "PDF_VERIFIED",
        "capacity": "PDF_VERIFIED",
        "payload": "SOURCE_SILENT_CONFIRMED",
        "hyperdrive": "PDF_VERIFIED",
        "cost": "PDF_VERIFIED",
        "weaponAttackProfile": "PDF_VERIFIED"
      },
      "approvedDecision": {
        "order": 15,
        "decisionId": "SOTG-CP21-D15",
        "sourceEntryKey": "sotg-baudo-class-star-yacht",
        "cp16Index": 9,
        "printedName": "Baudo-class Star Yacht",
        "printedStartPage": 65,
        "approvedBy": "REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20",
        "approvalState": "APPROVED",
        "effectiveProjectionState": "APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED",
        "summary": "Baudo: accept one physically installed laser cannon from p65 prose, preserve printed plural attack label; crew 1 does not imply simultaneous pilot and gunner.",
        "confidence": "HIGH_COUNT_UNRESOLVED_OPERATION",
        "cp19Disposition": "NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS",
        "printedAlternatives": [
          {
            "location": "/narrative/laserCount",
            "printedPage": 65,
            "observed": "only a single laser cannon"
          },
          {
            "location": "/weaponTable/laserFamily",
            "printedPage": 65,
            "observed": "Light laser cannons (gunner)"
          }
        ],
        "originalFieldGroups": {
          "printedTypeLine": "PDF_VERIFIED",
          "challenge": "PDF_VERIFIED",
          "initiativeSenses": "PDF_VERIFIED",
          "defenses": "PDF_VERIFIED",
          "durability": "PDF_VERIFIED",
          "speed": "PDF_VERIFIED",
          "rangedAttack": "PDF_VERIFIED",
          "meleeAttack": "SOURCE_SILENT_CONFIRMED",
          "fightingSpace": "PDF_VERIFIED",
          "baseAttack": "PDF_VERIFIED",
          "attackOptions": "SOURCE_SILENT_CONFIRMED",
          "abilities": "PDF_VERIFIED",
          "skills": "PDF_VERIFIED",
          "crew": "PDF_VERIFIED",
          "capacity": "PDF_VERIFIED",
          "payload": "SOURCE_SILENT_CONFIRMED",
          "hyperdrive": "PDF_VERIFIED",
          "cost": "PDF_VERIFIED",
          "weaponAttackProfile": "PDF_VERIFIED"
        },
        "fieldOverrides": [],
        "attackGroupOverrides": [
          {
            "rowIndex": 0,
            "field": "hardwareCount",
            "newValue": 1,
            "reason": "Printed p65 narrative unambiguously specifies one physical laser cannon; original row had no hardwareCount key.",
            "originalPresent": false
          }
        ],
        "policies": [
          {
            "code": "BAUDO_SINGLE_CANNON_OPERATOR_SCOPE",
            "detail": {
              "publishedPage": 65,
              "installedCannonCount": 1,
              "printedWeaponLabel": "light laser cannons (statblock plural)",
              "attackBonus": 2,
              "damage": "2d10x2",
              "operatorRole": "gunner",
              "crewCount": 1,
              "noSecondCrewMemberInferred": true,
              "automaticSimultaneousPilotGunnerAttacks": false,
              "firingArc": "UNRESOLVED"
            },
            "runtimePermission": false
          }
        ],
        "legacyMissingRowKeys": [
          {
            "rowIndex": 0,
            "field": "sourcePage",
            "sourcePage": 65,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 0,
            "field": "hardwareCount",
            "sourcePage": 65,
            "provenance": "KEY_NOT_STORED"
          },
          {
            "rowIndex": 0,
            "field": "batteryCount",
            "sourcePage": 65,
            "provenance": "KEY_NOT_STORED"
          }
        ],
        "unresolvedCanonicalScopes": [
          "NARRATIVE_SINGULAR_VS_TABLE_PLURAL_AND_LEGACY_KEYS"
        ],
        "physicalMountCertificateGranted": false,
        "foundryAutomatedAttackGranted": false,
        "productionHydrationPermitted": false
      }
    }
  ],
  "legacyPackCandidates": [
    {
      "decisionId": "SOTG-CP21-D01",
      "sourceEntryKey": "sotg-advanced-v-19-torrent-starfighter",
      "packName": "vehicles-starfighters",
      "documentId": "0320533019f46bf9",
      "name": "Advanced V-19 Torrent Starfighter",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D02",
      "sourceEntryKey": "sotg-recusant-class-light-destroyer",
      "packName": "vehicles-capital-ships",
      "documentId": "4a12db341764d71c",
      "name": "Recusant-Class Light Destroyer",
      "sourcebook": "",
      "page": null,
      "weaponCount": 5,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D03",
      "sourceEntryKey": "sotg-kuat-drive-yards-pellaeon-class-star-destroyer",
      "packName": "vehicles-capital-ships",
      "documentId": "9d7f42e1fb7dcda9",
      "name": "Pellaeon-Class Star Destroyer",
      "sourcebook": "",
      "page": null,
      "weaponCount": 5,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D04",
      "sourceEntryKey": "sotg-immobilizer-418-interdictor-class-heavy-cruiser",
      "packName": "vehicles-capital-ships",
      "documentId": "c1728af79988eab9",
      "name": "Immobilizer 418 Interdictor-Class Heavy Cruiser",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D05",
      "sourceEntryKey": "sotg-junker-tye-wing",
      "packName": "vehicles-starfighters",
      "documentId": "6b2f0741da3cdda3",
      "name": "Junker TYE-Wing",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D06",
      "sourceEntryKey": "sotg-koensayr-manufacturing-btl-58-k-wing",
      "packName": "vehicles-starfighters",
      "documentId": "e757ca9a96c28a41",
      "name": "K-Wing Assault Starfighter",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D09",
      "sourceEntryKey": "sotg-eclipse",
      "packName": "vehicles-capital-ships",
      "documentId": "bd0c972f8a5599ab",
      "name": "Eclipse-Class Star Dreadnought",
      "sourcebook": "",
      "page": null,
      "weaponCount": 6,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D10",
      "sourceEntryKey": "sotg-theta-class-shuttle",
      "packName": "vehicles-space-transports",
      "documentId": "fa1f202bc57c3636",
      "name": "Theta-Class Shuttle",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D11",
      "sourceEntryKey": "sotg-sienar-fleet-systems-tie-bomber",
      "packName": "vehicles-starfighters",
      "documentId": "2ec63b561379cc09",
      "name": "TIE Bomber",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D12",
      "sourceEntryKey": "sotg-incom-t-65xj3-x-wing-starfighter",
      "packName": "vehicles-starfighters",
      "documentId": "622924c83d0c90be",
      "name": "T-65XJ3 X-Wing Starfighter",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D13",
      "sourceEntryKey": "sotg-incom-subpro-arc-170-starfighter",
      "packName": "vehicles-starfighters",
      "documentId": "a9b019928bcb59bc",
      "name": "ARC-170 Starfighter",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D14",
      "sourceEntryKey": "sotg-alliance-a-wing-starfighter",
      "packName": "vehicles-starfighters",
      "documentId": "9a8e2af942c66079",
      "name": "A-Wing Starfighter",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    },
    {
      "decisionId": "SOTG-CP21-D15",
      "sourceEntryKey": "sotg-baudo-class-star-yacht",
      "packName": "vehicles-space-transports",
      "documentId": "fd61d4e5c62bc61e",
      "name": "Baudo-Class Star Yacht",
      "sourcebook": "",
      "page": null,
      "weaponCount": 0,
      "sourceBindingVerified": false,
      "legacyPackCandidateOnly": true
    }
  ]
});
