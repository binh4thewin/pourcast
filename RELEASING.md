# Releasing Pourcast

Every rollout is treated like an iOS app update: a numbered, tagged, documented
release with a test gate before it ships.

## Versioning

Semantic versioning — `MAJOR.MINOR.PATCH`:

- **MAJOR** — breaking change (rare for this app).
- **MINOR** — a new feature (a new theme, a new brew mode).
- **PATCH** — a bug fix or small tweak.

Two numbers matter for iOS:

- **Marketing version** (`CFBundleShortVersionString`) — what users see, e.g. `1.2.0`. Canonical source of truth is `APP_VERSION` in `index.html`; `pourcast-ios/package.json` mirrors it. `release.sh` updates both.
- **Build number** (`CFBundleVersion`) — an integer that must **increase on every upload** to App Store Connect, even re-uploads of the same marketing version. Bump this in Xcode each time you archive.

## Release checklist

1. Finish the work on a branch; merge to `main`.
2. **Verify** — the test gate. Open the app, exercise the changed areas, confirm nothing regressed.
3. Add a `## [X.Y.Z]` section to `CHANGELOG.md` (Added / Changed / Fixed / Removed).
4. Run `./release.sh X.Y.Z` — bumps the version, syncs the iOS payload, commits, and tags `vX.Y.Z` locally.
5. `git push && git push --tags` — publishes the web app (GitHub Pages) and the tag.
6. `cd pourcast-ios && npm run sync`, then in Xcode: **bump the build number**, archive, and upload to TestFlight.
7. Test the TestFlight build on a real device.
8. Promote that same build to the App Store. Paste the CHANGELOG entry into "What's New."

## Rules

- **The binary you test is the binary you ship** — don't rebuild between TestFlight and release.
- **Never rewrite a tag.** A tag is an immutable snapshot; roll back by checking one out (`git checkout v1.1.0`).
- **Migrate saved data** whenever you rename or restructure anything in `localStorage` (see the `calm → adobe` alias in `setTheme` for the pattern).
- Keep `pourcast-ios/www/` in sync with the root app — `sync-ios.sh` (and the pre-commit hook) handle this; `release.sh` runs it too.
