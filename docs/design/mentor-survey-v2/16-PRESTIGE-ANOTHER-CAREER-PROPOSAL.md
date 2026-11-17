# Prestige "Another Career": editorial proposal for the remaining classes (DRAFT, not approved)

**Rule (owner, approved):** Discover, then Explore, then Affirm. Choosing the "another career" purpose in Prestige Q5 records exploration only. Only an explicit affirmation of a valid, identifiable career target (resolved against the 297-archetype registry or a typed class) may create or revise a declared-goal event. Declining to affirm preserves the earlier declaration. Nothing is inferred and no earlier goal is replaced silently.

**Preserved:** the Ace Pilot conversation in the Prestige Q5 source stays as authored; nothing here changes it.

## Shared structure for the other 31 classes (no class-specific facts invented)

| Stage | Purpose | What the player does | Records |
|---|---|---|---|
| Discover | Offer a short, browsable set of career families drawn from the registry parents that are eligible and plausible for the actor | browses; may leave at any time | nothing (browse and view create no event) |
| Explore | Show one family or specialization at a time with its canonical name and a one-line neutral description from the registry | opens, compares, returns | nothing |
| Affirm | Ask one explicit first-person confirmation naming the exact target ("I want to pursue X as my next career goal") with a separate confirmation if an earlier goal exists | confirms or declines | on confirm: a typed `goal_declaration` or `goal_revision` event; on decline: nothing |

## Editorial rules for class-specific wording

1. No class text may assume an employer, rank, unit, organization, mentor relationship or completed mission.
2. The Mentor line frames curiosity, never advice to leave the class ("You do not have to decide today.").
3. Capstone and fulfilled-career answers remain complete choices; they never route into this conversation.
4. Each class needs only: one Discover lead-in (Mentor voice), one Affirm confirmation frame, and a decline acknowledgement. The family list and names come from the registry, not from authored prose.
5. All new lines are `draft_text` and use the same release gate; the Ace Pilot source is the model, not a template to copy verbatim.

## Needed from the owner

Approval of this structure, then one Discover lead-in and one decline acknowledgement per class (62 short lines) in each Mentor's established voice, authored in an editorial pass and kept separate from the engine.
