/* ========================================================================== */
/* RECURSIVE PARTIAL REGISTRATION (V13 SAFE)                                */
/* Registers ALL partials using full template path as key                    */
/* ========================================================================== */

export async function registerSWSEPartials() {
  const basePath = "systems/foundryvtt-swse/templates";

  // Recursively collect all partial paths
  async function collectPartials(path) {
    const response = await fetch(path);
    const text = await response.text();

    // This assumes directory listing is enabled in dev environment.
    // If not, you will need to maintain a manifest list instead.
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const links = [...doc.querySelectorAll("a")]
      .map(a => a.getAttribute("href"))
      .filter(Boolean);

    const partials = [];

    for (const link of links) {
      if (link.endsWith("/")) {
        // recurse into subdirectory
        const subPath = path + "/" + link.replace("/", "");
        const subPartials = await collectPartials(subPath);
        partials.push(...subPartials);
      } else if (link.endsWith(".hbs") && path.includes("/partials")) {
        partials.push(path + "/" + link);
      }
    }

    return partials;
  }

  try {
    const partialPaths = await collectPartials(basePath);

    for (const partialPath of partialPaths) {
      const template = await fetch(partialPath).then(r => r.text());
      Handlebars.registerPartial(partialPath, template);
    }

    console.log(`SWSE | Registered ${partialPaths.length} partials (recursive)`);
  } catch (err) {
    console.error("SWSE | Partial registration failed:", err);
  }
}
