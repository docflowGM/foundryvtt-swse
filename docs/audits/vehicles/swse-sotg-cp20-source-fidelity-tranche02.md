# Starships of the Galaxy — CP20 publication source-fidelity certification, tranche 02

**Result:** 15 audit-only source-fidelity certificates for CP17 queue positions **31–45**. The sourcebook PDF was checked against SHA-256 `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`; 15 printed pages were rendered and independently inspected. The batch covers **40 printed attack-group records**.

**Authority:** Approved `SOTG-CP18-D01` two-layer policy. An audit-only source-fidelity certificate records printed facts and evidence states, including source-confirmed silence. It **does not** license physical mount geometry, attack eligibility, Foundry import/hydration, vehicle combat integration, or universal vehicle schema v0.6.

## Individual certificates

| Queue | Ship | Source evidence retained |
|---:|---|---|
| 31 | Outbound Flight | Six detachable Dreadnaughts and one composite station-type profile; 15/3/5 battery groups are **not** physical gun counts. |
| 32 | Vulture-class Starfighter | Droid Crew 0 and virtual gunnery, simultaneous AND attacks, walker movement retained. |
| 33 | Scarab-class Starfighter | Stock blaster cannon only; no borrowed Vulture missiles or assumed hyperdrive. |
| 34 | Droid Tri-Fighter | Printed single central laser plus three light lasers; ammunition and crew control distinct. |
| 35 | Dynamic-class Freighter | Stock double laser family; deck-plan turret access is not a gun arc. |
| 36 | Eta-2 Actis Interceptor | Pilot laser OR ion, boost-ring and astromech conditional; missile replacement is optional. |
| 37 | E-wing Type B | Printed triple heavy blaster family, sixteen-torpedo payload and R7 conditional bonuses. |
| 38 | Firespray-31 Patrol Craft | Stock two-blaster configuration; three unused emplacement points are not installed weapons. |
| 39 | Slave I | **Certified p.85 correction:** concussion mine damage 8d10×2, not original CP16 10d10×2. Tracking beacon torpedo is special effect. |
| 40 | Territorial Defense / Nantex | Close-range micro-tractor equipment bonus is not another attack mount. |
| 41 | Ginivex-class Starfighter | Solar sail conditional SR 30 → 45; one double laser source family. |
| 42 | Gozanti Cruiser | Stock Gozanti separate from named Krayt's Honor improvements. |
| 43 | Krayt's Honor | Two proton launchers and three turbolasers from unique modification; already-included captain modifier retained. |
| 44 | Corellian Gunship | Eight separately operated double turbolasers; cannot fire them as one battery. |
| 45 | Hapan Battle Dragon | **Certified p.93 correction:** four printed mass-pulse tubes, distinct from sixteen carried mines, arcs still silent. |

## Verified corrective provenance

Both corrections came from the owner-authorized **existing CP20 controlled source correction overlay**, not a silent replacement of original CP16 values:

- Slave I (p.85): `concussion mines` printed `8d10x2`. CP16 retains original transcription `10d10x2`; source-fidelity certificate applies the verified original printed value in its **audit projection**.
- Hapan Battle Dragon (p.93): printed Ranged summary explicitly specifies `4 mass pulse tubes (no attack roll)`; CP16 stores `hardwareCount: SOURCE_SILENT_CONFIRMED`. Certified audit projection records hardware count **4**, not four battery attacks, and leaves precise firing geometry unknown.

All **40** published weapon rows were preserved exactly except for those **two explicitly approved and page-anchored audit corrections**. All 19 source field groups per ship remain recorded, including printed silent fields. No historical source-row page keys were missing for this tranche.

## Scope boundaries

- Raw CP16 source authority, CP17 work queue, CP18 original field observations and CP19 source reviews remain immutable.
- The 15 CP20 tranche 01 source-fidelity certificates remain unchanged. Tranche 02 is distinct from those 15 identities.
- No physical-mount certificate, operational stock attack trust, conditional firing arc default, inferred barrel number, production mutation, or schema freeze was issued.
- Previously strict field/mount certified ships remain four and the outstanding strict physical-mechanical backlog remains **100**.
- The older CP16 historical comparator remains skipped because the genuine CP15 predecessor ledger is unavailable; the independent active CP17–CP20 validators execute normally.

## Reproducible gate

```bash
python3 tools/audits/vehicles/check_sotg_cp20_tranche02.py --repo .
# Optional PDF SHA check if the original PDF is available locally:
python3 tools/audits/vehicles/check_sotg_cp20_tranche02.py --repo . --source-pdf "/path/to/SAGA EDITION - Starships of the Galaxy.pdf"
```

The validator checks JSON Schema, pinned immutable Git blobs, original CP16-to-certified audit projection reversibility, CP18 source-silent field states, CP19 visual review provenance, both explicit corrections, prior CP20 certificate non-overlap, adversarial authority escalation rejection and zero runtime permissions.

**Cumulative CP20 result: 30/100 source-fidelity certified; 70 remaining.** The next tranche is CP17 queue positions **46–60**.
