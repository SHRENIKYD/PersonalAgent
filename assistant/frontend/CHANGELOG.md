# Changelog

Every released build of ECHO, newest first.

The version in `package.json` is the only place the number is written by hand; the app
bundle, the Android manifest and the CI build stamp are all generated from it by
`scripts/sync-version.mjs`. Bump it there, add a section here, and the rest follows.

**MAJOR** for a change that breaks stored data or forces a reinstall, **MINOR** for a new
capability, **PATCH** for fixes to what already shipped.

## [Unreleased]

### Added
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
