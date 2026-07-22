# Changelog

All notable changes to Pourcast are recorded here. This doubles as the
"What's New" text for App Store / TestFlight releases.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [Unreleased]

### Changed
- Refactored the single `index.html` into `index.html` + `styles.css` + `app.js` for maintainability (no behavior change). `sync-ios.sh` now bundles all three into the iOS payload.

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

[Unreleased]: https://github.com/binh4thewin/pourcast/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/binh4thewin/pourcast/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/binh4thewin/pourcast/releases/tag/v1.0.0
