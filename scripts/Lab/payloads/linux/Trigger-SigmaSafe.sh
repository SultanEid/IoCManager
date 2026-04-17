#!/usr/bin/env bash
set -euo pipefail

iterations="${1:-20}"

for i in $(seq 1 "$iterations"); do
  logger "DeTechTive Linux Sigma Recon"
  logger "DeTechTive Linux Sigma Service $i"
  logger "DeTechTive Linux Sigma DNS"
  curl -A "EvilAgent-$i" http://127.0.0.1:65535 >/dev/null 2>&1 || true
  wget -O "/tmp/detechtive-$i.out" http://127.0.0.1:65535 >/dev/null 2>&1 || true
  rm -f "/tmp/detechtive-$i.out"
  sleep 0.2
done
