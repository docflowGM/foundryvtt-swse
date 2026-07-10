/**
 * Finalization Prerequisite Validator
 *
 * Batch A / R1 — closes the "finalization prerequisite drift" gap surfaced by the
 * Progression Runtime Integrity Audit (docs/audits/progression-runtime-integrity-audit.md).
 *
 * WHY
 * ---
 * Progression steps gate selections at COMMIT time (feat/talent/Force steps compute
 * `isAvailable` via `AbilityEngine.evaluateAcquisition`). Nothing re-verified those
 * choices at FINALIZATION. A player who backtracks and lowers an ability, drops a
 * prerequisite feat, or otherwise mutates the draft after committing a dependent
 * pick could materialize a now-illegal item. This validator treats the UI's step
 * choices as untrusted and re-evaluates them against the final canonical
 * `progressionSession.draftSelections` right before mutation.
 *
 * DESIGN CONTRACT
 * ---------------
 * - Read-only. It never mutates the actor, session, or any document.
 * - Reuses the SAME legality seam the steps use at commit time
 *   (`AbilityEngine.evaluateAcquisition(actor, candidate, pending)`), with a `pending`
 *   object built the same way (`buildClassGrantLedger` → `mergeLedgerIntoPending`).
 *   This keeps parity with commit-time evaluation so a build that was legal at commit
 *   stays legal here unless the draft actually drifted.
 * - Fail-closed on PROVEN illegality only. A definitive `legal === false` with a
 *   concrete missing prerequisite blocks finalization. Anything uncertain — an
 *   unresolved content document, an evaluator exception, an advisory/table-state
 *   ("unresolved") prerequisite — becomes a non-blocking warning. Closing the gate on
 *   uncertainty would let an engine/content bug brick every finalization, which is a
 *   worse failure mode than the drift this guards against.
 * - Automatic/auto-granted items (class auto-features, locked class grants, multiclass
 *   starting-feat auto-grants) are skipped: they are not subject to player prerequisites.
 *   Player picks made from a class slot ARE still checked.
 *
 * The droid forbidden-selection guard and required-count checks remain in
 * ProgressionFinalizer; this validator is additive and complements them.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { MedicalSecretRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/medical/medical-secret-registry.js';
import {
  buildClassGrantLedger,
  mergeLedgerIntoPending,
} from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { hasPrerequisites as classHasPrerequisites } from '/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js';

/**
 * Item domains that carry player-facing prerequisites and must be re-checked.
 * `evalType` is the type hint passed to evaluateAcquisition (which routes to the
 * matching PrerequisiteChecker method); `docGetter` resolves the full content
 * document so prerequisite text/fields are available to the checker.
 */
const PREREQ_DOMAINS = [
  { key: 'feats', evalType: 'feat', label: 'Feat', docGetter: (e) => ProgressionContentAuthority.getFeatDocument(e) },
  { key: 'talents', evalType: 'talent', label: 'Talent', docGetter: (e) => ProgressionContentAuthority.getTalentDocument(e) },
  { key: 'forcePowers', evalType: 'force-power', label: 'Force power', docGetter: (e) => ProgressionContentAuthority.getForceDocument(e, 'power') },
  { key: 'forceTechniques', evalType: 'force-technique', label: 'Force technique', docGetter: (e) => ProgressionContentAuthority.getForceDocument(e, 'technique') },
  { key: 'forceSecrets', evalType: 'force-secret', label: 'Force secret', docGetter: (e) => ProgressionContentAuthority.getForceDocument(e, 'secret') },
  { key: 'forceRegimens', evalType: 'force-power', label: 'Force regimen', docGetter: (e) => ProgressionContentAuthority.getForceDocument(e, 'regimen') },
  { key: 'medicalSecrets', evalType: 'feat', label: 'Medical secret', docGetter: async (e) => { await MedicalSecretRegistry.ensureInitialized?.(); return MedicalSecretRegistry.getDocumentByRef(e); } },
  { key: 'starshipManeuvers', evalType: 'feat', label: 'Starship maneuver', docGetter: (e) => ProgressionContentAuthority.getForceDocument(e, 'maneuver') },
];

function entryName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return String(entry.name || entry.label || entry.id || entry._id || '').trim();
}

function readSystem(entry) {
  if (!entry || typeof entry !== 'object') return {};
  return entry.system || entry;
}

/**
 * Auto-granted items are not subject to player prerequisites — skip them. This
 * intentionally does NOT skip ordinary player picks made from a class feat/talent
 * slot (those still need their prerequisites), only the automatic grants.
 */
function isAutoGranted(entry) {
  const sys = readSystem(entry);
  if (entry?.autoGranted === true || sys.autoGranted === true) return true;
  if (entry?.multiclassStartingFeat === true || sys.multiclassStartingFeat === true) return true;
  const grantedByClass = entry?.grantedByClass === true || sys.grantedByClass === true;
  const locked = sys.locked === true || entry?.locked === true;
  if (grantedByClass && locked) return true;
  return false;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function humanReasons(list) {
  const seen = new Set();
  const out = [];
  for (const raw of asArray(list)) {
    const text = String(raw ?? '').trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
  }
  return out;
}

/**
 * Build the commit-time-equivalent `pending` object from canonical draft selections.
 * Mirrors feat-step._buildPendingAbilityData so evaluation sees pending class grants,
 * selected feats/talents/skills, and species context.
 */
function buildPendingFromSession(actor, progressionSession) {
  const characterData = typeof progressionSession?.toCharacterData === 'function'
    ? progressionSession.toCharacterData()
    : {};
  const draft = progressionSession?.draftSelections || {};
  const selectedClass = characterData.classes?.[0] || draft.class || null;

  const trainedSkills = Array.isArray(characterData.skills?.trained)
    ? characterData.skills.trained
    : Array.isArray(draft.skills?.trained) ? draft.skills.trained : [];
  const selectedSkills = trainedSkills
    .map((key) => (typeof key === 'string' ? { key } : (key?.key ? { key: key.key } : null)))
    .filter(Boolean);

  const basePending = {
    selectedClass,
    selectedFeats: characterData.feats || draft.feats || [],
    selectedTalents: characterData.talents || draft.talents || [],
    selectedSkills,
    skillRanks: {},
    grantedFeats: [],
    pendingSpeciesContext: draft.pendingSpeciesContext || null,
  };

  if (selectedClass && actor) {
    try {
      const ledger = buildClassGrantLedger(actor, selectedClass, basePending);
      return mergeLedgerIntoPending(basePending, ledger);
    } catch (err) {
      swseLogger.debug('[FinalizationPrereqValidator] class grant ledger unavailable (non-critical)', {
        error: err?.message,
      });
    }
  }
  return basePending;
}

/**
 * Resolve a selection entry to a candidate object carrying prerequisite fields.
 * Falls back to a minimal candidate when the content document cannot be resolved.
 * Returns `{ candidate, resolved }`; `resolved:false` means we could not load the
 * document and must NOT hard-fail on it.
 */
async function resolveCandidate(domain, entry) {
  const name = entryName(entry);
  try {
    const doc = await domain.docGetter(entry);
    const data = doc?.toObject ? doc.toObject() : (doc && typeof doc === 'object' ? doc : null);
    if (data) {
      return {
        candidate: {
          ...data,
          name: data.name || name,
          type: domain.evalType,
        },
        resolved: true,
      };
    }
  } catch (err) {
    swseLogger.debug('[FinalizationPrereqValidator] candidate resolution failed (treated as advisory)', {
      domain: domain.key,
      name,
      error: err?.message,
    });
  }
  // Minimal fallback candidate: carry any prerequisite fields the raw entry has.
  const sys = readSystem(entry);
  return {
    candidate: {
      name,
      type: domain.evalType,
      system: {
        prerequisites: sys.prerequisites ?? sys.prerequisite ?? undefined,
        prerequisite: sys.prerequisite ?? undefined,
      },
    },
    resolved: false,
  };
}

/**
 * Evaluate a single class/prestige-class selection.
 */
function evaluateClassSelection(actor, classSelection, pending, details) {
  const name = entryName(classSelection);
  if (!name) return null;
  // Base classes carry no prerequisites in SWSE — only prestige classes do. Gating
  // on the prestige prerequisite table avoids any chance of spuriously blocking a
  // base-class chargen/level-up and scopes this check to where drift can occur.
  const isPrestige = classSelection?.prestigeClass === true
    || classSelection?.system?.prestigeClass === true
    || classSelection?.baseClass === false;
  let hasPrereqTable = false;
  try { hasPrereqTable = classHasPrerequisites(name) === true; } catch { hasPrereqTable = false; }
  if (!isPrestige && !hasPrereqTable) return null;
  try {
    const assessment = AbilityEngine.evaluateAcquisition(actor, { name, type: 'class' }, pending) || {};
    const missing = humanReasons(assessment.missing || assessment.missingPrereqs);
    const unresolved = humanReasons(assessment.unresolved);
    details.push({ domain: 'class', name, legal: assessment.legal === true, missing, unresolved });
    if (assessment.legal === false && missing.length) {
      return {
        error: `Progression finalization blocked: "${name}" is no longer legal. Missing prerequisite: ${missing.join('; ')}.`,
      };
    }
    if (unresolved.length) {
      return { warning: `"${name}" has unverified prerequisites: ${unresolved.join('; ')}.` };
    }
  } catch (err) {
    swseLogger.debug('[FinalizationPrereqValidator] class evaluation threw (advisory)', { name, error: err?.message });
    return { warning: `Could not verify prerequisites for class "${name}" (${err?.message || 'evaluation error'}).` };
  }
  return null;
}

/**
 * Re-validate all player-selected progression choices against the final canonical
 * session state, right before the finalizer applies its mutation plan.
 *
 * @param {Object} params
 * @param {Actor}  params.actor
 * @param {Object} params.progressionSession - canonical ProgressionSession
 * @param {string} [params.mode]
 * @param {Map|Object} [params.selections] - optional pre-built selections (finalizer map); draftSelections used otherwise
 * @param {Object} [params.manifest] - optional level-up entitlement manifest (reserved for future rules)
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], details: object[] }>}
 */
export async function validateFinalProgressionPrerequisites({
  actor,
  progressionSession,
  mode = 'chargen',
  selections = null,
  manifest = null,
} = {}) {
  const errors = [];
  const warnings = [];
  const details = [];

  if (!actor || !progressionSession) {
    // Nothing we can safely check — do not block on missing context.
    return { ok: true, errors, warnings, details };
  }

  const draft = progressionSession.draftSelections || {};
  const getDomainEntries = (key) => {
    if (selections) {
      const val = selections instanceof Map ? selections.get(key) : selections[key];
      if (val !== undefined && val !== null) return asArray(val);
    }
    return asArray(draft[key]);
  };

  let pending;
  try {
    pending = buildPendingFromSession(actor, progressionSession);
  } catch (err) {
    // If we cannot build the pending context we cannot evaluate reliably; warn, do not block.
    swseLogger.warn('[FinalizationPrereqValidator] pending context build failed; skipping prereq re-check', {
      error: err?.message,
    });
    warnings.push('Prerequisite re-check skipped: could not build evaluation context.');
    return { ok: true, errors, warnings, details };
  }

  // Class / prestige-class prerequisites.
  const classSelection = draft.class || (selections instanceof Map ? selections.get('class') : selections?.class) || null;
  if (classSelection) {
    const classResult = evaluateClassSelection(actor, classSelection, pending, details);
    if (classResult?.error) errors.push(classResult.error);
    if (classResult?.warning) warnings.push(classResult.warning);
  }

  // Item-domain prerequisites (feats, talents, Force domains, medical secrets, maneuvers).
  for (const domain of PREREQ_DOMAINS) {
    for (const entry of getDomainEntries(domain.key)) {
      if (!entry) continue;
      if (isAutoGranted(entry)) continue;
      const name = entryName(entry);
      if (!name) continue;

      const { candidate, resolved } = await resolveCandidate(domain, entry);
      try {
        const assessment = AbilityEngine.evaluateAcquisition(actor, candidate, pending) || {};
        const missing = humanReasons(assessment.missing || assessment.missingPrereqs);
        const unresolved = humanReasons(assessment.unresolved);
        details.push({ domain: domain.key, name, legal: assessment.legal === true, resolved, missing, unresolved });

        if (assessment.legal === false && missing.length) {
          if (resolved) {
            // Proven illegal against resolved content — fail closed.
            errors.push(`Progression finalization blocked: "${name}" is no longer legal. Missing prerequisite: ${missing.join('; ')}.`);
          } else {
            // Could not resolve the document; a hard failure here may be a content gap.
            warnings.push(`${domain.label} "${name}" appears to miss a prerequisite (${missing.join('; ')}) but its content could not be resolved to confirm.`);
          }
        } else if (unresolved.length) {
          warnings.push(`${domain.label} "${name}" has unverified (advisory) prerequisites: ${unresolved.join('; ')}.`);
        }
      } catch (err) {
        swseLogger.debug('[FinalizationPrereqValidator] item evaluation threw (advisory)', {
          domain: domain.key, name, error: err?.message,
        });
        warnings.push(`Could not verify prerequisites for ${domain.label.toLowerCase()} "${name}" (${err?.message || 'evaluation error'}).`);
      }
    }
  }

  const ok = errors.length === 0;
  if (!ok) {
    swseLogger.warn('[FinalizationPrereqValidator] Finalization prerequisite re-check FAILED', {
      mode, errors, warningCount: warnings.length,
    });
  } else {
    swseLogger.debug('[FinalizationPrereqValidator] Finalization prerequisite re-check passed', {
      mode, checked: details.length, warnings: warnings.length,
    });
  }

  return { ok, errors, warnings, details };
}

export default { validateFinalProgressionPrerequisites };
