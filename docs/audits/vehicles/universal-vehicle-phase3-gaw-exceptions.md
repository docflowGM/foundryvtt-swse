# Phase 3 — Galaxy at War primary-PDF exception reconciliation

Primary source `SW_Saga_Galaxy_at_War.pdf` SHA256 `9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a`. Original scanned printed pp63, 65 and 216 correspond to physical PDF pp64, 66 and 217. All three anomalous statblocks were visually reviewed. The already-source-reviewed Galaxy at War stage **correctly preserves** these ambiguous facts, so this checkpoint adds source evidence and regression coverage without changing published records.

## YU-410 Light Freighter — two DR labels, not an invented SR

The original printed HP line explicitly contains **DR 15** followed by **DR 20**. Both use the label DR; the latter cannot be relabeled `SR 20` just because the prose says the freighter has strong shields. The header Initiative is **−5**, while Skills Initiative is **−2**. Preserve both printed facts in separate fields, with the second DR stored as unresolved source evidence rather than mapping it to a different typed defense. The +5 Stealth bonus to conceal cargo is narrative special-rule evidence, not a free blanket stealth modifier.

## WLO-5 Speeder Tank — malformed printed price

The printed new cost reads **115,00 credits**; used price reads **65,000 credits**. The new cost's missing grouping/digit remains `status: ambiguous`, not fabricated 115,000 or 11,500. The gunner's printed cover is +5 and the tank offers +5 equipment bonus for repair/modify Mechanics checks. Pirate-modified additional antipersonnel cannons are aftermarket examples, not installed on the stock version.

## GAT Ground Armored Tank — Shock and Awe conditional Fire Effect

The encounter contains four GAT instances but **one CL10 published vehicle statblock**. Printed special rule: as a standard action, the GAT forgoes all attacks and applies a six-square-radius battlefield fire effect. An enemy within the area only suffers an *additional* one-step condition-track penalty when it is **damaged by a successful attack meeting/exceeding its Damage Threshold**. This is not immediate unconditional damage, an attack roll, or a new source weapon mount. The two weapon source rows remain separate and untrusted.

The three entries are added to `swse-universal-phase3-targeted-exceptions.json` with risk identifiers `P3R-GAW-YU410`, `P3R-GAW-WLO5`, `P3R-GAW-GAT-SHOCK`. Independent regression tests lock the original contradictory values, one publication identity, conditional mechanic, and fail-closed attack/mount boundary. No release packs, Actor engine code or canonical SSOT modified.
