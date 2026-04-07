#!/bin/sh
set -e

if [ -n "${VITE_API_BASE:-}" ]; then
  find /usr/share/nginx/html -name '*.js' -exec \
    sed -i "s|__QB_API_BASE__|${VITE_API_BASE}|g" {} +
  echo "Replaced __QB_API_BASE__ with ${VITE_API_BASE}"
fi
