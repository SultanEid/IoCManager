#!/usr/bin/env bash
set -euo pipefail

output_root="${1:?output root is required}"
batch_size="${2:-30}"

mkdir -p "$output_root"

for i in $(seq 1 "$batch_size"); do
  printf 'powershell.exe -enc ZQBjAGgAbwAgAHQAZQBzAHQA -nop -w hidden -ep bypass\n' > "$output_root/pscombo_$(printf '%03d' "$i").txt"
  printf 'whoami\nwhoami /groups\nwhoami /priv\nnet user\nnet view\nsysteminfo\nipconfig /all\n' > "$output_root/recon_$(printf '%03d' "$i").txt"
  printf 'mshta.exe\nregsvr32.exe\nrundll32.exe\nwireshark.exe\n' > "$output_root/tools_$(printf '%03d' "$i").txt"
done

find "$output_root" -maxdepth 1 -type f | sort
