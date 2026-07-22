#!/bin/bash
# Cut a Pourcast release the "iOS way": bump version, sync the iOS payload,
# commit, and tag. Does NOT push — you push when you're ready.
#
# Usage:  ./release.sh 1.2.0
#
# Before running: add a "## [1.2.0]" section to CHANGELOG.md describing the
# release. The script refuses to run without it.

set -euo pipefail
cd "$(dirname "$0")"

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: ./release.sh <version>   e.g. ./release.sh 1.2.0" >&2
  exit 1
fi
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be MAJOR.MINOR.PATCH (e.g. 1.2.0). Got: $VERSION" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash your changes first." >&2
  git status --short >&2
  exit 1
fi
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Tag v$VERSION already exists. Pick a new version." >&2
  exit 1
fi
if ! grep -q "^## \[$VERSION\]" CHANGELOG.md; then
  echo "No '## [$VERSION]' section in CHANGELOG.md. Add release notes first." >&2
  exit 1
fi

echo "Bumping to $VERSION ..."
# in-app marketing version (canonical source of truth)
sed -i '' -E "s/const APP_VERSION='[^']*';/const APP_VERSION='$VERSION';/" index.html
# iOS wrapper package version
sed -i '' -E "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" pourcast-ios/package.json

echo "Syncing iOS payload ..."
./sync-ios.sh

echo "Committing + tagging ..."
git add -A
git commit -m "Release v$VERSION"
git tag -a "v$VERSION" -m "Pourcast v$VERSION"

echo
echo "Done. v$VERSION committed and tagged locally."
echo "Next steps (when ready):"
echo "  1. git push && git push --tags        # publish web app + tag"
echo "  2. cd pourcast-ios && npm run sync     # cap sync ios"
echo "  3. Open Xcode, bump the BUILD number, archive, upload to TestFlight"
echo "  4. Paste the CHANGELOG entry into App Store Connect 'What's New'"
