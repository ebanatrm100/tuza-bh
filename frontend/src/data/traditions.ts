import type { HymnEdition } from '../db';
import type { Strings } from '../i18n';

export type Tradition = 'protestant' | 'adepr' | 'sda' | 'catholic';

export const TRADITIONS: Tradition[] = ['protestant', 'adepr', 'sda', 'catholic'];

export const TRADITION_STORAGE_KEY = 'tuza-church-tradition';

export function isTradition(value: unknown): value is Tradition {
  return value === 'protestant' || value === 'adepr' || value === 'sda' || value === 'catholic';
}

export function traditionLabel(tradition: Tradition, s: Strings): string {
  if (tradition === 'adepr') return s.traditionAdepr;
  if (tradition === 'sda') return s.traditionSda;
  if (tradition === 'catholic') return s.traditionCatholic;
  return s.traditionProtestant;
}

export function traditionShortLabel(tradition: Tradition, s: Strings): string {
  if (tradition === 'adepr') return s.traditionAdeprShort;
  if (tradition === 'sda') return s.traditionSdaShort;
  if (tradition === 'catholic') return s.traditionCatholicShort;
  return s.traditionProtestantShort;
}

/** Hymn rows only carry the two source editions; ADEPR and Catholic share the Protestant book. */
export function dataEditionForTradition(tradition: Tradition): HymnEdition {
  return tradition === 'sda' ? 'sda' : 'protestant';
}

export function bookCountForTradition(tradition: Tradition): number {
  return tradition === 'catholic' ? 73 : 66;
}
