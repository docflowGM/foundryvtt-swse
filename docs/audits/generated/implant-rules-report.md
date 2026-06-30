# Implant Rules Audit

Generated: 2026-06-30T12:49:23.929Z

Result: 11 ok, 1 warnings, 4 errors

- OK: file:scripts/engine/implants/ImplantRules.js — present
- OK: file:scripts/actors/derived/defense-calculator.js — present
- OK: file:scripts/governance/actor-engine/actor-engine.js — present
- OK: file:scripts/actors/v2/base-actor.js — present
- ERROR: file:data/feat-catalog.json — missing
- ERROR: file:packs/feats.db — missing
- OK: implant-rules:will-penalty — exports Will Defense penalty resolver
- OK: implant-rules:ct-extra-step — exports extra condition step resolver
- OK: implant-rules:training-exception — detects Implant Training exception
- OK: implant-rules:item-flags — supports explicit item flags
- OK: defense:implant-will-penalty — Will Defense includes implant penalty term
- OK: actor-engine:implant-ct-extra-step — positive condition shifts include implant extra step
- OK: base-actor:derived-implant-state — derived implant state is exposed
- ERROR: catalog:implant-training — Implant Training missing
- ERROR: catalog:cybernetic-surgery — Cybernetic Surgery missing
- WARNING: catalog:implant-training-metadata — Implant Training suppression metadata incomplete
