#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/tanmatsu"
: "${IDF_PATH:?Set IDF_PATH by sourcing ESP-IDF export.sh first}"

idf.py set-target esp32p4
idf.py build
mkdir -p ../dist
idf.py merge-bin -o ../dist/grimoir-esp32p4.bin
printf '\nFlashable image written to firmware/dist/grimoir-esp32p4.bin\n'
printf 'Flash it with: idf.py -p PORT flash monitor\n'
