# SWSE Level 1 — Q4 Parent-Career Situations and Answer Bank (v0.2 — Locked Selection Contract)

**Status:** Editorial draft for review; not implemented or mechanically certified.
**Source:** `data/archetypes.json` (verified source snapshot SHA `76b1ee3aa06dcb29a88ff4ca69bbc8b96cebc3fe`).

## Contract

- Q4 scenario follows **only the exact parent ID chosen in Q2**. Q3 chosen-answer tags may rank Q4 options but cannot change the Q4 scenario.
- Every child specialization is an **aspirational Q4 answer candidate** under its actual parent. A required species reference is a hard display filter based on pending/live species state; other class/feature paths remain future aspirations unless separately adjudicated.
- For each parent, five Q3-style method backfills are authored from its **actual primary semantic tags**. Each method contributes its tagged approach only when selected; no child ID is inferred from it.
- Display five options per page: if more than five children are applicable, rank by certified **chosen Q3 response tags first**, Q1 preference second, and class/species/attributes as supporting evidence; show the top five first. Otherwise show all children and backfill to five with unused tag-method responses. Any remaining children are available on repeat-free follow-up pages. Browsing is not preference evidence.
- The Q4 scenario is a profession-specific narrative; the fixed Mentor Q4 introduction remains separate. Display only the first-person quoted response text to the player.
- If Q2 was skipped, Q4 can be skipped and contributes no career/child evidence. Skipping Q4 is also allowed.
- **Intent is not identity; identity is not eligibility; eligibility is not achievement.**
- Child tag and parent tag IDs are carried only as snapshots validated against the existing SSOT. No new tag taxonomy is created.
- **Caution:** Ten obvious droid-form identities have `formReviewCandidate=droid` in their developer-only metadata because the SSOT has no explicit droid-form requirement for them. This is a pending review flag, **not a certified exclusion**. Species, cultures, factions and Force-status constraints also require manual QA.

## Locked Q4 ranking/eligibility addendum (v0.2)

- **Parent and scene:** Q2 exact parent only. The same Q4 career situation is displayed regardless of Q3.
- **Eligible children:** All direct canonical children are candidate future specialization answers. Certified requirements (including `mechanics.species.required`) filter applicability; unresolved droid-form, faction, and cultural requirements remain review flags. Do not assume the player possesses an aspirational specialization.
- **Cardinality:** 0 applicable children -> five tag methods; 1–4 -> all children plus tag methods; exactly 5 -> five children; more than 5 -> the highest-ranked five children. Extra children remain reachable with **“Show me other approaches”**; new pages never repeat option IDs. Backfill the final page from unused methods where available.
- **Ranking:** A chosen Q3 response's **certified existing ontology tags** are strongest. Q1 development intent is secondary. Verified class route, actual species mechanics and numeric attributes support ranking. Prefer child primary-tag matches, then supporting-tag matches; tie-break on stable canonical IDs. Numeric weights are *not approved* and must be calibrated independently.
- **P0 mandatory mapping:** Certify **all 150 Q3 response IDs** against the frozen 190-tag ontology and relevant class mechanics; `editorialFocus` is editorial, **not** certified scoring metadata. Until certification is complete, do not enable Q3-driven personalized child ranking. Use only verified fallback signals when Q3 was skipped.
- **Preference semantics:** Only a selected child answer records that exact child aspiration; only a selected tag-method response records method tags. No identity, class features, feats, skills, talents, legality or morality conferred. Merely viewing/browsing responses produces no intent.
- **Stability:** A changed Q3 answer can reorder candidates but not the scenario. A changed Q2 parent invalidates the prior Q4 context. Never silently overwrite a committed option after re-ranking; use stable option IDs and reconfirm when invalid.
- **Opt-out:** Q4 can be skipped. If Q2 has no selected parent, there is no invented Q4 career.
- **Source:** Master authority and detailed QA in `SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design_v0.18_2026-11-13.md`. The 97 narrative scenarios and 685 authored answer records below are **unchanged editorial drafts**.

## Source inventory

| Measure | Count |
|---|---:|
| Canonical parents | 97 |
| Canonical children | 200 |
| Parents with children | 70 |
| Parents without children | 27 |
| Parents with more than five children | 9 |
| Career-specific situations | 97 |
| Child-specialization answer records | 200 |
| Tag-method backfill answer records | 485 |
| Total first-person answer records | 685 |

## Scenario and answer catalog

Player-facing answers are quoted. IDs and semantic tags are **developer-only**.

### 01. Smuggler (`smuggler`)

A customs cruiser orders your freighter to dock just before a delivery deadline. Your cargo is valuable, your papers are incomplete, and your client insists the shipment must arrive today.

**What would you do?**

**Children in source:** 1. **Primary tags:** `deception`, `pilot`, `social`, `space`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd use speed, forged timing, and a carefully chosen route to slip the cargo past inspection." — `childId=blockade_runner`; tag `evasion`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 02. Fringer (`fringer`)

A remote settlement offers you shelter if you can help reopen a dangerous route to its supply cache. Locals disagree about which paths are safe, and the weather is worsening.

**What would you do?**

**Children in source:** 1. **Primary tags:** `exploration`, `perception`, `survivability`, `survival`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd look for an unconventional path through the frontier and rely on the people I meet along the way." — `childId=devaronian_wanderer`; tag `exploration`; required species: species-devaronian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.

### 03. Free Trader (`free_trader`)

Two ports offer lucrative markets for your shipment, but each demands a different concession and your crew cannot afford to visit both. Your investors want an immediate decision.

**What would you do?**

**Children in source:** 3. **Primary tags:** `knowledge`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd inspect the machinery, salvage what is useful, and negotiate a trade built around working parts." — `childId=jawa_droid_peddler`; tag `droid`; required species: species-jawa.
- "I'd call on trusted port contacts and settle on terms that keep the trade fair for both sides." — `childId=herglic_free_trader`; tag `exploration`; required species: species-herglic.
- "I'd spot the overlooked value in a pile of scrap and turn it into a useful bargain." — `childId=toydarian_junk_merchant`; tag `equipment`; required species: species-toydarian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 04. Pirate (`pirate`)

Your crew sights a richly laden freighter traveling under uncertain protection. Half the crew wants to attack, while others suspect the vessel may be bait.

**What would you do?**

**Children in source:** 4. **Primary tags:** `intimidation`, `pilot`, `pursuit`, `space`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd check the vessel's defenses and make sure any engagement serves a legitimate contract." — `childId=privateer`; tag `pilot`.
- "I'd study the target's weaknesses and coordinate a swift raid before its defenders can organize." — `childId=blazing_chain_raider`; tag `force`.
- "I'd keep the crew disciplined, control the approach, and refuse a prize that costs more than it earns." — `childId=weequay_pirate_captain`; tag `intimidation`; required species: species-weequay.
- "I'd use intimidation and command of the ship to dictate the encounter's terms." — `childId=zygerrian_corsair`; tag `intimidation`; required species: species-zygerrian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd project enough resolve to make the opposition reconsider." — primary tag `intimidation`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 05. Scavenger (`scavenger`)

A derelict's cargo hold contains salvageable machinery, but structural alarms sound as another crew approaches to claim it. There is not enough time to recover everything.

**What would you do?**

**Children in source:** 4. **Primary tags:** `equipment`, `mechanics`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd identify the most valuable recoverable systems and get everyone clear before the wreck shifts." — `childId=salvager`; tag `equipment`.
- "I'd scan the damaged structure, catalog salvage, and retrieve it without risking unnecessary exposure." — `childId=scavenger_droid`; tag `droid`.
- "I'd divide the recovery work across the crew and haul out machinery that can be repaired." — `childId=jawa_sandcrawler_salvager`; tag `equipment`; required species: species-jawa.
- "I'd find a buyer before removing the wreck's rarest components and settle ownership disputes." — `childId=squib_salvage_broker`; tag `equipment`; required species: species-squib.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd assess the tools we have and make the best use of what is available." — primary tag `equipment`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd build a practical solution from the materials at hand." — supporting tag `crafting`.
- "I'd adapt the equipment to handle the new conditions." — supporting tag `modification`.

### 06. Gambler (`gambler`)

A high-stakes game begins to feel rigged after a stranger offers to reveal the dealer's secret for a share of your winnings. The other players are becoming suspicious.

**What would you do?**

**Children in source:** 0. **Primary tags:** `deception`, `perception`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.
- "I'd speak to the people involved and search for agreement." — supporting tag `persuasion`.

### 07. Con Artist (`con_artist`)

A wealthy patron offers a lucrative deal after mistaking you for someone influential. Correcting the misunderstanding could lose the opportunity, but sustaining it carries growing risk.

**What would you do?**

**Children in source:** 0. **Primary tags:** `deception`, `manipulation`, `persuasion`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd guide the conversation toward an outcome others can accept." — primary tag `manipulation`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 08. Fixer (`fixer`)

Two clients urgently need the same rare component, and each believes you promised it to them. The supplier has stopped responding and your reputation is on the line.

**What would you do?**

**Children in source:** 1. **Primary tags:** `gather_information`, `intrigue`, `persuasion`, `social_network`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd identify who wants the component, who truly owns it, and what arrangement avoids unnecessary trouble." — `childId=fence`; tag `deception`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd call on trusted contacts who understand the situation." — primary tag `social_network`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 09. Information Broker (`information_broker`)

You obtain proof of a corporate cover-up just as two rival buyers make competing offers. A whistleblower warns that releasing the information could endanger innocent workers.

**What would you do?**

**Children in source:** 1. **Primary tags:** `gather_information`, `intrigue`, `social_network`, `use_computer`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd ask discreet contacts what they know and compare the rumors before trusting either buyer." — `childId=ryn_network_gatherer`; tag `gather_information`; required species: species-ryn.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd call on trusted contacts who understand the situation." — primary tag `social_network`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 10. Gunslinger (`gunslinger`)

A notorious gunfighter challenges you in a busy settlement square. Onlookers gather, local law officers are late, and the challenger keeps moving closer to the crowd.

**What would you do?**

**Children in source:** 0. **Primary tags:** `initiative`, `pistol`, `precision`, `ranged`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd act quickly while the opportunity is still open." — primary tag `initiative`.
- "I'd keep a clear line of fire and rely on controlled shots." — primary tag `pistol`.
- "I'd focus on the one action most likely to change the outcome." — primary tag `precision`.
- "I'd secure a firing position and choose targets carefully." — primary tag `ranged`.
- "I'd stop the immediate threat with decisive action." — supporting tag `damage`.

### 11. Bounty Hunter (`bounty_hunter`)

Your quarry is hiding among frontier settlers who insist the warrant is unjust. The client demands immediate delivery, but the residents refuse to cooperate.

**What would you do?**

**Children in source:** 4. **Primary tags:** `investigation`, `perception`, `pursuit`, `survival`, `tracking`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd reconstruct the quarry's movements through transaction records and witness accounts." — `childId=skip_tracer`; tag `gather_information`.
- "I'd follow the faint trail others overlooked and keep pursuing until the clues agree." — `childId=gand_findsman`; tag `force`; required species: species-gand.
- "I'd study the settlement unnoticed and plan a capture that does not expose the bystanders." — `childId=ubese_masked_hunter`; tag `perception`; required species: species-ubese.
- "I'd follow subtle signs through the surroundings and wait for a safer opportunity to intercept." — `childId=shistavanen_tracker`; tag `perception`; required species: species-shistavanen.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd follow small clues and preserve the trail." — primary tag `tracking`.

### 12. Crime Boss (`crime_boss`)

A trusted lieutenant has made a deal with a rival organization without your approval. Profits are threatened, and your own people are watching to see whether you can keep control.

**What would you do?**

**Children in source:** 2. **Primary tags:** `intrigue`, `leadership`, `minion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd read the power struggle and turn influential lieutenants toward a settlement on my terms." — `childId=falleen_black_sun_noble`; tag `intrigue`; required species: species-falleen.
- "I'd use obligations, credits, and favors to restore the organization without looking weak." — `childId=hutt_kajidic_lorda`; tag `intrigue`; required species: species-hutt.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd coordinate dependable helpers rather than trying to do everything alone." — primary tag `minion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 13. Enforcer (`enforcer`)

A debtor refuses to cooperate with your employer's demands, claiming that the debt was fabricated. Your employer expects results before the end of the day.

**What would you do?**

**Children in source:** 1. **Primary tags:** `investigation`, `persuasion`, `pursuit`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd verify what is owed, then apply just enough pressure to settle it without a needless fight." — `childId=syndicate_enforcer`; tag `nonlethal`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.

### 14. Courier (`courier`)

You have minutes to deliver a sealed package across a crowded city when transport service fails. Someone starts following you, and the sender warned you not to open it.

**What would you do?**

**Children in source:** 0. **Primary tags:** `mobility`, `movement`, `pilot`, `vehicle`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd keep moving and use the available routes to avoid getting trapped." — primary tag `mobility`.
- "I'd change position before the situation closes around us." — primary tag `movement`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd use the vehicle and the terrain to our advantage." — primary tag `vehicle`.
- "I'd act quickly while the opportunity is still open." — supporting tag `initiative`.

### 15. Cantina Proprietor (`cantina_proprietor`)

A fight erupts during a packed evening while an informant quietly asks for a private meeting. Your staff needs help, and security forces are already approaching.

**What would you do?**

**Children in source:** 0. **Primary tags:** `gather_information`, `perception`, `persuasion`, `social`, `social_network`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd call on trusted contacts who understand the situation." — primary tag `social_network`.

### 16. Sector Ranger (`sector_ranger`)

Reports of stolen supplies and missing travelers point to the same border region. Local officers disagree about the suspects, and the trail is going cold.

**What would you do?**

**Children in source:** 1. **Primary tags:** `investigation`, `perception`, `pursuit`, `survival`, `tracking`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd track the raiders across the border and bring a reliable account back to local authorities." — `childId=trianii_ranger`; tag `pilot`; required species: species-trianii.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd follow small clues and preserve the trail." — primary tag `tracking`.

### 17. Frontier Marshal (`frontier_marshal`)

A land dispute escalates into a standoff between neighboring settlements. Both sides demand that you enforce their version of the law while frightened families take shelter.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ally_support`, `leadership`, `perception`, `persuasion`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd look into the source of the dispute before enforcing a judgment that could hurt the innocent." — `childId=kiffu_guardian`; tag `investigation`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd help the people doing essential work succeed." — primary tag `support`.

### 18. Investigator (`investigator`)

A missing person's belongings appear at the scene of an unrelated theft. Witnesses provide conflicting accounts, and a powerful official insists the cases have no connection.

**What would you do?**

**Children in source:** 2. **Primary tags:** `gather_information`, `investigation`, `perception`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd blend into the community and quietly uncover who benefits from the missing person's disappearance." — `childId=undercover_lawman`; tag `deception`.
- "I'd preserve the physical evidence and reconstruct what happened before accusing anyone." — `childId=forensic_specialist`; tag `investigation`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.
- "I'd compare the likely outcomes before committing resources." — supporting tag `planning`.

### 19. Spy (`spy`)

Your covert assignment is compromised when your contact fails to arrive and a security officer begins reviewing identification records. Your objective remains within reach, but exposure is imminent.

**What would you do?**

**Children in source:** 7. **Primary tags:** `deception`, `infiltration`, `stealth`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd protect my cover, verify the orders, and complete the objective without exposing the operation." — `childId=imperial_agent`; tag `deception`.
- "I'd use covert contacts to get the intelligence out while keeping the wider cell safe." — `childId=rebel_operative`; tag `infiltration`.
- "I'd test which sources are compromised and feed the adversary information I can control." — `childId=counterintelligence_officer`; tag `deception`.
- "I'd move unseen toward the objective and use the Force only if the mission truly demands it." — `childId=emperors_hand`; tag `dark_side`.
- "I'd activate a chain of discreet informants and compare their reports before making contact." — `childId=bothan_spynet_operative`; tag `deception`; required species: species-bothan.
- "I'd adopt a convincing disguise to learn who is watching the meeting and why." — `childId=clawdite_facechanger_operative`; tag `deception`; required species: species-clawdite.
- "I'd stay concealed in the shadows and observe the security pattern before taking a risk." — `childId=defel_shadow_operative`; tag `concealment`; required species: species-defel.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd stay out of sight while finding a safer route forward." — supporting tag `concealment`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 20. Spymaster (`spymaster`)

Two independent sources report contradictory plans from a rival intelligence network. One source may be compromised, and your agents want to act before the window closes.

**What would you do?**

**Children in source:** 1. **Primary tags:** `intrigue`, `leadership`, `planning`, `social_network`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd protect my agents, isolate the unreliable report, and send the right person to verify it." — `childId=handler`; tag `leadership`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd compare the likely outcomes before committing resources." — primary tag `planning`.
- "I'd call on trusted contacts who understand the situation." — primary tag `social_network`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 21. Slicer (`slicer`)

A secure terminal contains the data your client needs, but accessing it alerts an administrator who begins tracing the connection. A maintenance system nearby offers a less direct route.

**What would you do?**

**Children in source:** 1. **Primary tags:** `slicing`, `tech`, `use_computer`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd analyze the security system and manipulate the access controls without revealing my location." — `childId=slicer_droid`; tag `droid`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd gain access to the system and work around its defenses." — primary tag `slicing`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.
- "I'd inspect the machinery and identify a fixable failure." — supporting tag `mechanics`.

### 22. Security Specialist (`security_specialist`)

An alarm signals a breach inside a crowded public complex. The surveillance feed has gaps, entrances are still open, and visitors are beginning to panic.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ally_support`, `perception`, `support`, `tech`, `use_computer`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd hold a defensible position while the crowd is moved out of immediate danger." — `childId=koorivar_fusilier`; tag `ally_support`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.

### 23. Bodyguard (`bodyguard`)

During an official reception, your protectee insists on meeting an unexpected guest despite credible threats. The room has several exits, and security staff disagree about the safest move.

**What would you do?**

**Children in source:** 6. **Primary tags:** `ally_support`, `perception`, `support`, `survivability`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd reposition the protectee, control access to the room, and keep the meeting calm." — `childId=diplomatic_security_agent`; tag `ally_support`.
- "I'd stand between the protected official and the suspected threat without abandoning discipline." — `childId=imperial_royal_guard`; tag `ally_support`.
- "I'd coordinate a discreet security perimeter that preserves the event without exposing the protectee." — `childId=hapan_royal_guard`; tag `ally_support`.
- "I'd put the safety of the person I have sworn to defend ahead of the ceremony." — `childId=wookiee_life_debt_protector`; tag `ally_support`; required species: species-wookiee.
- "I'd block the dangerous approach and give my companions space to retreat." — `childId=gamorrean_clan_guard`; tag `ally_support`; required species: species-gamorrean.
- "I'd watch for an unseen attacker and intervene only when the protectee is truly at risk." — `childId=noghri_honor_bodyguard`; tag `ally_support`; required species: species-noghri.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.

### 24. Assassin (`assassin`)

A target arrives at a meeting surrounded by attendants who may be innocent. The environment provides several opportunities, but none guarantees a clean escape or a clear identification.

**What would you do?**

**Children in source:** 2. **Primary tags:** `ambush`, `infiltration`, `precision`, `stealth`, `targeting`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd identify the target precisely and calculate a route that limits harm to bystanders." — `childId=assassin_droid`; tag `ambush`.
- "I'd approach from an unexpected angle and strike only when the target is unmistakable." — `childId=seyugi_dervish`; tag `dark_side`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd watch for an opening and act before the opposition is ready." — primary tag `ambush`.
- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd focus on the one action most likely to change the outcome." — primary tag `precision`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd identify the decisive target and wait for a safe opportunity." — primary tag `targeting`.

### 25. Force Hunter (`force_hunter`)

Evidence suggests a dangerous Force-user is moving between isolated settlements. The trail includes misleading reports, and witnesses fear retaliation if they assist.

**What would you do?**

**Children in source:** 2. **Primary tags:** `anti-force`, `perception`, `pursuit`, `survival`, `tracking`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd question the reports and bring the suspected Force-user under control before they escape." — `childId=imperial_inquisitor`; tag `control`.
- "I'd prepare to face unusual powers without depending on the Force myself." — `childId=morgukai_warrior`; tag `anti-force`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd learn what unusual abilities are involved and prepare a practical countermeasure." — primary tag `anti-force`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd follow small clues and preserve the trail." — primary tag `tracking`.

### 26. Journalist (`journalist`)

You uncover a story implicating a respected public figure in a dangerous scheme. Your editor demands publication, but a key source asks for time to protect their family.

**What would you do?**

**Children in source:** 3. **Primary tags:** `gather_information`, `investigation`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd verify the allegations with independent evidence and protect the vulnerable source." — `childId=investigative_journalist`; tag `gather_information`.
- "I'd give the public a clear account of what is known without disguising the uncertainty." — `childId=holonet_reporter`; tag `gather_information`.
- "I'd document events from the dangerous location while keeping civilians out of my report." — `childId=war_correspondent`; tag `gather_information`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 27. Mercenary (`mercenary`)

A client orders your unit to secure a warehouse before another armed group arrives. The contract is vague about the people already sheltering inside.

**What would you do?**

**Children in source:** 0. **Primary tags:** `endurance`, `initiative`, `melee`, `survivability`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd keep going through the hardship while others recover." — primary tag `endurance`.
- "I'd act quickly while the opportunity is still open." — primary tag `initiative`.
- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 28. Commando (`commando`)

Your team must retrieve a captured specialist from a fortified installation. Surveillance patrols overlap, an extraction window is narrow, and direct assault would alert the whole base.

**What would you do?**

**Children in source:** 5. **Primary tags:** `infiltration`, `perception`, `recon`, `stealth`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd study the patrol routes, identify the safest entry point, and report it to the team." — `childId=recon_scout`; tag `perception`.
- "I'd find the weakest defended access point and open a passage before the enemy can react." — `childId=breacher`; tag `infiltration`.
- "I'd secure the narrow interior routes and protect the extraction team during the withdrawal." — `childId=boarding_marine`; tag `endurance`.
- "I'd coordinate a fast assault to open the rescue route, then hold it for the others." — `childId=shock_trooper`; tag `ally_support`.
- "I'd approach unseen and disable the critical guards before the rescue team enters." — `childId=noghri_death_commando`; tag `ambush`; required species: species-noghri.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd observe the location and report a clear picture to the team." — primary tag `recon`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd act quickly while the opportunity is still open." — supporting tag `initiative`.

### 29. Veteran (`veteran`)

A newly formed defense unit looks to you after its inexperienced commander proposes a risky response to an incoming attack. Morale is brittle, and time is short.

**What would you do?**

**Children in source:** 2. **Primary tags:** `endurance`, `perception`, `resilience`, `survivability`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd compare the threat with past combat records and keep the inexperienced unit organized." — `childId=battle_droid_veteran`; tag `droid`.
- "I'd share the lessons of earlier battles and steady the troops before the first shot." — `childId=clone_veteran`; tag `endurance`; required species: species-republic-clone.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd keep going through the hardship while others recover." — primary tag `endurance`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd keep the group steady when the setbacks become difficult." — primary tag `resilience`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 30. Warrior (`warrior`)

An opponent challenges you before both your allies and a hostile crowd. The contest could become lethal, and refusing may endanger people who depend on your reputation.

**What would you do?**

**Children in source:** 9. **Primary tags:** `endurance`, `melee`, `resilience`, `survivability`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd face the challenge with discipline while protecting the people bound to me by duty." — `childId=mandalorian_warrior`; tag `endurance`.
- "I'd take responsibility for the outcome and stop the dispute from tearing our allies apart." — `childId=clan_champion`; tag `control`.
- "I'd use endurance and familiar combat traditions to withstand a stronger opponent." — `childId=yuuzhan_vong_warrior`; tag `anti-force`; required species: species-yuuzhan-vong.
- "I'd read the terrain and defend my people without surrendering the advantage of surprise." — `childId=tusken_tribal_warrior`; tag `endurance`; required species: species-tusken-raider.
- "I'd protect my kin and confront the challenger with courage instead of reckless anger." — `childId=wookiee_clan_champion`; tag `control`; required species: species-wookiee.
- "I'd stand with my clan and use controlled aggression to end the threat quickly." — `childId=cathar_clan_warrior`; tag `endurance`; required species: species-cathar.
- "I'd study the opponent's timing and win through precise close-quarters technique." — `childId=nagai_duelist`; tag `full_attack`; required species: species-nagai.
- "I'd hold the sacred ground and meet the intruders without retreating." — `childId=massassi_temple_warrior`; tag `endurance`; required species: species-massassi.
- "I'd rely on hard training and resolve while refusing to endanger those beside me." — `childId=nightbrother`; tag `endurance`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd keep going through the hardship while others recover." — primary tag `endurance`.
- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.
- "I'd keep the group steady when the setbacks become difficult." — primary tag `resilience`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd limit the other side's choices without making the situation worse." — supporting tag `control`.

### 31. Sniper (`sniper`)

From a distant overlook you identify a threat near friendly personnel. Changing winds and obscured sightlines make a rushed shot uncertain, while the target is preparing to move.

**What would you do?**

**Children in source:** 0. **Primary tags:** `precision`, `ranged`, `setup`, `sniper`, `targeting`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd focus on the one action most likely to change the outcome." — primary tag `precision`.
- "I'd secure a firing position and choose targets carefully." — primary tag `ranged`.
- "I'd take the time to prepare a reliable position before acting." — primary tag `setup`.
- "I'd wait for a clear opportunity rather than take an uncertain shot." — primary tag `sniper`.
- "I'd identify the decisive target and wait for a safe opportunity." — primary tag `targeting`.

### 32. Combat Medic (`combat_medic`)

After a skirmish, several casualties arrive at once with different injuries. Supplies are limited, and enemy fire may resume before everyone can be moved.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ally_support`, `healing`, `medical`, `medicine`, `support`, `treat_injury`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd triage the most urgent injuries and organize treatment with the supplies available." — `childId=polis_massan_field_medic`; tag `ally_support`; required species: species-polis-massan.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd treat those in immediate need before the harm spreads." — primary tag `healing`.
- "I'd assess the injuries and decide who needs treatment first." — primary tag `medical`.
- "I'd identify the medical risk and choose a careful course of treatment." — primary tag `medicine`.
- "I'd help the people doing essential work succeed." — primary tag `support`.

### 33. Combat Engineer (`combat_engineer`)

A defensive emplacement fails while the enemy advances. Replacement parts are scarce, a damaged power conduit is unstable, and the squad needs a workable defense now.

**What would you do?**

**Children in source:** 1. **Primary tags:** `mechanics`, `modification`, `repair`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd adapt the organic defense systems and repair the weak point before the enemy arrives." — `childId=gungan_organic_tech_defender`; tag `ally_support`; required species: species-gungan.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd adapt the equipment to handle the new conditions." — primary tag `modification`.
- "I'd fix the most critical failure first and verify that it holds." — primary tag `repair`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 34. Saboteur (`saboteur`)

You reach a facility's critical machinery, but unexpected maintenance workers remain inside. Disabling the system could disrupt an enemy operation and endanger civilians.

**What would you do?**

**Children in source:** 1. **Primary tags:** `infiltration`, `mechanics`, `stealth`, `tech`, `trap`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd calculate a precise disruption that stops the machinery without endangering the workers." — `childId=demolitions_specialist`; tag `burst_damage`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd identify and safely neutralize the hazard before advancing." — primary tag `trap`.

### 35. Field Commander (`field_commander`)

Your unit must secure two evacuation corridors with too few personnel to cover both. Scouts provide incomplete intelligence, and subordinate leaders disagree on where to concentrate forces.

**What would you do?**

**Children in source:** 4. **Primary tags:** `ally_support`, `command`, `leadership`, `support`, `tactics`, `teamwork`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd divide the squad into clear tasks and make sure each team understands the withdrawal route." — `childId=squad_leader`; tag `ally_support`.
- "I'd compare likely enemy responses and assign units to the positions with the best odds." — `childId=tactical_droid`; tag `ally_support`.
- "I'd coordinate droid units as a single team while monitoring casualties and resource limits." — `childId=droid_commander`; tag `ally_support`.
- "I'd rally the fighters around one decisive plan and hold their loyalty through the crisis." — `childId=gamorrean_warlord`; tag `command`; required species: species-gamorrean.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd give the group clear priorities and coordinate their next moves." — primary tag `command`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd use positioning and timing to create an advantage." — primary tag `tactics`.

### 36. Naval Officer (`naval_officer`)

Your warship intercepts a distress call near a contested shipping lane. A hostile vessel is approaching, civilian traffic fills the area, and your crew awaits orders.

**What would you do?**

**Children in source:** 2. **Primary tags:** `command`, `leadership`, `space`, `tactics`, `teamwork`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd study the approaching ship's intent and protect the fleet's strategic position." — `childId=chiss_expansionary_fleet_officer`; tag `command`.
- "I'd coordinate shields, weapons, and crew stations without losing sight of the civilians." — `childId=hapan_battle_dragon_officer`; tag `command`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd give the group clear priorities and coordinate their next moves." — primary tag `command`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd use positioning and timing to create an advantage." — primary tag `tactics`.
- "I'd divide responsibilities so nobody is left exposed." — primary tag `teamwork`.

### 37. Fleet Strategist (`fleet_strategist`)

Reconnaissance reveals a chance to isolate a superior enemy fleet, but seizing it would leave allied supply lines exposed. Commanders demand a plan before the window closes.

**What would you do?**

**Children in source:** 1. **Primary tags:** `command`, `planning`, `space`, `tactics`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd set a fleet-wide plan that protects vulnerable ships while isolating the enemy." — `childId=mon_calamari_rebel_admiral`; tag `command`; required species: species-mon-calamari.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd give the group clear priorities and coordinate their next moves." — primary tag `command`.
- "I'd compare the likely outcomes before committing resources." — primary tag `planning`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd use positioning and timing to create an advantage." — primary tag `tactics`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 38. Starship Gunner (`starship_gunner`)

During a space battle, hostile fighters shelter behind a damaged transport carrying survivors. Your ship is taking fire, and a clean firing solution is difficult.

**What would you do?**

**Children in source:** 0. **Primary tags:** `ranged`, `space`, `targeting`, `vehicle`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd secure a firing position and choose targets carefully." — primary tag `ranged`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd identify the decisive target and wait for a safe opportunity." — primary tag `targeting`.
- "I'd use the vehicle and the terrain to our advantage." — primary tag `vehicle`.
- "I'd act quickly while the opportunity is still open." — supporting tag `initiative`.

### 39. Quartermaster (`quartermaster`)

A critical shipment disappears just before deployment. Several squads need the same scarce equipment, and your inventory records appear to have been altered.

**What would you do?**

**Children in source:** 1. **Primary tags:** `equipment`, `knowledge`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd audit the inventory and reroute essential supplies to the units that cannot wait." — `childId=logistics_officer`; tag `equipment`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd assess the tools we have and make the best use of what is available." — primary tag `equipment`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.
- "I'd inspect the machinery and identify a fixable failure." — supporting tag `mechanics`.

### 40. Partisan (`partisan`)

An occupying force tightens checkpoints around your safe house. Your group wants to strike back, but local residents would face reprisals if the operation fails.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ambush`, `infiltration`, `stealth`, `survival`, `tactics`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd strike a weak point quietly and move out before the occupying force can retaliate against civilians." — `childId=guerrilla`; tag `ambush`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd watch for an opening and act before the opposition is ready." — primary tag `ambush`.
- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd use positioning and timing to create an advantage." — primary tag `tactics`.

### 41. Resistance Leader (`resistance_leader`)

Two cells of your resistance demand conflicting plans after a successful raid. One wants a public uprising, while the other fears exposing the movement's supporters.

**What would you do?**

**Children in source:** 3. **Primary tags:** `leadership`, `persuasion`, `social`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd reconcile the cells around a plan that protects supporters and keeps the movement alive." — `childId=rebel_cell_leader`; tag `leadership`.
- "I'd strengthen the local network before risking the people who shelter and supply us." — `childId=underground_organizer`; tag `intrigue`.
- "I'd bring the droids and organics affected by the occupation into a common strategy." — `childId=droid_revolutionary`; tag `droid`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 42. Pilot (`pilot`)

A passenger transport develops control problems on approach to a rough landing zone. Weather worsens, nearby traffic limits maneuvering, and your passengers are frightened.

**What would you do?**

**Children in source:** 7. **Primary tags:** `pilot`, `pursuit`, `space`, `vehicle`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd use disciplined flying and the best available flight path to keep the passengers safe." — `childId=ace_pilot`; tag `evasion`.
- "I'd coordinate nearby pilots and create a safe approach for the damaged craft." — `childId=squadron_leader`; tag `command`.
- "I'd read the handling data, identify the failure, and attempt a carefully controlled maneuver." — `childId=test_pilot`; tag `mechanics`.
- "I'd use the craft's strength and positioning to shield the transport from immediate danger." — `childId=gunship_pilot`; tag `heavy_weapon`.
- "I'd find an unconventional but survivable landing route through the rough terrain." — `childId=bush_pilot`; tag `exploration`.
- "I'd process the sensor readings and execute the safest course the instruments support." — `childId=pilot_droid`; tag `droid`.
- "I'd pay attention to the warning I sense while checking it against the flight data." — `childId=iktotchi_precognitive_pilot`; tag `force`; required species: species-iktotchi.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd use the vehicle and the terrain to our advantage." — primary tag `vehicle`.
- "I'd act quickly while the opportunity is still open." — supporting tag `initiative`.

### 43. Ship Captain (`ship_captain`)

Your vessel suffers an engine fault far from port while a crew dispute threatens cooperation. A profitable delivery is overdue, and emergency supplies are running low.

**What would you do?**

**Children in source:** 1. **Primary tags:** `command`, `leadership`, `pilot`, `space`, `vehicle`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd steady the crew, prioritize the engine repair, and protect the cargo without risking lives." — `childId=freighter_captain`; tag `leadership`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd give the group clear priorities and coordinate their next moves." — primary tag `command`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd use the vehicle and the terrain to our advantage." — primary tag `vehicle`.

### 44. Astrogator (`astrogator`)

An unusual hyperspace disturbance blocks the familiar route to a stranded outpost. Existing charts disagree, and a rescue convoy is ready to depart.

**What would you do?**

**Children in source:** 5. **Primary tags:** `exploration`, `pilot`, `space`, `use_computer`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd compare unfamiliar stellar readings and plot a cautious route around the disturbance." — `childId=unknown_regions_navigator`; tag `exploration`.
- "I'd use both instruments and my sensitivity to the route to guide the convoy carefully." — `childId=chiss_sky_walker`; tag `force`.
- "I'd solve the navigation problem from the underlying calculations before trusting a chart." — `childId=givin_astrogator`; tag `knowledge`; required species: species-givin.
- "I'd look for an uncharted passage and verify each leg before leading others through it." — `childId=duros_hyperspace_trailblazer`; tag `exploration`; required species: species-duros.
- "I'd coordinate the convoy's route and share reliable updates when the charts fail." — `childId=sullustan_rebel_navigator`; tag `pilot`; required species: species-sullustan.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 45. Racer (`racer`)

A major race begins as officials announce a last-minute course change. A rival offers inside information, but your vehicle has a mechanical problem you have not fully diagnosed.

**What would you do?**

**Children in source:** 2. **Primary tags:** `initiative`, `pilot`, `pursuit`, `vehicle`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd test the vehicle's limits and use precise reflexes rather than gambling everything on speed." — `childId=hotshot_racer`; tag `initiative`.
- "I'd study the altered course and pick the cleanest line through its tightest hazards." — `childId=swoop_racer`; tag `initiative`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd act quickly while the opportunity is still open." — primary tag `initiative`.
- "I'd reassess the route and handle the craft with precision." — primary tag `pilot`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd use the vehicle and the terrain to our advantage." — primary tag `vehicle`.
- "I'd keep moving and use the available routes to avoid getting trapped." — supporting tag `mobility`.

### 46. Mechanic (`mechanic`)

A transport's drive fails during an emergency evacuation. The parts you need are unavailable, and repairs must be made while people wait aboard.

**What would you do?**

**Children in source:** 3. **Primary tags:** `mechanics`, `repair`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd rebuild the failed system from reusable parts and test it before the ship moves." — `childId=salvage_engineer`; tag `equipment`.
- "I'd diagnose the damaged drive methodically and repair the faults in priority order." — `childId=repair_droid`; tag `droid`.
- "I'd study the unfamiliar design and recover its intended function before changing it." — `childId=gree_technology_keeper`; tag `knowledge`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd fix the most critical failure first and verify that it holds." — primary tag `repair`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd build a practical solution from the materials at hand." — supporting tag `crafting`.
- "I'd use droid expertise to inspect the problem and find a reliable solution." — supporting tag `droid`.

### 47. Outlaw Tech (`outlaw_tech`)

You discover that the only way to repair an outlawed device is to bypass its safeguards. Your client wants a quick solution, but a mistake could expose everyone involved.

**What would you do?**

**Children in source:** 0. **Primary tags:** `jury_rig`, `mechanics`, `modification`, `tech`, `use_computer`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd improvise a functional repair from imperfect parts." — primary tag `jury_rig`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd adapt the equipment to handle the new conditions." — primary tag `modification`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.

### 48. Armorer (`armorer`)

An allied unit urgently needs protective gear after its equipment fails. Materials are limited, several designs are possible, and combat is approaching.

**What would you do?**

**Children in source:** 2. **Primary tags:** `armor`, `equipment`, `mechanics`, `modification`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd repair and reinforce the weapons most likely to fail in the coming fight." — `childId=weaponsmith`; tag `crafting`.
- "I'd build armor that serves the wearer and test the protection before deployment." — `childId=mandalorian_armorer`; tag `armor`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd improve protection before committing anyone to a dangerous move." — primary tag `armor`.
- "I'd assess the tools we have and make the best use of what is available." — primary tag `equipment`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd adapt the equipment to handle the new conditions." — primary tag `modification`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.

### 49. Droidsmith (`droidsmith`)

A service droid begins making dangerous errors while handling essential work. Its owner wants a fast fix, but the fault may involve its programming or damaged hardware.

**What would you do?**

**Children in source:** 0. **Primary tags:** `crafting`, `droid`, `mechanics`, `modification`, `repair`, `tech`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd build a practical solution from the materials at hand." — primary tag `crafting`.
- "I'd use droid expertise to inspect the problem and find a reliable solution." — primary tag `droid`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd adapt the equipment to handle the new conditions." — primary tag `modification`.
- "I'd fix the most critical failure first and verify that it holds." — primary tag `repair`.

### 50. Inventor (`inventor`)

A prototype could solve a settlement's pressing problem, but field testing reveals an unpredictable failure. Sponsors demand a demonstration before the design is ready.

**What would you do?**

**Children in source:** 2. **Primary tags:** `crafting`, `equipment`, `mechanics`, `modification`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd coordinate the design work and refine the prototype through careful technical testing." — `childId=verpine_hive_engineer`; tag `crafting`; required species: species-verpine.
- "I'd study how the device interacts with the Force before attempting to control it." — `childId=rakatan_force_tech_scion`; tag `force`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd build a practical solution from the materials at hand." — primary tag `crafting`.
- "I'd assess the tools we have and make the best use of what is available." — primary tag `equipment`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd adapt the equipment to handle the new conditions." — primary tag `modification`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.

### 51. Cyberneticist (`cyberneticist`)

A patient needs a replacement implant following an accident. Available components differ from the original design, and the patient has concerns about long-term effects.

**What would you do?**

**Children in source:** 0. **Primary tags:** `implant`, `mechanics`, `medical`, `tech`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd evaluate the technology and the needs of the person who will use it." — primary tag `implant`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd assess the injuries and decide who needs treatment first." — primary tag `medical`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 52. Electronic Warfare Specialist (`electronic_warfare_specialist`)

A hostile signal interrupts allied communications as a convoy crosses dangerous territory. The source is hidden, and conventional transmissions may reveal the convoy's location.

**What would you do?**

**Children in source:** 0. **Primary tags:** `control`, `slicing`, `tech`, `use_computer`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd limit the other side's choices without making the situation worse." — primary tag `control`.
- "I'd gain access to the system and work around its defenses." — primary tag `slicing`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.
- "I'd analyze the system data before changing anything." — primary tag `use_computer`.
- "I'd act quickly while the opportunity is still open." — supporting tag `initiative`.

### 53. Shipwright (`shipwright`)

A damaged starship must be restored before its crew can depart. The vessel's unusual design requires compromises between speed, safety, and available materials.

**What would you do?**

**Children in source:** 2. **Primary tags:** `crafting`, `mechanics`, `repair`, `space`, `tech`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd rebuild the ship's damaged framework with patience and precise craftsmanship." — `childId=sluissi_shipwright`; tag `crafting`; required species: species-sluissi.
- "I'd redesign the damaged systems around crew safety and the vessel's mission." — `childId=mon_calamari_fleet_architect`; tag `crafting`; required species: species-mon-calamari.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd build a practical solution from the materials at hand." — primary tag `crafting`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd fix the most critical failure first and verify that it holds." — primary tag `repair`.
- "I'd consider the routes, vessels, and risks before making a move." — primary tag `space`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.

### 54. Scientist (`scientist`)

Your research team obtains results that challenge a widely accepted theory. A sponsor demands a practical breakthrough, but several measurements still need independent confirmation.

**What would you do?**

**Children in source:** 8. **Primary tags:** `knowledge`, `science`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd study the organism's behavior and test the explanation against living evidence." — `childId=xenobiologist`; tag `knowledge`.
- "I'd compare the droids' decision patterns with their programming before drawing conclusions." — `childId=droid_behavioral_specialist`; tag `droid`.
- "I'd study the living technology and alter it through careful biological experimentation." — `childId=yuuzhan_vong_shaper`; tag `biotech`; required species: species-yuuzhan-vong.
- "I'd verify the specimen records and repeat the procedure under controlled conditions." — `childId=kaminoan_cloner`; tag `biotech`; required species: species-kaminoan.
- "I'd compare the genetic samples and identify which variation explains the results." — `childId=kaminoan_geneticist`; tag `biotech`; required species: species-kaminoan.
- "I'd test the underlying biological traits before claiming the discovery is reliable." — `childId=arkanian_geneticist`; tag `biotech`; required species: species-arkanian.
- "I'd examine the technology's energy source and its consequences before using it." — `childId=ssi_ruuk_entechment_technologist`; tag `droid`; required species: species-ssi-ruuk.
- "I'd challenge the assumptions behind the theory and demand evidence for each conclusion." — `childId=celegian_philosopher_scientist`; tag `knowledge`; required species: species-celegian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd test competing explanations with careful observations." — primary tag `science`.
- "I'd observe the details others might miss before making a move." — supporting tag `perception`.
- "I'd analyze the technology and look for a workable solution." — supporting tag `tech`.
- "I'd analyze the system data before changing anything." — supporting tag `use_computer`.

### 55. Doctor (`doctor`)

An unfamiliar illness spreads through a remote settlement. Patients need treatment immediately, yet you have limited supplies and incomplete information about the cause.

**What would you do?**

**Children in source:** 4. **Primary tags:** `ally_support`, `healing`, `medicine`, `support`, `treat_injury`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd stabilize the most critical patient and prepare for the procedure that cannot wait." — `childId=surgeon`; tag `medical`.
- "I'd analyze the clinical data, identify the greatest risk, and apply a consistent treatment plan." — `childId=medical_droid`; tag `droid`.
- "I'd reach the most vulnerable patients and organize care around what they need first." — `childId=medcorps_healer`; tag `ally_support`.
- "I'd consider how healing traditions and available medicine can safely work together." — `childId=selkath_kolto_steward`; tag `healing`; required species: species-selkath.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd treat those in immediate need before the harm spreads." — primary tag `healing`.
- "I'd identify the medical risk and choose a careful course of treatment." — primary tag `medicine`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd stabilize the injured and prevent further harm." — primary tag `treat_injury`.

### 56. Disaster Responder (`disaster_responder`)

A severe storm destroys local infrastructure while survivors gather at an overcrowded shelter. Several neighborhoods remain cut off, and your relief team has limited transport.

**What would you do?**

**Children in source:** 0. **Primary tags:** `ally_support`, `recovery`, `support`, `survivability`, `treat_injury`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd restore essential services before pushing ahead with the mission." — primary tag `recovery`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd stabilize the injured and prevent further harm." — primary tag `treat_injury`.

### 57. Explorer (`explorer`)

An expedition finds a previously unmapped canyon with signs of an ancient settlement. A storm approaches, and one team member wants to press onward despite unstable ground.

**What would you do?**

**Children in source:** 2. **Primary tags:** `exploration`, `perception`, `survival`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd survey the unexplored canyon and document its dangers before the expedition advances." — `childId=explorcorps_seeker`; tag `exploration`.
- "I'd map the unknown region from sensor readings and share a safe course with the crew." — `childId=deep_space_surveyor`; tag `exploration`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 58. Pathfinder (`pathfinder`)

Your group must cross unfamiliar highlands before its supplies run out. The apparent shortcut leads into hazardous terrain, and a guide's old map no longer matches the landscape.

**What would you do?**

**Children in source:** 2. **Primary tags:** `exploration`, `mobility`, `perception`, `survival`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd choose a reliable path through the terrain and account for the group's weakest traveler." — `childId=wilderness_guide`; tag `exploration`.
- "I'd scout the route and coordinate the group's movement through the dangerous ground." — `childId=antarian_ranger`; tag `ally_support`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd keep moving and use the available routes to avoid getting trapped." — primary tag `mobility`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.

### 59. Survivalist (`survivalist`)

You are stranded in an isolated region after a vehicle breakdown. Water is scarce, temperatures are dropping, and a rescue signal may take days to arrive.

**What would you do?**

**Children in source:** 0. **Primary tags:** `endurance`, `resilience`, `survivability`, `survival`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd keep going through the hardship while others recover." — primary tag `endurance`.
- "I'd keep the group steady when the setbacks become difficult." — primary tag `resilience`.
- "I'd secure food, shelter, and safety before taking unnecessary risks." — primary tag `survivability`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd look for a climbable route that avoids the most dangerous ground." — supporting tag `climb`.

### 60. Search-and-Rescue Specialist (`search_and_rescue_specialist`)

A distress beacon activates inside collapsed mines as another tremor shakes the area. Trapped workers may have little air, and the safest entry route is uncertain.

**What would you do?**

**Children in source:** 0. **Primary tags:** `ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd restore essential services before pushing ahead with the mission." — primary tag `recovery`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.

### 61. First-Contact Specialist (`first_contact_specialist`)

Your expedition encounters an unfamiliar community after a navigational error. Their gestures are difficult to interpret, and frightened crew members are reaching for weapons.

**What would you do?**

**Children in source:** 0. **Primary tags:** `exploration`, `knowledge`, `persuasion`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 62. Galactic Archaeologist (`galactic_archaeologist`)

Your team uncovers an ancient chamber containing fragile inscriptions and a sealed device. A sponsor urges immediate removal, but the site may hold dangerous unknowns.

**What would you do?**

**Children in source:** 4. **Primary tags:** `exploration`, `investigation`, `knowledge`, `perception`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd find the object's history before deciding whether removing it is worth the risk." — `childId=relic_hunter`; tag `exploration`.
- "I'd record the site carefully so the team does not destroy evidence in its hurry." — `childId=academic_archaeologist`; tag `exploration`.
- "I'd study the unfamiliar symbols and what they reveal about the people who made them." — `childId=xenoarchaeologist`; tag `exploration`.
- "I'd organize the team to preserve the site and avoid needless exposure." — `childId=archaeological_expedition_leader`; tag `exploration`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — supporting tag `survival`.

### 63. Prospector (`prospector`)

Survey readings suggest a valuable deposit beneath a hazardous ridge. Competitors are approaching, and your crew must decide whether to risk a difficult claim.

**What would you do?**

**Children in source:** 0. **Primary tags:** `exploration`, `perception`, `survival`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd keep going through the hardship while others recover." — supporting tag `endurance`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 64. Naturalist (`naturalist`)

An introduced predator appears to be destabilizing a frontier ecosystem. Settlers demand extermination, while scientists warn that the cause may be more complicated.

**What would you do?**

**Children in source:** 1. **Primary tags:** `exploration`, `knowledge`, `perception`, `survival`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd study the living environment and find a balanced way to protect the settlement." — `childId=agricorps_steward`; tag `force`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd survey unfamiliar ground and learn what options are available." — primary tag `exploration`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd read the creature's behavior before trying to influence it." — supporting tag `beast`.

### 65. Colony Pioneer (`colony_pioneer`)

A new settlement's power and irrigation systems fail during its first growing season. Families need immediate assistance, and materials for repairs are scarce.

**What would you do?**

**Children in source:** 0. **Primary tags:** `crafting`, `mechanics`, `support`, `survival`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd build a practical solution from the materials at hand." — primary tag `crafting`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 66. Beast Hunter (`beast_hunter`)

A large predator has begun attacking travelers near a remote town. Tracks lead into difficult terrain, and witnesses disagree about whether the creature is acting naturally.

**What would you do?**

**Children in source:** 4. **Primary tags:** `beast`, `perception`, `pursuit`, `survival`, `tracking`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd track the predator patiently and confront it on ground I understand." — `childId=trandoshan_jagannath_hunter`; tag `perception`; required species: species-trandoshan.
- "I'd coordinate with companions to surround the danger without trapping the innocents." — `childId=togruta_pack_hunter`; tag `flanking`; required species: species-togruta.
- "I'd watch the creature's habits and take a safe opening only when I am certain." — `childId=rodian_great_hunter`; tag `perception`; required species: species-rodian.
- "I'd follow the trail with patience and use the terrain to keep others safe." — `childId=barabel_great_hunter`; tag `perception`; required species: species-barabel.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd read the creature's behavior before trying to influence it." — primary tag `beast`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd follow the trail patiently without losing the objective." — primary tag `pursuit`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd follow small clues and preserve the trail." — primary tag `tracking`.

### 67. Beast Handler (`beast_handler`)

An anxious creature breaks loose near a crowded market. Bystanders panic, and the animal may harm someone if it feels cornered.

**What would you do?**

**Children in source:** 0. **Primary tags:** `beast`, `perception`, `survival`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd read the creature's behavior before trying to influence it." — primary tag `beast`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd work with a trusted creature instead of acting alone." — supporting tag `beast_companion`.
- "I'd speak to the people involved and search for agreement." — supporting tag `persuasion`.

### 68. Beast Rider (`beast_rider`)

Your mount becomes unsettled as a caravan approaches an unstable pass. Other riders want to continue, but the animals are sensing something the travelers cannot see.

**What would you do?**

**Children in source:** 2. **Primary tags:** `beast`, `mount`, `ride`, `rider`, `survival`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd calm the mount and guide the caravan by the animals' reactions to danger." — `childId=tusken_bantha_rider`; tag `beast`; required species: species-tusken-raider.
- "I'd work with the mount's instincts and lead the riders toward a safer crossing." — `childId=gungan_kaadu_cavalier`; tag `beast`; required species: species-gungan.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd read the creature's behavior before trying to influence it." — primary tag `beast`.
- "I'd settle the mount and use its strengths to navigate the danger." — primary tag `mount`.
- "I'd work with the mount and choose the safest line through." — primary tag `ride`.
- "I'd guide my mount around the hazard rather than forcing a reckless charge." — primary tag `rider`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.

### 69. Activist (`activist`)

A demonstration draws a large crowd after a local authority refuses to address public grievances. Tension rises when security officers arrive and organizers disagree about next steps.

**What would you do?**

**Children in source:** 2. **Primary tags:** `gather_information`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd bring affected droids into the conversation and organize a peaceful demand for change." — `childId=droid_rights_activist`; tag `droid`.
- "I'd organize witnesses and allies to challenge exploitation without sacrificing the people at risk." — `childId=zygerrian_abolitionist`; tag `gather_information`; required species: species-zygerrian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd ask careful questions and compare what different people know." — primary tag `gather_information`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.
- "I'd bring everyone together behind a clear plan." — supporting tag `leadership`.

### 70. Aristocrat (`aristocrat`)

A dispute over family obligations threatens an important alliance. Several relatives demand favors, and a public confrontation could undermine your position.

**What would you do?**

**Children in source:** 4. **Primary tags:** `leadership`, `persuasion`, `resources`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd settle the family obligations through careful favors and a clear display of authority." — `childId=hutt_kajidic_heir`; tag `intrigue`; required species: species-hutt.
- "I'd represent the family's duties publicly while listening to those affected by the dispute." — `childId=royal_heir`; tag `leadership`.
- "I'd manage the court's rival interests without allowing the confrontation to become public." — `childId=hapan_court_noble`; tag `intrigue`.
- "I'd use political standing and a measured show of strength to protect my position." — `childId=sith_pureblood_scion`; tag `leadership`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd use existing contacts and reserves to secure what is missing." — primary tag `resources`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 71. Bureaucrat (`bureaucrat`)

An urgent relief shipment is stalled by contradictory permits. Departments refuse to accept responsibility, and families waiting for supplies have run out of patience.

**What would you do?**

**Children in source:** 1. **Primary tags:** `knowledge`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd work through the chain of authority until the needed supplies are released." — `childId=yuuzhan_vong_intendant`; tag `deception`; required species: species-yuuzhan-vong.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd work out who is influencing events and what each person really wants." — supporting tag `intrigue`.
- "I'd speak to the people involved and search for agreement." — supporting tag `persuasion`.
- "I'd analyze the system data before changing anything." — supporting tag `use_computer`.

### 72. Celebrity (`celebrity`)

A public appearance is disrupted by accusations against one of your sponsors. Fans demand answers, your manager urges silence, and journalists surround the venue.

**What would you do?**

**Children in source:** 2. **Primary tags:** `deception`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd address the audience openly and protect the people who trusted my reputation." — `childId=holostar`; tag `deception`.
- "I'd turn the confrontation into a controlled contest rather than let the crowd riot." — `childId=geonosian_arena_champion`; tag `control`; required species: species-geonosian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.
- "I'd guide the conversation toward an outcome others can accept." — supporting tag `manipulation`.

### 73. Community Leader (`community_leader`)

A neighborhood must decide how to distribute aid after a flood. Families have different needs, and rumors of favoritism are dividing the volunteers.

**What would you do?**

**Children in source:** 2. **Primary tags:** `ally_support`, `leadership`, `persuasion`, `social`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd gather the clan's voices and make a decision that preserves their trust." — `childId=mandalorian_clan_leader`; tag `command`.
- "I'd seek consensus while protecting the community's shared home and resources." — `childId=ithorian_herdship_steward`; tag `leadership`; required species: species-ithorian.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd help the people doing essential work succeed." — primary tag `support`.

### 74. Corporate Operator (`corporate_operator`)

A major contract is threatened by a competitor's sudden offer. Executives disagree about the risks, and workers fear the deal will put their jobs in jeopardy.

**What would you do?**

**Children in source:** 7. **Primary tags:** `intrigue`, `leadership`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd learn which executives hold the deciding influence and make the strongest factual case." — `childId=corporate_agent`; tag `intrigue`.
- "I'd identify the operational failure and solve it before it becomes a political crisis." — `childId=corporate_troubleshooter`; tag `control`.
- "I'd protect the workforce while evaluating the project's long-term value." — `childId=quarren_deep_sea_industrialist`; tag `leadership`; required species: species-quarren.
- "I'd inspect production limits and propose an achievable plan for the workers." — `childId=geonosian_foundry_master`; tag `crafting`; required species: species-geonosian.
- "I'd negotiate a new arrangement that protects the trade route and financial interests." — `childId=neimoidian_trade_viceroy`; tag `intrigue`; required species: species-neimoidian.
- "I'd use technical evidence to expose the contract's weaknesses before approval." — `childId=skakoan_techno_union_technocrat`; tag `knowledge`; required species: species-skakoan.
- "I'd bring key stakeholders together and build a coalition around the proposal." — `childId=koorivar_corporate_magnate`; tag `intrigue`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 75. Courtier (`courtier`)

During a formal gathering, a private remark becomes a political scandal. Several influential guests are watching how you respond, and an ally may be implicated.

**What would you do?**

**Children in source:** 4. **Primary tags:** `deception`, `intrigue`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd identify who started the rumor and settle the matter through discreet conversations." — `childId=political_fixer`; tag `gather_information`.
- "I'd manage the patron's interests without letting rival courtiers control the story." — `childId=hutt_majordomo`; tag `intrigue`; required species: species-hutt.
- "I'd gather reliable information and protect the household's position before speaking publicly." — `childId=chiss_house_agent`; tag `deception`.
- "I'd read the room's tension and redirect the conversation before it turns hostile." — `childId=zeltron_empathic_courtier`; tag `manipulation`; required species: species-zeltron.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd work out who is influencing events and what each person really wants." — primary tag `intrigue`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 76. Diplomat (`diplomat`)

Negotiations between two governments collapse when one delegation accuses the other of withholding information. Neither side will concede, and the signing deadline is hours away.

**What would you do?**

**Children in source:** 6. **Primary tags:** `knowledge`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd find what each side is truly prepared to accept and reopen the talks." — `childId=negotiator`; tag `manipulation`.
- "I'd listen to both delegations fairly and propose a compromise neither has considered." — `childId=mediator`; tag `ally_support`.
- "I'd clarify the disputed language and customs before anyone makes another accusation." — `childId=protocol_droid`; tag `droid`.
- "I'd build legislative support for an agreement that both governments can defend at home." — `childId=senator`; tag `intrigue`.
- "I'd share a remembered lesson about conflict to help the delegations recognize their common risks." — `childId=caamasi_memory_keeper`; tag `knowledge`; required species: species-caamasi.
- "I'd identify the technical dispute beneath the accusation and offer a workable solution." — `childId=anomid_technical_diplomat`; tag `knowledge`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.
- "I'd bring everyone together behind a clear plan." — supporting tag `leadership`.

### 77. Educator (`educator`)

Your students disagree fiercely over how to approach a difficult field exercise. Some are falling behind, and the institution expects results before the end of the term.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ally_support`, `knowledge`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd teach the struggling learners a new approach instead of leaving them behind." — `childId=educorps_scholar`; tag `ally_support`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd speak to the people involved and search for agreement." — supporting tag `persuasion`.
- "I'd apply careful practice and established technique to the problem." — supporting tag `skill_mastery`.

### 78. Entertainer (`entertainer`)

Your performance is interrupted when a key collaborator disappears and an angry audience demands answers. The venue owner wants the show to continue regardless.

**What would you do?**

**Children in source:** 1. **Primary tags:** `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd keep the performance together through technical skill and careful attention to the ensemble." — `childId=bith_virtuoso`; tag `perception`; required species: species-bith.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd use controlled movement to get through the difficult space safely." — supporting tag `acrobatics`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 79. Merchant Prince (`merchant_prince`)

A major trade agreement offers enormous profit but depends on a partner with an unreliable record. Your agents disagree on the risk, and rivals are preparing a competing deal.

**What would you do?**

**Children in source:** 1. **Primary tags:** `leadership`, `minion`, `persuasion`, `social`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd analyze the financing and restructure the deal before accepting its risks." — `childId=muun_banking_magnate`; tag `knowledge`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd coordinate dependable helpers rather than trying to do everything alone." — primary tag `minion`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd create a believable explanation that gives us room to maneuver." — supporting tag `deception`.

### 80. Planetary Governor (`planetary_governor`)

A planetary emergency forces you to choose how to allocate a limited response budget. Political factions are already blaming one another, and citizens need decisive action.

**What would you do?**

**Children in source:** 0. **Primary tags:** `leadership`, `persuasion`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd work out who is influencing events and what each person really wants." — supporting tag `intrigue`.
- "I'd research the underlying problem before trusting an easy answer." — supporting tag `knowledge`.

### 81. Propagandist (`propagandist`)

A government asks you to shape a public message after a disastrous incident. The official account conflicts with witness reports, and rumors are spreading rapidly.

**What would you do?**

**Children in source:** 0. **Primary tags:** `deception`, `manipulation`, `persuasion`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd guide the conversation toward an outcome others can accept." — primary tag `manipulation`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd ask careful questions and compare what different people know." — supporting tag `gather_information`.

### 82. Revolutionary Statesman (`revolutionary_statesman`)

An old regime has fallen, but rival factions now disagree about the new government's first laws. Armed supporters threaten to withdraw from the fragile coalition.

**What would you do?**

**Children in source:** 0. **Primary tags:** `leadership`, `persuasion`, `social`, `support`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd help the people doing essential work succeed." — primary tag `support`.
- "I'd work with the people most affected and help them act together." — supporting tag `ally_support`.

### 83. Spiritual Leader (`spiritual_leader`)

Your followers disagree about the meaning of a troubling omen during a community crisis. Some demand strict observance, while others seek practical help immediately.

**What would you do?**

**Children in source:** 1. **Primary tags:** `ally_support`, `leadership`, `persuasion`, `social`, `support`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd help the followers interpret their tradition while responding to the community's immediate needs." — `childId=yuuzhan_vong_priest`; tag `ally_support`; required species: species-yuuzhan-vong.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd bring everyone together behind a clear plan." — primary tag `leadership`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd help the people doing essential work succeed." — primary tag `support`.

### 84. Warrior-Priest (`warrior_priest`)

A sacred site is threatened by armed intruders, and frightened worshippers look to you for guidance. Fighting could destroy what you came to protect.

**What would you do?**

**Children in source:** 0. **Primary tags:** `melee`, `perception`, `persuasion`, `social`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd speak to the people involved and search for agreement." — primary tag `persuasion`.
- "I'd listen to the people involved and build useful relationships." — primary tag `social`.
- "I'd seek guidance through the Force before choosing a course." — supporting tag `force`.

### 85. Jedi Guardian (`jedi_guardian`)

A hostile group breaks into a sanctuary while civilians shelter inside. Your allies are scattered, and direct combat may endanger those you hope to defend.

**What would you do?**

**Children in source:** 3. **Primary tags:** `defense`, `force`, `force_defense`, `lightsaber`, `melee`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd organize a disciplined defense and face the most immediate danger without losing control." — `childId=jedi_battlemaster`; tag `force`.
- "I'd secure the sanctuary's approaches and protect those sheltering inside." — `childId=jedi_temple_guard`; tag `defense`.
- "I'd seek to end the violence with the least harm possible." — `childId=jedi_peacekeeper`; tag `control`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd secure the vulnerable position before taking further risks." — primary tag `defense`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd use calm focus and defensive Force training to protect those in danger." — primary tag `force_defense`.
- "I'd use careful lightsaber technique to control the confrontation." — primary tag `lightsaber`.
- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.

### 86. Jedi Consular (`jedi_consular`)

A frightened settlement asks for guidance after unusual disturbances and growing mistrust. The local leaders disagree on whether to seek spiritual counsel or immediate intervention.

**What would you do?**

**Children in source:** 8. **Primary tags:** `ally_support`, `force`, `force_support`, `knowledge`, `support`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd attend to the injured and keep the frightened community calm." — `childId=jedi_healer`; tag `ally_support`.
- "I'd build or repair the tool that would let the settlement handle its immediate problem." — `childId=jedi_artisan`; tag `crafting`.
- "I'd search the old teachings for a lesson that clarifies the disturbance." — `childId=jedi_lore_keeper`; tag `force`.
- "I'd help the residents learn what they can do to protect themselves together." — `childId=jedi_instructor`; tag `ally_support`.
- "I'd bring the opposing leaders into a conversation before their fears deepen." — `childId=jedi_diplomat`; tag `force`.
- "I'd reflect on the warning in the Force without pretending to know exactly what it means." — `childId=jedi_seer`; tag `force`.
- "I'd study the place's history for clues to the source of the disturbance." — `childId=jedi_archaeologist`; tag `exploration`.
- "I'd test the available evidence and reconsider any explanation that does not fit." — `childId=jedi_researcher`; tag `force`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd work with the people most affected and help them act together." — primary tag `ally_support`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd use the Force to steady and support the people beside me." — primary tag `force_support`.
- "I'd research the underlying problem before trusting an easy answer." — primary tag `knowledge`.
- "I'd help the people doing essential work succeed." — primary tag `support`.

### 87. Jedi Sentinel (`jedi_sentinel`)

Security records suggest that someone has been using old technology to conceal activity near a Force-sensitive site. Witnesses contradict each other, and equipment keeps failing.

**What would you do?**

**Children in source:** 4. **Primary tags:** `force`, `investigation`, `mechanics`, `perception`, `tech`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd investigate without revealing myself until I know who is hiding the activity." — `childId=jedi_shadow`; tag `detection`.
- "I'd follow the threat's pattern and protect the people most exposed to it." — `childId=jedi_watchman`; tag `force`.
- "I'd compare the records and witness accounts until the missing facts become clear." — `childId=jedi_investigator`; tag `detection`.
- "I'd search beyond the familiar area for the source of the unexplained signals." — `childId=jedi_explorer`; tag `exploration`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd reconstruct the evidence instead of accepting the first explanation." — primary tag `investigation`.
- "I'd inspect the machinery and identify a fixable failure." — primary tag `mechanics`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd analyze the technology and look for a workable solution." — primary tag `tech`.

### 88. Sith Warrior (`sith_warrior`)

A powerful rival challenges your authority before witnesses who expect a display of strength. The encounter could become a dangerous duel or a struggle for influence.

**What would you do?**

**Children in source:** 1. **Primary tags:** `dark_side`, `force`, `force_offense`, `lightsaber`, `melee`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd press the challenge with sustained strength and make the rival back down." — `childId=sith_marauder`; tag `damage`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd turn the fear and ambition around me into an advantage." — primary tag `dark_side`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd prepare to confront the threat with disciplined Force techniques." — primary tag `force_offense`.
- "I'd use careful lightsaber technique to control the confrontation." — primary tag `lightsaber`.
- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.

### 89. Sith Assassin (`sith_assassin`)

A guarded rival is due to transfer sensitive intelligence, but the surrounding security includes people uninvolved in your conflict. Your window is narrowing.

**What would you do?**

**Children in source:** 0. **Primary tags:** `dark_side`, `force`, `infiltration`, `stealth`, `use_the_force`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd turn the fear and ambition around me into an advantage." — primary tag `dark_side`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd find a quiet way past the defenses before anyone notices." — primary tag `infiltration`.
- "I'd approach without drawing attention until the situation is understood." — primary tag `stealth`.
- "I'd reach for the Force carefully and learn what it can reveal." — primary tag `use_the_force`.

### 90. Sith Sorcerer (`sith_sorcerer`)

A mysterious artifact appears to amplify dark-side phenomena, but repeated experiments have produced unstable results. An impatient patron demands access to its power.

**What would you do?**

**Children in source:** 5. **Primary tags:** `alchemy`, `dark_side`, `force`, `force_offense`, `force_power`, `knowledge`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd experiment carefully with the artifact's properties before attempting to command it." — `childId=sith_alchemist`; tag `alchemy`.
- "I'd question those who have handled the artifact and uncover what they are concealing." — `childId=sith_inquisitor`; tag `dark_side`.
- "I'd consult forbidden records and trace the artifact's origin before trusting its promise." — `childId=sith_scholar`; tag `dark_side`.
- "I'd weigh the ominous signs and use the uncertainty to influence what happens next." — `childId=dark_prophet`; tag `dark_side`.
- "I'd study the ritual context before attempting to draw power from the relic." — `childId=kissai_dark_priest`; tag `alchemy`; required species: species-kissai.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd study the substance and test the safest controlled change." — primary tag `alchemy`.
- "I'd turn the fear and ambition around me into an advantage." — primary tag `dark_side`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd prepare to confront the threat with disciplined Force techniques." — primary tag `force_offense`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.

### 91. Sith Manipulator (`sith_manipulator`)

Two powerful figures could advance your ambitions, but each distrusts the other. Their rivalry may become violent unless someone controls the flow of information.

**What would you do?**

**Children in source:** 0. **Primary tags:** `control`, `dark_side`, `deception`, `force`, `manipulation`, `social`, `use_the_force`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd limit the other side's choices without making the situation worse." — primary tag `control`.
- "I'd turn the fear and ambition around me into an advantage." — primary tag `dark_side`.
- "I'd create a believable explanation that gives us room to maneuver." — primary tag `deception`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd guide the conversation toward an outcome others can accept." — primary tag `manipulation`.

### 92. Dark-Side Cultist (`dark_side_cultist`)

A secluded order discovers an unfamiliar ritual text just as members begin questioning its leadership. Some want immediate experimentation; others fear the consequences.

**What would you do?**

**Children in source:** 0. **Primary tags:** `dark_side`, `force`, `force_power`, `force_training`, `talisman`, `use_the_force`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd turn the fear and ambition around me into an advantage." — primary tag `dark_side`.
- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.
- "I'd strengthen my understanding of the Force before acting rashly." — primary tag `force_training`.
- "I'd study the ritual object and its risks before relying on it." — primary tag `talisman`.

### 93. Force Exile (`force_exile`)

You discover a place where the Force feels unusually strong while pursuers close in. Local residents seek your help, but revealing your abilities may expose you.

**What would you do?**

**Children in source:** 0. **Primary tags:** `force`, `survival`, `use_the_force`.

**No canonical child specialization.** The menu is populated from tag-based methods.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.
- "I'd reach for the Force carefully and learn what it can reveal." — primary tag `use_the_force`.
- "I'd avoid the obvious danger and find an unexpected way through." — supporting tag `evasion`.
- "I'd use calm focus and defensive Force training to protect those in danger." — supporting tag `force_defense`.

### 94. Force Mystic (`force_mystic`)

During meditation, you experience a disturbing impression connected to a nearby community. Its people need help, yet the experience is too uncertain to interpret confidently.

**What would you do?**

**Children in source:** 5. **Primary tags:** `force`, `force_power`, `force_training`, `meditation`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd consider the Force's wider possibilities before treating my first impression as certainty." — `childId=aing_tii_monk`; tag `force`.
- "I'd help the community find calm and support while I seek clearer understanding." — `childId=tyia_adept`; tag `ally_support`.
- "I'd avoid revealing more than I understand and protect others through subtle action." — `childId=fallanassi_adept`; tag `force`.
- "I'd travel toward the source of the disturbance and learn through direct experience." — `childId=force_pilgrim`; tag `exploration`.
- "I'd withdraw from the noise of the crowd and reflect until I can act with care." — `childId=force_hermit`; tag `force`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.
- "I'd strengthen my understanding of the Force before acting rashly." — primary tag `force_training`.
- "I'd quiet my thoughts and reflect before deciding." — primary tag `meditation`.
- "I'd reach for the Force carefully and learn what it can reveal." — primary tag `use_the_force`.

### 95. Force Seer (`force_seer`)

A vision suggests an approaching catastrophe, but its images could refer to several locations. Others demand a definite warning, and time is limited.

**What would you do?**

**Children in source:** 2. **Primary tags:** `force`, `force_power`, `force_training`, `perception`, `precognition`, `use_the_force`, `visions`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd interpret the warning carefully and advise practical preparations rather than prophecy alone." — `childId=baran_do_sage`; tag `force`.
- "I'd attend to what the Force reveals while checking how it affects the people nearby." — `childId=miraluka_force_seer`; tag `force`; required species: species-miraluka.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.
- "I'd strengthen my understanding of the Force before acting rashly." — primary tag `force_training`.
- "I'd observe the details others might miss before making a move." — primary tag `perception`.
- "I'd consider what warning signs might reveal about what comes next." — primary tag `precognition`.

### 96. Force Warrior (`force_warrior`)

An opponent using unfamiliar techniques threatens a group you are protecting. Your companions want to charge, but the Force suggests the confrontation may unfold unpredictably.

**What would you do?**

**Children in source:** 8. **Primary tags:** `force`, `force_offense`, `force_power`, `force_training`, `melee`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd protect the group from the unusual opponent while studying how they move." — `childId=warden_of_the_sky`; tag `force`.
- "I'd rely on disciplined Force training and defensive positioning to control the encounter." — `childId=zeison_sha_warrior`; tag `force`.
- "I'd use careful physical discipline and endurance to keep the opponent from breaking through." — `childId=matukai_adept`; tag `endurance`.
- "I'd study the environment and use the forces around us to change the battle's conditions." — `childId=shaper_of_kro_var`; tag `force`.
- "I'd hold a protective stance and use the Force only where it helps my allies." — `childId=jensaarai_defender`; tag `armor`.
- "I'd act decisively in defense of my sworn duty while protecting the people at risk." — `childId=imperial_knight`; tag `armor`.
- "I'd coordinate my mechanical systems with Force-guided judgment rather than charging blindly." — `childId=iron_knight`; tag `droid`; required species: species-shard.
- "I'd stay mobile and defend the vulnerable while testing the opponent's technique." — `childId=kilian_ranger`; tag `defense`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd prepare to confront the threat with disciplined Force techniques." — primary tag `force_offense`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.
- "I'd strengthen my understanding of the Force before acting rashly." — primary tag `force_training`.
- "I'd move into close range where I can control the immediate threat." — primary tag `melee`.

### 97. Force Witch (`force_witch`)

A natural sanctuary is threatened by outsiders who dismiss its traditions. The community looks to you for guidance, and the surrounding wilderness is changing in strange ways.

**What would you do?**

**Children in source:** 1. **Primary tags:** `force`, `force_power`, `force_training`, `nature`, `survival`, `use_the_force`.

**Child-specialization approaches** (only when applicable; more than five require additional pages):

- "I'd seek guidance from my coven's traditions and work with the natural surroundings." — `childId=nightsister`; tag `dark_side`.

**Q3-style tag-based methods** (backfill if fewer than five applicable child answers):

- "I'd seek guidance through the Force before choosing a course." — primary tag `force`.
- "I'd study which Force techniques might address the problem." — primary tag `force_power`.
- "I'd strengthen my understanding of the Force before acting rashly." — primary tag `force_training`.
- "I'd read the patterns in the surrounding environment." — primary tag `nature`.
- "I'd use fieldcraft to keep everyone safe in the conditions." — primary tag `survival`.

## Runtime acceptance tests (not implemented)

1. Every parent has one Q4 scenario and at least five backfill methods.
2. Every source child maps to exactly one parent and exactly one child option.
3. An exact `species.required` mismatch removes that child only from the displayed candidates, without deleting the record.
4. The combined eligible-child-plus-method ordering paginates in sets of at most five with no repeated option IDs.
5. A parent with 8 or 9 children preserves access to every applicable child; no hidden fifth-option truncation.
6. A parent with zero children receives five tag-linked method answers and never invents a child.
7. Q3 answer changes cannot change Q4 scenario or rank; Q2 parent changes invalidate the previous Q4 answer and regenerate from the new exact parent ID.
8. Only a committed Q4 answer emits typed intent, and a child aspiration never grants species, class, skill, feat, talent, or prestige eligibility.
9. All tag IDs are checked against the current canonical SSOT primary lane and frozen 190-tag ontology.
10. Exact species, droid-form, faction, Force tradition, and cultural gate decisions are reconciled against certified authority before shipping.

## Editorial QA needed

- These situations and 685 responses are first-pass content. Each specialization line is individually authored, but still needs review for canon specificity and mechanical accuracy.
- Child display names in this draft are ID-derived for authoring only. In production, resolve canonical `ArchetypeRegistry.getArchetype(childId).name`, never derive labels from a slug.
- Ten droid-body review candidates are marked but not excluded by this editorial bank. Apply a droid-form gate only after canonical eligibility verification.
- Some paths may have ethical or dark-side implications, but no morality score is assigned by the survey without a deliberate player decision and separate canonical rules.
- If no career is selected at Q2, Q4 is omitted/skip-eligible; it does not invent a profession.
