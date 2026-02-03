/**
 * Discover and log all AcroForm field names from the fillable PDF template.
 *
 * Usage (from system directory):
 * node scripts/export/discover-pdf-fields.js
 *
 * This outputs a JSON list of all field names and types,
 * which can then be used to populate PDF_FIELD_MAP.
 */
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

const PDF_TEMPLATE_PATH = "./assets/pdf/swse-character-sheet-fillable.pdf";

async function discoverFields() {
  console.log("🔍 Discovering PDF fields...\n");

  if (!fs.existsSync(PDF_TEMPLATE_PATH)) {
    console.error(
      `❌ PDF not found at ${PDF_TEMPLATE_PATH}\n` +
        "Make sure the fillable PDF exists at: assets/pdf/swse-character-sheet-fillable.pdf"
    );
    process.exit(1);
  }

  const pdfBytes = fs.readFileSync(PDF_TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields = form.getFields().map((field) => ({
    name: field.getName(),
    type: field.constructor.name,
    defaultValue: tryGetValue(field)
  }));

  console.log(`Found ${fields.length} fields:\n`);
  console.table(fields);

  // Output as JSON for easy reference
  const json = JSON.stringify(fields, null, 2);
  const outputPath = "./scripts/export/pdf-fields-discovered.json";
  fs.writeFileSync(outputPath, json);
  console.log(`\n✅ Fields saved to: ${outputPath}`);

  // Suggest mapping template
  console.log("\n📋 Suggested PDF_FIELD_MAP entries:\n");
  for (const field of fields) {
    console.log(`  // ${field.type}`);
    console.log(`  "${camelCase(field.name)}": "${field.name}",`);
  }
}

function tryGetValue(field) {
  try {
    return field.getValue?.() ?? field.getDefaultValue?.() ?? null;
  } catch {
    return null;
  }
}

function camelCase(str) {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
}

discoverFields().catch(console.error);
