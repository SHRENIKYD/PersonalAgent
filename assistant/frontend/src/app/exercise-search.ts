/**
 * Searching and filtering the exercise library.
 *
 * Kept as pure functions over a passed-in list rather than methods on the service, so the
 * ranking can be tested without loading a 766KB asset or standing up Angular. Ranking is the
 * part worth testing: a search that puts "Barbell Curl" below "Incline Dumbbell Bench Press"
 * for the query "curl" is technically a match and practically useless.
 */

export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary: string[];
  secondary: string[];
  level: string;
  mechanic: string;
  force: string;
  steps: string[];
  /** Two frames — the start and end position of the movement. */
  images: string[];
}

export interface LibraryFilters {
  text?: string;
  muscle?: string;
  equipment?: string;
}

/**
 * The library's muscle names mapped onto the vocabulary the training plan already uses, so a
 * set logged against a library exercise still counts toward the weekly volume-by-group
 * readout. Without this, anything logged outside the plan silently contributes to nothing.
 *
 * Not every library muscle has a home: neck, abductors and adductors have no group in this
 * programme, and inventing one to avoid a blank would put sets in a bucket the plan never
 * looks at. Those return null and are simply not counted.
 */
const MUSCLE_TO_GROUP: Record<string, string> = {
  chest: 'Chest',
  lats: 'Back',
  'middle back': 'Back',
  'lower back': 'Back',
  traps: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Hamstrings & glutes',
  calves: 'Calves',
  // The plan keeps abs in their own programme rather than the weekly split, but a set logged
  // against a library ab movement is still work done and should show in the weekly volume.
  abdominals: 'Abs',
};

export function muscleToGroup(muscle: string): string | null {
  return MUSCLE_TO_GROUP[muscle.toLowerCase()] ?? null;
}

/** An exercise's group for volume purposes — its first primary muscle that maps. */
export function groupForExercise(ex: LibraryExercise): string | null {
  for (const m of ex.primary) {
    const g = muscleToGroup(m);
    if (g) return g;
  }
  return null;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * How well one exercise matches one search term. Higher is better; 0 is no match.
 *
 * The tiers exist because substring matching alone ranks badly. "press" appears inside
 * "Bench Press" and inside "Leg Press Iso" and inside "Depress"; a name that *starts* with
 * the term is almost always what was meant, and a term that starts a word inside the name is
 * the next best thing.
 */
function scoreTerm(ex: LibraryExercise, term: string): number {
  const name = norm(ex.name);
  if (name === term) return 100;
  if (name.startsWith(term)) return 60;
  // Word-start match anywhere in the name.
  if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return 40;
  if (name.includes(term)) return 20;

  // Equipment and muscles match too, but score below any name match — someone typing
  // "dumbbell" wants the dumbbell exercises, and someone typing "curl" does not want every
  // biceps movement ahead of the ones actually called curl.
  if (ex.primary.some(m => norm(m).includes(term))) return 10;
  if (ex.equipment && norm(ex.equipment).includes(term)) return 8;
  if (ex.secondary.some(m => norm(m).includes(term))) return 4;
  if (ex.category && norm(ex.category).includes(term)) return 3;
  return 0;
}

/**
 * Search and filter.
 *
 * Every term must match something (AND, not OR): "dumbbell curl" should return dumbbell
 * curls, not every dumbbell movement plus every curl. That is the difference between a
 * search box that narrows and one that floods.
 */
export function searchExercises(
  all: LibraryExercise[],
  filters: LibraryFilters,
  limit = 60,
): LibraryExercise[] {
  const muscle = filters.muscle?.toLowerCase() ?? '';
  const equipment = filters.equipment?.toLowerCase() ?? '';
  const terms = norm(filters.text ?? '').split(' ').filter(Boolean);

  const scored: { ex: LibraryExercise; score: number }[] = [];

  for (const ex of all) {
    if (muscle && !ex.primary.some(m => m.toLowerCase() === muscle)) continue;
    if (equipment && ex.equipment.toLowerCase() !== equipment) continue;

    let total = 0;
    let ok = true;
    for (const t of terms) {
      const s = scoreTerm(ex, t);
      if (s === 0) { ok = false; break; }
      total += s;
    }
    if (!ok) continue;
    scored.push({ ex, score: total });
  }

  // Ties break alphabetically so the list is stable between keystrokes rather than
  // reshuffling equal-scoring rows on every render.
  scored.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));
  return scored.slice(0, limit).map(s => s.ex);
}

/** Distinct primary muscles present in the library, for the filter row. */
export function muscleOptions(all: LibraryExercise[]): string[] {
  return [...new Set(all.flatMap(e => e.primary))].sort();
}

/** Distinct equipment values, blanks dropped. */
export function equipmentOptions(all: LibraryExercise[]): string[] {
  return [...new Set(all.map(e => e.equipment).filter(Boolean))].sort();
}
