# Pourcast Two-Mode Plan

One codebase. Stored `mode` key: `basic` | `print`. Brew engine, timer, scale stack untouched.

## Phase 1 — Mode foundation
- First-run picker: "Just brew" / "Tune & record". Switchable in Settings.
- `body.basic` class gates all simplifications.

## Phase 2 — Scale to Settings
- Move Connect/All devices/Simulator + BLE log into Settings.
- Main screen: status dot only, next to ⚙.

## Phase 3 — Basic Brew setup
Two inputs, one button:
- **Dose (g)** — how much coffee you have. Water/temp/pours derived at 1:16 V60 default (bloom 2×dose, 2–3 pours).
- **Roast: Light / Medium / Dark** — drives temp. Set once per bag.
- **Brew** button.

Returning user: opens to **Brew Again** — last dose/roast shown, one tap. Edit dose inline if it changed.

No bean library. No method picker. No taste goals. No recipe text.

## Phase 4 — Basic brew screen
- Bare cumulative numbers only: **180g** / **0:45**. No labels, no verbs.
- On-screen number = what the scale reads right now. Tare once at GO, never mid-brew. No per-pour amounts, no math.
- Keep: timer, water bar, pause/stop.
- Hide: step list, flow gauge, pace badge, brew print capture.
- No rating screen. Auto-save to log.

## Phase 5 — Brew Print
- Everything current stays. Adopt bare cumulative numbers in pour instruction too.

## Phase 6 — Verify
Fresh install → picker; Basic brew w/ simulator; Brew Again; mode switch; Brew Print regression; scale connect from Settings; all themes.

## Ship order
1 → 2 → 4 → 3 → 5.
