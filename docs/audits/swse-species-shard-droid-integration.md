# Shard — droid-shell integration points (investigation only)

Shard (Jedi Academy Training Manual, audit profile JATM-2J-01) stays `DEFERRED_DROID_INTEGRATION`. It is a sentient crystalline
species whose body is a droid shell; the audit records: Dex -2, Wis +2, Medium, **no printed land speed (do not default to 6)**,
Constitution explicitly retained inside the shell, Basic and Binary, speech to outsiders needs a computer or vocabulator.
No separate droid system is created and Shard is not forced through organic creation.

## Existing authorities it must go through

| Concern | Existing authority (file) | Integration point |
|---|---|---|
| Species record flags | `packs/species.db` `system.droidBuilder` (`mode: species-droid-shell`, `retainsConstitution`, `speciesActsAsDroid`, `fixedSize`, allowed shell categories) | already present on the legacy Shard record; carried by `applyCompleteSnapshot` (`droidBuilder`, `speciesActsAsDroid`) |
| Ledger rules | `species-grant-ledger-builder.js` `ledger.rules.droidBuilder` | read by the pending context (`metadata.droidBuilder`) |
| Progression step selection | `shell/active-step-computer.js` (shows the droid builder step when `droidBuilder.required`) and `steps/droid-builder-step.js` | the existing V2 droid builder step supplies shell/locomotion |
| Materialization | `apply-canonical-species-to-actor.js` (`system.isDroid`, `flags.swse.speciesActsAsDroid`, `flags.swse.droidBuilderSpecies`) | `isDroid` is set only for noConstitution or replica shells; a retains-Constitution shell needs an explicit rule |
| Droid rules | `engine/progression/droids/droid-trait-rules.js`, `droid-trait-passive-adapter.js`, `droid-progression-guards.js` | decide which droid traits (poison/vacuum immunity, no Constitution, Force Sensitivity guard) apply; Shard retains Constitution |
| Followers | `steps/follower-steps/follower-droid-*.js` | share the droid context |
| Movement | `species-movement.js` (this branch) | Shard's walk speed must come from the shell's locomotion, so the species must record "land speed not printed" **and** have the shell supply it; the Celegian state alone is not enough because Shard prints no alternate mode |

## Gaps to close before hydrating Shard

1. A retains-Constitution droid shell: `system.isDroid` and the droid trait set must not remove Constitution (the audit says it is retained).
2. Shell-supplied locomotion speed feeding the shared movement authority (no printed species speed).
3. The communication restriction (needs a computer or vocabulator) as display text until a rule hook exists.
4. Complete-snapshot support for `droidBuilder` shells (the snapshot currently copies the base `droidBuilder`; Shard's profile must be authoritative for its own shell rules).

No rules question is open for Shard; these are engineering items for the V2 droid framework.
