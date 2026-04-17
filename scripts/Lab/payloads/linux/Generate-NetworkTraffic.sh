#!/usr/bin/env bash
set -euo pipefail

http_base_url="${1:-http://172.165.50.134:8080/detechtive-check}"
dns_server="${2:-8.8.8.8}"
sensor_ip="${3:-172.165.50.134}"
iterations="${4:-4}"

for i in $(seq 1 "$iterations"); do
  ping -c 2 "$sensor_ip" >/dev/null 2>&1 || true
  nslookup detechtive.local "$dns_server" >/dev/null 2>&1 || true
  curl --connect-timeout 2 --max-time 2 -A "curl/8.0" -H "Host: detechtive.lab" "$http_base_url" >/dev/null 2>&1 || true
  curl --connect-timeout 2 --max-time 2 -A "Wget/1.21" -H "Host: detechtive.lab" "$http_base_url" >/dev/null 2>&1 || true
  curl --connect-timeout 2 --max-time 2 -H "Host: detechtive.lab" -H "X-DeTechTive-Test: 1" "$http_base_url" >/dev/null 2>&1 || true
  wget --header="Host: detechtive.lab" -U "Wget/1.21" -O /tmp/detechtive-net.out "$http_base_url" >/dev/null 2>&1 || true
  rm -f /tmp/detechtive-net.out
  sleep 0.1
done
