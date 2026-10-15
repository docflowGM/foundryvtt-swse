# D-013 — Source examination: KOTOR Table 5-6 accessories and the Scum and Villainy installation procedure

**Status: `PENDING_SOURCE_VERIFICATION` (unchanged). Nothing is certified and no blocker is lifted.** This note records what the *Knights of the Old Republic Campaign Guide* says about the eight Table 5-6 weapon and armor accessories, and whether that text authorizes the *Scum and Villainy* Table 2-2 installation procedure for them (register entry D-013, scoped definitions `kotor-accessory-*`). It changes no production behavior, data or specification record.

## 1. Evidence examined

| Item | Value |
|---|---|
| Source | *Star Wars Saga Edition: Knights of the Old Republic Campaign Guide*, "Weapon and Armor Accessories" and Table 5-6 (registry printed pages 75-76, PDF pages 76-77) |
| Text layer | `reference/sourcebooks/Knights of the Old Republic Campaign Guide_djvu.txt`, lines 6960-7085 (accessories), plus a search of the whole file for installation language |
| Legibility | The accessory section is legible OCR (unlike the page-39 table). The README still makes the PDF the final authority |
| Not available | **No page image of pp. 75-76 is available in this environment**, so nothing here is a visual verification, and the printed page numbers rest on the registry's claim |
| Definitions | The eight registry definitions `kotor-accessory-armor-reinforcement`, `-beam-splitter`, `-durasteel-bonding`, `-enhanced-energy-projector`, `-hair-trigger`, `-improved-energy-cell`, `-mesh-underlay`, `-tremor-cell` (each with one typed weapon or armor definition; their printed slot costs 1, 2, 1, 1, 1, 2, 2, 1) |

## 2. What the text says (OCR, legible)

The section opens:

> The following off-the-shelf accessories can enhance weapons and armor in a variety of ways. Most pieces of equipment can have only one accessory, though in some cases Gamemasters might allow them to have more. Each weapon and armor accessory listing on Table 5-6 also lists the upgrade slot cost of each accessory (for use with the gear enhancement system in Scum and Villainy).

Table 5-6 lists each accessory with its credit cost and its upgrade slot cost (armor reinforcement 3,000 / 1; beam splitter 1,200 / 2; durasteel bonding 2,000 / 1; enhanced energy projector 3,000 / 1; hair trigger 1,200 / 1; improved energy cell 4,000 / 2; mesh underlay 2,500 / 2; tremor cell 1,000 / 1). Each accessory's own paragraph states its host restriction and its effect (for example "a modification made only to pistols, rifles, heavy weapons, and exotic ranged weapons", "this accessory can only be placed on a weapon that deals slashing damage", "weapons larger than Medium cannot be fitted with this accessory").

A whole-file search of the KOTOR text for installation language finds nothing about installing or removing these accessories. The only related lines elsewhere are about powered armor: "If you are using the equipment modification rules from Scum and Villainy, light powered armor has 2 free upgrade slots", a statement that installing or removing an implant "follows the same rules as installing a cybernetic prosthesis" (an implant, not one of the eight accessories), and a sentence that an energy shield "can be added to a suit of armor as an accessory" (also not one of the eight).

## 3. Does the text authorize the Scum and Villainy Table 2-2 installation procedure?

**It does not say so, and it does not exclude it.** What the text establishes is limited to:

1. The accessories carry **upgrade slot costs** that are "for use with the gear enhancement system in Scum and Villainy" (so they take part in that system's slot accounting).
2. A host-count rule ("most pieces of equipment can have only one accessory") that is separate from, and additional to, slot capacity.
3. Per-accessory host restrictions.

No sentence states how an accessory is installed or removed, what DC or time applies, or that Table 2-2 governs it. Concluding that Table 2-2 applies would rest on slot-cost compatibility alone ("it has a slot cost in the S&V system, so it is installed by the S&V procedure"), which the review instructions forbid as an inference. The registry's own `procedureRefs` link between these accessories and `sv-install-remove-upgrade` is the registry's claim and was not independently verified here; it is unchanged.

## 4. Conclusion and what remains

- **D-013 stays open for the eight accessories.** No Partial lift row is proposed: the source evidence does not support releasing them.
- This is a **research finding that the text is silent**, not an owner decision. If the PDF pages confirm the same wording, the question "does Table 2-2 govern these accessories" is a genuine silence in the published text and would move to `DEFERRED_RULES_REVIEW` for a project decision; until then it stays `PENDING_SOURCE_VERIFICATION`.
- Needed to finish the research: images of KOTOR printed pp. 75-76 (PDF pp. 76-77) to confirm the wording above visually and to settle whether any text outside the accessories section (for example the chapter's equipment introduction or the gear-templates section) addresses installation. Findings for other D-013 families (Tech Specialist traits, lightsaber crystals and accessories, templates, biotech, talents, and the other publications' items) are separate research.
- Independent of installation: the accessory-count and host-restriction text above is evidence for the eventual `hostPrerequisites` component of these definitions (D-005-style work), not for `installProcedure`.

## 5. What this changes

Nothing in production, the registry, the ledger, the specification records or the generated runtime file. The register receives one appended "Source examination log" row on D-013 pointing here.
