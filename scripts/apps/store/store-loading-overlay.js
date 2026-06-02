/**
 * @deprecated Legacy green full-window store loading overlay.
 *
 * The shell-native Rendarr splash is the only supported store entry screen.
 * This compatibility shim intentionally does not create DOM so old imports do
 * not resurrect the second splash or block the store surface.
 */
export class StoreLoadingOverlay {
  constructor(_options = {}) {
    this.skipOverlay = true;
    this.isHidden = true;
  }
  advancePhase() {}
  updateStatus() {}
  complete() {}
  hide() {}
  destroy() {}
}
