# Universal vehicles Phase 3 — KOTOR Basilisk source exception checkpoint

**Primary original scanned PDF** `SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf` SHA256 `fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419`, printed pp202–203 (physical PDF pp203–204).

The existing `kotor-basilisk-war-droid` entry is **one** publication-specific statblock, not two independent spacecraft/droid identities. Original printed type is `Huge air vehicle (droid)`; it flies 12 character squares (550km/h) and 3 starship-scale squares. The autonomous droid brain is printed Crew 1 (skilled, droid brain), with one authorized passenger.

The footnote permits a passenger to substitute their own attack or skill bonuses for the droid brain's bonuses. This is a **conditional control rule**, not a permanent bonus to be normalized into stock data or an authorization to create duplicate actors.

The melee claw +11 line is separate from four source Ranged declarations: light laser +4, concussion missile +4, pulse-wave +4, space mines +5. Payload is four missiles and two mines; pulse-wave cannon references printed p69. No arc, physical mount topology or execution certification is inferred from published attack rows. All physical groups remain `mountKeys: []`.

The already source-staged KOTOR record accurately preserves these facts, so this checkpoint documents and tests the original identity and conditional rule without rewriting the mechanical source object. Added `P3R-KOTOR-BASILISK` to the small cross-book targeted-risk ledger and introduced `tests/vehicle-universal-phase3-kotor-basilisk.test.mjs`. The other 38 KOTOR publication records and the global 429 census remain unchanged. Strict runtime and physical mount approval remain pending.
