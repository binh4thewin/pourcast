# Changelog

All notable changes to Pourcast are recorded here. This doubles as the
"What's New" text for App Store / TestFlight releases.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [Unreleased]

_In progress: native (Capacitor/iOS) Bluetooth support — routing the six scale adapters through `@capacitor-community/bluetooth-le`. Not yet complete; needs verification on a real device + scale (see `pourcast-ios/RUNBOOK.md`)._

## [1.3.0] — 2026-07-23

### Added
- New brewing recipe **"Basic 60/40 · Two Pours"** — a beginner-friendly V60 method: bloom (15%) with a ~30s rest, one larger pour for 60% of the post-bloom water, a stir, then a final pour for the last 40%. Adaptive timing; ratio 1:16.

### Fixed
- **4:6** and **4:6 Sweet** recipes: the drain before the 5th pour was `20s` instead of `35s`, so the final pour landed ~15s early and broke the fixed 45s clock. Corrected to `35s`; pours now fall on 0:00 / 0:45 / 1:30 / 2:15 / 3:00.

## [1.2.0] — 2026-07-22

### Changed
- Refactored the single `index.html` into `index.html` + `styles.css` + `app.js` for maintainability (no behavior change). `sync-ios.sh` now bundles all three into the iOS payload.

### Added
- Native Bluetooth bridge (Capacitor/iOS) scaffolding in `app.js`: a Web-Bluetooth-shaped shim over `@capacitor-community/bluetooth-le` so the existing scale adapters and byte-parsers are reused unchanged inside the native app. Falls back to Web Bluetooth on the web build.

## [1.1.0] — 2026-07-21

### Added
- Two new looks built from the Succulent Hues palette: **Adobe** (warm blush background, terracotta primary button) and **Sage** (cool sage-green background, olive primary button).
- App version now shown at the bottom of the Settings screen.

### Changed
- Theme lineup is now Max · Adobe · Sage · Burnt.

### Removed
- The old "Cactus" theme.

### Fixed
- Old saved "Cactus" preference now migrates automatically to Adobe on load.

## [1.0.0] — baseline

- First tracked release: the two-mode brew experience (Just Brew / Brew Print), live pour-pacing timer, optional Bluetooth scale support, and the Max / Cactus / Burnt looks.

[Unreleased]: https://github.com/binh4thewin/pourcast/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/binh4thewin/pourcast/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/binh4thewin/pourcast/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/binh4thewin/pourcast/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/binh4thewin/pourcast/releases/tag/v1.0.0
