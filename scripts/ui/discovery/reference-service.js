/**
 * Datapad Reference Service
 *
 * Lightweight service for resolving glossary entries to journal-backed reference entries.
 *
 * Architecture:
 * - Glossary entry has optional referenceId field
 * - referenceId points to a journal page ID
 * - Service looks up journal entry and opens it cleanly
 * - Gracefully handles missing references (no link shown)
 *
 * Usage:
 * - Check if glossary entry has reference: ReferenceService.hasReference(glossaryKey)
 * - Open reference: await ReferenceService.openReference(glossaryKey)
 * - Get reference metadata: ReferenceService.getReferenceMetadata(glossaryKey)
 */

import { TooltipGlossary } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js';

export class ReferenceService {
  /**
   * Check if a glossary entry has an optional reference mapped
   * @param {string} glossaryKey - Glossary entry key (e.g., 'HitPoints')
   * @returns {boolean} True if entry has reference mapping
   */
  static hasReference(glossaryKey) {
    const entry = TooltipGlossary[glossaryKey];
    if (!entry) return false;
    return entry.hasReference === true && !!entry.referenceId;
  }

  /**
   * Get reference metadata for a glossary entry
   * @param {string} glossaryKey - Glossary entry key
   * @returns {Object} Reference metadata { hasReference, referenceId, label } or null
   */
  static getReferenceMetadata(glossaryKey) {
    const entry = TooltipGlossary[glossaryKey];
    if (!entry || !this.hasReference(glossaryKey)) return null;

    return {
      hasReference: true,
      referenceId: entry.referenceId,
      label: entry.label,
      glossaryKey: glossaryKey
    };
  }

  /**
   * Open a reference entry
   * Looks up the journal entry and opens it
   * Gracefully fails if reference doesn't exist
   *
   * @param {string} glossaryKey - Glossary entry key (e.g., 'HitPoints')
   * @returns {Promise<void>}
   */
  static async openReference(glossaryKey) {
    if (!this.hasReference(glossaryKey)) {
      console.warn(
        `[ReferenceService] No reference mapped for glossary key "${glossaryKey}"`
      );
      return;
    }

    const metadata = this.getReferenceMetadata(glossaryKey);
    if (!metadata) return;

    const { referenceId, label } = metadata;

    try {
      // Look up the journal entry
      const journalEntry = game.journal.get(referenceId);

      if (!journalEntry) {
        console.warn(
          `[ReferenceService] Reference entry not found: ${referenceId} (for "${label}")`
        );
        return;
      }

      // Open the journal entry
      // In Foundry v13+, use the native sheet opening
      await journalEntry.sheet.render(true);

      console.log(`[ReferenceService] Opened reference: ${label} (${referenceId})`);
    } catch (error) {
      console.error(
        `[ReferenceService] Error opening reference "${label}":`,
        error
      );
    }
  }

  /**
   * Get all glossary entries that have references mapped
   * Useful for auditing and discovery
   *
   * @returns {Array} Array of { glossaryKey, label, referenceId }
   */
  static getMappedReferences() {
    return Object.entries(TooltipGlossary)
      .filter(([key, entry]) => entry.hasReference === true && entry.referenceId)
      .map(([key, entry]) => ({
        glossaryKey: key,
        label: entry.label,
        referenceId: entry.referenceId
      }));
  }

  /**
   * Audit mapped references against available journal entries
   * Returns which references exist and which are missing
   *
   * @returns {Object} { found: Array, missing: Array }
   */
  static auditReferences() {
    const mapped = this.getMappedReferences();

    const audit = {
      found: [],
      missing: []
    };

    mapped.forEach(({ glossaryKey, label, referenceId }) => {
      const journalEntry = game.journal.get(referenceId);
      if (journalEntry) {
        audit.found.push({
          glossaryKey,
          label,
          referenceId,
          journalTitle: journalEntry.name
        });
      } else {
        audit.missing.push({
          glossaryKey,
          label,
          referenceId
        });
      }
    });

    return audit;
  }

  /**
   * Developer utility: Log audit results to console
   */
  static printAudit() {
    const audit = this.auditReferences();

    console.group('📖 Datapad Reference Audit');

    console.log(`✅ Found: ${audit.found.length}`);
    console.table(audit.found);

    if (audit.missing.length > 0) {
      console.warn(`⚠️ Missing: ${audit.missing.length}`);
      console.table(audit.missing);
    } else {
      console.log('✅ All mapped references exist');
    }

    console.groupEnd();
  }
}

export default ReferenceService;
