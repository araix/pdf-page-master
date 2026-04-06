/**
 * Session persistence using IndexedDB.
 * Stores page metadata, settings, annotations, and raw PDF/image bytes
 * so the session can be fully recovered after a page refresh or accidental close.
 */

import type { PageInfo } from './pdfService';
import type {
  Annotation, PageNumberSettings, WatermarkSettings,
  HeaderFooterSettings, Bookmark,
} from './types';

const DB_NAME = 'pdf-page-master-session';
const DB_VERSION = 1;
const STORE_STATE = 'state';
const STORE_FILES = 'files';

export interface SessionData {
  version: 1;
  savedAt: number;
  pages: PageInfo[];
  annotations: Record<string, Annotation[]>;
  pageNumSettings: PageNumberSettings;
  watermarkSettings: WatermarkSettings;
  headerFooter: HeaderFooterSettings;
  bookmarks: Bookmark[];
  formValues: Record<string, Record<string, string>>;
  compression: string;
  zoom: number;
}

// ─── IndexedDB helpers ──────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) db.createObjectStore(STORE_STATE);
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Public API ─────────────────────────────────────────

/**
 * Check if a saved session exists (fast, doesn't load data).
 */
export async function hasSavedSession(): Promise<{ exists: boolean; savedAt: number; pageCount: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_STATE, 'readonly');
    const result = await new Promise<SessionData | undefined>((resolve) => {
      const req = tx.objectStore(STORE_STATE).get('session');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    db.close();
    if (result && result.pages?.length > 0) {
      return { exists: true, savedAt: result.savedAt, pageCount: result.pages.length };
    }
    return { exists: false, savedAt: 0, pageCount: 0 };
  } catch {
    return { exists: false, savedAt: 0, pageCount: 0 };
  }
}

/**
 * Save a full session (state + file bytes) to IndexedDB.
 */
export async function saveSession(
  data: SessionData,
  fileEntries: Array<[string, Uint8Array]>,
): Promise<void> {
  const db = await openDB();

  // Save state object
  const tx1 = db.transaction(STORE_STATE, 'readwrite');
  tx1.objectStore(STORE_STATE).put(data, 'session');
  await txPromise(tx1);

  // Save file blobs (only the unique fileIds we actually need)
  const neededIds = new Set(data.pages.map((p) => p.fileId));
  const tx2 = db.transaction(STORE_FILES, 'readwrite');
  const store = tx2.objectStore(STORE_FILES);
  store.clear();
  for (const [id, bytes] of fileEntries) {
    if (neededIds.has(id)) store.put(bytes, id);
  }
  await txPromise(tx2);

  db.close();
}

/**
 * Load a saved session (state + file bytes) from IndexedDB.
 */
export async function loadSession(): Promise<{
  data: SessionData;
  files: Map<string, Uint8Array>;
} | null> {
  try {
    const db = await openDB();

    // Load state
    const tx1 = db.transaction(STORE_STATE, 'readonly');
    const data = await new Promise<SessionData | undefined>((resolve) => {
      const req = tx1.objectStore(STORE_STATE).get('session');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (!data || !data.pages?.length) { db.close(); return null; }

    // Load files
    const files = new Map<string, Uint8Array>();
    const tx2 = db.transaction(STORE_FILES, 'readonly');
    await new Promise<void>((resolve) => {
      const req = tx2.objectStore(STORE_FILES).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          files.set(cursor.key as string, cursor.value as Uint8Array);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });

    db.close();
    return { data, files };
  } catch {
    return null;
  }
}

/**
 * Clear the saved session from IndexedDB.
 */
export async function clearSession(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_STATE, STORE_FILES], 'readwrite');
    tx.objectStore(STORE_STATE).clear();
    tx.objectStore(STORE_FILES).clear();
    await txPromise(tx);
    db.close();
  } catch {
    // Silent fail — non-critical
  }
}
