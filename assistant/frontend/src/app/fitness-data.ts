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
  { day: 'Monday', time: '5:30–7:00 AM', session: 'Push A (Chest, Shoulders, Triceps)', length: '90 min' },
  { day: 'Tuesday', time: '6:30–8:45 AM', session: 'Pull A + Abs + Cardio', length: '135 min' },
  { day: 'Wednesday', time: '5:30–7:00 AM', session: 'Legs A', length: '90 min' },
  { day: 'Thursday', time: '6:30–8:45 AM', session: 'Push B + Abs + Cardio', length: '135 min' },
  { day: 'Friday', time: '5:30–7:00 AM', session: 'Pull B', length: '90 min' },
  { day: 'Saturday', time: '6:30–8:45 AM', session: 'Legs B + Abs + Cardio', length: '135 min' },
  { day: 'Sunday', time: '—', session: 'Rest + 8,000–10,000 steps', length: '—' },
];

export interface Exercise {
  name: string;
  sets: string;
  rest: string;
}

export interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  extra?: string;
}

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    name: 'Monday — Push A',
    exercises: [
      { name: 'Barbell bench press', sets: '4 × 6–8', rest: '2–3 min' },
      { name: 'Incline dumbbell press', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Seated dumbbell overhead press', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Cable fly or pec-deck', sets: '3 × 12–15', rest: '60 sec' },
      { name: 'Dumbbell lateral raise', sets: '4 × 12–15', rest: '60 sec' },
      { name: 'Rope pushdown', sets: '3 × 10–12', rest: '60 sec' },
      { name: 'Overhead dumbbell extension', sets: '3 × 10–12', rest: '60 sec' },
    ],
    extra: 'Finish with 10 min incline walk if time permits.',
  },
  {
    name: 'Tuesday — Pull A + Abs + Cardio',
    exercises: [
      { name: 'Deadlift (conventional)', sets: '3 × 5', rest: '3 min' },
      { name: 'Lat pulldown or pull-ups', sets: '4 × 8–10', rest: '2 min' },
      { name: 'Barbell bent-over row', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Seated cable row', sets: '3 × 10–12', rest: '90 sec' },
      { name: 'Face pulls', sets: '3 × 15', rest: '60 sec' },
      { name: 'Barbell or EZ-bar curl', sets: '3 × 10–12', rest: '60 sec' },
      { name: 'Hammer curls', sets: '3 × 12', rest: '60 sec' },
    ],
    extra:
      'Abs circuit — 3 rounds, minimal rest: hanging knee raises × 12 → cable crunch × 15 → ' +
      'plank 45–60 sec. Cardio: 20–25 min incline treadmill walk (10–12% incline, 5–5.5 km/h) ' +
      'or cycling, moderate pace — you should be able to talk.',
  },
  {
    name: 'Wednesday — Legs A',
    exercises: [
      { name: 'Barbell back squat', sets: '4 × 6–8', rest: '2–3 min' },
      { name: 'Romanian deadlift', sets: '3 × 8–10', rest: '2 min' },
      { name: 'Leg press', sets: '3 × 10–12', rest: '90 sec' },
      { name: 'Walking lunges', sets: '3 × 10 per leg', rest: '90 sec' },
      { name: 'Lying leg curl', sets: '3 × 12', rest: '60 sec' },
      { name: 'Standing calf raise', sets: '4 × 15', rest: '60 sec' },
    ],
  },
  {
    name: 'Thursday — Push B + Abs + Cardio',
    exercises: [
      { name: 'Incline barbell press', sets: '4 × 6–8', rest: '2–3 min' },
      { name: 'Flat dumbbell press', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Machine shoulder press', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Dips (assisted if needed)', sets: '3 × max reps', rest: '90 sec' },
      { name: 'Cable lateral raise', sets: '3 × 12–15', rest: '60 sec' },
      { name: 'Skull crushers', sets: '3 × 10–12', rest: '60 sec' },
      { name: 'Single-arm cable pushdown', sets: '2 × 12–15', rest: '60 sec' },
    ],
    extra:
      'Abs circuit — 3 rounds: decline crunches × 15 → Russian twists × 20 → side plank 30 ' +
      'sec each side. Cardio: 20–25 min, same as Tuesday.',
  },
  {
    name: 'Friday — Pull B',
    exercises: [
      { name: 'Weighted or assisted pull-ups', sets: '4 × 6–8', rest: '2 min' },
      { name: 'T-bar row or chest-supported row', sets: '3 × 8–10', rest: '90 sec' },
      { name: 'Single-arm dumbbell row', sets: '3 × 10 per side', rest: '90 sec' },
      { name: 'Straight-arm pulldown', sets: '3 × 12–15', rest: '60 sec' },
      { name: 'Rear delt fly (machine or DB)', sets: '3 × 15', rest: '60 sec' },
      { name: 'Preacher curl', sets: '3 × 10–12', rest: '60 sec' },
      { name: 'Cable curl', sets: '2 × 12–15', rest: '60 sec' },
    ],
    extra: 'Finish with 10 min incline walk if time permits.',
  },
  {
    name: 'Saturday — Legs B + Abs + Cardio',
    exercises: [
      { name: 'Front squat or hack squat', sets: '4 × 8–10', rest: '2 min' },
      { name: 'Bulgarian split squat', sets: '3 × 8–10 per leg', rest: '90 sec' },
      { name: 'Leg extension', sets: '3 × 12–15', rest: '60 sec' },
      { name: 'Seated leg curl', sets: '3 × 12–15', rest: '60 sec' },
      { name: 'Hip thrust', sets: '3 × 10–12', rest: '90 sec' },
      { name: 'Seated calf raise', sets: '4 × 15–20', rest: '60 sec' },
    ],
    extra:
      'Abs circuit — 3 rounds: hanging leg raises × 10 → ab-wheel or plank walkout × 10 → ' +
      'plank 60 sec. Cardio: 25–30 min incline walk or cycle.',
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

export const MEDICAL_DISCLAIMER =
  'General fitness/nutrition guidance for a healthy adult. If you have a medical condition ' +
  '(diabetes, thyroid, BP, kidney issues) or take medication, run it past your doctor first.';
