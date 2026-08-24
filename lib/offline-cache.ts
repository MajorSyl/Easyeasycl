import AsyncStorage from '@react-native-async-storage/async-storage';

// Best-effort local cache for "last known good" data, used to keep screens
// usable when a fetch fails on a poor connection. Never throws — a cache
// miss or a corrupt/oversized write should degrade to "no cached data",
// not crash the screen that's trying to render offline.
export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache writes are a nice-to-have; ignore quota/serialization failures.
  }
}
