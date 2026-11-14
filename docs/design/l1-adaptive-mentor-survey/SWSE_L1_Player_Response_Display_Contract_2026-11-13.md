# SWSE L1 Mentor Survey - Player Response Display Contract

Date: 2026-11-13
Status: OWNER-APPROVED presentation rule
Scope: Every one of the five L1 survey questions for Jedi, Noble, Scoundrel, Scout, and Soldier.
Git status: LOCAL ONLY. No commit/push authorization.

## Approved behavior

1. Each survey stage presents a **fixed, character-specific Mentor introduction**, then the **question**, then **selectable first-person dialogue responses**.
2. The visible selectable response is **only its first-person quoted statement**, without a class path name, role heading, option title, category badge, archetype label, numeric score, mechanic tag, or programmer-facing ID.
3. Internal canonical option identity, typed mechanical references, evidence provenance, scoring/intent tags, and development classifications may be retained in metadata; they must not become separate visible answer labels.
4. The player may choose an "I'm not sure yet" first-person statement. It represents no explicit specialization preference and must not produce positive generalist or negative specialist evidence.
5. The rule applies uniformly to **all five mentors and all five questions**, including adaptive questions Q2-Q4. Only deliberate selections contribute affirmative survey intent; merely seeing or browsing choices does not.
6. Mentor introduction lines are fixed per class and stage; question/answer selection may adapt to actual chargen context without modifying the Mentor's voice lines.
7. This presentation rule supersedes the label-bearing mockups in previously authored Q1 design documents. Their labels remain **internal design shorthand only**, not intended player-facing UI.

## Scout Q1 example - approved display style, option content remains draft

Mentor (Lead): "You can't be good at everything. Anyone who tells you otherwise is either lying or about to become a casualty. So, where do you want to put your effort?"

Question: Which part of your Scout training do you most want to develop first?

- "I want to stay mobile, react quickly, and learn how to keep enemies from pinning me down."
- "I want to explore unfamiliar places, find a path where others can't, and keep myself and my companions alive far from help."
- "I want to become a patient observer and accurate marksman, knowing when and where a single shot will matter most."
- "I want to learn to read tracks, follow targets, and find what others have lost or tried to hide."
- "I want to master piloting and travel, getting my crew into difficult places and bringing them safely back out."
- "I'm not sure yet. I want to learn what I'm capable of before I decide where to concentrate my training."

## Implementation acceptance checks (design only)

- Rendering a response does not expose `name`, `detailRailTitle`, `detailTags`, `archetypeHint`, or role labels as part of the selectable utterance.
- The selected radio/choice label is the dialogue statement itself and remains accessible to screen readers.
- Only the chosen response is recorded as intent; no extra evidence is produced by showing an option.
- No change to approved Mentor introduction lines is implied.
- Current Q1 player response **content** for classes not yet approved remains provisional.
