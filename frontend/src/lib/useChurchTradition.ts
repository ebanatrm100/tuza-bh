import { useCallback, useEffect, useState } from 'react';
import {
  isTradition,
  TRADITION_STORAGE_KEY,
  type Tradition
} from '../data/traditions';

const DEFAULT_TRADITION: Tradition = 'protestant';
const CHANGE_EVENT = 'tuza-church-tradition-change';

function readTradition(): Tradition {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(TRADITION_STORAGE_KEY);
    if (!raw) return DEFAULT_TRADITION;

    const parsed: unknown = JSON.parse(raw);
    if (isTradition(parsed)) return parsed;
  } catch {
    // Older values may have been stored as a plain string rather than JSON.
  }
  if (isTradition(raw)) return raw;
  return DEFAULT_TRADITION;
}

/**
 * The Bible and Hymnal sit side by side on the home screen, so keep their
 * tradition selectors in sync without lifting state through every page.
 */
export function useChurchTradition(): readonly [Tradition, (next: Tradition) => void] {
  const [tradition, setTraditionState] = useState<Tradition>(readTradition);

  useEffect(() => {
    const sync = () => setTraditionState(readTradition());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setTradition = useCallback((next: Tradition) => {
    setTraditionState(next);
    try {
      localStorage.setItem(TRADITION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or disabled: keep the in-memory value
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [tradition, setTradition] as const;
}
