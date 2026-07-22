#!/bin/bash
# Sync web app assets into the Capacitor iOS wrapper.
#
# capacitor.config.json sets "webDir": "www", so pourcast-ios/www/ IS the payload
# bundled into the iOS binary. It must match the root web app or TestFlight ships
# a stale version.
#
# Run manually:  ./sync-ios.sh
# Runs automatically on every commit via .git/hooks/pre-commit (see install-hook.sh).

set -euo pipefail

cd "$(dirname "$0")"

SRC_DIR="."
DEST_DIR="pourcast-ios/www"
FILES=("index.html" "styles.css" "app.js" "pour.mp3")

if [ ! -d "$DEST_DIR" ]; then
  echo "sync-ios: $DEST_DIR not found — nothing to sync." >&2
  exit 0
fi

changed=0
for f in "${FILES[@]}"; do
  src="$SRC_DIR/$f"
  dest="$DEST_DIR/$f"

  if [ ! -f "$src" ]; then
    echo "sync-ios: WARNING — source $src is missing, skipping." >&2
    continue
  fi

  if [ -f "$dest" ] && cmp -s "$src" "$dest"; then
    continue                      # already identical
  fi

  cp "$src" "$dest"
  echo "sync-ios: updated $dest"
  changed=$((changed + 1))
done

if [ "$changed" -eq 0 ]; then
  echo "sync-ios: iOS copy already up to date."
else
  echo "sync-ios: $changed file(s) synced."
  echo "sync-ios: run 'npx cap sync ios' before your next Xcode build."
fi
