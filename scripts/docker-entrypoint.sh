#!/bin/sh
set -eu

if [ -n "${BOOTSTRAP_ADMIN_ID:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  node scripts/bootstrap-admin.mjs
fi

exec node .output/server/index.mjs
