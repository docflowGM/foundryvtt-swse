# NPC Bulk Lane A Damage Runtime Activation

## Scope

This change activates the five previously promoted Bulk Lane A profile files for NPC template-import hydration. It does not change their source-review confidence and does not mutate actor or compendium packs.

## Activated data

- Pass 1: 10 records
- Pass 2: 25 records
- Pass 3: 50 records
- Pass 4: 100 records
- Pass 5: 402 records
- Total: 587 records

## Runtime safety gate

A Bulk Lane A record is wireable only when all of these remain true:

- confidence is still manualRequired
- tagged generated-candidate
- source status identifies the repository raw statblock field
- actor-slug and raw-row match evidence both exist
- exact source weapon UUID exists
- row kind is melee or ranged
- formula mode is base, base-plus-delta, or base-plus-dice
- delivery is weapon and attack shape is single-target
- the row is not an area attack
- no area shape exists
- no riders exist
- every damage component has an explicit formula

This keeps natural/unarmed, area, autofire, grenade, rider, condition, ambiguous, unmatched, and unclear-formula rows excluded.

## Provenance

Hydrated items retain confidence: manualRequired and now record hydrationPolicy: safe-bulk-lane-a. Source-verified records record hydrationPolicy: source-verified. This allows runtime use without falsely claiming page-level source verification.

## Boundaries

- No printed attack bonus is applied to attack math.
- No actor pack is rewritten.
- No compendium pack is rewritten.
- No rider execution or area geometry is added.
- Existing verified NH1-NH5 behavior remains unchanged.
