#!/bin/sh
# run_test.sh - Run the minimal Council test server (council-test.js)
cd "$(dirname "$0")"

if [ -f ./.env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

exec node council-test.js
