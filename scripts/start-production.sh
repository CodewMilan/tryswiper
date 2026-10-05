#!/bin/sh
set -eu
node packages/db/migrate.mjs
exec pnpm --filter @swiper/web start
