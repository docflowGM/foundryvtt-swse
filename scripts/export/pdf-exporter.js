/**
 * Main PDF export function.
 * Uses pdf-lib to fill a template PDF with exported actor data.
 */
import { PDFDocument } from 'pdf-lib';
import { buildExportModel } from './swse-export-model.js';
import { PDF_FIELD_MAP } from './pdf-field-map.js';
import { get } from '../utils/object-utils.js';

const PDF_TEMPLATE_PATH = 'systems/foundryvtt-swse/assets/pdf/swse-character-sheet-fillable.pdf';

/**
 * Export an actor to a fillable PDF.
 * Returns a Blob ready for download.
 */
export async function exportActorToPDF(actor) {
  if (!actor) {throw new Error('Actor required');}

  // 1. Build the semantic export model
  const exportModel = buildExportModel(actor);

  // 2. Load the PDF template
  const pdfBytes = await fetchPDFTemplate();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // 3. Fill form fields from export model
  fillFormFields(form, exportModel);

  // 4. Serialize and return
  const filledBytes = await pdfDoc.save();
  return new Blob([filledBytes], { type: 'application/pdf' });
}

/**
 * Fetch the PDF template from the system assets.
 */
async function fetchPDFTemplate() {
  const response = await fetch(PDF_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error(
      `Failed to load PDF template: ${response.status} ${response.statusText}`
    );
  }
  return response.arrayBuffer();
}

/**
 * Fill all mapped form fields from the export model.
 */
function fillFormFields(form, exportModel) {
  for (const [modelPath, pdfFieldName] of Object.entries(PDF_FIELD_MAP)) {
    try {
      const value = get(exportModel, modelPath);
      const field = form.getTextField(pdfFieldName);

      if (field) {
        const strValue = formatFieldValue(modelPath, value);
        field.setText(strValue);
      }
    } catch (error) {
      console.warn(
        `Could not fill field ${pdfFieldName} (${modelPath}):`,
        error.message
      );
    }
  }

  // Handle list fields (feats, talents, languages, equipment, forcePowers)
  const listFields = {
    feats: exportModel.feats,
    talents: exportModel.talents,
    forcePowers: exportModel.forcePowers,
    equipment: exportModel.equipment,
    languages: exportModel.languages
  };

  for (const [listKey, items] of Object.entries(listFields)) {
    if (PDF_FIELD_MAP[listKey]) {
      const pdfFieldName = PDF_FIELD_MAP[listKey];
      const field = form.getTextField(pdfFieldName);
      if (field && items) {
        let text = '';
        if (Array.isArray(items)) {
          // For equipment, join with weight; for others, simple join
          if (listKey === 'equipment') {
            text = items.map((e) => `${e.name} (${e.weight} lbs)`).join('\n');
          } else {
            text = items.join('\n');
          }
        }
        field.setText(text);
      }
    }
  }
}

/**
 * Format a value for PDF field insertion.
 * Converts booleans to checkmarks, handles arrays, etc.
 */
function formatFieldValue(modelPath, value) {
  if (value === null || value === undefined) {return '';}
  if (typeof value === 'boolean') {return value ? '✓' : '';}
  if (typeof value === 'object') {return String(Object.toString(value));}
  return String(value);
}

/**
 * Trigger a browser download of the PDF.
 * Call this after exportActorToPDF returns a Blob.
 */
export function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'character.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Full export workflow: export actor to PDF and trigger download.
 */
export async function exportAndDownloadPDF(actor) {
  const filename = `${actor.name || 'character'}.pdf`;
  const blob = await exportActorToPDF(actor);
  downloadPDF(blob, filename);
}
