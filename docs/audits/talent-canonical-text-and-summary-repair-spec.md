# TALENT CANONICAL TEXT + PLAYER SUMMARY REPAIR SPEC

**Status:** IMPLEMENTATION SPEC / READY FOR EXECUTION  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Purpose

Normalize every SWSE talent so players have two distinct text layers:

1. **Canonical Rules Text** — faithful to the published SWSE source.
2. **Quick Summary** — a short player-facing explanation that can be scanned quickly in progression and character-sheet UI.

The canonical text must never be replaced by a paraphrase.

---

# 1. Current repository state

Current `packs/talents.db` census:

| Field condition | Count |
|---|---:|
| Total talents | **1,024** |
| Has `system.benefit` | **1,023** |
| Has `system.description` text | **999** |
| `benefit` exactly equals description text | **715** |
| Has `system.summary` | **0** |

This means the repository already has substantial talent text, but it is not authoritative or consistently normalized.

Known examples demonstrate that some current descriptions are:

- shortened paraphrases;
- HTML-wrapped versions of benefit text;
- contaminated by unrelated mechanics;
- modified for implementation assumptions;
- attached to the wrong tree identity;
- ambiguous because multiple published talents share the same name.

Therefore this is a **source repair**, not a simple copy/formatting task.

---

# 2. Source authority

Use this hierarchy:

1. **Published SWSE sourcebook PDF** — final authority.
2. **Sourcebook TXT/DJVU export** — fast indexing/extraction.
3. **Canonical talent-tree registry** — identity/provenance aid.
4. **SWSE Fandom** — secondary lookup only.
5. Current repository text — comparison target, never canonical authority.

TXT files should be used to find and extract candidate source text at scale.

PDF pages must be consulted when:

- OCR wording is unclear;
- punctuation materially changes the rule;
- a heading/tree boundary is uncertain;
- a same-name talent has multiple published identities;
- the TXT appears corrupted;
- a sourcebook identity is disputed.

---

# 3. Canonical identity rule

Never match a source talent to a repository record by name alone.

Minimum identity:

```text
sourcebook + talent tree + talent name
```

Where available also use:

```text
printed page
class / prestige-class / tradition access context
repository tree ID
canonical tree registry identity
```

Confirmed same-name hazards already include:

- Squad Leader [tree identity]
- Seize the Moment
- Blend In
- Strength in Numbers
- Mobile Combatant
- Notorious
- Force Treatment
- Armor Mastery
- Ruthless
- Keep It Together
- Akk Dog Master

A same-name match in another tree is not permission to overwrite or move that record.

---

# 4. Storage contract

For normal published talents, use the following text contract.

## 4.1 `system.benefit` — canonical mechanical text

Store the talent's complete published rules/effect wording, normalized only for data hygiene.

Allowed normalization:

- remove page headers/footers;
- repair obvious OCR character corruption;
- normalize whitespace;
- normalize line wrapping;
- preserve paragraph boundaries;
- preserve bullets/lists;
- preserve capitalization where practical;
- preserve numbers, ranges, action types, timing, frequencies, conditions and defined terms exactly in meaning.

Do **not**:

- simplify the mechanic;
- rewrite it into implementation terminology;
- add Foundry instructions;
- omit clauses because the current runtime does not automate them;
- silently merge text from another source/talent.

## 4.2 `system.description.value` — canonical full player-readable rules text

For talents, this should normally mirror the canonical `system.benefit`.

Preferred invariant:

```javascript
system.description.value === system.benefit
```

This is already expected by existing hydration tests for several repaired talent trees.

If the current storage shape uses a scalar description rather than `{ value }`, preserve the canonical text semantically and normalize through the pack's established talent item shape.

No paraphrase belongs here.

## 4.3 `system.summary` — short player-facing explanation

Add a concise summary for quick reading.

The summary is **not canonical source text** and must never be used as mechanical authority.

Target:

- normally 1 sentence;
- occasionally 2 short sentences where one sentence would be misleading;
- roughly 80–220 characters when practical;
- state the trigger/action and primary effect;
- include a critical usage limit if omitting it would materially mislead the player;
- omit prerequisite repetition unless the prerequisite is part of how the talent functions;
- avoid implementation language such as "toggle", "flag", "engine", "resolver", or "Foundry".

Example shape:

```text
Canonical:
Whenever you hit an opponent with a melee attack and the damage equals
or exceeds its damage threshold, the target moves an additional -1 step
along the condition track.

Summary:
Melee hits that beat the target's damage threshold move it 1 extra step down the condition track.
```

Summary text may modernize sentence structure for clarity but must not change the rule.

---

# 5. Prerequisites

Printed prerequisite lines belong in:

```text
system.prerequisites
system.prerequisitesStructured
```

as appropriate.

Do not embed the prerequisite line into the summary.

For the canonical full description:

- the mechanical benefit text should remain readable independently;
- prerequisite data remains separately visible in the talent UI;
- if a published "Prerequisite:" line currently exists inside `benefit`, migrate it into the prerequisite field rather than duplicating it, provided the source identity is certain.

Do not alter structured prerequisite logic solely because the printed prose is being repaired. Record discrepancies for the prerequisite audit if the structured representation disagrees.

---

# 6. Special clauses

If the book includes a mechanically significant `Special:`, usage note, repeated-selection rule, or similar clause:

1. preserve it in the canonical full player-readable text;
2. populate/retain `system.special` when the repository schema uses that field;
3. do not omit it from the canonical rules presentation merely because it exists separately.

The canonical player view must expose the complete rule.

The summary may omit the special clause only when doing so does not materially mislead a player scanning the talent.

---

# 7. Flavor vs rules text

Some talent entries include introductory flavor before the mechanical effect.

Preserve source-authored mechanically relevant wording.

Do not invent flavor.

If source formatting clearly distinguishes a flavor sentence from the actual rule, the full canonical description may preserve both when useful, but the summary should describe the mechanic only.

---

# 8. Source metadata

When the source identity is known from the audit/sourcebook, populate authoritative provenance:

```text
system.sourcebook
system.page
```

Do not trust the current repository source field as canonical.

Current pack census shows very little dependable explicit provenance:

- only a small minority currently contain useful source/page fields.

Use the canonical tree registry and sourcebook lookup instead.

---

# 9. UI contract

Player-facing surfaces should prefer:

## Compact surfaces

```text
Name
Talent Tree
Prerequisites
Summary
```

Use `system.summary`.

Examples:

- progression list/details preview;
- character-sheet talent ledger;
- search/result cards;
- compact tooltips.

## Expanded talent view

```text
Name
Tree
Source + Page
Prerequisites
Quick Summary
Full Rules
Special
```

"Full Rules" must use the canonical description/benefit text.

The summary must never replace the full rules text in the expanded view.

---

# 10. Resolver changes

Current `scripts/items/talent-data-resolver.js` resolves only a single `benefit` presentation value.

Extend its presentation contract to expose both:

```javascript
summary: asText(system.summary || system.shortSummary || '', ''),
benefit: asText(system.benefit || system.effect || system.description, ''),
description: canonicalDescriptionText
```

Exact implementation should follow repository conventions.

The resolver must not generate or infer summaries at runtime.

Summaries are authored data.

---

# 11. RowTransformer changes

Current `RowTransformers.toTalentRow()` exposes:

```javascript
description: safeText(item.system?.description ?? item.system?.benefit, '')
```

Add a separate compact summary field:

```javascript
summary: safeText(
  item.system?.summary
  ?? item.system?.shortSummary
  ?? item.system?.description
  ?? item.system?.benefit,
  ''
)
```

During migration, fallback is allowed for compatibility.

After corpus completion, canonical talent records should explicitly own `system.summary`.

Do not overwrite `description` with the summary.

---

# 12. Search behavior

Progression/search code already includes `system.summary` in several searchable text paths.

Retain search across both:

- canonical description/benefit;
- player summary.

This lets a user find a talent by either exact rules language or plain-language terminology.

---

# 13. Source extraction workflow

Process talent text by **sourcebook and tree**, never as a flat name list.

For each sourcebook:

```text
book
  -> talent tree
     -> canonical talent identity
        -> locate printed entry
        -> capture full rules text
        -> capture prerequisites
        -> generate player summary
        -> compare repository record
        -> write repaired record
```

Tree-scoped processing prevents same-name collisions.

---

# 14. Expansion talents

A later sourcebook can add new talents to an older tree.

Do not assume the sourcebook that originated the tree is the source of every member.

Use:

`data/audits/talent-canonical-tree-registry.json`

and its:

```text
originTalentNames
talentPublications[]
```

model.

A talent's text must come from the sourcebook that **published that talent**, not necessarily the sourcebook that first introduced the tree.

---

# 15. Missing and malformed identities

If the canonical talent does not currently have a safe one-to-one repository identity:

Do not overwrite the nearest same-name record.

Classify it instead.

Examples:

```text
MISSING_CONTENT
SAME_NAME_VARIANT
SPLIT_TREE_IDENTITY
INVALID_DUPLICATE
IDENTITY_CONTAMINATION
WRONG_TREE
```

Create/repair identities only according to the source-certified structural audit.

Known examples:

- Galaxy at War / Elite Trooper Squad Leader is a separate missing tree.
- GenoHaradan is split across two repo tree documents.
- Galaxy of Intrigue Blend In is distinct from Spy Blend In.
- Unknown Regions Strength in Numbers is distinct from Republic Commando Strength in Numbers.
- Galaxy at War Mobile Combatant is distinct from the existing Jedi Guardian talent.
- Core Bounty Hunter Notorious and Infamy Notorious require tree-scoped identities.

---

# 16. Summary authoring rules

The summary should answer, as quickly as possible:

```text
When/how do I use this?
What does it do?
What major limit should I remember?
```

Good:

```text
Spend a Force Point when creating the talisman to gain its defensive benefit while carrying it.
```

Bad:

```text
This talent makes your talisman better.
```

Good:

```text
Once per encounter, reroll the chosen check and keep the better result.
```

Bad:

```text
You are more skilled at this action.
```

Do not put unsupported tactical advice in the summary.

Do not editorialize.

Do not describe intended runtime automation.

---

# 17. Verification rules

For every repaired talent, validate:

- canonical identity matches sourcebook + tree;
- canonical text was extracted from the correct published talent;
- prerequisite text matches source;
- summary does not contradict any canonical clause;
- sourcebook/page are accurate when recorded;
- existing talent ID is preserved when identity is genuinely the same;
- same-name distinct identities remain distinct;
- no abilityMeta/runtime rule was silently changed as part of text repair.

Text repair and mechanical implementation repair are separate concerns.

If canonical text exposes a metadata/runtime mismatch, log it; do not opportunistically rewrite runtime mechanics in the same batch unless explicitly authorized.

---

# 18. Recommended batch strategy

Do not attempt an unreviewed 1,024-record one-shot rewrite.

Use sourcebook-sized batches.

Recommended sequence:

1. Core Rulebook
2. Clone Wars Campaign Guide
3. Rebellion Era Campaign Guide
4. Galaxy at War
5. Galaxy of Intrigue
6. Unknown Regions
7. Scavenger's Guide to Droids
8. Scum and Villainy
9. Legacy Era
10. Force Unleashed
11. KOTOR
12. Starships of the Galaxy
13. Jedi Academy
14. remaining books
15. Force/special/droid trees

For each batch:

1. generate candidate repairs;
2. validate identities against canonical registry;
3. visually/PDF-check ambiguous OCR;
4. write canonical text;
5. author summaries;
6. run corpus assertions;
7. publish an audit Markdown;
8. commit separately.

---

# 19. Required tests / corpus assertions

Add a corpus verifier for published talents.

At minimum assert:

```text
all canonical talent records have non-empty benefit
all canonical talent records have non-empty description
all canonical talent records have non-empty summary
summary != full canonical text for normal multi-sentence talents
summary is below a reasonable length ceiling
no summary contains Foundry/runtime implementation jargon
source-certified records have sourcebook/page where available
no duplicate repository ID is assigned to two canonical identities
```

Do not assert exact summary prose; summaries are editorial presentation.

For canonical rules text, exact expected text fixtures may be used for targeted regression cases, but avoid fragile whitespace-only tests.

---

# 20. Migration compatibility

Existing code often falls back among:

```text
benefit
description
effect
summary
```

During migration:

- preserve `system.benefit`;
- preserve/populate canonical `system.description`;
- add `system.summary`;
- update presentation consumers to prefer summary only where compact text is intended.

Do not remove `benefit` yet.

A later schema cleanup can decide whether benefit/description duplication should be retired after all consumers are normalized.

---

# 21. Acceptance criteria

The talent-text repair is complete when every source-certified published talent has:

```text
canonical identity
canonical tree
sourcebook
page
canonical prerequisite text
canonical full rules text
short player summary
```

and compact UI surfaces show the summary while expanded surfaces expose the full rules text.

No player should have to choose between:

- readable text;
- complete rules text.

They should get both.

---

# 22. Recommended immediate implementation

Start with the **Core Rulebook text batch**, because Phase 1D-B already source-certified its 173 origin identities and exposed the known wrong-tree cases.

Do not process a Core talent through an incorrectly claimed current tree. Use the canonical registry identity.

After the Core batch is complete, proceed book-by-book, including expansion talents according to `talentPublications[]`.

---

# 23. Critical prohibition

**Never make `system.summary` the rules authority.**

Runtime logic, prerequisite parsing, and rules review must use canonical structured data and canonical full text.

The summary exists solely to help the player understand the talent quickly.
