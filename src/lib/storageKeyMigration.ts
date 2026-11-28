/**
 * One-time rename of legacy `cognify_*` storage keys to `rafiqi_*`.
 * Runs at app start; copies any existing values so current users keep their
 * settings, then removes the old keys. Safe to run on every load.
 */
export function migrateCognifyStorageKeys(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const renames: Array<[string, string]> = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('cognify_')) {
          renames.push([key, 'rafiqi_' + key.slice('cognify_'.length)]);
        }
      }
      // Legacy device-encryption seed (keeps previously encrypted values decryptable)
      const legacySeed = '__cognify_device_shield_key__';
      const seed = storage.getItem(legacySeed);
      if (seed !== null) {
        if (storage.getItem('__rafiqi_device_shield_key__') === null) {
          storage.setItem('__rafiqi_device_shield_key__', seed);
        }
        storage.removeItem(legacySeed);
      }
      for (const [oldKey, newKey] of renames) {
        if (storage.getItem(newKey) === null) {
          const value = storage.getItem(oldKey);
          if (value !== null) storage.setItem(newKey, value);
        }
        storage.removeItem(oldKey);
      }
    } catch {
      // Storage restricted/disabled; skip migration.
    }
  }
}
