import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import {
  DIET_RULES,
  DIET_TARGETS,
  MEDICAL_DISCLAIMER,
  NONVEG_MEALS,
  SUPPLEMENTS,
  VEG_MEALS,
  WEEKLY_SCHEDULE,
  WORKOUT_DAYS,
  WORKOUT_PROGRESS,
  WORKOUT_RULES,
} from '../../fitness-data';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-fitness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <h1 class="page-title">Fitness &amp; Diet</h1>
      <p class="page-sub">Your recomposition plan — build muscle, lose belly fat. Reference below; check off today's work as you go.</p>

      <h2 class="section-title">Today</h2>
      <div class="fit-today-row">
        <label class="fit-check">
          <input type="checkbox" [checked]="checked('workout')" (change)="toggle('workout', $any($event.target).checked)" />
          Workout done today
        </label>
        <label class="fit-check">
          <input type="checkbox" [checked]="checked('diet')" (change)="toggle('diet', $any($event.target).checked)" />
          On-plan with diet today
        </label>
        <span class="pill complete">{{ state.fitnessWeekProgress().pct }}% this week</span>
      </div>

      <h2 class="section-title">Weekly split</h2>
      <div class="fit-table-wrap">
        <table class="fit-table">
          <thead>
            <tr><th>Day</th><th>Time</th><th>Session</th><th>Length</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of schedule">
              <td>{{ r.day }}</td><td>{{ r.time }}</td><td>{{ r.session }}</td><td>{{ r.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="prep-topic" *ngFor="let day of workoutDays; let i = index">
        <button class="prep-topic-head" (click)="toggleDay(i)">
          <span class="prep-topic-chevron" [class.open]="isDayOpen(i)">›</span>
          <span class="prep-topic-name">{{ day.name }}</span>
        </button>
        <div class="prep-problem-list" *ngIf="isDayOpen(i)">
          <div class="fit-table-wrap">
            <table class="fit-table">
              <thead><tr><th>Exercise</th><th>Sets × Reps</th><th>Rest</th></tr></thead>
              <tbody>
                <tr *ngFor="let ex of day.exercises">
                  <td>{{ ex.name }}</td><td>{{ ex.sets }}</td><td>{{ ex.rest }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="fit-note" *ngIf="day.extra">{{ day.extra }}</p>
        </div>
      </div>

      <h2 class="section-title">Training rules</h2>
      <ul class="fit-list">
        <li *ngFor="let r of workoutRules">{{ r }}</li>
      </ul>

      <h2 class="section-title">Expected progress</h2>
      <ul class="fit-list">
        <li *ngFor="let p of workoutProgress">{{ p }}</li>
      </ul>

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
export class FitnessComponent {
  schedule = WEEKLY_SCHEDULE;
  workoutDays = WORKOUT_DAYS;
  workoutRules = WORKOUT_RULES;
  workoutProgress = WORKOUT_PROGRESS;
  dietTargets = DIET_TARGETS;
  nonvegMeals = NONVEG_MEALS;
  vegMeals = VEG_MEALS;
  supplements = SUPPLEMENTS;
  dietRules = DIET_RULES;
  medicalDisclaimer = MEDICAL_DISCLAIMER;

  private openDays = signal<Set<number>>(new Set());

  constructor(public state: StateService) {}

  checked(kind: 'workout' | 'diet'): boolean {
    return this.state.isFitnessLogged(`${todayIso()}:${kind}`);
  }

  toggle(kind: 'workout' | 'diet', value: boolean) {
    this.state.toggleFitnessLog(`${todayIso()}:${kind}`, value);
  }

  isDayOpen(i: number): boolean {
    return this.openDays().has(i);
  }

  toggleDay(i: number) {
    this.openDays.update(set => {
      const next = new Set(set);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }
}
