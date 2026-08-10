# Changelog

All notable changes to Pourcast are recorded here. This doubles as the
"What's New" text for App Store / TestFlight releases.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [Unreleased]

_Native (Capacitor/iOS) Bluetooth is implemented in code but still needs verification on a real device + scale before an iOS/App Store release (see `pourcast-ios/RUNBOOK.md`). The web build is unaffected by it._

## [1.4.4] — 2026-08-10

### Added
- **Grind-size coaching.** In Brew Print, the final drawdown no longer auto-ends — you tap **"Cup drained ✓"** the moment the bed goes dry. The timer keeps counting past the estimate, and the finish screen reads that time back as a grind signal: ran long → grind may be too fine (go coarser); finished early → may be too coarse (go finer); on the estimate → dialed in. A `± vs est.` tag shows the gap at a glance.

### Changed
- The completed timer now shows the **real** finish time instead of snapping to the estimated total, so an over- or under-run is visible rather than hidden. (Autopilot "Just Brew" and immersion recipes still end on the clock.)

### Fixed
- The step and water progress bars now fill via `transform: scaleX()` instead of animating `width`, so the fill is GPU-composited and no longer triggers layout on every tick — smoother motion, especially on iOS. (Respects reduced-motion.)

## [1.4.3] — 2026-07-24

### Changed
- Trimmed the theme lineup to **Max · Haze · Burnt** to keep the choice simple. A saved Adobe look now migrates to Haze automatically.
- Tightened the tagline — dropped "Make the perfect pour over coffee," leaving the "Pour over ratios made easy" badge.
- Reworded the Brew Print description: "…likes to fine-tune their pour over routine."

### Removed
- The **Adobe** theme (it overlapped Haze).

## [1.4.2] — 2026-07-24

### Added
- **SEO / AI discoverability**: a meta description, Open Graph + Twitter card tags, a canonical URL, and `WebApplication` JSON-LD structured data (name, description, free-offer, and real feature list) so search engines and AI assistants (ChatGPT, Perplexity, Google AI Overviews) can understand and cite the app.

## [1.4.1] — 2026-07-24

### Fixed
- **Water bar** no longer overflows its rounded container when full — the fill is clipped cleanly to the pill. Also removed the pour-target tick marks, which broke out of the bar when it scaled or shifted.
- **Burnt theme** "Just Brew / Brew Print" toggle: the first tab was inheriting Burnt's all-corners button radius, so it was a different shape than the second tab. Both are now matching left/right-rounded halves of one pill.

### Changed
- Page title updated to "POURCAST - Make the perfect pour over coffee".

## [1.4.0] — 2026-07-24

### Added
- **Haze** — a new calming theme: a soft pastel-sky gradient (peach → periwinkle → watery teal) with frosted cards. Replaces Sage in the lineup (Max · Adobe · Haze · Burnt).
- The brew screen now shows the **brewer name** at the top, and teaching cues on the wait steps: **"Wait, let it bloom"** during the bloom rest and **"Last step · Drawdown"** at the finish.
- A live **step countdown** (mm:ss.s) showing exactly how much time is left in the current step.

### Changed
- **Brew screen redesign**: the total-time counter is tucked into the top-left corner (mm:ss), the instruction is the centered focus, and Exit / Pause / Next are anchored to the bottom of the screen.
- Calmer brewing feel: quieter tenths, a de-emphasized per-pour countdown, a smoothed progress-bar fill (respects reduced-motion), and tabular figures so the numbers don't jitter.
- The total-time counter is now clean mm:ss (no tenths), and the completed timer lands exactly on the goal time.
- While paused, the Next-step button is hidden — the only actions are Resume or Exit.
- Native (Capacitor/iOS) Bluetooth scale support is now implemented in code; the web build is unaffected. Pending on-device verification.

### Fixed
- Respect iOS safe areas: the settings gear and header controls no longer clip past the screen edge.
- The 3-2-1 countdown overlay is now fully opaque — the brew screen no longer bleeds through it.
- Burnt theme frame now shows only the left/right side rails (removed the top/bottom lines that crossed the notch and home indicator).

### Removed
- The **Sage** theme (reworked into Haze; a saved Sage look now shows as Haze automatically).

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
