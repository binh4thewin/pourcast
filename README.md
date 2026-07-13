# ☕ Pourcast

**How much water, exactly when — at any ratio.**

Pourcast is a brewing companion for pour-over, AeroPress, and French press. Pick a
method, dial in your dose, and it tells you exactly what to do and when — scaling
every pour to *your* numbers, coaching your pace in real time, and telling you
afterward what went wrong and what to change.

**Live app → https://binh4thewin.github.io/pourcast/**

---

## What it does

- **Champion-technique recipes** — 4:6, gear-change V60, five even pours, sealed-steep
  AeroPress, patient French press, Chemex, Kalita, iced methods, and more. Rigid
  "competition clock" methods and adaptive methods that scale pour timing honestly.
- **Any dose, any ratio** — change coffee, ratio, or water and every pour target and
  step recalculates. Drainage physics warns you when a dose won't drain in a
  method's fixed windows.
- **Bluetooth scales** — connects directly to Acaia and Felicita scales (with a
  generic auto-detect fallback for many others) over Web Bluetooth. Live weight,
  pour-pace coaching, and a recorded **brew print** (weight + flow graph) for every
  brew. No scale? A built-in simulator runs the full experience.
- **A brew log that's yours** — unlimited, on your device, with ratings, taste tags,
  grinder settings, and data-aware insights ("drawdown ran long *and* you tagged
  bitter — grind coarser"). One-tap **Brew Again** restores any past setup.
- **Bean library** — roaster → bean pickers that remember each bean's roast level,
  with roast-aware water-temperature advice and freshness tracking. Ships with the
  Stumptown catalog built in.
- **Three looks** — Max (loud), Cactus (desert calm), Burnt (ink-outlined boutique).

## Using it

Open the live link above in **Chrome or Edge** (desktop or Android).
iPhone/iPad note: everything works *except* Bluetooth scales — iOS Safari has no
Web Bluetooth. A native iOS app is on the roadmap for exactly this reason.

To connect a scale: power it on (don't pair it in your OS settings), tap
**Connect scale**, choose it from the popup. Tap the connection status line any
time to open a step-by-step Bluetooth debug log.

## Privacy

Everything — settings, brew log, bean library — lives in your browser's local
storage. No account, no server, no analytics, no data leaves your device.

## Roadmap

- [ ] Wake-lock + audio step cues
- [ ] Installable PWA (offline, home-screen)
- [ ] Log & library export/import
- [ ] More named scale protocols (Fellow Tally next)
- [ ] Native iOS app (Capacitor) with scale support
- [ ] Reserve tier: cloud sync, trends, per-bag dial-in memory

## Development

Single-file app: all HTML/CSS/JS ships as `index.html`. The source is developed as
`shell.html` + `app.js`, assembled and published through a fail-fast pipeline:
structural gates (balanced markup, every JS-referenced DOM id present, no personal
names in displayed recipe text) → hard-assert unit tests (recipes, ratio math,
pause clock, scale protocol decoding, themes, persistence) → jsdom full-journey
boot test → publish. Nothing ships if anything fails.

## License

Copyright © 2026. All rights reserved. Source is visible for transparency; see
[LICENSE](LICENSE) for terms.
