# Combat Phase 0D Addendum - Firing Into Melee, Precise Shot, and Elusive Target

Audit-only addendum. No runtime files were changed.

## User design direction captured

The ranged attack context dialog should eventually include a manual checkbox:

- `Firing into melee (-5)`

This should apply the normal -5 penalty to ranged or thrown attacks when the GM/player determines that the target is engaged in melee with an ally.

This should not be map automated by default.

## Precise Shot interaction

Precise Shot should suppress the normal firing-into-melee penalty.

Current accounting:

- Precise Shot metadata exists and suppresses `firingIntoMeleePenalty`.
- The missing piece is the actual penalty source. If no UI/context applies the -5, Precise Shot has nothing reliable to suppress.

Recommended later implementation:

- Show the checkbox on ranged/thrown attack dialogs.
- If actor has Precise Shot, either:
  - disable the checkbox and show `Ignored by Precise Shot`, or
  - allow it to be checked but reduce its value to 0 with a visible breakdown note.

## Elusive Target interaction

Elusive Target says that when the defender is fighting one or more opponents in melee, other opponents attempting ranged attacks against that defender take an additional -5 penalty. This stacks with the normal -5 firing-into-melee penalty, creating a total -10 penalty when both apply.

User decision:

- Treat Elusive Target as GM adjudication for now.

Reason:

- It depends on whether the defender is currently fighting in melee.
- It depends on the attacker/defender relationship, target choice, and table positioning.
- The project should not require map/grid automation for this.

Recommended later implementation:

- Add optional checkbox on ranged/thrown attack dialog: `Target has Elusive Target (-5)`.
- Optionally group it under a `GM-adjudicated ranged penalties` section.
- If a selected target has the Elusive Target talent, show a non-blocking reminder badge.
- Do not auto-apply from map adjacency.

## Suggested attack dialog model

```text
Ranged attack situational penalties
[ ] Firing into melee (-5)
[ ] Target has Elusive Target (-5, GM adjudicated)

Notes:
- Precise Shot suppresses firing into melee.
- Elusive Target is manual/GM adjudicated.
```

## Automation boundary

| Rule | Automation target |
|---|---|
| Firing into melee | Assist: checkbox applies -5. |
| Precise Shot | Automate: suppress the normal -5 once the checkbox/context exists. |
| Elusive Target | GM managed: optional checkbox/reminder only. |
| Map adjacency | Do not automate by default. |
