const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export function loadJSON<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Saves JSON to localStorage. If the browser quota is exceeded the oldest
 * entries are dropped (array values only) until it fits.
 */
export function saveJSON(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  let data = value;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
      return;
    } catch {
      if (Array.isArray(data) && data.length > 1) {
        data = data.slice(1);
      } else {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return;
      }
    }
  }
}

export function clearKey(key: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const CHAT_HISTORY_KEY = "muji-ai:chat-history:v1";
export const IMAGE_HISTORY_KEY = "muji-ai:image-history:v1";

export type SavedImage = {
  id: string;
  prompt: string;
  dataUrl: string;
  createdAt: number;
};
