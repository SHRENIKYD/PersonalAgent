import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import {
  DIET_RULES,
  DIET_TARGETS,
  MACRO_TARGETS,
  MEDICAL_DISCLAIMER,
  NONVEG_MEALS,
  SUPPLEMENTS,
  VEG_MEALS,
  mealTotals,
} from '../../fitness-data';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Nutrition only — the other half of what used to be one Fitness tab. */
@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <div class="fit-hero">
        <div class="fit-hero-copy">
          <h1 class="page-title">Diet</h1>
          <p class="fit-hero-session">{{ macroSummary() }}</p>
          <p class="page-sub">
            Recomposition targets and the meal plan behind them. Tick the day off once you have
            stayed on plan.
          </p>

          <div class="fit-today-row">
            <label class="fit-check">
              <input type="checkbox" [checked]="checked()" (change)="toggle($any($event.target).checked)" />
              On-plan with diet
            </label>
            <span class="pill complete">{{ state.fitnessWeekProgress().pct }}% this week</span>
          </div>
        </div>
      </div>

      <h2 class="section-title">Today's macros</h2>
      <p class="page-sub">
        Targets from the plan, against what the {{ vegDay() ? 'veg' : 'non-veg' }} day adds up
        to as written — not what you actually ate, which the app doesn't track per meal.
      </p>
      <div class="macro-grid">
        <div class="macro" *ngFor="let m of macroRows()" [class.over]="m.over">
          <div class="macro-head">
            <b>{{ m.label }}</b>
            <span *ngIf="m.tracked">{{ m.have }} / {{ m.target }}{{ m.unit }}</span>
            <span *ngIf="!m.tracked">target {{ m.target }}{{ m.unit }}</span>
          </div>
          <div class="macro-bar" *ngIf="m.tracked"><i [style.width.%]="m.pct"></i></div>
          <p class="macro-note" *ngIf="m.over">
            Plan as written runs {{ m.have - m.target }}{{ m.unit }} over target.
          </p>
          <p class="macro-note" *ngIf="!m.tracked">Not itemised per meal in the plan.</p>
        </div>
      </div>
      <button class="ghost-btn" (click)="vegDay.set(!vegDay())">
        Show {{ vegDay() ? 'non-veg' : 'veg' }} day
      </button>

      <h2 class="section-title">Daily targets</h2>
      <p class="page-sub">{{ dietTargets }}</p>

      <h2 class="section-title">Non-veg day</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Meal</th><th>Food &amp; quantity</th><th>Protein</th><th>Calories</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of nonvegMeals">
              <td>{{ m.meal }}</td><td>{{ m.food }}</td><td>{{ m.protein }}</td><td>{{ m.calories }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Veg day</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Meal</th><th>Food &amp; quantity</th><th>Protein</th><th>Calories</th></tr></thead>
          <tbody>
            <tr *ngFor="let m of vegMeals">
              <td>{{ m.meal }}</td><td>{{ m.food }}</td><td>{{ m.protein }}</td><td>{{ m.calories }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Supplement schedule</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead><tr><th>Supplement</th><th>When</th><th>Notes</th></tr></thead>
          <tbody>
            <tr *ngFor="let s of supplements">
              <td>{{ s.supplement }}</td><td>{{ s.when }}</td><td>{{ s.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="section-title">Diet rules</h2>
      <ul class="fit-list">
        <li *ngFor="let r of dietRules">{{ r }}</li>
      </ul>

      <p class="footnote">{{ medicalDisclaimer }}</p>
    </section>
  `,
})
export class DietComponent {
  dietTargets = DIET_TARGETS;
  nonvegMeals = NONVEG_MEALS;
  vegMeals = VEG_MEALS;
  supplements = SUPPLEMENTS;
  dietRules = DIET_RULES;
  medicalDisclaimer = MEDICAL_DISCLAIMER;

  vegDay = signal(false);

  macroSummary = computed(() =>
    `${MACRO_TARGETS.kcal} kcal \u00b7 ${MACRO_TARGETS.protein} g protein \u00b7 ` +
    `${MACRO_TARGETS.carbs} g carbs \u00b7 ${MACRO_TARGETS.fat} g fat`
  );

  /**
   * Macro progress against target. `have` is what the day's plan totals as written rather
   * than what was actually eaten — adherence is a single daily tick, not per-meal, so
   * claiming to know real intake would be a lie. Carbs and fat are not itemised per meal
   * anywhere in the plan, so they render as the target alone rather than a bar that would
   * imply a measurement nobody took.
   */
  macroRows = computed(() => {
    const meals = this.vegDay() ? this.vegMeals : this.nonvegMeals;
    const totals = mealTotals(meals);
    const row = (label: string, have: number, target: number, unit: string) => ({
      label, have, target, unit,
      pct: Math.min(100, Math.round((have / target) * 100)),
      over: have > target,
      tracked: true,
    });
    return [
      row('Calories', totals.calories, MACRO_TARGETS.kcal, ' kcal'),
      row('Protein', totals.protein, MACRO_TARGETS.protein, ' g'),
      { label: 'Carbs', have: 0, target: MACRO_TARGETS.carbs, unit: ' g', pct: 0, over: false, tracked: false },
      { label: 'Fat', have: 0, target: MACRO_TARGETS.fat, unit: ' g', pct: 0, over: false, tracked: false },
    ];
  });

  constructor(public state: StateService) {}

  checked(): boolean { return this.state.isFitnessLogged(`${todayIso()}:diet`); }
  toggle(value: boolean) { this.state.toggleFitnessLog(`${todayIso()}:diet`, value); }
}
