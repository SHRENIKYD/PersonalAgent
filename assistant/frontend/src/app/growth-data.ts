import { TrackKey } from './models';

export const TRACKS: { key: TrackKey; label: string }[] = [
  { key: 'career', label: 'Career & Skills' },
  { key: 'health', label: 'Health & Energy' },
  { key: 'habits', label: 'Habits & Systems' },
  { key: 'balance', label: 'Balance & Relationships' },
];

export const GOAL_PLACEHOLDERS: Record<TrackKey, string> = {
  career: 'e.g. Finish one course module',
  health: 'e.g. Move your body 4x this week',
  habits: 'e.g. Stick to a consistent wind-down routine',
  balance: 'e.g. Have one real conversation with someone you love',
};

/**
 * Six month labels starting from the current month — computed at call time rather than
 * hardcoded, so the roadmap never goes stale the way a fixed "August 2026" would.
 */
export function generateMonthNames(count = 6): string[] {
  const names: string[] = [];
  const start = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    names.push(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
  }
  return names;
}
