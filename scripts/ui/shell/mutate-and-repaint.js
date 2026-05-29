import { ShellMutationGuard } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { ShellUiStatePreserver } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js';

const MUTATION_QUEUES = new WeakMap();
const MUTATION_QUEUE_STATE = new WeakMap();

function getMutationTarget(host) {
  return host?.actor ?? host?.document ?? host ?? null;
}

function getSurfaceId(host, fallback = 'home') {
  return host?.shellSurface ?? host?._shellSurface ?? host?.currentPage ?? fallback;
}

function getQueueState(target) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return { depth: 0, pending: 0 };
  return MUTATION_QUEUE_STATE.get(target) ?? { depth: 0, pending: 0 };
}

function setQueueState(target, state) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return;
  if ((state?.depth ?? 0) <= 0 && (state?.pending ?? 0) <= 0) MUTATION_QUEUE_STATE.delete(target);
  else MUTATION_QUEUE_STATE.set(target, state);
}

function enqueueForHost(host, task) {
  const target = getMutationTarget(host);
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return Promise.resolve().then(task);

  const state = getQueueState(target);
  state.pending += 1;
  setQueueState(target, state);

  const prior = MUTATION_QUEUES.get(target) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(async () => {
    const runningState = getQueueState(target);
    runningState.pending = Math.max(0, runningState.pending - 1);
    runningState.depth += 1;
    setQueueState(target, runningState);
    try {
      return await task();
    } finally {
      const doneState = getQueueState(target);
      doneState.depth = Math.max(0, doneState.depth - 1);
      setQueueState(target, doneState);
    }
  });

  MUTATION_QUEUES.set(target, next.finally(() => {
    if (MUTATION_QUEUES.get(target) === next) MUTATION_QUEUES.delete(target);
  }));
  return next;
}

/**
 * Run a shell-originated document/settings mutation through the shared mutation
 * context and optionally repaint the host after the mutation settles.
 *
 * This helper serializes writes by actor/document when available, not just by
 * visible host. That prevents two open sheets for the same actor from racing
 * each other and repainting stale data over fresh data.
 */
export async function mutateAndRepaint(host, mutation, {
  reason = 'shell-mutation',
  surfaceId = getSurfaceId(host),
  render = true,
  afterMutation = null,
  preserveUi = true,
  clearDirty = false
} = {}) {
  if (typeof mutation !== 'function') return undefined;

  return enqueueForHost(host, async () => {
    const preserver = ShellUiStatePreserver.forHost(host) ?? host?._shellUiStatePreserver ?? null;
    if (preserveUi) preserver?.capture?.(host?.element, { surfaceId, reason: `${reason}:before-mutation` });

    const result = await ShellMutationGuard.withDocumentMutation(host, mutation, { reason, surfaceId });
    if (typeof afterMutation === 'function') await afterMutation(result);
    if (clearDirty) preserver?.clearDirty?.(surfaceId);
    if (render) await requestShellRender(host, { reason, surfaceId, preserveUi });
    return result;
  });
}

export async function mutateShellOnly(host, mutation, options = {}) {
  return mutateAndRepaint(host, mutation, { ...options, render: false });
}

export function getShellMutationQueueStatus(host) {
  const target = getMutationTarget(host);
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return { pending: 0, running: 0 };
  const state = getQueueState(target);
  return { pending: state.pending ?? 0, running: state.depth ?? 0 };
}
