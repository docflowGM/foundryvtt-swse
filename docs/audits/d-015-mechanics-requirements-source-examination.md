# D-015 — Source examination: Mechanics skill requirements for installing upgrades

**Status: `PENDING_SOURCE_VERIFICATION` (unchanged). No blocker is lifted and nothing is certified.** This note records what the *Star Wars Saga Edition Core Rulebook* Mechanics skill pages show, read directly from the page images supplied to this session, and what they do and do not say about the *Scum and Villainy* Table 2-2 installation check (register entry D-015). It changes no production behavior, data or specification record.

## 1. Evidence examined

| Item | Value |
|---|---|
| Publication | *Star Wars Saga Edition Core Rulebook*, Chapter IV "Skills", Mechanics (Int) |
| Images supplied | Three uploads. The first two are **byte-identical** (SHA-256 `95f967b5a7002325716a3a6e67edbb68e70733e775a95f22bb0273ddeec73dbc`, 1,602,810 bytes): both show **printed page 68**. The third (SHA-256 `22711e952d100e0d922f0b9451028c4967719c24ac649eefedb382d164aae038`, 1,719,850 bytes) shows **printed page 70** |
| **Not supplied to this session** | **Printed page 69 was not among the images** (the page-68 image appears twice). Page 69 holds the middle of the Mechanics entry (the rest of Disable Device, Handle Explosives, Set Detonator, Place Explosive Device, Disarm Explosive Device). The repository OCR (`reference/sourcebooks/Core Rulebook_djvu.txt`, lines 6833-6990) was used for page 69 only, and OCR is not the final authority. The independent reviewer reports having since located and examined printed page 69 in the original PDF; that page image is **not accessible to this session**, so this note makes **no claim of independent visual inspection of page 69** and stays OCR-limited for it |
| Image use | Read directly; the images are not committed (copyright). Only hashes and this transcription are recorded |

## 2. What the printed pages show (visually verified: pp. 68 and 70)

**Printed page 68 — heading and opening.**

> MECHANICS (INT) — **Trained Only** — You can bypass locks and traps, set and disarm explosives, fix malfunctioning devices, and modify and repair damaged droids.
> **Disable Device (requires security kit):** You can use this skill to disarm a security device, defeat a lock or trap, or rig a device to fail when it is used.

**Printed page 70 — the remaining uses, retry and special rules.**

| Use | Requirement stated on the page |
|---|---|
| Jury-Rig | DC 25, full-round action. "If you use a tool kit, you gain a +5 equipment bonus on the check" (an optional bonus, not a requirement) |
| Modify Droid | "(requires tool kit)": "You can make a Mechanics check to modify a droid (see Modifying Droids, page 197)" |
| Recharge Shields | None stated |
| Regulate Power | None stated |
| Repair | "(requires tool kit)": repair a damaged or disabled droid or object; at least 1 hour of work, then a Mechanics check; one character at a time, others may aid another |
| Repair Droid | "(requires a tool kit)": 1 hour, DC 20 |
| Repair Object | Its own text repeats no kit requirement: 1 hour, DC 20, restores 1d8 hit points; vehicle penalty and the "garage, hangar, dry dock" remark. **It is a specific application of the parent Repair rule above, "Repair (requires tool kit)", which explicitly covers "a damaged or disabled droid or object (including devices and vehicles)"**; the requirement therefore applies to it through that parent rule, not through its own text. (Repair Droid, by contrast, repeats "(requires a tool kit)" itself) |
| **Retry** | "You can usually retry a Mechanics check. In some specific cases, however, a failed Mechanics check has negative ramifications that prevent repeated checks (see Disable Device, above, for example)." |
| **Special** | "You can take 10 or take 20 on a Mechanics check. When making a Mechanics check to accomplish a jury-rig repair, you can't take 20." |

## 3. Findings for D-015's question

1. **Mechanics is Trained Only.** Verified visually on printed page 68. Because the Table 2-2 text of *Scum and Villainy* p. 39 has the installer "make a Mechanics check", the skill's Trained Only property is on its face the property of the check that p. 39 calls for. No source examined says otherwise.
2. **Tool requirements are attached to specific activities**: security kit to Disable Device (p. 68, visual) and, from OCR of p. 69, Disarm Explosive Device; tool kit to Modify Droid, Repair and Repair Droid (p. 70, visual). Recharge Shields and Regulate Power state none. Repair Object states none in its own text but falls under the parent "Repair (requires tool kit)" rule, which covers objects, so repair of an object requires a tool kit. Jury-Rig gains an optional +5 with a tool kit. (This is a requirement of repair work; it is not a statement about installing upgrades.)
3. **No listed use is installing or removing an equipment upgrade, and repair is a different activity from installation.** Repairing a damaged or disabled object restores hit points or condition; installing an upgrade under Table 2-2 is its own Mechanics-check procedure defined by *Scum and Villainy* p. 39. The Repair tool-kit requirement is therefore not carried over to Table 2-2, and no source examined says it is. On the visually verified pages (68, 70) the uses are as above; page 69 is OCR-only. Neither page 39 of *Scum and Villainy* nor the Mechanics entry states a tool-kit or workshop requirement for Table 2-2 installation. Page 39 mentions an "overheated workshop" only descriptively ("a few minutes of work to week of frustrating machining and retooling in an overheated workshop"). Nothing here supports **imposing** a tool-kit or workshop requirement, and nothing supports **waiving** one either: the sources are silent.
4. **Retry.** The Mechanics Retry paragraph permits retrying "usually"; Table 2-2 text states its own retry rule (same time, half the original attempt's cost), which the Mechanics paragraph does not contradict.
5. **Take 10 / take 20.** The Mechanics Special paragraph allows both on "a Mechanics check" (except take 20 on a jury-rig). Page 39 does not say whether the Table 2-2 check may take 10 or 20. That is a point the sources do not address; it is recorded here for the reviewer and has **not** been added to D-014 or decided.

## 4. Conclusion and what remains

- **D-015 stays open.** The Trained Only fact is verified, but the question's second half, whether the sources impose any additional tool or workshop requirement on ordinary upgrade installation, cannot be closed: it rests on the absence of a use in the Mechanics entry, and the middle of that entry (printed page 69) was not seen as an image.
- **To finish:** an image of Core Rulebook printed page 69. If it shows no equipment-upgrade use, D-015 can be closed on this evidence: Trained Only certified; no source-stated tool or workshop requirement for Table 2-2; the executor must neither add nor waive one. The take 10 / take 20 point and the Trained Only application to the page-39 check would then be recorded for review, the former as a candidate addition to D-014.
- **Not decided:** no owner decision is requested, no rule is invented, and the 76 governed typed definitions keep their open D-015 blocker until a reviewed lift row cites this evidence.

## 5. What this changes

Nothing in production, the registry, the ledger, the specification records or the generated runtime file. The register receives one appended "Source examination log" row on D-015 pointing here.
