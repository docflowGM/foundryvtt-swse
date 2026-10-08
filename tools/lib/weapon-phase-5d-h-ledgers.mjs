// Phase 5D-H -- audit ledgers (DATA, not logic). Used ONLY by tools/census-weapon-executable-field-closure.mjs; no runtime module imports this.
// Every executable canonical weapon field / name-text site must be classified here or by a deterministic probe; anything unclassified
// fails the census `--check`. Nothing is reclassified to "display" to manufacture a zero: deferred entries name their reason and owner.

// ---------------------------------------------------------------------------------------------------------------------------------
// 1. Canonical-weapon-combat name/text heuristic sites
// ---------------------------------------------------------------------------------------------------------------------------------
// classes:
//   DISPLAY             message / label / log / chat text (a name is shown, never decides anything)
//   TARGET_SIDE         target actor species/type/ability text (a defender property, not the weapon/ability identity under audit)
//   LEGACY_GATED        reachable only for weapons WITHOUT a canonical identity (the canonical branch returns first)
//   IDENTITY_FALLBACK   ability matched by display name ONLY when the item carries no canonical identity (canonical identity decides first)
//   PROJECTION          reads Item `system.*` fields that are GENERATED projections of canonical data (never a name/description)
//   WEAPON_DEFINITION   reads a structured canonical definition field (schemaFamily/subcategory ...)
//   NON_COMBAT_DOMAIN   item defaults / sheet builders, not a combat decision
//   CANONICAL_RESIDUAL  a canonical-path mechanical decision that still depends on display text/name (COUNTED; owner named)
export const HEURISTIC_CLASSES = ['DISPLAY', 'TARGET_SIDE', 'LEGACY_GATED', 'IDENTITY_FALLBACK', 'PROJECTION', 'WEAPON_DEFINITION', 'NON_COMBAT_DOMAIN', 'CANONICAL_RESIDUAL'];

// ordered; first match wins. [fileRegex, lineRegex, class, reason, owner?]
const any = /./;
export const HEURISTIC_RULES = [
  [any, /notifications|flavor:|title:|label:|label \|\||sourceName|narration|<h3>|<div|\bsource: (weapon|item)\?\.name|speaker|weaponName:|\.description\)|breakdown\.push|ActionChat|question:|swseLogger|console\.|`[^`]*\$\{[^}]*name[^}]*\}[^`]*`|name: weapon\.name|id: `\$\{|source: item\.name|return weapon\?\.id|weapon\?\.name \?\? ''|weapon\?\.name \?\? null|\.description \|\| item\.name/, 'DISPLAY', 'message/label/log text'],
  [/weapon-runtime\/attack-consumer\.js$/, /refusing to treat/, 'DISPLAY', 'error message text'],
  [/weapon-runtime\/legacy-adapter\.js$/, any, 'LEGACY_GATED', 'the legacy adapter exists only for weapons without a canonical identity'],
  [/weapon-runtime\/weapon-descriptor\.js$/, /subcategory/, 'WEAPON_DEFINITION', 'reads the structured canonical schemaFamily'],
  [/weapon-runtime\/(ability-selector|ability-relations)\.js$/, /legacyBase|legacyKeys|\.name/, 'IDENTITY_FALLBACK', 'ability display-name keys used only when the item carries no canonical identity'],
  [/weapon-runtime\/attack-shape\.js$/, /item\?\.name/, 'IDENTITY_FALLBACK', 'name parenthetical = legacy carrier of a feat choice, ignored when a structured choice exists'],
  [/weapon-runtime\/proficiency-resolver\.js$/, /const name = String\(item\?\.name/, 'IDENTITY_FALLBACK', 'proficiency entitlements: canonical feat identity + stored structured choice decide; the title is parsed only for an ability without a canonical identity'],
  [/combat\/multi-attack\.js$/, /weapon\.name \|\| ''/, 'LEGACY_GATED', 'getWeaponGroup/isDoubleWeapon: after the canonical branch has returned'],
  [/combat\/multi-attack\.js$/, /item\.name\?\.toLowerCase\(\) \|\| ''|extractWeaponGroupFromFeat\(item\.name\)/, 'LEGACY_GATED', 'getDouble/TripleAttackGroups: legacy group-name path (canonical weapons use actorHasMultiAttackFor identity join)'],
  [/combat\/multi-attack\.js$/, /\(item\.name \?\? ''\)\.toLowerCase\(\)/, 'IDENTITY_FALLBACK', 'multiattack proficiency: canonical slug first, name only for an ability without identity'],
  [/combat\/multi-attack\.js$/, /system\??\.proficient/, 'LEGACY_GATED', 'canonical proficiency (selected form) wins; Item flag only for non-canonical weapons'],
  [/rolls\/enhanced-rolls\.js$/, /item\.name\?\.toLowerCase\(\)\.includes\('(improved )?evasion'\)/, 'LEGACY_GATED', 'legacy (non-canonical) autofire branch only'],
  [/rolls\/enhanced-rolls\.js$/, /system\.description/, 'DISPLAY', 'chat enhancement text'],
  [/combat-option-resolver\.js$/, /canonicalFeatSlug\(i\)/, 'IDENTITY_FALLBACK', 'Weapon Finesse: canonical slug first'],
  [/combat-option-resolver\.js$/, /sourceName = item\.name|textMatchesAny\(targetText/, 'DISPLAY', 'option source label / target-side text'],
  [/combat-option-resolver\.js$/, /item\.name|textMatchesAny/, 'DISPLAY', 'breakdown label / source name inside rule handlers'],
  [/combat-roll-math\.js$/, /canonicalFeatSlug|item\.name \|\| ''/, 'IDENTITY_FALLBACK', 'ability identity first, display name only without identity'],
  [/combat-roll-math\.js$/, /weapon\?\.name|system\.(weaponCategory|subcategory)|normalizeProficiencyKey\(item\.name\)|system\?\.proficient|weapon\?\.system\?\.proficient|const explicit = weapon/, 'LEGACY_GATED', 'legacy attack-bonus/proficiency path (canonical weapons resolve proficiency through the weapon-runtime resolver)'],
  [/combat-roll-math\.js$/, /weaponCategory|\.category/, 'PROJECTION', 'effect-intent context built from generated Item projection fields'],
  [/combat-stat-rules\.js$/, /weapon\?\.name|system\.(weaponCategory|subcategory)/, 'LEGACY_GATED', 'text classifiers: canonical weapons return from canonicalKind() first'],
  [/combat-stat-rules\.js$/, /canonicalFeatSlug/, 'IDENTITY_FALLBACK', 'ability identity first'],
  [/combat-stat-rules\.js$/, /sourceName/, 'DISPLAY', 'modifier source label'],
  [/damage-type-rules\.js$/, /weapon\?\.name/, 'LEGACY_GATED', 'weaponSystemDamageTypes: used only when the weapon has no canonical identity'],
  [/damage-type-rules\.js$/, /item\.name \|\| /, 'DISPLAY', 'immunity/resistance source label'],
  [/dual-wield-combat-shape-resolver\.js$/, /weaponText|weapon\?\.name/, 'LEGACY_GATED', 'after the canonical isDoubleWeapon/isLightWeapon branches'],
  [/dual-wield-combat-shape-resolver\.js$/, /system\?\.proficient/, 'LEGACY_GATED', 'canonical proficiency wins'],
  [/dual-wield-combat-shape-resolver\.js$/, /canonical \?\? normalizeKey\(item\.name\)/, 'IDENTITY_FALLBACK', 'Dual Weapon Mastery: canonical slug first'],
  [/weapon-target-gate-classifiers\.js$/, /weaponText|weaponDamageText|textMatchesAny|weapon\?\.name|system\.fireMode/, 'LEGACY_GATED', 'legacy text matching: canonical weapons are matched through the structured descriptor first'],
  [/weapon-target-gate-classifiers\.js$/, /item\?\.name|item\.name/, 'TARGET_SIDE', 'target actor owned-item text / canonical-slug fallback'],
  [/feat\/scoped-combat-feat-resolver\.js$/, /entry\.name|weapon\?\.name|system\.(weaponCategory|subcategory)/, 'LEGACY_GATED', 'weaponCandidates/selectedChoiceValue: reached after the canonical selector join'],
  [/feat\/scoped-combat-feat-resolver\.js$/, /item\?\.name/, 'IDENTITY_FALLBACK', 'featBaseKey: canonical slug first; choice parenthetical = legacy carrier'],
  [/items\/item-defaults\.js$/, any, 'NON_COMBAT_DOMAIN', 'item defaults / sheet builder'],
  [/rolls\/roll-config\.js$/, /normalizeKey\(item\?\.name\)|canonicalId/, 'IDENTITY_FALLBACK', 'actorHasNamedItem: canonical ability identity first'],
  [/rolls\/roll-config\.js$/, /weapon\.name \?\? ''|system\.(weaponCategory|subcategory)|rangeProfile|weaponCategory/, 'LEGACY_GATED', 'stun/range heuristics: canonical weapons return from their structured capability first'],
  [/rolls\/roll-config\.js$/, /i\?\.name/, 'DISPLAY', 'charging label text'],
];

// ---------------------------------------------------------------------------------------------------------------------------------
// 2. Field-family consumer ledger (57 EXECUTION rule families of the 5B consumption map)
// ---------------------------------------------------------------------------------------------------------------------------------
// status: CONSUMED (probe string must appear in the cited consumer) | CONSUMED_VIA_DUPLICATE (the same fact is consumed through another
// structured field) | OPERATION_FAMILY (derived from the per-key operation census) | PARTIAL (named residual) | DEFERRED (named reason + owner)
const W = 'scripts/items/weapon-runtime/';
export const FIELD_CONSUMERS = {
  '3b.stats.container': { status: 'CONSUMED', file: `${W}weapon-runtime-resolver.js`, probe: 'canonicalStats', note: 'resolver exposes the container to every consumer' },
  '3b.resource': { status: 'CONSUMED', file: `${W}resource-resolver.js`, probe: 'resourceProfiles', note: 'resource pools / capacity (5D-D)' },
  '3b.profile.conditional': { status: 'PARTIAL', file: `${W}special-mechanics.js`, probe: 'conditionalModifiers', consumed: ['conditionalModifiers'], deferred: ['activationRequirements', 'conditionalRangeRules'], owner: 'conditional activation / range conditions (post-5D-H)', note: 'conditional attack modifiers execute (AUTO/PROMPT); activationRequirements are reconciled but not enforced' },
  '3b.profile.area': { status: 'CONSUMED', file: `${W}area-shape.js`, probe: 'resolveAreaShape', note: '5D-G/5D-H' },
  '3b.profile.attackResolution': { status: 'CONSUMED', file: `${W}area-shape.js`, probe: 'attackResolution', note: 'defense + onMiss' },
  '3b.profile.effects': { status: 'PARTIAL', file: `${W}special-mechanics.js`, probe: 'criticalEffects', consumed: ['criticalEffects', 'hit effects (ct-rider, status-condition, damage-rider)'], deferred: ['persistent-effect', 'return-recovery', 'special-action', 'activation-effect'], owner: 'persistent effects / special actions subsystem', note: 'AUTO families execute at Apply Damage; DEFER families are named in the 5D-E census' },
  '3b.profile.damage': { status: 'CONSUMED', file: `${W}damage-profile-resolver.js`, probe: 'damageMultiplier', note: '5D-C/5D-E' },
  '3b.profile.damageComponents': { status: 'CONSUMED', file: `${W}damage-profile-resolver.js`, probe: 'components', note: '5D-C' },
  '3b.profile.firing': { status: 'CONSUMED', file: `${W}fire-state.js`, probe: 'firingConstraints', note: '5D-G temporal families' },
  '3b.profile.prepared': { status: 'CONSUMED', file: `${W}fire-state.js`, probe: 'preparedAttack', note: '5D-G required + 5D-H optional prepared attack' },
  '3b.profile.qualities': { status: 'CONSUMED', file: `${W}weapon-descriptor.js`, probe: 'qualities', note: 'descriptor tokens + attack-shape' },
  '3b.profile.qualities.inaccurate': { status: 'CONSUMED', file: `${W}canonical-range.js`, probe: 'qualityEffects', note: '5D-D range quality effects' },
  '3b.profile.range': { status: 'CONSUMED', file: `${W}canonical-range.js`, probe: 'allowedBands', note: '5D-D' },
  '3b.profile.rof': { status: 'CONSUMED', file: `${W}attack-shape.js`, probe: 'rateOfFire', note: '5D-F' },
  '3b.profile.resourceConsumption': { status: 'CONSUMED', file: `${W}canonical-resource.js`, probe: 'resourceConsumption', note: '5D-D' },
  '3b.profile.schemaFamily': { status: 'CONSUMED', file: `${W}attack-shape.js`, probe: 'schemaFamily', note: '5D-A/5D-F' },
  '3b.profile.stun': { status: 'CONSUMED', file: `${W}attack-consumer.js`, probe: 'stun', note: '5D-C/5D-E' },
  '3b.profile.wielding': { status: 'DEFERRED', owner: 'wielding / two-hand state (post-5D-H)', reason: 'profile-level wielding fact (1 path); the wielding state model is not part of the attack path', populatedIdentities: 1 },
  '3b.baseDamage': { status: 'CONSUMED_VIA_DUPLICATE', file: `${W}damage-profile-resolver.js`, probe: 'damageMultiplier', note: 'canonicalStats.baseDamage mirrors the selected attack profile damage, which the damage-profile resolver consumes (5D-C)' },
  '3b.config': { status: 'CONSUMED', file: `${W}weapon-runtime-resolver.js`, probe: 'configurationStates', note: 'configuration selection (5B/5D-B)' },
  '3b.durability': { status: 'DEFERRED', owner: 'item durability / crafting (post-5D-H)', reason: 'objectDurability (3 identities: break DC/DR as an object) and constructionRules (3 identities: crafting) are not attack mechanics', populatedIdentities: 6 },
  '3b.dr': { status: 'CONSUMED', file: `${W}damage-profile-resolver.js`, probe: 'damageReductionInteraction', note: '5D-E' },
  '3b.damageType': { status: 'CONSUMED', file: `${W}damage-profile-resolver.js`, probe: 'damageType', note: '5D-C' },
  '3b.defensive': { status: 'DEFERRED', owner: 'reaction/defense workflow (Block, Deflect rolls)', reason: 'defensiveInteractions (7 identities: Block/Deflect Use the Force modifiers carried by the wielded lightsaber) need the reaction roll to read the wielded weapon', populatedIdentities: 7 },
  '3b.operatingModes': { status: 'CONSUMED', file: `${W}weapon-runtime-resolver.js`, probe: 'operatingModes', note: '5B-R/5D-B' },
  '3b.payload': { status: 'CONSUMED', file: `${W}weapon-runtime-resolver.js`, probe: 'payloads', note: '5D-B/5D-C' },
  '3b.range': { status: 'CONSUMED', file: `${W}canonical-range.js`, probe: 'resolveCanonicalRange', note: '5D-D' },
  '3b.rateOfFire': { status: 'CONSUMED', file: `${W}attack-shape.js`, probe: 'rateOfFire', note: '5D-F' },
  '3b.size': { status: 'CONSUMED', file: `${W}weapon-descriptor.js`, probe: 'sizeIndex', note: 'light-weapon join (5D-H)' },
  '3b.stun': { status: 'CONSUMED', file: `${W}attack-consumer.js`, probe: 'effectiveDamageMode', note: '5D-E' },
  '3b.triggered': { status: 'PARTIAL', file: `${W}special-mechanics.js`, probe: 'triggeredEffects', consumed: ['triggeredEffects (AUTO families)'], deferred: ['persistent / return-recovery triggered effects'], owner: 'persistent effects / special actions subsystem', note: '17 identities; AUTO riders execute, DEFER families are named in the 5D-E census' },
  '3b.wielding': { status: 'DEFERRED', owner: 'wielding / two-hand state (post-5D-H)', reason: 'wieldingRules (15 identities, e.g. requires-two-hands when mounted) need a wielding state model; the mounted-on-rifle condition is evaluated for double-weapon availability only', populatedIdentities: 15 },
  '3b.qualityParameters': { status: 'DEFERRED', owner: 'quality parameter consumers (post-5D-H)', reason: 'qualityParameters are passed through the resolver; reach/thrown/etc. parameter values have no dedicated consumer beyond canonical-range qualityEffects', populatedIdentities: null },
  '3b.operation.container': { status: 'OPERATION_FAMILY' },
  '3b.proficiencyRules': { status: 'CONSUMED_VIA_DUPLICATE', file: `${W}proficiency-resolver.js`, probe: 'speciesOverrides', note: 'species/ability proficiency routes are consumed through selectors.speciesOverrides / abilityOverrides (5D-A)' },
  '3b.qualities': { status: 'CONSUMED', file: `${W}weapon-descriptor.js`, probe: 'qualities', note: 'descriptor tokens' },
  '3b.family': { status: 'CONSUMED', file: `${W}proficiency-resolver.js`, probe: 'schemaFamily', note: '5D-A' },
  '4h.auth.ruleSelectors.riders': { status: 'DEFERRED', owner: 'recommendation / ability-applicability planner', reason: 'authorities[].ruleSelectors.abilityRestrictions are the 4H planner copy of the weapon-ability relation corpus; execution reads the relations (ability-relations.js), not this copy', populatedIdentities: null },
  '4h.proficiency': { status: 'CONSUMED', file: `${W}proficiency-resolver.js`, probe: 'proficiency', note: '5D-A' },
  '4h.selectors.exec': { status: 'CONSUMED', file: `${W}weapon-descriptor.js`, probe: 'selectors', note: 'descriptor + proficiency abilityOverrides' },
  '4h.selectors.attr': { status: 'CONSUMED_VIA_DUPLICATE', file: `${W}special-mechanics.js`, probe: 'conditionalModifiers', note: 'attributeRequirements (1 identity, Arg\'garok) duplicates the profile conditionalModifier "wielder Strength below 15", which executes as a conditional attack modifier' },
};

// operation family -> owner when its executable keys are not (all) consumed
export const OPERATION_OWNERS = {
  'ability-compatibility': 'grapple / Pin / Trip phase (allowedFeats/disallowedFeats) and ability-compatibility consumers',
  'ammo-resource-reload': 'resource / reload rules (inventory phase)',
  'area-splash-burst': 'area attack consumers',
  'attack-modifiers-and-penalties': 'conditional attack-modifier evaluation (post-5D-H)',
  'concealment-stealth-sensing': 'stealth / sensing subsystem',
  'condition-and-persistent-effects': 'persistent effects / poison subsystem',
  'configuration-and-wielding': 'wielding & configuration state (post-5D-H)',
  'crew-and-emplacement': 'heavy-weapon crew / emplacement phase',
  'damage-modifiers': 'damage modifier consumers (post-5D-H)',
  'defense-and-reaction-interactions': 'reaction/defense workflow (Block, Deflect rolls)',
  'economics-and-variants': 'store (not an attack field)',
  'grab-grapple-restrain': 'grapple / Pin / Trip phase',
  'prepared-attacks': 'prepared attack consumer (5D-H)',
  'proficiency-routes': 'proficiency resolver',
  'reach-and-threat': 'threat / reach phase',
  'stun-ion-damage-modes': 'stun / ion special modes',
  'utility-and-movement': 'utility actions',
};
// operation keys that are NOT executable (the family classification above is by topic; these keys are store/display/provenance facts)
export const OPERATION_NON_EXECUTABLE = [
  [/(Credits|Cost|Availability|Pricing|gearTemplate|constructionDC|namedCharacterVariant|optionalCommercialVariants|variantPricing|commonAccessoriesNotIncludedInListedCost)$/i, 'STORE'],
  [/^(sourceInternalNote|flavorMentionsDeflectingMeleeAttacks|twoHandedStrengthRuleExplicitlyHighlighted|ordinaryCommercialAvailability|shellsStatisticallyIdenticalToGrenades|laterVersionConcealment)$/, 'DISPLAY'],
];

// operation.* keys whose fact is ALSO carried by a structured field a canonical consumer executes (the operation key is a certified
// duplicate / player-text echo). Each entry must prove its consumer with a probe string in the cited file.
// [keyRegex, structured carrier, consumer file, probe]
export const OPERATION_DUPLICATES = [
  [/^(burstRadiusSquares|coneLengthSquares|splashRadiusSquares|splashSquares|nonadjacentSplashRadiusSquares|areaAttack)$/, 'attackProfiles[].area', `${W}area-shape.js`, 'resolveAreaShape'],
  [/^defaultAutofireAreaSquares$/, 'generic autofire 2x2 area (Core: Area Attacks / Autofire)', 'scripts/combat/rolls/enhanced-rolls.js', 'autofire-area'],
  [/^(mustReloadAfterEachShot|mustReloadAfterEveryShot)$/, 'attackProfiles[].firingConstraints.reloadRequiredAfterEachShot', `${W}fire-state.js`, 'reloadRequiredAfterEachShot'],
  [/^autofireAllowed$/, 'attackProfiles[].rateOfFire', `${W}attack-shape.js`, 'rateOfFire'],
  [/^(multiShotAbilitiesProhibited|prohibitsMultiShotAbilities|cannotUseAbilitiesConsumingMoreThanOneShotPerRound|rapidShotAllowed)$/, 'firingConstraints.prohibitsMultiShotAbilities + PROHIBITED relation', `${W}attack-shape.js`, 'prohibitsMultiShotAbilities'],
  [/^rapidShotReset$/, 'operation.rapidShotReset.requiredActionBeforeNextShot (read directly)', `${W}fire-state.js`, 'requiredActionBeforeNextShot'],
  [/^(primeAction|primeTiming)$/, 'attackProfiles[].preparedAttack', `${W}fire-state.js`, 'preparedAttack'],
  [/^braceRequiresExtendedStock$/, 'firingConstraints.braceRule', `${W}attack-shape.js`, 'braceRule'],
  [/^targetSizeAttackPenalty$/, 'attackProfiles[].conditionalModifiers (targetSize)', `${W}special-mechanics.js`, 'attack-modifier-auto'],
  [/^(attackPenaltyBelowMinimumStrength|minimumStrengthWithoutPenalty)$/, 'attackProfiles[].conditionalModifiers ("wielder Strength below N")', `${W}special-mechanics.js`, 'attack-modifier-prompt'],
  [/^(additionalAttackPenalty|additionalAttackPenaltyWith)$/, 'EXTRA_ATTACK_PENALTY relation / multi-attack conditionalModifiers', `${W}special-mechanics.js`, 'multi-attack-interaction'],
  [/^(alwaysStun|nativeStunDamage|nativeStunOnly|stunOnly)$/, 'attackProfiles[].stun.capability = native-stun', `${W}attack-consumer.js`, 'native-stun'],
  [/^(ionDamage|ionDamageRulesApply)$/, 'attackProfiles[].damageType (ion)', `${W}damage-profile-resolver.js`, 'damageType'],
  [/^cannotBeNegatedByDeflect$/, 'CANNOT_NEGATE_ATTACK relation', `${W}ability-relations.js`, 'CANNOT_NEGATE_ATTACK'],
  [/^(configurations|configurationResolution|doubleWeapon|doubleWeaponFullRoundAttack|doubleWeaponFullRoundAttackPenaltyPerEnd|longHaftFormDoubleWeapon|hostWeaponAugmentation)$/, 'configurationStates / modeProfiles / conditionalQualities', `${W}attack-shape.js`, 'doubleWeapon'],
  [/^(allowedFeats|disallowedFeats)$/, 'PROHIBITED relation (multi-shot) ; grapple feats are the grapple phase', `${W}attack-shape.js`, 'abilityProhibitedForShape'],
];

// manifest classification overrides (named, justified): scope vocabulary the deterministic rule cannot judge on its own
export const MANIFEST_OVERRIDES = {
  'Knife Trick': { group: 'B', why: 'the printed scope is a concealed weapon (knife/dagger/blade are kind words); there is no structured concealability selector, so only the exact Knife identity matches -> DATA_COMPLETENESS' },
};

// Area-enabled forms with no intrinsic geometry that were SOURCE-REVIEWED: the published rule gives no radius/shape (never invented)
export const SOURCE_SILENT_GEOMETRY = [
  { identityKey: 'weapon-adhesive-grenade', book: 'Knights of the Old Republic Campaign Guide', page: '67-68', evidence: 'Targets "in an adhesive grenade\'s blast radius" grapple against the attack roll; no radius is published.' },
  { identityKey: 'weapon-cryoban-grenade', book: 'Knights of the Old Republic Campaign Guide', page: '68-69', evidence: 'The grenade coats those "in its blast radius"; table footnote "Area attack weapon"; no radius is published.' },
  { identityKey: 'weapon-remote-grenade', book: 'Knights of the Old Republic Campaign Guide', page: '180', evidence: 'Description covers remote detonation, the 100 credit detonator and the 100 m safety rule only; no area is published.' },
];

// per operation topic family: why unconsumed keys remain and where they belong (the 5D-I input; no key is implemented to shrink a counter)
export const OPERATION_FAMILY_NOTES = {
  'ability-compatibility': { reason: 'grapple-feat allow/deny lists, crystal/tagger compatibility and upgrade restrictions need the grapple and upgrade subsystems', phase: '5D-I: remaining ability relations / grapple-Pin-Trip' },
  'ammo-resource-reload': { reason: 'mounting, power-source requirements, single-load and reload special cases need inventory/reload rules beyond per-shot resource spending', phase: '5D-I: special reload / recovery + host-weapon augmentation' },
  'area-splash-burst': { reason: 'detonation timing, blast effects, braced autofire area expansion and shrapnel are effects layered on the (already consumed) area geometry', phase: '5D-I: targeting / area effects' },
  'attack-modifiers-and-penalties': { reason: 'conditional modifiers, aim/target rules, attacks of opportunity and range tweaks need a general conditional attack-modifier evaluator', phase: '5D-I: targeting / attack resolution' },
  'concealment-stealth-sensing': { reason: 'weapon-driven concealment, silence and sensing belong to the stealth/sensing subsystem', phase: '5D-I: concealment / silent operation' },
  'condition-and-persistent-effects': { reason: 'poison delivery, persistent effects and venom need the persistent/status delivery subsystem', phase: '5D-I: persistent / status delivery' },
  'configuration-and-wielding': { reason: 'assembly/switch actions, two-hand rules and size gates need a wielding and configuration state model', phase: '5D-I: wielding constraints' },
  'crew-and-emplacement': { reason: 'crew roles/tripod rules belong to the heavy-weapon crew model', phase: '5D-I: crew / emplacement' },
  'damage-modifiers': { reason: 'object/vehicle damage rules, DR for the weapon as an object and damage-threshold tweaks need dedicated damage modifier consumers', phase: '5D-I: remaining damage modifiers' },
  'defense-and-reaction-interactions': { reason: 'Block/Deflect Use the Force modifiers and disarm defenses need the reaction roll to read the wielded weapon', phase: '5D-I: reaction / defense workflow' },
  'grab-grapple-restrain': { reason: 'grab/grapple/net rules belong to the grapple subsystem', phase: '5D-I: grapple / snare / net' },
  'proficiency-routes': { reason: 'species/ability proficiency routes are consumed through selectors.speciesOverrides/abilityOverrides; these operation echoes have no separate consumer', phase: '5D-I: confirm duplicates, retire echoes' },
  'reach-and-threat': { reason: 'reach and threatened squares need a threat/reach model', phase: '5D-I: special movement / reach' },
  'stun-ion-damage-modes': { reason: 'remaining stun/ion special modes (overcharge, burnout, simultaneous components) need special-damage consumers', phase: '5D-I: special damage modes' },
  'utility-and-movement': { reason: 'utility actions (ascension) belong to special movement', phase: '5D-I: special movement / reach' },
};
