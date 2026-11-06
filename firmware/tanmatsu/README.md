# The Grimoir — Tanmatsu firmware

This directory is a native ESP-IDF application for the Tanmatsu ESP32-P4 device. It is intentionally separate from the Next.js prototype in the repository.

## Status

This is the combined Rideword/Anansi ESP-IDF firmware image for the standard Tanmatsu ESP32-P4 target. It uses Anansi's display and input shell with Rideword's Aegis identity core compiled into the same bootable application. It initializes the Tanmatsu BSP, allocates the display framebuffer through PAX, flushes frames to the physical display, and exposes the native app entry point used by the bootable image. Identity, mesh, wallet, telemetry, and verification data remain deterministic and are clearly marked `SIMULATION`; no private keys, real credentials, network protocol, or cryptographic verification are implemented yet.

## Linux setup

Use the ESP-IDF version required by the official Tanmatsu template and install the Tanmatsu BSP/PAX components from that template. Then configure the target from this directory:

```bash
cd firmware/tanmatsu
idf.py set-target esp32p4
idf.py menuconfig
idf.py build
idf.py -p /dev/ttyACM0 flash monitor
```

The exact USB device path can differ on Linux. Check `ls /dev/ttyACM* /dev/ttyUSB*` before flashing. Exit the monitor with `Ctrl-]`.

## Install/recovery notes

- Keep the factory bootloader and launcher partitions intact.
- Flash only the application image through the official Tanmatsu launcher workflow or the template's documented USB workflow.
- If the board does not boot, use the official recovery/bootloader procedure rather than erasing the whole flash.
- The current source includes a conservative GPIO fallback for bring-up. Replace `handle_input()` with the keyboard/input adapter from the exact Tanmatsu template revision before hardware validation.

## Controls

The demo maps the template's eventual input layer to these actions:

- Select / confirm: GPIO 0 fallback
- Back / home: GPIO 1 fallback
- The screen router and state model are ready for the Tanmatsu keyboard event queue.

## AppFS and Wadamesh integration

The project declares the Badge.Team `badgeteam/appfs` ESP-IDF component so the resulting application can be packaged for the Tanmatsu launcher/AppFS model. It does not replace the launcher or write factory partitions. Follow the official AppFS/Tanmatsu packaging workflow for the exact template revision in use.

Wadamesh compatibility is tracked against `https://github.com/ALLFATHER-BV/wadamesh`. This demo only reserves the integration boundary; it does not claim wire-level compatibility until the Wadamesh protocol and the Nicolai Electronics device SDK revision are pinned. No network credentials or keys are embedded.

Document trust is advisory and entirely on-device. The demo compares locally supplied metadata and reference records; it never fetches public registries from firmware, treats a score as proof, or uploads document contents/hashes. An authorized issuer must still verify every document.

## Build caveat

The repository does not vendor the proprietary/device-specific Tanmatsu BSP. The official template must provide the matching `pax_code` component, display initialization, framebuffer flush, and keyboard adapter. The application-level state and rendering code lives in `main/main.c`; wire those template APIs in before claiming a hardware-tested image.
