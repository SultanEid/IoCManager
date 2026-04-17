#!/usr/bin/env bash
set -euo pipefail

iterations="${1:-20}"

for i in $(seq 1 "$iterations"); do
  logger "DeTechTiveBulkLinuxAlpha"
  logger "DeTechTiveBulkLinuxBeta"
  logger "DeTechTiveBulkLinuxGamma"
  sleep 0.1
done
