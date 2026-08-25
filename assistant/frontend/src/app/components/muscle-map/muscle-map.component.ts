import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MuscleGroup } from '../../fitness-data';

/**
 * Anterior anatomy as vector shapes, one per muscle belly, each tagged with the group it
 * belongs to. Which bellies light is driven by `active` — derived from the session's own
 * exercises via `musclesFor()` — so editing a workout day cannot leave the figure lying
 * about what that day trains. A rendered image can't do that; this is the reason the map
 * is drawn rather than photographed.
 *
 * Anatomy is symmetric, so the half-body is authored once against centre x=120 and mirrored
 * with a transform. That halves the path work and guarantees the two sides actually match.
 */
@Component({
  selector: 'app-muscle-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="bodymap" viewBox="0 0 240 470" role="img"
         [attr.aria-label]="ariaLabel()">
      <defs>
        <!--
          userSpaceOnUse is load-bearing. Several bellies are drawn as axis-aligned rects
          whose bounding box has zero area in one dimension; an objectBoundingBox gradient
          on those is undefined per spec, and the element silently does not paint at all.
          Fixed coordinates sidestep it.
        -->
        <linearGradient id="mgHot" gradientUnits="userSpaceOnUse" x1="60" y1="60" x2="180" y2="440">
          <stop offset="0%" stop-color="#ffb020" />
          <stop offset="45%" stop-color="#ff6b1a" />
          <stop offset="100%" stop-color="#d9480f" />
        </linearGradient>
        <filter id="mgBloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g filter="url(#mgBloom)">
        <circle class="mg" cx="120" cy="36" r="24" />
        <rect class="mg" x="109" y="56" width="22" height="18" rx="8" />

        <ng-container *ngTemplateOutlet="half" />
        <g transform="translate(240,0) scale(-1,1)">
          <ng-container *ngTemplateOutlet="half" />
        </g>
      </g>
    </svg>

    <!--
      The svg: prefix is required: this ng-template lives outside the <svg> element, so
      without it Angular parses these as HTML elements in the XHTML namespace and the
      compiler rejects them as unknown. The prefix puts them in the SVG namespace so the
      same fragment can be stamped into the svg twice, once mirrored.
    -->
    <ng-template #half>
      <svg:path    class="mg" [class.on]="on('traps')"    d="M120 68 L92 84 L100 104 L120 96 Z" />
      <svg:ellipse class="mg" [class.on]="on('delts')"    cx="78" cy="114" rx="20" ry="23" />
      <svg:path    class="mg" [class.on]="on('chest')"    d="M118 94 C100 94 84 102 84 120 C84 138 102 145 118 141 Z" />
      <svg:ellipse class="mg" [class.on]="on('biceps')"   cx="69" cy="162" rx="14" ry="29" />
      <svg:ellipse class="mg" [class.on]="on('triceps')"  cx="84" cy="158" rx="8"  ry="26" />
      <svg:ellipse class="mg" [class.on]="on('forearms')" cx="59" cy="219" rx="12" ry="33" />
      <svg:ellipse class="mg"                             cx="54" cy="259" rx="9"  ry="14" />
      <svg:path    class="mg" [class.on]="on('lats')"     d="M84 124 C74 146 78 176 92 196 L100 150 Z" />
      <svg:rect    class="mg" [class.on]="on('abs')"      x="103" y="150" width="15" height="21" rx="5" />
      <svg:rect    class="mg" [class.on]="on('abs')"      x="103" y="176" width="15" height="21" rx="5" />
      <svg:rect    class="mg" [class.on]="on('abs')"      x="103" y="202" width="15" height="21" rx="5" />
      <svg:path    class="mg" [class.on]="on('obliques')" d="M101 152 C92 168 92 200 100 226 L100 152 Z" />
      <svg:ellipse class="mg" [class.on]="on('glutes')"   cx="100" cy="248" rx="19" ry="16" />
      <!-- Legs sit off-centre with a deliberate gap at x=120: mirrored ellipses that meet
           in the middle read as one blob rather than two limbs. -->
      <svg:ellipse class="mg" [class.on]="on('quads')"    cx="96"  cy="302" rx="21" ry="49" />
      <svg:ellipse class="mg" [class.on]="on('hams')"     cx="110" cy="300" rx="7"  ry="42" />
      <svg:ellipse class="mg"                             cx="97"  cy="354" rx="13" ry="12" />
      <svg:ellipse class="mg" [class.on]="on('calves')"   cx="96"  cy="398" rx="15" ry="34" />
      <svg:ellipse class="mg"                             cx="95"  cy="442" rx="12" ry="10" />
    </ng-template>
  `,
})
export class MuscleMapComponent {
  @Input() active: MuscleGroup[] = [];

  on(group: MuscleGroup): boolean {
    return this.active.includes(group);
  }

  ariaLabel(): string {
    return this.active.length
      ? `Anatomical front view. Today's session loads: ${this.active.join(', ')}.`
      : 'Anatomical front view. Rest day — no muscle groups highlighted.';
  }
}
