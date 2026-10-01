# Phase 11-2B4 — structural/tree/organization tags

Status: **OWNER_DESIGN_PASS**. No production mutation.

| Tag | Decision | Canonical / decomposition |
|---|---|---|
| `battlefield-control` | **NORMALIZE** | `battlefield_control` |
| `force-tradition` | **DELETE_DECOMPOSE** | `force` |
| `battlefield_control` | **KEEP** | `battlefield_control` |
| `jedi-guardian` | **DELETE_DECOMPOSE** | `force`, `lightsaber`, `melee`, `defense` |
| `martial_arts` | **KEEP** | `martial_arts` |
| `beast_companion` | **KEEP** | `beast_companion` |
| `imperial-knight` | **DELETE_DECOMPOSE** | `force`, `lightsaber`, `armor`, `defense`, `leadership` |
| `lightsaber-combat` | **DELETE_DECOMPOSE** | `lightsaber`, `melee` |
| `dark_side_mastery` | **DELETE_DECOMPOSE** | `dark_side`, `force`, `scaling` |
| `pathfinder` | **DELETE_DECOMPOSE** | `exploration`, `survival`, `recon`, `mobility` |
| `infamy` | **DELETE_DECOMPOSE** | `fear`, `intimidation`, `social`, `mind_affecting` |
| `martial` | **DELETE_DECOMPOSE** | `melee`, `unarmed`, `martial_arts` |
| `minion` | **KEEP** | `minion` |
| `law_enforcement` | **DELETE_DECOMPOSE** | `control`, `nonlethal`, `pursuit`, `vehicle` |
| `law-enforcement` | **DELETE_DECOMPOSE** | `control`, `nonlethal`, `pursuit`, `vehicle` |
| `bothan-spynet` | **DELETE_DECOMPOSE** | `network`, `investigation`, `knowledge`, `social` |
| `social_network` | **KEEP** | `social_network` |
| `spynet` | **DELETE_DECOMPOSE** | `network`, `investigation`, `knowledge` |
| `believer-disciple` | **DELETE_DECOMPOSE** | `force`, `support` |
| `guardian_spirit` | **DELETE_DECOMPOSE** | `ally_support`, `force`, `healing`, `support` |
| `iron-knight` | **DELETE_DECOMPOSE** | `droid`, `force`, `defense` |
| `bando-gora-captain` | **DELETE_DECOMPOSE** | `leadership`, `fear`, `control` |
| `elite-droid` | **DELETE_DECOMPOSE** | `droid`, `durability`, `tech` |
| `followers` | **KEEP** | `followers` |
| `independent-droid` | **DELETE_DECOMPOSE** | `droid`, `durability`, `self_repair`, `tech` |
| `krath` | **DELETE_DECOMPOSE** | `force`, `dark_side` |
| `order-of-shasa` | **DELETE_DECOMPOSE** | `force`, `melee`, `defense` |
| `sith_alchemy` | **DELETE_DECOMPOSE** | `alchemy`, `dark_side`, `force`, `crafting` |
| `akk-dog` | **DELETE_DECOMPOSE** | `beast_companion`, `beast`, `mount` |
| `follower` | **NORMALIZE** | `followers` |
| `genohardan` | **DELETE_DECOMPOSE** | `pursuit`, `deception`, `manipulation` |
| `lightsaber_polearm` | **KEEP** | `lightsaber_polearm` |
| `network` | **KEEP** | `network` |
| `unknown-regions` | **DELETE** | — |
