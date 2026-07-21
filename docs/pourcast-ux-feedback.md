# Pourcast UX Feedback — Consolidated

Source: user feedback gathered on the live app, discussed 2026-07-14.

## Core problem

The app currently leads with mechanics (method name, ratio, pour schedule) when
most users just want an outcome. Design/complexity is getting in the way of
people actually using it day to day.

## 1. Two modes, not one app

Split the experience by mental model, not by feature gating:

- **Basic Brew** — for people who just want coffee. No method names, no
  instructions, minimal screen.
- **Brew Print** — for people who want to tune and record. Method picker,
  ratio tuning, gear-change techniques, live weight/flow graph, full brew log.
  (Name already fits — "brew print" is an existing concept: weight + flow
  graph recorded per brew.)

Mode is chosen once, up front. Everything downstream (screens, copy, how busy
it's allowed to look) follows from that choice.

## 2. Basic Brew specifics

- **Bean input:** just Light / Medium / Dark — no roaster/bean library lookup.
  This alone drives the "ideal" water temp recommendation.
- **Taste goal instead of method:** ask "what do you want it to taste like"
  (balanced / bright / strong / smooth), not "pick a method." App runs a solid
  default recipe behind the scenes.
- **No recipe instructions shown.** Morning brewing is autopilot, not a
  learning moment — don't explain the pour, just run it.
- **On-screen number = the target, not an instruction.**
  - Old: "Pour 74g over 15 seconds"
  - Wrong fix: "Pour target: 74g"
  - Right: just the number. **74g** / **0:15**. No label, no verb, no filler
    words. People are watching a scale and a clock — the screen should look
    like that.
  - The number shown should always be the *cumulative* target (what the scale
    should read right now), never an incremental "add this much more" amount.
- **Repeat-morning flow:** "Brew Again" (one-tap restore of last setup) should
  be the default front door. Bean/taste-goal decisions happen once per bag,
  not every morning.

## 3. Brew Print specifics

Keeps everything that currently exists and is "busy" by nature:

- Method selection (4:6, gear-change V60, five even pours, AeroPress, French
  press, Chemex, Kalita, iced, etc.)
- Ratio/dose tuning, drainage-physics warnings
- Bean library (roaster → bean, roast tracking, freshness)
- Live weight + flow graph, recorded brew print per brew
- Brew log with ratings, taste tags, grinder settings, dial-in insights

This is where advanced settings live guilt-free — people who open this mode
are choosing complexity, not stumbling into it.

## 4. Scale connection

Move **Scale Connect** out of the top of the main screen and into Settings.
It's a one-time setup step, not a daily decision. Main screen should only
show a quiet status indicator (small dot/badge), not a full card.

## Open tension to resolve

Binh wants methods and depth (Brew Print). His wife wants something basic
with zero method exposure. The two-mode split is the proposed resolution —
neither version has to compromise for the other.
