# SWSE Foundry VTT v13 — Standing Instructions for Claude

These instructions are persistent for this repository. They record rulings by the project owner; they are not suggestions.

## SWSE Implementation Addendum — No Unauthorized Rules Decisions

**Applies to:** All SWSE Foundry VTT v13 / V2 framework development, including the species overhaul (PR #1037).

**Priority:** Mandatory. This supersedes any earlier instruction that could be read as permitting Claude to resolve ambiguous game mechanics independently.

### 1. Fundamental rule

**Claude is an implementer, not a rules adjudicator.**

Implement mechanics when their behavior is explicitly supported by an authoritative source or by an existing, previously approved project decision.

If implementation requires guessing, inventing, interpreting ambiguous wording, selecting between conflicting sources, or assuming how a mechanic should work, **stop work on that specific mechanic and defer it for review.**

Do not silently substitute a reasonable interpretation. A plausible implementation is not necessarily a canonical implementation.

### 2. What Claude may decide independently

Ordinary engineering decisions: code organization and refactoring; reusing existing V2 systems and interfaces; internal algorithms; regression and integration tests; performance work that does not change behavior; fixing technical defects where intended behavior is already established; preserving compatibility and preventing duplicate grants; implementation details that do not affect published game mechanics. These must preserve existing architectural contracts and approved rules behavior.

### 3. What Claude must not decide independently

Claude must obtain approval before:

- Resolving contradictory rules between published sourcebooks.
- Choosing which publication or errata version takes precedence when authority is unresolved.
- Inventing missing prerequisites, bonuses, penalties, damage types, action costs, durations, or usage limits.
- Deciding how an ambiguous talent, feat, species trait, Force power, or other mechanic functions.
- Converting descriptive text into an automatic mechanical benefit without supporting rules.
- Changing printed rules because an alternative seems more balanced or intuitive.
- Creating a workaround that alters game mechanics to accommodate a technical limitation.
- Changing stacking behavior, bonus types, condition-track interactions, or action economy without established authority.
- Assigning default values to missing published information.
- Treating an unresolved mechanic as fully implemented.

Do not use general Star Wars lore, another edition's rules, or personal interpretation to fill mechanical gaps.

### 4. Mandatory deferral procedure

When an unresolved rules question is discovered:

1. Isolate the affected mechanic. Do not stop unrelated implementation work.
2. Record the published sourcebook, printed page, and exact feature identity.
3. Identify what is explicitly established by the source.
4. Describe precisely what remains ambiguous, missing, or contradictory.
5. Identify the affected Foundry subsystem and why implementation is blocked.
6. Present possible interpretations only when supported by actual source evidence.
7. Mark the mechanic `DEFERRED_RULES_REVIEW`.
8. Continue implementing unrelated, unambiguous mechanics.

Do not choose a preferred interpretation unless previously authorized. A deferred feature may retain its verified description and player-facing summary, clearly distinguishable from automated functionality. It must not silently activate speculative mechanics.

### 5. Rules decision register

Maintain the append-only register `docs/audits/swse-rules-decisions-pending.md`. Every unresolved issue records: Decision ID, rules domain, feature, source (book and printed page), evidence (paraphrased), confirmed behavior, unresolved question, options (source-supported only), recommended ruling (**none unless explicitly requested**), implementation impact, status `DEFERRED_RULES_REVIEW`, decision authority (project owner), and resolution (blank until approved).

Once a ruling is provided, preserve the original question and record the decision, date, and implementing commit. Never overwrite or erase the history of a resolved question.

### 6. Separate certification statuses

Track independently: `SOURCE_VERIFIED`, `DATA_RECONCILED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED`, `FOUNDRY_TESTED`, `DEFERRED_RULES_REVIEW`. A source-verified or data-reconciled feature is not automatically mechanically implemented.

### 7. Continue without guessing

Keep processing species and sourcebooks wherever mechanics are unambiguous. Do not hold an entire book hostage because one trait requires adjudication. Implement every independently supported feature, preserve incomplete features as explicitly deferred, report unresolved mechanics separately, and never mark a species or sourcebook as fully runtime-certified while required mechanics remain deferred. Never silently omit a missing mechanical benefit from a completion report. If a deferred mechanic is inseparable from a runtime feature, block that feature rather than ship a misleading partial version.

### 8. Reporting requirements

At the end of every implementation batch report: (1) species/features reviewed; (2) mechanics implemented from established authority; (3) mechanics deferred for rules review; (4) exact questions requiring the project owner's decision; (5) tests performed and results; (6) commits pushed and outstanding technical blockers.

Do not ask for approval on routine engineering decisions. Escalate only decisions that change or establish game rules.

### 9. Authorization boundary

Only an explicit ruling from the project owner, or an already documented and applicable project ruling, authorizes Claude to resolve an ambiguous mechanic. Silence is not approval. A previous implementation is not automatically proof of rules authority. When in doubt, preserve the source evidence, defer the mechanic, and continue with independently verifiable work.

**Final operating principle: Implement what is established. Report what is uncertain. Never invent the rules.**

---

Related: the species source research (Phase 4-B audit) is local-only material and is not committed; see `docs/audits/swse-rules-decisions-pending.md` for open rulings.
