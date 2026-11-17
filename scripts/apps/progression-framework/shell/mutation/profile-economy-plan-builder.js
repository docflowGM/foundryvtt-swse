/**
 * Galactic Profile economy contribution to the ONE chargen MutationPlan.
 *
 * Pure and side-effect free (item data is loaded through an injected loader). It returns plan fragments only; the
 * finalizer merges them and ActorEngine applies them transactionally at final confirmation. Nothing here spends,
 * credits, or writes an actor.
 *
 * Contract (`draftSelections.profileApplication.economy`):
 *   walletMode     'exactFinalBalance'  — the authored balance is the final balance, every grant included
 *   walletCredits  integer >= 0         — 0 is a legitimate resolved balance
 *   walletResolved true                 — absent/false means UNRESOLVED (never treated as zero)
 *   equipment      [{ itemId, pack, qty, name, provenance }]
 *
 * Fail closed: an item that cannot be loaded aborts compilation (the dry run fails before any mutation).
 */

export function hasResolvedProfileWallet(economy) {
  return !!economy && economy.walletResolved === true && economy.walletMode === 'exactFinalBalance'
    && Number.isInteger(economy.walletCredits) && economy.walletCredits >= 0;
}

/** The exact final credit balance, or null when the profile does not define one. */
export function profileWalletCredits(economy) {
  return hasResolvedProfileWallet(economy) ? economy.walletCredits : null;
}

const norm = v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** True when the profile kit itself provides a lightsaber, so the class starter-lightsaber rule must not add a second. */
export function profileKitProvidesLightsaber(economy) {
  return (economy?.equipment || []).some(e => norm(e.itemId).includes('lightsaber') || norm(e.name).includes('lightsaber'));
}

/**
 * @param {object} p
 * @param {object} p.economy                  profileApplication.economy
 * @param {string} p.sessionId
 * @param {(entry:object)=>Promise<object|null>} p.loadItemData   returns a plain item object or null
 * @returns {Promise<object[]>} item specs for `plan.add.items`
 */
export async function compileProfileEquipmentItems({ economy, sessionId = 'unknown', loadItemData }) {
  const specs = [];
  for (const [index, entry] of (economy?.equipment || []).entries()) {
    const data = await loadItemData(entry);
    if (!data) throw new Error(`Galactic Profile equipment "${entry.name}" (${entry.itemId}) could not be loaded; finalization aborted before any mutation`);
    const spec = JSON.parse(JSON.stringify(data));
    delete spec._id;
    spec.system = { ...(spec.system || {}), quantity: entry.qty };
    spec.flags = {
      ...(spec.flags || {}),
      swse: {
        ...((spec.flags || {}).swse || {}),
        progression: {
          ...(((spec.flags || {}).swse || {}).progression || {}),
          sourceSession: sessionId,
          selectionKey: 'galactic-profile-equipment',
          selectionId: entry.itemId,
          countIndex: index
        }
      }
    };
    specs.push(spec);
  }
  return specs;
}
