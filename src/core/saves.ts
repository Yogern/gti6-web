import {
  defaultPrefs,
  validPrefs,
  validProgress,
  type Prefs,
  type Progress,
} from "./state";
export interface StoredSave {
  progress: Progress;
  preferences: Prefs;
}
const good = (s: unknown): s is StoredSave =>
  typeof s === "object" &&
  s !== null &&
  validProgress((s as StoredSave).progress) &&
  validPrefs((s as StoredSave).preferences);
const key = "vice-leonida.settings.1";
export function readPrefs() {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (validPrefs(p)) return p;
  } catch {}
  return defaultPrefs();
}
export function writePrefs(p: Prefs) {
  localStorage.setItem(key, JSON.stringify(p));
}
let dbPromise: Promise<IDBDatabase> | undefined;
function db() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("vice-leonida-v1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("slots");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
export async function readSlot(slot: number): Promise<StoredSave | null> {
  const d = await db();
  return new Promise((ok, fail) => {
    const r = d.transaction("slots").objectStore("slots").get(slot);
    r.onsuccess = () => ok(good(r.result) ? r.result : null);
    r.onerror = () => fail(r.error);
  });
}
export async function writeSlot(
  slot: number,
  progress: Progress,
  preferences: Prefs,
) {
  if (!validProgress(progress) || !validPrefs(preferences))
    throw Error("Save data outside the supported world");
  const d = await db();
  progress.updated = Date.now();
  return new Promise<void>((ok, fail) => {
    const tx = d.transaction("slots", "readwrite");
    tx.objectStore("slots").put({ progress, preferences }, slot);
    tx.oncomplete = () => ok();
    tx.onerror = () => fail(tx.error);
    tx.onabort = () => fail(tx.error);
  });
}
export async function importSave(file: File) {
  if (file.size > 65536) throw Error("Save file is too large");
  const v: unknown = JSON.parse(await file.text(), (k, value) => {
    if (["__proto__", "constructor", "prototype"].includes(k))
      throw new Error("Unsupported save field");
    return value;
  });
  if (!good(v)) throw Error("Not a compatible Vice Leonida save");
  return v;
}
export function exportSave(progress: Progress, preferences: Prefs) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ progress, preferences }, null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "vice-leonida-save.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
