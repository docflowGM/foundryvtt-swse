# Phase 9H — Jedi Academy Training Manual Feat Implementation Readiness

This phase audits Jedi Academy Training Manual feats for implementation accuracy. It is deliberately separate from KOTOR because Jedi Academy has several Force, Jedi style, and timing-heavy feats that need different runtime homes.

## Accuracy standard

A feat is not considered implemented correctly just because it exists in the catalog or has metadata. It must have the correct implementation shape:

- action-economy feats need action/recovery workflow hooks;
- reroll feats need roll-card reroll prompts and usage logic;
- Force-power feats need scoped Force power activation context;
- weapon-property feats need weapon/attack workflow support;
- resource-rider feats need event triggers and expiration.

Wrong-shape automation should be marked `implemented_incorrect`, not `implemented_correct`.

## Main findings

No Jedi Academy feats are marked fully runtime-correct in this audit. Several have good metadata that prevents false static math, but the runtime hook is not proven yet.

Especially important:

- Fast Surge is Recovery & Survival / Second Wind & Recovery, not Force taxonomy.
- Force Regimen Mastery remains partial until a Force Regimen picker/progression workflow exists.
- Keen Force Mind must be scoped to mind-affecting Force power activation, not global Use the Force.
- Long Haft Strike should only affect Lightsaber Pike / Long-Handle Lightsaber weapon-property handling, ignoring unrelated homebrew text.
