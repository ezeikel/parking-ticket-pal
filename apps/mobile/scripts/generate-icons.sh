#!/bin/bash
# Generate development and preview icon variants from the production icons.
# Follows the Pray As You Go pattern:
#   - Production: original (light/teal background, normal logo)
#   - Preview:    dark background tint + grid overlay (signals "internal testing")
#   - Development: dark background tint + code watermark overlay (signals "dev build")
#
# Requirements: ImageMagick v7+ (magick command)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets/images"

ICON="$ASSETS_DIR/icon.png"
ADAPTIVE="$ASSETS_DIR/adaptive-icon.png"

SIZE=1024

echo "Generating icon variants..."

# ─── Helper: darken + tint an icon ───────────────────────────────────────────
# Takes the original icon, applies a dark overlay to shift the background darker,
# then applies a slight blue-teal tint to give it a distinct non-production feel.
darken_icon() {
  local input="$1"
  local output="$2"

  magick "$input" \
    -modulate 60,80,100 \
    -fill "rgba(10,30,50,0.35)" -colorize 30% \
    "$output"
}

# ─── Preview icons: dark + grid overlay ──────────────────────────────────────
generate_preview_icons() {
  echo "  Creating preview (internal) icons..."

  # Generate grid overlay
  magick -size ${SIZE}x${SIZE} xc:none \
    -stroke "rgba(255,255,255,0.15)" -strokewidth 2 \
    -draw "line 0,256 1024,256" \
    -draw "line 0,512 1024,512" \
    -draw "line 0,768 1024,768" \
    -draw "line 256,0 256,1024" \
    -draw "line 512,0 512,1024" \
    -draw "line 768,0 768,1024" \
    /tmp/ptp-grid-overlay.png

  # iOS icon
  darken_icon "$ICON" /tmp/ptp-preview-base.png
  magick /tmp/ptp-preview-base.png /tmp/ptp-grid-overlay.png \
    -composite "$ASSETS_DIR/icon-preview.png"

  # Android adaptive icon
  darken_icon "$ADAPTIVE" /tmp/ptp-preview-adaptive-base.png
  magick /tmp/ptp-preview-adaptive-base.png /tmp/ptp-grid-overlay.png \
    -composite "$ASSETS_DIR/adaptive-icon-preview.png"

  echo "  ✓ icon-preview.png"
  echo "  ✓ adaptive-icon-preview.png"
}

# ─── Development icons: dark + code watermark ────────────────────────────────
generate_dev_icons() {
  echo "  Creating development icons..."

  # Generate code watermark overlay
  magick -size ${SIZE}x${SIZE} xc:none \
    -font "Courier" -pointsize 52 \
    -fill "rgba(255,255,255,0.12)" \
    -gravity NorthWest \
    -annotate +20+40   "01 let ptp =" \
    -annotate +20+110  "02   const ticket" \
    -annotate +20+180  "03     do challenge" \
    -annotate +20+250  "04     parking.scan()" \
    -annotate +20+320  "05 while (active)" \
    -gravity SouthEast \
    -annotate +20+40   "debug: true" \
    -annotate +20+110  "env: development" \
    -annotate +20+180  "build: local" \
    /tmp/ptp-code-overlay.png

  # iOS icon
  darken_icon "$ICON" /tmp/ptp-dev-base.png
  magick /tmp/ptp-dev-base.png /tmp/ptp-code-overlay.png \
    -composite "$ASSETS_DIR/icon-dev.png"

  # Android adaptive icon
  darken_icon "$ADAPTIVE" /tmp/ptp-dev-adaptive-base.png
  magick /tmp/ptp-dev-adaptive-base.png /tmp/ptp-code-overlay.png \
    -composite "$ASSETS_DIR/adaptive-icon-dev.png"

  echo "  ✓ icon-dev.png"
  echo "  ✓ adaptive-icon-dev.png"
}

# ─── Run ─────────────────────────────────────────────────────────────────────
generate_preview_icons
generate_dev_icons

echo ""
echo "Done! Generated icons in $ASSETS_DIR:"
ls -la "$ASSETS_DIR"/icon-*.png "$ASSETS_DIR"/adaptive-icon-*.png 2>/dev/null
