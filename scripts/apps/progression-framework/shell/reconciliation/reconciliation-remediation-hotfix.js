import { ProgressionReconciliationReportBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-reconciliation-report-builder.js';

const PATCH_ID = 'reconciliation-remediation-hotfix-v1';

function registerReconcilerRemediationPatch() {
  const proto = ProgressionReconciliationReportBuilder?.prototype;
  if (!proto || proto.__swseRemediationActionsPatch === PATCH_ID) return;

  if (typeof proto._attachRemediationActions !== 'function') {
    proto._attachRemediationActions = function attachRemediationActions(slots = {}) {
      for (const value of Object.values(slots || {})) {
        if (Array.isArray(value)) {
          for (const slot of value) this._attachSlotRemediation?.(slot);
        }
      }
    };
  }

  proto.__swseRemediationActionsPatch = PATCH_ID;
}

export function registerReconciliationRemediationHotfix() {
  registerReconcilerRemediationPatch();
}

registerReconciliationRemediationHotfix();

export default registerReconciliationRemediationHotfix;
