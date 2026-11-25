/**
 * Keeps the downloaded model from sitting on people's devices forever.
 * The model (~670 MB) is removed 7 days after it was downloaded, or whenever the person
 * chooses to remove it. WebLLM stores everything in these Cache Storage buckets.
 */

export const MODEL_TTL_DAYS = 7;
const TTL_MS = MODEL_TTL_DAYS * 24 * 60 * 60 * 1000;
const KEY = "echo.modelSavedAt";
const WEBLLM_CACHES = ["webllm/model", "webllm/wasm", "webllm/config"];

export function modelSavedAt(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Call after a successful load. Keeps the original download date, so the 7 days don't keep resetting. */
export function markModelSaved(now = Date.now()) {
  if (modelSavedAt()) return;
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    // ignore
  }
}

export function modelExpiresAt(): number | null {
  const saved = modelSavedAt();
  return saved ? saved + TTL_MS : null;
}

export function isModelExpired(now = Date.now()): boolean {
  const exp = modelExpiresAt();
  return exp !== null && now >= exp;
}

/** Deletes every downloaded model file from this browser. */
export async function removeDownloadedModels(): Promise<void> {
  try {
    if ("caches" in window) await Promise.all(WEBLLM_CACHES.map((name) => caches.delete(name)));
  } finally {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
