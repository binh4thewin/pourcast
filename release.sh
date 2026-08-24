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
# We stage only the release-relevant files (see RELEASE_FILES below), so
# unrelated work-in-progress can stay uncommitted. Just warn if the tree is dirty.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Note: working tree has other uncommitted changes — only release files will be staged." >&2
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
# in-app marketing version (canonical source of truth; lives in app.js since the
# index.html -> index.html + styles.css + app.js split)
sed -i '' -E "s/const APP_VERSION='[^']*';/const APP_VERSION='$VERSION';/" app.js
# cache-bust the web asset URLs so returning visitors get the new build immediately
# (GitHub Pages caches app.js/styles.css hard; without this, users see stale code)
sed -i '' -E "s/(href=\"styles\.css)(\?v=[^\"]*)?\"/\1?v=$VERSION\"/" index.html
sed -i '' -E "s/(src=\"app\.js)(\?v=[^\"]*)?\"/\1?v=$VERSION\"/" index.html
# service worker cache version — must match the asset ?v so a deploy replaces the old cache
sed -i '' -E "s/const VERSION='[^']*';/const VERSION='$VERSION';/" sw.js
# iOS wrapper package version
sed -i '' -E "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" pourcast-ios/package.json

echo "Syncing iOS payload ..."
bash sync-ios.sh

echo "Committing + tagging ..."
# Stage ONLY the files a release touches — never a blanket `git add -A`, so
# unrelated in-progress work is never swept into the release commit.
RELEASE_FILES=(
  CHANGELOG.md
  # root web app — what GitHub Pages serves; all four must be committed or the
  # live site ships stale HTML/CSS/audio (app.js alone is not enough)
  index.html
  styles.css
  app.js
  pour.mp3
  # icons + PWA manifest + service worker + social share image served by the web app
  manifest.json
  sw.js
  icons
  og-image.png
  og-image.html
  # AI/SEO discovery files
  llms.txt
  sitemap.xml
  # brand icon masters (source of truth; the generated ios/ tree stays untracked)
  icon-master.png
  pourcast-ios/assets/icon.png
  pourcast-ios/package.json
  pourcast-ios/RUNBOOK.md
  # iOS payload mirror (kept in sync by sync-ios.sh)
  pourcast-ios/www/app.js
  pourcast-ios/www/index.html
  pourcast-ios/www/styles.css
  pourcast-ios/www/pour.mp3
)
for f in "${RELEASE_FILES[@]}"; do
  [ -e "$f" ] && git add "$f"
done
git commit -m "Release v$VERSION"
git tag -a "v$VERSION" -m "Pourcast v$VERSION"

echo
echo "Done. v$VERSION committed and tagged locally."
echo "Next steps (when ready):"
echo "  1. git push && git push --tags        # publish web app + tag"
echo "  2. cd pourcast-ios && npm run sync     # cap sync ios"
echo "  3. Open Xcode, bump the BUILD number, archive, upload to TestFlight"
echo "  4. Paste the CHANGELOG entry into App Store Connect 'What's New'"
