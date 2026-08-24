# ECHO — art brief for the Fitness hero renders

Everything needed to generate the 3D-style figures and hand them back for wiring in.

## Palette (paste into any prompt that accepts hex)

| Role | Hex |
| --- | --- |
| Ember (primary glow) | `#FF6B1A` |
| Amber (hot highlight) | `#FFB020` |
| Deep ember (shadow side) | `#D9480F` |
| Ground (near-black) | `#0A0A0C` |

## File format — what I need back

| | |
| --- | --- |
| **Format** | **PNG with transparent background** (not JPG — JPG has no alpha and bakes in a black box that shows as a grey rectangle over the app's gradient) |
| **Size** | 1024 × 1536 portrait for full-body; 1024 × 1024 for bust/square |
| **Subject** | Centred, full figure inside frame, ~8% padding so nothing crops on narrow phones |
| **Count** | Generate 6–8 per prompt, send the 2–3 you like — I'll pick for how they sit against the layout |
| **Naming** | `hero-front.png`, `hero-pose.png`, `coach-avatar.png` |

If your tool won't do transparency, send it on **flat `#0A0A0C`** — that matches the app
background exactly, so it reads as cut out anyway.

---

## Prompt 1 — anatomical muscle figure (the main hero)

> Full-body male anatomical figure, front view, standing straight, arms slightly away from
> the body. Muscles rendered as glowing volumetric ember orange (#FF6B1A) fading to amber
> (#FFB020) at the highlights, deep ember (#D9480F) in the shadow side. Dark charcoal
> (#0A0A0C) body base so the muscle groups read as lit from within. Studio rim lighting from
> behind. Clean transparent background. Symmetrical, centred, full body in frame, head to
> feet. Fitness app UI asset, high detail, medical-illustration accuracy, no text, no logos,
> no background elements.

**Negative prompt** (if your tool has the field):
`text, watermark, logo, background scenery, cropped limbs, extra limbs, deformed hands, gym equipment, clothing, multiple figures`

---

## Prompt 2 — athletic hero photo (the "BURN / PUSH / ACHIEVE" style panel)

> Athletic muscular man, mid-thirties, side-lit torso, holding a dumbbell at his side,
> looking toward camera. Dramatic orange rim light (#FF6B1A) tracing the shoulder and arm
> edges against a near-black (#0A0A0C) background. Cinematic gym lighting, high contrast,
> sweat detail, shallow depth of field. Vertical composition with the figure on the right
> third and empty dark space on the left for headline text. Photorealistic, fitness app hero
> image, no text, no logos.

**Negative:** `text, watermark, logo, cluttered background, low contrast, blue or green lighting, full gym visible`

---

## Prompt 3 — AI coach avatar (the "FitCoach AI" figure)

> Sleek humanoid AI robot coach, matte black body panels with glowing ember orange (#FF6B1A)
> seams and a single amber (#FFB020) visor light. Athletic proportions, confident standing
> pose, arms crossed. Studio product-render lighting, soft reflections on the panels.
> Transparent background, full body centred in frame. 3D render, fitness app mascot,
> high detail, no text, no logos.

**Negative:** `text, watermark, logo, weapons, aggressive expression, background scenery, multiple figures`

---

## Tools, in the order I'd try them

1. **ChatGPT Plus / Gemini** — paste the prompt as-is, ask for a transparent PNG. Easiest.
2. **Midjourney** — append `--ar 2:3 --style raw --v 7` to prompts 1 and 2. Best quality of
   the three; the Dribbble boards you sent are mostly this.
3. **Adobe Firefly** — the only one of the three with an explicit "transparent background"
   toggle, and its licence terms are the cleanest if this ever goes public.

If backgrounds come out solid, `remove.bg` or Photoshop's *Remove Background* will cut them
in one click.

---

## What happens when you send them

Drop the PNGs into `assistant/frontend/src/assets/`. Prompt 1's output replaces the SVG
muscle map's slot on the Fitness hero, prompt 2 goes at the top of the Fitness tab, prompt 3
goes beside the assistant on the Chat tab.

One thing worth deciding: the **SVG muscle map stays either way**. A render is one fixed
image — it looks the same on chest day and leg day. The SVG map lights up the groups today
actually loads, read from `WORKOUT_DAYS`. Best result is both: the render as the hero
picture, the map as the working display underneath it.
