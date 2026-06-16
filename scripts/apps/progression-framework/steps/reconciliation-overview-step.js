/**
 * ReconciliationOverviewStep
 *
 * Briefing-only first step for level-addressed progression recovery. It shows
 * the chronological debt queue before the normal progression picker steps run.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ProgressionReconciler } from '../shell/progression-reconciler.js';

export class ReconciliationOverviewStep extends ProgressionStepPlugin {
  async onStepEnter(shell) {
    shell._reconciliationReport = shell._reconciliationReport
      || ProgressionReconciler.reconcileActor(shell.actor, {
        output: 'report',
        mode: 'reconcile',
        source: 'reconciliation-overview-step',
      });
    shell._reconciliationTimeline = shell._reconciliationReport?.timeline || null;
    if (shell?.mentor) shell.mentor.askMentorEnabled = true;
  }

  async getStepData(context = {}) {
    const shell = context.shell || null;
    const report = shell?._reconciliationReport
      || ProgressionReconciler.reconcileActor(shell?.actor, {
        output: 'report',
        mode: 'reconcile',
        source: 'reconciliation-overview-step-data',
      });
    const timeline = report?.timeline || { levels: [], tasks: [], resolutionSteps: [] };
    if (shell) {
      shell._reconciliationReport = report;
      shell._reconciliationTimeline = timeline;
    }

    return {
      actorName: report?.actorName || shell?.actor?.name || 'Actor',
      totalLevel: Number(report?.totalLevel || 0) || 0,
      totalHeroicLevel: Number(report?.totalHeroicLevel || report?.totalLevel || 0) || 0,
      status: report?.status || 'ok',
      warnings: Array.isArray(report?.warnings) ? report.warnings : [],
      timeline,
      levels: Array.isArray(timeline?.levels) ? timeline.levels : [],
      tasks: Array.isArray(timeline?.tasks) ? timeline.tasks : [],
      resolutionSteps: Array.isArray(timeline?.resolutionSteps) ? timeline.resolutionSteps : [],
      hasResolutionSteps: Number(timeline?.choiceTaskCount || 0) > 0,
      choiceTaskCount: Number(timeline?.choiceTaskCount || 0) || 0,
      reviewTaskCount: Number(timeline?.reviewTaskCount || 0) || 0,
      classSummaries: Array.isArray(report?.classSummaries) ? report.classSummaries : [],
    };
  }

  getSelection() {
    return { selected: ['briefing-reviewed'], count: 1, isComplete: true };
  }

  validate() {
    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues() {
    return [];
  }

  getWarnings(shell = null) {
    const timeline = shell?._reconciliationTimeline || shell?._reconciliationReport?.timeline || null;
    if (timeline && Number(timeline.choiceTaskCount || 0) <= 0 && Number(timeline.reviewTaskCount || 0) > 0) {
      return ['Only review tasks remain. No picker steps are required.'];
    }
    return [];
  }

  getRemainingPicks() {
    return [];
  }

  getMentorContext() {
    return 'This is a progression recovery briefing. Explain the missing levels in order, then walk the player through each recovery step chronologically so prerequisites are evaluated at the correct point in the character history.';
  }

  getMentorMode() {
    return 'context-only';
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/reconciliation-overview-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(_focusedItem, shell) {
    const timeline = shell?._reconciliationTimeline || shell?._reconciliationReport?.timeline || null;
    const choiceCount = Number(timeline?.choiceTaskCount || 0) || 0;
    const reviewCount = Number(timeline?.reviewTaskCount || 0) || 0;
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        title: 'Progression Recovery',
        body: choiceCount > 0
          ? `The engine will now resolve ${choiceCount} missing choice ${choiceCount === 1 ? 'step' : 'steps'} in historical level order. Earlier choices may unlock later choices.`
          : `No choice steps are required. ${reviewCount} review ${reviewCount === 1 ? 'item remains' : 'items remain'} on the character sheet audit.`,
      },
    };
  }

  getFooterConfig() {
    return {
      mode: 'reconciliation-overview',
      statusText: 'Recovery briefing ready',
      isComplete: true,
    };
  }
}

export default ReconciliationOverviewStep;
