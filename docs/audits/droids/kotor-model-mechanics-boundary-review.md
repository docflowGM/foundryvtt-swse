# Knights of the Old Republic — 24/24 model-mechanical boundary review

**Source:** *Knights of the Old Republic Campaign Guide*, printed pp.81–89, 165, 203, 212–213, 216 and 222–223. Rendered primary PDF pages checked against the existing 369 selected-field baseline; TXT consulted for index and contextual descriptions. **Audit date:** 2026-11-02.

All **24 frozen KOTOR source identities** were revisited for model-specific mechanical boundary risks. **48 new, page-cited non-executable constraints** now appear in `data/canonical/droids/source-books/kotor.json`. This is a **model-specific boundary checkpoint**, not a claim that every Feats, Talents, Systems, Possessions, skill score, and attack alternative has been fully transcribed or canonically certified. Mechanical status remains partial for all 24.

| Entry | Printed page | Evidence-backed mechanical boundary |
|---|---:|---|
| KOTOR-DROID-001 ET-74 Communications Droid | 81 | ET-74 communicates through its factory language/communications equipment; the printed communications role does not create a generic remote-computer takeover or combat action. |
| KOTOR-DROID-002 GO-TO Infrastructure-Planning Droid | 82 | GO-TO coordinates reconstruction through planetary information networks; plugging into a cooperating network is not universal administrator access or an attack. |
| KOTOR-DROID-003 T3-Series Utility Droid | 82 | T3-Series does not have a vocabulator and should not receive spoken Basic from its astromech-like utility role. |
| KOTOR-DROID-004 GE3-Series Protocol Droid | 83 | GE3's translation, knowledge and language proficiencies remain sourced to the printed unit; no automatic universal language or unexplained specialist skill grants. |
| KOTOR-DROID-005 GG-Series Hospitality Droid | 84 | GG hospitality is a service/protocol model and its social programming does not authorize unlisted combat or concealment functions. |
| KOTOR-DROID-006 HK-24 Series Assassin Droid | 84 | HK-24 is an assassin factory model explicitly unsuitable for heroes; printed soldier/combat abilities are NPC source claims. |
| KOTOR-DROID-007 Independent HK-Series Droid | 85 | Independent HK-Series is a distinct first-level heroic starting template and usable only with GM approval, not an additional stock HK-24/50 factory variant. |
| KOTOR-DROID-008 HK-50 Series Assassin Droid | 85 | HK-50 is a separate assassin factory model explicitly unsuitable as a droid hero. |
| KOTOR-DROID-009 Juggernaut War Droid | 86 | Juggernaut War Droid is an NPC war-droid identity, not a generic legal PC chassis. |
| KOTOR-DROID-010 K-X12 Probe Droid | 86 | K-X12 deployment inside hollowed concussion missiles is a delivery scenario; it does not create an ordinary reusable personal missile launcher. |
| KOTOR-DROID-011 Municipal Patrol Droid Mark I | 87 | Municipal Patrol Droid Mark I police tools and printed weapons remain stock-model-specific, not automatic grants to all security models. |
| KOTOR-DROID-012 Devastator War Droid | 87 | Devastator War Droid combat actions, armor and alternate attack lines belong to this model; do not transfer them to Juggernaut or Mark assault models. |
| KOTOR-DROID-013 Sentinel Droid | 88 | Sentinel Droid is a security combat model whose guarding description is not blanket surprise immunity or unrestricted off-turn attacks. |
| KOTOR-DROID-014 S6-Series Security/Maintenance Droid | 88 | S6 security/maintenance model combines specialized tool and patrol functions, not universal hacking, combat, or repairs. |
| KOTOR-DROID-015 T1 Bulk Loader Droid | 88 | T1 Bulk Loader is a load-handling droid; load capacity and loader appendages do not automatically qualify as generic dexterous hands. |
| KOTOR-DROID-016 R-8009 Utility Droid | 89 | R-8009 is a distinct utility model and not interchangeable with T1 or T3 chassis Systems. |
| KOTOR-DROID-017 Mark I Assault Droid | 165 | Mark I Assault Droid and Mark IV Assault Droid are separate printed sources on p165 with distinct attacks and durability. |
| KOTOR-DROID-018 Mark IV Assault Droid | 165 | Mark IV is not merely a cosmetic label on Mark I: preserve its individual attack-mode, armor and equipment claims. |
| KOTOR-DROID-019 Basilisk War Droid | 203 | Basilisk is a vehicle-primary droid with published vehicle HP 70, DR 5, crew/droid-brain, passenger and air-vehicle rules; do not create an individual droid actor. |
| KOTOR-DROID-020 GO-TO (Dark Wars) | 212 | GO-TO (Dark Wars) is a named individual/source identity, independent from the GO-TO infrastructure-planning factory model. |
| KOTOR-DROID-021 HK-47 (Jedi Civil War) | 213 | HK-47 (Jedi Civil War) is a named advanced individual, not the GM-conditional level-one Independent HK template. |
| KOTOR-DROID-022 T3-M4 (Jedi Civil War) | 216 | T3-M4 (Jedi Civil War) is a named individual distinct from the factory T3-Series utility model. |
| KOTOR-DROID-023 Krath War Droid | 222 | Krath War Droid understands Basic but cannot speak it in the printed presentation; distinguish comprehension from speech. |
| KOTOR-DROID-024 Rakatan Guardian Droid | 223 | Rakatan Guardian integrated armaments are listed in its Possessions evidence, not certified as freely mounted independent weapon instances. |

## Cross-identity guardrails

The HK-24 and HK-50 are hero-prohibited factories. The Independent HK-Series source profile is a **GM-conditional distinct heroic template** and is not HK-47, the named individual. GO-TO's infrastructure-planning factory and Dark Wars GO-TO are separate; factory T3 and T3-M4 are separate. The Basilisk is **vehicle-primary**, not an individual actor: 70 printed vehicle hit points, DR5 and vehicle combat/payload must not migrate into species or actor combat rules. Krath Basic comprehension is not speech; Rakatan Possessions do not certify integrated weapon mount instances.

## Outstanding source data and certification

This checkpoint covers the page-specific **mechanical risks and entity boundaries** and improves downstream safety, but does **not** complete the richer field-by-field deepening achieved for prior three books. Exact grouped Feats/Talents/Skills, complete Systems-vs-Possessions instances, action economy, and full attack rows still need primary-PDF proof and machine field capture. Upstream schema, end-to-end code tests and Foundry runtime not run. Zero production packs/scripts modified. No strict certification issued.

**Machine evidence:** `data/audits/droids/kotor-model-mechanics-boundary-review.json`.
