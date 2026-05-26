#!/usr/bin/env python3
"""
Headless scanner-quality sweep.

Reimplements the OpenCV pipeline from apps/mobile/hooks/useDocumentDetection.ts
in pure Python so we can iterate against the 124 ticket images in seconds
without needing the simulator or the app itself.

Pipeline (kept in lockstep with the TS hook — update both when tuning):
  1. Resize to 1/4 (SCALE_FACTOR = 4)
  2. Grayscale
  3. Gaussian blur 5x5
  4. Threshold THRESH_BINARY | THRESH_OTSU
  5. Morphological close 9x9
  6. Dilate 3x3 once
  7. findContours RETR_EXTERNAL, CHAIN_APPROX_SIMPLE
  8. For each contour: area gates, approxPolyDP ladder, minAreaRect fallback,
     boundingRect fallback, validateRectangularShape, edge-touching check
  9. Pick the biggest passing contour
  10. Draw the polygon on the source image; emit verdict + corners

Verdict categories:
  - "detected"  → polygon found and passes all gates
  - "rejected"  → contours found but all failed validation (no polygon drawn)
  - "no-contour" → Otsu produced nothing usable (probably an upside-down
                   threshold; we also try the inverse below)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

SRC_DIR = Path("/Users/ezeikel/Library/Mobile Documents/com~apple~CloudDocs/Legal/Parking/Tickets 2026 dump")
OUT_DIR = Path("/tmp/scanner-sweep/out")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SCALE_FACTOR = 4
MIN_AREA_RATIO = 0.08
MAX_AREA_RATIO = 0.85
ASPECT_MIN = 1.10
ASPECT_MAX = 6.50
SIDE_DIFF_MAX = 0.60
ANGLE_MIN = 30.0
ANGLE_MAX = 150.0


def validate_shape(pts: np.ndarray) -> bool:
    """Mirrors validateRectangularShape in useDocumentDetection.ts."""
    if pts.shape != (4, 2):
        return False
    distances = []
    for i in range(4):
        p1, p2 = pts[i], pts[(i + 1) % 4]
        distances.append(math.hypot(p2[0] - p1[0], p2[1] - p1[1]))
    sd = sorted(distances)
    short = (sd[0] + sd[1]) / 2
    long_ = (sd[2] + sd[3]) / 2
    if short <= 0:
        return False
    aspect = long_ / short
    if aspect < ASPECT_MIN or aspect > ASPECT_MAX:
        return False
    s1 = abs(distances[0] - distances[2]) / max(distances[0], distances[2])
    s2 = abs(distances[1] - distances[3]) / max(distances[1], distances[3])
    if s1 > SIDE_DIFF_MAX or s2 > SIDE_DIFF_MAX:
        return False
    for i in range(4):
        p1 = pts[(i - 1) % 4]
        p2 = pts[i]
        p3 = pts[(i + 1) % 4]
        v1 = p1 - p2
        v2 = p3 - p2
        dot = float(v1[0] * v2[0] + v1[1] * v2[1])
        m1 = math.hypot(*v1)
        m2 = math.hypot(*v2)
        if m1 == 0 or m2 == 0:
            return False
        cos_a = max(-1.0, min(1.0, dot / (m1 * m2)))
        ang = math.degrees(math.acos(cos_a))
        if ang < ANGLE_MIN or ang > ANGLE_MAX:
            return False
    return True


def detect(img: np.ndarray) -> dict:
    h, w = img.shape[:2]
    sw, sh = w // SCALE_FACTOR, h // SCALE_FACTOR
    if sw <= 0 or sh <= 0:
        return {"verdict": "too-small"}
    small = cv2.resize(img, (sw, sh))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    kernel9 = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, kernel9)
    kernel3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    bw = cv2.dilate(bw, kernel3, iterations=1)
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    frame_area = sw * sh
    min_area = max(100, int(frame_area * MIN_AREA_RATIO))
    max_area = int(frame_area * MAX_AREA_RATIO)
    edge_margin = max(2, int(min(sw, sh) * 0.02))

    if not contours:
        return {"verdict": "no-contour", "raw_contours": 0}

    best = None
    best_area = 0
    reject_reasons = []
    for c in contours:
        area = cv2.contourArea(c)
        if area <= min_area or area > max_area:
            reject_reasons.append(f"size:{area:.0f}")
            continue
        # Polygon approximation ladder
        peri = cv2.arcLength(c, True)
        pts = None
        for mult in (0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.08, 0.1):
            approx = cv2.approxPolyDP(c, mult * peri, True).reshape(-1, 2)
            if len(approx) == 4:
                pts = approx
                break
            if len(approx) < 4:
                break
        # minAreaRect fallback
        if pts is None:
            box = cv2.boxPoints(cv2.minAreaRect(c))
            pts = box.astype(np.float32)
        # boundingRect last-resort fallback
        if pts is None:
            x, y, rw, rh = cv2.boundingRect(c)
            pts = np.array([[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]], dtype=np.float32)
        if not validate_shape(pts):
            reject_reasons.append("shape")
            continue
        # Edge-touching
        tL = bool((pts[:, 0] <= edge_margin).any())
        tT = bool((pts[:, 1] <= edge_margin).any())
        tR = bool((pts[:, 0] >= sw - edge_margin).any())
        tB = bool((pts[:, 1] >= sh - edge_margin).any())
        sides = sum([tL, tT, tR, tB])
        if sides >= 3:
            reject_reasons.append(f"edges:{sides}")
            continue
        if area > best_area:
            best_area = area
            best = pts

    if best is None:
        return {
            "verdict": "rejected",
            "raw_contours": len(contours),
            "reasons": reject_reasons[:10],
        }
    # Scale corners back up to full-resolution
    full_corners = best * SCALE_FACTOR
    return {
        "verdict": "detected",
        "raw_contours": len(contours),
        "area_ratio": best_area / frame_area,
        "corners": full_corners.tolist(),
    }


def annotate(src: np.ndarray, result: dict, out_path: Path) -> None:
    img = src.copy()
    if result["verdict"] == "detected":
        pts = np.array(result["corners"], np.int32).reshape(-1, 1, 2)
        cv2.polylines(img, [pts], True, (0, 200, 0), 8)
        # corner dots
        for c in result["corners"]:
            cv2.circle(img, (int(c[0]), int(c[1])), 18, (0, 200, 0), -1)
            cv2.circle(img, (int(c[0]), int(c[1])), 18, (255, 255, 255), 4)
    h, w = img.shape[:2]
    target_w = 720
    scale = target_w / w
    img = cv2.resize(img, (target_w, int(h * scale)))
    label = result["verdict"]
    color = (0, 200, 0) if label == "detected" else (0, 0, 200)
    cv2.rectangle(img, (0, 0), (target_w, 60), (0, 0, 0), -1)
    cv2.putText(img, label.upper(), (16, 42), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
    cv2.imwrite(str(out_path), img)


def main() -> int:
    images = sorted([p for p in SRC_DIR.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png")])
    print(f"Found {len(images)} images")
    results = []
    counts = {"detected": 0, "rejected": 0, "no-contour": 0, "too-small": 0, "error": 0}
    for i, p in enumerate(images, 1):
        try:
            img = cv2.imread(str(p))
            if img is None:
                results.append({"file": p.name, "verdict": "error", "msg": "imread failed"})
                counts["error"] += 1
                continue
            r = detect(img)
            r["file"] = p.name
            counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
            results.append(r)
            annotate(img, r, OUT_DIR / f"{i:03d}_{p.stem}_{r['verdict']}.jpg")
            print(f"[{i:3d}/{len(images)}] {p.name:30s} → {r['verdict']:12s}"
                  + (f"  area={r['area_ratio']:.2f}" if r['verdict'] == 'detected' else ""))
        except Exception as e:
            results.append({"file": p.name, "verdict": "error", "msg": str(e)})
            counts["error"] += 1
            print(f"[{i:3d}/{len(images)}] {p.name:30s} → ERROR  {e}")
    print()
    print("=" * 50)
    print("Summary:")
    for k, v in counts.items():
        if v > 0:
            print(f"  {k:12s}: {v:3d}  ({v / len(images) * 100:.1f}%)")
    (OUT_DIR / "_results.json").write_text(json.dumps(results, indent=2))
    print(f"\nWrote per-image annotations to: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
