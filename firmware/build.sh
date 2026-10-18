#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
: "${IDF_PATH:?Set IDF_PATH by sourcing ESP-IDF export.sh first}"

idf.py set-target esp32s3
idf.py build
printf '\nFirmware image built. Connect Tanmatsu and run: idf.py -p PORT flash monitor\n'
