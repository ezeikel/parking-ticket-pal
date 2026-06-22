// Shared document-quad geometry validators.
//
// One tested implementation used by BOTH detection surfaces:
//   1. the live VisionCamera frame processor (useDocumentDetection.ts) — runs in
//      a worklet, so these are marked 'worklet'. A 'worklet'-marked function is
//      still an ordinary JS function when called on the JS thread.
//   2. the post-capture preview (PostCapturePreview.tsx) — plain JS, gating the
//      Apple Vision crop quad before it becomes the primary editable polygon.
//
// Why these live here and are parameterized by `aspectFloor`:
// Measurement (2026-06-22) ran the real VNDetectDocumentSegmentationRequest over
// 39 ticket photos. The OpenCV path's 1.10 aspect floor rejected ~half of REAL,
// confident (0.99) Vision crops because a UK PCN/NTK is genuinely near-square
// (~1.05 aspect) and Vision crops tightly to it. The 1.10 floor is an OpenCV-era
// assumption ("near-square blob = locked onto background") that is false for
// Vision. So Vision uses a 1.0 floor; OpenCV keeps 1.10. Every other check
// (angles, side similarity, area, edge-touch) is shared and unchanged — with the
// corrected floor, 37/38 real tickets pass and the 1 reject is a genuinely
// malformed fan-shaped quad. See PTP Test Images/SCANNER_INVESTIGATION.md.

export type DocumentCorner = {
  x: number;
  y: number;
};

// Default floor preserves the existing OpenCV behaviour for callers that don't
// pass one. Vision callers pass VISION_ASPECT_FLOOR.
export const OPENCV_ASPECT_FLOOR = 1.1;
export const VISION_ASPECT_FLOOR = 1.0;
export const ASPECT_CEILING = 6.5;

// Validate that 4 points form a plausible document rectangle.
// Scale-invariant, so it is equivalent in pixel space or normalized [0,1] space.
export const validateRectangularShape = (
  points: DocumentCorner[],
  aspectFloor: number = OPENCV_ASPECT_FLOOR,
): boolean => {
  'worklet';
  if (points.length !== 4) return false;

  const distances: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 4];
    distances.push(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2));
  }

  const sorted = [...distances].sort((a, b) => a - b);
  const shortSide = (sorted[0] + sorted[1]) / 2;
  const longSide = (sorted[2] + sorted[3]) / 2;
  const aspectRatio = longSide / shortSide;
  // Floor: OpenCV 1.10 (near-square blob usually = background); Vision 1.0 (it
  // crops tightly, and a real PCN/NTK is near-square). Ceiling 6.50 covers long
  // narrow receipts.
  if (aspectRatio < aspectFloor || aspectRatio > ASPECT_CEILING) return false;

  // Opposite-side length similarity. A tilted / perspective-distorted document
  // (opposite sides foreshorten by different amounts) still passes at ≤0.6.
  const side1Diff = Math.abs(distances[0] - distances[2]) / Math.max(distances[0], distances[2]);
  const side2Diff = Math.abs(distances[1] - distances[3]) / Math.max(distances[1], distances[3]);
  if (side1Diff > 0.6 || side2Diff > 0.6) return false;

  // Corner-angle plausibility [30°, 150°] so strongly tilted docs still pass.
  for (let i = 0; i < 4; i++) {
    const p1 = points[(i - 1 + 4) % 4];
    const p2 = points[i];
    const p3 = points[(i + 1) % 4];
    const v1x = p1.x - p2.x, v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x, v2y = p3.y - p2.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    if (angle < 30 || angle > 150) return false;
  }

  return true;
};

// Shoelace area of the quad as a fraction of the unit frame. Only meaningful for
// corners in normalized [0,1] space (frame area = 1). Used by the Vision gates.
export const normalizedQuadArea = (points: DocumentCorner[]): number => {
  'worklet';
  if (points.length !== 4) return 0;
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 4];
    a += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(a) / 2;
};

// Count how many of the four frame sides the quad touches, in normalized space.
// A real handheld document touches 0–2 sides; a degenerate full-frame artifact
// (e.g. the simulator's Vision band) touches 3–4.
export const edgeTouchSides = (points: DocumentCorner[], margin: number = 0.02): number => {
  'worklet';
  let l = false, t = false, r = false, b = false;
  for (const p of points) {
    if (p.x <= margin) l = true;
    if (p.y <= margin) t = true;
    if (p.x >= 1 - margin) r = true;
    if (p.y >= 1 - margin) b = true;
  }
  return (l ? 1 : 0) + (t ? 1 : 0) + (r ? 1 : 0) + (b ? 1 : 0);
};

// Conservative gate for an Apple Vision document quad given in normalized [0,1]
// space. Returns true only if the quad is a plausible document. Measured to pass
// 37/38 real ticket photos (the 1 reject is a malformed fan-shaped detection).
//
// Area band [0.08, 0.85] matches the OpenCV path. No real measured Vision crop
// exceeded 0.77, so 0.85 has headroom while still rejecting the full-frame band.
export const MIN_AREA_RATIO = 0.08;
export const MAX_AREA_RATIO = 0.85;

export const isPlausibleVisionQuad = (corners: DocumentCorner[]): boolean => {
  'worklet';
  if (!corners || corners.length !== 4) return false;
  if (!validateRectangularShape(corners, VISION_ASPECT_FLOOR)) return false;
  const area = normalizedQuadArea(corners);
  if (area < MIN_AREA_RATIO || area > MAX_AREA_RATIO) return false;
  if (edgeTouchSides(corners) >= 3) return false;
  return true;
};
