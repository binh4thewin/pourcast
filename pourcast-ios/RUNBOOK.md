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

## Milestone 2 — native Bluetooth scale support (separate build)

The wrap above gets you shipping. Real scale support is a code change, done and
tested on your Mac because it can't be validated without hardware.

Plan when you're ready:

1. Add the plugin: `npm install @capacitor-community/bluetooth-le` then
   `npx cap sync ios`.
2. Add these keys to `ios/App/App/Info.plist` (Xcode: right-click Info.plist →
   Open As → Source Code):
   ```xml
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>Pourcast connects to your coffee scale to show live weight and pour pace.</string>
   ```
3. In `index.html`, add a small runtime switch: when running inside Capacitor
   (`window.Capacitor?.isNativePlatform()`), route scale calls through the
   plugin instead of `navigator.bluetooth`.
4. **Your protocol logic ports almost unchanged.** The Acaia/Bookoo/Timemore/
   Felicita byte parsing, frame reassembly, and command encoding are plain JS
   and stay as-is. Only the transport layer swaps:
   - `navigator.bluetooth.requestDevice` → `BleClient.requestDevice`
   - `server.getPrimaryService` / `getCharacteristic` → device/service/
     characteristic **UUID strings** passed to `BleClient` calls
   - `startNotifications` + `characteristicvaluechanged` event →
     `BleClient.startNotifications(deviceId, service, char, callback)`
   - incoming data arrives as a `DataView` (same as Web Bluetooth's
     `e.target.value`), so your existing `parse(dataView)` functions work
     directly.

When you want to tackle this, come back and I'll write the exact swapped
scale-connection code against your current adapters.
