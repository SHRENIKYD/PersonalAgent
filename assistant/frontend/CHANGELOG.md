# Changelog

Every released build of ECHO, newest first.

The version in `package.json` is the only place the number is written by hand; the app
bundle, the Android manifest and the CI build stamp are all generated from it by
`scripts/sync-version.mjs`. Bump it there, add a section here, and the rest follows.

**MAJOR** for a change that breaks stored data or forces a reinstall, **MINOR** for a new
capability, **PATCH** for fixes to what already shipped.

## [Unreleased]

### Changed
- Every screen rebuilt to the Bloom mockup, not just restyled. Today opens on the session
  you are doing rather than a progress ring; Workout is a card per movement carrying the
  library's photograph of it; Tasks, Notes, News, Diet and Growth are card lists with
  filters; Settings opens on an identity card.

### Removed
- The muscle map, the rest timer, the exercise-library search, the weekly-split table and
  the six-day accordion — none are in the mockup. The library's photographs stay, now shown
  on the movement you are actually doing.

## [1.1.0] — 2026-09-02

### Removed
- Speech, in both directions. The spoken greeting, the voice picker, the Voice section,
  hands-free mode, and the microphone button that dictated into the composer — with their
  services, the transcript hint the assistant used to be given, and their styles. ECHO is
  typed and read now.
- The separate beta app. Its workflow, environment file and Angular build configuration
  are gone; there is one app again. The `beta` flag stays in `environment.ts` at `false`
  as the documented hook for unfinished work, though nothing reads it any more.

### Changed
- The interface itself is Bloom now, not the old one recoloured. Rounded cards on a soft
  lift, a floating capsule navigation bar, sentence-case headings, capsule controls, and a
  ground with nothing moving on it. The HUD corner brackets, the rotating radial
  background and the ECG band across the header are deleted.

### Added
- Bloom Indigo, light and dark, replacing the ember-on-near-black palette, with an
  Appearance setting that defaults to following the phone.
- A launch screen that types out what the app remembers about you — your last session,
  your weight, what is overdue — instead of a fake boot sequence.
- Version numbers. Until now a build could only be identified by its commit sha, which tells
  you two builds differ but not which is newer — the app, the APK and the release asset now
  all carry the same semantic version.
- `CHANGELOG.md`, this file.

## [1.0.0] — 2026-09-02

The first numbered release. Everything below shipped before versioning existed and is
recorded here from the commit history, so the number is a starting line rather than a claim
that this is when the work happened.

### Added
- Exercise library: 873 movements from the free-exercise-db (public domain), searchable by
  name, muscle and equipment, with 1,746 photographs bundled into the app.
- Personal-record detection on every logged set — heaviest weight, best estimated 1RM, and
  most reps at a top weight.
- A body-weight target with the gap to it shown on the trend.
- Tasks, notes, a six-month roadmap with habits, a diet log with macros, and a news feed.
- Backup and restore to a file, and optional sync through a private GitHub Gist.
- Android APK builds, stable and beta, installable side by side.

### Removed
- The on-device LLM experiment and the WebGL scene, neither of which earned their size.
