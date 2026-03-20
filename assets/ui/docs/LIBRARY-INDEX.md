# SWSE Unified SVG Library

Merged and reorganized for easier browsing by Claude and humans.

## Top-level folders
- `01_core/` canonical de-texted base assets for sheets/chargen/store foundations
- `02_modular/` composable overlays and inner subcomponents
- `03_finish/` polish pieces: badges, separators, empty states, focus rings
- `04_states_systems/` reusable global state overlays and lower-level system helpers
- `05_specialized/` force, starship, crew, droid, and subsystem-focused assets
- `06_store/` store-only operational and splash assets
- `99_reference/original_texted_core/` original first-wave texted kit kept only as reference

## Usage guidance
- Prefer `01_core/` over `99_reference/` for implementation.
- Use `02_modular/` + `03_finish/` to compose UI before reaching for bespoke frames.
- Use `05_specialized/` only when the mechanic is structurally unique.

## Counts
- `01_core`: 38 SVGs
- `02_modular`: 40 SVGs
- `03_finish`: 31 SVGs
- `04_states_systems`: 43 SVGs
- `05_specialized`: 86 SVGs
- `06_store`: 43 SVGs
- `99_reference`: 44 SVGs
