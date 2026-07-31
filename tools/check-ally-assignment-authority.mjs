#!/usr/bin/env node

/**
 * check-ally-assignment-authority.mjs — GM existing-NPC assignment
 * governance guard (GM-EXISTING-NPC-ASSIGNMENT feature).
 *
 * Assign as Ally is reversible relationship metadata; Convert to Follower
 * is an explicit mechanical migration. AllyAssignmentService
 * (scripts/engine/crew/ally-assignment-service.js) is the sole authority
 * for both, and independently re-checks `game.user.isGM` regardless of
 * what UI calls it. This guard is the narrow static enforcement for that
 * model, scoped to the three files this feature touches — deliberately
 * NOT a repository-wide ban.
 *
 *   1. AlliesSurfaceController.js must not construct an assignment link
 *      itself (no `assignedAllyKind:`/`ASSIGNMENT_KIND` reference) and must
 *      not call ActorEngine directly — it must delegate through
 *      AlliesSurfaceService only.
 *   2. AlliesSurfaceService.js must not construct an assignment link object
 *      itself (no `assignedAllyOwnerId:` assignment literal) — its
 *      assign/convert/unassign methods must delegate to AllyAssignmentService.
 *   3. buildAssignmentTargetFlagPatch (the Assign-as-Ally builder) must
 *      never reference follower progression fields — Assign as Ally must
 *      remain non-mechanical.
 *   4. convertToFollower must call validateFollowerConversionSlot before
 *      committing — Convert to Follower must never proceed without a
 *      validated, open follower slot.
 *   5. No direct `.setFlag(`/`.update(` on an actor-like variable in
 *      ally-assignment-service.js bypassing ActorEngine.
 *   6. convertToFollower must consult the droid stock-conversion gate
 *      (isDroidStatblockMode / evaluateDroidConversionGate) — it must never
 *      bypass the canonical droid calculation-mode authority.
 *   7. isEligibleAssignmentTargetType's allowed set must not include
 *      vehicle/starship/hazard.
 *   8. assignAsAlly, convertToFollower, and unassignAlly must each
 *      independently re-check `game.user?.isGM === true` — hiding a button
 *      is not a permission boundary.
 *   9. mapActorCard's follower/minion level-sync fields
 *      (canLevelUpFollower/canSyncMinion) must remain scoped to exactly
 *      'follower'/'minion'/'privateer' kinds — an assigned-ally kind must
 *      never enter mechanical level sync.
 *   10. buildOwnerAssignmentUpdate must de-duplicate by Actor id (no
 *       duplicate owner relationship records for the same target).
 *
 * ATOMICITY CORRECTION PASS additions:
 *   11. convertToFollower's follower-derivation step must be REQUIRED, not
 *       best-effort — its result must be checked and a failure must THROW
 *       (aborting/rolling back the transaction), never merely logged.
 *   12. unassignAlly must run through runFollowerMutationTransaction, not
 *       two independent bare ActorEngine.updateActor() calls.
 *   13. convertToFollower's owner-relationship-commit rollback must restore
 *       a captured pre-mutation snapshot, not re-read the live Actor's
 *       ownedActors/flags inside the rollback closure itself (guards
 *       against reintroducing the exact stale-snapshot bug this pass fixed).
 *
 * STYLED ASSIGNMENT MODAL additions (UI addendum — feat(allies): add styled
 * NPC assignment modal):
 *   14. Neither the controller nor the modal template may contain a plain
 *       `<select name="targetActorId">`/`<select name="slotId">` in the
 *       normal assignment flow — the styled radio-card modal replaces the
 *       old picker/choice Dialogs entirely.
 *   15. The modal (ally-assignment-modal.js) must not construct an
 *       assignment link/relationship object itself (no
 *       `assignedAllyKind:`/`ASSIGNMENT_KIND` reference) — it only builds a
 *       normalized selection result for the controller to hand to
 *       AlliesSurfaceService.
 *   16. The modal must not import or call ActorEngine.
 *   17. The modal must not perform direct Actor mutation (`.update(`,
 *       `.setFlag(`, `.unsetFlag(`) or call AllyAssignmentService directly —
 *       it resolves a result; only the controller, after the modal closes,
 *       calls AlliesSurfaceService.
 *   18. Every radio-card block in the modal template (Actor cards,
 *       assignment-mode cards, follower-slot cards) must contain a real
 *       `<input type="radio">`, not a clickable element with no form control.
 *   19. The controller's drag/drop handler (_handleDrop) must never call an
 *       assignment/conversion service directly — it must route through the
 *       same modal-opening flow as the button, never bypassing GM
 *       confirmation of Assign as Ally / Convert to Follower.
 *   20. The modal's default assignment-mode state must be 'ally' — a drop
 *       or open must never default into a mechanical conversion without an
 *       explicit GM choice.
 *   21. The follower-slot auto-selection helper must never pick a slot by
 *       array position when more than one open slot exists — auto-select is
 *       only permitted when there is EXACTLY one candidate slot.
 *
 * ELIGIBILITY/OWNERSHIP CORRECTION PASS additions (fix(allies): harden NPC
 * assignment modal eligibility):
 *   22. The controller's conversion call must forward
 *       `grantOwnership: result.grantOwnership` — the modal's ownership
 *       checkbox must never be silently discarded on the Convert to
 *       Follower path.
 *   23. convertToFollower must evaluate target eligibility via
 *       evaluateFollowerConversionEligibility, not
 *       evaluateNpcAssignmentEligibility — the two must remain distinct so
 *       an Actor already assigned to THIS owner as a relationship-only ally
 *       stays convertible (the migration path), while a different owner's
 *       assignment, an existing follower, or an active player character
 *       stays blocked at the service boundary, not just in the UI picker.
 *   24. The picker view model (buildNpcAssignmentPickerViewModel) must
 *       compute canConvertToFollower from evaluateFollowerConversionEligibility,
 *       not by reusing the Assign-as-Ally evaluation.
 *   25. Both evaluateNpcAssignmentEligibility and
 *       evaluateFollowerConversionEligibility must check isTargetAlreadyFollower
 *       and isActivePlayerCharacter — an existing mechanical follower or an
 *       active PC must be blocked from both relationship-only assignment
 *       and conversion.
 *   26. Every Actor radio card in the modal template must carry a real
 *       `disabled` attribute when the view model marks it not-selectable
 *       (radioDisabled) — an Actor ineligible for both modes must not be
 *       selectable into a dead-end state.
 *   27. The shared ownership-grant transaction step must define a
 *       `rollback`, not only a `commit` — a later step's failure must
 *       restore the target's prior ownership level, not merely leave an
 *       ownership grant in place while reporting the transaction failed.
 *
 * ELIGIBILITY/OWNERSHIP CORRECTION PASS ROUND 2 additions (deeper eligibility,
 * template validation, and modal-resilience review):
 *   28. The controller's conversion call must forward BOTH
 *       `grantOwnership:` and `template:` from the modal's result — neither
 *       may be silently dropped on the Convert to Follower path.
 *   29. convertToFollower must route its eligibility/template/droid check
 *       through buildFollowerConversionPreflight, and that function's own
 *       body must call evaluateFollowerConversionEligibility (never
 *       evaluateNpcAssignmentEligibility) — the service boundary must never
 *       trust a UI-only eligibility check.
 *   30. Both evaluateNpcAssignmentEligibility and
 *       evaluateFollowerConversionEligibility must call
 *       findExistingFollowerRelationship — the canonical, registry-scanning
 *       existing-follower check — not merely the narrower
 *       isTargetAlreadyFollower flag read.
 *   31. resolveAllowedFollowerTemplates must treat an explicit, empty
 *       `templateChoices` array as zero allowed templates (checked via
 *       `Array.isArray`, not a truthy-length check) — it must not silently
 *       default-fill a slot that really has no valid templates configured.
 *   32. The ownership-grant step's commit must capture `previousOwnership`
 *       BEFORE writing the new ownership grant — capturing it after (or not
 *       at all) would let rollback restore already-mutated state.
 *   33. The modal template root must be a real `<form>` (Enter-to-submit
 *       requires real form semantics), and the modal script must wire a
 *       `submit` listener that calls `preventDefault()`.
 *
 * P2-3 additions (persistent follower-slot/target conversion reservations,
 * collision-safe modal identity):
 *   34. The modal must not use a fixed/global static Application id — no
 *       literal `id: '...'` in DEFAULT_OPTIONS; the id must be computed
 *       per owner Actor.
 *   35. The modal must maintain a static in-flight registry keyed by owner
 *       Actor id (`#openByOwnerId`), and `wait()` must consult it before
 *       constructing a new instance.
 *   36. Every modal exit path must settle its Promise through ONE shared,
 *       idempotent `_finalizeModal()` method — both `_settle()` and
 *       `close()` must call it, never duplicate settlement logic inline.
 *   37. convertToFollower must acquire a request token and reserve the
 *       follower slot via `FollowerSlotService.reserveFollowerSlot()`
 *       before any target/owner mutation.
 *   38. Reservations must be acquired in a fixed order: slot reservation,
 *       then the pre-conversion target snapshot, then the target-side
 *       conversion reservation — never the reverse.
 *   39. The owner-relationship-commit step must finalize the slot via
 *       `finalizeReservedFollowerSlot()` (token-verified), never the plain,
 *       non-reservation-aware slot-update builder.
 *   40. A failed conversion transaction must release the slot reservation
 *       explicitly (the transaction's own rollback never touches it, since
 *       it was acquired before the transaction started).
 *   41. `FollowerSlotService.releaseFollowerSlotReservation()` must be
 *       token-conditional — comparing the live reservation's token against
 *       the caller's and rejecting a mismatch, never clearing
 *       unconditionally.
 *   42. `FollowerSlotService.reserveFollowerSlot()` must reread the owner
 *       Actor after writing the reservation and verify the token survived
 *       before reporting success — a last-write-wins race is not
 *       considered safely acquired otherwise.
 *
 * Report-only by default; --strict exits non-zero on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const SERVICE_FILE = path.join(ROOT, 'scripts/engine/crew/ally-assignment-service.js');
const SURFACE_SERVICE_FILE = path.join(ROOT, 'scripts/ui/shell/AlliesSurfaceService.js');
const CONTROLLER_FILE = path.join(ROOT, 'scripts/ui/shell/AlliesSurfaceController.js');
const MODAL_FILE = path.join(ROOT, 'scripts/apps/allies/ally-assignment-modal.js');
const MODAL_TEMPLATE_FILE = path.join(ROOT, 'templates/apps/allies/ally-assignment-modal.hbs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function extractFunctionBody(source, functionNamePattern) {
  const match = source.match(functionNamePattern);
  return match ? match[0] : null;
}

function main() {
  const violations = [];
  const scanned = [];

  if (fs.existsSync(CONTROLLER_FILE)) {
    scanned.push(CONTROLLER_FILE);
    const rawSource = read(CONTROLLER_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, CONTROLLER_FILE);

    // Check 1: controller must not construct a link object or call
    // ActorEngine directly.
    if (/\bassignedAllyKind\s*:/.test(source) || /\bASSIGNMENT_KIND\b/.test(source)) {
      violations.push({
        check: '1: controller must not construct assignment links',
        file: relPath,
        detail: 'found an assignedAllyKind:/ASSIGNMENT_KIND reference — the controller must delegate to AlliesSurfaceService, which delegates to AllyAssignmentService, not build a relationship record itself'
      });
    }
    if (/\bActorEngine\b/.test(source)) {
      violations.push({
        check: '1: controller must not call ActorEngine directly',
        file: relPath,
        detail: 'found a direct ActorEngine reference in the controller — all assignment mutation must route through AllyAssignmentService'
      });
    }

    // Check 14: no plain <select> picker for the target Actor or follower
    // slot in the normal assignment flow — the styled modal replaces both.
    if (/<select[^>]*name="targetActorId"/.test(source) || /<select[^>]*name="slotId"/.test(source)) {
      violations.push({
        check: '14: no plain <select> picker in the normal assignment flow',
        file: relPath,
        detail: 'found a <select name="targetActorId"|"slotId"> in the controller — the styled AllyAssignmentModal radio-card picker must be used instead'
      });
    }

    // Check 19: drag/drop must never call an assignment/conversion service
    // directly — it must open the same modal the button flow uses so the
    // GM still confirms Assign as Ally / Convert to Follower explicitly.
    const dropMatch = source.match(/async\s+_handleDrop\s*\([\s\S]*?\n  \}/);
    if (!dropMatch) {
      violations.push({
        check: '19: _handleDrop must exist',
        file: relPath,
        detail: 'expected an async _handleDrop(ev) method on the controller'
      });
    } else if (/AlliesSurfaceService\s*\.\s*(assignExistingNpcAsAlly|convertExistingNpcToFollower)\s*\(/.test(dropMatch[0])) {
      violations.push({
        check: '19: drag/drop must not bypass the assignment modal',
        file: relPath,
        detail: '_handleDrop calls an assignment/conversion service directly — it must route through the modal-opening flow (_assignExistingNpc) so the GM still confirms a mode before anything is mutated'
      });
    }

    // Check 22 / 28: the controller's conversion call must forward BOTH
    // grantOwnership and template — the modal's ownership checkbox and
    // template choice must never be silently discarded on the Convert to
    // Follower path. Not anchored to a specific local variable name inside
    // the onSubmit callback (it may be `result`, `candidateResult`, etc.) —
    // anchored on the *.grantOwnership / *.templateType member-access
    // pattern instead, which is what actually matters.
    const assignFlowMatch = source.match(/async\s+_assignExistingNpc\s*\([\s\S]*?\n  \}/);
    const convertCallMatch = assignFlowMatch?.[0]?.match(/AlliesSurfaceService\s*\.\s*convertExistingNpcToFollower\s*\([\s\S]{0,320}?\)/);
    if (!assignFlowMatch || !convertCallMatch || !/grantOwnership\s*:\s*\w+\.grantOwnership/.test(convertCallMatch[0])) {
      violations.push({
        check: '22: conversion call must forward grantOwnership',
        file: relPath,
        detail: 'expected the convertExistingNpcToFollower call inside _assignExistingNpc to pass grantOwnership: <result>.grantOwnership — the modal ownership checkbox must not be silently discarded when converting'
      });
    }
    if (!assignFlowMatch || !convertCallMatch || !/template\s*:\s*\w+\.templateType/.test(convertCallMatch[0])) {
      violations.push({
        check: '28: conversion call must forward templateType',
        file: relPath,
        detail: 'expected the convertExistingNpcToFollower call inside _assignExistingNpc to pass template: <result>.templateType — the modal template choice must not be silently discarded when converting'
      });
    }
  }

  if (fs.existsSync(MODAL_TEMPLATE_FILE)) {
    scanned.push(MODAL_TEMPLATE_FILE);
    const templateSource = read(MODAL_TEMPLATE_FILE);
    const relTemplatePath = path.relative(ROOT, MODAL_TEMPLATE_FILE);

    // Check 14 (template half): no plain <select> for the Actor/slot pickers.
    if (/<select[^>]*name="(targetActorId|followerSlotId|slotId)"/.test(templateSource)) {
      violations.push({
        check: '14: no plain <select> picker in the modal template',
        file: relTemplatePath,
        detail: 'found a <select> for targetActorId/followerSlotId/slotId — these must be real radio-card inputs'
      });
    }

    // Check 18: every radio-card block must contain a real radio input, not
    // a clickable element with no underlying form control.
    const cardGroups = [
      { name: 'targetActorId', label: 'swse-assignment-actor-card' },
      { name: 'assignmentMode', label: 'swse-assignment-mode-card' },
      { name: 'followerSlotId', label: 'swse-assignment-slot-card' }
    ];
    for (const group of cardGroups) {
      const cardPattern = new RegExp(`class="${group.label}[^"]*"[\\s\\S]{0,400}?<input\\s+type="radio"\\s+name="${group.name}"`);
      if (!cardPattern.test(templateSource)) {
        violations.push({
          check: `18: ${group.label} must wrap a real radio input`,
          file: relTemplatePath,
          detail: `expected a <label class="${group.label}"...> to contain <input type="radio" name="${group.name}"> — a fake, click-only card is not keyboard-accessible`
        });
      }
    }

    // Check 33 (template half): the modal root must be a real <form> —
    // Enter-to-submit requires real HTML form semantics, not a plain <div>
    // with a synthesized keydown handler.
    if (!/^<form\b/.test(templateSource.trim())) {
      violations.push({
        check: '33: modal template root must be a real <form>',
        file: relTemplatePath,
        detail: 'expected the modal template to start with a <form ...> root element so Enter-to-submit works via native HTML form semantics'
      });
    }

    // Check 26: an Actor card the view model marks not-selectable must
    // carry a real disabled attribute on its radio input, not just a CSS
    // class — an ineligible-for-both-modes Actor must not be selectable
    // into a dead-end state.
    const actorRadioMatch = templateSource.match(/<input\s+type="radio"\s+name="targetActorId"[\s\S]{0,200}/);
    if (!actorRadioMatch || !/\{\{#if this\.radioDisabled\}\}disabled/.test(actorRadioMatch[0])) {
      violations.push({
        check: '26: inert Actor cards must be disabled, not just styled',
        file: relTemplatePath,
        detail: 'expected the Actor card radio input to carry {{#if this.radioDisabled}}disabled{{/if}} — a card ineligible for every mode must not remain selectable'
      });
    }
  }

  if (fs.existsSync(MODAL_FILE)) {
    scanned.push(MODAL_FILE);
    const rawModalSource = read(MODAL_FILE);
    const modalSource = stripCommentsAndStrings(rawModalSource);
    const relModalPath = path.relative(ROOT, MODAL_FILE);

    // Check 15: the modal must not construct an assignment link itself.
    if (/\bassignedAllyKind\s*:/.test(modalSource) || /\bASSIGNMENT_KIND\b/.test(modalSource)) {
      violations.push({
        check: '15: modal must not construct assignment links',
        file: relModalPath,
        detail: 'found an assignedAllyKind:/ASSIGNMENT_KIND reference in the modal — it must only resolve a normalized selection result, never build a relationship record itself'
      });
    }

    // Check 16: the modal must not import or call ActorEngine.
    if (/^\s*import\b[\s\S]{0,120}ActorEngine/m.test(rawModalSource) || /\bActorEngine\s*\.\s*\w+\s*\(/.test(modalSource)) {
      violations.push({
        check: '16: modal must not import or call ActorEngine',
        file: relModalPath,
        detail: 'the modal must never touch ActorEngine — it only reads a read-only view model and resolves a result'
      });
    }

    // Check 17: no direct Actor mutation or AllyAssignmentService call.
    if (/\.\s*(update|setFlag|unsetFlag)\s*\(/.test(modalSource)) {
      violations.push({
        check: '17: modal must not mutate an Actor directly',
        file: relModalPath,
        detail: 'found a direct .update()/.setFlag()/.unsetFlag() call in the modal — the modal must only resolve a result; AlliesSurfaceController performs the mutation after the modal closes'
      });
    }
    if (/\bAllyAssignmentService\s*\./.test(modalSource)) {
      violations.push({
        check: '17: modal must not call AllyAssignmentService directly',
        file: relModalPath,
        detail: 'the modal must never call the lower-level mutation service — only AlliesSurfaceController does, through AlliesSurfaceService, after the modal resolves'
      });
    }

    // Check 33 (script half): a submit listener that calls preventDefault
    // must be wired — a <form> alone does nothing without this.
    if (!/addEventListener\s*\(\s*['"]submit['"][\s\S]{0,160}preventDefault\s*\(\s*\)/.test(modalSource)) {
      violations.push({
        check: '33: modal must wire a submit listener that calls preventDefault',
        file: relModalPath,
        detail: "expected an addEventListener('submit', ...) handler that calls event.preventDefault() before invoking _onConfirm — otherwise the browser's default form submission (a full navigation) would fire"
      });
    }

    // Check 34: the modal must NOT use a fixed/global static Application id
    // — `DEFAULT_OPTIONS` (or its static class field) must not contain a
    // literal `id: 'swse-ally-assignment-modal'` (or any other bare string
    // literal for `id`). Scoping the id per owner Actor is what lets two
    // owners each have an open modal at once without one instance's DOM
    // element/render lifecycle colliding with the other's.
    if (/id\s*:\s*['"][^'"]*['"]/.test(modalSource)) {
      violations.push({
        check: '34: modal must not use a fixed/global static Application id',
        file: relModalPath,
        detail: 'found a literal id: "..." string — the Application id must be computed per owner Actor (e.g. in the constructor, passed to super()), never a single fixed id shared by every instance'
      });
    }

    // Check 35: a static in-flight registry keyed by owner Actor id must
    // exist, and wait() must consult it BEFORE constructing a new
    // instance — otherwise a second wait() call for the same owner while
    // one modal is already open creates a second, independent Promise
    // that can go permanently unsettled.
    if (!/static\s+#openByOwnerId\s*=\s*new\s+Map\s*\(\s*\)/.test(modalSource)) {
      violations.push({
        check: '35: modal must maintain a static in-flight registry keyed by owner Actor id',
        file: relModalPath,
        detail: 'expected a `static #openByOwnerId = new Map()` field — required to detect and reuse an already-open modal for the same owner'
      });
    }
    const waitMethodMatch = modalSource.match(/static\s+async\s+wait\s*\([\s\S]*?\n  \}/);
    if (!waitMethodMatch || !/#openByOwnerId\s*\.\s*get\s*\(/.test(waitMethodMatch[0])) {
      violations.push({
        check: '35: wait() must check the in-flight registry before creating a new modal',
        file: relModalPath,
        detail: 'expected wait() to read #openByOwnerId for the owner Actor id and return the existing Promise/refocus the existing modal instead of constructing a second instance'
      });
    }

    // Check 36: every exit path (submit success, Cancel, Escape, [X],
    // forced close) must settle the modal's Promise through ONE shared,
    // idempotent method — never duplicate settlement logic inline in both
    // _settle() and close(), which is exactly what let a Promise go
    // unsettled (or get double-resolved) on some exit paths historically.
    if (!/_finalizeModal\s*\(/.test(modalSource)) {
      violations.push({
        check: '36: modal must settle its Promise through one shared _finalizeModal() method',
        file: relModalPath,
        detail: 'expected a _finalizeModal(value) method, called by BOTH _settle() and close(), guarded by _settled — every exit path must funnel through the same settlement logic'
      });
    } else {
      const closeMethodMatch = modalSource.match(/async\s+close\s*\([\s\S]*?\n  \}/);
      if (!closeMethodMatch || !/_finalizeModal\s*\(/.test(closeMethodMatch[0])) {
        violations.push({
          check: '36: close() must call _finalizeModal()',
          file: relModalPath,
          detail: 'expected close() (the Escape/[X]/forced-close path) to call _finalizeModal(null) rather than duplicating its own independent settlement logic'
        });
      }
    }
  }

  if (fs.existsSync(SURFACE_SERVICE_FILE)) {
    scanned.push(SURFACE_SERVICE_FILE);
    const rawSource = read(SURFACE_SERVICE_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, SURFACE_SERVICE_FILE);

    // Check 2: the NEW existing-NPC-assignment delegate methods must not
    // construct an assignment link object themselves. Scoped to just those
    // methods (not the whole file) — createBareBeastCompanion's inline
    // actorData flags for a NEWLY CREATED beast Actor are a separate,
    // pre-existing, unrelated mechanism this check must not flag.
    const delegateMethodNames = ['assignExistingNpcAsAlly', 'unassignExistingNpcAlly', 'convertExistingNpcToFollower'];
    for (const methodName of delegateMethodNames) {
      const methodMatch = source.match(new RegExp(`static\\s+async\\s+${methodName}[\\s\\S]*?\\n  \\}`));
      if (methodMatch && /assignedAllyOwnerId\s*:/.test(methodMatch[0])) {
        violations.push({
          check: '2: surface service must not construct assignment links',
          file: relPath,
          detail: `${methodName} contains an assignedAllyOwnerId: object-literal field — assignment relationship construction must live only in ally-assignment-service.js`
        });
      }
    }

    // Check 9: mapActorCard's level-sync fields must remain scoped to the
    // mechanical kinds only.
    const mapActorCardMatch = source.match(/function\s+mapActorCard[\s\S]*?\n\}/);
    const mapActorCardBody = mapActorCardMatch ? mapActorCardMatch[0] : '';
    const levelUpLine = mapActorCardBody.match(/canLevelUpFollower\s*:\s*[^,]+/);
    const syncMinionLine = mapActorCardBody.match(/canSyncMinion\s*:\s*[^,]+/);
    if (!mapActorCardMatch || !levelUpLine || !/kind\s*===\s*'follower'/.test(levelUpLine[0])) {
      violations.push({
        check: '9: assigned allies must not enter follower level sync',
        file: relPath,
        detail: "expected mapActorCard's canLevelUpFollower to remain scoped to kind === 'follower' only"
      });
    }
    if (!mapActorCardMatch || !syncMinionLine || !/'minion'/.test(syncMinionLine[0]) || !/'privateer'/.test(syncMinionLine[0])) {
      violations.push({
        check: '9: assigned allies must not enter minion level sync',
        file: relPath,
        detail: "expected mapActorCard's canSyncMinion to remain scoped to 'minion'/'privateer' kinds only"
      });
    }

    // Check 20: buildDefaultAllyAssignmentModalState must default
    // assignmentMode to 'ally' — a drop or open must never default into a
    // mechanical conversion without an explicit GM choice.
    const defaultStateFnMatch = source.match(/function\s+buildDefaultAllyAssignmentModalState[\s\S]*?\n\}/);
    if (!defaultStateFnMatch || !/assignmentMode\s*:\s*initial\.assignmentMode\s*===\s*['"]follower['"]\s*\?\s*['"]follower['"]\s*:\s*['"]ally['"]/.test(defaultStateFnMatch[0])) {
      violations.push({
        check: '20: modal state must default to Assign as Ally',
        file: relPath,
        detail: "expected buildDefaultAllyAssignmentModalState to fall back to assignmentMode: 'ally' unless the caller explicitly passed 'follower'"
      });
    }

    // Check 21: follower-slot auto-selection must never pick a slot by
    // array position when more than one open slot exists.
    const slotPolicyMatch = source.match(/function\s+resolveFollowerSlotSelectionOnModeChange[\s\S]*?\n\}/);
    if (!slotPolicyMatch || !/\.length\s*===\s*1/.test(slotPolicyMatch[0])) {
      violations.push({
        check: '21: follower-slot auto-selection must require exactly one open slot',
        file: relPath,
        detail: 'expected resolveFollowerSlotSelectionOnModeChange to gate auto-selection on followerSlots.length === 1 — with multiple open slots, the GM must choose explicitly'
      });
    }

    // Check 24: the picker view model must compute canConvertToFollower
    // from evaluateFollowerConversionEligibility's OWN result, not by
    // reusing the Assign-as-Ally evaluation — anchored on the actual
    // assignment line, not merely "is the function called somewhere in
    // this method" (which would still pass if the result were computed
    // but never used for gating).
    const pickerVmMatch = source.match(/static\s+buildNpcAssignmentPickerViewModel[\s\S]*?\n  \}/);
    const canConvertLineMatch = pickerVmMatch?.[0]?.match(/const\s+canConvertToFollower\s*=[^;]+;/);
    if (!pickerVmMatch || !/evaluateFollowerConversionEligibility\s*\(/.test(pickerVmMatch[0]) || !canConvertLineMatch || !/conversionEvaluation\.eligible/.test(canConvertLineMatch[0])) {
      violations.push({
        check: '24: picker view model must use the conversion-specific eligibility gate',
        file: relPath,
        detail: 'expected the canConvertToFollower assignment to read conversionEvaluation.eligible (from evaluateFollowerConversionEligibility) — reusing the ally evaluation would make same-owner conversion appear blocked in the UI even though the service allows it'
      });
    }
  }

  if (fs.existsSync(SERVICE_FILE)) {
    scanned.push(SERVICE_FILE);
    const rawSource = read(SERVICE_FILE);
    const source = stripCommentsAndStrings(rawSource);
    const relPath = path.relative(ROOT, SERVICE_FILE);

    // Check 3: the Assign-as-Ally target flag builder must never reference
    // follower progression fields.
    const targetFlagPatchMatch = source.match(/function\s+buildAssignmentTargetFlagPatch[\s\S]*?\n\}/);
    if (!targetFlagPatchMatch) {
      violations.push({
        check: '3: buildAssignmentTargetFlagPatch must exist',
        file: relPath,
        detail: 'expected buildAssignmentTargetFlagPatch to be defined as the Assign-as-Ally target metadata builder'
      });
    } else if (/isFollower|followerTemplate|progression\.isFollower/.test(targetFlagPatchMatch[0])) {
      violations.push({
        check: '3: Assign as Ally must not write follower progression fields',
        file: relPath,
        detail: 'buildAssignmentTargetFlagPatch references a follower progression field — Assign as Ally must remain non-mechanical'
      });
    }

    // Check 4: convertToFollower must validate the slot before committing.
    const convertMatch = source.match(/static\s+async\s+convertToFollower[\s\S]*?\n  \}/);
    const convertBody = convertMatch ? convertMatch[0] : '';
    if (!convertMatch || !/validateFollowerConversionSlot\s*\(/.test(convertBody)) {
      violations.push({
        check: '4: convertToFollower must validate the slot',
        file: relPath,
        detail: 'expected convertToFollower to call validateFollowerConversionSlot before committing — it must never proceed without a validated, open follower slot'
      });
    }

    // Check 5: no direct setFlag()/actor.update() bypassing ActorEngine.
    const directFlagMatches = source.match(/\b(ownerActor|targetActor)\s*\.\s*(setFlag|unsetFlag|update)\s*\(/g) || [];
    if (directFlagMatches.length > 0) {
      violations.push({
        check: '5: no direct actor mutation bypassing ActorEngine',
        file: relPath,
        detail: `found ${directFlagMatches.length} direct call(s) (${[...new Set(directFlagMatches)].join(', ')}) — route through ActorEngine.updateActor()`
      });
    }

    // Check 6: convertToFollower must consult the droid stock-conversion gate.
    if (!convertMatch || !/evaluateDroidConversionGate\s*\(/.test(convertBody)) {
      violations.push({
        check: '6: convertToFollower must consult the droid conversion gate',
        file: relPath,
        detail: 'expected convertToFollower to call evaluateDroidConversionGate — a stock-statblock droid must never bypass canonical droid calculation-mode authority'
      });
    }

    // Check 7: eligible target types must exclude vehicles/starships/hazards.
    const targetTypesMatch = source.match(/ELIGIBLE_TARGET_ACTOR_TYPES\s*=\s*new Set\(\[[^\]]*\]\)/);
    if (!targetTypesMatch || /'vehicle'|'starship'|'hazard'/.test(targetTypesMatch[0])) {
      violations.push({
        check: '7: vehicles/starships/hazards must not be assignable',
        file: relPath,
        detail: 'ELIGIBLE_TARGET_ACTOR_TYPES must not include vehicle/starship/hazard'
      });
    }

    // Check 8: each of the three public methods must independently
    // re-check game.user.isGM — either a direct check (either polarity:
    // `=== true` or `!== true`) or delegation to
    // evaluateNpcAssignmentEligibility, whose OWN body is separately
    // verified below to actually perform that check (so the indirect path
    // cannot be a hollow no-op delegation).
    const eligibilityWrapperMatch = source.match(/function\s+evaluateNpcAssignmentEligibility[\s\S]*?\n\}/);
    const eligibilityWrapperChecksGM = eligibilityWrapperMatch && /isGM\s*:\s*game\.user\?\.\s*isGM\s*===\s*true/.test(eligibilityWrapperMatch[0]);
    if (!eligibilityWrapperMatch || !eligibilityWrapperChecksGM) {
      violations.push({
        check: '8: evaluateNpcAssignmentEligibility must check GM status',
        file: relPath,
        detail: 'expected evaluateNpcAssignmentEligibility to pass isGM: game.user?.isGM === true into its pure evaluator — this is the GM check assignAsAlly delegates to'
      });
    }

    for (const methodName of ['assignAsAlly', 'unassignAlly', 'convertToFollower']) {
      const methodMatch = source.match(new RegExp(`static\\s+async\\s+${methodName}[\\s\\S]*?\\n  \\}`));
      const methodBody = methodMatch ? methodMatch[0] : '';
      const directCheck = /game\.user\?\.\s*isGM\s*(===|!==)\s*true/.test(methodBody);
      const indirectCheck = /evaluateNpcAssignmentEligibility\s*\(/.test(methodBody) && eligibilityWrapperChecksGM;
      if (!methodMatch || (!directCheck && !indirectCheck)) {
        violations.push({
          check: `8: ${methodName} must independently re-check GM status`,
          file: relPath,
          detail: `expected ${methodName} to check game.user?.isGM (directly or via evaluateNpcAssignmentEligibility) — hiding a button is not a permission boundary`
        });
      }
    }

    // Check 10: buildOwnerAssignmentUpdate must de-duplicate by Actor id.
    const ownerUpdateMatch = source.match(/function\s+buildOwnerAssignmentUpdate[\s\S]*?\n\}/);
    if (!ownerUpdateMatch || !/appendUnique\s*\(/.test(ownerUpdateMatch[0])) {
      violations.push({
        check: '10: owner relationship records must be de-duplicated',
        file: relPath,
        detail: 'expected buildOwnerAssignmentUpdate to de-duplicate by Actor id (appendUnique) — a second assignment of the same Actor must not create a duplicate owner-side record'
      });
    }

    // Check 11 (ATOMICITY): the follower-derivation step must be required,
    // not best-effort — its result must be checked and a failure must throw.
    // Anchored on the CALL site (`await applyFollowerDerivation(`), not the
    // earlier `const applyFollowerDerivation = options...` assignment.
    const derivationCallMatch = convertBody.match(/await\s+applyFollowerDerivation\s*\([\s\S]{0,200}/);
    if (!convertMatch || !derivationCallMatch || !/throw new Error/.test(derivationCallMatch[0])) {
      violations.push({
        check: '11: follower derivation must be a required transaction step',
        file: relPath,
        detail: 'expected convertToFollower to call applyFollowerDerivation and throw when it does not return true — a derivation failure must never be silently logged while the conversion is still reported as successful'
      });
    }
    if (/catch[\s\S]{0,120}Post-conversion derived-stat sync failed/.test(source)) {
      violations.push({
        check: '11: follower derivation must be a required transaction step',
        file: relPath,
        detail: 'found the old best-effort post-commit derivation pattern (caught-and-logged failure) — derivation must be a required transaction step, not a best-effort afterthought'
      });
    }

    // Check 12 (ATOMICITY): unassignAlly must be transactional.
    const unassignMatch = source.match(/static\s+async\s+unassignAlly[\s\S]*?\n  \}/);
    if (!unassignMatch || !/runFollowerMutationTransaction\s*\(/.test(unassignMatch[0])) {
      violations.push({
        check: '12: unassignAlly must be transactional',
        file: relPath,
        detail: 'expected unassignAlly to run its owner-removal and target-cleanup writes through runFollowerMutationTransaction — two independent bare ActorEngine.updateActor() calls can leave the owner and target relationship state inconsistent if the second call fails'
      });
    }

    // Check 13 (ATOMICITY): convertToFollower's owner-side rollback must
    // restore a captured pre-mutation snapshot, not re-read the live Actor
    // inside the rollback closure (the exact bug this pass fixed).
    const ownerRollbackMatch = convertBody.match(/name:\s*'owner-relationship-commit'[\s\S]*?rollback:\s*async[\s\S]*?\}\s*\}/);
    if (!ownerRollbackMatch || /ownerActor\.system\?\.\s*ownedActors/.test(ownerRollbackMatch[0])) {
      violations.push({
        check: '13: owner rollback must use a captured pre-mutation snapshot',
        file: relPath,
        detail: "expected the owner-relationship-commit rollback closure to write a pre-captured snapshot variable, not re-read ownerActor.system?.ownedActors live — reading the actor's current state inside a rollback closure returns the already-mutated value, not the original"
      });
    }

    // Check 23 / 29: convertToFollower must route eligibility (and, since
    // the eligibility/ownership round-2 pass, template validation and the
    // droid gate) through buildFollowerConversionPreflight — never through
    // evaluateNpcAssignmentEligibility, and never by re-deriving its own
    // parallel eligibility logic that could drift from the canonical gate.
    if (!convertMatch || !/buildFollowerConversionPreflight\s*\(/.test(convertBody)) {
      violations.push({
        check: '23: convertToFollower must use the conversion-specific preflight',
        file: relPath,
        detail: 'expected convertToFollower to call buildFollowerConversionPreflight — this is the single canonical fact-gate for conversion eligibility, template validity, and the droid gate; the service must never trust a UI-only check'
      });
    }
    if (convertMatch && /evaluateNpcAssignmentEligibility\s*\(/.test(convertBody)) {
      violations.push({
        check: '23: convertToFollower must not reuse the Assign-as-Ally eligibility gate',
        file: relPath,
        detail: 'found a call to evaluateNpcAssignmentEligibility inside convertToFollower — conversion eligibility must come from buildFollowerConversionPreflight/evaluateFollowerConversionEligibility only'
      });
    }

    // Check 29: buildFollowerConversionPreflight itself — the function
    // convertToFollower now delegates to — must call
    // evaluateFollowerConversionEligibility, not evaluateNpcAssignmentEligibility.
    const preflightFnMatch = source.match(/function\s+buildFollowerConversionPreflight\s*\([\s\S]*?\n\}/);
    if (!preflightFnMatch || !/evaluateFollowerConversionEligibility\s*\(/.test(preflightFnMatch[0])) {
      violations.push({
        check: '29: buildFollowerConversionPreflight must use the conversion-specific eligibility gate',
        file: relPath,
        detail: 'expected buildFollowerConversionPreflight to call evaluateFollowerConversionEligibility'
      });
    }
    if (preflightFnMatch && /evaluateNpcAssignmentEligibility\s*\(/.test(preflightFnMatch[0])) {
      violations.push({
        check: '29: buildFollowerConversionPreflight must not reuse the Assign-as-Ally eligibility gate',
        file: relPath,
        detail: 'found a call to evaluateNpcAssignmentEligibility inside buildFollowerConversionPreflight'
      });
    }

    // Check 25 / 30: both eligibility wrappers must check the CANONICAL,
    // registry-scanning existing-follower relationship
    // (findExistingFollowerRelationship) — not merely the narrower
    // isTargetAlreadyFollower flag read, which misses a target whose own
    // flags are stale relative to a slot/registry that still claims it —
    // and isActivePlayerCharacter.
    const allyEligibilityWrapperMatch = source.match(/function\s+evaluateNpcAssignmentEligibility\s*\([\s\S]*?\n\}/);
    const conversionEligibilityWrapperMatch = source.match(/function\s+evaluateFollowerConversionEligibility\s*\([\s\S]*?\n\}/);
    for (const [label, match] of [['evaluateNpcAssignmentEligibility', allyEligibilityWrapperMatch], ['evaluateFollowerConversionEligibility', conversionEligibilityWrapperMatch]]) {
      if (!match || !/findExistingFollowerRelationship\s*\(/.test(match[0]) || !/isActivePlayerCharacter\s*\(/.test(match[0])) {
        violations.push({
          check: '25/30: eligibility must reject an existing follower (canonical check) and an active player character',
          file: relPath,
          detail: `expected ${label} to call both findExistingFollowerRelationship(...) and isActivePlayerCharacter(...)`
        });
      }
    }

    // Check 31: resolveAllowedFollowerTemplates must treat an explicit,
    // empty templateChoices array as zero allowed templates — checked via
    // Array.isArray (missing-field fallback), not a truthy-length check
    // that would also swallow a real "zero configured" slot into the
    // default 3-choice set.
    const resolveTemplatesFnMatch = source.match(/function\s+resolveAllowedFollowerTemplates\s*\([\s\S]*?\n\}/);
    if (!resolveTemplatesFnMatch || !/!Array\.isArray\s*\(\s*slot\.templateChoices\s*\)/.test(resolveTemplatesFnMatch[0])) {
      violations.push({
        check: '31: resolveAllowedFollowerTemplates must not default-fill an explicit empty templateChoices array',
        file: relPath,
        detail: 'expected the missing-field fallback to be gated on !Array.isArray(slot.templateChoices) — a slot record that DOES carry templateChoices as [] must be treated as zero allowed templates, not silently defaulted to the full set'
      });
    }

    // Check 27 / 32: the shared ownership-grant step must define a
    // rollback, AND its commit must capture previousOwnership BEFORE
    // writing the new grant (capturing after, or not at all, would let
    // rollback restore already-mutated state).
    const ownershipStepMatch = source.match(/function\s+buildOwnershipGrantStep[\s\S]*?\n\}/);
    if (!ownershipStepMatch || !/rollback\s*:\s*async/.test(ownershipStepMatch[0])) {
      violations.push({
        check: '27: the ownership-grant step must define a rollback',
        file: relPath,
        detail: 'expected buildOwnershipGrantStep to return a step object with a rollback function, not just commit — a later transaction-step failure must restore the target\'s prior ownership level'
      });
    }
    const ownershipCommitMatch = ownershipStepMatch?.[0]?.match(/commit:\s*async[\s\S]*?rollback:/);
    if (!ownershipCommitMatch || !/previousOwnership\s*=[\s\S]*?ActorEngine\s*\.\s*updateActor/.test(ownershipCommitMatch[0])) {
      violations.push({
        check: '32: ownership-grant commit must capture previousOwnership before writing the new grant',
        file: relPath,
        detail: 'expected the commit closure to assign previousOwnership BEFORE its ActorEngine.updateActor call — capturing it afterward would snapshot the already-mutated ownership map'
      });
    }

    // PHASE 10 ADDENDUM (P2-3) — persistent slot/target conversion
    // reservations.
    //
    // Check 37: convertToFollower must acquire a request token and reserve
    // the follower slot via FollowerSlotService.reserveFollowerSlot BEFORE
    // any target/owner mutation — never proceed on a bare eligibility
    // check alone.
    if (!convertMatch || !/requestToken\s*=[\s\S]*?FollowerSlotService\s*\.\s*reserveFollowerSlot\s*\(/.test(convertBody)) {
      violations.push({
        check: '37: convertToFollower must acquire a slot reservation with a request token before mutating',
        file: relPath,
        detail: 'expected convertToFollower to generate/accept a requestToken and call FollowerSlotService.reserveFollowerSlot(...) before any target/owner ActorEngine mutation'
      });
    }

    // Check 38: the slot reservation must be acquired BEFORE the target
    // reservation — a fixed order (slot first, then target) — never the
    // reverse. ROUND-2 CORRECTION: the target-conversion reservation flag
    // is now a PROTECTED path in the snapshot-restoration authority (see
    // snapshot-restoration-plan.js's PROTECTED_FLAG_PATHS), so the
    // pre-conversion snapshot's capture point relative to the target
    // reservation no longer matters for correctness — only the
    // slot-before-target acquisition order does.
    const slotReserveIdx = convertBody.indexOf('FollowerSlotService.reserveFollowerSlot(');
    const targetReserveIdx = convertBody.indexOf('FollowerSlotService.reserveFollowerConversionTarget(');
    if (slotReserveIdx === -1 || targetReserveIdx === -1 || !(slotReserveIdx < targetReserveIdx)) {
      violations.push({
        check: '38: reservations must be acquired in a fixed order (slot, then target)',
        file: relPath,
        detail: 'expected FollowerSlotService.reserveFollowerSlot(...) to be called before FollowerSlotService.reserveFollowerConversionTarget(...) — never the reverse order'
      });
    }

    // Check 39: the owner-relationship-commit step must finalize the slot
    // via finalizeReservedFollowerSlot() (token-verified), never write the
    // occupant with the plain, non-reservation-aware buildFollowerSlotUpdate.
    const ownerCommitStepMatch = convertBody.match(/name:\s*['"]owner-relationship-commit['"][\s\S]*?rollback:/);
    if (!ownerCommitStepMatch || !/finalizeReservedFollowerSlot\s*\(/.test(ownerCommitStepMatch[0])) {
      violations.push({
        check: '39: the owner-relationship-commit step must finalize the slot via finalizeReservedFollowerSlot()',
        file: relPath,
        detail: 'expected the owner-relationship-commit step to call finalizeReservedFollowerSlot(...) so a lost/stolen reservation aborts the conversion instead of silently committing an occupant the request no longer holds the reservation for'
      });
    }

    // Check 40: on a failed transaction, BOTH the slot AND target
    // reservations must be released — but only the release calls
    // themselves are required here; whether they are actually
    // token-conditional is enforced by check 41 on follower-slot-service.js
    // (releaseFollowerSlotReservation's/releaseFollowerConversionTargetReservation's
    // own bodies). ROUND-3 CORRECTION: the release calls may now be made
    // either directly within the failure branch, or via a shared helper
    // function the branch calls — extracting a shared release helper
    // (so its structured result can be inspected once, in one place) is
    // legitimate; silently dropping one of the two release calls, inline
    // or inside a helper, is not.
    const transactionFailureBranchMatch = convertBody.match(/if\s*\(\s*!transaction\.ok\s*\)\s*\{[\s\S]*?\n    \}/);
    function releasesBothReservations(branchSource, fullSource) {
      const hasSlotCall = /releaseFollowerSlotReservation\s*\(/.test(branchSource);
      const hasTargetCall = /releaseFollowerConversionTargetReservation\s*\(/.test(branchSource);
      if (hasSlotCall && hasTargetCall) return true;
      const helperCallNames = [...branchSource.matchAll(/\b(\w+)\s*\(\s*\{/g)].map(m => m[1]);
      for (const helperName of helperCallNames) {
        const helperDefMatch = fullSource.match(new RegExp(`(?:async\\s+)?function\\s+${helperName}\\s*\\([\\s\\S]*?\\n\\}`));
        if (helperDefMatch && /releaseFollowerSlotReservation\s*\(/.test(helperDefMatch[0]) && /releaseFollowerConversionTargetReservation\s*\(/.test(helperDefMatch[0])) {
          return true;
        }
      }
      return false;
    }
    if (!transactionFailureBranchMatch || !releasesBothReservations(transactionFailureBranchMatch[0], source)) {
      violations.push({
        check: '40: a failed conversion transaction must release both the slot and target reservations',
        file: relPath,
        detail: 'expected the `if (!transaction.ok)` failure branch to call BOTH FollowerSlotService.releaseFollowerSlotReservation(...) AND FollowerSlotService.releaseFollowerConversionTargetReservation(...) — directly, or via a shared helper function that itself calls both — the transaction\'s own rollback never touches either reservation, since both were acquired before the transaction started'
      });
    }

    // Check 43 (ROUND-3): releaseFollowerConversionTargetReservation()'s
    // STRUCTURED result must be inspected — neither release method
    // throws on a token mismatch or an unverified release, both RETURN
    // `{success: false, ...}`, so a caller that only try/catches and
    // never reads `.success` silently discards that failure.
    const releaseHelperMatch = source.match(/(?:async\s+)?function\s+releaseConversionReservations\s*\([\s\S]*?\n\}/);
    if (!releaseHelperMatch || !/targetRelease\.success/.test(releaseHelperMatch[0])) {
      violations.push({
        check: '43: releaseFollowerConversionTargetReservation()\'s structured result must be inspected',
        file: relPath,
        detail: 'expected the reservation-cleanup helper to check targetRelease.success explicitly — releaseFollowerConversionTargetReservation() returns {success: false, ...} on a token mismatch or unverified release rather than throwing, and a try/catch alone silently discards that outcome'
      });
    }

    // Check 44 (ROUND-3): releaseFollowerSlotReservation()'s structured
    // result must likewise be inspected during conversion cleanup, not
    // only caught if it happens to throw.
    if (!releaseHelperMatch || !/slotRelease\.success/.test(releaseHelperMatch[0])) {
      violations.push({
        check: '44: releaseFollowerSlotReservation()\'s structured result must be inspected in conversion cleanup',
        file: relPath,
        detail: 'expected the reservation-cleanup helper to check slotRelease.success explicitly — releaseFollowerSlotReservation() returns {success: false, ...} on a token mismatch or unverified release rather than throwing, and a try/catch alone silently discards that outcome'
      });
    }

    // Check 45 (ROUND-3): a successful conversion whose reservation
    // cleanup fails must NOT be reported as an ordinary clean success —
    // the success path (after the `if (!transaction.ok)` block, before
    // the final `return targetActor`) must inspect the cleanup result
    // and throw a distinct error when cleanup did not succeed.
    const successPathMatch = convertBody.match(/\n    \}\n\n([\s\S]*?)return targetActor;/);
    if (!successPathMatch || !/cleanupResult\.success/.test(successPathMatch[1]) || !/throw\s+cleanupError/.test(successPathMatch[1])) {
      violations.push({
        check: '45: a successful conversion must not swallow a reservation-cleanup failure',
        file: relPath,
        detail: 'expected the success path (after the failed-transaction branch, before `return targetActor`) to inspect the cleanup result\'s .success and throw a distinct cleanup-failure error when it is false — the mechanical conversion is already committed, so this does not roll it back, but the caller must be told cleanup failed rather than receiving an ordinary silent success'
      });
    }

    // Check 46 (ROUND-3): rollback logging must not unconditionally claim
    // a clean rollback — it must consult transaction.rollbackFailed (and
    // the cleanup result) before choosing its wording/severity.
    if (!transactionFailureBranchMatch || !/rollbackFailed/.test(transactionFailureBranchMatch[0])) {
      violations.push({
        check: '46: rollback logging must check transaction.rollbackFailed before claiming success',
        file: relPath,
        detail: 'expected the `if (!transaction.ok)` failure branch to reference transaction.rollbackFailed when deciding its log wording/severity — logging "rolled back" unconditionally would misreport an incomplete rollback (rollbackFailed: true, or a reservation-cleanup failure) as a clean one'
      });
    }
  }

  const FOLLOWER_SLOT_SERVICE_FILE = path.join(ROOT, 'scripts/engine/crew/follower-slot-service.js');
  if (fs.existsSync(FOLLOWER_SLOT_SERVICE_FILE)) {
    scanned.push(FOLLOWER_SLOT_SERVICE_FILE);
    const rawSlotServiceSource = read(FOLLOWER_SLOT_SERVICE_FILE);
    const slotServiceSource = stripCommentsAndStrings(rawSlotServiceSource);
    const relSlotServicePath = path.relative(ROOT, FOLLOWER_SLOT_SERVICE_FILE);

    // Check 41: releaseFollowerSlotReservation must be TOKEN-CONDITIONAL —
    // it must compare the live reservation's token against the caller's
    // token and reject a mismatch, never clear a reservation unconditionally.
    const releaseMethodMatch = slotServiceSource.match(/static\s+async\s+releaseFollowerSlotReservation\s*\([\s\S]*?\n  \}/);
    if (!releaseMethodMatch || !/reservation\.token\s*!==\s*token/.test(releaseMethodMatch[0])) {
      violations.push({
        check: '41: releaseFollowerSlotReservation must be token-conditional',
        file: relSlotServicePath,
        detail: 'expected releaseFollowerSlotReservation to compare reservation.token !== token and reject a mismatch — a losing request must never clear the winning request\'s reservation'
      });
    }

    // Check 42: reserveFollowerSlot must reread the owner AFTER writing the
    // reservation and verify the token survived — a last-write-wins race
    // is not safely acquired until this post-write reread confirms it.
    const reserveMethodMatch = slotServiceSource.match(/static\s+async\s+reserveFollowerSlot\s*\([\s\S]*?\n  \}/);
    if (!reserveMethodMatch || !/rereadOwner|rereadReservation/.test(reserveMethodMatch[0])) {
      violations.push({
        check: '42: reserveFollowerSlot must reread and verify its token after writing',
        file: relSlotServicePath,
        detail: 'expected reserveFollowerSlot to reread the owner Actor after the reservation write and confirm the slot still carries the caller\'s token before reporting success'
      });
    }
  }

  console.log('='.repeat(72));
  console.log('  GM EXISTING NPC ASSIGNMENT AUTHORITY GUARD');
  console.log('='.repeat(72));
  console.log(`\nScanned ${scanned.length} file(s) against 46 checks.\n`);

  if (violations.length === 0) {
    console.log('No violations found — existing-NPC assignment remains governed, GM-only, and correctly separates relationship-only assignment from mechanical conversion.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`Found ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  [${violation.check}]`);
    console.log(`    ${violation.file}`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();
