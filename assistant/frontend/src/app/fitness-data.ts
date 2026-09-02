/**
 * Reference content from the user's own diet + workout plan (recomposition — build muscle,
 * lose belly fat). Purely informational, no persisted state of its own — day-to-day
 * adherence is tracked via the "Habits & Systems" grid on the Growth tab.
 */

export interface ScheduleRow {
  day: string;
  time: string;
  session: string;
  length: string;
}

export const WEEKLY_SCHEDULE: ScheduleRow[] = [
  { day: 'Monday', time: '—', session: 'Push A (Upper Chest + Full Triceps)', length: '—' },
  { day: 'Tuesday', time: '—', session: 'Pull A (Back + Biceps)', length: '—' },
  { day: 'Wednesday', time: '—', session: 'Legs A', length: '—' },
  { day: 'Thursday', time: '—', session: 'Push B (Mid/Lower Chest + Shoulders)', length: '—' },
  { day: 'Friday', time: '—', session: 'Pull B (Back + Arms)', length: '—' },
  { day: 'Saturday', time: '—', session: 'Legs B', length: '—' },
  { day: 'Sunday', time: '—', session: 'Rest', length: '—' },
];

export interface Exercise {
  name: string;
  sets: string;
  /** Not specified in the current plan for most exercises — omitted rather than guessed. */
  rest?: string;
  /** Muscle-group sub-heading this exercise falls under (e.g. "Chest", "Shoulders"). */
  group?: string;
}

export interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  extra?: string;
}

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    name: 'Push A — Upper Chest + Full Triceps',
    exercises: [
      { group: 'Chest', name: 'Incline barbell bench press', sets: '4 × 6–8' },
      { group: 'Chest', name: 'Flat dumbbell press', sets: '3 × 8–10' },
      { group: 'Chest', name: 'Low-to-high cable fly', sets: '3 × 12–15' },
      { group: 'Shoulders', name: 'Seated dumbbell shoulder press', sets: '4 × 6–10' },
      { group: 'Shoulders', name: 'Dumbbell lateral raise', sets: '4 × 12–15' },
      { group: 'Triceps', name: 'Overhead cable extension (long head)', sets: '3 × 10–12' },
      { group: 'Triceps', name: 'EZ-bar skull crusher (medial)', sets: '3 × 8–10' },
      { group: 'Triceps', name: 'Cable pushdown (lateral)', sets: '3 × 12–15' },
    ],
  },
  {
    name: 'Pull A — Back + Biceps',
    exercises: [
      { group: 'Back', name: 'Wide-grip pull-ups / pulldown', sets: '4 × 6–10' },
      { group: 'Back', name: 'Single-arm lat pulldown', sets: '3 × 10–12' },
      { group: 'Back', name: 'Chest-supported row', sets: '4 × 8–12' },
      { group: 'Rear delts', name: 'Face pulls', sets: '4 × 12–15' },
      { group: 'Biceps', name: 'Incline dumbbell curl (long head)', sets: '3 × 8–12' },
      { group: 'Biceps', name: 'Preacher curl (short head)', sets: '3 × 10–12' },
      { group: 'Forearms', name: 'Hammer curl', sets: '3 × 10–12' },
    ],
  },
  {
    name: 'Legs A',
    exercises: [
      { group: 'Quads', name: 'Back squat', sets: '4 × 5–8' },
      { group: 'Quads', name: 'Hack squat / leg press', sets: '4 × 10–12' },
      { group: 'Quads', name: 'Leg extension', sets: '3 × 12–15' },
      { group: 'Hamstrings', name: 'Seated leg curl', sets: '4 × 10–12' },
      { group: 'Hamstrings', name: 'Romanian deadlift (light–moderate)', sets: '3 × 8–10' },
      { group: 'Calves', name: 'Standing calf raise', sets: '5 × 10–15' },
    ],
  },
  {
    name: 'Push B — Mid/Lower Chest + Shoulders',
    exercises: [
      { group: 'Chest', name: 'Flat barbell bench press', sets: '4 × 5–8' },
      { group: 'Chest', name: 'Decline dumbbell press', sets: '3 × 8–10' },
      { group: 'Chest', name: 'Cable fly (mid)', sets: '3 × 12–15' },
      { group: 'Shoulders', name: 'Barbell overhead press (front delt)', sets: '4 × 5–8' },
      { group: 'Shoulders', name: 'Cable lateral raise (side delt)', sets: '4 × 12–15' },
      { group: 'Shoulders', name: 'Reverse pec-deck (rear delt)', sets: '4 × 12–15' },
      { group: 'Triceps', name: 'Close-grip bench press', sets: '3 × 6–8' },
      { group: 'Triceps', name: 'Rope overhead extension', sets: '3 × 10–12' },
    ],
  },
  {
    name: 'Pull B — Back + Arms',
    exercises: [
      { group: 'Back', name: 'Barbell row', sets: '4 × 6–8' },
      { group: 'Back', name: 'T-bar row', sets: '4 × 8–10' },
      { group: 'Back', name: 'Neutral-grip cable row', sets: '3 × 10–12' },
      { group: 'Rear delts', name: 'Cable rear-delt fly', sets: '4 × 12–15' },
      { group: 'Biceps', name: 'EZ-bar curl', sets: '3 × 8–10' },
      { group: 'Biceps', name: 'Spider curl', sets: '3 × 10–12' },
      { group: 'Forearms', name: 'Reverse curl', sets: '3 × 12–15' },
    ],
  },
  {
    name: 'Legs B',
    exercises: [
      { group: 'Hamstrings & glutes', name: 'Romanian deadlift (heavy)', sets: '4 × 6–10' },
      { group: 'Hamstrings & glutes', name: 'Hip thrust', sets: '4 × 8–12' },
      { group: 'Hamstrings & glutes', name: 'Lying leg curl', sets: '3 × 10–12' },
      { group: 'Quads', name: 'Front squat or narrow-stance hack squat', sets: '3 × 6–10' },
      { group: 'Quads', name: 'Walking lunges', sets: '3 × 10–12 per leg' },
      { group: 'Calves', name: 'Seated calf raise', sets: '5 × 12–15' },
    ],
  },
];

export interface AbsExercise {
  name: string;
  sets: string;
  easierOption: string;
}

export interface AbsDay {
  /** Which PPL day this abs block pairs with. */
  pairedWith: string;
  focus: string;
  exercises: AbsExercise[];
}

export const ABS_PROGRAM: AbsDay[] = [
  {
    pairedWith: 'Push A',
    focus: 'Upper abs',
    exercises: [
      { name: 'Cable crunch', sets: '4 × 12–15', easierOption: 'Resistance-band crunch / floor crunch' },
      { name: 'Weighted decline crunch', sets: '3 × 12–15', easierOption: 'Decline crunch (bodyweight)' },
    ],
  },
  {
    pairedWith: 'Pull A',
    focus: 'Lower abs',
    exercises: [
      { name: 'Hanging leg raises', sets: '4 × 8–12', easierOption: 'Hanging knee raises' },
      { name: 'Captain\'s chair knee raises', sets: '3 × 12–15', easierOption: 'Lying leg raises on mat' },
    ],
  },
  {
    pairedWith: 'Legs A',
    focus: 'Core stability',
    exercises: [
      { name: 'Ab wheel rollout', sets: '3 × 8–12', easierOption: 'Barbell rollout / stability-ball rollout' },
      { name: 'Front plank', sets: '3 × 30–45 sec', easierOption: 'Knees-down plank' },
    ],
  },
  {
    pairedWith: 'Push B',
    focus: 'Upper abs',
    exercises: [
      { name: 'Machine crunch', sets: '4 × 12–15', easierOption: 'Cable crunch' },
      { name: 'Cable crunch (different stance)', sets: '3 × 12–15', easierOption: 'Seated band crunch' },
    ],
  },
  {
    pairedWith: 'Pull B',
    focus: 'Lower abs + control',
    exercises: [
      { name: 'Reverse crunch (bench or mat)', sets: '4 × 12–15', easierOption: 'Bent-knee reverse crunch' },
      { name: 'Hanging knee raises (slow)', sets: '3 × 12–15', easierOption: 'Bench knee tucks' },
    ],
  },
  {
    pairedWith: 'Legs B',
    focus: 'Deep core (optional — pick one)',
    exercises: [
      { name: 'Vacuum holds', sets: '3 × 20–30 sec', easierOption: 'Stomach bracing while standing' },
      { name: 'Dead bug', sets: '3 × 10 reps per side', easierOption: 'Heel taps' },
    ],
  },
];

export const WORKOUT_RULES: string[] = [
  'Progressive overload — beat last week: 1–2 more reps at the same weight, or +2.5 kg once you hit the top of the rep range on all sets. Log every workout.',
  'Train close to failure. The last 1–2 reps of every working set should be genuinely hard.',
  'Form before weight. Full range of motion, controlled negatives (2 sec down).',
  "Cardio is a tool, not the main event — the deficit removes belly fat, weights build the physique. Don't add extra cardio beyond the plan; recover instead.",
  'Steps: 8,000–10,000 daily, including gym days — quietly burns more fat than any treadmill session.',
  'Sleep 7–8 hours. Lights out by 9:30–10:00 PM given 5:30 AM training. Magnesium + ashwagandha at night helps.',
  "Belly fat truth: you can't spot-reduce it. Abs work builds the muscle underneath; the diet removes the fat covering it. Be patient.",
];

export const WORKOUT_PROGRESS: string[] = [
  'Weeks 1–4: strength jumps quickly, waistband gets slightly looser.',
  'Weeks 5–8: visible change in shoulders/arms, belly noticeably reducing.',
  'Weeks 8–12: ~2–4 kg fat lost, clearly leaner look if diet is followed.',
  'Take progress photos every 2 weeks, same lighting and pose — the scale alone misleads during recomp.',
];

export interface MealRow {
  meal: string;
  food: string;
  protein: string;
  calories: string;
}

export const NONVEG_MEALS: MealRow[] = [
  { meal: 'Pre-workout', food: '1 medium banana (100 g) + black coffee', protein: '1 g', calories: '105' },
  { meal: 'Post-workout', food: 'Whey 1 scoop (30 g) in water + creatine 5 g (week 1 only)', protein: '24 g', calories: '120' },
  { meal: 'Breakfast', food: '3 whole eggs + 3 egg whites omelette/bhurji (onion, tomato, chili) + 2 phulkas (60 g atta), or swap for 50 g oats', protein: '32 g', calories: '460' },
  { meal: 'Lunch', food: 'Chicken breast 150 g in 5 g oil + rice 60 g raw + dal 30 g raw + salad 150 g + low-fat curd 100 g', protein: '47 g', calories: '640' },
  { meal: 'Evening snack', food: 'Roasted chana 40 g + 1 apple or orange', protein: '8 g', calories: '230' },
  { meal: 'Dinner', food: 'Chicken 120 g or fish 150 g in 5 g oil + 2 phulkas (60 g atta) + mixed veg sabzi 150 g in 5 g oil', protein: '33 g', calories: '500' },
  { meal: 'Bedtime', food: 'Toned milk 200 ml', protein: '7 g', calories: '120' },
];

export const VEG_MEALS: MealRow[] = [
  { meal: 'Pre-workout', food: '1 medium banana (100 g) + black coffee', protein: '1 g', calories: '105' },
  { meal: 'Post-workout', food: 'Whey 1 scoop (30 g) in water + creatine 5 g (week 1 only)', protein: '24 g', calories: '120' },
  { meal: 'Breakfast', food: 'Moong dal chilla (60 g dal) stuffed with 60 g paneer + green chutney + low-fat curd 100 g', protein: '29 g', calories: '470' },
  { meal: 'Lunch', food: 'Soya chunk curry (50 g dry chunks) in 5 g oil + rice 60 g raw + dal 30 g raw + salad 150 g + low-fat curd 100 g', protein: '41 g', calories: '650' },
  { meal: 'Evening snack', food: 'Roasted chana 40 g + 1 fruit', protein: '8 g', calories: '230' },
  { meal: 'Dinner', food: 'Paneer bhurji/tikka 100 g in 5 g oil + 2 phulkas (60 g atta) + mixed veg sabzi 150 g in 5 g oil', protein: '26 g', calories: '560' },
  { meal: 'Bedtime', food: 'Toned milk 200 ml', protein: '7 g', calories: '120' },
];

export interface SupplementRow {
  supplement: string;
  when: string;
  notes: string;
}

export const SUPPLEMENTS: SupplementRow[] = [
  { supplement: 'Creatine 3–5 g', when: 'Post-workout meal (any time works)', notes: 'Daily, every day, forever — the one supplement that clearly works.' },
  { supplement: 'Whey 30 g', when: 'Post-workout', notes: 'Week 1 only, then use food replacements.' },
  { supplement: 'Fish oil (Omega-3)', when: 'With lunch', notes: 'Per label dose.' },
  { supplement: 'Vitamin D3 + K2', when: 'With breakfast or lunch', notes: 'Needs a meal containing fat to absorb.' },
  { supplement: 'Zinc citrate', when: 'With dinner', notes: 'Keep it separate from magnesium.' },
  { supplement: 'Magnesium glycinate', when: '30–60 min before bed', notes: 'Helps sleep — critical with 5 AM wake-ups.' },
  { supplement: 'Ashwagandha', when: 'Before bed with magnesium', notes: 'Per label dose.' },
  { supplement: 'L-Carnitine', when: 'Optional, pre-workout', notes: 'Evidence is modest — finish the bottle, no need to rebuy.' },
];

export const DIET_TARGETS =
  '~2,000 kcal/day · Protein 130–140 g · Carbs 210–230 g · Fat 55–60 g. ' +
  'Maintenance is ~2,300–2,400 kcal — this deficit targets 0.25–0.5 kg fat loss/week, slow on ' +
  'purpose so the loss is fat, not muscle.';

export const DIET_RULES: string[] = [
  'Oil budget: 15 g/day total (3 teaspoons) — the #1 hidden reason diets stall. Measure it, no deep-fried anything.',
  'Protein at every meal — keeps you full and protects muscle in a deficit.',
  'Water: 3–3.5 litres/day. Start with 500 ml on waking before the gym.',
  'Sugar: none in tea/coffee, no sweets, no sugary drinks. Fruit is fine as listed.',
  'Weigh yourself 3× per week, morning, empty stomach. Track the weekly average, not daily numbers.',
  'Adjust every 2 weeks: not dropping → remove 1 phulka or 20 g rice from dinner. Dropping faster than 0.6 kg/week → add 1 phulka at lunch.',
  'One free meal per week (not a free day) — keeps the diet sustainable for months.',
  'Eating out: tandoori/grilled chicken, egg dishes, dal + roti are safe orders. Avoid cream/butter-heavy gravies.',
];


// ---------------- structured targets and mappings ----------------
//
// DIET_TARGETS above is prose for the user to read. These are the same numbers in a form
// code can do arithmetic on — the macro bars and the assistant's "you're 620 kcal short"
// both need to subtract, and parsing that sentence at runtime would be absurd.

export interface MacroTargets {
  kcal: number;
  protein: number;   // g
  carbs: number;     // g
  fat: number;       // g
}

export const MACRO_TARGETS: MacroTargets = {
  kcal: 2000,
  protein: 135,
  carbs: 220,
  fat: 58,
};

/** Numeric protein/calorie totals per meal, parsed once from the tables above. */
export function mealTotals(meals: MealRow[]): { protein: number; calories: number } {
  return meals.reduce(
    (sum, m) => ({
      protein: sum.protein + (parseInt(m.protein, 10) || 0),
      calories: sum.calories + (parseInt(m.calories, 10) || 0),
    }),
    { protein: 0, calories: 0 }
  );
}

/**
 * Which muscle groups each session actually loads, keyed by the `group` labels already on
 * the exercises. This drives the anatomical map: the highlight is derived from the plan
 * rather than hand-maintained, so editing a workout day cannot leave the figure lying.
 */
export type MuscleGroup =
  | 'traps' | 'delts' | 'chest' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'lats' | 'glutes' | 'quads' | 'hams' | 'calves';

/** Maps a plan sub-heading ("Chest", "Back") onto the shapes in the body map. */
const GROUP_TO_MUSCLES: Record<string, MuscleGroup[]> = {
  Chest: ['chest'],
  Shoulders: ['delts', 'traps'],
  'Rear delts': ['delts', 'traps'],
  Triceps: ['triceps'],
  Back: ['lats', 'traps'],
  Biceps: ['biceps'],
  Forearms: ['forearms'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Legs: ['quads', 'hams', 'glutes', 'calves'],
  Quads: ['quads'],
  // The plan distinguishes these two itself — Legs A's hamstring block is a seated curl
  // plus a light RDL, Legs B's is heavy RDL and hip thrusts — so the map keeps the
  // distinction rather than assuming every hinge is a glute movement.
  Hamstrings: ['hams'],
  'Hamstrings & glutes': ['hams', 'glutes'],
  Glutes: ['glutes'],
  Calves: ['calves'],
  Core: ['abs', 'obliques'],
  Abs: ['abs', 'obliques'],
};

export function musclesFor(day: WorkoutDay): MuscleGroup[] {
  const out = new Set<MuscleGroup>();
  day.exercises.forEach(e => {
    const group = e.group ?? '';
    if (group === '') return;
    const mapped = GROUP_TO_MUSCLES[group];
    if (!mapped) {
      // A sub-heading with no entry here would light nothing and look like a deliberately
      // unworked muscle rather than a gap in the mapping. Fail loudly instead of silently.
      console.warn(`musclesFor: no muscle mapping for group "${group}" — figure will under-report.`);
      return;
    }
    mapped.forEach(m => out.add(m));
  });
  return [...out];
}

/** Every group label used anywhere in the plan, for the mapping self-check below. */
export function unmappedGroups(): string[] {
  const seen = new Set<string>();
  WORKOUT_DAYS.forEach(d => d.exercises.forEach(e => { if (e.group) seen.add(e.group); }));
  return [...seen].filter(g => !GROUP_TO_MUSCLES[g]);
}

/**
 * Today's session, resolved from WEEKLY_SCHEDULE by weekday. Returns null on the rest day
 * rather than an empty WorkoutDay, so callers must decide what "rest" reads like instead
 * of silently rendering a session with no exercises.
 */
/** Today as an ISO date. Shared, because three screens must agree on where "today" ends. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function workoutForDate(date = new Date()): WorkoutDay | null {
  const row = WEEKLY_SCHEDULE[(date.getDay() + 6) % 7];   // WEEKLY_SCHEDULE starts Monday
  if (!row || /rest/i.test(row.session)) return null;
  // Schedule rows name the session ("Push A (Upper Chest...)"); workout days carry the
  // fuller title. Match on the short prefix that both share.
  const short = row.session.split(' (')[0].trim().toLowerCase();
  return WORKOUT_DAYS.find(d => d.name.toLowerCase().startsWith(short)) ?? null;
}

/** The abs block paired with a given session, if the program pairs one. */
export function absForDay(dayName: string): AbsDay | null {
  const short = dayName.split(' —')[0].trim().toLowerCase();
  return ABS_PROGRAM.find(a => a.pairedWith.toLowerCase().includes(short)) ?? null;
}

export const MEDICAL_DISCLAIMER =
  'General fitness/nutrition guidance for a healthy adult. If you have a medical condition ' +
  '(diabetes, thyroid, BP, kidney issues) or take medication, run it past your doctor first.';
