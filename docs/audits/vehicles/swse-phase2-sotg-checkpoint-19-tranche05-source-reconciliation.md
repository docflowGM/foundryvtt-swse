# Starships of the Galaxy — CP19 Tranche 05, ships 61–75

**Result:** Original scanned PDF pages visually reviewed for all 15 publication-specific ships, 37 printed attack groups. One source-backed ledger correction candidate and one distinct field-semantics issue. None is automatically applied. No new source-fidelity, mount or runtime combat certificate.

**PDF SHA-256:** `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`. Original printed page numbers correspond to zero-based PDF indices.
**Branch starting HEAD:** `a94a3cf81011faf5fac28b98b06773a1cb296c45`. **Policy:** `SOTG-CP18-D01`.
**Reviewed pages:** 119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 130, 131, 132, 133, 134, 135.

## Per-ship primary-source findings

| Queue | Ship (printed page) | Finding |
|---:|---|---|
| 61 | Nebula-class Star Destroyer (p.119) | CP16's heavy ion battery damage 11d10x5 ion contradicts printed p119 weapon table 3d10x5 ion. This is a source-supported transcription correction candidate; battery counts and firing arcs remain independent. |
| 62 | Kuat Drive Yards Nebulon-B Frigate (p.120) | Two tractor beams in Ranged are an attack-group count; physical tractor hardware, station geometry and full arcs are not certified. Named Redemption medical conversion must not overwrite stock Nebulon-B. |
| 63 | Buuper Torsckil Abbey Devices Porax-38 Starfighter (p.121) | Jamming is a situational equipment bonus against droid-controlled targets, not generic concealment or independent weapon hardware. Atmospheric Jenta ordnance is a variant, not standard P-38 inventory. |
| 64 | Predator-class Starfighter (p.122) | Do not infer a second physical laser mount or import TIE Defender statistics. The multiple cockpit designs do not create separate source statblock identities. |
| 65 | Rebel Assault Frigate Prototype (p.123) | Prototype maintenance and randomized benefit/drawback are template mechanics; example batteries do not establish individual hardware counts. Keep template-applied sample identity distinct from later refits. |
| 66 | Rebel Assault Frigate Mk I (p.124) | Mk I armament 3/4/3 batteries, crew 5000 and external umbilical configuration cannot be collapsed into prototype or Mk II. Docked craft are not installed ship weapon mounts. |
| 67 | Rebel Assault Frigate Mk II (p.125) | Mk II is a separate production refit. Improved 10 SR three-swift recharge is an action, not permanent or passive extra SR. Preserve variant-specific printed batteries. |
| 68 | Sienar Fleet Systems Scimitar Assault Bomber (p.127) | Scimitar Assault Bomber from the Imperial TIE design family must not be confused with Darth Maul's Sith Infiltrator nicknamed Scimitar. Copilot ordnance and pilot lasers are separate attack operators. |
| 69 | Modified Republic Sienar Systems Armored Star Courier (p.128) | Sith Infiltrator is a unique source entry, not a generic courier or Scimitar bomber. Context-specific size, stygium cloak and ship sensor rules do not imply firing geometry. |
| 70 | Sith Interceptor (p.130) | Sourcebook omission of hyperdrive and SR must remain typed silence, not fabricated x1, zero or borrowed later TIE specs. Singular attack family cannot fix physical arc. |
| 71 | Sienar Fleet Systems GAT-12h (p.131) | CP16's againstSmallerThanColossal:-20 for ion gun may store generic penalty while the same key holds final resolved bonus elsewhere. Preserve both printed -20 penalty and -15 final attack until field-semantics adjudication; do not blindly replace. |
| 72 | SoroSuub Cutlass-9 Patrol Fighter (p.132) | Both physical counts already are supported in CP16. Three unused emplacement points must not become additional stock guns; source still lacks certified firing arcs. |
| 73 | Kuat Drive Yards Star Galleon (p.133) | Separable cargo compartment is ship architecture, not a second certified ship identity or weapon mount. -1 damage die is distinct from -1 damage point; launcher count and arcs remain unprinted. |
| 74 | MandalMotors StarViper Assault Fighter (p.134) | Two laser guns and two forward torpedo launchers are explicit physical counts; broad articulated laser fire is not equivalent to precise 360-degree arc. Original Virago and mass production variants stay distinct. |
| 75 | Loronar Corporation Strike-class Medium Cruiser (p.135) | This cruiser has multiple mutually exclusive cargo/craft loadouts and tactical fire alternatives. Preserve battery counts as printed groups, not barrel counts or firing arcs. |

## Exact correction candidate — Nebula-class p.119

The printed *Heavy ion cannon battery* row reads **Atk +18, Dmg 3d10x5 ion**. The CP16 third group erroneously contains `damage: "11d10x5 ion"`, which matches heavy turbolaser damage instead of the printed ion battery. The correct source-supported observation is **`3d10x5 ion`**. This tranche only records the error with group index 2, the original ledger value, the printed value and precise source-page citation. **No CP16 mutation is performed.** No weapon quantities, arcs or automated attack permissions can be inferred from the corrected damage.

## Distinct source-preserving field-semantics issue — Skipray p.131

Print explicitly states a **−20 penalty against targets smaller than Colossal** and its heavy ion row displays **Atk +5 (−15 against targets smaller than Colossal)**. CP16 currently stores `againstSmallerThanColossal: -20`. Because other records use this key for the **resulting attack value**, the row is suspicious. But `-20` is also an exactly printed global penalty. The observation remains **pending field semantic adjudication** without either converting to `-15` or interpreting `-20` as a final attack by fiat.

## Important scope boundaries

- Rebel Assault Frigate Prototype, Mk I, and Mk II are three printed configurations, with distinct published weapons, crew and special rules. Prototype random template values are not generic stock bonuses.
- Scimitar Assault Bomber (p.127) is separate from the unique Sith Infiltrator called *Scimitar* (pp.128–129); neither is the Sith Interceptor on p.130.
- Cutlass-9 and StarViper have printed physical gun and launcher counts. Unused emplacement points are **not installed equipment**; articulated laser arms are **not a numeric 360-degree firing arc**.
- Modular Strike-class cargo/troops/starfighters/walkers are mutually substituted configuration options. The tactical-fire attack or Reflex choices are not simultaneous.
- Nebulon-B Redemption medical refit and Predator cockpit variants have narrative scopes, not permission to replace the standard ship's source record.

## Continuity and next checkpoint

With CP19 Tranche 5 complete: **75/100** backlog publication-specific entries reviewed, **25 remain** for Tranches 6 and 7. Four original historical source-field/mount certificates remain; none of this tranche earns new source-fidelity or operational stock attack authority. The original CP16 ledger, CP17 work queue, CP18 typed evidence, four previous tranche ledgers, production compendia, vehicle combat integration and Pure/Modified refactor remain untouched.

Tranche 5 adds one JSON audit record, one validator, this report and a CI addition in **one commit**. The validator compares all Git blob source hashes, all 15 exact original row snapshots, queue keys, original source pages, prior 60 unique reviewed entries, one proposed correction and separate Skipray issue, enforcing zero new runtime trust. Source text verification was carried out by visual PDF review rather than OCR. The historic CP16 compare test remains skipped for the absent CP15 comparison ledger.
