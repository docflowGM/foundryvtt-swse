# Species details and attribute wiring fix

This patch repairs the species-step handoff after the canonical species data work.

## Fixed

- The species details rail now uses an effective species profile, so selected variants and required ability-choice profiles are reflected immediately.
- The details rail falls back to `data/species-canonical-descriptions.json` when a registry/sidecar path does not expose description text.
- The detail rail order is now: species options, photo, description, attribute adjustment, size, speed, species abilities, languages, build signals.
- The attribute step now reads racial/species modifiers from `pendingSpeciesContext.abilities` first. That context is the canonical species-step payload and includes selected variants and Arkanian Offshoot-style choices.
- The species suggestion normalizer now reads `abilityMods` as well as legacy `abilityScores`, so species scoring does not collapse into fallback/first-options behavior when the data source uses the canonical pack schema.
- `SpeciesRegistry` now exposes both `abilityScores` and `abilityMods` aliases on registry entries for consumers that still expect either shape.

## Runtime confirmation

After applying, pick a species with non-zero modifiers such as Gand or Wookiee and move to Attributes. The Species column should show the racial modifier values. Pick a species with variants and the details rail should update its Attribute Adjustment, Size/Speed, Species Abilities, and Languages when the variant card is selected.
