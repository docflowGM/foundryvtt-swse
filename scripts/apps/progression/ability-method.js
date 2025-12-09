/**
 * scripts/apps/progression/ability-method.js
 * small helper to render and wire the attribute-method selection template into the chargen flow
 */
export class SWSEAbilityMethod {
  static async mount(containerSelector = '.swse-chargen') {
    const container = document.querySelector(containerSelector) ?? document.body;
    try {
      await loadTemplates(['templates/apps/progression/attribute-method.hbs']);
      const html = await renderTemplate('templates/apps/progression/attribute-method.hbs', { title: "Choose attribute method" });
      const wrapper = document.createElement('div');
      wrapper.className = 'swse-attribute-method-wrapper';
      wrapper.innerHTML = html;
      container.prepend(wrapper);

      wrapper.querySelectorAll('.btn-select').forEach(btn=>{
        btn.addEventListener('click', (ev)=>{
          const method = btn.dataset.method;
          Hooks.call('swse:attribute-method:selected', method);
        });
      });

    } catch(e) {
      console.warn("SWSE AbilityMethod mount failed:", e);
    }
  }
}
