SWSE Equipment Ecosystem - E2B-S1 Source Review and Proposed Canonical Anatomy Requirements

Prepared independently for project-owner review. 2026-10-16.
Repository: docflowGM/foundryvtt-swse
Equipment branch/PR: audit/equipment-ecosystem-e0-e1 / draft PR #1056
Basis: Supplied SWSE printed PDFs, verified visually at the pages specified below; companion _djvu.txt files used for search, not as final authority. The repository’s docs/audits/swse-species-implementation-status.md was consulted for existing publication-profile IDs.
Status: SOURCE_REVIEWED_SPECIFICATION, not committed, not schema implemented, not gameplay certified. Source verification is restricted to the identified cases; not a claim that every physical characteristic of every published species has been exhausted.

I. Evidence and mandatory interpretation boundaries

Definitions:

* Source-confirmed anatomy = published description or species trait on a visually checked printed page.
* Direct mechanical entitlement = the publication explicitly grants a capacity, restriction, or modifier.
* Design proposal = a suggested representation or system integration, not a published mechanical rule.
* Unresolved = the source does not establish sufficient detail to safely grant capabilities.

Do not infer that additional arms grant additional attacks. Do not infer that an ability to hold an item permits wielding, attacking, or general-purpose manipulation. Do not treat locomotion limbs, natural weapons, facial tendrils, or a creature’s appendage count as extra equipment hands without explicit support. Continue treating two ordinary arms as the approved software fallback, not a universal assertion about SWSE biology. A selected complete-snapshot species profile must never inherit rules-bearing anatomy from an incompatible base publication.

II. Printed-page verified cases

E2B-RD-01 - Codru-Ji

Primary: Legacy Era Campaign Guide, printed p. 13 (PDF image page 14); physical description continues from printed p. 12 (PDF image page 13).
Repository profile: codru-ji-leg-2c-03.

Verified:

* Adult Codru-Ji have four arms and two legs; the juvenile form differs considerably (Wyrwulves), so normal adult profile must not be extrapolated to juveniles.
* Extra Arms expressly lets them hold up to four items or weapons at once.
* They can wield two two-handed weapons simultaneously.
* Extra Arms explicitly does not grant extra attacks.
* Separate Skilled Grappler rule: +5 species bonus to grab attacks. It is not a general +5 to all grapple checks. The old species sidecar’s +2 grapple value conflicts with the printed rule and must be logged separately; do not repair bonuses within equipment-anatomy scope.

Required anatomy behavior, subject to final schema approval: four individually distinct general-purpose manipulator arms. The four-item and two-two-handed-weapon consequences require E3 capability/allocation tests, not extra-attack creation. Combat bonus data stays in its existing authority.

E2B-RD-02 - Ryn

Primary: Scum and Villainy, printed p. 11 (PDF image page 12).
Repository profile: ryn-sv-2f-06.

Verified:

* A Ryn has a prehensile tail that can effectively hold but not wield a Small or smaller item.
* A Medium or larger item held by the tail makes the Ryn encumbered and considered to carry a heavy load.
* The source does not grant tail-based attacks or general-purpose hand capability.

Required anatomy behavior: two ordinary arms plus an independent restricted tail in the approved species profile. Tail: holding capability, wielding prohibited; size-conditioned carrying/load behavior must be preserved, not approximated as a blanket ban on Medium items. General manipulation beyond holding is not established (unknown until separately justified). Keep the load calculation with the existing encumbrance authority, not the anatomy resolver.

E2B-RD-03 - Trianii

Primary: Galaxy at War, printed p. 16 (PDF image page 17); species trait begins printed p. 15 (PDF image page 16).
Repository profile: trianii-gaw-2i-06.

Verified:

* Prehensile Tail: effectively holds, does not wield, Small or smaller items.
* Holding a Medium or larger item with the tail imposes encumbered/heavy-load treatment.
* Separate natural claw weapons do not make the tail a weapon-gripping appendage.

Required anatomy behavior: same tail capability/restriction semantics as Ryn, but attach evidence and data to the independent Galaxy at War Trianii profile, not to Ryn or a shared base species sidecar. This additional case means an E2B pass covering only Codru-Ji and Ryn would be incomplete.

E2B-RD-04 - Krevaaki

Primary: The Unknown Regions, printed p. 13 (PDF image page 14); species entry starts printed p. 12.
Repository: publication-specific UR profile; another Krevaaki treatment exists in Jedi Academy Training Manual, and complete publication snapshots must remain isolated.

Verified:

* Adult Krevaaki possess eight tentacles: typically six used for locomotion, two dominant tentacles functioning like humanoid arms and hands.
* The species trait expressly identifies two dominant tentacles used like arms/hands; the other tentacles are not thereby authorized as ordinary weapon hands.
* Their separate +2 species bonuses to Climb and grapple checks are not appendage-count bonuses.

Required anatomy behavior: two ordinary manipulators of type tentacle in an adult UR-profile Krevaaki, plus non-manipulator locomotion appendages only if the eventual model explicitly represents them. Do not award eight equipment manipulators. The other publication’s species data must be reviewed independently before carrying the same new anatomy field there.

E2B-RD-05 - Killik (typical Medium)

Primary: The Unknown Regions, printed p. 131 (PDF image page 132); preceding description printed p. 130.
Repository profile: killik-ur-2b-12.

Verified:

* A typical Killik uses four limbs as arms and hands; other limbs provide locomotion.
* Multiple Limbs: reduces the penalty to attack rolls by 2 when making multiple attacks.
* Killiks exhibit substantial variation in size and form; the presented Medium-size traits apply to typical Medium Killiks, not automatically every hive/size/variant.
* The printed trait does not say additional attacks are granted and does not explicitly repeat Codru-Ji’s four-held-items / two-two-handed-weapons entitlement.

Required anatomy behavior: four manipulators for the specific verified typical Medium variant. Keep the -2 multiattack-penalty mechanical rule separate from anatomy; do not grant additional attack actions or copy Codru-Ji-specific text. Variants beyond the described typical phenotype require additional source/GM-defined evidence.

E2B-RD-06 - Optional near-Human Additional Arms trait

Primary: The Unknown Regions, printed pp. 17-18 (trait-generation instructions p. 17, Table 1-4 p. 18; PDF image pages 18-19).

Verified:

* A player/GM may select one near-Human trait replacing the Human bonus feat or bonus trained skill, subject to the book’s near-Human construction method and GM approval.
* Additional arms is an optional chosen trait, granting up to two additional arms.
* When making multiple attacks, the character may reduce the attack-roll penalty by 2.
* The text does not grant additional attack actions or explicitly provide the Codru-Ji two-two-handed-weapon entitlement.

Architecture implication: This is a character-selected anatomy alteration, not a static anatomical fact shared by every near-Human or Human. The final effective anatomy system needs a source-authorized actor-specific overlay/choice tier that respects species publication snapshots and does not mutate base species data. Do not implement a near-Human species-wide four-arm default. Keep the attack-penalty effect in the combat/trait rules authority, not as an anatomy capability.

E2B-RD-07 - Dug (nonstandard manipulator position)

Primary: Clone Wars Campaign Guide, printed p. 10 (PDF image page 11).
Repository profile: dug-cw-2h-01.

Verified: Dugs have two arms and two legs, but limbs are reversed in use: upper limbs for walking, lower limbs manipulate objects. This establishes an unusual physical configuration, not additional manipulator count. Do not apply the ordinary arm/leg visual assignment blindly. No published bonus or extra holding capacity is created from this description.

E2B-RD-08 - Lugubraa (two forward gripping tentacle limbs)

Primary: The Unknown Regions, printed pp. 134-135 (PDF image pages 135-136).
Repository profile: lugubraa-ur-2b-13.

Verified: Adults have two locomotion legs, vestigial middle limbs, and two forward limbs ending in tentacles that grasp/wrap objects. Sentries are depicted/described with two-handed spears or power lances. The tentacles are also separate natural weapons. Source supports two forward grasping appendages, not four or six independently usable hands. The breadth of ordinary hand/fine manipulation, and whether to treat weapon grip as fully generic, is not completely specified; leave those capability refinements open instead of simply declaring standard hands.

III. Additional cases that must not be promoted into hand grants

* Ebruchi: The Unknown Regions’ Ebruchi description gives facial scent feelers that grasp food, not a published extra weapon/gear manipulator. No extra equipment hand should be inferred from facial appendages without more evidence.
* Celegian: Jedi Academy Training Manual gives Celegian physiological/environment-chamber information, but the reviewed species-traits section does not establish an independently countable set of weapon-manipulating limbs. The universal two-arm default should not be represented as source-verified anatomy for this nonhumanoid form; separate anatomy evidence needed before canonicalization.
* Natural weapons: Barabel/Trianii claws and tails, Yevetha claws, and Killik/Lugubraa natural weapons do not imply a general-purpose holding/wielding appendage or extra attack action.
* Lurmen Roller: Galaxy at War’s Roller mode limits available actions while curled up; this is an operating/form constraint, not a claim of additional or absent permanent arms. Consider during E3/E7 context gating, not E2B appendage cardinality.
* Gundarks/other creatures: Monster morphology (for instance four-armed Gundarks in Threats of the Galaxy) is a separate NPC/creature anatomy coverage concern, not proof of additional humanoid species choices. Audit separately if creature actors require held-weapon allocation.
* Droids: Completely outside E2B species canonicalization. DR-001 through DR-010 remain DEFERRED_DROID_REFACTOR until the post-vehicle droid overhaul.

IV. Architectural requirements derived from verified rules (proposed, not implemented)

1. Preserve provenance: optional anatomy on the already-effective, selected publication profile (OA-7). A selected complete-snapshot variant must not inherit base anatomy.
2. Correct standard fallback: two conventional manipulators for an ordinary known biological species with no verified exception; missing species profile remains partial. An identified exception requires explicit source-backed anatomy or unresolved status.
3. Stable slots: each separately established manipulator needs an individual stable identifier. Natural biological IDs should not be based on current array index; synthetic E2A identifiers are provisional test API until E2B schema is approved.
4. Capability separation: canHold, canWield, canManipulate remain distinct tri-state facts. Tail hold is not wield. For other unusual appendages, unknown must not be silently converted to true.
5. Conditional restrictions: the Ryn/Trianii tail requires size-dependent load consequences. A single canHold: true boolean is insufficient; a conditional constraint must be available to E3 or the existing encumbrance authority. Do not invent a new encumbrance calculator.
6. Actor-selected alterations: near-Human Additional Arms demonstrates need for selected trait/alteration overlays after publication-specific species materialization. Its -2 multiple-attack-penalty rule stays in combat rules, not anatomy.
7. No extra attacks from arms: a four-arm anatomy describes capacity only; attack entitlement remains under the established combat engine, feats, talents, and action economy.
8. Different eligibility tiers: direct mechanical holding text (Codru-Ji, Ryn, Trianii), anatomical equivalents (Krevaaki, Killik, Dug, Lugubraa), and optional character-choice anatomy (near-Human) should not be homogenized without declared evidence.
9. No legacy droid repair: equipment’s diagnostic adapter remains replaceable; current droid installation identity weaknesses are audited, not modified.
10. Do not touch unrelated species mechanics: report the Codru-Ji +2/+5 discrepancy separately; do not repair feat grants, skill bonuses, natural attacks, grapple mechanics, or other audited species data as part of anatomy canonicalization.

V. Open decisions before any E2B production data / schema change

* Schema: exact optional anatomy field shape, capability and conditional-restriction vocabulary, stable biological IDs, and how it flows through registry normalization and the complete-snapshot whitelist. Use existing species authority; no independent registry.
* Variant isolation: published profile-specific anatomy, and separate handling of legacy overlay variants; no silent base-data inheritance into complete snapshots.
* Character trait alteration: represent near-Human Additional Arms after selected species materialization; distinguish the actor-specific selection from a species-wide attribute.
* Lugubraa: hold is verified, but fine-manipulation and generic wielding capability need an explicit scoped decision rather than an automatic full-hand classification.
* Celegian/Ebruchi and other unusual body plans: keep unresolved pending more explicit source/equipment eligibility evidence; do not declare an exhaustive census based on text search alone.
* E2A guard coverage: existing temporary guards only match extra-arms and prehensile-tail trait IDs. Killik, Krevaaki, Lugubraa, and character-selected Additional Arms are not protected by these exact two guards. E2B must handle recognized exceptions at the correct publication/actor source, and tests must prove no false resolved fallback.
* E2A correctness pre-E3: an injected adapter’s unresolvedRecords must prevent a whole-result resolved designation even alongside valid appendages; duplicate slot or installed-instance identities must not be independently allocatable. These are bounded future contract corrections, not droid-system changes.

VI. Certification boundaries and next work

Source-checked PDF entries: Legacy Era (Codru-Ji p. 13); Scum and Villainy (Ryn p. 11); Galaxy at War (Trianii p. 16, Lurmen mode separately); Unknown Regions (Krevaaki p. 13, near-Human pp. 17-18, Killik p. 131, Lugubraa pp. 134-135); Clone Wars (Dug p. 10). Other species/creatures noted as leads, not certified for hand allocation.

Not certified: full species-book census, species pack/data changes, final schema, actor-specific trait storage, weapon/armor inventory operations, combat integration, Foundry v13 runtime behavior, droid compatibility. The final E2B implementation should wait for a schema decision and explicit owner approval. E2B-S1 source findings alone do not authorize code, packs, or E3.
