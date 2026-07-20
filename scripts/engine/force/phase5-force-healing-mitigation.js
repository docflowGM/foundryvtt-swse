import { applyVitalTransfer } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-outcome-service.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const VITAL_TRANSFER_RESOLUTION = Object.freeze({
  version: 1,
  behavior: { primary: 'healing', secondary: ['damage', 'condition'] },
  check: { mode: 'fixed-dc', skill: 'useTheForce', baseDC: 15, defense: null, opposedBy: null, marginStep: null, take10Allowed: true },
  targeting: { mode: 'creature', range: 'touch', shape: 'single', size: null, origin: 'caster', lineOfSight: true, affectsSelf: false },
  outcomes: {
    tiers: [
      { minimum: 15, maximum: 19, label: 'Heal 2 × target level', outcomes: [{ kind: 'healing', amount: '2 * target.level' }] },
      { minimum: 20, maximum: 24, label: 'Heal 3 × target level', outcomes: [{ kind: 'healing', amount: '3 * target.level' }] },
      { minimum: 25, maximum: null, label: 'Heal 4 × target level', outcomes: [{ kind: 'healing', amount: '4 * target.level' }] }
    ],
    onFailure: [], onMiss: []
  },
  duration: { type: 'instant', value: null, maintainable: false, maintenanceAction: null },
  resourceOptions: {
    forcePoint: [{ kind: 'special', notes: 'Prevent the caster HP cost.' }],
    destinyPoint: [{ kind: 'condition-track', amount: 5, notes: 'Move the target 5 steps toward normal.' }]
  },
  automation: { status: 'partial', handler: 'phase5.vital-transfer', reviewRequired: false },
  source: { book: 'Saga Edition Core Rulebook', page: 100, verified: true, notes: [] }
});

export function installPhase5ForceHealing(ForceExecutor) {
  if (!ForceExecutor || ForceExecutor.__phase5HealingInstalled) return;
  const original = ForceExecutor.executeForcePower.bind(ForceExecutor);

  ForceExecutor.executeForcePower = async function phase5ExecuteForcePower(actor, powerId, options = {}) {
    const power = actor?.items?.get?.(powerId);
    const isVitalTransfer = String(power?.name ?? '').trim().toLowerCase() === 'vital transfer';
    const target = options.target ?? options.targetActor ?? null;

    const result = await original(actor, powerId, options);
    if (!isVitalTransfer || !result?.success) return result;

    if (!target) {
      return {
        ...result,
        outcome: 'manual-adjudication',
        outcomePlan: {
          kind: 'manual-adjudication',
          power: power?.name ?? 'Vital Transfer',
          checkTotal: Number(result.roll) || 0,
          targetContext: options.targetContext ?? null,
          expectedTarget: 'one creature at touch range',
          reason: 'No actor target was selected. The Use the Force check is valid, but healing and caster cost were not applied automatically.',
          automation: 'manual',
          sourceVerified: true
        }
      };
    }

    try {
      const transaction = await applyVitalTransfer({
        caster: actor,
        target,
        checkTotal: result.roll,
        preventCasterCost: options.forcePointOption === true || options.preventVitalTransferCost === true,
        destinyPoint: options.destinyPointOption === true
      });

      return {
        ...result,
        outcome: 'healing',
        healing: transaction.actualHealing ?? 0,
        casterDamage: transaction.casterDamage ?? 0,
        conditionImprovement: transaction.conditionImprovement ?? 0,
        vitalTransfer: transaction
      };
    } catch (error) {
      SWSELogger.error('SWSE | Force Powers | Vital Transfer outcome failed', error);
      ui?.notifications?.error?.(`Vital Transfer failed: ${error.message}`);
      return { ...result, success: false, error: error.message };
    }
  };

  Object.defineProperty(ForceExecutor, '__phase5HealingInstalled', { value: true, configurable: false });
  SWSELogger.log('SWSE | Force Powers | Phase 5 healing integration installed');
}
