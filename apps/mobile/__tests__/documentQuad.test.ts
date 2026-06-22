import {
  validateRectangularShape,
  isPlausibleVisionQuad,
  normalizedQuadArea,
  edgeTouchSides,
  VISION_ASPECT_FLOOR,
  OPENCV_ASPECT_FLOOR,
  type DocumentCorner,
} from '../lib/documentQuad';

// A clean, centered, near-square document quad — like a real UK PCN/NTK that
// Apple Vision crops tightly. This is the case the OpenCV 1.10 aspect floor
// wrongly rejected (measured: ~half of real tickets). Vision floor (1.0) keeps it.
const nearSquareDoc: DocumentCorner[] = [
  { x: 0.10, y: 0.08 },
  { x: 0.90, y: 0.08 },
  { x: 0.90, y: 0.92 },
  { x: 0.10, y: 0.92 },
];

// A clearly rectangular A4-ish document.
const a4Doc: DocumentCorner[] = [
  { x: 0.20, y: 0.05 },
  { x: 0.80, y: 0.05 },
  { x: 0.80, y: 0.95 },
  { x: 0.20, y: 0.95 },
];

// The simulator's degenerate Vision band: full width, bottom quarter only.
// Touches left+right+bottom = 3 sides → must be rejected.
const degenerateBand: DocumentCorner[] = [
  { x: 0.00, y: 0.75 },
  { x: 1.00, y: 0.75 },
  { x: 1.00, y: 1.00 },
  { x: 0.00, y: 1.00 },
];

// The one real-ticket reject (ZY00553085): a fan/trapezoid where the top edge is
// ~3x the bottom edge → fails opposite-side similarity. A true reject.
const fanQuad: DocumentCorner[] = [
  { x: 0.236, y: 0.059 },
  { x: 0.743, y: 0.004 },
  { x: 0.507, y: 0.973 },
  { x: 0.333, y: 0.965 },
];

describe('validateRectangularShape', () => {
  it('rejects a near-square doc under the OpenCV floor (1.10)', () => {
    expect(validateRectangularShape(nearSquareDoc, OPENCV_ASPECT_FLOOR)).toBe(false);
  });

  it('accepts the SAME near-square doc under the Vision floor (1.0)', () => {
    expect(validateRectangularShape(nearSquareDoc, VISION_ASPECT_FLOOR)).toBe(true);
  });

  it('accepts a rectangular A4 doc under either floor', () => {
    expect(validateRectangularShape(a4Doc, OPENCV_ASPECT_FLOOR)).toBe(true);
    expect(validateRectangularShape(a4Doc, VISION_ASPECT_FLOOR)).toBe(true);
  });

  it('defaults to the OpenCV floor when none is passed', () => {
    expect(validateRectangularShape(nearSquareDoc)).toBe(false);
  });

  it('rejects a fan/trapezoid via opposite-side similarity', () => {
    expect(validateRectangularShape(fanQuad, VISION_ASPECT_FLOOR)).toBe(false);
  });

  it('rejects non-4-point input', () => {
    expect(validateRectangularShape(nearSquareDoc.slice(0, 3), VISION_ASPECT_FLOOR)).toBe(false);
  });
});

describe('normalizedQuadArea', () => {
  it('computes area as a fraction of the unit frame', () => {
    // 0.8 x 0.84 rectangle ≈ 0.672
    expect(normalizedQuadArea(nearSquareDoc)).toBeCloseTo(0.672, 2);
  });
});

describe('edgeTouchSides', () => {
  it('counts 0 sides for a centered doc', () => {
    expect(edgeTouchSides(nearSquareDoc)).toBe(0);
  });

  it('counts 3 sides for the degenerate band', () => {
    expect(edgeTouchSides(degenerateBand)).toBe(3);
  });
});

describe('isPlausibleVisionQuad', () => {
  it('accepts a near-square real document (the key regression fix)', () => {
    expect(isPlausibleVisionQuad(nearSquareDoc)).toBe(true);
  });

  it('accepts a rectangular A4 document', () => {
    expect(isPlausibleVisionQuad(a4Doc)).toBe(true);
  });

  it('rejects the simulator degenerate band (3-side edge touch)', () => {
    expect(isPlausibleVisionQuad(degenerateBand)).toBe(false);
  });

  it('rejects a fan/trapezoid misdetection', () => {
    expect(isPlausibleVisionQuad(fanQuad)).toBe(false);
  });

  it('rejects a tiny quad below the min area ratio', () => {
    const tiny: DocumentCorner[] = [
      { x: 0.45, y: 0.45 },
      { x: 0.55, y: 0.45 },
      { x: 0.55, y: 0.55 },
      { x: 0.45, y: 0.55 },
    ];
    expect(isPlausibleVisionQuad(tiny)).toBe(false);
  });

  it('rejects null/short input', () => {
    expect(isPlausibleVisionQuad(null as unknown as DocumentCorner[])).toBe(false);
    expect(isPlausibleVisionQuad([])).toBe(false);
  });
});
