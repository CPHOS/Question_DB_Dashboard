#!/bin/sh
set -e

HTML_DIR=/usr/share/nginx/html

# ── Replace API base URL placeholder ────────────────
if [ -n "${VITE_API_BASE:-}" ]; then
  find "$HTML_DIR" -name '*.js' -exec \
    sed -i "s|__QB_API_BASE__|${VITE_API_BASE}|g" {} +
  echo "Replaced __QB_API_BASE__ with ${VITE_API_BASE}"
fi

# ── Replace base path placeholder ───────────────────
# QB_BASE_PATH should look like /question_db  (leading slash, no trailing)
# When empty or unset the app is served from /
QB_BASE_PATH="${QB_BASE_PATH:-}"
if [ -n "$QB_BASE_PATH" ]; then
  # Normalise: ensure single leading /, strip trailing /
  QB_BASE_PATH="/$(echo "$QB_BASE_PATH" | sed 's|^/\+||;s|/\+$||')"
  REPLACEMENT="${QB_BASE_PATH}/"
else
  REPLACEMENT="/"
fi

find "$HTML_DIR" \( -name '*.js' -o -name '*.html' -o -name '*.css' \) -exec \
  sed -i "s|/__QB_BASE_PATH__/|${REPLACEMENT}|g" {} +
echo "Replaced /__QB_BASE_PATH__/ with ${REPLACEMENT}"
