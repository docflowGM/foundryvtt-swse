# Phase 5 — Scavenger's Guide to Droids feat parity

This phase audits the Scavenger's Guide to Droids feat set against the current feat catalog and pack data.

## Scope

Phase 5 covers the seventeen feats listed in the Scavenger's Guide to Droids feat section:

- Aiming Accuracy
- Damage Conversion
- Distracting Droid
- Droid Focus
- Droid Shield Mastery
- Erratic Target
- Ion Shielding
- Logic Upgrade: Skill Swap
- Mechanical Martial Arts
- Multi-Targeting
- Pincer
- Pinpoint Accuracy
- Sensor Link
- Shield Surge
- Slammer
- Tool Frenzy
- Turn and Burn

## Intentional boundary

This is not a droid-system implementation phase. The book also contains stock droid chassis rules, droid manufacturer traits, equipment/accessory rules, droids-as-equipment guidance, and many droid codex stat blocks. Those are separate feature areas.

The audit therefore enforces this policy:

- Feats that depend on an attack, target, aim state, grapple state, shield state, vehicle damage, or movement timing must not become passive static sheet math.
- Shield feats should wait for a proper shield recharge/damage workflow.
- Damage Conversion and Ion Shielding should wait for a GM-confirmed damage/condition-track prompt.
- Droid Focus and Logic Upgrade: Skill Swap are valid choice-driven metadata cases, not generic roll bonuses.

## Running the audit

```bash
node scripts/dev/audit-scavengers-droids-feat-parity.mjs --strict
```

The audit writes:

```text
docs/audits/generated/scavengers-droids-feat-parity-report.json
docs/audits/generated/scavengers-droids-feat-parity-report.md
```

## Recommended follow-up phases

1. Add action-card candidates for Aiming Accuracy, Distracting Droid, Slammer, and Tool Frenzy.
2. Add damage/condition-track reaction prompts for Damage Conversion and Ion Shielding.
3. Add shield subsystem support before automating Droid Shield Mastery and Shield Surge.
4. Audit droid chassis/species traits separately from feats.
5. Treat droid codex actorization as a separate data/import track.
