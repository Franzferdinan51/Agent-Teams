#!/bin/bash
# start-council.sh - Start the Council Server (port 3003) from this repo
cd "$(dirname "$0")"

if [ -f ./.env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

exec node council-server.js > /tmp/council.log 2>&1
