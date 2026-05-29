import { ShellMutationGuard } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js';
import { ShellUiStatePreserver } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js';

/**
 * Request a shell repaint through the coordinated shell render path.
 *
 * Surface controllers should call this helper instead of render(false). It
 * captures browser UI state before repaint, routes through the host scheduler
 * when available, and tags the render with a reason for diagnostics.
 */
export function requestShellRender(host, {
  reason = 'shell-surface-render',
  surfaceId = host?.shellSurface ?? host?._shellSurface ?? host?.currentPage,
  preserveUi = true
} = {}) {
  if (!host) return undefined;

  if (preserveUi) {
    const preserver = ShellUiStatePreserver.forHost(host) ?? host._shellUiStatePreserver ?? null;
    preserver?.capture?.(host.element, { surfaceId, reason: `${reason}:before-render` });
  }

  if (typeof host.requestSurfaceRender === 'function') {
    return host.requestSurfaceRender({ reason, surfaceId, preserveUi });
  }
  if (typeof host.render === 'function') {
    return ShellMutationGuard.withSurfaceRender(host, () => host.render(false), { reason, surfaceId });
  }
  return undefined;
}
