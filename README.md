# ☕ Pourcast

**Make the perfect pour over coffee — pour over ratios made easy.**

Pourcast is a guided brewing companion for pour-over, AeroPress, French press, and
Vietnamese phin. Pick a method, enter your coffee amount, and it handles the rest:
every pour amount and timing calculated for you, real-time pace coaching, and honest
feedback afterward on what went wrong and what to change next time.

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

## Connecting an Acaia Pearl (or other Bluetooth scale)

**Requirements — all three, no exceptions:**
1. The app must be open at its **https://** address (Bluetooth is blocked on
   non-secure pages and on files opened from disk).
2. Browser must be **Chrome or Edge on desktop**, or **Chrome on Android**.
   iPhone and iPad do not work — no browser on iOS supports Web Bluetooth.
   (This is why a native iOS app is on the roadmap.)
3. The scale must **not** be paired in your computer/phone's Bluetooth
   settings. If it appears there, choose "Forget / Remove" first — OS-level
   pairing blocks the browser from reaching it.

**Steps:**
1. Turn the Pearl on and set it on the counter near your computer.
2. In the app, the **Scale** card shows a red dot ("Not connected"). Tap
   **Connect**.
3. A device picker pops up. Select your scale — it appears as
   **PEARL-xxxx** or **ACAIA-xxxx** — and confirm.
4. Success: the dot turns **green**, the status names your scale and protocol
   (e.g. "Connected: PEARL (Acaia)" or "(Acaia (Pearl/legacy))" for older
   firmware — both are supported), and the card folds itself to a green
   one-line summary. Put a mug on the scale: the app's live weight should
   track it.

**If it doesn't connect:** tap the folded Scale header to reopen the card,
then tap the status line — a step-by-step Bluetooth debug log opens showing
exactly where the handshake stopped. That log is the diagnosis; report it
and the fix is usually a one-line adapter change.

No scale? Everything works without one — the **Simulator** button runs the
full experience with generated weight (yellow dot, "SIM" badge).

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
