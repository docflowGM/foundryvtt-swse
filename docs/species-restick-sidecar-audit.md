# Species Restick Patch Audit
This patch makes the species compendium the single visible species source again and regenerates sidecar species trait files from `packs/species.db`.
## Visible species source
- `packs/species.db` visible species count: **162**
- `data/species-traits.json` and `data/species-traits-migrated.json` were regenerated to the same visible species names.
## Stale sidecar-only names removed
- Adnerem
- Anzat
- Besalisk (Four-Armed)
- Cathar (Savage)
- Dathomirian
- Echani
- Gand (Non-Force-Sensitive)
- Gossam
- Ikkrukkian
- Karkarodon
- Lannik
- Leporine
- Qel-Droma
- Rishi
- Ssi-Ruuvi
- Ugnaught

## Notes
- `Gand` remains one species with Force-Sensitive and Non-Force-Sensitive variant profiles.
- `Republic Clone` is present in the species pack and sidecars.
- `Elom` remains one species with an Elomite variant profile.
- `Sith (Pureblood)` and `Mandalorian (Human Variant)` remain standalone species; they are not parenthetical variants of a visible base species.

If stale rows still appear after this patch and a full Foundry restart, the active Foundry system folder is not the patched folder or Foundry is using a stale installed copy.
