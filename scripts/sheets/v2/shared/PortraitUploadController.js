/**
 * PortraitUploadController
 *
 * Shared portrait upload + auto-apply handler for v2 actor sheets
 * (character, droid, npc). Also reusable by any other app that
 * renders an editable actor portrait.
 *
 * Behavior:
 *   - Click the portrait → opens Foundry's native FilePicker (via
 *     the existing `data-edit="img"` attribute; core handles it).
 *   - Drag an image file onto the portrait → uploads it in the
 *     background and sets `actor.img` to the uploaded path.
 *   - Non-image drops, permission failures, and upload errors
 *     all fail loudly via ui.notifications but never throw.
 *
 * Targets any element the markup annotates with:
 *   - data-role="actor-portrait-dropzone"  (the drop surface)
 *   - data-role="actor-portrait-image"     (the <img> to visually mark on dragover)
 *
 * Falls back to `.portrait-image`'s parent container if no dropzone
 * is declared, so this can be mounted on older partials too.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
const LOG = "[SWSE Portrait Upload]";

const ACCEPTED_IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/i;
const ACCEPTED_IMAGE_EXT  = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

function getFilePicker() {
  return foundry?.applications?.apps?.FilePicker ?? globalThis.FilePicker;
}

function canEditActor(actor) {
  if (!actor) return false;
  if (typeof actor.isOwner === "boolean") return actor.isOwner;
  if (typeof actor.testUserPermission === "function") {
    return actor.testUserPermission(game?.user, "OWNER");
  }
  return false;
}

function canUserUpload() {
  try {
    return game?.user?.hasPermission?.("FILES_UPLOAD")
      ?? game?.user?.can?.("FILES_UPLOAD")
      ?? true;
  } catch {
    return true;
  }
}

function sanitizeFilename(name) {
  const cleaned = String(name ?? "portrait")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "portrait";
}

function resolveUploadFolder(actor) {
  const base = "worlds";
  const worldId = game?.world?.id ?? "world";
  const actorFolder = sanitizeFilename(actor?.id ?? "unknown");
  return `${base}/${worldId}/portraits/${actorFolder}`;
}

async function ensureFolder(source, path) {
  const FP = getFilePicker();
  if (!FP) return;
  try {
    await FP.browse(source, path);
  } catch {
    try {
      await FP.createDirectory(source, path, {});
    } catch (err) {
      // Parent missing — walk up and create each segment.
      const parts = path.split("/").filter(Boolean);
      let cursor = "";
      for (const part of parts) {
        cursor = cursor ? `${cursor}/${part}` : part;
        try {
          await FP.browse(source, cursor);
        } catch {
          try { await FP.createDirectory(source, cursor, {}); } catch { /* ignore */ }
        }
      }
    }
  }
}

function isImageFile(file) {
  if (!file) return false;
  if (file.type && ACCEPTED_IMAGE_MIME.test(file.type)) return true;
  if (file.name && ACCEPTED_IMAGE_EXT.test(file.name)) return true;
  return false;
}

function notify(kind, message) {
  try { ui?.notifications?.[kind]?.(message); } catch { /* ignore */ }
}

async function uploadPortraitFile(actor, file) {
  const FP = getFilePicker();
  if (!FP) {
    return { ok: false, error: "FilePicker unavailable" };
  }

  const source = "data";
  const folder = resolveUploadFolder(actor);

  await ensureFolder(source, folder);

  const safeName = sanitizeFilename(file.name || "portrait.png");
  const renamed = new File([file], safeName, { type: file.type });

  SWSELogger.debug(`${LOG} uploading`, { folder, name: safeName, size: file.size, type: file.type });

  try {
    const response = await FP.upload(source, folder, renamed, {}, { notify: false });
    const path = response?.path;
    if (!path) {
      console.warn(`${LOG} upload response missing path`, response);
      return { ok: false, error: "Upload response missing path" };
    }
    SWSELogger.debug(`${LOG} upload success`, path);
    return { ok: true, path };
  } catch (err) {
    console.error(`${LOG} upload failed`, err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}

async function applyPortrait(actor, imgPath) {
  try {
    await ActorEngine.updateActor(actor, { img: imgPath }, { source: 'portrait-upload' });
    SWSELogger.debug(`${LOG} actor.img applied`, imgPath);
    return true;
  } catch (err) {
    console.error(`${LOG} actor.update failed`, err);
    notify("error", "Failed to apply uploaded portrait to actor.");
    return false;
  }
}

async function openPortraitPicker(actor) {
  const FP = getFilePicker();
  if (!FP) {
    notify("error", "FilePicker unavailable.");
    return;
  }

  try {
    const picker = new FP({
      type: "image",
      callback: async (path) => {
        if (!path) return;
        const applied = await applyPortrait(actor, path);
        if (applied) notify("info", "Portrait updated.");
      }
    });
    picker.browse();
  } catch (err) {
    console.error(`${LOG} picker failed`, err);
    notify("error", "Failed to open portrait picker.");
  }
}

function findDropzones(root) {
  const marked = root.querySelectorAll('[data-role="actor-portrait-dropzone"]');
  if (marked.length) return Array.from(marked);

  // Fallbacks: portrait panels plus common header portrait containers on v2 sheets.
  const containers = root.querySelectorAll(
    ".portrait-container, .swse-panel--portrait, .portrait-panel, .sheet-header-left, .header-left"
  );
  return Array.from(containers);
}

function findImageEl(zone) {
  return zone.querySelector('[data-role="actor-portrait-image"]')
      ?? zone.querySelector(".portrait-image")
      ?? zone.querySelector("img.profile")
      ?? zone.querySelector("img");
}

function attachDropHandlers(zone, actor, signal) {
  const img = findImageEl(zone);

  const clickTarget = img ?? zone;
  if (clickTarget) {
    clickTarget.style.cursor = canEditActor(actor) ? "pointer" : clickTarget.style.cursor;
  }

  const setActive = (active) => {
    zone.classList.toggle("portrait-drop-active", !!active);
    if (img) img.classList.toggle("portrait-drop-active", !!active);
  };

  const onDragEnter = (ev) => {
    if (!ev.dataTransfer?.types?.includes("Files")) return;
    ev.preventDefault();
    setActive(true);
  };

  const onDragOver = (ev) => {
    if (!ev.dataTransfer?.types?.includes("Files")) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
    setActive(true);
  };

  const onDragLeave = (ev) => {
    // Only clear state when leaving the zone itself, not a child.
    if (ev.relatedTarget && zone.contains(ev.relatedTarget)) return;
    setActive(false);
  };

  const onDrop = async (ev) => {
    setActive(false);

    const files = Array.from(ev.dataTransfer?.files ?? []);
    if (!files.length) {
      // Likely a Foundry text/UUID drop — let other handlers deal with it.
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (!canEditActor(actor)) {
      notify("warn", "You do not have permission to edit this actor's portrait.");
      return;
    }
    if (!canUserUpload()) {
      notify("warn", "You do not have permission to upload files to this world.");
      return;
    }

    const imageFiles = files.filter(isImageFile);
    if (!imageFiles.length) {
      notify("warn", "Dropped file is not a supported image.");
      console.warn(`${LOG} drop rejected: no image files`, files.map(f => f.type || f.name));
      return;
    }
    if (imageFiles.length > 1) {
      notify("info", "Multiple images dropped — using the first one.");
    }

    const file = imageFiles[0];
    SWSELogger.debug(`${LOG} drop accepted`, { name: file.name, type: file.type, size: file.size });

    const result = await uploadPortraitFile(actor, file);
    if (!result.ok) {
      notify("error", `Portrait upload failed: ${result.error}`);
      return;
    }

    const applied = await applyPortrait(actor, result.path);
    if (applied) notify("info", "Portrait updated.");
  };

  const onClick = async (ev) => {
    if (ev.button !== 0) return;
    if (!canEditActor(actor)) {
      notify("warn", "You do not have permission to edit this actor's portrait.");
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    await openPortraitPicker(actor);
  };

  clickTarget?.addEventListener("click", onClick, { signal });
  zone.addEventListener("dragenter", onDragEnter, { signal });
  zone.addEventListener("dragover",  onDragOver,  { signal });
  zone.addEventListener("dragleave", onDragLeave, { signal });
  zone.addEventListener("drop",      onDrop,      { signal });
}

/**
 * Bind portrait upload behavior to a root element.
 *
 * Idempotent: safe to call on every _onRender. Uses the caller's
 * AbortController signal for cleanup so the bindings die with the
 * sheet's current render cycle.
 *
 * @param {HTMLElement} root   The sheet/app root element.
 * @param {object} opts
 * @param {Actor}   opts.actor The actor whose portrait to manage.
 * @param {AbortSignal} [opts.signal] Cleanup signal (strongly recommended).
 */
export function bindPortraitUpload(root, { actor, signal } = {}) {
  if (!(root instanceof HTMLElement)) return;
  if (!actor) return;

  const zones = findDropzones(root);
  if (!zones.length) {
    return;
  }

  if (!canEditActor(actor)) {
    SWSELogger.debug(`${LOG} skip bind: actor not editable`, actor?.id);
    return;
  }

  for (const zone of zones) {
    if (zone.dataset.portraitUploadBound === "1") continue;
    zone.dataset.portraitUploadBound = "1";
    attachDropHandlers(zone, actor, signal);
  }

  SWSELogger.debug(`${LOG} bound`, { actor: actor?.name, zones: zones.length });
}

export const PortraitUploadController = {
  bind: bindPortraitUpload,
};

export default PortraitUploadController;
