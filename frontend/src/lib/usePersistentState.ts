import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * State that survives reloads and works offline. Values are JSON encoded so
 * bookmarks and reading preferences can be restored without a server.
 */
export function usePersistentState<T>(key: string, initial: T): readonly [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or disabled: keep the in-memory value
    }
  }, [key, value]);

  return [value, setValue] as const;
}
