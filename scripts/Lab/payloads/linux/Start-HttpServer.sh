#!/usr/bin/env bash
set -euo pipefail

root_dir="${1:-/tmp/detechtive-http}"
port="${2:-8080}"

mkdir -p "$root_dir"
printf 'ok' > "$root_dir/index.html"
nohup python3 -m http.server "$port" --directory "$root_dir" >"$root_dir/server.log" 2>&1 < /dev/null &
echo "started:$port"
