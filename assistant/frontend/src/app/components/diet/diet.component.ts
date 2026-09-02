import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { FoldComponent } from '../fold/fold.component';
import {
  DIET_RULES,
  DIET_TARGETS,
  MACRO_TARGETS,
  MEDICAL_DISCLAIMER,
  NONVEG_MEALS,
  SUPPLEMENTS,
  VEG_MEALS,
  mealTotals,
  todayIso,
} from '../../fitness-data';

/**
 * Diet, rebuilt to the Bloom mockup: the day's calories as one figure, macros as bars
 * underneath, then the meals that make them up.
 *
 * The numbers are what the plan totals as written, not what you ate. Adherence here is a
 * single daily tick, so the app has no idea what actually went in — and a screen reading
 * "1,840 kcal" as though it were measured would be inventing a measurement nobody took.
 * That is why the figure says "planned", the one place this departs from the mockup's words.
 *
 * The supplement schedule, the targets and the diet rules are not in the mockup. They are
 * reference material rather than screens, so they fold rather than disappear.
 */
@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [CommonModule, FoldComponent],
  template: `
    <section class="panel">
      <h1 class="page-title">Diet</h1>

      <div class="chip-row">
        <button class="chip-filter" [class.on]="!vegDay()" (click)="vegDay.set(false)">Non-veg day</button>
        <button class="chip-filter" [class.on]="vegDay()" (click)="vegDay.set(true)">Veg day</button>
      </div>

      <div class="card card-accent">
        <div class="card-head">
          <span>
            <span class="big-figure">{{ totals().calories }}</span>
            <span class="big-unit"> / {{ macros.kcal }} kcal planned</span>
          </span>
          <span class="pill" [class.high]="remaining() < 0">
            {{ remaining() >= 0 ? remaining() + ' left' : (-remaining()) + ' over' }}
          </span>
        </div>

        <div class="vol-row" *ngFor="let m of macroRows()">
          <div class="vol-head">
            <span>{{ m.label }}</span>
            <span class="vol-count">
              <ng-container *ngIf="m.tracked">{{ m.have }} / {{ m.target }}{{ m.unit }}</ng-container>
              <ng-container *ngIf="!m.tracked">target {{ m.target }}{{ m.unit }}</ng-container>
            </span>
          </div>
          <div class="overall-progress-track" *ngIf="m.tracked">
            <div class="overall-progress-fill" [style.width.%]="m.pct"></div>
          </div>
          <p class="macro-note" *ngIf="!m.tracked">Not itemised per meal in the plan.</p>
        </div>
      </div>

      <div class="card">
        <span class="card-label">Today's meals</span>
        <div class="meal-row" *ngFor="let m of meals()">
          <span class="meal-main">
            <span class="meal-name">{{ m.meal }}</span>
            <span class="meal-food">{{ m.food }}</span>
          </span>
          <span class="meal-kcal">{{ m.calories }} kcal</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head" style="margin-bottom: 0">
          <label class="fit-check">
            <input type="checkbox" [checked]="checked()"
                   (change)="toggle($any($event.target).checked)" />
            On plan today
          </label>
          <span class="card-count">{{ state.fitnessWeekProgress().pct }}% this week</span>
        </div>
      </div>

      <app-fold label="Daily targets">
        <p class="setting-note">{{ dietTargets }}</p>
      </app-fold>

      <app-fold label="Supplements" [note]="supplements.length + ''">
        <div class="meal-row" *ngFor="let s of supplements">
          <span class="meal-main">
            <span class="meal-name">{{ s.supplement }}</span>
            <span class="meal-food">{{ s.notes }}</span>
          </span>
          <span class="meal-kcal">{{ s.when }}</span>
        </div>
      </app-fold>

      <app-fold label="Diet rules">
        <ul class="fit-list">
          <li *ngFor="let r of dietRules">{{ r }}</li>
        </ul>
      </app-fold>

      <p class="footnote">{{ medicalDisclaimer }}</p>
    </section>
  `,
})
export class DietComponent {
  dietTargets = DIET_TARGETS;
  supplements = SUPPLEMENTS;
  dietRules = DIET_RULES;
  medicalDisclaimer = MEDICAL_DISCLAIMER;
  macros = MACRO_TARGETS;

  vegDay = signal(false);

  meals = computed(() => (this.vegDay() ? VEG_MEALS : NONVEG_MEALS));
  totals = computed(() => mealTotals(this.meals()));
  remaining = computed(() => MACRO_TARGETS.kcal - this.totals().calories);

  /**
   * Macro progress against target.
   *
   * Carbs and fat are not itemised per meal anywhere in the plan, so they render as the
   * target alone rather than a bar that would imply a measurement nobody took.
   */
  macroRows = computed(() => {
    const totals = this.totals();
    return [
      {
        label: 'Protein', have: totals.protein, target: MACRO_TARGETS.protein, unit: ' g',
        pct: Math.min(100, Math.round((totals.protein / MACRO_TARGETS.protein) * 100)),
        tracked: true,
      },
      { label: 'Carbs', have: 0, target: MACRO_TARGETS.carbs, unit: ' g', pct: 0, tracked: false },
      { label: 'Fat', have: 0, target: MACRO_TARGETS.fat, unit: ' g', pct: 0, tracked: false },
    ];
  });

  constructor(public state: StateService) {}

  checked(): boolean { return this.state.isFitnessLogged(`${todayIso()}:diet`); }
  toggle(value: boolean) { this.state.toggleFitnessLog(`${todayIso()}:diet`, value); }
}
