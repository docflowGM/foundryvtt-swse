# Implant Content Readiness Audit

Phase: 4D

OK: 31
Warnings: 0
Errors: 0

## OK
- Required file exists: scripts/engine/implants/ImplantRules.js
- Required file exists: templates/actors/character/v2/partials/gear/implants-panel.hbs
- Required file exists: data/cybernetics/cybernetic-surgery-policy.json
- Required file exists: data/cybernetics/implant-tagging-policy.json
- Required file exists: data/implants/implant-reference-catalog.json
- Required file exists: data/implants/sample-implant-items.json
- ImplantRules exposes isImplantItem.
- ImplantRules exposes isActiveImplantItem.
- ImplantRules exposes getActiveImplantItems.
- ImplantRules exposes hasImplantTraining.
- ImplantRules exposes getWillDefensePenalty.
- ImplantRules exposes getConditionTrackExtraStep.
- Reference catalog requires explicit implant tags.
- Reference catalog forbids name-only inference.
- Reference catalog excludes generic cybernetics by default.
- Reference catalog has 4 classification entries.
- Implant entry is explicit-tagged and counts as implant.
- cybernetic_prosthesis reference does not count as implant by default.
- biotech reference does not count as implant by default.
- droid_system reference does not count as implant by default.
- Tagging policy points to ImplantRules as authority.
- Policy implant category requires active state.
- Policy excludes cybernetic_prosthesis from implant penalties by default.
- Policy excludes cybernetic_enhancement from implant penalties by default.
- Policy excludes biotech from implant penalties by default.
- Policy excludes droid_system from implant penalties by default.
- Cybernetic Surgery remains excluded from static sheet automation.
- Sample implant file has 3 samples.
- Active tagged sample expects penalties without Implant Training.
- Cybernetic prosthesis sample does not count as implant.
- Cybernetic Surgery policy remains manual/source-referenced.

## Warnings
- None

## Errors
- None
