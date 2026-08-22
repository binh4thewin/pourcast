# Pourcast → TestFlight Runbook

This wraps your existing Pourcast web app (`index.html`) in a native iOS shell
using **Capacitor**, so you can distribute it on TestFlight.

**What works in this first build:** the entire app — recipes, ratio math, brew
log, bean library, themes, timer-guided brewing, and the built-in scale
**simulator**.

**What does NOT work yet:** connecting to a real Bluetooth scale (Acaia, etc.).
iOS's WKWebView has no Web Bluetooth, so the app will behave exactly as it does
on an iPhone browser today — it falls back to guided/simulator mode. Native
scale support is **Milestone 2** (outlined at the bottom); it needs to be built
and tested on your Mac against your Pearl, which is why it's separate.

Everything below runs on **your Mac**. Commands go in Terminal unless noted.

---

## 0. One-time setup (do once, ever)

1. **Install Xcode** — free, from the Mac App Store. Open it once after
   installing so it finishes its first-run component install. Then run:
   ```
   sudo xcode-select --install
   ```
2. **Install Node.js** (includes `npm`) — download the LTS installer from
   https://nodejs.org. Verify:
   ```
   node -v && npm -v
   ```
3. **Install CocoaPods** (Capacitor uses it for iOS dependencies):
   ```
   sudo gem install cocoapods
   ```
   (On Apple Silicon, if that errors, use: `brew install cocoapods`.)
4. **Join the Apple Developer Program** — $99/year, at
   https://developer.apple.com/programs/. Required for TestFlight. Approval
   can take a day. Do this early.

---

## 1. Install Capacitor into this project

In Terminal, `cd` into this folder (the one containing this runbook):

```
cd "/Users/binhjo/Documents/Claude Cowork/Personal/Pourcast/pourcast-ios"
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

`package.json`, `capacitor.config.json`, and `www/` (your app) are already set
up. The app id is **com.pourcast.app** and the name is **Pourcast** — change
these in `capacitor.config.json` before the next step if you want a different
bundle identifier (it must be globally unique on the App Store).

---

## 2. Generate the native iOS project

```
npx cap add ios
npx cap sync ios
```

This creates an `ios/` folder — a real Xcode project that loads your `www/`
files. `sync` copies your web assets in and installs native dependencies.

**App icon:** the `ios/` folder is generated and NOT tracked in git, so if you
regenerate it you must re-apply the app icon. The 1024×1024 master lives at
`pourcast-ios/assets/icon.png` (tracked). To apply it, copy it over the default:

```
cp pourcast-ios/assets/icon.png \
  pourcast-ios/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

(Or, for all sizes/splash at once: `npm i -D @capacitor/assets` then
`npx @capacitor/assets generate --ios`, using `pourcast-ios/assets/icon.png`.)
The icon must stay 1024×1024 with **no alpha channel** or the App Store rejects it.

---

## 3. Open in Xcode and set signing

```
npx cap open ios
```

Xcode opens. In the left sidebar click the blue **App** project → select the
**App** target → **Signing & Capabilities** tab:

- Check **Automatically manage signing**.
- Set **Team** to your Apple Developer account (sign in via Xcode →
  Settings → Accounts if it's not listed).
- Confirm the **Bundle Identifier** is `com.pourcast.app` (or your chosen id).

---

## 4. Test on your own iPhone first (optional but recommended)

Plug in your iPhone, select it as the run target at the top of Xcode, and press
the **▶ Run** button. The app installs and launches on your phone. Confirm the
brew flow, themes, and simulator all work. (Bluetooth scale will show its
"not supported / guided mode" state — expected for now.)

---

## 5. Archive and upload to TestFlight

1. At the top of Xcode, set the run target to **Any iOS Device (arm64)**
   (not a simulator — you can't archive for a simulator).
2. Menu: **Product → Archive**. Wait for the build.
3. The **Organizer** window opens with your archive. Click
   **Distribute App → App Store Connect → Upload**. Accept the defaults and
   let it validate and upload.

First upload only: go to https://appstoreconnect.apple.com → **My Apps → +
→ New App**, and register the app using the same bundle id
(`com.pourcast.app`). You only do this registration once.

---

## 6. Turn on TestFlight

In App Store Connect → your app → **TestFlight** tab:

- Your uploaded build appears (status "Processing" for a few minutes, then
  "Ready to Test").
- Apple requires an **Export Compliance** answer. Pourcast uses only standard
  HTTPS/no proprietary encryption, so the standard "uses exemption" answer
  applies — but confirm for your situation.
- Add yourself under **Internal Testing** (uses your Apple account, no review
  needed) to install via the TestFlight app immediately. For outside testers,
  add an **External** group — that first build needs a short Apple review.

Done — Pourcast is on your phone via TestFlight.

---

## Redeploy loop (whenever you change the web app)

Your source of truth stays `../index.html`. After editing it:

```
cd "/Users/binhjo/Documents/Claude Cowork/Personal/Pourcast/pourcast-ios"
cp ../index.html www/index.html
npx cap sync ios
```

Then Xcode → bump the **Build** number (Signing target → General → Build) →
Product → Archive → upload again. TestFlight picks up the new build.

Tip: keep the web `index.html` and `www/index.html` in sync — the `cp` line
above is the only thing tying them together. (You could later automate this.)

---

## Milestone 2 — native Bluetooth scale support

**Status: implemented (2026-07-21). Not yet tested on hardware** — the iOS
Simulator has no Bluetooth radio, so a real connection can only be confirmed
on a physical iPhone with an actual scale. Testing procedure is below.

### What was done

1. Installed the plugin: `npm install @capacitor-community/bluetooth-le`
   (`@capacitor-community/bluetooth-le@8.2.0`) + `npx cap sync ios`. It links
   via Swift Package Manager (no CocoaPods step) and is statically linked into
   the App binary.
2. Added to `ios/App/App/Info.plist`:
   ```xml
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>Pourcast connects to your coffee scale over Bluetooth to show live weight and pace each pour.</string>
   <key>NSBluetoothPeripheralUsageDescription</key>
   <string>Pourcast connects to your coffee scale over Bluetooth to show live weight and pace each pour.</string>
   ```
3. Added a runtime switch in `app.js`: when `Capacitor.isNativePlatform()` is
   true and the plugin is present (`bleNativeAvailable()`), scale calls route
   through the native bridge; otherwise the existing Web Bluetooth path runs.
   The web app / GitHub Pages behavior is unchanged.
4. **The protocol adapters are untouched.** Acaia/Bookoo/Timemore/Felicita/WSS
   byte parsing, frame reassembly, and command encoding are exactly as before.
   Only the transport swapped, via a shim that mimics the Web Bluetooth surface
   the adapters already use (`device.gatt.connect` → `getPrimaryService` →
   `getCharacteristic` → `startNotifications` / `characteristicvaluechanged` /
   `writeValue`), backed by `window.Capacitor.Plugins.BluetoothLe`. No bundler
   needed. Values cross the bridge as hex strings (converted to/from
   `DataView`); the notification listener key is `notification|id|svc|chr`.

### How to test on your iPhone

The iOS project is already synced. Get the app onto the phone and connect:

**1. Put the app on your iPhone**
Plug in the iPhone (or use wireless debugging), then:
```
cd "/Users/binhjo/Documents/Claude Cowork/Personal/Pourcast/pourcast-ios"
npx cap open ios
```
In Xcode: pick your **iPhone** as the run target (not a simulator) → **App**
target → **Signing & Capabilities** → set your **Team** → press **▶ Run**.
First run only: on the iPhone, trust the cert under **Settings → General →
VPN & Device Management**, then relaunch.

> The simulator can't run this test — no Bluetooth radio. Must be a real device.

**2. Connect the scale**
1. Turn on the Acaia Pearl, keep it awake near the phone.
2. Tap the **Bluetooth icon** (top-right, next to °F), or the ⚙ settings scale
   section.
3. Tap **Connect scale**.
4. Approve the **iOS Bluetooth permission prompt** (first time only). If you
   never see this prompt, that's a red flag — see the table below.
5. Pick your Pearl in the **native device picker**.
6. Confirm the status reads **"Connected: PEARL… (Acaia)"** and the header
   icon loses its slash. If the Pearl isn't listed, tap **"show all devices"**
   (some Acaia firmwares don't advertise their service in the scan record).

**3. Confirm it actually reads weight** (connecting alone isn't enough)
Run a brew (**Brew → Start Brewing**). With a scale connected you should see:
- **"POUR UNTIL THE SCALE READS ___g"** tracking your real pour (not a timed estimate),
- the water bar filling to the **actual** weight (no "(est.)" tag),
- a **flow-rate gauge** (g/s) with on-pace / too-fast feedback,
- the scale **zeroes at GO** — reading starts from 0 when the brew begins.

**4. Built-in BLE debug log**
In the ⚙ settings scale section, **tap the status-line text** to toggle a log
of the last BLE events — the exact adapter handshake:
```
GATT connected
trying adapter: Acaia…
✓ matched: Acaia
settings: battery 87% · grams · auto-off 5min
```
This shows precisely where a connection stalls.

**Deeper debugging:** connect the iPhone and open **Safari → Develop → [your
iPhone] → Pourcast** (Web Inspector) for the live JS console and `blog()`
output. `window.simToggle()` forces fake-weight mode for comparison.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No permission prompt, instant fail | Bluetooth off / plist key missing | Check iPhone Bluetooth is on; confirm `NSBluetoothAlwaysUsageDescription` present |
| Pearl not in picker | Doesn't advertise its service | Use **"show all devices"** |
| Picks device, then "Connected but no weight stream found" | Adapter matched wrong / protocol mismatch | Read the debug log — which adapter matched? Note the device name + firmware |
| Connects, weight frozen or garbage | Byte-parse issue for this firmware | Debug log + exact Pearl model/firmware — this points at the parser to fix |
| Drops mid-brew, then recovers | Normal — scale slept | Auto-reconnect handles it; confirm weight resumes |

If a parser misbehaves, capture the debug log and the exact scale model/firmware
— that's what's needed to fix the byte decoding for your specific device.
