/* ============================================================================
   BASE APP V2 — ENFORCES VIEW MODEL PATTERN
   All V2 apps must:
   1. Extend this class
   2. Implement buildViewModel()
   3. Pass ONLY vm to templates (never actor.system)
   ============================================================================ */

export class BaseAppV2 extends Application {
  async getData(options = {}) {
    const vm = await this.buildViewModel();
    return { vm };
  }

  async buildViewModel() {
    throw new Error('buildViewModel() must be implemented by subclass');
  }
}
